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
    /** Optional when the request does not select any character-scoped context. */
    characterId?: string;
    /** Explicit provider binding override; selects configuration only, never prompt context. */
    apiConfigId?: string;
    contextPolicy: ScopedContextPolicy;
    messages: LlmRequestMessage[];
    appContext?: string;
    maxTokens?: number;
};

export type ScopedGenerationErrorCode =
    | "MULTIMODAL_UNSUPPORTED"
    | "PROVIDER_ERROR"
    | "TIMEOUT"
    | "CANCELLED"
    | "MALFORMED_REQUEST";

export class ScopedGenerationError extends Error {
    readonly code: ScopedGenerationErrorCode;
    readonly status?: number;
    constructor(code: ScopedGenerationErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
        super(message);
        if (options?.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause;
        this.name = "ScopedGenerationError";
        this.code = code;
        this.status = options?.status;
    }
}

export function getScopedGenerationErrorCode(error: unknown): ScopedGenerationErrorCode | undefined {
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
    return ["MULTIMODAL_UNSUPPORTED", "PROVIDER_ERROR", "TIMEOUT", "CANCELLED", "MALFORMED_REQUEST"].includes(String(code))
        ? code as ScopedGenerationErrorCode
        : undefined;
}

function malformed(message: string): never {
    throw new ScopedGenerationError("MALFORMED_REQUEST", message);
}

function responseErrorText(value: unknown): string {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    const record = value as Record<string, unknown>;
    return [record.code, record.type, record.message, responseErrorText(record.error)]
        .filter(item => typeof item === "string" && item.trim())
        .join(" ")
        .slice(0, 1000);
}

function isMultimodalUnsupported(value: unknown): boolean {
    const text = responseErrorText(value).toLowerCase();
    return /unsupported[_ -]?(image|vision|multimodal)|(?:image|vision|multimodal)[^\n]{0,80}(?:not supported|unsupported)|(?:does not|doesn't|do not) support (?:image|vision|multimodal)|only supports? text|text[- ]only/.test(text);
}

function resolveScopedApiConfig(app: InstalledCustomApp, input: ScopedGenerationRequest, characterId?: string) {
    const configs = loadApiConfigs();
    const explicitId = typeof input.apiConfigId === "string" ? input.apiConfigId.trim() : "";
    if (explicitId) {
        const explicit = configs.find(config => config.id === explicitId);
        if (!explicit) malformed("Unknown apiConfigId");
        return explicit;
    }
    const bindings = loadBindingConfig();
    if (characterId) {
        const character = bindings.characterBindings.find(item => item.characterId === characterId);
        const appId = `custom_app:${app.id}`;
        const ids = [
            character?.appOverrides?.[appId]?.apiConfigId,
            bindings.appDefaults?.[appId]?.apiConfigId,
            character?.appOverrides?.chat?.apiConfigId,
            bindings.appDefaults?.chat?.apiConfigId,
            character?.defaults.apiConfigId,
        ];
        for (const id of ids) {
            const config = id ? configs.find(item => item.id === id) : null;
            if (config) return config;
        }
    }
    if (bindings.globalDefaults.apiConfigId) {
        const global = configs.find(config => config.id === bindings.globalDefaults.apiConfigId);
        if (global) return global;
    }
    return configs[0] ?? null;
}

function validateMessages(value: unknown): LlmRequestMessage[] {
    if (!Array.isArray(value) || !value.length || value.length > 100) malformed("messages must contain 1..100 messages");
    let images = 0;
    let size = 0;
    const messages = value.map(m => {
        if (!m || !["system", "user", "assistant"].includes(m.role)) malformed("Unsupported message role");
        if (typeof m.content === "string") { size += m.content.length; return { role: m.role, content: m.content }; }
        if (m.role !== "user" || !Array.isArray(m.content) || m.content.length > 50) malformed("Multimodal content requires user role");
        const content = m.content.map((p: { type?: string; text?: string; image_url?: { url?: string } }) => {
            if (p.type === "text" && typeof p.text === "string") { size += p.text.length; return { type: "text", text: p.text }; }
            if (p.type !== "image_url" || typeof p.image_url?.url !== "string") malformed("Invalid image part");
            const url = p.image_url.url;
            if (!/^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(url) || url.length > 2800000 || ++images > 4) malformed("Image limit or scheme invalid");
            return { type: "image_url", image_url: { url } };
        });
        return { role: m.role, content };
    });
    if (size > 200000) malformed("Text context too large");
    return messages as LlmRequestMessage[];
}

export async function generateScoped(app: InstalledCustomApp, input: ScopedGenerationRequest, signal?: AbortSignal) {
    requireAppCapability(app, "ai.generateScoped");
    await ensureSettingsStorageHydrated();
    await readMemoryRevisions();
    const policy = input.contextPolicy;
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) malformed("Explicit contextPolicy required");
    const known = ["characterProfile", "boundPreset", "worldbook", "regex", "generationRules", "userProfile", "coreMemory", "longTermMemory", "memorySources", "shortTermChat", "timeline"];
    if (Object.keys(policy).some(k => !known.includes(k))) malformed("Unknown context policy category");
    for (const k of ["characterProfile", "boundPreset", "worldbook", "regex", "generationRules", "userProfile", "shortTermChat"] as const) if (policy[k] !== undefined && typeof policy[k] !== "boolean") malformed(`Invalid context policy: ${k}`);
    for (const mode of [policy.coreMemory, policy.longTermMemory]) if (mode !== undefined && !["deny", "own_source"].includes(mode)) malformed("Legacy/mixed memory cannot be source filtered");
    const characterId = typeof input.characterId === "string" ? input.characterId.trim() : "";
    const character = characterId ? loadCharacters().find(c => c.id === characterId) : undefined;
    if (characterId && !character) malformed("Character not found");
    if (!character && (policy.characterProfile || policy.userProfile || policy.shortTermChat || policy.timeline || policy.coreMemory === "own_source" || policy.longTermMemory === "own_source")) malformed("Selected context policy requires characterId");
    if (policy.characterProfile) requireAppCapability(app, "characters.read");
    if (policy.worldbook) requireAppCapability(app, "world.read");
    if (policy.userProfile) { requireAppCapability(app, "user.profile.read"); requireAppCapability(app, "user.persona.read"); }
    const slot = resolveBinding(loadBindingConfig(), character?.id, `custom_app:${app.id}`);
    const config = resolveScopedApiConfig(app, input, character?.id);
    if (!config) throw new ScopedGenerationError("PROVIDER_ERROR", "No API configuration available");
    const taskMessages = validateMessages(input.messages);
    if (taskMessages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url")) && config.enableImageRecognition !== true) throw new ScopedGenerationError("MULTIMODAL_UNSUPPORTED", "Selected provider does not enable image recognition");
    if (input.appContext !== undefined && (typeof input.appContext !== "string" || input.appContext.length > 100000)) malformed("Invalid App context");
    if (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 65536)) malformed("Invalid maxTokens");
    const presets = loadPresets();
    const bound = presets.find(p => p.id === slot.presetId) ?? presets.find(p => p.builtIn) ?? null;
    const markerIds = [...(policy.characterProfile ? ["charDescription", "charPersonality"] : []), ...(policy.userProfile ? ["personaDescription"] : []), ...(policy.worldbook ? ["worldInfoBefore", "worldInfoAfter"] : [])];
    // Use the existing preset/regex/worldbook assembler, but remove every implicit source marker.
    const preset: PresetConfig = policy.boundPreset && bound ? { ...bound, prompts: bound.prompts.filter(p => !p.marker || markerIds.includes(p.identifier)) } : {
        id: "scoped", name: "Scoped", createdAt: 0, updatedAt: 0, temperature: 0.7, top_p: 1, top_k: 0, frequency_penalty: 0, presence_penalty: 0, repetition_penalty: 1, openai_max_tokens: 0, openai_max_context: 0,
        prompts: markerIds.map(identifier => ({ identifier, name: identifier, marker: true, enabled: true, role: "system", content: "", injection_depth: 0 })),
    };
    const regexes = policy.regex ? loadRegexes().filter(r => slot.regexIds?.includes(r.id)) : [];
    const projectedCharacter = { id: "", name: policy.characterProfile && character ? character.name : "Character", persona: policy.characterProfile && character ? character.persona : "", personality: policy.characterProfile && character ? character.personality : undefined, avatar: null, createdAt: "", updatedAt: "" };
    const messages = toLlmRequestMessages(assemblePromptPayload({
        isolatedContext: true, character: projectedCharacter, history: [], preset,
        worldBooks: policy.worldbook ? loadWorldBooks().filter(w => slot.worldBookIds?.includes(w.id)) : [],
        worldBookActivationContext: taskMessages.map(m => typeof m.content === "string" ? m.content : m.content.filter(p => p.type === "text").map(p => "text" in p ? p.text : "").join("\n")).join("\n"),
        regexes, userIdentity: policy.userProfile ? resolveUserIdentity(character!.id, `custom_app:${app.id}`) : null,
        userName: "User", appId: `custom_app:${app.id}`, appTags: ["custom_app", `custom_app:${app.id}`], timeAware: false,
    }));
    if (policy.coreMemory === "own_source" || policy.longTermMemory === "own_source") {
        if (!Array.isArray(policy.memorySources) || !policy.memorySources.length || policy.memorySources.length > 100) throw new Error("Explicit memorySources required");
        for (const scope of policy.memorySources) {
            const { entries } = await searchSourceMemory(app, { ...scope, viewerCharacterId: character!.id });
            for (const entry of entries) if ((entry.type === "core" ? policy.coreMemory : policy.longTermMemory) === "own_source") messages.push({ role: "system", content: memorySourceEnvelope(entry.provenance) + entry.content });
        }
    }
    if (policy.shortTermChat || policy.timeline) {
        requireAppCapability(app, "memory.readShortTerm");
        await hydrateChatStorage();
        const t = policy.timeline;
        if (t && (typeof t !== "object" || Object.keys(t).some(k => !["builtInSources", "ownApp", "otherAppIds"].includes(k)) || (t.builtInSources && !Array.isArray(t.builtInSources)) || (t.otherAppIds && !Array.isArray(t.otherAppIds)))) throw new Error("Invalid timeline policy");
        if (t?.builtInSources?.includes("custom_app") || t?.builtInSources?.includes("chat")) throw new Error("Use ownApp/otherAppIds/shortTermChat selectors");
        const entries = loadNativeTimeline(character!.id, { userName: policy.userProfile ? resolveUserIdentity(character!.id, `custom_app:${app.id}`)?.name : "User", timeAware: false }).filter(e => e.sourceApp === "chat" ? policy.shortTermChat === true : e.sourceApp === "custom_app" ? e.customAppId === app.id ? t?.ownApp === true : !!e.customAppId && t?.otherAppIds?.includes(e.customAppId) : t?.builtInSources?.includes(e.sourceApp));
        for (const entry of entries.slice(-100)) messages.push({ role: "system", content: entry.content });
    }
    if (input.appContext) messages.push({ role: "system", content: input.appContext });
    messages.push(...taskMessages);
    const request = buildProviderRequest(config, policy.generationRules ? bound : null, messages, { stream: false, maxTokens: input.maxTokens });
    let response: Response;
    try {
        response = await fetchLlmPayload(request, { signal });
    } catch (error) {
        const name = error && typeof error === "object" ? String((error as { name?: unknown }).name ?? "") : "";
        const reasonName = signal?.reason && typeof signal.reason === "object" ? String((signal.reason as { name?: unknown }).name ?? "") : "";
        if (name === "TimeoutError" || reasonName === "TimeoutError") throw new ScopedGenerationError("TIMEOUT", "Scoped provider request timed out", { cause: error });
        if (signal?.aborted || name === "AbortError") throw new ScopedGenerationError("CANCELLED", "Scoped provider request cancelled", { cause: error });
        throw new ScopedGenerationError("PROVIDER_ERROR", "Scoped provider request failed", { cause: error });
    }
    if (!response.ok) {
        const bodyText = (await response.text()).slice(0, 4000);
        let body: unknown = bodyText;
        try { body = JSON.parse(bodyText); } catch { /* Preserve non-JSON provider detail. */ }
        const code: ScopedGenerationErrorCode = isMultimodalUnsupported(body) ? "MULTIMODAL_UNSUPPORTED" : "PROVIDER_ERROR";
        const detail = responseErrorText(body);
        throw new ScopedGenerationError(code, `Scoped provider HTTP ${response.status}${detail ? `: ${detail}` : ""}`, { status: response.status });
    }
    let result;
    try {
        result = parseProviderResponse(request.providerKind, await response.json());
    } catch (error) {
        throw new ScopedGenerationError("PROVIDER_ERROR", "Scoped provider returned an invalid response", { cause: error });
    }
    return { content: applyOutputRegex(result.content, regexes, { activeTags: ["custom_app", `custom_app:${app.id}`] }), raw: result.raw, usage: result.usage };
}
