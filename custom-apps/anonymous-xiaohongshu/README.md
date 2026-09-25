# 匿名小红书 — Phase 1A

可导入包：`anonymous-xiaohongshu-1.1.0-alpha.1.zip`。目标为 **已应用 Phase 0.5 Capability Patch 的 Float 浏览器 Host**。未升级的线上 Host 无法运行这些新 API，仅导入 ZIP 不会自动安装 Host patch。

## 安装与使用

1. 在 Float 本地应用导入中选择 ZIP，确认新增的 scoped AI、持久任务、protected policy、来源记忆权限。
2. 首次进入只设置自己的匿名昵称、头像和简介。不读取 Float 全局用户资料。
3. 点击首页刷新／“生成小红书内容”。路人按原版块协议生成；每个可读取角色首次参与时自动生成并保存网名，之后浏览、评论、点赞并发帖。默认每次刷新让当前 characters.list 返回的角色各参与一次，会进行多次模型调用。
4. 发布按钮打开原版发布弹层；支持图片描述和最多 4 张真实配图。配图会压缩后进入支持视觉的绑定 API。请在 Float 中为角色配置有效 API 并启用图片识别；不支持视觉时明确报错，不偷偷改为纯文字。
5. 设置页可以事后修改角色网名。角色头像直接取角色卡；真实姓名只作为本地设置标签，头像不进入身份 DTO。
6. 身份揭露可在可选设置中按角色确认／撤销；此版不从普通聊天自动识别揭露。未确认时保持 unknown，不以旧记忆或语义相似恢复关系。

## 已实现

- Fork 原版双列 feed、图文卡片、多图详情组件、评论列表、发布弹层、原版 CSS、块解析器和互动 reducer。
- 动态路人 feed、角色自动账号与网名、角色浏览／发帖／评论、用户图文发帖、路人及角色反应、评论回复、点赞和收藏开关。
- 随机稳定 accountId、私有 ActorBinding、按 viewer 的 self/unknown/explicitly_disclosed 投影、改名历史。
- Host required policy、scoped multimodal、durable task 原子结果应用、按来源的当前 viewer 记忆投影。
- 帖子、媒体分集合存储，完整 App 历史不依赖 timeline；原型迁移保留 accountId 和旧集合。

## 重要边界

- 这是 alpha vertical slice，不是全量 parity。附近、完整视频、私信、通知、关注体系、收藏专页、复杂 @ 与分享页尚未开放。原 schema 保留这些方向。
- 关闭 iframe 后，**已经发给 Host 的请求**继续执行，原始结果持久化；重新进入后消费结果并接续队列。尚未提交的后续步骤要等再次打开。整个浏览器 Host 被关闭时，运行中的 HTTP 不承诺续跑；已完成结果和数据仍保留。
- 只允许静态角色设定和必要生成规则，加本 App 公开上下文／当前 viewer 的来源记忆。拒绝旧无来源记忆、全局用户资料、普通聊天、内置小红书和其他 App 上下文。不用字符串过滤器声称能安全恢复混合 RP 记忆。
- 静态角色卡内容本身由用户维护。如果卡片直接写入身份映射，它仍属于已授权静态设定；本 App 不承诺能语义分离任意卡片文本。
- 头像是你要求保留的 UI 展示。实际模型是否遵守不推断规则需要真实模型测试；程序可以验证 payload 的来源和字段边界，不能数学保证模型从不猜测。
- 原生长期记忆仍受 Host 保留数量与摘要规则限制，不是无限存储；App 私有帖子历史是权威数据。当前上下文取近期候选与来源记忆。
- 只支持一个活动 App 实例；未验收跨标签页同时编辑。
- 旧原型达到每集合 500 条 SDK 读取上限时停止自动迁移，避免静默截断；原数据不会删除。旧版自动推断的身份关系不迁入已确认状态，需按角色重新确认。
- 不包含独立微信云端／本地助手兼容工作。

## 开发与证据

```powershell
node scripts/build-anonymous-xiaohongshu.mjs
node scripts/test-anonymous-xhs-phase1a.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false -p custom-apps/anonymous-xiaohongshu/tsconfig.json
$env:HOST_CAPABILITY_PHASE='1a'
node scripts/anonymous-xhs-phase0/run.mjs
```

`src/` 是源码，`assets/app.js` / `app.css` 是构建产物。来源说明见 BASELINE.md，许可证 AGPL-3.0-only。旧 `test-anonymous-xiaohongshu.mjs` 只属于 1.0 原型，不是本版验收。

浏览器集成证据位于仓库 `scripts/anonymous-xhs-phase0/evidence-1a/`：真实生产 importer/runner/SDK/IndexedDB/HTTP transport，隔离的 Edge 测试资料，**本地确定性模型响应，不是真实模型推理**；包含安装包哈希、最终 provider payload、运行截图和原版 DOM 对照。
