"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSpeechMediaPlayer, resolveVoiceConfig, synthesizeSpeech } from "@/lib/tts-service";
import { loadVoiceConfigs } from "@/lib/settings-storage";
import { ReadingTtsController, type ReadingTtsOptions, type ReadingTtsPosition, type ReadingTtsPreferences, type ReadingTtsState } from "@/lib/reading-tts";
import type { BookChapter } from "@/lib/reading-types";

export function useReadingTts({ bookId, characterId, preferences, chapterCount, getChapter, active }: {
    bookId: string; characterId?: string; preferences: ReadingTtsPreferences; chapterCount: number;
    getChapter: (index: number, signal: AbortSignal) => Promise<BookChapter | undefined>; active: boolean;
}) {
    const latest = useRef({ getChapter, chapterCount });
    latest.current = { getChapter, chapterCount };
    const [state, setState] = useState<ReadingTtsState>({ status: "idle", position: null, error: null });
    const [voices, setVoices] = useState(loadVoiceConfigs);
    const [, setBindingVersion] = useState(0);
    const [controller] = useState(() => new ReadingTtsController({
        bookId, chapterCount: () => latest.current.chapterCount,
        getChapter: (index, signal) => latest.current.getChapter(index, signal),
        synthesize: synthesizeSpeech, player: createSpeechMediaPlayer(), onChange: setState,
    }));
    useEffect(() => {
        const reload = () => { setVoices(loadVoiceConfigs()); setBindingVersion(value => value + 1); };
        window.addEventListener("focus", reload);
        window.addEventListener("settings-bindings-updated", reload);
        return () => { window.removeEventListener("focus", reload); window.removeEventListener("settings-bindings-updated", reload); };
    }, []);
    useEffect(() => { if (active) setVoices(loadVoiceConfigs()); }, [active]);
    const voice = preferences.voiceConfigId ? voices.find(item => item.id === preferences.voiceConfigId) ?? null : resolveVoiceConfig(characterId, "reading");
    // Fingerprint also detects edits to an existing config, without exposing its credentials in UI/cache keys.
    const optionsKey = JSON.stringify({ voice, ...preferences, characterId });
    useLayoutEffect(() => {
        if (!active) controller.stop();
        controller.configure(JSON.parse(optionsKey) as ReadingTtsOptions);
    }, [controller, optionsKey, active]);
    useEffect(() => () => controller.dispose(), [controller]);
    const start = useCallback((position: ReadingTtsPosition | ((signal: AbortSignal) => Promise<ReadingTtsPosition>)) => controller.start(position), [controller]);
    return { state, voice, voices, controller, start, activePosition: ["loading", "playing", "paused"].includes(state.status) ? state.position : null };
}
