// Browser regression fixture: actual reader, storage, prompt assembler and message rendering.
import React from "react";
import { createRoot } from "react-dom/client";
import { ReadingViewer } from "../../components/reading/reading-viewer";
import * as reading from "../../lib/reading-storage";
import * as chat from "../../lib/chat-storage";
import * as settings from "../../lib/settings-storage";
import { hydrateKvDb } from "../../lib/kv-db";
import { saveCharacters } from "../../lib/character-storage";
import { assemblePromptPayload } from "../../lib/llm-prompt-assembler";
import { loadNativeTimeline, prepareShortTermContext } from "../../lib/short-term-assembler";
import { readReadingSelection } from "../../lib/reading-quote";
import { generateReadingChat } from "../../lib/reading-engine";
import { loadMemoryConfig, saveMemoryConfig } from "../../lib/memory-storage";
import type { Book } from "../../lib/reading-types";
import type { VoiceApiConfig } from "../../lib/settings-types";
import { currentReadingAnchor } from "../../lib/reading-tts-location";

const character = { id: "quote-test-character", name: "测试角色", avatar: null, persona: "共同阅读", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const root = createRoot(document.getElementById("app")!);
let ttsBook: Book | null = null;
const probe = {
    chat, reading, settings, readReadingSelection, currentReadingAnchor,
    configureTts() {
        const configs: VoiceApiConfig[] = [
            { id: "tts-openai", name: "已有 OpenAI 音色", provider: "OpenAI", apiKey: "fixture", baseUrl: location.origin + "/v1", defaultVoice: "alloy", model: "tts-1", enableSTT: false, enableTTS: true },
            { id: "tts-minimax", name: "已有 MiniMax 音色", provider: "Minimax", apiKey: "fixture", baseUrl: location.origin + "/v1", defaultVoice: "reader", model: "speech-02-hd", enableSTT: false, enableTTS: true },
        ];
        settings.saveVoiceConfigs(configs);
        settings.saveBindingConfig({ globalDefaults: { apiConfigId: "local", voiceConfigId: "tts-minimax" }, appDefaults: { reading: { voiceConfigId: "tts-openai" } }, characterBindings: [] });
    },
    async mountTts({ id = "tts-book", mode = "scroll", format = "txt", paragraphs, companion = true }: {
        id?: string; mode?: "scroll" | "page"; format?: Book["format"]; paragraphs?: string[][]; companion?: boolean;
    } = {}) {
        const text = paragraphs ?? [0, 1].map(chapter => Array.from({ length: 24 }, (_, index) => `章节${chapter + 1}段落${index + 1}。这里是用于连续朗读的正文。${"阅读高亮与原生选择应该共存，手动滚动不能被强行拉回。".repeat(2)}`));
        reading.saveReadingInteractionConfig({ ...reading.DEFAULT_READING_INTERACTION_CONFIG, readingMode: mode });
        ttsBook = { id, title: "朗读测试书", format, totalChapters: text.length, createdAt: new Date().toISOString() };
        await reading.addBook(ttsBook);
        await reading.saveChapters(id, text.map((items, index) => ({ id: `${id}-${index}`, bookId: id, index, title: `第${index + 1}章`, paragraphs: items,
            ...(format === "pdf" ? { pageStart: index * 5 + 1, pageEnd: (index + 1) * 5 } : {}) })));
        await reading.saveProgress({ bookId: id, chapterIndex: 0, scrollPosition: 0, companionCharacterId: companion ? character.id : undefined, readingMode: mode, lastReadAt: new Date().toISOString() });
        root.render(<ReadingViewer key={id} book={ttsBook} onBack={() => {}} />);
    },
    hideTts(active: boolean) { if (ttsBook) root.render(<ReadingViewer key={ttsBook.id} book={ttsBook} active={active} onBack={() => {}} />); },
    unmountTts() { root.render(<></>); },
    async ready() {
        await hydrateKvDb();
        await settings.ensureSettingsStorageHydrated();
        await chat.hydrateChatStorage();
        await reading.hydrateReadingStorage();
        saveCharacters([character]);
        chat.addChatContact(character.id);
        settings.saveApiConfigs([{ id: "local", provider: "openai", apiKey: "fixture", baseUrl: location.origin + "/v1", defaultModel: "fixture", enableImageRecognition: false, enableImageGeneration: false }]);
        settings.saveBindingConfig({ globalDefaults: { apiConfigId: "local" }, characterBindings: [] });
        const session = chat.createOrGetSession(character.id);
        chat.pushChatMessage({ sessionId: session.id, origin: "reading_discuss", role: "user", content: "旧版共读消息" });
    },
    async mount(mode: "page" | "scroll" = "scroll", format: Book["format"] = "txt", id = "quote-test-book") {
        reading.saveReadingInteractionConfig({ ...reading.DEFAULT_READING_INTERACTION_CONFIG, readingMode: mode, bilingualTranslationEnabled: false });
        const book: Book = { id, title: `测试书-${id}`, format, totalChapters: 2, createdAt: new Date().toISOString() };
        await reading.addBook(book);
        await reading.saveChapters(id, [0, 1].map(index => ({ id: id + index, bookId: id, index, title: `第${index + 1}章`, paragraphs: ["这是第一段正文，可以只引用半句话。", "这是第二段正文，可以跨段自由选取。", ...Array.from({ length: 20 }, (_, i) => `后续正文第${i + 3}段，阅读翻页与连续滚动应保持正常。`)] })));
        await reading.saveAnnotation({ id: id + "-annotation", bookId: id, chapterIndex: 0, paragraphIndex: 0, characterId: character.id, characterName: character.name, content: "这条批注不能混入引用", createdAt: new Date().toISOString() });
        await reading.saveProgress({ bookId: id, chapterIndex: 0, scrollPosition: 0, companionCharacterId: character.id, readingMode: mode, lastReadAt: new Date().toISOString() });
        root.render(<ReadingViewer key={`${id}:${mode}:${format}`} book={book} onBack={() => {}} />);
    },
    messages() { return chat.loadChatMessages(chat.createOrGetSession(character.id).id); },
    prompt(unified: boolean) {
        const history = probe.messages();
        const context = unified ? prepareShortTermContext(character.id, "chat", { history }) : {};
        return assemblePromptPayload({ character, history, ...context, preset: null, worldBooks: [], regexes: [], userIdentity: null, appId: "reading", appTags: ["reading", "discuss"] });
    },
    timeline() { return loadNativeTimeline(character.id); },
    async longQuoteRequest() {
        const session = chat.createOrGetSession(character.id);
        const text = "长引用末尾不可截断。".repeat(1000);
        chat.pushChatMessage({ sessionId: session.id, origin: "reading_discuss", mediaType: "reading_discuss", role: "user", content: "讨论长引用", mediaData: { readingQuote: { text } } });
        const config = loadMemoryConfig();
        saveMemoryConfig({ ...config, shortTermTokenBudget: 1 });
        try {
            await generateReadingChat(session, { id: "long", title: "长引用", format: "txt", totalChapters: 1, createdAt: "" }, { chapterTitle: "第一章", chapterContent: "章节", annotations: [] }, character.id);
        } finally { saveMemoryConfig(config); }
        return text;
    },
};
(window as Window & { readingQuoteTest?: typeof probe }).readingQuoteTest = probe;
