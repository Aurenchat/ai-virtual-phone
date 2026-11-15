import React from "react";
import { createRoot } from "react-dom/client";
import { VoiceSettings } from "../../components/settings/voice-settings";
import { hydrateKvDb } from "../../lib/kv-db";
import { ensureSettingsStorageHydrated, loadVoiceConfigs, saveVoiceConfigs } from "../../lib/settings-storage";
import { synthesizeSpeech } from "../../lib/tts-service";
import { parseAIResponse } from "../../lib/rich-message-parser";
import { voicePlaybackText } from "../../lib/voice-expression";
import { splitBilingualText } from "../../lib/bilingual-text";

const root = createRoot(document.getElementById("app")!);
let revision = 0;
const probe = {
    async ready() {
        await hydrateKvDb(); await ensureSettingsStorageHydrated();
        saveVoiceConfigs([{ id: "eleven-fixture", name: "Eleven fixture", provider: "ElevenLabs", apiKey: "fixture-only",
            defaultVoice: "voice/test", model: "eleven_multilingual_v2", enableTTS: true, enableSTT: false }]);
    },
    mount() { root.render(<VoiceSettings key={++revision} />); },
    configs: loadVoiceConfigs,
    async bubble() {
        const part = parseAIResponse("[语音条:{voice:soft, affectionate tone} Hello.|你好。]", []).parts[0];
        const authored = voicePlaybackText(part.mediaData?.label ?? "", part.mediaData?.speechText);
        await synthesizeSpeech(splitBilingualText(authored)?.original || authored, { ...loadVoiceConfigs()[0], model: "eleven_v4" });
        return part;
    },
};
(window as any).elevenTest = probe;
