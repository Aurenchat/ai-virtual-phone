import { isKvHydrated, kvEntries } from './kv-db';

type RescueWindow = Window & { acceptHydratedKvSnapshot?: (entries: Array<{ key: string; value: string }>) => boolean };
// Invoked by an explicit click in an already running Float. Never hydrate,
// register a migration, persist values, or import the Float runtime in the child.
export function openHydratedKvCacheSnapshot(onNotice: (message: string) => void): void {
  if (!isKvHydrated()) { onNotice('KV 尚未成功水合，不能从空缓存生成救援副本。请保留现有 hydration 失败保护。'); return; }
  const target = window.open('/float-kv-rescue#cache-snapshot', '_blank') as RescueWindow | null;
  if (!target) { onNotice('请允许本站弹出独立救援窗口，然后再次点击。'); return; }
  const deadline = Date.now() + 30_000;
  const handoff = () => {
    if (target.closed) { onNotice('救援窗口已关闭，未交接缓存，原数据未修改。'); return; }
    try {
      if (target.acceptHydratedKvSnapshot) {
        const rows = kvEntries();
        try { if (!rows.length || !target.acceptHydratedKvSnapshot(rows)) throw Error('empty'); }
        finally { rows.length = 0; }
        // Unload the old MainApp/chat/plugin document after primitive strings
        // are owned by the independent window. No parent closure is retained.
        window.location.assign('/float-kv-rescue#handoff-finished'); return;
      }
    } catch { onNotice('缓存交接失败，不能标为完整备份。原数据未修改。'); return; }
    if (Date.now() >= deadline) { onNotice('独立窗口加载超时，缓存未交接。原数据未修改。'); return; }
    window.setTimeout(handoff, 100);
  };
  handoff();
}
