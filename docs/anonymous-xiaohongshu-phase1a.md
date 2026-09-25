# Phase 1A — playable browser-host slice

交付：`custom-apps/anonymous-xiaohongshu/anonymous-xiaohongshu-1.1.0-alpha.1.zip`。

前提：Float 浏览器 Host 已应用 Phase 0.5 Capability Patch。ZIP 不会自行升级 Host。此次没有新增 Host 修改，没有修改内置小红书或普通账号数据。

## 安装

- 新安装：Float 应用市场的本地导入，选择 ZIP 并确认权限。
- 已安装 1.0 原型：先备份，使用 **创作 → 本地测试 → 换包** 原地替换，保留运行时 App ID 和私有数据；不要卸载后重装。普通“新导入”会遇到同名/主标签冲突。
- 首次使用只设置自己的匿名账号，然后刷新。角色读取已有卡片、自动生成固定网名，路人自动产生；设置中仅事后修改角色网名。
- 角色绑定 API 必须可用；带真实图片的请求需要开启该 API 的图片识别。

## 验证结果

| 项目 | 结果与证据 |
|---|---|
| 安装 | PASS：构建的 ZIP 经真实生产 importer 安装、CustomAppRunner iframe 执行；隔离 Edge 测试资料，不是用户的生产资料 |
| 用户账号 | PASS：界面创建 moth，独立稳定 accountId |
| 自动角色账号 | PASS：两个角色通过 AI 任务得到 nullsignal / burnttoast；无需角色初始化界面 |
| 角色头像 | PASS：管理页/卡片使用 characters.list 的角色卡头像，未进入模型身份上下文 |
| feed / 角色活动 | PASS：6 条路人笔记、2 条角色笔记，角色浏览评论和点赞 |
| 用户图文帖 | PASS：真实上传图片，路人和两个角色共 3 条反应、10 个赞；继续评论后共 7 条评论 |
| 改名 | PASS：nullsignal → deadchannel，accountId 不变，历史笔记仍引用同一实体 |
| 生命周期 | PASS：HTTP 开始后关闭 iframe，完成后重开，消费结果且不重复应用；完整 Host reload 后 9 篇帖子、19 个账号保留 |
| 最终 provider payload | PASS：11 个最终 HTTP 请求，6 个 multimodal；拒绝普通聊天/长期混合记忆/普通小红书哨兵和私有 owner 字段；当前角色人设保留，其他角色人设不混入 |
| source memory | PASS：当前两个 viewer 分别产生 9/10 条来源明确的投影；内容保留 accountId 和匿名作者 |
| 原版对照 | PASS（限定范围）：生产原版组件实际渲染，双列与卡片主体 DOM 相同；头像/图片来自不同存储 adapter，未宣称全页像素一致 |
| 真实模型匿名行为 | **未验收**：模型端是确定性 HTTP fixture，不是远程真实模型；需要使用者实测提示词遵循和人物表现 |

完整证据：`scripts/anonymous-xhs-phase0/evidence-1a/`。

- `installed-artifact.json`：实际安装 ZIP 的 SHA-256。
- `captures.json`：完整最终 provider HTTP payload，全部是合成测试数据。
- `results.json`：10 项浏览器检查通过，browserErrors 为空。
- `installed-feed.png`、`account-settings.png`、`post-detail.png`、`original-feed.png`。
- `dom-comparison.json`：原版/port DOM，原版默认头像 CSS class 是 adapter 差异，比较时明确剔除。
- `provenance.json`：被测 Host 模块版本散列；`state-fixture.json` 仅包含合成测试资料。

## 构建 / 回归

- App webpack 构建通过；JS/CSS 为构建产物。
- `node scripts/test-anonymous-xhs-phase1a.mjs`：27 项通过。包括 private/public 投影、viewer 隔离、撤销 revision、在途知识快照失效、改名、旧原型迁移、原版组件函数一致性。
- App 独立 typecheck 与仓库完整 `tsc --noEmit --incremental false` 通过。
- `next build --no-lint`：71 路由构建通过；已有 webpack 缓存警告，不影响构建。Next 配置跳过内置类型检查，另行执行了上述 tsc。
- SDK consistency 无错误，5 项已有提醒。
- Shopping share purchase：15 项通过；possessions：35 项通过。
- 内置 Xiaohongshu 源码相关路径无本阶段 diff。未提交或推送。

## 边界

这是 Phase 1A alpha，不是全部 parity 完成。附近、完整视频、私信、通知、关注体系、收藏专页、完整 @ / 分享仍暂缓。原版数据类型保留；帖子/媒体分集合，App 私有历史是权威数据，timeline 不承担无限存储。

关闭 iframe 后仅已提交 Host 的请求继续；后续队列在再次打开后接续。整个浏览器退出可能使运行任务失败，已完成未消费结果仍保留。多个标签页同时编辑未验收。

旧无来源记忆不进入 scoped 请求；静态角色卡是允许来源，不承诺能自动语义清洗卡片里用户自己写入的身份映射。真实模型也无法靠程序证明永不猜测。

身份揭露本版使用按 viewer/account 的人工确认；不会通过相似记忆自动恢复。撤销提高 source revision，并使相关 viewer 旧知识快照的在途结果无法应用。旧版自动推断关系不迁为明确揭露。旧集合读取达到 SDK 500 条上限时停止迁移，避免静默截断；原集合保留。

旧原型数据适配已做自动化单测；“1.0 真正生产数据换包升级”未使用用户资料实测。首次真实模型试用建议先备份。
