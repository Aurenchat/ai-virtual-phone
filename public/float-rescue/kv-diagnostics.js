import { openExistingDb } from "./io.js";
export const KV_DIAGNOSTIC_TIMEOUT_MS = 15_000;
export const KV_DIAGNOSTIC_KEY_LIMIT = 8;
export const KV_DIAGNOSTIC_METHODS = ["getKey", "count", "getAllKeys", "prefixCursor"];
const exactKey = "ai_phone_chat_settings_v1";
const prefix = "chat-generating:";
const safeErrorName = error => /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error?.name || "") ? error.name : "Error";

// Each explicitly requested probe opens its own readonly transaction. No values,
// full key enumeration, persistence, or backup logic is involved.
export function diagnoseKvRead(method, onProgress = () => {}) {
  if (!KV_DIAGNOSTIC_METHODS.includes(method)) throw Error("未知 KV 诊断方法");
  return new Promise(resolve => {
    const started = performance.now(); const startedAt = new Date().toISOString();
    let db; let tx; let settled = false; let requestCompleted = false; let transactionCompleted = false; let observedKeyCount = 0; let lastStage = "OPEN_DB";
    const stages = [];
    const metadata = () => ({ method, dbName: "AiPhoneKvDB", storeName: "entries", lastStage, elapsedMs: Math.round(performance.now() - started), observedKeyCount, requestCompleted, transactionCompleted });
    const stage = value => { lastStage = value; stages.push({ stage: value, elapsedMs: Math.round(performance.now() - started), observedKeyCount }); try { onProgress(metadata()); } catch { /* UI diagnostics cannot affect the read. */ } };
    const settle = (status, errorName) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      const result = { version: 1, startedAt, ...metadata(), status, query: method === "getKey" || method === "count" ? "exact chat-settings key" : "bounded chat-generating prefix", limit: method === "getKey" || method === "count" ? 1 : KV_DIAGNOSTIC_KEY_LIMIT, keyCount: status === "SUCCESS" ? observedKeyCount : null, atLimit: observedKeyCount === KV_DIAGNOSTIC_KEY_LIMIT, stages, ...(errorName ? { errorName } : {}) };
      if (status !== "SUCCESS") { try { tx?.abort(); } catch { /* Best effort. */ } }
      db?.close(); resolve(result);
    };
    const complete = () => { if (requestCompleted && transactionCompleted) settle("SUCCESS"); };
    const timer = setTimeout(() => settle("TIMEOUT", "TimeoutError"), KV_DIAGNOSTIC_TIMEOUT_MS);
    try {
      stage("OPEN_DB");
      openExistingDb("AiPhoneKvDB").then(opened => {
        if (settled) { opened?.close(); return; }
        db = opened;
        if (!db) { settle("DB_MISSING"); return; }
        if (!db.objectStoreNames.contains("entries")) { settle("STORE_MISSING"); return; }
        try {
          tx = db.transaction("entries", "readonly"); const store = tx.objectStore("entries"); stage("TX_OPENED");
          tx.oncomplete = () => { if (!settled) { transactionCompleted = true; stage("TX_COMPLETE"); complete(); } };
          tx.onerror = tx.onabort = event => { if (!settled) { stage(event.type === "abort" ? "TX_ABORT" : "TX_ERROR"); settle("ERROR", safeErrorName(tx.error)); } };
          const api = method === "prefixCursor" ? "openKeyCursor" : method;
          if (typeof store[api] !== "function") { settle("UNSUPPORTED"); return; }
          const range = method === "getKey" || method === "count" ? IDBKeyRange.only(exactKey) : IDBKeyRange.bound(prefix, "chat-generating;", false, true);
          const request = method === "getAllKeys" ? store.getAllKeys(range, KV_DIAGNOSTIC_KEY_LIMIT) : store[api](range);
          stage("REQUEST_ISSUED");
          request.onerror = () => { if (!settled) { stage("REQUEST_ERROR"); settle("ERROR", safeErrorName(request.error)); } };
          request.onsuccess = () => {
            if (settled) return;
            try {
              if (method === "prefixCursor") {
                const cursor = request.result;
                if (cursor) {
                  observedKeyCount++; stage(observedKeyCount === 1 ? "FIRST_KEY_RECEIVED" : "KEY_PROGRESS");
                  if (observedKeyCount < KV_DIAGNOSTIC_KEY_LIMIT) { cursor.continue(); return; }
                  stage("CURSOR_LIMIT_REACHED");
                } else stage("CURSOR_EXHAUSTED");
              } else {
                const value = request.result;
                observedKeyCount = method === "getKey" ? value === undefined ? 0 : 1 : method === "getAllKeys" ? value.length : value;
                if (!Number.isSafeInteger(observedKeyCount) || observedKeyCount < 0 || observedKeyCount > (method === "getAllKeys" ? KV_DIAGNOSTIC_KEY_LIMIT : 1)) throw Error("无效诊断结果");
                stage("REQUEST_SUCCESS");
              }
              requestCompleted = true; complete();
            } catch (error) { settle("ERROR", safeErrorName(error)); }
          };
        } catch (error) { settle("ERROR", safeErrorName(error)); }
      }).catch(error => { if (!settled) settle(error.message?.includes("超时") ? "TIMEOUT" : "ERROR", safeErrorName(error)); });
    } catch (error) { settle("ERROR", safeErrorName(error)); }
  });
}
export function formatKvDiagnosticReport(results) {
  return `Float KV 主键只读诊断 v1\n浏览器：${navigator.userAgent.slice(0, 512)}\n仅主键/计数；未读取 value，未备份 KV。TIMEOUT/ERROR 不代表 key 不存在或数据库为空；keyCount=null 表示结果未确认。达到 limit 仅代表有界采样，不是全库数量。\n${JSON.stringify(results, null, 2)}`;
}
