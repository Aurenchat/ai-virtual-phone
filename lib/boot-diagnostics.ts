// Independent of KV/ChatDB. Removing the head bootstrap makes every marker a no-op.
export type BootStage =
    | "BOOT_START" | "MODULES_READY"
    | "KV_READ_BEGIN" | "KV_READ_DONE" | "KV_CACHE_DONE"
    | "CHAT_DB_BEGIN" | "CHAT_MESSAGES_BEGIN" | "CHAT_MESSAGES_DONE"
    | "CHAT_NORMALIZE_BEGIN" | "CHAT_NORMALIZE_DONE" | "CHAT_INDEX_DONE" | "CHAT_HYDRATE_DONE"
    | "THEME_READ_BEGIN" | "THEME_READ_DONE" | "THEME_DECODE_DONE"
    | "SHELL_INTERACTIVE" | "AUX_STORAGE_BEGIN" | "AUX_STORAGE_DONE"
    | "PLUGIN_BEGIN" | "PLUGIN_DONE" | "PLUGIN_SKIPPED_SAFE"
    | "VN_BEGIN" | "VN_DONE" | "MAP_BEGIN" | "MAP_DONE" | "BOOT_READY";

export interface BootAttempt {
    version: 1;
    buildId: string;
    bootAttemptId: string;
    startedAt: number;
    lastStage: BootStage;
    lastStageAt: number;
    activeStages: string[];
    completedStages: BootStage[];
    ready: boolean;
    exitObserved: boolean;
}

declare global {
    interface Window {
        __FLOAT_BOOT_DIAG__?: Readonly<{
            getCurrent(): BootAttempt | null;
            getPrevious(): BootAttempt | null;
        }>;
        __FLOAT_BOOT_DIAG_INTERNAL_V1__?: {
            mark(stage: BootStage): void;
            ready(): void;
        };
    }
}

// A script literal deliberately avoids serializing a function with module closures:
// production minification cannot hoist dependencies out of the early bootstrap.
const BOOTSTRAP = String.raw`(function(buildId) {
  try {
    if (window.__FLOAT_BOOT_DIAG_INTERNAL_V1__) return;
    var currentKey = 'ai_phone_boot_diag_current_v1';
    var previousKey = 'ai_phone_boot_diag_previous_v1';
    var stages = 'BOOT_START MODULES_READY KV_READ_BEGIN KV_READ_DONE KV_CACHE_DONE CHAT_DB_BEGIN CHAT_MESSAGES_BEGIN CHAT_MESSAGES_DONE CHAT_NORMALIZE_BEGIN CHAT_NORMALIZE_DONE CHAT_INDEX_DONE CHAT_HYDRATE_DONE THEME_READ_BEGIN THEME_READ_DONE THEME_DECODE_DONE SHELL_INTERACTIVE AUX_STORAGE_BEGIN AUX_STORAGE_DONE PLUGIN_BEGIN PLUGIN_DONE PLUGIN_SKIPPED_SAFE VN_BEGIN VN_DONE MAP_BEGIN MAP_DONE BOOT_READY'.split(' ');
    var branches = 'KV_READ KV_CACHE CHAT_DB CHAT_HYDRATE CHAT_MESSAGES CHAT_NORMALIZE CHAT_INDEX THEME_READ THEME_DECODE AUX_STORAGE PLUGIN VN MAP'.split(' ');
    var seen = new Set();
    var active = new Set();
    var completed = new Set();
    function read(key) {
      try {
        var raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 1536) return null;
        var r = JSON.parse(raw);
        if (!r || r.version !== 1 || typeof r.buildId !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(r.buildId)
          || typeof r.bootAttemptId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(r.bootAttemptId)
          || !Number.isFinite(r.startedAt) || !Number.isFinite(r.lastStageAt) || stages.indexOf(r.lastStage) < 0
          || !Array.isArray(r.activeStages) || r.activeStages.length > branches.length || r.activeStages.some(function(s) { return branches.indexOf(s) < 0; })
          || !Array.isArray(r.completedStages) || r.completedStages.length > stages.length || r.completedStages.some(function(s) { return stages.indexOf(s) < 0; })
          || typeof r.ready !== 'boolean' || typeof r.exitObserved !== 'boolean') return null;
        // Explicit projection: never carry unknown fields from a stored object.
        return { version: 1, buildId: r.buildId, bootAttemptId: r.bootAttemptId, startedAt: r.startedAt,
          lastStage: r.lastStage, lastStageAt: r.lastStageAt, activeStages: r.activeStages,
          completedStages: r.completedStages, ready: r.ready, exitObserved: r.exitObserved };
      } catch (_) { return null; }
    }
    function write(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    }
    function snapshot(value) { return value ? JSON.parse(JSON.stringify(value)) : null; }
    var previous = read(previousKey);
    var old = read(currentKey);
    if (old && old.ready !== true) { previous = old; write(previousKey, previous); }
    var now = Date.now();
    var current = { version: 1, buildId: buildId, bootAttemptId: now.toString(36) + '-' + Math.random().toString(36).slice(2, 12),
      startedAt: now, lastStage: 'BOOT_START', lastStageAt: now, activeStages: [], completedStages: [], ready: false, exitObserved: false };
    function persist() {
      current.activeStages = Array.from(active);
      current.completedStages = Array.from(completed);
      write(currentKey, current);
    }
    function ready() {
      if (current.ready || active.size || !seen.has('MODULES_READY') || !seen.has('KV_CACHE_DONE')
        || !seen.has('CHAT_HYDRATE_DONE') || !seen.has('THEME_DECODE_DONE') || !seen.has('SHELL_INTERACTIVE')
        || !seen.has('AUX_STORAGE_DONE') || !(seen.has('PLUGIN_DONE') || seen.has('PLUGIN_SKIPPED_SAFE'))) return;
      current.ready = true;
      current.lastStage = 'BOOT_READY';
      current.lastStageAt = Date.now();
      completed.add('BOOT_READY');
      persist();
    }
    function mark(stage) {
      try {
        if (stage === 'BOOT_READY') { ready(); return; }
        if (current.ready || stages.indexOf(stage) < 0 || seen.has(stage)) return;
        seen.add(stage);
        switch (stage) {
          case 'KV_READ_BEGIN': active.add('KV_READ'); active.add('KV_CACHE'); break;
          case 'KV_READ_DONE': active.delete('KV_READ'); break;
          case 'KV_CACHE_DONE': active.delete('KV_CACHE'); break;
          case 'CHAT_DB_BEGIN': active.add('CHAT_DB'); active.add('CHAT_HYDRATE'); break;
          case 'CHAT_MESSAGES_BEGIN': active.add('CHAT_MESSAGES'); break;
          case 'CHAT_MESSAGES_DONE': active.delete('CHAT_MESSAGES'); break;
          case 'CHAT_NORMALIZE_BEGIN': active.delete('CHAT_DB'); active.add('CHAT_NORMALIZE'); break;
          case 'CHAT_NORMALIZE_DONE': active.delete('CHAT_NORMALIZE'); active.add('CHAT_INDEX'); break;
          case 'CHAT_INDEX_DONE': active.delete('CHAT_INDEX'); break;
          case 'CHAT_HYDRATE_DONE': active.delete('CHAT_HYDRATE'); break;
          case 'THEME_READ_BEGIN': active.add('THEME_READ'); break;
          case 'THEME_READ_DONE': active.delete('THEME_READ'); active.add('THEME_DECODE'); break;
          case 'THEME_DECODE_DONE': active.delete('THEME_DECODE'); break;
          case 'AUX_STORAGE_BEGIN': active.add('AUX_STORAGE'); break;
          case 'AUX_STORAGE_DONE': active.delete('AUX_STORAGE'); break;
          case 'PLUGIN_BEGIN': active.add('PLUGIN'); break;
          case 'PLUGIN_DONE': case 'PLUGIN_SKIPPED_SAFE': active.delete('PLUGIN'); break;
          case 'VN_BEGIN': active.add('VN'); break;
          case 'VN_DONE': active.delete('VN'); break;
          case 'MAP_BEGIN': active.add('MAP'); break;
          case 'MAP_DONE': active.delete('MAP'); break;
        }
        if (!stage.endsWith('_BEGIN')) completed.add(stage);
        current.lastStage = stage;
        current.lastStageAt = Date.now();
        persist();
        ready();
      } catch (_) {}
    }
    window.__FLOAT_BOOT_DIAG_INTERNAL_V1__ = { mark: mark, ready: ready };
    window.__FLOAT_BOOT_DIAG__ = Object.freeze({
      getCurrent: function() { return snapshot(current); },
      getPrevious: function() { return snapshot(previous); }
    });
    mark('BOOT_START');
    window.addEventListener('pagehide', function() {
      if (current.exitObserved) return;
      current.exitObserved = true;
      persist();
    });
  } catch (_) {}
})`;

export function bootDiagnosticsScript(buildId: string, disabled = process.env.NEXT_PUBLIC_BOOT_DIAGNOSTICS_DISABLED === "1"): string {
    if (disabled) return "";
    const safeBuildId = /^[a-zA-Z0-9._-]{1,80}$/.test(buildId) ? buildId : "unknown";
    return `${BOOTSTRAP}(${JSON.stringify(safeBuildId)});`;
}

export function markBootStage(stage: BootStage): void {
    try { if (typeof window !== "undefined") window.__FLOAT_BOOT_DIAG_INTERNAL_V1__?.mark(stage); } catch {}
}

export function markBootReady(): void {
    try { if (typeof window !== "undefined") window.__FLOAT_BOOT_DIAG_INTERNAL_V1__?.ready(); } catch {}
}

export function readPreviousBootAttempt(): BootAttempt | null {
    try { return typeof window !== "undefined" ? window.__FLOAT_BOOT_DIAG__?.getPrevious() ?? null : null; } catch { return null; }
}

export function readCurrentBootAttempt(): BootAttempt | null {
    try { return typeof window !== "undefined" ? window.__FLOAT_BOOT_DIAG__?.getCurrent() ?? null : null; } catch { return null; }
}
