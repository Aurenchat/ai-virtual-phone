"use client";

import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import type { ReadingTtsPreferences, ReadingTtsState } from "@/lib/reading-tts";
import type { VoiceApiConfig } from "@/lib/settings-types";

export function ReadingTtsControls({ state, preferences, voices, voice, following, onPreferences, onPlay, onPause, onStop, onMove, onFollow, onRetry }: {
    state: ReadingTtsState; preferences: ReadingTtsPreferences; voices: VoiceApiConfig[]; voice: VoiceApiConfig | null;
    following: boolean; onPreferences: (preferences: ReadingTtsPreferences) => void;
    onPlay: () => void; onPause: () => void; onStop: () => void; onMove: (direction: 1 | -1) => void; onFollow: () => void; onRetry: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const running = state.status === "playing" || state.status === "loading";
    const status = { idle: "朗读", loading: "准备音频…", playing: "正在朗读", paused: "已暂停", error: "朗读暂停", ended: "已读完" }[state.status];
    return (
        <section className="reading-tts-controls" data-no-nav="true" aria-label="正文朗读" data-status={state.status}>
            <div className="reading-tts-row">
                <button type="button" aria-label="上一段" disabled={!state.position || (state.position.chapterIndex === 0 && state.position.paragraphIndex === 0)} onClick={() => onMove(-1)}><SkipBack size={16} /></button>
                <button type="button" aria-label={running ? "暂停朗读" : state.status === "paused" ? "继续朗读" : "开始朗读"} onClick={running ? onPause : onPlay}>{running ? <Pause size={17} /> : <Play size={17} />}</button>
                <button type="button" aria-label="下一段" disabled={!state.position} onClick={() => onMove(1)}><SkipForward size={16} /></button>
                <button type="button" aria-label="停止朗读" onClick={onStop} disabled={state.status === "idle"}><Square size={15} /></button>
                <button type="button" className="reading-tts-location" onClick={onFollow} disabled={!state.position || (!running && state.status !== "paused")} title="定位到当前朗读段并恢复跟随">{status}{state.position ? ` · ${state.position.chapterIndex + 1}章 ${state.position.paragraphIndex + 1}段` : ""}{!following && state.position && (running || state.status === "paused") ? " · 恢复跟随" : ""}</button>
                <button type="button" aria-label="朗读音色与语速" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><Volume2 size={17} /></button>
            </div>
            {expanded && <div className="reading-tts-options">
                <label>音色<select aria-label="朗读音色" value={preferences.voiceConfigId || ""} onChange={event => onPreferences({ ...preferences, voiceConfigId: event.target.value || undefined })}>
                    <option value="">跟随共读角色 / 当前绑定</option>
                    {preferences.voiceConfigId && !voices.some(item => item.id === preferences.voiceConfigId) && <option value={preferences.voiceConfigId}>原音色已删除，请重新选择</option>}
                    {voices.map(item => <option key={item.id} value={item.id}>{item.name || item.provider}{item.enableTTS ? "" : "（未启用）"}</option>)}
                </select></label>
                <label>语速<select aria-label="朗读语速" value={preferences.speed ?? ""} onChange={event => onPreferences({ ...preferences, speed: event.target.value ? Number(event.target.value) : undefined })}>
                    <option value="">跟随配置</option>{[0.75, 1, 1.25, 1.5, 2].map(speed => <option value={speed} key={speed}>{speed}×</option>)}
                </select></label>
                <label>语气<select aria-label="朗读语气" value={preferences.emotion || ""} onChange={event => onPreferences({ ...preferences, emotion: event.target.value || undefined })}>
                    <option value="">自动 / 默认</option>{["fluent", "calm", "happy", "sad", "angry", "fearful", "surprised"].map(emotion => <option key={emotion} value={emotion}>{emotion}</option>)}
                </select></label>
                {voice && voice.provider !== "Minimax" && <span className="reading-tts-note">当前服务不使用语气参数</span>}
            </div>}
            {state.error && <div className="reading-tts-error" role="alert"><span>{state.error}</span><button type="button" onClick={onRetry}>重试</button></div>}
        </section>
    );
}
