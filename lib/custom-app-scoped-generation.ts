import type { InstalledCustomApp } from "./custom-app-types";
import type { PresetConfig } from "./settings-types";
import { loadCharacters } from "./character-storage";
import { ensureSettingsStorageHydrated, loadBindingConfig, resolveBinding, loadApiConfigs, loadPresets, loadWorldBooks, loadRegexes, resolveUserIdentity } from "./settings-storage";
import { assemblePromptPayload, applyOutputRegex } from "./llm-prompt-assembler";
import { buildProviderRequest, parseProviderResponse, toLlmRequestMessages, type LlmRequestMessage } from "./llm-provider-adapter";
import { fetchLlmPayload } from "./llm-http";
import { requireAppCapability } from "./custom-app-protected-policy";
import { searchSourceMemory } from "./custom-app-source-memory";
import { memorySourceEnvelope, readMemoryRevisions } from "./memory-provenance";
import { loadNativeTimeline, type NativeTimelineEntry } from "./short-term-assembler";
import { hydrateChatStorage } from "./chat-storage";

export type ScopedContextPolicy = {
    characterProfile?: boolean;
    boundPreset?: boolean;
    worldbook?: boolean;
    regex?: boolean;
    generationRules?: boolean;
    userProfile?: boolean;
    coreMemory?: "deny" | "own_source";
    longTermMemory?: "deny" | "own_source";
    /** Explicit own-App entity scopes; never accepts an arbitrary sourceAppId/viewer. */
    memorySources?: { sourceNamespace: string; sourceEntityId: string }[];
    shortTermChat?: boolean;
    timeline?: { builtInSources?: NativeTimelineEntry["sourceApp"][]; ownApp?: boolean; otherAppIds?: string[] };
};
export type ScopedGenerationRequest = {
    characterId: string;
    contextPolicy: ScopedContextPolicy;
    messages: LlmRequestMessage[];
    appContext?: string;
    maxTokens?: number;
};

function validateMessages(value: unknown): LlmRequestMessage[] {
    if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error("messages must contain 1..100 messages");
    let images = 0;
    let size = 0;
    const messages = value.map(m => {
        if (!m || !["system", "user", "assistant"].includes(m.role)) throw new Error("Unsupported message role");
        if (typeof m.content === "string") { size += m.content.length; return { role: m.role, content: m.content }; }
        if (m.role !== "user" || !Array.isArray(m.content) || m.content.length > 50) throw new Error("Multimodal content requires user role");
        const content = m.content.map((p: { type?: string; text?: string; image_url?: { url?: string } }) => {
            if (p.type === "text" && typeof p.text === "string") { size += p.text.length; return { type: "text", text: p.text }; }
            if (p.type !== "image_url" || typeof p.image_url?.url !== "string") throw new Error("Invalid image part");
            const url = p.image_url.url;
            if (!/^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(url) || url.length > 2800000 || ++images > 4) throw new Error("Image limit or scheme invalid");
            return { type: "image_url", image_url: { url } };
        });
        return { role: m.role, content };
    });
    if (size > 200000) throw new Error("Text context too large");
    return messages as LlmRequestMessage[];
}

export async function generateScoped(app: InstalledCustomApp, input: ScopedGenerationRequest, signal?: AbortSignal) {
    requireAppCapability(app, "ai.generateScoped");
    await ensureSettingsStorageHydrated();
    await readMemoryRevisions();
    const policy = input.contextPolicy;
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) throw new Error("Explicit contextPolicy required");
    const known = ["characterProfile", "boundPreset", "worldbook", "regex", "generationRules", "userProfile", "coreMemory", "longTermMemory", "memorySources", "shortTermChat", "timeline"];
    if (Object.keys(policy).some(k => !known.includes(k))) throw new Error("Unknown context policy category");
    for (const k of ["characterProfile", "boundPreset", "worldbook", "regex", "generationRules", "userProfile", "shortTermChat"] as const) if (policy[k] !== undefined && typeof policy[k] !== "boolean") throw new Error(`Invalid context policy: ${k}`);
    for (const mode of [policy.coreMemory, policy.longTermMemory]) if (mode !== undefined && !["deny", "own_source"].includes(mode)) throw new Error("Legacy/mixed memory cannot be source filtered");
    const character = loadCharacters().find(c => c.id === input.characterId);
    if (!character) throw new Error("Character not found");
    if (policy.characterProfile) requireAppCapability(app, "characters.read");
    if (policy.worldbook) requireAppCapability(app, "world.read");
    if (policy.userProfile) { requireAppCapability(app, "user.profile.read"); requireAppCapability(app, "user.persona.read"); }
    const slot = resolveBinding(loadBindingConfig(), character.id, `custom_app:${app.id}`);
    const config = loadApiConfigs().find(c => c.id === slot.apiConfigId);
    if (!config) throw new Error("No bound API configuration");
    const taskMessages = validateMessages(input.messages);
    if (taskMessages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url")) && config.enableImageRecognition !== true) throw new Error("Bound provider image recognition disabled; refusing silent text fallback");
    if (input.appContext !== undefined && (typeof input.appContext !== "string" || input.appContext.length > 100000)) throw new Error("Invalid App context");
    if (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 65536)) throw new Error("Invalid maxTokens");
    const presets = loadPresets();
    const bound = presets.find(p => p.id === slot.presetId) ?? presets.find(p => p.builtIn) ?? null;
    const markerIds = [...(policy.characterProfile ? ["charDescription", "charPersonality"] : []), ...(policy.userProfile ? ["personaDescription"] : []), ...(policy.worldbook ? ["worldInfoBefore", "worldInfoAfter"] : [])];
    // Use the existing preset/regex/worldbook assembler, but remove every implicit source marker.
    const preset: PresetConfig = policy.boundPreset && bound ? { ...bound, prompts: bound.prompts.filter(p => !p.marker || markerIds.includes(p.identifier)) } : {
        id: "scoped", name: "Scoped", createdAt: 0, updatedAt: 0, temperature: 0.7, top_p: 1, top_k: 0, frequency_penalty: 0, presence_penalty: 0, repetition_penalty: 1, openai_max_tokens: 0, openai_max_context: 0,
        prompts: markerIds.map(identifier => ({ identifier, name: identifier, marker: true, enabled: true, role: "system", content: "", injection_depth: 0 })),
    };
    const regexes = policy.regex ? loadRegexes().filter(r => slot.regexIds?.includes(r.id)) : [];
    const projectedCharacter = { id: "", name: policy.characterProfile ? character.name : "Character", persona: policy.characterProfile ? character.persona : "", personality: policy.characterProfile ? character.personality : undefined, avatar: null, createdAt: "", updatedAt: "" };
    const messages = toLlmRequestMessages(assemblePromptPayload({
        isolatedContext: true, character: projectedCharacter, history: [], preset,
        worldBooks: policy.worldbook ? loadWorldBooks().filter(w => slot.worldBookIds?.includes(w.id)) : [],
        worldBookActivationContext: taskMessages.map(m => typeof m.content === "string" ? m.content : m.content.filter(p => p.type === "text").map(p => "text" in p ? p.text : "").join("\n")).join("\n"),
        regexes, userIdentity: policy.userProfile ? resolveUserIdentity(character.id, `custom_app:${app.id}`) : null,
        userName: "User", appId: `custom_app:${app.id}`, appTags: ["custom_app", `custom_app:${app.id}`], timeAware: false,
    }));
    if (policy.coreMemory === "own_source" || policy.longTermMemory === "own_source") {
        if (!Array.isArray(policy.memorySources) || !policy.memorySources.length || policy.memorySources.length > 100) throw new Error("Explicit memorySources required");
        for (const scope of policy.memorySources) {
            const { entries } = await searchSourceMemory(app, { ...scope, viewerCharacterId: character.id });
            for (const entry of entries) if ((entry.type === "core" ? policy.coreMemory : policy.longTermMemory) === "own_source") messages.push({ role: "system", content: memorySourceEnvelope(entry.provenance) + entry.content });
        }
    }
    if (policy.shortTermChat || policy.timeline) {
        requireAppCapability(app, "memory.readShortTerm");
        await hydrateChatStorage();
        const t = policy.timeline;
        if (t && (typeof t !== "object" || Object.keys(t).some(k => !["builtInSources", "ownApp", "otherAppIds"].includes(k)) || (t.builtInSources && !Array.isArray(t.builtInSources)) || (t.otherAppIds && !Array.isArray(t.otherAppIds)))) throw new Error("Invalid timeline policy");
        if (t?.builtInSources?.includes("custom_app") || t?.builtInSources?.includes("chat")) throw new Error("Use ownApp/otherAppIds/shortTermChat selectors");
        const entries = loadNativeTimeline(character.id, { userName: policy.userProfile ? resolveUserIdentity(character.id, `custom_app:${app.id}`)?.name : "User", timeAware: false }).filter(e => e.sourceApp === "chat" ? policy.shortTermChat === true : e.sourceApp === "custom_app" ? e.customAppId === app.id ? t?.ownApp === true : !!e.customAppId && t?.otherAppIds?.includes(e.customAppId) : t?.builtInSources?.includes(e.sourceApp));
        for (const entry of entries.slice(-100)) messages.push({ role: "system", content: entry.content });
    }
    if (input.appContext) messages.push({ role: "system", content: input.appContext });
    messages.push(...taskMessages);
    const request = buildProviderRequest(config, policy.generationRules ? bound : null, messages, { stream: false, maxTokens: input.maxTokens });
    const response = await fetchLlmPayload(request, { signal });
    if (!response.ok) throw new Error(`Scoped provider HTTP ${response.status}`);
    const result = parseProviderResponse(request.providerKind, await response.json());
    return { content: applyOutputRegex(result.content, regexes, { activeTags: ["custom_app", `custom_app:${app.id}`] }), raw: result.raw, usage: result.usage };
}
