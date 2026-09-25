import type { InstalledCustomApp } from "./custom-app-types";
import { generateScoped, type ScopedGenerationRequest } from "./custom-app-scoped-generation";
import { requireAppCapability } from "./custom-app-protected-policy";
import { hydrateKvDb, kvReadFresh, kvUpdateAtomic, kvUpdateManyAtomic } from "./kv-db";
import { customAppCollectionKey, customAppLegacyDataKey, loadInstalledCustomApps } from "./custom-app-storage";

export const AI_TASKS_KEY = "ai_phone_custom_app_ai_results_v1";
const REMOVED_TASK_APPS_KEY = "ai_phone_custom_app_ai_removed_v1";
export type DurableAiTask = {
    taskId: string; appId: string; idempotencyKey: string; requestFingerprint: string;
    status: "running" | "completed" | "failed" | "cancelled" | "consumed";
    result?: Awaited<ReturnType<typeof generateScoped>>; error?: string;
    createdAt: string; completedAt?: string; consumedAt?: string;
};
export type TaskWrite = { collection: string; id: string; operation: "put" | "delete"; value?: Record<string, unknown> };
const active = new Map<string, AbortController>();
const lockName = (id: string) => `custom-app-ai-task:${id}`;
function decode(raw: string | null): DurableAiTask[] {
    const rows = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error("Invalid task store");
    return rows;
}
function check(app: InstalledCustomApp) { requireAppCapability(app, "ai.tasks"); }
async function change(taskId: string, edit: (task: DurableAiTask) => void) {
    return kvUpdateAtomic(AI_TASKS_KEY, raw => {
        const rows = decode(raw), row = rows.find(r => r.taskId === taskId);
        if (row) edit(row);
        return { value: JSON.stringify(rows), result: row ?? null };
    });
}
function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
    return JSON.stringify(value);
}

export async function startAiTask(app: InstalledCustomApp, input: { idempotencyKey: string; request: ScopedGenerationRequest }): Promise<DurableAiTask> {
    check(app); requireAppCapability(app, "ai.generateScoped");
    await hydrateKvDb();
    if (!navigator.locks) throw new Error("Durable AI tasks require Web Locks");
    if (!/^[\w.-]{1,160}$/.test(input.idempotencyKey)) throw new Error("Invalid idempotency key");
    const encoded = new TextEncoder().encode(canonical(input.request));
    if (encoded.length > 12000000) throw new Error("Task request too large");
    const requestFingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoded))).map(b => b.toString(16).padStart(2, "0")).join("");
    const taskId = crypto.randomUUID();
    // Hold a browser-wide lock before publishing running state. No iframe callback is retained.
    return new Promise((resolve, reject) => {
        void navigator.locks.request(lockName(taskId), async () => {
            const controller = new AbortController();
            active.set(taskId, controller);
            try {
                const { task, created } = await kvUpdateManyAtomic([AI_TASKS_KEY, REMOVED_TASK_APPS_KEY], values => {
                    if (!loadInstalledCustomApps().some(a => a.id === app.id)) throw new Error("App no longer installed");
                    if (JSON.parse(values.get(REMOVED_TASK_APPS_KEY) ?? "[]").includes(app.id)) throw new Error("App task capability revoked by uninstall");
                    const rows = decode(values.get(AI_TASKS_KEY) ?? null);
                    const old = rows.find(t => t.appId === app.id && t.idempotencyKey === input.idempotencyKey);
                    if (old && old.requestFingerprint !== requestFingerprint) throw new Error("Task idempotency conflict");
                    if (old) return { values: new Map(), result: { task: old, created: false } };
                    if (rows.filter(t => t.appId === app.id && (t.status === "running" || t.status === "completed")).length >= 100) throw new Error("Unconsumed task quota reached; consume completed results first");
                    const task: DurableAiTask = { taskId, appId: app.id, idempotencyKey: input.idempotencyKey, requestFingerprint, status: "running", createdAt: new Date().toISOString() };
                    rows.push(task);
                    return { values: new Map([[AI_TASKS_KEY, JSON.stringify(rows)]]), result: { task, created: true } };
                });
                resolve(structuredClone(task));
                if (!created) return;
                try {
                    const result = await generateScoped(app, input.request, controller.signal);
                    if (JSON.stringify(result).length > 4000000) throw new Error("Task result exceeds 4 MB");
                    await change(taskId, row => { if (row.status === "running") { row.result = result; row.status = "completed"; row.completedAt = new Date().toISOString(); } });
                } catch (e) {
                    await change(taskId, row => { if (row.status === "running") { row.status = controller.signal.aborted ? "cancelled" : "failed"; row.error = String(e); row.completedAt = new Date().toISOString(); } });
                }
            } catch (e) { reject(e); console.error("Durable AI task storage failure", e); }
            finally { active.delete(taskId); }
        }).catch(reject);
    });
}

export async function getAiTasks(app: InstalledCustomApp, taskId?: string) {
    check(app);
    await hydrateKvDb();
    let rows = decode(await kvReadFresh(AI_TASKS_KEY)).filter(t => t.appId === app.id && (!taskId || t.taskId === taskId));
    for (const row of rows) if (row.status === "running" && !active.has(row.taskId)) {
        if (!navigator.locks) throw new Error("Task recovery requires Web Locks");
        await navigator.locks.request(lockName(row.taskId), { ifAvailable: true }, async lock => {
            if (lock) await change(row.taskId, t => { if (t.status === "running") { t.status = "failed"; t.error = "HOST_INTERRUPTED: execution owner closed; no automatic retry"; t.completedAt = new Date().toISOString(); } });
        });
    }
    rows = decode(await kvReadFresh(AI_TASKS_KEY)).filter(t => t.appId === app.id && (!taskId || t.taskId === taskId));
    return rows;
}
export async function cancelAiTask(app: InstalledCustomApp, taskId: string) {
    check(app); await hydrateKvDb();
    const row = await change(taskId, t => {
        if (t.appId !== app.id) throw new Error("Task not owned by App");
        if (t.status === "running") { t.status = "cancelled"; t.completedAt = new Date().toISOString(); }
    });
    if (row?.status === "cancelled") active.get(taskId)?.abort();
    return row;
}

/** Atomic result acknowledgement + generic App record writes; no business callbacks. */
export async function consumeAiTask(app: InstalledCustomApp, input: { taskId: string; writes: TaskWrite[] }) {
    check(app); requireAppCapability(app, "app.data.write"); await hydrateKvDb();
    if (!Array.isArray(input.writes) || input.writes.length > 100 || JSON.stringify(input.writes).length > 4000000) throw new Error("Invalid task writes");
    for (const w of input.writes) {
        if (!/^[\w.-]{1,80}$/.test(w.collection) || !/^[\w.-]{1,120}$/.test(w.id) || !["put", "delete"].includes(w.operation) || (w.operation === "put" && (!w.value || typeof w.value !== "object" || Array.isArray(w.value)))) throw new Error("Invalid task write");
    }
    const legacyKey = customAppLegacyDataKey(app.id);
    const keys = [...new Set([AI_TASKS_KEY, legacyKey, ...input.writes.map(w => customAppCollectionKey(app.id, w.collection))])];
    return kvUpdateManyAtomic(keys, values => {
        const tasks = decode(values.get(AI_TASKS_KEY) ?? null);
        const task = tasks.find(t => t.taskId === input.taskId && t.appId === app.id);
        if (!task) throw new Error("Task not found");
        if (task.status === "consumed") return { values: new Map(), result: { applied: false } };
        if (task.status !== "completed") throw new Error("Task is not completed");
        for (const w of input.writes) {
            const key = customAppCollectionKey(app.id, w.collection);
            const raw = values.get(key);
            const rows = (raw === null || raw === undefined ? (JSON.parse(values.get(legacyKey) ?? "{}")[w.collection] ?? []) : JSON.parse(raw)) as Record<string, unknown>[];
            if (!Array.isArray(rows)) throw new Error("Invalid App collection");
            const next = rows.filter(r => r.id !== w.id);
            if (w.operation === "put") next.unshift({ ...w.value, id: w.id, updatedAt: new Date().toISOString() });
            values.set(key, JSON.stringify(next));
        }
        task.status = "consumed"; task.consumedAt = new Date().toISOString(); delete task.result;
        values.set(AI_TASKS_KEY, JSON.stringify(tasks));
        values.delete(legacyKey); // Read-only migration fallback; never rewrite/remove other legacy collections.
        return { values, result: { applied: true } };
    });
}
export async function cleanupAiTasks(appId: string) {
    await hydrateKvDb();
    await kvUpdateManyAtomic([AI_TASKS_KEY, REMOVED_TASK_APPS_KEY], values => {
        const rows = decode(values.get(AI_TASKS_KEY) ?? null);
        for (const t of rows) if (t.appId === appId) active.get(t.taskId)?.abort();
        const removed = new Set<string>(JSON.parse(values.get(REMOVED_TASK_APPS_KEY) ?? "[]"));
        removed.add(appId);
        return { values: new Map([[AI_TASKS_KEY, JSON.stringify(rows.filter(t => t.appId !== appId))], [REMOVED_TASK_APPS_KEY, JSON.stringify([...removed])]]), result: undefined };
    });
}
