import { getNeteaseSongDetail, loadMusicApiConfig, searchNetease } from "./music-service";
import { loadChatMessages, updateMessageMediaData, type ChatMessage } from "./chat-storage";

type MusicData = NonNullable<ChatMessage["mediaData"]>;
type Preview = Pick<MusicData, "musicTrackId" | "musicCoverUrl" | "musicArtist">;
type Entry = { promise: Promise<Preview | null>; settled: boolean; expires: number };

// Metadata only; images remain in the browser's HTTP cache. Share requests across
// cards/remounts, bound the queue/cache, and never fan out a long history at once.
const cache = new Map<string, Entry>();
const queue: Array<() => void> = [];
let active = 0;
const LIMIT = 128;
const CONCURRENCY = 3;
const normalize = (text?: string) => (text || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");

export function musicCoverUrl(value?: string): string | undefined {
    if (!value || !/^https?:\/\//i.test(value)) return undefined;
    return value.replace(/^http:\/\//i, "https://");
}

function drain() {
    while (active < CONCURRENCY && queue.length) queue.shift()!();
}

export function resolveMusicSharePreview(data: MusicData): Promise<Preview | null> {
    const cover = musicCoverUrl(data.musicCoverUrl);
    if (cover) return Promise.resolve({ musicCoverUrl: cover, musicTrackId: data.musicTrackId });
    const title = data.musicTitle?.trim();
    if (!title && !data.musicTrackId) return Promise.resolve(null);
    const key = JSON.stringify([loadMusicApiConfig().baseUrl, data.musicTrackId || null, normalize(title), normalize(data.musicArtist)]);
    const previous = cache.get(key);
    if (previous && previous.expires > Date.now()) return previous.promise;
    if (previous) cache.delete(key);
    if (cache.size >= LIMIT) {
        const evict = [...cache].find(([, entry]) => entry.settled);
        if (!evict) return Promise.resolve(null);
        cache.delete(evict[0]);
    }
    let complete!: (value: Preview | null) => void;
    const entry: Entry = { promise: new Promise(resolve => { complete = resolve; }), settled: false, expires: Infinity };
    cache.set(key, entry);
    queue.push(() => {
        active++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        void (async () => {
            let id = data.musicTrackId;
            let artist = data.musicArtist;
            let resolvedCover: string | undefined;
            if (!id) {
                const songs = await searchNetease([title, artist].filter(Boolean).join(" "), 10, controller.signal);
                // A wrong cover is worse than a placeholder. Do not bind the first
                // unrelated search result when the requested title does not match.
                const song = songs.find(s => normalize(s.name) === normalize(title)
                    && (!artist || normalize(s.artists).includes(normalize(artist))));
                if (!song) return null;
                id = song.id;
                artist = song.artists;
                resolvedCover = musicCoverUrl(song.coverUrl);
            }
            if (!Number.isSafeInteger(id) || id! <= 0) return null;
            if (!resolvedCover) {
                const detail = await getNeteaseSongDetail(id!, controller.signal);
                resolvedCover = musicCoverUrl(detail?.coverUrl);
                artist ||= detail?.artists;
            }
            return { musicTrackId: id, musicCoverUrl: resolvedCover, musicArtist: artist };
        })().catch(() => null).then(value => {
            entry.settled = true;
            entry.expires = Date.now() + (value?.musicCoverUrl ? 86400000 : 300000);
            complete(value);
        }).finally(() => {
            clearTimeout(timer);
            active--;
            drain();
        });
    });
    drain();
    return entry.promise;
}

/** Merge missing fields into the latest record, never a stale React snapshot. */
export function persistMusicSharePreview(original: ChatMessage, preview: Preview): ChatMessage | null {
    const current = loadChatMessages(original.sessionId).find(m => m.id === original.id);
    if (!current || current.isRetracted || current.mediaType !== "music_share") return null;
    const data = current.mediaData || {};
    if (data.musicTitle !== original.mediaData?.musicTitle || data.musicArtist !== original.mediaData?.musicArtist
        || data.musicTrackId !== original.mediaData?.musicTrackId) return null;
    const next = { ...data };
    if (!next.musicCoverUrl && preview.musicCoverUrl) next.musicCoverUrl = preview.musicCoverUrl;
    if (!next.musicTrackId && preview.musicTrackId) next.musicTrackId = preview.musicTrackId;
    if (!next.musicArtist && preview.musicArtist) next.musicArtist = preview.musicArtist;
    if (JSON.stringify(next) === JSON.stringify(data)) return current;
    updateMessageMediaData(current.id, next);
    return { ...current, mediaData: next };
}
