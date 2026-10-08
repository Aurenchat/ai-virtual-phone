import { DexieKvReader, CacheKvReader } from './kv-reader.js';
import { KvRescueExporter } from './kv-exporter.js';
import { verifyRescueFiles, verifyKvCacheSnapshotFiles } from './verifier.js';
import { saveFile, releaseDownloads } from './save.js';
const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
const cacheMode = location.hash === '#cache-snapshot';
let schema; let cacheReader; let exporter; let index; let busy = false; let diagnosticPassed = false; let reports = [];
const report = () => { el('report').textContent = `Float KV Dexie 只读验证 v1\n浏览器：${navigator.userAgent.slice(0,512)}\nTIMEOUT/ERROR/EMPTY_UNCONFIRMED 不代表持久化数据库为空。报告不包含 key value、API key 或角色卡正文。\n${JSON.stringify(reports, null, 2)}`; };
const progress = event => status(event.phase === 'KV_INVENTORY' ? `正在逐条核对 KV：已处理 ${event.physicalCount} 条（不显示 key/value）` : `Dexie：${event.step} / ${event.lastStage} · ${(event.elapsedMs / 1000).toFixed(1)} 秒`);
const controls = ['diagnose','prepare','generate','resume','restart','save-part','continue','save-index','verify'];
function unlock() {
  controls.forEach(id => { el(id).disabled = false; });
  el('diagnose').disabled = cacheMode; el('prepare').disabled = !schema || (cacheMode ? !cacheReader : !diagnosticPassed);
  el('generate').disabled = !exporter || !!exporter.pending || !!index; el('continue').disabled = !exporter?.pending?.saveSucceeded;
  el('resume').disabled = !schema || (cacheMode ? !cacheReader : !diagnosticPassed);
}
async function action(callback) { if (busy) return; busy = true; controls.forEach(id => { el(id).disabled = true; }); try { await callback(); } catch (error) { status(error.message || 'KV 救援失败，原数据未修改'); } finally { busy = false; unlock(); } }
const reader = () => cacheMode ? cacheReader : new DexieKvReader(progress);
function closeExporter() { if (exporter && !cacheMode) exporter.reader.close(); exporter = null; index = null; el('part').hidden = true; el('index').hidden = true; releaseDownloads(); }
function showCheckpoint() {
  const saved = KvRescueExporter.readCheckpoint();
  if (saved) { el('checkpoint').hidden = false; el('resume').hidden = false; el('restart').hidden = false; el('checkpoint').textContent = `检测到 ${saved.mode} 断点：${saved.setId}。来源必须一致；缓存断点需重新从原 Float 交接缓存后才能核对。`; }
}
function describeInventory() { el('inventory').textContent = `来源：${exporter.reader.kind}\n物理/缓存记录：${exporter.audit.physicalCount}\n导出覆盖：${exporter.inventory.reduce((sum, task) => sum + task.count, 0)}\n有意排除：${JSON.stringify(exporter.audit.excluded)}\n${exporter.inventory.map(task => `${task.id}: ${task.count} 条`).join('\n')}`; }
async function generateNext() {
  status('正在逐条生成 KV 分卷，请保持页面打开…'); const part = await exporter.nextPart();
  if (!part) {
    index = await exporter.finish(); el('part').hidden = true;
    if (!index.complete && !index.snapshotComplete) { if (!cacheMode) exporter.reader.close(); status('INCOMPLETE：' + index.error); return; }
    el('index').hidden = false; el('index-detail').textContent = `${index.mode}（部分备份）\n${index.totalParts} 卷 · ${(index.totalBytes / 1024 / 1024).toFixed(2)} MiB\n${index.provenance || '持久化 KV 已对账；仍需保存全部文件并验证。'}`;
    status(cacheMode ? '缓存快照分卷已生成；complete=false，未独立核验持久化数据。请保存 index 并验证文件完整性。' : 'KV 分卷已生成，请保存 index 和全部 ZIP，再验证。');
    if (!cacheMode) exporter.reader.close(); return;
  }
  el('part').hidden = false; el('part-title').textContent = `第 ${part.metadata.partNumber} 卷已生成`;
  el('part-detail').textContent = `${exporter.mode}（部分备份）\n${part.metadata.filename}\n${(part.metadata.bytes / 1024 / 1024).toFixed(2)} MiB · ${part.metadata.recordCount} 条\nSHA-256 ${part.metadata.sha256.slice(0,20)}…${part.oversized ? '\n单条完整 KV 记录超过默认分卷目标，本卷单独保存。' : ''}${cacheMode ? '\n来源为已水合内存缓存，尚未独立证明与持久化数据库完整一致。' : ''}`;
  status('请保存当前卷，然后点击“我已保存，继续”。');
}
el('diagnose').onclick = () => action(async () => {
  diagnosticPassed = false; const result = await new DexieKvReader(progress).diagnose(); reports = [...reports.slice(-7), result]; report();
  diagnosticPassed = result.status === 'SUCCESS'; status(`Dexie 验证：${result.status} · ${result.step} / ${result.lastStage}${diagnosticPassed ? '；可以预检 KV-only。' : '；结果未确认，不能导出完整持久化备份。可使用已水合缓存快照作为额外副本。'}`);
});
el('copy-report').onclick = async () => { try { await navigator.clipboard.writeText(el('report').textContent); status('诊断报告已复制。'); } catch { status('请长按下方诊断报告复制。'); } };
el('prepare').onclick = () => action(async () => { closeExporter(); const source = reader(); try { exporter = await KvRescueExporter.prepare(schema, source, { onProgress: progress }); describeInventory(); status('KV 只读预检通过，请生成分卷；这仍是部分备份。'); } catch (error) { if (!cacheMode) source.close(); throw error; } });
el('generate').onclick = () => action(async () => { exporter.persist(); await generateNext(); });
el('save-part').onclick = () => action(async () => { const part = exporter?.pending; if (!part) return; if (await saveFile(part.blob, part.metadata.filename)) { part.saveSucceeded = true; status('请确认文件保存成功，然后点击“我已保存，继续”。'); } else status('已取消分享，断点未推进，当前卷仍保留。'); });
el('continue').onclick = () => action(async () => { exporter.confirmSaved(); releaseDownloads(); el('part').hidden = true; await generateNext(); });
el('save-index').onclick = () => action(async () => { if (await saveFile(new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' }), `float-rescue-${index.setId}-index.json`)) status('请选择已保存的 index 和全部 ZIP 执行验证。'); else status('index 分享已取消，可以重新保存。'); });
el('resume').onclick = () => action(async () => { closeExporter(); const source = reader(); try { exporter = await KvRescueExporter.resume(schema, source, { onProgress: progress }); describeInventory(); await generateNext(); } catch (error) { if (!cacheMode) source.close(); throw error; } });
el('restart').onclick = () => action(async () => { closeExporter(); KvRescueExporter.restart(); el('checkpoint').hidden = true; el('resume').hidden = true; el('restart').hidden = true; status('已移除 KV 救援断点，业务数据未修改。'); });
el('verify').onclick = () => action(async () => {
  const files = [...el('files').files]; const indexes = files.filter(file => file.name.endsWith('-index.json')); el('verification').textContent = '正在验证…';
  try {
    if (indexes.length !== 1 || indexes[0].size > 2 * 1024 * 1024) throw Error('请选择一个小型 index 和全部 ZIP');
    const metadata = JSON.parse(await indexes[0].text());
    if (!['kv-only','kv-cache-snapshot'].includes(metadata.mode)) throw Error('此入口仅验证 KV 分卷；其它已验证的备份保持不变');
    const verify = metadata.mode === 'kv-cache-snapshot' ? verifyKvCacheSnapshotFiles : verifyRescueFiles;
    const result = await verify(indexes[0], files.filter(file => file !== indexes[0]), text => { el('verification').textContent = text; });
    el('verification').textContent = result.snapshotVerified ? 'KV 应急缓存快照文件完整性已验证。来源为已水合内存缓存，尚未独立证明与持久化数据库完整一致。' : 'KV-only 救援备份已完整验证，可以用于恢复（仅 KV，部分备份）。';
    if (KvRescueExporter.readCheckpoint()?.setId === result.setId) KvRescueExporter.restart();
  } catch (error) { el('verification').textContent = `验证失败：${error.message}`; }
});
if (cacheMode) {
  el('provenance').textContent = 'KV 应急缓存快照：来源为已水合内存缓存，尚未独立证明与持久化数据库完整一致。complete 永远为 false，不会解锁 Phase B。'; el('prepare').textContent = '只读预检缓存快照'; el('generate').textContent = '生成缓存快照分卷'; status('等待原 Float 交接已经成功水合的缓存；不会读取 IndexedDB 或重新 hydration。');
  // Same-origin, explicit user handoff. Copies only primitive key/value string
  // references into this realm's Map; never retains the parent window/objects.
  Object.defineProperty(window, 'acceptHydratedKvSnapshot', { configurable: true, value: entries => {
    if (cacheReader || busy) throw Error('缓存已交接，不能覆盖');
    cacheReader = new CacheKvReader(entries); delete window.acceptHydratedKvSnapshot; status('缓存已交接，原 Float 主页面将卸载。请预检缓存快照。'); unlock(); return true;
  } });
}
try {
  const response = await fetch('/float-rescue-backup/schema', { cache: 'no-store' }); if (!response.ok) throw Error('数据源清单加载失败，不返回 Float 主页面'); schema = await response.json(); showCheckpoint();
  if (location.hash === '#handoff-finished') status('缓存已交接到独立窗口。请在那个窗口保存缓存快照；本页不加载 Float runtime。');
} catch (error) { status(error.message); }
unlock();
window.addEventListener('pagehide', () => { if (exporter && !cacheMode) exporter.reader.close(); releaseDownloads(); });
