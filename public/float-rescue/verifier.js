import { sha256Blob } from "./io.js";
import { readStoreManifest } from "./zip-store.js";
import { partFilename, RESCUE_PART_HARD_MAX_BYTES } from "./exporter.js";
const count = value => Number.isSafeInteger(value) && value >= 0;
const equal = (a, b) => JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
export async function verifyRescueFiles(indexFile, files, progress = () => {}, probe) {
  if (!indexFile || indexFile.size > 2 * 1024 * 1024) throw Error("index 缺失或过大");
  const index = JSON.parse(await indexFile.text());
  if (index.format !== "float-rescue-set" || index.version !== 1 || index.complete !== true || !/^[a-zA-Z0-9-]{1,100}$/.test(index.setId) || !Array.isArray(index.parts) || !index.parts.length || index.totalParts !== index.parts.length || !Array.isArray(index.inventory) || !index.exportedCounts || !["chat", "full", "chat-media-safety", "remaining-non-kv"].includes(index.mode)) throw Error("index 无效或标记为 INCOMPLETE");
  if (files.length !== index.parts.length || new Set(files.map(file => file.name)).size !== files.length || index.totalBytes !== index.parts.reduce((sum, part) => sum + part.bytes, 0)) throw Error("分卷数量、文件名或总大小不完整");
  const sums = {}; let totalRecords = 0;
  for (let i = 0; i < index.parts.length; i++) {
    const part = index.parts[i]; const file = files.find(file => file.name === part.filename);
    if (part.partNumber !== i + 1 || part.filename !== partFilename(index.setId, i + 1) || !file || !count(part.bytes) || part.bytes > RESCUE_PART_HARD_MAX_BYTES || file.size !== part.bytes || !count(part.recordCount) || !Array.isArray(part.moduleIds) || !/^[a-f0-9]{64}$/.test(part.sha256)) throw Error(`第 ${i + 1} 卷缺失或 metadata 不一致`);
    progress(`正在验证第 ${i + 1} / ${index.parts.length} 卷…`);
    if (await sha256Blob(file, probe) !== part.sha256) throw Error(`第 ${i + 1} 卷 SHA-256 不一致`);
    const manifest = await readStoreManifest(file); const rescue = manifest.rescueSet;
    if (manifest.format !== "ai-phone-backup" || manifest.version !== 2 || !Array.isArray(manifest.modules) || !count(manifest.totalRecords) || !count(manifest.totalBytes) || !rescue || rescue.version !== 1 || rescue.setId !== index.setId || rescue.partNumber !== i + 1 || rescue.createdAt !== index.createdAt || rescue.mode !== index.mode || manifest.createdAt !== index.createdAt || manifest.origin !== index.origin || !rescue.sourceCounts) throw Error(`第 ${i + 1} 卷 manifest 不一致`);
    if (!equal(manifest.modules.map(module => module.id), part.moduleIds) || manifest.modules.some(module => typeof module.id !== "string" || typeof module.label !== "string" || !count(module.records) || !count(module.bytes)) || manifest.totalRecords !== part.recordCount || manifest.totalRecords !== manifest.modules.reduce((sum, module) => sum + module.records, 0) || manifest.totalBytes !== manifest.modules.reduce((sum, module) => sum + module.bytes, 0)) throw Error("manifest 记录数或模块不一致");
    let partRecords = 0;
    for (const [id, records] of Object.entries(rescue.sourceCounts)) {
      if (!count(records) || !index.inventory.some(task => task.id === id)) throw Error("manifest source counts 无效");
      sums[id] = (sums[id] || 0) + records; partRecords += records;
    }
    if (partRecords !== part.recordCount) throw Error("分卷 source counts 与记录数不一致"); totalRecords += partRecords;
  }
  if (new Set(index.inventory.map(task => task.id)).size !== index.inventory.length || Object.keys(index.exportedCounts).length !== index.inventory.length || index.inventory.some(task => !count(task.count) || !count(index.exportedCounts[task.id]) || task.count !== index.exportedCounts[task.id] || task.count !== (sums[task.id] || 0)) || totalRecords !== Object.values(index.exportedCounts).reduce((sum, value) => sum + value, 0)) throw Error("index 与各卷记录数对账失败");
  return { complete: true, setId: index.setId, totalParts: index.totalParts, totalRecords };
}
