# PWA 跨构建一致性修复（本地验证，尚未提交/部署）

日期：2026-10-01（Asia/Shanghai）。实现基线为 `6ba3a951ba31edd80602999663d83e6459c82ea4`；旧版迁移测试基线为 parent `2acdbc09467b62051697cd08179e2adb2965141b`。

实现仅位于独立 worktree：`C:\Users\Administrator.DESKTOP-068VNB6\.codex\worktrees\pwa-build-consistency\ai-virtual-phone`。

## 修改清单

| 文件 | 目的 |
|---|---|
| `public/sw.js` | SW 源模板；每 build 缓存、校验完整启动资源、保守交接和清理；旧 `/sw.js` 注册兼容入口 |
| `components/pwa-registrar.tsx` | 注册生成的 worker；等待现有启动界面已就绪；通过 MessageChannel 确认 build、页面就绪和其他存活客户端 |
| `app/layout.tsx` | HTML build 标识及不依赖 Next runtime 的核心资源失败恢复脚本 |
| `next.config.mjs` | 自动生成同一 build 内共享的 build ID，并将它写入生成的 worker 文件 |
| `scripts/finalize-pwa-build.mjs` | 将恢复脚本置于预渲染 HTML 的所有资源标签前；检查 worker 与 Next BUILD_ID 一致 |
| `package.json` | 正式 build 命令接入上述收尾步骤 |
| `.gitignore` | 排除构建生成的 `public/sw-versioned.js` |
| `scripts/test-pwa-worker.mjs` | 19 项 worker 生命周期、离线、推送、来电与快捷指令行为测试 |
| `scripts/test-pwa-upgrade.mjs` | 真实 Next production 页面、同源代理切换部署与核心 chunk 故障测试 |
| `docs/PWA-BUILD-CONSISTENCY.md` | 本报告、复现和回退说明 |

没有修改聊天、状态栏、主题、插件、语音音量、阅读 TTS 或数据库代码。构建工具自动改写的 tsconfig/next-env 与微信助手产物只在隔离 worktree 中还原，不纳入修改。主工作区没有执行写入、暂存、reset、clean 或 stash。

## 设计与缓存生命周期

1. 标识优先取显式 `NEXT_BUILD_ID` 或部署平台的 BUILD_ID/DEPLOY_ID 等；没有时自动生成时间与随机值组合。Next BUILD_ID、HTML meta、编译后的客户端常量和生成的 SW 内容共用同一值，不需手工改 v12 常量。重复指定相同 NEXT_BUILD_ID 表示有意复用同一构建标识，不能用于不同产物。
2. `public/sw.js` 是可维护源码，build 生成 `public/sw-versioned.js`。新注册使用稳定 `/sw-versioned.js`，但文件内容随 build 改变。旧 `/sw.js` 的注册仍能通过 importScripts 加载生成的实际 worker，避免把旧查询参数误当新版本 ID。注册设置 `updateViaCache: none`。
3. 缓存分为 `float-pwa-build-<id>-shell`、`...-assets` 和共用图片/字体缓存 `float-pwa-shared-v1`。同一 URL 的 hashed chunk 保留原有 URL，不进行跨路径替换。
4. 安装阶段先验证根 HTML meta 与 worker build 相同，再抓取全部 HTML 启动资源。404 或返回 HTML 的伪 chunk 会拒绝安装。最多四个响应并行流入 CacheStorage；全部完成后才发布离线根 HTML。失败不删除已有旧 build 缓存。
5. 导航优先取网络，使用 no-store。当前 worker遇到新 build HTML 时允许该完整网络页面启动，但不把它存入自己的离线 shell；离线仅使用该 worker 对应的已验证 shell，完全不查找任意 namespace 中的旧 static `/`。
6. `activate` 不 claim、不删除缓存。等待中的 worker 只在每个存活窗口都回答“相同新 build 且已就绪”之后，才允许 skipWaiting；未知、旧版、休眠或不响应窗口会阻止主动接管/清理。所有旧窗口关闭后也可按浏览器原生生命周期自然激活，此时安装阶段已经验证了启动资源。
7. 缓存清理必须由已成功启动的页面触发，并确认其他存活窗口同样就绪。保留当前与最近一个旧 build；只有更旧的应用缓存被删除。若有旧窗口未完成切换，暂缓整个清理步骤。用户数据库、LocalStorage、IndexedDB 和业务数据不在清理范围。
8. 核心 Next JS/CSS 加载失败或 ChunkLoadError 只允许本 tab、当前 build 自动恢复一次；以 sessionStorage 标记与 URL 参数双重保护。仅失效已识别的失败资源条目，重新导航完整页面，不卸载全部缓存。持续失败显示手动重试入口，不反复刷新；用户明确重试后资源可恢复。

恢复脚本必须早于失败的核心脚本执行。第一轮真实 404 测试发现 React/Next 会将 async 资源标签提前，普通 layout 内联监听器会错过很早的错误。最终 build 收尾步骤已修正这一点，7 个预渲染 HTML 均处理完成。不能跳过正式 build 的收尾步骤后直接部署半成品。

## 实际验证

- 独立 TypeScript：`npx tsc --noEmit --incremental false`，通过。没有依赖 production build 中原有的 ignoreBuildErrors 设置判断类型检查成功。
- 标准 `npm run build`：通过，含原有 CSS 收尾与新 PWA 收尾；HTML、Next BUILD_ID 和 worker ID 匹配。
- `node --check public/sw.js`、`git diff --check`：通过。
- Worker 行为测试：19 项通过，包括缺失 chunk 阻止安装、错 build 拒绝准备、未知窗口阻止接管、仅就绪后清理及原有通知行为。
- 真实 production 浏览器回归：23 项通过。浏览器为 Windows Edge/Chromium，402×874 移动视口，全新测试配置，不导入用户数据。

| 场景 | 结果 |
|---|---|
| A 页面保持打开，服务器切到 B | A 页面及 controller 保持 A；B waiting |
| A 存活时打开新 B 页 | B 页面正常启动；旧 A 阻止抢先接管和清理 |
| 两 build 缓存共存 | A/B shell meta 分别匹配各自 namespace；旧 A 的 layout chunk 仍可取回 |
| 最后一页 A 刷新到 B | B 就绪后安全激活；另一已就绪 B 页无自动刷新 |
| 清理 | 就绪前保留更旧 v12；全部就绪后清理 v12，保留 A+B |
| 离线刷新 | B HTML 与 B 启动资源恢复可用 |
| 真实 parent v12 → 修复版 B | 多窗口等待、切换和离线回退通过；不再使用 v12 static 根 HTML 作为 B fallback |
| 核心 main-app chunk 一次 404 | 首次加载失败；仅一次自动 reload 后启动成功，并能进入桌面 |
| 核心 chunk 持续 404 | 总计两次文档加载（初次+一次恢复），随后停止并显示手动重试 |
| 资源恢复后的手动重试 | 成功启动，新增一次由用户触发的文档加载 |
| 恢复标记的 sessionStorage 被拒绝 | URL guard 仍阻止循环 |

最终 browser 证据中，非故障注入阶段没有 pageerror、console error 或 HTTP 404；故障阶段的 404/ERR_ABORTED 均来自指定的 main-app chunk。没有捕获到 hydration mismatch。记录包含导航、worker 状态、缓存根 HTML 的 build 与资产列表、加载次数、网络请求和 14 张快照。

构建测试 A 使用 NEXT_BUILD_ID=pwa-test-a，B 使用 pwa-test-b（同一修复代码、不同部署产物）；这与真正的 parent 旧版迁移测试分开记录。没有将两份同代码构建冒称为原始两个提交的 A/B crash 诊断。

## 复现方法

1. 在隔离 parent worktree（2acdbc）执行 `npm ci`，设置 NEXT_PUBLIC_SELF_HOSTED_MODE=true 后 `npm run build`。
2. 修复 worktree 设置 NEXT_BUILD_ID=pwa-test-a、NEXT_DIST_DIR=.next-pwa-a、NEXT_PUBLIC_SELF_HOSTED_MODE=true，依次执行 `npx next build`、`node scripts/restore-backdrop-filter.mjs --dir .next-pwa-a/static/css`、`node scripts/finalize-pwa-build.mjs`，将 public/sw-versioned.js 复制到 .next-pwa-a/sw-versioned.js。
3. 设置 NEXT_BUILD_ID=pwa-test-b、NEXT_DIST_DIR=.next，执行标准 `npm run build`，将生成的 public/sw-versioned.js 复制到 .next/sw-versioned.js。副本仅供测试代理模拟两个真实部署，不提交。
4. 在修复 worktree 执行 `node scripts/test-pwa-worker.mjs`；再执行 `node scripts/test-pwa-upgrade.mjs <修复worktree绝对路径> <parent worktree绝对路径>`。测试自启本地 4330–4333 端口并结束后关闭；输出日志和截图到系统临时目录。

测试依赖本机 Playwright 与 Edge；不会操作线上域名、聊天数据或原有浏览器配置。

## 限制与待验收

- 尚未 commit、push 或部署；没有声称 Netlify 已发布。Netlify adapter/CDN 的真实更新路径及 iPhone Safari/PWA 仍需后续受控部署验证。
- 已验证核心启动脚本失败及根页面恢复。提前监听的严格顺序由预渲染 HTML 收尾保证；动态服务端页面不由该收尾脚本重排。本任务的 PWA 根入口是静态产物。
- Push/来电/shortcut 验证了保留的 worker 分发逻辑，不等于完成真实 APNs、后台唤醒或 iPhone Shortcuts 跨应用跳转验收。
- 使用的是无用户数据的真实 App；不证明用户所有插件组合和自定义状态栏内容均已真机回归。这里通过完整文档导航重新执行现有初始化，不修改这些系统。
- 悬停旧 tab 会延后 worker 接管和缓存回收；缓存可能暂时多于两代，这是保护旧客户端资源的保守选择。
- 保留已缓存旧 chunks 不等于保证旧页面尚未加载过的所有 lazy chunk 都永久可从已移除的旧部署取得；此类失败进入单次完整恢复。离线也只保证已验证的启动资源和已缓存资源，不保证未缓存在线功能。
- 未改变“6ba3a951 无直接 crash 因果证据”的结论；本补丁解决缓存一致性风险，不能作为 iOS 系统级内存杀进程已根治的证明。

## 回退与工作区保护

当前没有合入主工作区或部署，因此主工作区/线上不需要回退。保留隔离 worktree 供审查，停止使用该测试 worktree 即可。

未来若获准提交并上线，回退应以一个独立 PWA commit 为单位，恢复完整先前部署（HTML、chunks、SW 一起），联网重新打开 PWA。回退旧版也会恢复 v12 已知风险。必要时只处理该站点的 service worker 注册/应用 CacheStorage；不要清除网站全部数据，更不要删除 IndexedDB 或聊天记录。真实 Netlify 回滚链路尚未实施验证。

主工作区 tracked diff 的 Git hash-object 指纹在开始与结束复核均为 `a95c259db0c20125960a8a8838ba186cace3e08b`，HEAD 保持 6ba3a951。全部新增/修改写入仅在隔离 worktree 或测试产物目录。

生命周期参考：[Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)、[PWA updates](https://web.dev/learn/pwa/update)。采用所有旧客户端就绪后再主动切换，避免误以为省略 clients.claim 就足以保护旧标签页。
