import type { BookChapter } from "./reading-types";
import type { VoiceApiConfig } from "./settings-types";
import type { PausableSpeechPlayback } from "./tts-service";

export type ReadingTtsPosition = { bookId: string; chapterIndex: number; paragraphIndex: number };
export type ReadingTtsStatus = "idle" | "loading" | "playing" | "paused" | "error" | "ended";
export type ReadingTtsState = { status: ReadingTtsStatus; position: ReadingTtsPosition | null; error: string | null };
export type ReadingTtsPreferences = { voiceConfigId?: string; emotion?: string; speed?: number };
export type ReadingTtsOptions = ReadingTtsPreferences & { voice: VoiceApiConfig | null; characterId?: string };
type Paragraph = { position: ReadingTtsPosition; text: string };
type PositionSource = ReadingTtsPosition | ((signal: AbortSignal) => Promise<ReadingTtsPosition>);

export function readingTtsCacheKey(position: ReadingTtsPosition, text: string, options: ReadingTtsOptions): string {
    const voice = options.voice;
    return JSON.stringify([position.bookId, position.chapterIndex, position.paragraphIndex, text,
        voice?.id, voice?.provider, voice?.baseUrl, voice?.defaultVoice, voice?.model, voice?.languageBoost,
        options.emotion || "", options.speed ?? voice?.speechSpeed ?? 1, voice?.speechPitch ?? 0]);
}

/** Session-only bounded blob cache. Object URLs belong to the active player, never the cache. */
export class ReadingAudioCache {
    private items = new Map<string, Blob>();
    private bytes = 0;
    constructor(private maxItems = 8, private maxBytes = 32 * 1024 * 1024) {}
    get(key: string) {
        const blob = this.items.get(key);
        if (blob) { this.items.delete(key); this.items.set(key, blob); }
        return blob;
    }
    set(key: string, blob: Blob) {
        const previous = this.items.get(key);
        if (previous) { this.bytes -= previous.size; this.items.delete(key); }
        if (blob.size > this.maxBytes) return;
        this.items.set(key, blob); this.bytes += blob.size;
        while (this.items.size > this.maxItems || this.bytes > this.maxBytes) {
            const oldest = this.items.keys().next().value!;
            this.bytes -= this.items.get(oldest)!.size; this.items.delete(oldest);
        }
    }
    clear() { this.items.clear(); this.bytes = 0; }
    get size() { return this.items.size; }
}

type Dependencies = {
    bookId: string;
    chapterCount: () => number;
    getChapter: (index: number, signal: AbortSignal) => Promise<BookChapter | undefined>;
    synthesize: (text: string, voice: VoiceApiConfig, options: { emotion?: string; speed?: number; signal: AbortSignal }) => Promise<Blob | null>;
    player: { unlock: () => void; play: (blob: Blob) => PausableSpeechPlayback; dispose: () => void };
    onChange: (state: ReadingTtsState) => void;
};

/** One current paragraph + two speculative paragraphs. No chat or memory writes. */
export class ReadingTtsController {
    state: ReadingTtsState = { status: "idle", position: null, error: null };
    readonly cache = new ReadingAudioCache();
    private options: ReadingTtsOptions = { voice: null };
    private optionsKey = "";
    private turn = 0;
    private navigation = new AbortController();
    private jobs = new Map<string, { controller: AbortController; promise: Promise<Blob> }>();
    private failures = new Map<string, Error>();
    private playback: PausableSpeechPlayback | null = null;
    private ready: { paragraph: Paragraph; blob: Blob } | null = null;
    private paused = false;
    private finishedWhilePaused = false;
    private lastParagraph: ReadingTtsPosition | null = null;
    private source: PositionSource | null = null;
    constructor(private deps: Dependencies) {}

    private emit(patch: Partial<ReadingTtsState>) { this.state = { ...this.state, ...patch }; this.deps.onChange(this.state); }
    private cancelJobs(keep?: string) {
        for (const [key, job] of this.jobs) if (key !== keep) { job.controller.abort(); this.jobs.delete(key); }
    }
    configure(options: ReadingTtsOptions) {
        const key = JSON.stringify(options);
        if (key === this.optionsKey) return;
        const resume = ["playing", "loading", "paused"].includes(this.state.status);
        const paused = this.paused;
        const position = this.state.position ?? this.source;
        this.stop(); this.cache.clear(); this.failures.clear();
        this.options = options; this.optionsKey = key;
        if (resume && position) this.start(position, { paused });
    }
    stop() {
        ++this.turn; this.navigation.abort(); this.cancelJobs();
        this.playback?.stop(); this.playback = null; this.ready = null;
        this.paused = false; this.finishedWhilePaused = false;
        this.source = null;
        this.emit({ status: "idle", error: null, position: this.state.position ?? this.lastParagraph });
    }
    dispose() { this.stop(); this.cache.clear(); this.failures.clear(); this.deps.player.dispose(); }
    pause() {
        if (!["playing", "loading"].includes(this.state.status)) return;
        this.paused = true; this.playback?.pause(); this.emit({ status: "paused" });
    }
    resume() {
        this.deps.player.unlock();
        if (this.state.status !== "paused") return;
        this.paused = false;
        if (this.finishedWhilePaused) { this.move(1); return; }
        if (this.playback) {
            const turn = this.turn;
            this.emit({ status: "playing" });
            void this.playback.resume().catch(error => this.fail(error, turn));
        } else if (this.ready) {
            void this.playReady(this.ready, this.turn);
        } else this.emit({ status: "loading" });
    }
    retry() {
        this.failures.clear();
        if (this.state.position) this.start(this.state.position);
    }
    move(direction: 1 | -1) {
        if (!this.state.position) return;
        this.start({ ...this.state.position, paragraphIndex: this.state.position.paragraphIndex + direction }, { direction });
    }
    start(source: PositionSource, opts: { paused?: boolean; direction?: 1 | -1; natural?: boolean } = {}) {
        this.source = source;
        this.deps.player.unlock();
        const turn = ++this.turn;
        this.navigation.abort(); this.navigation = new AbortController();
        this.playback?.stop(); this.playback = null; this.ready = null;
        this.paused = opts.paused === true; this.finishedWhilePaused = false;
        this.emit({ status: this.paused ? "paused" : "loading", error: null,
            position: typeof source === "function" ? null : source });
        void this.run(source, turn, opts).catch(error => this.fail(error, turn));
    }
    private async seek(position: ReadingTtsPosition, direction: 1 | -1, signal: AbortSignal): Promise<Paragraph | null> {
        let { chapterIndex, paragraphIndex } = position;
        while (chapterIndex >= 0 && chapterIndex < this.deps.chapterCount()) {
            signal.throwIfAborted();
            const chapter = await this.deps.getChapter(chapterIndex, signal);
            signal.throwIfAborted();
            const paragraphs = chapter?.paragraphs ?? [];
            if (paragraphIndex < 0) {
                if (--chapterIndex < 0) return null;
                const previous = await this.deps.getChapter(chapterIndex, signal);
                paragraphIndex += previous?.paragraphs.length ?? 0;
                continue;
            }
            if (paragraphIndex >= paragraphs.length) {
                if (direction < 0) { paragraphIndex = -1; continue; }
                paragraphIndex -= paragraphs.length; chapterIndex++; continue;
            }
            const text = paragraphs[paragraphIndex].trim();
            if (text) return { position: { bookId: this.deps.bookId, chapterIndex, paragraphIndex }, text };
            paragraphIndex += direction;
        }
        return null;
    }
    private async audio(paragraph: Paragraph): Promise<Blob> {
        const key = readingTtsCacheKey(paragraph.position, paragraph.text, this.options);
        const cached = this.cache.get(key);
        if (cached) return cached;
        const failure = this.failures.get(key);
        if (failure) throw failure;
        const existing = this.jobs.get(key);
        if (existing) return existing.promise;
        const controller = new AbortController();
        const options = this.options;
        const promise = this.deps.synthesize(paragraph.text, options.voice!, {
            emotion: options.emotion || undefined, speed: options.speed, signal: controller.signal,
        }).then(blob => {
            controller.signal.throwIfAborted();
            if (!blob?.size) throw new Error("语音服务未返回音频，请重试或跳到下一段");
            this.cache.set(key, blob); return blob;
        }).catch(error => {
            if (!controller.signal.aborted) {
                this.failures.set(key, error instanceof Error ? error : new Error(String(error)));
                if (this.failures.size > 8) this.failures.delete(this.failures.keys().next().value!);
            }
            throw error;
        }).finally(() => { if (this.jobs.get(key)?.controller === controller) this.jobs.delete(key); });
        this.jobs.set(key, { controller, promise });
        return promise;
    }
    private async prefetch(paragraph: Paragraph, turn: number, signal: AbortSignal) {
        let cursor = paragraph.position;
        try {
            for (let i = 0; i < 2 && turn === this.turn; i++) {
                const next = await this.seek({ ...cursor, paragraphIndex: cursor.paragraphIndex + 1 }, 1, signal);
                if (!next || turn !== this.turn) return;
                await this.audio(next); cursor = next.position;
            }
        } catch { /* Surface speculative failures only when that paragraph becomes current. */ }
    }
    private async run(source: PositionSource, turn: number, opts: { direction?: 1 | -1; natural?: boolean }) {
        const signal = this.navigation.signal;
        if (!this.options.voice?.enableTTS) throw new Error("请先在设置 → 绑定中为阅读选择并启用语音 API，或在音色菜单选择已有配置。");
        const position = typeof source === "function" ? await source(signal) : source;
        signal.throwIfAborted();
        if (position.bookId !== this.deps.bookId) return;
        const paragraph = await this.seek(position, opts.direction ?? 1, signal);
        if (turn !== this.turn) return;
        if (!paragraph) {
            this.cancelJobs();
            if (opts.natural || this.lastParagraph) { this.emit({ status: "ended", position: this.lastParagraph }); return; }
            throw new Error("此位置之后没有可朗读正文；扫描 PDF 需要原有文字层，本功能不含 OCR。");
        }
        this.source = paragraph.position;
        this.emit({ position: paragraph.position });
        this.lastParagraph = paragraph.position;
        if (!opts.natural) this.cancelJobs(readingTtsCacheKey(paragraph.position, paragraph.text, this.options));
        const audioPromise = this.audio(paragraph);
        void this.prefetch(paragraph, turn, signal);
        const blob = await audioPromise;
        if (turn !== this.turn) return;
        this.ready = { paragraph, blob };
        if (!this.paused) await this.playReady(this.ready, turn);
    }
    private async playReady(ready: { paragraph: Paragraph; blob: Blob }, turn: number) {
        if (turn !== this.turn) return;
        const playback = this.deps.player.play(ready.blob);
        this.playback = playback; this.ready = null;
        try {
            await playback.started;
            if (turn !== this.turn) return;
            if (this.paused) playback.pause(); else this.emit({ status: "playing" });
            await playback.ended;
            if (turn !== this.turn) return;
            this.playback = null;
            if (this.paused) { this.finishedWhilePaused = true; return; }
            this.start({ ...ready.paragraph.position, paragraphIndex: ready.paragraph.position.paragraphIndex + 1 }, { natural: true });
        } catch (error) { this.fail(error, turn); }
    }
    private fail(error: unknown, turn: number) {
        if (turn !== this.turn) return;
        ++this.turn; this.navigation.abort();
        this.cancelJobs(); this.playback?.stop(); this.playback = null;
        this.emit({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
}
