// lib/tts-service.ts — 语音合成服务

import type { VoiceApiConfig, ContentAppId } from "./settings-types";
import { loadVoiceConfigs, loadBindingConfig, resolveBinding } from "./settings-storage";

import { synthesizeElevenLabs } from "./elevenlabs-tts";
import { supportsVoiceExpression, voiceSpeechText, voiceDisplayText } from "./voice-expression";
import { createPlaybackVolumeNode, speechPlaybackVolume } from "./speech-playback-volume";

export type VoiceApiConfigResolved = VoiceApiConfig;

/**
 * Resolve the TTS voice config for a character via the binding cascade.
 * Returns null if no voice config is bound or found.
 */
export function resolveVoiceConfig(characterId?: string, appId?: ContentAppId): VoiceApiConfig | null {
    const bindings = loadBindingConfig();
    const slot = resolveBinding(bindings, characterId, appId ?? "chat");
    if (!slot.voiceConfigId) return null;

    const configs = loadVoiceConfigs();
    return configs.find(c => c.id === slot.voiceConfigId) || null;
}

/**
 * Synthesize speech from text using the given voice config.
 * Returns an audio Blob (mp3/wav) or null if synthesis failed.
 *
 * Supported providers:
 * - Minimax: REST API → hex-encoded mp3
 * - OpenAI: REST API → binary audio blob
 * - ElevenLabs: REST API → binary MP3 (Yyk-Y2k implementation; see docs/elevenlabs-port.md)
 */
export async function synthesizeSpeech(
    text: string,
    voiceConfig: VoiceApiConfig,
    options?: { emotion?: string; speed?: number; pitch?: number; signal?: AbortSignal; authoredDirections?: boolean },
): Promise<Blob | null> {
    options?.signal?.throwIfAborted();
    if (!text.trim()) return null;

    const config = { ...voiceConfig,
        speechSpeed: options?.speed ?? voiceConfig.speechSpeed,
        speechPitch: options?.pitch ?? voiceConfig.speechPitch,
    };

    const provider = voiceConfig.provider;
    const expressive = supportsVoiceExpression(provider, config.model);
    text = expressive ? voiceSpeechText(text) : voiceDisplayText(text);
    // Replaying authored cues after changing provider must not read directions aloud.
    // Ordinary reading text can contain literal [brackets]; only authored audio has cues.
    if (!expressive && options?.authoredDirections) text = text.replace(/\[[a-zA-Z][a-zA-Z ,'-]{0,100}\]/g, "").trim();
    if (!text.trim()) return null;
    if (provider === "ElevenLabs") return synthesizeElevenLabs(text, config, options?.signal);

    if (provider === "Minimax") {
        return synthesizeMinimax(text, config, options?.emotion, options?.signal);
    }

    if (provider === "OpenAI") {
        return synthesizeOpenAI(text, config, options?.signal);
    }

    return null;
}

// A stalled TTS request (TCP connected but no response — cold start, rate-limit
// hold, network blip) would otherwise hang forever, since fetch has no default
// timeout. That froze voice/video calls at "对方正在说话..." until the user
// toggled the mic. Abort after a ceiling so the caller can recover.
const TTS_TIMEOUT_MS = 120_000;

async function fetchWithTimeout<T>(url: string, init: RequestInit, consume: (response: Response) => Promise<T>, timeoutMs = TTS_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const externalSignal = init.signal;
    externalSignal?.throwIfAborted();
    const abort = () => controller.abort(externalSignal?.reason);
    externalSignal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        // Keep both timeout and caller cancellation alive until the response body is consumed.
        return await consume(await fetch(url, { ...init, signal: controller.signal }));
    } catch (e) {
        if (externalSignal?.aborted) throw externalSignal.reason ?? new DOMException("已取消", "AbortError");
        if (e instanceof DOMException && e.name === "AbortError") {
            throw new Error(`语音合成超时（超过 ${Math.round(timeoutMs / 1000)} 秒无响应）`);
        }
        throw e;
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener("abort", abort);
    }
}

// ── Minimax TTS ─────────────────────────────────────

// MiniMax voice_setting.emotion 支持的取值（speech-01-turbo/hd、speech-02-turbo/hd 等）。
const MINIMAX_EMOTIONS = new Set([
    "happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "neutral", "fluent",
]);

const MINIMAX_SPEED_MIN = 0.5;
const MINIMAX_SPEED_MAX = 2.0;
const MINIMAX_VOLUME_MIN = 0.1;
const MINIMAX_VOLUME_MAX = 2.0;
const MINIMAX_PITCH_MIN = -12;
const MINIMAX_PITCH_MAX = 12;

function normalizeMinimaxSpeed(speed: number | undefined): number {
    if (typeof speed !== "number" || !Number.isFinite(speed)) return 1.0;
    return Math.min(MINIMAX_SPEED_MAX, Math.max(MINIMAX_SPEED_MIN, speed));
}

export function normalizeMinimaxVolume(volume: number | undefined): number {
    if (typeof volume !== "number" || !Number.isFinite(volume)) return 1.0;
    return Math.min(MINIMAX_VOLUME_MAX, Math.max(MINIMAX_VOLUME_MIN, volume));
}

function normalizeMinimaxPitch(pitch: number | undefined): number {
    if (typeof pitch !== "number" || !Number.isFinite(pitch)) return 0;
    return Math.min(MINIMAX_PITCH_MAX, Math.max(MINIMAX_PITCH_MIN, Math.round(pitch)));
}

async function synthesizeMinimax(text: string, config: VoiceApiConfig, emotion?: string, signal?: AbortSignal): Promise<Blob | null> {
    if (!config.apiKey) throw new Error("Minimax API Key 未配置");

    const baseUrl = (config.baseUrl || "https://api.minimaxi.com/v1").replace(/\/$/, "");
    const voiceSetting: Record<string, unknown> = {
        voice_id: config.defaultVoice || "male-qn-qingse",
        speed: normalizeMinimaxSpeed(config.speechSpeed),
        vol: normalizeMinimaxVolume(config.speechVolume),
        pitch: normalizeMinimaxPitch(config.speechPitch),
    };
    const normalizedEmotion = emotion?.trim().toLowerCase();
    if (normalizedEmotion && MINIMAX_EMOTIONS.has(normalizedEmotion)) {
        voiceSetting.emotion = normalizedEmotion;
    }

    return fetchWithTimeout(`${baseUrl}/t2a_v2`, {
        signal,
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.model || "speech-01-turbo",
            text,
            stream: false,
            ...(config.languageBoost ? { language_boost: config.languageBoost } : {}),
            voice_setting: voiceSetting,
            // 44100/256k 是 Minimax 支持的最高档;之前 32000/128k 会把 hd 模型
            // 的输出压闷(用户反馈"声音糊"),各模型均支持该档位。
            audio_setting: {
                sample_rate: 44100,
                bitrate: 256000,
                format: "mp3",
                channel: 1,
            },
        }),
    }, async response => {

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.base_resp?.status_msg || `Minimax API 请求失败 (${response.status})`);
    }

    const data = await response.json();
    if (data.data?.audio) {
        const hexString: string = data.data.audio;
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        return new Blob([bytes], { type: "audio/mpeg" });
    }

    throw new Error(data.base_resp?.status_msg || "Minimax 未返回音频数据");
    });
}

// ── OpenAI TTS ──────────────────────────────────────

async function synthesizeOpenAI(text: string, config: VoiceApiConfig, signal?: AbortSignal): Promise<Blob | null> {
    if (!config.apiKey) throw new Error("OpenAI API Key 未配置");

    const baseUrl = config.baseUrl || "https://api.openai.com/v1";
    return fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/audio/speech`, {
        signal,
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.model || "tts-1",
            input: text,
            voice: config.defaultVoice || "alloy",
            response_format: "mp3",
            ...(config.speechSpeed !== undefined ? { speed: Math.min(4, Math.max(0.25, config.speechSpeed)) } : {}),
        }),
    }, async response => {

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`OpenAI TTS 请求失败 (${response.status}): ${errText}`);
    }

    const blob = await response.blob();
    return new Blob([await blob.arrayBuffer()], { type: "audio/mpeg" });
    });
}

export type PausableSpeechPlayback = {
    started: Promise<void>;
    ended: Promise<void>;
    pause: () => void;
    resume: () => Promise<void>;
    stop: () => void;
};

/** A reader owns one reusable element: pause retains currentTime, and other TTS callers
 * keep their existing shared-player behavior. Unlock synchronously from a user gesture. */
export function createSpeechMediaPlayer(options: { useGlobalVolume?: boolean; initialAudio?: HTMLAudioElement; onAudioReplaced?: (audio: HTMLAudioElement) => void } = {}) {
    let audio: HTMLAudioElement | null = options.initialAudio ?? null;
    let active: PausableSpeechPlayback | null = null;
    let primeUrl: string | null = null;
    let voice: VoiceApiConfig | null = null;
    let removeVoiceListener = () => {};
    let graph: { context: AudioContext; source: MediaElementAudioSourceNode; volume: ReturnType<typeof createPlaybackVolumeNode> } | null = null;
    let nativeFallback = false;
    let disposed = false;
    let releaseContext = () => {};
    let releasePrime = () => {};
    let startController: AbortController | null = null;
    const baseVolume = () => options.useGlobalVolume === false ? 1 : getTtsVolume();
    const getAudio = () => {
        if (!audio) { audio = new Audio(); audio.setAttribute("playsinline", ""); }
        return audio;
    };
    const suspend = () => { startController?.abort(); startController = null; releaseContext(); releaseContext = () => {}; suspendIdleSpeechContext(); };
    const disconnect = () => {
        suspend();
        graph?.source.disconnect(); graph?.volume.dispose(); graph = null;
    };
    const updateVolume = () => {
        const element = audio;
        if (!element || disposed) return;
        const volume = speechPlaybackVolume(voice);
        // No context/source/processing for an untouched unity-volume media player.
        const needsGraph = volume !== 1 || (voice?.provider === "ElevenLabs" && baseVolume() !== 1);
        if (!graph && needsGraph && !nativeFallback) {
            const context = getAudioContext();
            if (context) {
                const node = createPlaybackVolumeNode(context);
                try {
                    const source = context.createMediaElementSource(element);
                    source.connect(node.input); node.output.connect(context.destination);
                    graph = { context, source, volume: node };
                } catch { node.dispose(); nativeFallback = true; }
            } else {
                nativeFallback = true;
                console.warn("[TTS] Web Audio 不可用，保留原媒体播放路径（无法应用本地增益）");
            }
        }
        if (graph) {
            graph.volume.set(volume); graph.volume.output.gain.value = baseVolume();
            element.volume = 1; // Global volume is in the graph, exactly once.
        } else element.volume = baseVolume();
    };
    const refreshPlayingVolume = () => {
        const playing = active && audio && !audio.paused;
        // An element routed into Web Audio loses its native output immediately.
        // Freeze its transport before making that connection, including mid-clip edits.
        const needsStart = playing && (!graph && (speechPlaybackVolume(voice) !== 1 || (voice?.provider === "ElevenLabs" && baseVolume() !== 1))
            || graph && !speechContextReady(graph.context));
        if (needsStart) audio!.pause();
        updateVolume();
        if (needsStart) void active!.resume().catch(() => {});
    };
    const setVoiceConfig = (config?: VoiceApiConfig | null) => {
        removeVoiceListener(); voice = latestSpeechPlaybackConfig(config);
        removeVoiceListener = watchSpeechPlaybackVolume(config, latest => { voice = latest; refreshPlayingVolume(); });
        refreshPlayingVolume();
    };
    _mediaVolumeUpdates.add(refreshPlayingVolume);
    const clearPrime = () => { if (primeUrl) URL.revokeObjectURL(primeUrl); primeUrl = null; releasePrime(); releasePrime = () => {}; };
    return {
        get isActive() { return active !== null; },
        setVoiceConfig,
        unlock() {
            if (active || primeUrl) return;
            const element = getAudio();
            updateVolume();
            if (graph) {
                const controller = new AbortController(), release = acquireSpeechContext(graph.context);
                releasePrime = () => { controller.abort(); release(); };
                void resumeSpeechContext(graph.context, true, controller.signal).catch(() => {});
            }
            const url = silentWavUrl(); primeUrl = url;
            element.src = url;
            void element.play().then(() => {
                if (primeUrl === url && !active) { element.pause(); element.removeAttribute("src"); element.load(); suspend(); clearPrime(); }
            }).catch(() => { if (primeUrl === url) { element.removeAttribute("src"); element.load(); suspend(); clearPrime(); } });
        },
        play(blob: Blob | string, config?: VoiceApiConfig | null): PausableSpeechPlayback {
            active?.stop(); clearPrime();
            if (config !== undefined) setVoiceConfig(config);
            let element = getAudio();
            nativeFallback = false;
            const ownsUrl = typeof blob !== "string";
            const url = typeof blob === "string" ? blob : URL.createObjectURL(blob);
            element.src = url;
            let settled = false;
            let playAttempt = 0;
            let resolveEnd!: () => void;
            let rejectEnd!: (error: Error) => void;
            const ended = new Promise<void>((resolve, reject) => { resolveEnd = resolve; rejectEnd = reject; });
            // A failed play() can reject before the caller begins awaiting ended.
            void ended.catch(() => {});
            const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                element.onended = null; element.onerror = null; element.onloadedmetadata = null;
                element.pause(); element.removeAttribute("src"); element.load();
                suspend();
                if (ownsUrl) URL.revokeObjectURL(url);
                if (active === playback) active = null;
                if (error) rejectEnd(error); else resolveEnd();
            };
            const handlers = () => {
                element.onended = () => finish();
                element.onerror = () => finish(new Error("音频播放失败，请重试或跳到下一段"));
            };
            handlers();
            const resume = () => {
                const attempt = ++playAttempt;
                updateVolume();
                const playNative = () => settled || attempt !== playAttempt ? Promise.resolve() : element.play();
                // Retain the original element-only fallback if the context cannot run.
                // An element once routed into Web Audio cannot be detached back to native
                // output; replace only that failed element, retaining URL and currentTime.
                const fallback = () => {
                    if (settled || attempt !== playAttempt) return Promise.resolve();
                    const time = element.currentTime;
                    element.onended = null; element.onerror = null; element.pause();
                    disconnect();
                    element.removeAttribute("src"); element.load();
                    audio = element = new Audio(); element.setAttribute("playsinline", "");
                    options.onAudioReplaced?.(element);
                    nativeFallback = true; element.src = url; element.volume = baseVolume();
                    try { element.currentTime = time; } catch {
                        element.onloadedmetadata = () => {
                            element.onloadedmetadata = null;
                            if (!settled) try { element.currentTime = time; } catch { /* Unsupported native seek. */ }
                        };
                    }
                    handlers();
                    console.warn("[TTS] 本地播放增益不可用，已回退原媒体播放路径");
                    return playNative();
                };
                const start = graph ? (() => {
                    // A running state does not mean a previous suspend has completed.
                    // Keep the content paused until both control and render threads agree.
                    element.pause();
                    startController?.abort();
                    const controller = new AbortController(); startController = controller;
                    const previousRelease = releaseContext;
                    releaseContext = acquireSpeechContext(graph!.context);
                    previousRelease();
                    return resumeSpeechContext(graph!.context, false, controller.signal).then(() => {
                        // pause/stop already released this attempt. A newer resume may
                        // now own the same element; a stale callback must not suspend it.
                        if (settled || attempt !== playAttempt) return;
                        return element.play();
                    }).catch(fallback);
                })() : playNative();
                return start.catch(error => {
                    // pause()/stop() may reject a still-pending play() with AbortError.
                    // Only the latest attempt can report a real playback failure.
                    if (settled || attempt !== playAttempt) return;
                    const message = error instanceof Error ? error.message : String(error);
                    finish(new Error(`无法播放语音，请点击重试：${message}`));
                    throw error;
                });
            };
            const playback: PausableSpeechPlayback = { started: Promise.resolve(), ended,
                pause: () => { ++playAttempt; element.pause(); suspend(); }, resume, stop: () => finish() };
            active = playback;
            playback.started = resume();
            return playback;
        },
        playUrl(src: string): PausableSpeechPlayback { return this.play(src); },
        stop() { active?.stop(); clearPrime(); audio?.pause(); audio?.removeAttribute("src"); audio?.load(); suspend(); },
        dispose() {
            active?.stop(); clearPrime(); removeVoiceListener(); _mediaVolumeUpdates.delete(refreshPlayingVolume);
            disconnect(); audio?.pause(); audio?.removeAttribute("src"); audio = null; disposed = true;
        },
    };
}

// ── iOS audio playback that coexists with speech recognition ──────────
// On iOS Safari, playing TTS through an <audio> element keeps the system audio
// session in "playback" mode, which steals the mic from webkitSpeechRecognition
// and stops it from restarting on the next turn (calls go silent after one
// round). To keep hands-free multi-turn working we play through a Web Audio
// AudioContext and explicitly suspend() it after each clip so iOS hands the
// audio session back to the microphone. A shared <audio> element is kept as a
// fallback for browsers without AudioContext.

let _audioCtx: AudioContext | null = null;
let _sharedAudio: HTMLAudioElement | null = null;
let _audioUnlocked = false;
let _unlockListenerInstalled = false;

// ── In-app TTS volume (0..1) ──
// iOS plays Web Audio on the ringer/voice stream, so the hardware volume keys
// don't control character speech. This in-app gain does. Synced to localStorage.
const TTS_VOLUME_KEY = "ai_phone_tts_volume_v1";
let _ttsVolume = ((): number => {
    if (typeof window === "undefined") return 1;
    try {
        const raw = window.localStorage.getItem(TTS_VOLUME_KEY);
        const v = raw == null ? 1 : Number(raw);
        return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
    } catch { return 1; }
})();
// Live gain node of the currently-playing AudioContext clip, so the slider can
// adjust volume mid-sentence.
let _activeGain: GainNode | null = null;
const _mediaVolumeUpdates = new Set<() => void>();

type SpeechContextState = {
    owners: Set<symbol>;
    suspending: Promise<void> | null;
    resuming: Promise<void> | null;
};
const _speechContexts = new WeakMap<AudioContext, SpeechContextState>();
function speechContextState(context: AudioContext): SpeechContextState {
    let state = _speechContexts.get(context);
    if (!state) { state = { owners: new Set(), suspending: null, resuming: null }; _speechContexts.set(context, state); }
    return state;
}

function speechContextReady(context: AudioContext) {
    const state = speechContextState(context);
    return context.state === "running" && !state.suspending && !state.resuming;
}

function acquireSpeechContext(context: AudioContext) {
    const state = speechContextState(context), owner = Symbol();
    state.owners.add(owner);
    return (keepRunning = false) => { if (state.owners.delete(owner) && !keepRunning) suspendIdleSpeechContext(context); };
}

function suspendIdleSpeechContext(context = _audioCtx) {
    if (!context || context.state === "closed") return;
    const state = speechContextState(context);
    if (state.owners.size || state.suspending) return;
    // A late resume must finish before handing the session back to the mic.
    if (state.resuming) { void state.resuming.then(() => suspendIdleSpeechContext(context), () => suspendIdleSpeechContext(context)); return; }
    if (context.state === "suspended") return;
    try {
        const pending = context.suspend().catch(() => {});
        state.suspending = pending;
        void pending.then(() => { if (state.suspending === pending) state.suspending = null; });
    } catch { /* Already closed/suspended. */ }
}

/** Resume + a render-thread acknowledgement, with no content transport running.
 * The one-frame silent source is separate from the media, not padding or a delay.
 * Keep the existing bounded native fallback when Web Audio cannot make progress. */
async function resumeSpeechContext(context: AudioContext, gesture = false, signal?: AbortSignal) {
    const state = speechContextState(context);
    // Permission must be requested synchronously in the gesture, even if an older
    // suspend is pending. We still reconcile that suspend before starting content.
    const permission = gesture ? context.resume() : null;
    if (permission) void permission.catch(() => {});
    if (!state.resuming || permission) {
        const previous = state.resuming;
        const pending = (async () => {
            if (state.suspending) await state.suspending;
            if (previous) await previous.catch(() => {});
            if (permission) await permission;
            if (context.state !== "running") await context.resume();
        })();
        state.resuming = pending;
        const completed = () => {
            if (state.resuming === pending) state.resuming = null;
            if (!state.owners.size) suspendIdleSpeechContext(context);
        };
        void pending.then(completed, completed);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let probe: AudioBufferSourceNode | null = null;
    let finished = false;
    let onAbort = () => {};
    try {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        await Promise.race([
            (async () => {
                await state.resuming;
                if (finished) return;
                if (context.state !== "running") throw new Error("audio_context_not_running");
                await new Promise<void>((resolve, reject) => {
                    try {
                        probe = context.createBufferSource();
                        probe.buffer = context.createBuffer(1, 1, context.sampleRate);
                        probe.connect(context.destination);
                        probe.onended = () => resolve();
                        probe.start();
                    } catch (error) { reject(error); }
                });
            })(),
            new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("audio_context_not_ready")), 800); }),
            new Promise<never>((_, reject) => {
                onAbort = () => reject(new DOMException("Aborted", "AbortError"));
                signal?.addEventListener("abort", onAbort, { once: true });
            }),
        ]);
        if (context.state !== "running" || state.suspending) throw new Error("audio_context_not_ready");
    } finally {
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        if (probe) { const source = probe as AudioBufferSourceNode; source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
    }
}

function watchSpeechPlaybackVolume(config: VoiceApiConfig | null | undefined, update: (latest: VoiceApiConfig | null) => void) {
    if (config?.provider !== "ElevenLabs" || typeof window === "undefined") return () => {};
    const changed = () => update(loadVoiceConfigs().find(item => item.id === config.id && item.provider === "ElevenLabs") ?? null);
    window.addEventListener("voice-configs-updated", changed);
    return () => window.removeEventListener("voice-configs-updated", changed);
}

function latestSpeechPlaybackConfig(config?: VoiceApiConfig | null): VoiceApiConfig | null {
    if (config?.provider !== "ElevenLabs") return config ?? null;
    // TTS/decoding may have taken seconds. Resolve playback-only settings at play
    // time, while retaining support for explicitly supplied, unsaved configs.
    const latest = loadVoiceConfigs().find(item => item.id === config.id);
    return latest ? (latest.provider === "ElevenLabs" ? latest : null) : config;
}

export function getTtsVolume(): number {
    return _ttsVolume;
}

export function setTtsVolume(volume: number): void {
    _ttsVolume = Math.min(1, Math.max(0, volume));
    try { window.localStorage.setItem(TTS_VOLUME_KEY, String(_ttsVolume)); } catch { /* ignore */ }
    if (_activeGain) { try { _activeGain.gain.value = _ttsVolume; } catch { /* ignore */ } }
    for (const update of _mediaVolumeUpdates) update();
}

// ── 通话音频会话开关 ──
// 只有通话界面在场时才让 Web Audio 上下文保持 running。此前全局点击解锁会把
// 上下文永久 resume，页面从第一次点击起就一直持有系统音频会话；叠加通话退出
// 后识别泄漏，整页音频会被钉在"通话模式"（语音条/试听音量巨大且音量键失灵）。
let _callAudioSessionActive = false;

/** 通话界面挂载时置 true、卸载/挂断时置 false（false 时立即挂起空闲的上下文）。 */
export function setCallAudioSessionActive(active: boolean): void {
    _callAudioSessionActive = active;
    if (!active) suspendIdleSpeechContext();
}

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!_audioCtx || _audioCtx.state === "closed") {
        // 不要钉 sampleRate:部分 iOS 版本上非硬件采样率的 ctx 会"时钟照走、
        // 输出全静音"(比闷更糟)。防发闷靠 TTS 请求参数(44100/256k)兜底。
        try { _audioCtx = new Ctor(); } catch { return null; }
    }
    return _audioCtx;
}

function getSharedAudio(): HTMLAudioElement {
    if (!_sharedAudio) {
        _sharedAudio = new Audio();
        _sharedAudio.setAttribute("playsinline", "");
    }
    return _sharedAudio;
}

function silentWavUrl(): string {
    // A few ms of 16-bit mono PCM silence — a valid source so play() actually
    // starts (and thus unlocks the element) on iOS.
    // 采样率用 48kHz 而不是 8kHz：iOS 的系统音频会话采样率会跟着刚播放的媒体走，
    // 解锁音若是 8kHz，紧接着播的 TTS 会被压到 4kHz 以下而发闷（与保活音同理）。
    const sampleRate = 48000;
    const numSamples = 96; // 2ms
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeStr(8, "WAVE");
    writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, "data"); view.setUint32(40, dataSize, true);
    // 16-bit PCM 静音为 0，ArrayBuffer 默认全 0，无需再写
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * Unlock audio playback. Must run inside (or synchronously from) a user gesture.
 * Resumes the AudioContext (primary path) and unlocks the <audio> fallback.
 * Safe to call repeatedly.
 */
export function unlockAudioPlayback(): void {
    if (typeof window === "undefined") return;

    // Primary path: resume the Web Audio context within the gesture. Once
    // resumed under a gesture, subsequent programmatic resume()s are allowed.
    // 非通话期只借这次手势拿"授权"，随即挂起——不让页面平时一直持有音频会话。
    const ctx = getAudioContext();
    if (ctx && !speechContextReady(ctx) && ctx.state !== "closed") {
        const release = acquireSpeechContext(ctx);
        void resumeSpeechContext(ctx, true).catch(() => {}).finally(() => release(_callAudioSessionActive));
    }

    // Fallback path: unlock the shared <audio> element once.
    if (_audioUnlocked || _sharedMediaPlayer?.isActive) return;
    const audio = getSharedAudio();
    const url = silentWavUrl();
    audio.muted = true;
    audio.src = url;
    const finish = () => {
        // The prime promise can settle after a real clip took over this element.
        if (_sharedMediaPlayer?.isActive) {
            audio.muted = false; URL.revokeObjectURL(url); _audioUnlocked = true; return;
        }
        try { audio.pause(); audio.currentTime = 0; } catch {}
        audio.muted = false;
        URL.revokeObjectURL(url);
        _audioUnlocked = true;
    };
    try {
        const p = audio.play();
        if (p && typeof p.then === "function") {
            p.then(finish).catch(() => { audio.muted = false; URL.revokeObjectURL(url); });
        } else {
            finish();
        }
    } catch {
        audio.muted = false;
        URL.revokeObjectURL(url);
    }
}

function installUnlockListener(): void {
    if (_unlockListenerInstalled || typeof window === "undefined") return;
    _unlockListenerInstalled = true;
    const handler = () => { unlockAudioPlayback(); };
    window.addEventListener("touchend", handler, { passive: true });
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("mousedown", handler, { passive: true });
}

// Install the first-gesture unlock as soon as this module loads on the client.
// The call screens import this module statically (via chat-room), so the
// listener is in place well before the user taps the call button.
if (typeof window !== "undefined") installUnlockListener();

function decodeAudio(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
    // Support both the promise and legacy callback forms (older webkitAudioContext).
    return new Promise((resolve, reject) => {
        const ret = ctx.decodeAudioData(data, resolve, reject);
        if (ret && typeof (ret as Promise<AudioBuffer>).then === "function") {
            (ret as Promise<AudioBuffer>).then(resolve, reject);
        }
    });
}

/**
 * Playback via a shared <audio> element. Used as the fallback when AudioContext
 * is unavailable, and as the PRIMARY path for gesture-less auto-play scenarios
 * (e.g. VN/漫卷 auto voice): a media element that was unlocked once keeps playing
 * programmatically, whereas resuming a suspended AudioContext far from any user
 * gesture is often rejected on Android Chrome/Edge (the "only plays with WeChat
 * keep-alive on" bug — the keep-alive's looping silent <audio> was what kept the
 * context alive). Bonus: media-element playback also obeys hardware volume keys.
 */
export function playAudioBlobViaMediaElement(blob: Blob, config?: VoiceApiConfig | null): { promise: Promise<void>; abort: () => void } {
    return playAudioBlobElement(blob, config);
}

let _sharedMediaPlayer: ReturnType<typeof createSpeechMediaPlayer> | null = null;
function playAudioBlobElement(blob: Blob, config?: VoiceApiConfig | null): { promise: Promise<void>; abort: () => void } {
    const audio = getSharedAudio(); audio.muted = false;
    _sharedMediaPlayer ??= createSpeechMediaPlayer({ initialAudio: audio, onAudioReplaced: replacement => { _sharedAudio = replacement; } });
    const playback = _sharedMediaPlayer.play(blob, config ?? null);
    void playback.started.catch(() => {});
    // Keep the existing call contract: media failure releases the turn/microphone.
    return { promise: playback.ended.catch(() => {}), abort: playback.stop };
}

/**
 * Play an audio blob through the Web Audio context and resolve when playback
 * ends. After playback the context is suspended so iOS releases the audio
 * session back to the microphone (lets SpeechRecognition restart next turn).
 * Returns an abort function to stop playback early. Playback is sequential.
 */
export function playAudioBlob(blob: Blob, config?: VoiceApiConfig | null): { promise: Promise<void>; abort: () => void } {
    const ctx = getAudioContext();
    if (!ctx) return playAudioBlobElement(blob, config);

    let settled = false;
    let resolveFn: () => void = () => {};
    let source: AudioBufferSourceNode | null = null;

    let gain: GainNode | null = null;
    let localVolume: ReturnType<typeof createPlaybackVolumeNode> | null = null;
    let latestVoice = latestSpeechPlaybackConfig(config);
    let updateLocalVolume = () => {};
    let removeVoiceListener = watchSpeechPlaybackVolume(config, latest => { latestVoice = latest; updateLocalVolume(); });
    let fallbackAbort: (() => void) | null = null;
    const releaseContext = acquireSpeechContext(ctx);
    const startController = new AbortController();

    const cleanupWebAudio = () => {
        startController.abort();
        if (source) {
            source.onended = null;
            try { source.stop(); } catch {}
            try { source.disconnect(); } catch {}
            source = null;
        }
        localVolume?.dispose(); localVolume = null;
        removeVoiceListener(); removeVoiceListener = () => {};
        if (gain) { try { gain.disconnect(); } catch {} }
        if (_activeGain === gain) _activeGain = null;
        gain = null;
        // Suspend so iOS hands the audio session back to the microphone.
        releaseContext();
    };

    const finalize = () => {
        if (settled) return;
        settled = true;
        cleanupWebAudio();
        if (fallbackAbort) { fallbackAbort(); fallbackAbort = null; }
        resolveFn();
    };

    const promise = new Promise<void>((resolve) => {
        resolveFn = resolve;
        (async () => {
            try {
                const audioBuffer = await decodeAudio(ctx, await blob.arrayBuffer());
                if (settled) return;
                await resumeSpeechContext(ctx, false, startController.signal);
                if (settled) return;
                source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                // Route through a gain node so the in-app volume slider applies.
                gain = ctx.createGain();
                gain.gain.value = _ttsVolume;
                source.connect(gain);
                gain.connect(ctx.destination);
                updateLocalVolume = () => {
                    if (!source || !gain || settled) return;
                    const volume = speechPlaybackVolume(latestVoice);
                    if (!localVolume && volume === 1) return;
                    if (!localVolume) {
                        localVolume = createPlaybackVolumeNode(ctx);
                        source.disconnect(); source.connect(localVolume.input); localVolume.output.connect(gain);
                    }
                    localVolume.set(volume);
                };
                updateLocalVolume();
                _activeGain = gain;
                source.onended = finalize;
                source.start();
            } catch {
                // Web Audio 走不通（resume 被拒/解码失败等）时回落媒体元素播放：
                // 宁可这一段绕过「iOS 归还麦克风」的优化，也不要静默无声——
                // 此前这里直接 finalize，正是「语音条有声、通话没声」的来源之一。
                if (settled) return;
                cleanupWebAudio();
                const fallback = playAudioBlobElement(blob, latestVoice);
                fallbackAbort = fallback.abort;
                void fallback.promise.then(() => {
                    if (settled) return;
                    settled = true;
                    fallbackAbort = null;
                    resolveFn();
                });
            }
        })();
    });

    return { promise, abort: finalize };
}
