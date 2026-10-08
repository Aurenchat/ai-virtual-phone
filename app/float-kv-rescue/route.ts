// Standalone Response: no root layout, hydration, plugins, or schedulers.
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Float KV 救援 v1</title>
<style>:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;padding:20px 16px;background:Canvas;color:CanvasText}main{max-width:720px;margin:auto}h1{font-size:24px}h2{font-size:19px}p{line-height:1.6}section{border:1px solid #8886;border-radius:12px;padding:16px;margin:16px 0}button{font:inherit;padding:12px;border-radius:8px;margin:6px 6px 6px 0}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.6}[hidden]{display:none!important}input{max-width:100%}.notice{border:2px solid #b77716;padding:14px;border-radius:10px}</style>
<script src="/float-rescue/dexie-runtime.js"></script><script type="module" src="/float-rescue/kv-page.js"></script></head><body><main>
<h1>Float KV 救援 v1</h1><p class="notice">独立低内存页面 · 业务数据库只读 · 部分备份<br>只保护 AiPhoneKvDB / entries，不重复导出已验证的聊天两库或其余非 KV 数据。所有文件在本机生成，不上传。可能包含角色卡、API 密钥、云连接信息，请保存到自己的安全位置。</p>
<p id="provenance">当前来源：独立 Dexie 持久化读取。先完成限定主键和单条 row 验证，再允许预检。</p>
<p>沿用 DATA_MODULES 的原 moduleId/sourceIndex；未知 key 由 cache source 接收。云连接凭据包含在 settings 的专用 sourceIndex 999 中。云备份运行状态 ai_phone_cloud_backup_state_v1 按 canonical 规则排除，并写入 index 排除清单。</p>
<p>逐条 value 原样保存，不解析角色卡或重排 JSON；每批最多 1 个 value，32 Mi 字符单条安全上限。超限/超时/空集会停止，不生成 COMPLETE。请关闭其它 Float 页面。</p>
<section><h2>1. 独立 Dexie 只读验证</h2><button id="diagnose">运行 Dexie 只读验证</button><button id="copy-report">复制 Dexie 诊断报告</button><pre id="report">报告仅包含阶段、数量和耗时，不包含 value、API key 或角色正文。</pre></section>
<section><h2>2. 预检与分卷</h2><button id="prepare" disabled>只读预检 KV-only</button><button id="generate" disabled>生成 KV 分卷</button><pre id="inventory"></pre><p id="checkpoint" hidden></p><button id="resume" hidden>重新核对并继续 KV 断点</button><button id="restart" hidden>移除 KV 救援断点</button><p>断点不与其它救援模式混用。恢复和结束都会重新逐条核对数量及内容指纹；改变任意 value 都会停止。</p></section>
<p id="status" role="status" aria-live="polite">请先运行 Dexie 只读验证。任何失败都不代表数据库为空。</p>
<section id="part" hidden><h2 id="part-title"></h2><pre id="part-detail"></pre><button id="save-part">保存当前卷</button><button id="continue" disabled>我已保存，继续</button><p>分享取消不推进断点；分享成功也需明确确认。一次只保留当前卷，不自动弹下一次分享。</p></section>
<section id="index" hidden><h2>保存 index</h2><pre id="index-detail"></pre><button id="save-index">保存 KV index</button><p>生成成功不是已经保存。请保存全部 ZIP 和 index，并执行下方验证。</p></section>
<section><h2>3. 验证已保存文件</h2><input id="files" type="file" multiple accept=".json,.zip"><button id="verify">验证 KV 已保存分卷</button><p id="verification" role="status"></p><p>每卷兼容当前 Float v2 importer，可在数据管理中逐卷导入。缓存快照只能验证文件完整性，不能独立证明持久化 KV 已完整备份，不能用于解锁媒体迁移。</p></section>
<section><h2>独立读取仍超时</h2><p>不要重试全库无界 toArray。回到已经正常进入桌面的 Float：设置 → 数据管理 → KV 应急缓存快照 → “打开 KV 应急缓存快照”。它只交接已水合缓存，不重新启动 hydration 或旧数据迁移。该快照永久标注为未独立核验，不能假冒完整持久化备份。</p></section>
</main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
}
