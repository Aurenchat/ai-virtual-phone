import React from "react";
import { createRoot } from "react-dom/client";
import { VoiceSettings } from "../../components/settings/voice-settings";
import { hydrateKvDb } from "../../lib/kv-db";
import { ensureSettingsStorageHydrated, loadVoiceConfigs, saveVoiceConfigs } from "../../lib/settings-storage";
import type { VoiceApiConfig } from "../../lib/settings-types";

const root = createRoot(document.getElementById("app")!);
let revision = 0;
const oldMinimax: VoiceApiConfig = {
    id: "legacy-minimax", name: "旧版 MiniMax", provider: "Minimax", apiKey: "fixture",
    baseUrl: "https://api.minimaxi.com/v1", model: "speech-2.8-turbo",
    defaultVoice: "male-qn-qingse", enableSTT: false, enableTTS: true,
};
const openai: VoiceApiConfig = {
    id: "openai", name: "OpenAI", provider: "OpenAI", apiKey: "fixture",
    baseUrl: "https://api.openai.com/v1", model: "tts-1", defaultVoice: "alloy",
    enableSTT: false, enableTTS: true,
};

const probe = {
    async ready() {
        await hydrateKvDb();
        await ensureSettingsStorageHydrated();
        saveVoiceConfigs([oldMinimax, openai]);
    },
    mount() { root.render(<VoiceSettings key={++revision} />); },
    configs() { return loadVoiceConfigs(); },
};

(window as Window & { voiceVolumeTest?: typeof probe }).voiceVolumeTest = probe;
