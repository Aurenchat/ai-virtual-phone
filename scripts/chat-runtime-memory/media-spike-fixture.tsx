import React from "react";
import type { Root } from "react-dom/client";
import * as chat from "../../lib/chat-storage";
import { kvGet, kvSet } from "../../lib/kv-db";
import { loadCharacters } from "../../lib/character-storage";
import * as panels from "../../components/chat/emoji-panel";
import { VoiceCallScreen } from "../../components/chat/voice-call-screen";
import { ChatRoom } from "../../components/chat/chat-room";
import { ChatRuntimeDiagnostics } from "../../components/settings/chat-runtime-diagnostics";
import { readGenerationDiagnostics } from "../../lib/chat-generation-diagnostics";
import { readChatRuntimeDiagnostics } from "../../lib/chat-runtime-diagnostics";
import { loadMediaBlob } from "../../lib/media-cache-storage";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
export function installMediaSpikeFixture(root: Root, sessions: Record<string, chat.ChatSession>) {
    const w = window as any;
    const calls: string[] = [];
    const gates = new Map<string, () => void>();
    let active = 0, peak = 0, defer = true;
    w.__panelReadProbe = async (id: string) => {
        calls.push(id); active++; peak = Math.max(peak, active);
        try { if (defer) await new Promise<void>(resolve => gates.set(id, resolve)); return PNG; }
        finally { active--; }
    };
    let photoReads = 0, photoStores = 0, photoFailure = false, photoGate: (() => void) | null = null;
    const originalReader = FileReader.prototype.readAsDataURL;
    let readerInstalled = false;
    let bgGate: (() => void) | null = null, bgReads = 0;
    let callFrames: FrameRequestCallback[] = [];
    const requestFrame = window.requestAnimationFrame.bind(window);
    const cancelFrame = window.cancelAnimationFrame.bind(window);
    let frameOverride = false;
    const api = {
        PNG,
        generation: readGenerationDiagnostics,
        runtime: readChatRuntimeDiagnostics,
        setupPanel() {
            const packs = Array.from({ length: 5 }, (_, p) => ({ id: `panel-pack-${p}`, name: `Panel pack ${p}`, createdAt: new Date().toISOString(),
                stickers: Array.from({ length: 20 }, (_, i) => ({ id: `tile-${i}`, name: `panel-${p}-${i}`, assetId: `panel-asset-${p}-${i === 1 ? 0 : i}` })) }));
            // One external image; all other metadata remains local assetId.
            (packs[0].stickers[2] as any).externalUrl = PNG;
            kvSet('ai_phone_sticker_packs_v1', JSON.stringify([...JSON.parse(kvGet('ai_phone_sticker_packs_v1') || '[]'), ...packs]));
            const assignments = JSON.parse(kvGet('ai_phone_sticker_assign_v1') || '{}');
            for (const pack of packs) assignments[pack.id] = ['panel-character'];
            kvSet('ai_phone_sticker_assign_v1', JSON.stringify(assignments));
        },
        panel() { root.render(<panels.StickerPanel sessionId={sessions.A.id} characterIds={["panel-character"]} onSend={() => {}} />); },
        extendPanel() {
            const packs = JSON.parse(kvGet('ai_phone_sticker_packs_v1') || '[]');
            const pack = packs.find((p: any) => p.id === 'panel-pack-0');
            for (let i = 20; i < 60; i++) pack.stickers.push({ id: `tile-${i}`, name: `panel-0-${i}`, assetId: `panel-asset-0-${i}` });
            kvSet('ai_phone_sticker_packs_v1', JSON.stringify(packs));
        },
        stats() { return { calls: [...calls], active, peak, waiting: [...gates.keys()] }; },
        releasePanel() { defer = false; gates.forEach(release => release()); gates.clear(); },
        resetPanel() { calls.length = 0; peak = 0; defer = true; },
        cacheTests() {
            const create = (panels as any).__createPanelResolverTest;
            const cache = create(() => {});
            for (let i = 0; i < 24; i++) cache._put(String(i), PNG);
            cache.get('0'); cache._put('24', PNG);
            const entries = cache._snapshot();
            for (let i = 0; i < 10; i++) cache._put('large-' + i, 'x'.repeat(1024 * 1024));
            const chars = cache._snapshot();
            cache._put('oversize', 'x'.repeat(6 * 1024 * 1024 + 1));
            const oversize = cache.get('oversize');
            cache.dispose();
            return { entries, chars, oversize, disposed: cache._snapshot() };
        },
        async oversizeTile() {
            const packs = JSON.parse(kvGet('ai_phone_sticker_packs_v1') || '[]');
            packs.find((p: any) => p.id === 'panel-pack-0').stickers = [{ id: 'huge', name: 'huge', assetId: 'huge' }];
            kvSet('ai_phone_sticker_packs_v1', JSON.stringify(packs));
            w.__panelReadProbe = async () => PNG + '#' + 'x'.repeat(6 * 1024 * 1024 + 1);
            root.render(<panels.StickerPanel key="large" characterId="panel-character" onSend={() => {}} />);
        },
        async oversizeCache() {
            const create = (panels as any).__createPanelResolverTest;
            const cache = create(() => {});
            const url = await cache.resolve('huge', () => true);
            return { length: url?.length, cached: cache.get('huge'), snapshot: cache._snapshot() };
        },
        async setupPhoto() {
            if (!readerInstalled) {
                FileReader.prototype.readAsDataURL = function(blob) { photoReads++; return originalReader.call(this, blob); };
                readerInstalled = true;
            }
            w.__photoStoreProbe = async (_blob: Blob, _mime: string, category: string, store: () => Promise<string>) => {
                if (category === 'image') {
                    photoStores++;
                    await new Promise<void>(resolve => { photoGate = resolve; });
                    if (photoFailure) throw Error('Intentional quota failure');
                }
                return store();
            };
            api.room();
        },
        room() { root.render(<ChatRoom key={Date.now()} session={sessions.B} onBack={() => root.render(null)} onDeleted={() => {}} />); },
        photoStats() { return { reads: photoReads, stores: photoStores }; },
        releasePhoto(failure = false) { photoFailure = failure; photoGate?.(); photoGate = null; },
        messages() { return chat.loadChatMessages(sessions.B.id); },
        async storedPhoto() {
            const msg = api.messages().filter(m => m.mediaType === 'image').at(-1)!;
            const record = await loadMediaBlob(msg.mediaUrl!);
            return { msg, bytes: record?.blob.size, mime: record?.mimeType };
        },
        legacyPhoto() { chat.pushChatMessage({ sessionId: sessions.B.id, role: 'user', content: '', mediaType: 'image', mediaUrl: PNG }); api.room(); },
        call(initiator: 'character' | 'user', background = true, strict = false) {
            w.__callHistoryReads = []; w.__callAudio = []; w.__callContexts = []; bgReads = 0;
            Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Android' });
            w.__callBgProbe = async () => { bgReads++; await new Promise<void>(resolve => { bgGate = resolve; }); return PNG; };
            const call = <VoiceCallScreen session={{ ...sessions.A, voiceBackground: background ? 'fixture-call-background' : undefined }}
                character={loadCharacters().find(c => c.id === 'A')!} initiator={initiator} onEnd={() => root.render(null)} />;
            root.render(strict ? <React.StrictMode>{call}</React.StrictMode> : call);
        },
        holdFrames() {
            frameOverride = true; callFrames = [];
            window.requestAnimationFrame = cb => { callFrames.push(cb); return callFrames.length; };
            window.cancelAnimationFrame = id => { callFrames[id - 1] = () => {}; };
        },
        flushFrame() { const frames = callFrames; callFrames = []; frames.forEach(cb => cb(performance.now())); },
        restoreFrames() { if (frameOverride) { window.requestAnimationFrame = requestFrame; window.cancelAnimationFrame = cancelFrame; frameOverride = false; } },
        callStats() { return { history: w.__callHistoryReads, audio: w.__callAudio, contexts: w.__callContexts, bgReads }; },
        releaseBackground() { bgGate?.(); bgGate = null; },
        diagnostics() { root.render(<ChatRuntimeDiagnostics />); },
        groupGeneration() {
            const session: chat.ChatSession = { ...sessions.B, id: 'diagnostic-group', contactId: 'A', isGroup: true,
                groupName: 'Diagnostic group', participantIds: ['A', 'C'], streamOnline: false };
            chat.saveChatSessions([...chat.loadChatSessions(), session]);
            chat.pushChatMessage({ sessionId: session.id, role: 'user', content: 'Group generation fixture' });
            root.render(<ChatRoom session={session} onBack={() => root.render(null)} onDeleted={() => {}} />);
        },
        triggerGroup() { window.dispatchEvent(new CustomEvent(chat.CHAT_REQUEST_REPLY_EVENT, { detail: { sessionId: 'diagnostic-group' } })); },
        leave() { root.render(null); },
    };
    w.mediaSpikeTest = api;
}
