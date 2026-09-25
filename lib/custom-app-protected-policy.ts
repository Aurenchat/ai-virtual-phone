import { hydrateKvDb, kvReadFresh, kvUpdateAtomic } from "./kv-db";
import type { InstalledCustomApp, CustomAppPermission } from "./custom-app-types";

export const PROTECTED_POLICY_KEY = "ai_phone_protected_policies_v1";
export type ProtectedPolicy = { appId: string; id: string; namespace: string; text: string; required: true };

export function requireAppCapability(app: InstalledCustomApp, permission: CustomAppPermission): void {
    if (!app.permissions.includes(permission)) throw new Error(`Permission required: ${permission}`);
}

function decode(raw: string | null): ProtectedPolicy[] {
    const items: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(items) || items.some(p => !p || typeof p.appId !== "string" || typeof p.id !== "string" || typeof p.namespace !== "string" || typeof p.text !== "string" || !p.text.trim() || p.required !== true)) {
        throw new Error("Protected policy registry invalid; request blocked");
    }
    return items;
}

export async function setProtectedPolicy(app: InstalledCustomApp, input: { id: string; namespace: string; text: string } | { id: string; remove: true }) {
    requireAppCapability(app, "app.policy.manage");
    if (!/^[\w.-]{1,80}$/.test(input.id)) throw new Error("Invalid policy id");
    if ("remove" in input && input.remove !== true) throw new Error("Policy removal must be explicit");
    await hydrateKvDb();
    return kvUpdateAtomic(PROTECTED_POLICY_KEY, raw => {
        const items = decode(raw).filter(p => p.appId !== app.id || p.id !== input.id);
        if (!("remove" in input)) {
            if (!/^[\w.-]{1,120}$/.test(input.namespace) || typeof input.text !== "string" || !input.text.trim() || input.text.length > 16000) throw new Error("Invalid policy");
            items.push({ appId: app.id, id: input.id, namespace: input.namespace, text: input.text, required: true });
        }
        if (items.length > 100) throw new Error("Policy registry limit exceeded");
        return { value: JSON.stringify(items), result: { ok: true } };
    });
}

/** Terminal transport gate. No plugin hook, fallback, macro dependency or private App state. */
export async function protectProviderBody(body: Record<string, unknown>, provider: "openai-compatible" | "anthropic" | "gemini"): Promise<Record<string, unknown>> {
    // During SSR no browser-owned policies or LLM credentials exist here.
    if (typeof indexedDB === "undefined") throw new Error("Protected policy storage unavailable");
    const policies = decode(await kvReadFresh(PROTECTED_POLICY_KEY));
    if (!policies.length) return body;
    const text = policies.map(p => `[Host required policy; sourceAppId=${p.appId}; namespace=${p.namespace}]\nScope: only entities and evidence from this source/namespace. Do not extend this policy to unrelated sources.\n${p.text}`).join("\n\n");
    if (provider === "anthropic") {
        const system = body.system;
        if (system !== undefined && typeof system !== "string" && !Array.isArray(system)) throw new Error("Invalid protected system field");
        return { ...body, system: [...(Array.isArray(system) ? system : system ? [{ type: "text", text: system }] : []), { type: "text", text }] };
    }
    if (provider === "gemini") {
        const system = body.systemInstruction as { parts?: unknown[] } | undefined;
        if (system && !Array.isArray(system.parts)) throw new Error("Invalid protected systemInstruction");
        return { ...body, systemInstruction: { ...system, parts: [...(system?.parts || []), { text }] } };
    }
    if (!Array.isArray(body.messages)) throw new Error("Invalid protected messages");
    return { ...body, messages: [{ role: "system", content: text }, ...body.messages] };
}
