import { ownsKey, encodeKey, decodeKey } from "./io.js";

// UTF-16 string order is the native IndexedDB string-key order. A true
// exclusive successor also includes prefix + "\uffff" + further characters.
function prefixEnd(prefix) {
  for (let index = prefix.length - 1; index >= 0; index--) {
    const unit = prefix.charCodeAt(index);
    if (unit < 0xffff) return prefix.slice(0, index) + String.fromCharCode(unit + 1);
  }
  return null;
}
export function compileKvSelectors(schema, moduleId, sourceIndex) {
  const source = schema.modules.find(module => module.id === moduleId)?.sources.find(source => source.sourceIndex === sourceIndex && source.type === "kv");
  if (!source) throw Error("KV 数据源不存在");
  if (source.includeAll === true) return [{ type: "all" }];
  const prefixes = [];
  for (const prefix of [...new Set(source.prefixes || [])].sort()) {
    if (typeof prefix !== "string") throw Error("KV prefix 无效");
    if (!prefixes.some(parent => prefix.startsWith(parent))) prefixes.push(prefix);
  }
  const selectors = prefixes.map(prefix => ({ type: "prefix", prefix, end: prefixEnd(prefix) }));
  for (const key of new Set(source.keys || [])) {
    if (typeof key !== "string") throw Error("KV key 无效");
    if (!prefixes.some(prefix => key.startsWith(prefix)) && ownsKey(schema, moduleId, sourceIndex, key, "kv")) selectors.push({ type: "exact", key });
  }
  return selectors.sort((a, b) => { const x = a.key ?? a.prefix; const y = b.key ?? b.prefix; return x < y ? -1 : x > y ? 1 : 0; });
}
export function kvSelectorRange(selector, after = null) {
  if (selector.type === "all") return after === null ? undefined : IDBKeyRange.lowerBound(after, true);
  if (selector.type === "exact") return IDBKeyRange.only(selector.key);
  // Binary keys sort after all string keys; this upper bound handles prefixes
  // consisting entirely of U+FFFF (and the empty prefix) without scanning values.
  return IDBKeyRange.bound(after ?? selector.prefix, selector.end ?? new ArrayBuffer(0), after !== null, true);
}
export function validateKvCursor(cursor, selectors) {
  if (!cursor || !Number.isSafeInteger(cursor.selectorIndex) || cursor.selectorIndex < 0 || cursor.selectorIndex > selectors.length || !("key" in cursor)) throw Error("KV 救援断点格式无效");
  if (cursor.key !== null) {
    const key = decodeKey(cursor.key); encodeKey(key);
    const selector = selectors[cursor.selectorIndex];
    if (!selector || selector.type === "exact" || selector.type === "prefix" && (typeof key !== "string" || !key.startsWith(selector.prefix))) throw Error("KV 救援断点主键无效");
  }
  return cursor;
}
