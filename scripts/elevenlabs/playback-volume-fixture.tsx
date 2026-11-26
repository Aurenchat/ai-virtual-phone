import React from "react";
import { createRoot } from "react-dom/client";
import { VoiceSettings } from "../../components/settings/voice-settings";
import { MessageBubble } from "../../components/chat/message-bubble";
import { useReadingTts } from "../../components/reading/use-reading-tts";
import { hydrateKvDb } from "../../lib/kv-db";
import { ensureSettingsStorageHydrated, loadVoiceConfigs, saveVoiceConfigs, saveBindingConfig } from "../../lib/settings-storage";
import { setTtsVolume } from "../../lib/tts-service";
import { createPlaybackVolumeNode } from "../../lib/speech-playback-volume";
import type { VoiceApiConfig } from "../../lib/settings-types";

const root = createRoot(document.getElementById("app")!);
let revision = 0;
const base: VoiceApiConfig = { id: "a", name: "Eleven A", provider: "ElevenLabs", apiKey: "fixture", defaultVoice: "voice", model: "eleven_multilingual_v2", enableTTS: true, enableSTT: false };
function tone() {
    const samples = 24000 * 20, buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer);
    const string = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    string(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); string(8, "WAVEfmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    string(36, "data"); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.sin(i * 2 * Math.PI * 440 / 24000) * 3000, true);
    return new Blob([buffer], { type: "audio/wav" });
}
let dataUrl = "";
const chapter = async (index: number) => ({ id: `chapter-${index}`, bookId: "synthetic", title: `Chapter ${index}`, index, paragraphs: ["alpha", "beta", "gamma"] });
const singleChapter = async (index: number) => ({ ...(await chapter(index)), paragraphs: ["alpha"] });
function Reader({ single = false }: { single?: boolean }) {
    const reader = useReadingTts({ bookId: "synthetic", preferences: { voiceConfigId: "a" }, chapterCount: single ? 1 : 2, getChapter: single ? singleChapter : chapter, active: true });
    // The test intercepts only the provider HTTP response; hook/controller/player remain real.
    return <div>
        <button onClick={() => reader.start({ bookId: "synthetic", chapterIndex: 0, paragraphIndex: 0 })}>reader start</button>
        <button onClick={() => reader.controller.pause()}>reader pause</button>
        <button onClick={() => reader.controller.resume()}>reader resume</button>
        <button onClick={() => reader.controller.move(1)}>reader next</button>
        <button onClick={() => reader.start({ bookId: "synthetic", chapterIndex: 1, paragraphIndex: 0 })}>reader chapter</button>
        <button onClick={() => reader.controller.stop()}>reader stop</button>
        <output data-testid="reader-state">{JSON.stringify(reader.state)}</output>
    </div>;
}
const probe = {
    async ready(source = tone()) {
        await hydrateKvDb(); await ensureSettingsStorageHydrated();
        saveVoiceConfigs([base, { ...base, id: "b", name: "Eleven B", playbackVolume: 2 }, { ...base, id: "mini", name: "MiniMax", provider: "Minimax", speechVolume: 1.7, playbackVolume: 2 }]);
        saveBindingConfig({ globalDefaults: {}, characterBindings: ["a", "b"].map(id => ({ characterId: id, defaults: { voiceConfigId: id }, appOverrides: {} })) });
        dataUrl = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(source); });
    },
    configs: loadVoiceConfigs,
    setVolume(id: string, playbackVolume: number) { saveVoiceConfigs(loadVoiceConfigs().map(config => config.id === id ? { ...config, playbackVolume } : config)); },
    mountSettings() { root.render(<VoiceSettings key={++revision} />); },
    mountBubbles(synthesize = false) {
        root.render(<div key={++revision}>{["a", "b", "user"].map(id => <div data-case={id} key={id}>
            <MessageBubble characterId={id === "user" ? "a" : id} msg={{ id, sessionId: "fixture", role: id === "user" ? "user" : "assistant", content: "", status: "sent", createdAt: new Date().toISOString(), mediaType: "audio", mediaUrl: synthesize ? undefined : dataUrl, mediaData: { label: "Hello.", synthesizedFromText: synthesize ? undefined : "Hello." } }} />
        </div>)}</div>);
    },
    mountReader(single = false) { root.render(<Reader key={++revision} single={single} />); },
    unmount() { root.render(null); },
    tone, dataUrl: () => dataUrl, global: setTtsVolume,
    async renderGain(gain: number, global: number, amplitude = .1) {
        const context = new OfflineAudioContext(1, 24000, 24000), buffer = context.createBuffer(1, 24000, 24000);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 2 * Math.PI * 440 / 24000) * amplitude;
        const source = context.createBufferSource(); source.buffer = buffer;
        const node = createPlaybackVolumeNode(context); node.set(gain); node.output.gain.value = global;
        source.connect(node.input); node.output.connect(context.destination); source.start();
        const output = (await context.startRendering()).getChannelData(0).slice(1000, -1000);
        return { rms: Math.sqrt(output.reduce((sum, value) => sum + value * value, 0) / output.length), peak: Math.max(...output.map(Math.abs)) };
    },
};
(window as any).playbackVolumeTest = probe;
