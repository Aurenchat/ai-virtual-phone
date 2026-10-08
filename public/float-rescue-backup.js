import { RescueExporter } from "./float-rescue/exporter.js";
import { verifyRescueFiles } from "./float-rescue/verifier.js";
import { saveFile, releaseDownloads } from "./float-rescue/save.js";
const element = id => document.getElementById(id);
let schema; let exporter = null; let index = null; let busy = false;
const status = message => { element("status").textContent = message; };
const selected = () => Array.from(document.querySelectorAll("#modules input:checked"), input => input.value);
const mode = () => selected().length === 1 && selected()[0] === "chat" ? "chat" : "full";
const bytes = value => `${(value / 1024 / 1024).toFixed(2)} MiB`;
function lockSelection(locked) { for (const item of element("selection").querySelectorAll("button,input")) item.disabled = locked; element("generate").disabled = locked || !exporter; }
async function action(fn) {
  if (busy) return; busy = true;
  try { await fn(); } catch (error) { status(error.message || "救援操作失败，源数据未修改。"); }
  finally { busy = false; }
}
function resetSelection(ids) {
  for (const input of element("modules").querySelectorAll("input")) input.checked = ids.includes(input.value);
  exporter = null; element("generate").disabled = true; element("inventory").textContent = "";
}
function invalidate() { exporter = null; element("generate").disabled = true; element("inventory").textContent = "选择已改变，请重新预检。"; }
async function generateNext() {
  status("正在逐条读取并生成分卷，请保持页面打开…");
  const part = await exporter.nextPart();
  if (!part) {
    index = await exporter.finish(); element("part").hidden = true;
    if (!index.complete) { status(`INCOMPLETE：${index.error}`); return; }
    element("index").hidden = false;
    element("index-detail").textContent = `${index.totalParts} 卷 / ${bytes(index.totalBytes)}\nsetId: ${index.setId}\n请保存 index，然后验证所有已保存文件。`;
    status("分卷已生成并确认保存。请保存 index 并验证；尚未验证成功。"); return;
  }
  element("part").hidden = false; element("part-title").textContent = `第 ${part.metadata.partNumber} 卷已生成`;
  element("part-detail").textContent = `${part.metadata.filename}\n大小：${bytes(part.metadata.bytes)}\n包含记录数：${part.metadata.recordCount}\nSHA-256：${part.metadata.sha256.slice(0, 20)}…`;
  element("save-part").textContent = `保存第 ${part.metadata.partNumber} 卷`; element("save-part").disabled = false; element("continue").disabled = true;
  element("oversized").hidden = !part.oversized;
  element("oversized").textContent = part.singleOversizedMedia ? "此卷包含单个超大媒体文件，因此超过默认分卷大小。" : "此卷包含一条较大的完整记录及其媒体，因此超过默认分卷大小。";
  status("当前只保留这一卷。请保存并明确确认后继续。");
}
element("preset-chat").addEventListener("click", () => resetSelection(["chat"]));
element("preset-full").addEventListener("click", () => resetSelection(schema.modules.map(module => module.id)));
element("preflight").addEventListener("click", () => action(async () => {
  exporter = null; element("inventory").textContent = ""; lockSelection(true); status("正在只读预检数据库与记录数…");
  try {
    exporter = await RescueExporter.prepare(schema, selected(), mode());
    element("inventory").textContent = exporter.inventory.map(task => `${task.id}: ${task.exists ? task.count + " 条" : "数据库不存在（未创建）"}`).join("\n");
    status("预检通过。准备好保存文件后，点击生成分卷。");
  } finally { lockSelection(false); }
}));
element("generate").addEventListener("click", () => action(async () => { lockSelection(true); exporter.persist(); await generateNext(); }));
element("save-part").addEventListener("click", () => action(async () => {
  const part = exporter.pending; if (!part) return;
  element("save-part").disabled = true;
  try {
    const saved = await saveFile(part.blob, part.metadata.filename);
    if (saved) { part.saveSucceeded = true; element("continue").disabled = false; status("请确认文件已保存，再点击“我已保存，继续”。"); }
    else status("已取消分享。当前卷仍保留，进度未前进，可再次保存。");
  } finally { element("save-part").disabled = false; }
}));
element("continue").addEventListener("click", () => action(async () => {
  exporter.confirmSaved(); releaseDownloads(); element("part").hidden = true; element("continue").disabled = true; await generateNext();
}));
element("save-index").addEventListener("click", () => action(async () => {
  const saved = await saveFile(new Blob([JSON.stringify(index, null, 2)], { type: "application/json" }), `float-rescue-${index.setId}-index.json`);
  status(saved ? "请重新选择已保存的 index 和全部 ZIP，执行完整验证。" : "已取消 index 分享，请再次保存。");
}));
element("verify").addEventListener("click", () => action(async () => {
  const files = Array.from(element("verify-files").files); const indexes = files.filter(file => file.name.endsWith("-index.json"));
  element("verification").textContent = "正在验证…";
  try {
    if (indexes.length !== 1) throw Error("请选择一个 rescue index.json 和全部 part ZIP");
    const result = await verifyRescueFiles(indexes[0], files.filter(file => file !== indexes[0]), message => { element("verification").textContent = message; });
    element("verification").textContent = "救援备份已完整验证，可以用于恢复。";
    const saved = RescueExporter.readCheckpoint(); if (saved?.setId === result.setId) RescueExporter.restart();
  } catch (error) { element("verification").textContent = `验证失败：${error.message}`; }
}));
element("resume-button").addEventListener("click", () => action(async () => {
  status("正在重新预检，确认源数据未变化…"); exporter = await RescueExporter.resume(schema); lockSelection(true); element("resume").hidden = true; await generateNext();
}));
element("restart").addEventListener("click", () => action(async () => {
  RescueExporter.restart(); exporter = null; index = null; element("resume").hidden = true; element("part").hidden = true; element("index").hidden = true; lockSelection(false); resetSelection(["chat"]); status("已移除救援断点。Float 原数据未修改，可以重新预检。");
}));
try {
  const response = await fetch("/float-rescue-backup/schema", { method: "GET", cache: "no-store" });
  if (!response.ok) throw Error("无法加载数据源清单，已停止；不会返回主应用。");
  schema = await response.json();
  for (const module of schema.modules) {
    const label = document.createElement("label"); const input = document.createElement("input"); input.type = "checkbox"; input.value = module.id; input.checked = module.id === "chat"; input.addEventListener("change", invalidate); label.append(input, document.createTextNode(` ${module.label}${module.large ? "（含大型数据）" : ""}`)); element("modules").appendChild(label);
  }
  lockSelection(false); status("请选择范围并预检。源数据库全程只读。");
  const checkpoint = RescueExporter.readCheckpoint();
  if (checkpoint) { element("resume").hidden = false; element("resume-label").textContent = `检测到未完成的救援备份 set ${checkpoint.setId}，是否继续？`; lockSelection(true); }
} catch (error) { status(error.message); }
