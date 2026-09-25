# 匿名小红书：原版 parity audit 与返工计划

审计日期：2026-09-25。阶段：审计，未开始返工，未生成 1.0.1。

Phase 0 实测更新：见 [能力验证报告](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/docs/anonymous-xiaohongshu-phase0.md)。已捕获真实 Host 最终 HTTP payload、运行真实 iframe/插件/IndexedDB。特别补充：timeline 写入不触发原生总结，但 ai.generate 经聊天引擎确实增加计数并可能触发原生总结；该总结请求没有匿名 guard。视觉隔离、全链路 guard 和关闭后提交仍有阻断，尚未进入正式 port。

基准：本地 Float 工作区 HEAD `da06721856e412777bec6f4db6427a74db100b34`。本次以本地现有内置实现为 reference，没有拉取远端，因此不宣称这是 GitHub 此刻最新版本。已检查主小红书源码无未提交差异；其他已有修改不在本次任务中处理。

结论：当前匿名版是“独立身份层 + 简化社交 UI/生成循环”，不是原版小红书 fork。应替换产品层，以原版 React、CSS、数据状态机、解析器和生成流程为基准；身份层拆分审查后复用。不能继续靠给当前手写 app.js 补按钮达到 parity。

本报告区分源码确认、可行方案和待验证的宿主能力。未进行真实浏览器像素比较、真实模型调用、实际安装/重启验收；不把静态审计当作这些验收的通过证明。

## 1. 完整相关文件清单与边界

以下清单覆盖主应用、直接共享依赖、昵称来源、AI/记忆链路及实际宿主集成。它不是要求把整个 Float 核心复制进 ZIP。查手机快照的独有群聊等功能也不应误算成主小红书功能。

### A. 原版主应用：直接移植基准

| 文件 | 作用 |
|---|---|
| [components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx) | 完整 React 页面、交互、状态机、生成编排、图片处理、分享、记忆触发 |
| [lib/xiaohongshu-engine.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-engine.ts) | 解析器、上下文格式化、九类生成入口、结果应用 |
| [lib/xiaohongshu-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-types.ts) | 完整 schema、路人生成提示词、默认设置 |
| [lib/xiaohongshu-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-storage.ts) | 规范化、profile、社交图谱、笔记/评论/通知工厂、持久化 |
| [lib/xiaohongshu-memory.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-memory.ts) | 按角色记录、删除小红书事件 |
| [lib/xiaohongshu-character-profile.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-character-profile.ts) | 角色站内昵称读取 |
| [styles/xiaohongshu.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/xiaohongshu.css) | 主 App 覆盖样式、多图、发布、设置、评论、私信 |
| [styles/checkphone.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/checkphone.css) | cp-xhs 基础布局，以及通用导航、双语、错误弹窗、末尾覆盖规则 |
| [components/checkphone/checkphone-bilingual-text.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/checkphone/checkphone-bilingual-text.tsx) | 双语文本展示与折叠 |
| [components/checkphone/checkphone-debug-error-card.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/checkphone/checkphone-debug-error-card.tsx) | 原始输出和解析错误展示 |
| [components/ui/form.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/ui/form.tsx) | Toggle 等共享控件 |
| [lib/bilingual-text.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/bilingual-text.ts) | 双语解析 |
| [lib/bilingual-prompt-defaults.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/bilingual-prompt-defaults.ts) | 双语生成指令 |
| [styles/base.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/base.css) | 全局基础样式依赖 |
| [styles/components.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/components.css) | 表单、Toggle、modal 等基础样式 |
| [styles/tokens.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/tokens.css) | 设计变量 |
| [styles/phone-shell.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/phone-shell.css) | 宿主屏幕布局、安全区变量的环境依赖 |
| [app/globals.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/app/globals.css) | CSS 加载顺序 |
| [public/xiaohongshu/avatars/default-01.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-01.png) | 路人默认头像；角色有真实头像时不使用它代替 |
| [public/xiaohongshu/avatars/default-02.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-02.png) | 路人默认头像；角色有真实头像时不使用它代替 |
| [public/xiaohongshu/avatars/default-03.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-03.png) | 路人默认头像；角色有真实头像时不使用它代替 |
| [public/xiaohongshu/avatars/default-04.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-04.png) | 路人默认头像；角色有真实头像时不使用它代替 |
| [public/xiaohongshu/avatars/default-05.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-05.png) | 路人默认头像；角色有真实头像时不使用它代替 |
| [public/xiaohongshu/avatars/default-06.png](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/public/xiaohongshu/avatars/default-06.png) | 路人默认头像；角色有真实头像时不使用它代替 |

### B. 原版身份、昵称、AI、记忆依赖：只能按边界适配

| 文件 | 作用 |
|---|---|
| [lib/character-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/character-types.ts) | Character schema |
| [lib/character-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/character-storage.ts) | loadCharacters 与头像来源 |
| [lib/settings-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/settings-storage.ts) | API、预设、世界书、正则绑定与 user identity |
| [lib/settings-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/settings-types.ts) | 应用绑定类型 |
| [lib/checkphone-engine.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/checkphone-engine.ts) | 查手机小红书生成、[昵称] 解析与 profile 规范化 |
| [lib/checkphone-config.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/checkphone-config.ts) | 查手机小红书 payload schema |
| [lib/checkphone-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/checkphone-storage.ts) | 角色查手机 snapshot 的缓存与数据库 |
| [components/checkphone/checkphone-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/checkphone/checkphone-app.tsx) | 查手机生成与缓存入口 |
| [components/checkphone/checkphone-xiaohongshu-page.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/checkphone/checkphone-xiaohongshu-page.tsx) | 另一套“查手机快照”页面；不是本次主 App 的替代基准 |
| [lib/checkphone-settings.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/checkphone-settings.ts) | 共享双语组件默认设置依赖，匿名版应换成自身设置 |
| [lib/builtin-preset.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/builtin-preset.ts) | 四类角色任务和查手机小红书提示词 |
| [lib/content-tag-utils.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/content-tag-utils.ts) | 小红书 activity/reaction/comment/mention 标签 |
| [lib/macro-engine.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/macro-engine.ts) | 五个小红书上下文宏 |
| [lib/llm-prompt-assembler.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/llm-prompt-assembler.ts) | 原版上下文和聊天分享渲染 |
| [lib/chat-engine.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-engine.ts) | 模型请求、角色生成、插件请求钩子 |
| [lib/llm-provider-adapter.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/llm-provider-adapter.ts) | 文本/视觉 provider 适配 |
| [lib/short-term-assembler.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/short-term-assembler.ts) | 小红书事件与 Custom App timeline 注入 |
| [lib/memory-service.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/memory-service.ts) | 角色记忆检索 |
| [lib/memory-injector.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/memory-injector.ts) | 核心/长期记忆格式化 |
| [lib/memory-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/memory-storage.ts) | 记忆配置与计数 |
| [lib/memory-summarizer.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/memory-summarizer.ts) | 原生长期记忆总结触发 |
| [lib/memory-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/memory-types.ts) | 记忆来源设置 |
| [lib/prompt-time.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/prompt-time.ts) | 事件时间格式处理 |
| [lib/chat-asset-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-asset-storage.ts) | 原版图片数据库 |
| [lib/kv-db.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/kv-db.ts) | 原版和 Custom App 底层持久化基础设施 |

### C. 原版宿主集成：不能误以为复制主 TSX 就自动继承

| 文件 | 作用 |
|---|---|
| [components/desktop-shell.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/desktop-shell.tsx) | 入口、关闭时忙碌保活、跨 App 打开 |
| [lib/desktop-config.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/desktop-config.ts) | 桌面配置 |
| [components/icon-glyph.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/icon-glyph.tsx) | 内置图标 |
| [lib/ui-accent-colors.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/ui-accent-colors.ts) | 应用强调色 |
| [lib/chat-share.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-share.ts) | xiaohongshu_note 分享载荷 |
| [components/chat/phone-chat-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/chat/phone-chat-app.tsx) | 原生分享落入聊天室 |
| [components/chat/message-bubble.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/chat/message-bubble.tsx) | 原生分享卡片 |
| [lib/chat-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-storage.ts) | 分享消息 schema 与历史 |
| [styles/chat.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/chat.css) | 分享卡片相关样式 |
| [components/debug-prompt-panel.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/debug-prompt-panel.tsx) | 四种小红书任务 prompt 预览 |
| [components/debug-prompt-registry.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/debug-prompt-registry.ts) | 调试入口注册 |
| [components/memory/memory-timeline.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/memory/memory-timeline.tsx) | 事件展示 |
| [components/memory/memory-bank-page.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/memory/memory-bank-page.tsx) | 记忆来源选项 |
| [lib/data-management/modules.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/data-management/modules.ts) | 社交数据备份/导入/清理注册 |
| [components/settings/data-management.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/settings/data-management.tsx) | 数据管理入口 |
| [lib/media-maintenance.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/media-maintenance.ts) | 原版图片压缩与清理 |
| [lib/storage-space.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/storage-space.ts) | 图片空间统计与清理 |

### D. Custom App 迁移边界

| 文件 | 作用 |
|---|---|
| [components/app-market/custom-app-runner.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/app-market/custom-app-runner.tsx) | iframe、SDK、权限、characters.list、db/media |
| [lib/custom-app-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-storage.ts) | ZIP 导入、runtime appId、独立集合、timeline |
| [lib/custom-app-host-api.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-host-api.ts) | ai.chat / ai.generate / memory / world / calendar / chat card |
| [lib/custom-app-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-types.ts) | manifest、prompt profiles、extension 定义 |
| [lib/custom-app-registration.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-registration.ts) | 资源和预设注册 |
| [lib/custom-app-tags.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-tags.ts) | 资源标签合并 |
| [lib/custom-app-tag-profiles.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-tag-profiles.ts) | 自定义标签 |
| [lib/custom-app-sdk-registry.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-sdk-registry.ts) | SDK 扩展注册 |
| [lib/custom-app-tool-runtime.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-tool-runtime.ts) | 工具执行 |
| [lib/custom-app-chat-directives.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-chat-directives.ts) | 自定义聊天卡片/指令 |
| [lib/custom-app-package.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-package.ts) | 打包相关辅助 |
| [lib/custom-app-creator-guide.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-creator-guide.ts) | SDK 使用说明；结论以实现为准 |
| [lib/chat-plugin-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-plugin-types.ts) | 可选伴随插件 prompt.system / llm.request 契约 |
| [lib/chat-plugin-runtime.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-plugin-runtime.ts) | 插件运行时 |
| [lib/chat-plugin-hooks.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-plugin-hooks.ts) | 插件钩子执行 |
| [LICENSE](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/LICENSE) | 复制源码时保留原仓库许可证及来源 |

其他全文检索命中但不是主小红书产品实现的文件：

- [app/verify/page.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/app/verify/page.tsx)
- [app/api/verify/submit/route.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/app/api/verify/submit/route.ts)
- [components/chat/chat-room.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/chat/chat-room.tsx)
- [components/chat/chat-settings-panel.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/chat/chat-settings-panel.tsx)
- [components/reading/reading-viewer.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/reading/reading-viewer.tsx)
- [lib/css-examples.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/css-examples.ts)
- [lib/internal-capability-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/internal-capability-storage.ts)
- [lib/mascot-prompts.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/mascot-prompts.ts)
- [lib/mascot-tools.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/mascot-tools.ts)
- [lib/weixin-bridge.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/weixin-bridge.ts)
- [styles/reality-bridge.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/styles/reality-bridge.css)

这些文件包含名称、说明、标签、通用工具或外围集成引用；不因为命中“小红书”就把整个文件纳入 port。

当前匿名版审计对象：

- [custom-apps/anonymous-xiaohongshu/manifest.json](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/manifest.json)
- [custom-apps/anonymous-xiaohongshu/presets.json](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/presets.json)
- [custom-apps/anonymous-xiaohongshu/index.html](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/index.html)
- [custom-apps/anonymous-xiaohongshu/assets/app.js](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/assets/app.js)
- [custom-apps/anonymous-xiaohongshu/assets/app.css](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/assets/app.css)
- [custom-apps/anonymous-xiaohongshu/README.md](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/README.md)
- [custom-apps/anonymous-xiaohongshu/icon.svg](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/icon.svg)
- 同目录六张默认头像和现有 1.0.0 ZIP。
- [scripts/build-anonymous-xiaohongshu.mjs](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/build-anonymous-xiaohongshu.mjs)
- [scripts/test-anonymous-xiaohongshu.mjs](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/test-anonymous-xiaohongshu.mjs)

## 2. 当前匿名版缺失的 UI、行为与 AI 功能

### UI parity

| 项目 | 原版已实现 | 当前匿名版 |
|---|---|---|
| 页面结构 | 首页、附近、发布、消息、我的五入口 | 首页、发布、账号三入口，产品结构不同 |
| 首页 | 关注/发现/视频切换，原版两列卡片 | 发现/我的，CSS columns，卡片重写且额外突出 accountId |
| 附近 | 独立 nearby feed，按 profile 属地生成 | 无 |
| 视频 | 模拟视频笔记、全屏详情、上下滑/滚轮切换、文案展开、评论抽屉 | 无 |
| 图文详情 | 全页详情、作者关注、分享、底部互动栏 | 简化底部弹窗 |
| 图片 | 多图上传、删除单图、清空、多图标记、详情轮播与指示点、尺寸处理 | 单图，无原版压缩/裁剪、轮播 |
| 文字配图 | 手动描述图片、描述封面、角色配图描述 | 无对应发布模式 |
| 评论 | 二级平铺楼中楼、回复目标、@已关注角色、表情、点赞/点踩、删除整条分支、更多评论 | 普通评论列表和输入框；无回复目标或自动接话 |
| 点赞/收藏 | 帖子赞藏、角色赞藏、数量与最近昵称 | 仅基本点赞；保存字段不等于已有收藏功能 |
| 关注/粉丝 | 作者关注、关注流、角色/路人关注用户、计数 | 无 |
| 消息 | 赞藏/关注/评论分类、已读/未读、计数、跳转 | 无 |
| 私信 | 线程、历史、发送、表情、单独生成回复 | 无 |
| 个人主页 | 封面、昵称/号/属地/签名/性别、关注/粉丝/赞藏、笔记/评论/收藏/赞过 | “我的”过滤列表 + 管理表单，不是原版 profile |
| 设置 | 参与角色、发帖互动概率、双语/折叠、七类 prompt 编辑与恢复默认 | 手工账号初始化器 |
| 交互状态 | 分阶段生成提示、错误原文与解析原因、确认删除/刷新/清空、滚动恢复 | 全屏忙碌遮罩、简化提示，生成错误多为 console.warn |
| 生命周期 | 关闭忙碌的主 App 后保活，完成后更新 | 没有等价实现 |
| 样式 | cp-xhs 基础 CSS + xhs 覆盖 CSS + 共用控件 | 自写 app.css，未复用原布局 |

证据：[components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx:115)、[components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx:409)、[components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx:1828)、[custom-apps/anonymous-xiaohongshu/index.html](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu/index.html)。

不能虚构原版能力：主 App 的搜索图标、主页“创作灵感/创作大赛/浏览记录”等部分仅为展示，无完整搜索/对应工具实现；视频也是描述/封面的模拟视频，不是真实视频上传播放。这些保留原貌即可，不扩建新产品。

### 行为 parity

原版刷新流程：

1. 路人生成首页 6 条、视频 6 条、附近 4 条（这是 prompt 要求及解析上限，不保证模型每次足量）。
2. 加到现有 notes，保留旧内容。
3. 依次调用已选参与角色，给最近最多 30 条候选笔记。
4. 每个角色可评论最多 3 条，并同时生成 1 篇自己的图文或视频，附路人评论与赞藏数据。
5. 应用通知及角色事件，触发原生总结检查。

当前匿名版：每个手动启用角色只能在 post/comment/none 中选一个；随后最多选一个手工 NPC 生成动作。没有原版内容流批次、同时发帖和多条评论、附近、视频、社交数据和线程延伸。

原版用户发布：先落库，再路人互动（赞藏、评论、关注、私信），再按配置概率调用角色。默认概率 60%。匿名版则遍历全部手动启用角色，缺少概率和原版路人互动批次。

原版用户评论：自动判断 @ 目标、被回复角色或帖子作者，生成角色回复；非 @ 路径还接路人回复。匿名版只保存用户评论，不自动执行这一接话链。

原版刷新不是后台无限自动发帖：页面有“生成内容/刷新”触发；发布和评论再触发相应生成。返工保留这些触发时机，不擅自添加定时、常驻运营或打开即无限消费 API。

原版清空 feed 是隐藏当前推荐/附近/视频，保留消息、个人主页及互动；删除帖子/评论则同步清理相应短期事件。匿名版没有这组完整语义。

### AI parity

原版需要保留的九条生成路径：

- 路人 feed；
- 路人对新帖反应；
- 角色浏览互动 + 发帖；
- 角色对新帖反应；
- 路人评论回复；
- 加载更多路人评论；
- 路人私信回复；
- 角色回复评论；
- 角色 @ 回复。

当前只有“角色单动作”“固定 NPC 单动作”两套 JSON prompt。原版的块格式解析、生活化规则、双语、3–8 条评论样例、延伸楼中楼、赞藏/关注判断和私信格式没有完整迁移。

原版角色引擎还组装：角色设定、绑定预设/世界书/正则、核心/长期/短期记忆、场景宏、双语指令；反应/回复可带真实帖子配图并在不支持视觉时降级。当前 ai.chat 只带被按行删减的 persona/personality、自建 feed 和少量 App 印象，图片仅为 hasImage。隔离不能成为悄悄丢掉角色经历和原版生成能力的理由。

## 3. 可以直接 port 的原版代码

“直接 port”是复制源码到独立 App 的构建输入，不修改原文件，不在 iframe 运行时穿透宿主模块。

- 完整 JSX 页面树、组件结构和大部分交互 handler：NoteCard、NoteImage、NoteDetailSlider、CommentList、主页/附近/视频/消息/私信/profile/发布/设置/确认弹窗。
- 瀑布流排序、数字/时间显示、二级评论展平、删除分支、图片裁剪压缩、视频手势、滚动恢复。
- 原版样式：先抽取 checkphone.css 的 cp-xhs 及共用依赖和末尾覆盖，再加载 xiaohongshu.css；不能只复制后者。保留字体缩放、安全区、移动端布局及图标组件。
- 原版业务 schema：notes、comments、notifications、socialGraph、userInteractions、draft images、settings 的功能字段。
- 块解析、指标解析、线程引用修复和 apply* 结果应用的主体算法。
- 原版任务 prompt 的产品规则、内容风格、输出结构、双语格式。

不能原样复制的身份内容：

- source/authorType=user|character|npc、真实 authorId/name；
- 含 character.id 的 noteId；
- “用户的小红书账号”“关注即知道现实身份”和相似性推理指令；
- 把真实人物名单塞进路人 prompt 的 reservedNames；
- 以昵称判断角色本人、按昵称去重赞藏/私信线程的身份关键逻辑。

这些只在 fork 中通过身份投影和稳定 accountId 替换。不是把整套发帖引擎换掉。

## 4. Custom App 必须适配的地方与宿主边界

| 边界 | App 内处理方案 | 当前能否等价 |
|---|---|---|
| React/模块依赖 | 从原源码建立独立构建，bundle React/图标/共享组件；index.html 只挂载 | 可行 |
| 同步 kvGet/kvSet | 启动先异步 hydrate；App 内保持状态快照，串行保存至 SDK db | 可行，需崩溃/并发测试 |
| 图片 | 原版处理算法保留，存取换 media.put/get，资源路径用 getAssetUrl | UI 可行 |
| 角色与头像 | characters.list/get，真实映射仅留私有控制/UI 层 | 可行 |
| 原版身份/昵称 | 独立 App profile + 自动账号服务 | 可行 |
| 内置宏/预设 | 复制四类任务，改匿名宏并由 App builder 明确展开 | 可行，不复用普通小红书数据 |
| 原版 memory 函数 | SDK timeline 写入，summary 本身带 accountId/昵称 | 可行，但非原生总结等价 |
| 发到普通聊天 | SDK chat.sendCard + 明确选择收件角色 + 安全 historyText | 可做功能适配，不是原生分享卡片完全等价 |
| 忙碌关闭/后台完成 | 需验证 iframe 生命周期及后台执行机制 | 未证实等价，不能直接照搬 window event |
| 全局图片维护 | Custom App 媒体归 App；不能复用原版状态 key 或原版图片清理 handler | 需自己的媒体生命周期适配 |

### 4.1 AI 隔离与视觉：真正未闭合的边界

[lib/custom-app-host-api.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-host-api.ts:1311) 的 ai.chat 会把 content 强制 String 化，不能直接承接原版 image_url 内容数组。

但 SDK 并非完全不支持图片：[lib/custom-app-host-api.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/custom-app-host-api.ts:538) 的 ai.generate 支持 App 消息携带 image/imageDataUrl（每次最多 4 张、单张 data URL 长度上限 2,000,000）。问题是它同时走原生完整上下文组装，会包含当前角色其他来源的记忆，可能把普通小红书 kk=Chloe 带进匿名任务。

promptProfile 的 history:none 只去掉 App 提供的历史，并不等于屏蔽全局近期事件。直接移除 shortTermMemory 标记又会把包含本次任务的历史一起移除。现有接口不是“保留本次任务/图片，但按来源和实体投影角色其他上下文”的接口。

因此不能宣称“换成 ai.generate 就同时恢复全部 parity 和隔离”，也不能继续用纯文本 ai.chat 冒充原版视觉能力。

已存在替代候选：聊天插件的 prompt.system、llm.request 可修改请求，见 [lib/chat-plugin-types.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/chat-plugin-types.ts:64)。伴随插件可能补最终请求投影与跨预设保护，不必先修改核心；但它是额外安装物，不是 Custom App ZIP 自带的能力，且其来源识别、覆盖通道和失败行为需验证。

如最终仍需核心能力，最小候选是：

1. 在 ai.chat 通道增加受校验的文本/图像内容支持（host API + SDK契约/说明）；
2. 或给 ai.generate 增加保留任务/媒体、按来源筛选上下文并返回可投影结构的接口（host API、chat-engine、short-term/prompt assembler）。
目前均未实施。纯导入版不能等价完成的部分应停在能力验证阶段，先报告差异，不能先改核心再解释。

### 4.2 记忆与全局保护的实际限制

- timeline 的 summary 会进入后续上下文；data 中的 accountId 不会自动替代 summary。所以必须两处都保存，不可只留 metadata。
- Custom App timeline 当前每个 App 合计最多 500 条，而不是每个角色 500 条；不能把它当无限长期账本。
- 原版有 incrementEventCounter + maybeRunSummarization；Custom App timeline 写入没有等价触发。App 私有账号历史应为权威记录，timeline 只作投影；普通聊天长期召回还需验证 memory.add/账号检索工具等路径，不能保证一个月之后仅凭近期锚点就完整记住。
- memory.search 实际只按当前 characterId 搜核心/长期记忆中的字符串，不搜索刚发生但尚未总结的聊天或所有 timeline；“刚说 moth is me 就立刻自动识别”当前并未保证。
- 当前 presets.json 的无标签规则被安装到内置预设（或首个预设），不是自动注入每个自定义预设。forbid_overrides 不等于覆盖所有生成器。应把“注册全局条目”与“全链路覆盖已验收”分开。
- Custom App 的事件/工具扩展不等于同步的最终请求变换 hook。若要任意预设下都可靠生效，需先验证伴随插件，或另行批准最小宿主扩展。

### 4.3 分享边界

原版 dispatch open-mini-chat，并生成 xiaohongshu_note_share；iframe 内 dispatch 不会直接到达宿主。SDK sendCard 写的是 app_card。可以用自定义卡片保留分享用途、来源和作者 accountId，但原生卡片样式/选择器不能标为已等价。

分享者身份与帖主身份必须分开：普通聊天可以知道“当前对话者分享了这条帖子”，但不能据此知道“当前对话者就是帖主”。分享的作者、评论、预览、historyText 都必须携带匿名来源，不使用普通小红书来源标签。

## 5. Character 真实头像的读取路径

原版：
loadCharacters() → Character.avatar → characterAvatarMap(character.id) → resolveAuthorAvatar → XhsAvatar 的 img.src。

源码：[lib/character-storage.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/character-storage.ts:31)、[components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx:903)、[components/xiaohongshu/xiaohongshu-app.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/xiaohongshu/xiaohongshu-app.tsx:955)。

Custom App：
characters.list() 已返回 id/name/avatar/persona/personality，见 [components/app-market/custom-app-runner.tsx](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/components/app-market/custom-app-runner.tsx:1615)。avatar 是可显示的 data URL 或 http(s) URL；角色存储会剔除其他无效形式。

当前匿名版 reloadState 把返回值裁剪成 id/name，主动丢弃 avatar；avatarUrl 又强制默认头像。这是当前匿名版自己的限制，不是 SDK 限制。

返工：

- 私有 UI resolver 按 binding 取角色卡 avatar；缺失时才回退原版默认头像。
- AI DTO 不包含头像 URL/data URL/真实角色 ID，不把 UI 截图当模型输入。
- 帖子配图与角色头像分开建模；恢复帖子视觉输入不意味着把角色头像也发送。
- 人类匿名账号头像独立上传，不继承 Float 全局用户头像。
- 六张默认头像继续用于路人和缺省情况，不再强制角色使用。

## 6. 原版 Character 网名逻辑与修正方案

主 App 并无独立“首次自动创建小红书网名”的生成函数。

[lib/xiaohongshu-character-profile.ts](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/lib/xiaohongshu-character-profile.ts:5)：
readPhoneSnapshotCache(character.id, "xiaohongshu") → snapshot.payload.profile.name.trim() → 缺失则 character.name。

昵称生成实际在查手机小红书任务中：模型输出 [昵称]，checkphone-engine 解析为 profile.name，保存 snapshot；主 App 只读缓存。snapshot 刷新会携带先前摘要要求连续性，但并不等于独立的、不可变 accountId 账号服务。

匿名版不能读取原版 snapshot 来共享社交身份，也不能回退真实姓名。需要一个很小的独立账号适配：

1. 某角色第一次被原版参与流程实际调用时，查私有 binding。
2. 无 binding 时生成随机稳定 accountId；并发调用只允许创建一次。
3. 根据该角色自身设定自动生成站内昵称，沿用原版的网络昵称/生活化风格，但不调用会生成整份查手机快照的流程。
4. 私有校验昵称不是已知真实名、普通账号或已有账号冲突；无效自动重试。失败显示可重试生成错误，不强制用户起名，不回退真实姓名。
5. 保存昵称/binding，再正常参与原版任务；后续不自动重起。
6. 管理页只显示已经创建过的 Character 账号及“编辑昵称”。改名保留 accountId 和 alias history。

需要明确的一项启动差异：原版 participantCharacterIds 默认空，确实要选参与角色。按这次“只设自己的账号即可使用”目标，建议匿名版默认把现有有效角色纳入候选，首次实际参与时才创建账号；保留原版参与范围设置作为可选控制，不再成为初始化门槛。仍只在原版生成触发时调用模型，不在启动时为所有角色批量生成内容。

## 7. 原版普通网友/背景账号逻辑

原版没有 NPC 管理后台。

- 模型批量生成帖主、评论者、延伸回复、点赞/收藏昵称、关注者和私信对象。
- 路人 feed 使用全局 API；角色任务也可在自身评论下面生成路人延伸互动。
- 已关注路人的昵称可进入后续 feed prompt，提高再次出现概率；评论接话和私信通过已有上下文维持关系。
- makeXiaohongshuNpcId(name) 对清洗后昵称做 hash；UI 用昵称/ID seed 自动挑六张默认头像。
- 原版部分 apply 路径仍写 authorId:"npc"，通知/DM 也有以名字作关联键的情况，因此不能把原版所有 authorId 不加检查地当作唯一实体。

匿名版保持生成方式与可见行为，只在解析入库时自动分配/复用轻量 accountId；同一已有线程或明确账号引用延续原 ID。新生成昵称不自动与 Character binding 匹配；与私有真实名冲突的候选在本地处理，不能把完整真实人物名单送给模型。

这个轻量身份索引是程序细节，不建立需用户维护的 NPC 人设/开关/头像表，不在账号设置展示背景网友。已有帖文和评论的账号 ID 留存，不能统一变成“某匿名用户”；同名冲突也不能合并到已知角色。

## 8. 当前匿名版保留哪些代码/设计

保留的是经过修正的身份设施，不是当前页面：

- opaque accountId、帖子/评论通过 accountId 关联；
- SocialAccount 与 ActorBinding 的私有/公开分层；
- viewerCharacterId + accountId 作用域；
- self / unknown / explicitly_disclosed 状态模型；
- renameAccount 的稳定 ID、别名历史思想；
- summary 中同时携带 [匿名小红书]、accountId、displayName；
- 独立 SDK 集合/媒体存储；
- 来源严格限定、无 owner 映射的身份保护规则；
- 按角色人工确认揭露，作为辅助设置；
- ZIP manifest/资源框架和可复现打包方式。

safePerspective 不能直接视为已经通过安全审查：它包含 viewerCharacterId，虽然当前未把此对象整体发送，今后必须分成内部视图与真正可序列化的模型 DTO。最终 payload 必须从白名单 DTO 构造，不能检查一个安全对象后又使用原始 state 拼 prompt。

需要同步纠正的身份实现缺陷：

1. strictDisclosureMatch 缺说话者、引用、来源证据校验。本次只读测试输入 “Soap quoted a sentence: moth is me” 返回 true，错误建立 human 身份关系。返工保留原始证据 ID/明确主客体，无法排除引用、假设和歧义时保持 unknown。
2. identityLeakReason 无条件拦真实姓名，没有 viewer/disclosure 参数。本次对 “Krueger posted this” 返回 real-name，无法表达已揭露后正常关联。应按当前 viewer 与传播受众检查；当前角色知道不等于获准向所有人公开。
3. recordSocialEvent 向所有启用角色写记忆，即使角色尚未看到该内容；应依据原版实际浏览候选/互动范围给对应 viewer 记录，不制造全知。
4. 当前 sanitizer 按包含名字删除整行，可能删掉正常角色经历，且无法证明自由文本绝无关系泄漏；不是完整上下文投影替代品。
5. 当前模型 feed 24 条、recentFacts 12 条/提示词 8 条不是长期召回保证。
6. unknown 撤销后下一次 memory.search 可能再次自动建立关系；需要人工覆盖状态/证据失效策略。
7. XML 字符串直接插值显示名和内容，需安全编码/结构化内容边界，并测试用户文字不能伪造身份状态。
8. “零身份推测”不能由有限正则或 prompt 获得数学保证；要分别验证数据不泄漏与模型行为，并对失败输出拒绝/重试。

## 9. 当前匿名版删除/重写范围

- 重写 index.html 的自制页面，改成原版 React 挂载入口。
- 替换 app.css 的自制卡片、导航、详情弹窗和管理台布局，使用原版样式。
- 替换 app.js 的 renderFeed/renderDetail/compose/导航/评论产品层。
- 删除手工 NPC 新建/停用 UI、npcDrafts、手工账号运营流程。
- 删除所有 Character 必填昵称/默认头像/启用账号的初始化 gate。
- 删除“固定 NPC 每轮随机一人”和“每个角色只能 post/comment 二选一”的生成设计。
- 原版 generate*/apply*、发布/刷新/回复阶段恢复；换掉当前简化 action schema。
- presets.json 的简化 JSON 动作指令替换成原版任务协议；保留并校正来源限定 guard。
- 当前默认头像强制限制及“不读取 character.avatar”的旧测试删除，改为“UI 真实头像、AI 不含头像”。
- 不删除现有用户数据、ZIP 或帖子作为返工前提。旧匿名数据需要独立迁移；旧手动 Character 昵称视为用户覆盖保留，旧 NPC 帖子/ID保留但从管理页隐藏。

## 10. 修正后的文件修改计划与验收顺序

所有实现改动限定在独立 App、构建脚本、测试和文档。原版小红书文件与 Float 核心只读。

建议源码结构（均位于 [custom-apps/anonymous-xiaohongshu](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/custom-apps/anonymous-xiaohongshu)，以下为待新增模块名）：

| 模块 | 来源/职责 |
|---|---|
| src/main.tsx | React 启动、SDK hydrate |
| src/xiaohongshu-app.tsx | 原版主 TSX fork，保留页面与 handler |
| src/xiaohongshu-engine.ts | 原版生成编排/解析/apply fork；依赖 adapters |
| src/xiaohongshu-types.ts | 原版功能 schema + social-account 引用 |
| src/xiaohongshu-storage.ts | 原版规范化 + 独立持久化适配 |
| src/xiaohongshu-memory.ts | 原版事件时机 + 逐 viewer 匿名事件投影 |
| src/shared/ | 原版双语、错误卡、Toggle 等必要共享代码 |
| src/identity/accounts.ts | 自动 Character binding、昵称生成、轻量路人索引、用户账号 |
| src/identity/projection.ts | UI 投影与 AI 投影严格分离 |
| src/identity/disclosure.ts | viewer/account 状态、证据、人工确认 |
| src/identity/guard.ts | 来源限定规则、按受众的输出验证 |
| src/identity/rename.ts | accountId 连续性和已知账号改名通知 |
| src/adapters/float.ts | characters、App生命周期、toast 等宿主接口 |
| src/adapters/ai.ts | 九类任务的发送边界；未闭合能力显式阻断 |
| src/adapters/storage.ts | hydrate、顺序写入、索引/分块、旧匿名数据迁移 |
| src/adapters/media.ts | 多图和头像 UI 引用，独立媒体存取 |
| src/adapters/memory.ts | timeline、长期记忆/检索衔接、删除投影 |
| src/adapters/share.ts | 明确来源的跨聊天分享适配 |
| src/styles/ | 原版样式摘取、加载顺序、安全区环境适配、少量账号编辑样式 |
| assets/app.js + assets/app.css | 后续生成的构建产物，不再手工维护产品逻辑 |
| manifest.json / presets.json / index.html | 资源清单、最小权限、原版任务协议与入口 |
| README.md / 源码来源记录 | 安装、升级、已知差异、baseline SHA、原许可证和来源 |
| 独立 parity / identity / integration 测试 | 见下 |

构建/测试脚本：

- [scripts/build-anonymous-xiaohongshu.mjs](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/build-anonymous-xiaohongshu.mjs)：从简单“目录打 ZIP”调整为编译 fork 后收集白名单产物，防止误带临时文件。
- [scripts/test-anonymous-xiaohongshu.mjs](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/test-anonymous-xiaohongshu.mjs)：保留身份单测思想，删除过时要求，不能继续把 67 项辅助检查描述成全验收。
- 新增原版输出 fixture 的 parser/apply 对照测试、SDK mock 集成、浏览器 DOM/截图测试、最终 payload 捕获和升级/重启测试。

实施顺序：

1. 固定 baseline、原版功能表、prompt fixture、样式依赖；记录每一处有意身份差异。
2. 先验证 AI 上下文过滤/视觉、跨预设 guard、分享和忙碌关闭能力。无法纯导入等价完成的部分先停，不改核心。
3. 从原版 port 页面、CSS、状态及完整流程，建立等价测试；不以现有自制 UI 为 baseline。
4. 接入自动账号、Character真实头像 UI、稳定路人引用、独立用户 profile。
5. 接入逐 viewer context/memory/disclosure；校正误揭露、全知广播、已揭露仍被阻断的问题。
6. 迁移旧匿名数据并验证原版 key 完全未变。SDK db.list 最多 500 条且无分页，需用 App 自己的索引/分块和 db.get 读取，不能重启后只恢复前 500 条。
7. 用宿主的“更新已安装 App”路径验证升级保留 runtime appId。普通导入会生成新 runtime appId，不能把重新导入 ZIP 当作必然保留旧匿名数据的升级。
8. 验收完成后才决定版本号、生成安装包。本轮不打 1.0.1。

验收必须增加：

- 与原版相同 fixture 下，五入口、图文/模拟视频、楼中楼、消息/私信、profile、双语、所有忙碌/错误/空状态。
- 生成调用顺序、NPC 批次、Character同时发帖与评论、概率边界、@路由、评论接话、清空与删除语义。
- 首次只配置用户匿名账号；角色自动起名、头像来自角色卡；路人无管理操作；改名历史关系不丢。
- 截获所有九条路径最终 AI payload：无其他 owner mapping/真实ID/角色头像，普通 kk=Chloe 不被带入；当前 viewer只接收自己的 self/有效 disclosure。
- 用户 Case 1–14（Case 11 按最新要求改成 UI角色真实头像、AI头像隔离）；新增引用/假设/否认/旧昵称/同名歧义/人工撤销的揭露测试。
- 只让实际见到内容的 viewer形成记忆；账号不同不混并；explicitly_disclosed 只对指定 viewer生效。
- 重启、多于500条、旧版升级、头像变更、并发首次创建、关闭生成中App、删除事件及失效媒体。
- 真实模型多轮验证与失败策略，不能只检查 prompt 中写了保护规则。

本次验证结果：

- 现有脚本运行结果：67 checks passed。
- 补充只读反例：引用别人的 “moth is me” 被错误识别；已知身份的真实姓名仍被无条件拦截。
- 以上证明原测试不足，不证明匿名版已达 parity 或身份安全验收。
- 本轮仅交付审计文档；没有改原版、匿名 App 实现、核心接口、测试源码或安装包。
