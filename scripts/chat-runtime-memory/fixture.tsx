// Disposable origin only: real PhoneChatApp/ChatRoom, chat DB and asset stores.
import React from "react";
import { createRoot } from "react-dom/client";
import * as chat from "../../lib/chat-storage";
import { chatDb } from "../../lib/chat-db";
import { hydrateKvDb, kvGet } from "../../lib/kv-db";
import { saveCharacters } from "../../lib/character-storage";
import { ensureSettingsStorageHydrated, saveApiConfigs, saveBindingConfig } from "../../lib/settings-storage";
import { storeMediaBlob, loadMediaBlob } from "../../lib/media-cache-storage";
import { createStickerPack, addStickerToPack, togglePackAssignment, resolveCustomStickerUrl, loadStickerPacks } from "../../lib/custom-sticker-storage";
import { CHAT_OPEN_SESSION_EVENT } from "../../lib/chat-notification-events";
import { CHAT_SESSIONS_MERGED_EVENT } from "../../lib/chat-session-merge";

export function init(Shell: React.ComponentType) {
    const root = createRoot(document.getElementById("app")!);
    const sessions: Record<string, chat.ChatSession> = {};
    let media: { image: string; audio: string; sticker: string };
    let completions = 0;
    window.addEventListener("chat-bg-complete", () => completions++);
    const probe = {
        sessions,
        async ready() {
            await hydrateKvDb(); await chat.hydrateChatStorage(); await ensureSettingsStorageHydrated();
            const now = new Date().toISOString();
            saveCharacters(["A", "B", "C"].map(id => ({ id, name: `Memory ${id}`, avatar: null, persona: "", createdAt: now, updatedAt: now })));
            for (const id of ["A", "B", "C"]) {
                chat.addChatContact(id);
                sessions[id] = { ...chat.createOrGetSession(id), autoReplied: true, streamOnline: false };
            }
            chat.saveChatSessions(Object.values(sessions));
            const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=="), c => c.charCodeAt(0));
            const imageBlob = new Blob([png], { type: "image/png" });
            const image = await storeMediaBlob(imageBlob, "image/png", "image");
            const wav = new ArrayBuffer(44 + 16000);
            const view = new DataView(wav);
            const str = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
            str(0, "RIFF"); view.setUint32(4, wav.byteLength - 8, true); str(8, "WAVEfmt ");
            view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
            view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
            str(36, "data"); view.setUint32(40, 16000, true);
            const audioBlob = new Blob([wav], { type: "audio/wav" });
            // VoiceMessageBubble's persisted TTS output uses a data URL.
            const audio = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader(); reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject; reader.readAsDataURL(audioBlob);
            });
            const pack = createStickerPack("Runtime memory fixture");
            const sticker = await addStickerToPack(pack.id, "memory-sticker", imageBlob);
            if (!sticker?.assetId) throw Error("Fixture sticker asset was not saved");
            togglePackAssignment(pack.id, "A");
            media = { image, audio, sticker: sticker.assetId };
            for (let i = 0; i < 107; i++) chat.pushChatMessage({ sessionId: sessions.A.id, role: i % 2 ? "assistant" : "user", content: `history-${i}` });
            chat.pushChatMessage({ sessionId: sessions.A.id, role: "assistant", content: "", mediaType: "image", mediaUrl: image });
            const voice = chat.pushChatMessage({ sessionId: sessions.A.id, role: "assistant", content: "", mediaType: "audio", mediaData: { label: "Stored voice", voiceDuration: 1 } });
            await chat.persistMessageVoiceAudio(voice.id, audio, "Stored voice");
            chat.pushChatMessage({ sessionId: sessions.A.id, role: "assistant", content: "", mediaType: "sticker", mediaData: { label: "memory-sticker" } });
            for (const id of ["B", "C"]) chat.pushChatMessage({ sessionId: sessions[id].id, role: "user", content: `Session ${id}` });
            saveApiConfigs([{ id: "fixture-api", provider: "openai", apiKey: "fixture-only", baseUrl: location.origin + "/v1", defaultModel: "fixture", enableNativeTools: false, enableImageRecognition: false, enableImageGeneration: false }]);
            saveBindingConfig({ globalDefaults: { apiConfigId: "fixture-api" }, characterBindings: [] });
        },
        mount() { root.render(<Shell />); },
        open(id: string) { window.dispatchEvent(new CustomEvent(CHAT_OPEN_SESSION_EVENT, { detail: { sessionId: sessions[id].id } })); },
        merged(ids: string[]) { window.dispatchEvent(new CustomEvent(CHAT_SESSIONS_MERGED_EVENT, { detail: { removedSessionIds: ids.map(id => sessions[id].id) } })); },
        reply() { window.dispatchEvent(new CustomEvent(chat.CHAT_REQUEST_REPLY_EVENT, { detail: { sessionId: sessions.A.id } })); },
        messages() { return chat.loadChatMessages(sessions.A.id); },
        lock() { return kvGet("chat-generating:" + sessions.A.id); },
        completions() { return completions; },
        async snapshot() {
            const records = await chatDb.messages.toArray();
            return { records: records.sort((a, b) => a.id.localeCompare(b.id)), packs: loadStickerPacks(), media };
        },
        async assets() {
            const image = await loadMediaBlob(media.image);
            const sticker = await resolveCustomStickerUrl(media.sticker);
            return { imageBytes: image?.blob.size, sticker };
        },
    };
    (window as unknown as { hostMemoryTest: typeof probe }).hostMemoryTest = probe;
}
