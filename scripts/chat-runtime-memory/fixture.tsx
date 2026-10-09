// Disposable origin only: real PhoneChatApp/ChatRoom, chat DB and asset stores.
import React from "react";
import { createRoot } from "react-dom/client";
import * as chat from "../../lib/chat-storage";
import { chatDb } from "../../lib/chat-db";
import { hydrateKvDb, kvGet } from "../../lib/kv-db";
import { saveCharacters, loadCharacters } from "../../lib/character-storage";
import { ensureSettingsStorageHydrated, saveApiConfigs, saveBindingConfig } from "../../lib/settings-storage";
import { storeMediaBlob, loadMediaBlob } from "../../lib/media-cache-storage";
import { createStickerPack, addStickerToPack, togglePackAssignment, resolveCustomStickerUrl, loadStickerPacks, renameStickerInPack, addStickerByUrlToPack } from "../../lib/custom-sticker-storage";
import { CHAT_OPEN_SESSION_EVENT } from "../../lib/chat-notification-events";
import { CHAT_SESSIONS_MERGED_EVENT } from "../../lib/chat-session-merge";
import { PhoneChatApp } from "../../components/chat/phone-chat-app";
import * as bubbles from "../../components/chat/message-bubble";
import { findStickerByName } from "../../lib/sticker-data";
import { installMediaSpikeFixture } from "./media-spike-fixture";

export function init(Shell: React.ComponentType) {
    const root = createRoot(document.getElementById("app")!);
    const sessions: Record<string, chat.ChatSession> = {};
    installMediaSpikeFixture(root, sessions);
    let media: { image: string; audio: string; sticker: string };
    let completions = 0;
    const pacing: Record<string, number> = {};
    let pacingObserver: MutationObserver | null = null;
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
        observePacing() {
            pacingObserver?.disconnect();
            pacingObserver = new MutationObserver(() => {
                for (const element of document.querySelectorAll(".chat-room-wrapper .chat-markdown-paragraph")) {
                    const text = element.textContent || "";
                    if (text.startsWith("Paced reply ") && pacing[text] === undefined) pacing[text] = performance.now();
                }
            });
            pacingObserver.observe(document.getElementById("app")!, { childList: true, subtree: true });
        },
        pacing() { return { ...pacing }; },
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

    // Synthetic window fixtures share the existing disposable browser origin.
    let windowScene = 0;
    let windowSession: chat.ChatSession;
    let windowRows: chat.ChatMessage[] = [];
    (window as any).windowTest = {
        scene(count: number, mixed = false, group = false) {
            const id = `window-${++windowScene}`;
            const contactId = `${id}-character`;
            const now = new Date().toISOString();
            saveCharacters([...loadCharacters(), { id: contactId, name: contactId, avatar: null, persona: "", createdAt: now, updatedAt: now }]);
            windowSession = { id, contactId, unreadCount: 0, updatedAt: now, isPinned: false, autoReplied: true,
                ...(group ? { isGroup: true, groupName: "Window group", participantIds: [contactId, "B"] } : {}) };
            chat.saveChatSessions([...chat.loadChatSessions(), windowSession]);
            windowRows = [];
            for (let i = 0; i < count; i++) {
                const input: Omit<chat.ChatMessage, "id" | "createdAt" | "status"> = { sessionId: windowSession.id, role: i % 2 ? "assistant" : "user", content: `Window row ${i}` };
                if (mixed && i % 10 === 0) Object.assign(input, { role: "tool", mediaType: "tool_result", content: `Hidden tool ${i}`, nativeToolResult: { toolCallId: `tool-${i}`, name: "synthetic", content: "synthetic result" } });
                if (mixed && i >= 63 && i <= 65) Object.assign(input, { role: i === 64 ? "user" : "system", content: i === 63 ? "发起了语音通话" : i === 65 ? "挂断了语音通话，时长 0:01" : "Synthetic call line" });
                if (mixed && i >= 74 && i <= 77) Object.assign(input, { role: "assistant", responseBatchId: "window-batch", responseRoundId: "window-round", rawResponseText: "Synthetic response batch" });
                windowRows.push(chat.pushChatMessage(input));
            }
            (window as any).__windowReads = [];
            root.render(<PhoneChatApp key={windowSession.id} initialSessionId={windowSession.id} onClose={() => root.render(null)} />);
            return { id: windowSession.id, ids: windowRows.map(m => m.id) };
        },
        leave() { root.render(null); },
        enter() {
            (window as any).__windowReads = [];
            root.render(<PhoneChatApp key={windowSession.id} initialSessionId={windowSession.id} onClose={() => root.render(null)} />);
        },
        rows() { return chat.loadChatMessages(windowSession.id); },
        async persistedIds() { return (await chatDb.messages.where("sessionId").equals(windowSession.id).toArray()).sort(chat.compareChatMessages).map(m => m.id); },
    };

    // Cache access is appended by the browser test loader, never shipped by Host.
    const cache = (bubbles as unknown as { __stickerCacheTest: {
        get: (id: string) => string | undefined; set: (id: string, url: string) => void;
        resolve: (id: string) => Promise<string | null>; reset: () => void;
        maxEntries: number; maxChars: number;
        snapshot: () => { keys: string[]; chars: number; active: number; queued: number; inFlight: number };
    } }).__stickerCacheTest;
    const assets: Record<string, { name: string; assetId: string }[]> = {};
    const reads: string[] = [];
    const imageAssetReads: string[] = [];
    const gates = new Map<string, () => void>();
    const outcomes = new Map<string, string | null>();
    const failures = new Set<string>();
    let deferred = false, activeReads = 0, maxActiveReads = 0, sceneNumber = 0;
    const readProbe = async (assetId: string, read: () => Promise<string | null>) => {
        reads.push(assetId); activeReads++; maxActiveReads = Math.max(maxActiveReads, activeReads);
        try {
            if (deferred) await new Promise<void>(resolve => gates.set(assetId, resolve));
            if (failures.has(assetId)) throw Error("Intentional sticker read rejection");
            if (outcomes.has(assetId)) return outcomes.get(assetId)!;
            return await read();
        } finally { activeReads--; }
    };
    const lazyProbe = {
        cache, assets,
        async ready() {
            const now = new Date().toISOString();
            saveCharacters([...loadCharacters(), ...["lazy-A", "lazy-B", "lazy-C"].map(id => ({ id, name: id, avatar: null, persona: "", createdAt: now, updatedAt: now }))]);
            const png = (await loadMediaBlob(media.image))!.blob;
            for (const id of ["lazy-A", "lazy-B", "lazy-C"]) {
                const pack = createStickerPack(id); assets[id] = [];
                for (let i = 0; i < 30; i++) {
                    const name = i === 0 ? "微笑" : `${id}-sticker-${i}`;
                    const sticker = await addStickerToPack(pack.id, name, png);
                    if (!sticker) throw Error("Lazy fixture asset missing");
                    assets[id].push(sticker);
                }
                togglePackAssignment(pack.id, id);
            }
            if (!findStickerByName("微笑")?.emoji) throw Error("Fixture requires a built-in name collision");
            (window as unknown as { __stickerReadProbe: typeof readProbe }).__stickerReadProbe = readProbe;
            const localIds = new Set(Object.values(assets).flat().map(asset => asset.assetId));
            (window as unknown as { __stickerImageReadProbe: (ids: string[]) => void }).__stickerImageReadProbe = ids => {
                imageAssetReads.push(...ids.filter(id => localIds.has(id)));
            };
        },
        reset(defer = false) {
            if (activeReads || cache.snapshot().inFlight) throw Error("Reads must settle before resetting probes");
            cache.reset(); reads.length = 0; imageAssetReads.length = 0; gates.clear(); outcomes.clear(); failures.clear();
            deferred = defer; maxActiveReads = 0;
        },
        stats() { return { reads: [...reads], imageAssetReads: [...imageAssetReads], active: activeReads, maxActive: maxActiveReads, waiting: [...gates.keys()] }; },
        release(id: string) { const release = gates.get(id); gates.delete(id); release?.(); },
        releaseAll() { deferred = false; for (const release of gates.values()) release(); gates.clear(); },
        outcome(id: string, value: string | null) { outcomes.set(id, value); },
        fail(id: string) { failures.add(id); },
        scene(stickers: number[] = [], group = false, olderSticker?: number) {
            const session: chat.ChatSession = { id: `lazy-scene-${++sceneNumber}`, contactId: "lazy-A", unreadCount: 0, updatedAt: new Date().toISOString(), isPinned: false, autoReplied: true,
                ...(group ? { isGroup: true, groupName: "Lazy group", participantIds: ["lazy-A", "lazy-B", "lazy-C"] } : {}) };
            chat.saveChatSessions([...chat.loadChatSessions(), session]);
            const pushSticker = (index: number) => chat.pushChatMessage({ sessionId: session.id, role: "assistant", content: "", mediaType: "sticker", mediaData: { label: assets["lazy-A"][index].name } });
            if (olderSticker !== undefined) for (let i = 0; i < 60; i++) pushSticker(olderSticker);
            for (let i = 0; i < 50 - stickers.length; i++) chat.pushChatMessage({ sessionId: session.id, role: "user", content: `Immediate text ${i}` });
            stickers.forEach(pushSticker);
            root.render(<PhoneChatApp key={session.id} initialSessionId={session.id} onClose={() => root.render(null)} />);
            return session.id;
        },
        leave() { root.render(null); },
        rename(index: number, name: string) {
            const asset = assets["lazy-A"][index];
            const pack = loadStickerPacks().find(p => p.stickers.some(s => s.assetId === asset.assetId))!;
            renameStickerInPack(pack.id, pack.stickers.find(s => s.assetId === asset.assetId)!.id, name);
            asset.name = name;
        },
        shareWithB(index: number) {
            const pack = loadStickerPacks().find(p => p.stickers.some(s => s.assetId === assets["lazy-A"][index].assetId))!;
            togglePackAssignment(pack.id, "lazy-B");
        },
        async replaceAssignment(index: number) {
            const asset = assets["lazy-A"][index];
            const original = loadStickerPacks().find(p => p.stickers.some(s => s.assetId === asset.assetId))!;
            togglePackAssignment(original.id, "lazy-A");
            const pack = createStickerPack("Replacement assignment");
            const replacement = await addStickerToPack(pack.id, asset.name, (await loadMediaBlob(media.image))!.blob);
            togglePackAssignment(pack.id, "lazy-A");
            return replacement!.assetId;
        },
        external(url: string) {
            const pack = createStickerPack("External fixture");
            addStickerByUrlToPack(pack.id, "external-sticker", url); togglePackAssignment(pack.id, "lazy-A");
        },
        direct(label: string, stickerUrl?: string, characterId = "lazy-A") {
            const msg: chat.ChatMessage = { id: "direct-sticker", sessionId: "test", role: "assistant", content: "", createdAt: new Date().toISOString(), status: "sent", mediaType: "sticker", mediaData: { label, stickerUrl } };
            root.render(<bubbles.MessageBubble msg={msg} characterId={characterId} />);
        },
    };
    (window as unknown as { lazyStickerTest: typeof lazyProbe }).lazyStickerTest = lazyProbe;
}
