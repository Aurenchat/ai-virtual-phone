"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat-storage";
import { musicCoverUrl, persistMusicSharePreview, resolveMusicSharePreview } from "@/lib/music-share-preview";

export function MusicShareBubble({ msg, onPlay, onUpdate }: {
    msg: ChatMessage;
    onPlay?: (title: string, artist?: string) => void;
    onUpdate?: (updated: ChatMessage) => void;
}) {
    const title = msg.mediaData?.musicTitle?.trim() || "未知歌曲";
    const artist = msg.mediaData?.musicArtist?.trim() || "";
    const savedCover = musicCoverUrl(msg.mediaData?.musicCoverUrl);
    const identity = JSON.stringify([msg.sessionId, msg.id, title, artist, msg.mediaData?.musicTrackId]);
    const [preview, setPreview] = useState<{ identity: string; cover?: string; artist?: string }>();
    const [loaded, setLoaded] = useState<string>();
    const [failed, setFailed] = useState<string>();
    const updateRef = useRef(onUpdate);
    updateRef.current = onUpdate;
    const cover = savedCover || (preview?.identity === identity ? preview.cover : undefined);
    const shownArtist = artist || (preview?.identity === identity ? preview.artist : "") || "未知歌手";

    useEffect(() => {
        if (savedCover) return;
        let cancelled = false;
        void resolveMusicSharePreview(msg.mediaData || {}).then(value => {
            if (cancelled || !value) return;
            setPreview({ identity, cover: value.musicCoverUrl, artist: value.musicArtist });
            const updated = persistMusicSharePreview(msg, value);
            if (updated) updateRef.current?.(updated);
        });
        return () => { cancelled = true; };
        // identity contains the actual session/message and every lookup field.
        // Callback recreation and unrelated message changes must not query again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identity, savedCover]);

    const ready = !!cover && loaded === cover && failed !== cover;
    return (
        <button type="button" className="chat-music-share-card" data-cover-state={ready ? "loaded" : failed === cover && cover ? "failed" : "pending"}
            aria-label={`播放 ${title}${artist ? ` · ${artist}` : ""}`}
            onClick={e => { e.stopPropagation(); onPlay?.(title, artist || undefined); }}>
            <div className="chat-music-share-surface" aria-hidden="true">
                {ready && <img className="chat-music-share-tint" src={cover} alt="" />}
            </div>
            <div className="chat-music-share-cover" aria-hidden="true">
                <svg className="chat-music-share-placeholder" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                {cover && failed !== cover && <img key={cover} src={cover} alt="" decoding="async"
                    onLoad={() => setLoaded(cover)} onError={() => setFailed(cover)} />}
            </div>
            <div className="chat-music-share-info">
                <div className="chat-music-share-title">{title}</div>
                <div className="chat-music-share-artist">{shownArtist}</div>
                <div className="chat-music-share-footer">网易云音乐</div>
            </div>
        </button>
    );
}
