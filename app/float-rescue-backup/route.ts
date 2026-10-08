// Route Handler deliberately bypasses the React root layout.
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(`<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Float 本地救援备份</title>
<style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;padding:20px 16px;background:Canvas;color:CanvasText}main{max-width:720px;margin:auto}h1{font-size:24px}h2{font-size:19px}p{line-height:1.6}section{border:1px solid #8886;border-radius:12px;padding:16px;margin:16px 0}.notice{border:2px solid #b77716;padding:14px;border-radius:10px}button{font:inherit;padding:12px;border-radius:8px;margin:6px 6px 6px 0;cursor:pointer}button:disabled{opacity:.5;cursor:default}label{display:block;padding:6px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.6}[hidden]{display:none!important}#status{min-height:28px}input[type=file]{max-width:100%}
</style><script type="module" src="/float-rescue-backup.js"></script></head><body><main>
<h1>Float 本地救援备份</h1><p class="notice"><strong>独立低内存页面 · 源数据只读</strong><br>救援备份可能包含敏感配置，请仅保存到你自己的安全位置。所有打包和验证均在浏览器本地完成，不上传服务器。</p>
<p>请关闭其它 Float 标签页，并在导出完成前保持主应用关闭。历史媒体迁移仍未开放。</p>
<p>1. 选择备份范围 → 2. 预检 → 3. 生成分卷 → 4. 每卷保存 → 5. 保存 index → 6. 验证备份</p>
<section id="resume" hidden><p id="resume-label"></p><button id="resume-button">继续未完成备份</button><button id="restart">重新开始</button><p>重新开始只移除救援工具自己的进度记录，不删除 Float 数据。</p></section>
<section id="selection"><h2>选择备份范围</h2><button id="preset-chat-media" disabled>聊天媒体紧急保护备份（仅两库）</button><p>仅保护聊天记录和聊天媒体缓存，不包括聊天设置、插件状态、KV 配置或其它 Float 数据。适用于 KV 预检异常时的定向救援。</p><button id="preset-remaining" disabled>其余非 KV 数据救援备份</button><p>部分备份：保护其它 IndexedDB 与 localStorage 数据，排除已备份的聊天两库及所有 KV 配置。不包括 API 配置、角色卡等仅存于 KV 的数据。</p><button id="preset-chat" disabled>迁移保护备份（聊天数据）</button><button id="preset-full" disabled>完整 Float 救援备份</button><p id="scope-detail">当前范围：按所选模块导出。</p><div id="modules"></div><button id="preflight" disabled>只读预检</button><pre id="inventory"></pre><button id="generate" disabled>生成分卷</button></section>
<p id="status" role="status" aria-live="polite">正在读取数据源清单…</p>
<section id="part" hidden><h2 id="part-title"></h2><pre id="part-detail"></pre><p id="oversized" hidden>此卷包含单个超大媒体文件，因此超过默认分卷大小。</p><button id="save-part">保存当前卷</button><button id="continue" disabled>我已保存，继续</button><p>系统分享成功后，仍请确认文件已保存到自己的位置，再点击继续。取消分享可以重新保存当前卷。</p></section>
<section id="index" hidden><h2>保存救援 set index</h2><pre id="index-detail"></pre><button id="save-index">保存 index 文件</button><p>生成完毕尚不代表已经获得备份。请保存 index 和所有 ZIP，再使用下面的验证器。</p></section>
<section><h2>验证已保存救援备份</h2><p>选择一个 index.json 和全部 part ZIP；文件不会上传。</p><input id="verify-files" type="file" multiple accept=".json,.zip"><button id="verify">验证已保存救援备份</button><p id="verification" role="status"></p><p>需要恢复时，可在 Float 数据管理中依次导入所有 part ZIP。完整恢复流程在实际需要时再提供辅助 UI。</p></section>
<section><h2>KV 主键只读诊断（独立运行）</h2><p>仅测试聊天设置 exact key 的主键/计数，以及聊天生成状态 prefix 的最多 8 个主键。不读取 value，不备份 KV，不影响其余非 KV 备份。每次测试使用独立只读事务，15 秒总超时。请分别测试并复制报告；超时不能说明 key 不存在或数据库为空。</p><button data-kv-method="getKey">测试 exact getKey</button><button data-kv-method="count">测试 exact count</button><button data-kv-method="getAllKeys">测试有界 getAllKeys</button><button data-kv-method="prefixCursor">测试有界 prefix cursor</button><p id="kv-status" role="status" aria-live="polite">尚未运行诊断。</p><button id="copy-kv-report">复制 KV 诊断报告</button><pre id="kv-report">仅记录方法、阶段、数量和耗时，不包含 key value、聊天正文或媒体。</pre></section>
</main></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
  });
}
