// Phase A: standalone preview only. No imports, hydration, decoding or writes.
const scanButton = document.getElementById("scan");
const copyButton = document.getElementById("copy");
const status = document.getElementById("status");
const reportElement = document.getElementById("report");
let reportText = "";
const missingDatabase = "未找到现有 Float 数据库，扫描已停止。";

async function openExisting(name, storeName) {
  if (typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    if (!databases.some(db => db.name === name)) throw new Error(missingDatabase);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let stopped = false;
    request.onupgradeneeded = () => {
      stopped = true;
      request.transaction.abort();
      reject(new Error(missingDatabase));
    };
    request.onblocked = () => {
      stopped = true;
      reject(new Error("数据库被其它页面占用，请关闭其它 Float 标签页后重试。"));
    };
    request.onerror = () => reject(new Error(stopped ? missingDatabase : "数据库无法读取，扫描已停止。"));
    request.onsuccess = () => {
      const db = request.result;
      if (stopped || !db.objectStoreNames.contains(storeName)) {
        db.close();
        reject(new Error(missingDatabase));
      } else {
        db.onversionchange = () => db.close();
        resolve(db);
      }
    };
  });
}

function scanCursor(db, storeName, visit) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).openCursor();
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(new Error("只读扫描失败，请重试。"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try { visit(cursor.value); cursor.continue(); }
      catch { tx.abort(); }
    };
  });
}

const bucket = () => ({ count: 0, encoded: 0, payload: 0 });
function inlineMetadata(url) {
  const comma = url.indexOf(",");
  // Only copy the small header, never the base64 payload or message body.
  const header = comma >= 0 && comma < 1024 ? url.slice(5, comma) : "";
  const mime = (header.split(";")[0] || "unknown").toLowerCase();
  const category = ["image", "audio", "video"].find(type => mime.startsWith(type + "/")) || "other";
  const base64 = /;base64$/i.test(header);
  const length = comma < 0 ? 0 : url.length - comma - 1;
  const padding = url.endsWith("==") ? 2 : url.endsWith("=") ? 1 : 0;
  return { mime, category, encoded: url.length, payload: base64 ? Math.max(0, Math.floor(length * 3 / 4) - padding) : length };
}
const size = bytes => `${(bytes / (1024 * 1024)).toFixed(2)} MiB (${bytes.toLocaleString()} bytes/chars)`;
function categoryLines(map) {
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `  ${name}: ${value.count} 项 / ${size(value.bytes)}`);
}
function addBytes(map, category, bytes) {
  const value = map.get(category) || { count: 0, bytes: 0 };
  value.count++; value.bytes += bytes; map.set(category, value);
}

async function scan() {
  let chat; let media;
  try {
    chat = await openExisting("AiPhoneChatDB", "messages");
    media = await openExisting("AiPhoneMediaCacheDB", "entries");
    const inline = { image: bucket(), audio: bucket(), video: bucket(), other: bucket() };
    const sessions = new Map(); const refs = new Set(); const foundCategories = new Map(); const allCategories = new Map();
    let messageCount = 0; let refCount = 0; let assetCount = 0; let otherUrlCount = 0;
    let largest = null; let found = 0; let mediaCount = 0; let mediaBytes = 0;
    await scanCursor(chat, "messages", message => {
      messageCount++;
      const url = message.mediaUrl;
      if (typeof url !== "string") return;
      if (url.startsWith("data:")) {
        const item = inlineMetadata(url); const totals = inline[item.category];
        totals.count++; totals.encoded += item.encoded; totals.payload += item.payload;
        const sessionId = String(message.sessionId ?? "unknown");
        const session = sessions.get(sessionId) || bucket();
        session.count++; session.encoded += item.encoded; session.payload += item.payload; sessions.set(sessionId, session);
        if (!largest || item.encoded > largest.encoded) largest = { ...item, messageId: String(message.id), sessionId };
      } else if (url.startsWith("media-store://")) { refCount++; refs.add(url.slice(14)); }
      else if (url.startsWith("asset://")) assetCount++;
      else otherUrlCount++;
      if (messageCount % 256 === 0) status.textContent = `已扫描 ${messageCount.toLocaleString()} 条消息…`;
    });
    await scanCursor(media, "entries", entry => {
      const bytes = entry.blob?.size || 0;
      const category = typeof entry.mediaCategory === "string" ? entry.mediaCategory : "unknown";
      mediaCount++; mediaBytes += bytes; addBytes(allCategories, category, bytes);
      if (refs.has(entry.id)) { found++; addBytes(foundCategories, category, bytes); }
    });
    const total = Object.values(inline).reduce((sum, value) => ({ count: sum.count + value.count, encoded: sum.encoded + value.encoded, payload: sum.payload + value.payload }), bucket());
    const lines = ["Float Chat Media Census · PREVIEW ONLY", "只读扫描；未修改任何聊天或媒体数据。", `ChatMessage 总数: ${messageCount}`, "", "Inline data URL（encoded 为字符串字符数；payload 为估算，未解码）:"];
    for (const [name, value] of Object.entries({ ...inline, total })) lines.push(`  ${name}: ${value.count} 条 / encoded ${size(value.encoded)} / payload estimate ${size(value.payload)}`);
    lines.push("", "最大单条 inline:");
    if (largest) lines.push(`  MIME: ${largest.mime}`, `  encoded: ${size(largest.encoded)}`, `  payload estimate: ${size(largest.payload)}`, `  messageId: ${largest.messageId}`, `  sessionId: ${largest.sessionId}`);
    else lines.push("  无");
    lines.push("", `media-store: 引用 ${refCount} / unique IDs ${refs.size} / found ${found} / missing ${refs.size - found}`, ...categoryLines(foundCategories), `asset://: ${assetCount}`, `其它 URL: ${otherUrlCount}`, "", `AiPhoneMediaCacheDB: ${mediaCount} 项 / ${size(mediaBytes)}`, ...categoryLines(allCategories), "", "Top sessions by inline encoded（最多 10）:");
    for (const [id, value] of [...sessions.entries()].sort((a, b) => b[1].encoded - a[1].encoded).slice(0, 10)) lines.push(`  ${id}: ${value.count} 条 / encoded ${size(value.encoded)} / payload estimate ${size(value.payload)}`);
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (estimate) lines.push("", "浏览器存储估算:", `  usage: ${estimate.usage == null ? "不可用" : size(estimate.usage)}`, `  quota: ${estimate.quota == null ? "不可用" : size(estimate.quota)}`, `  estimated free: ${estimate.usage == null || estimate.quota == null ? "不可用" : size(Math.max(0, estimate.quota - estimate.usage))}`);
    } catch { lines.push("", "浏览器存储估算不可用。"); }
    return lines.join("\n");
  } finally { chat?.close(); media?.close(); }
}

scanButton.addEventListener("click", async () => {
  scanButton.disabled = true; copyButton.disabled = true;
  reportText = ""; reportElement.textContent = "";
  document.getElementById("copy-fallback").hidden = true;
  status.textContent = "正在只读扫描…";
  try {
    reportText = await scan(); reportElement.textContent = reportText;
    copyButton.disabled = false; status.textContent = "只读扫描完成。未修改任何数据。";
  } catch (error) { status.textContent = error.message || "扫描失败。"; }
  finally { scanButton.disabled = false; }
});
copyButton.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(reportText); status.textContent = "报告已复制。"; }
  catch {
    const field = document.getElementById("copy-fallback");
    field.value = reportText; field.hidden = false; field.focus(); field.select();
    status.textContent = "自动复制不可用，请长按或手动复制下方报告。";
  }
});
