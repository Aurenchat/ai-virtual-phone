# 匿名小红书 Phase 0：Custom App / Host 能力实测

日期：2026-09-25。基准 HEAD：`da06721856e412777bec6f4db6427a74db100b34`。

结论：**当前不能批准“纯导入 App 已同时满足全部要求”。暂停正式 parity port，不生成新版本。** 发现了图片与隔离无法兼得、guard 通道缺口、关闭 iframe 丢失生成后写入等可重复阻断项。没有修改核心、内置小红书或生产匿名 App。

## 1. 验证方法与证据等级

本轮不是只读接口，也不是替换 Host 的 SDK mock：

- 使用真实源码编译的 CustomAppRunner、Host API、chat-engine、prompt assembler、provider adapter、插件总线、记忆服务和 IndexedDB。
- 在全新无用户数据的 headless Edge context 与独立 loopback origin 中运行。
- 一个最小测试 App 经真实 ZIP importer 在内存中导入、真实安装 API 安装，再运行 iframe 注入的 AiPhone SDK。未写出或交付 ZIP。
- 伴随测试插件经真实插件 loader/runtime 安装并启用；另有 hook 故障注入和受控请求替换实验。
- 所有模型请求实际经过浏览器 HTTP，**在接收端记录最终序列化 body**，不是 instruction 或 preview 的截图。
- 接收端是本地模型协议记录服务器，返回固定 `PHASE0_RESPONSE`。未使用真实 API key、未向外部模型发送数据，其他网络请求被阻断。
- 配图用真实可解码的红色 PNG fixture，角色头像用蓝色 PNG。捕获 JPEG/PNG 解码后证实发送的是红色帖子图，不是头像。

证据：

- [完整最终请求 captures.json](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/evidence/captures.json)：44 次 HTTP 请求，含完整 messages、图片 data URL 与生成参数。
- [执行结果 results.json](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/evidence/results.json)：68 个步骤完成、无步骤异常、无浏览器 pageerror；包括数据库记录、安装结果和失败反例。
- [源码指纹 provenance.json](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/evidence/provenance.json)：151 个编译输入文件 SHA-256 和 HEAD。
- [可复跑脚本](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/run.mjs)、[场景定义](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/scenarios.mjs)、[复跑说明](C:/Users/Administrator.DESKTOP-068VNB6/Desktop/ai-virtual-phone/scripts/anonymous-xhs-phase0/README.md)。

浏览器版本：153.0.4234.48。末尾 13 项断言确认的是“限制确实复现”，**不是 13 项产品验收通过**。本轮没有使用之前 67 项单测作为证据。

附加检查：全仓 `tsc --noEmit --incremental false` 通过；probe JavaScript 语法检查通过；最终捕获后 151 个编译输入的 SHA-256 均未变化。现有无关工作区改动保持原样。

证据上限：证明传输、Host 组装、存储及 iframe 生命周期；**不证明真实模型能理解图片、长期记得事实或绝不猜测身份**。后者仍需真实模型多轮测试。已发现的传输/生命周期反例无需依赖真实模型回复即可成立。

## 2. 能力总表

| 项目 | 判定 | 实测结论 |
|---|---|---|
| ai.chat 文本隔离 | PASS（传输层） | App 提供的人设、规则、账号历史原样送出；未自动混入宿主记忆、用户身份或 binding |
| ai.chat 帖子视觉输入 | FAIL | content 数组实际变成 `[object Object],[object Object]` |
| ai.generate 保留人设、图片、App 历史 | PASS（传输层） | 三者都能进入最终请求 |
| ai.generate 同时排除非授权上下文 | FAIL | 普通聊天、核心/长期记忆、普通小红书、kk=Chloe 同时进入；关闭历史标记又丢任务和图片 |
| 全链路 identity guard | FAIL | 内置预设有、自定义预设无；插件能补部分通道，但 raw chat/原生总结绕过，错误/超时继续发送 |
| timeline 与长期记忆 | PARTIAL | 近期按角色可见、可直接写入长期；timeline 有容量、搜索不含新聊天、原生总结无 guard、撤销可被旧记录复活 |
| 生成中关闭 App 后自动保存 | FAIL | ai.chat / ai.generate 两条实际 iframe 路径均请求完成、结果写入未发生 |
| chat.sendCard 匿名作者投影 | PASS（卡片/传输层）；整体 PARTIAL | 卡片与 historyText 保留 accountId/displayName，未自动建立 owner 映射；后续自定义预设缺 guard |
| 私有数据库独立持久化 | PASS（本轮样本） | 账号历史不受 timeline 截断影响；页面重载后 App、绑定、事件、已保存结果仍在 |

PASS 仅适用于表中注明的范围；整体关键能力有 FAIL，不以 PARTIAL 偷换原需求。

## 3. AI 图片与上下文隔离

### 3.1 最终请求对照

以下编号对应 captures.json 的 `index`，可按 `label` 查找，复跑时编号可能变化。

| 路径 | 配图 | 人设/性格 | App 提供历史 | App timeline | 普通私聊/核心/长期/普通小红书/kk=Chloe |
|---|---|---|---|---|---|
| #0 ai-chat-multimodal | 无 | 有（App 显式传入） | 数组中的文本也损坏 | 无自动注入 | 无 |
| #1 ai-chat-text-projection | 无 | 有（App 显式传入） | 有 | 无自动注入 | 无 |
| #2 ai-generate-default | 1 张 | 有 | 有 | 有 | 全部有 |
| #4 ai-generate-history-none | 无 | 有 | 无 | 有 | 全部有 |
| #5 ai-generate-exclude-shortterm | 无 | 有 | 无，任务也没了 | 无 | 本 fixture 中排除成功 |
| #23 plugin-projection-positive-control | 1 张 | 有 | 有 | 由投影指定 | 无，但已不是纯 App |

#34 / #35 通过真实 iframe SDK 再次复现 ai.chat / ai.generate 图片结论。

#0 实际结构：

```json
{
  "model": "fixture-model",
  "messages": [
    { "role": "system", "content": "来源限定规则 + VIEWER_PERSONA + VIEWER_PERSONALITY" },
    { "role": "user", "content": "[object Object],[object Object]" }
  ]
}
```

#2 的关键结构（这里仅省略长文本，完整请求见原文件）：

```text
system:
  personaDescription: The user's name is Chloe.
  GLOBAL_IDENTITY_SENTINEL kk = Chloe
  charDescription: VIEWER_PERSONA
  charPersonality: VIEWER_PERSONALITY
  memoryCore: CORE_SENTINEL kk = Chloe
  memoryLongTerm: LONG_SENTINEL ... kk = Chloe
user: [匿名小红书] APP_HISTORY_SENTINEL acct_moth / moth ...
user: content=[text, image_url(data:image/jpeg;base64,...)]
system:
  ORDINARY_XHS_SENTINEL kk = Chloe
  [私聊] Chloe: CHAT_SHORT_SENTINEL ...
  [匿名小红书] APP_TIMELINE_SENTINEL social_account acct_moth / moth ...
user: [匿名小红书] TASK_SENTINEL ...
system: 来源限定身份保护规则
```

使用合法的 inline promptProfile（含 id）测试了 history:none 与 exclude；不是漏传配置导致的结果。exclude 去掉 shortTermMemory、memoryCore、memoryLongTerm、personaDescription、characterRelations，并禁用 worldbook 后，保住人设，但当前任务、图片、App 历史一起丢失。没有采用全局关闭记忆开关来制造“隔离成功”。

### 3.2 其他角色与头像

- 初始无关系 fixture：其他角色私聊、长期记忆、App timeline、私有 ActorBinding 均未泄漏。
- 增加真实角色关系后，#3 自动包含 `OtherCharacter` 和 `OTHER_BRIEF_PERSONA_SENTINEL`。这是宿主的 characterRelations 注入，不能把“没有读到其他人的私聊”说成“没有其他人物身份信息”。
- 其他角色私聊/长期记忆仍未进入；私有 binding 与真实 characterId 没有自动进入本轮最终请求。
- 图片解码结果分别为 [254,0,2] 或 [255,0,0]，不是蓝色角色头像。characters.list 返回头像不意味着模型自动看到头像。
- 本 fixture 的 persona/personality 已完整保留。但真实角色卡可能自身写有用户关系或普通平台身份；原样复制任意人设并不能自动保证无身份信息。那仍需要明确的、逐字段/内容审查的投影边界，不能用删整行假装人设完整。

**缺失能力**：受控的多模态裸通道，或者能独立保留任务/图片/App 历史、同时按来源与实体裁剪宿主上下文的 ai.generate 模式。目前实测的纯 App 路径没有同时满足；该部分停止实施。

## 4. identity guard 覆盖与插件实测

### 4.1 预设矩阵

| 调用意图 | 内置预设 | 自定义预设 | 注册 llm.request 后的自定义预设 |
|---|---|---|---|
| 浏览/发帖 | 有规则 #6 | 无 #11 | 有 #17 |
| 新帖反应 | 有 #7 | 无 #12 | 有 #18 |
| 评论回复 | 有 #8 | 无 #13 | 有 #19 |
| @ 回复 | 有 #9 | 无 #14 | 有 #20 |
| 私信 | 有 #10 | 无 #15 | 有 #21 |
| 分享后的普通聊天 | 有 #27 | 无 #28 | 有 #29、真实安装插件 #42 |

范围说明：前五行是携带对应任务意图的真实 ai.generate 请求，覆盖共同 Host 通道和预设选择，**不是尚未 port 的原版九个引擎函数/页面端到端验收**。未对不存在的匿名版完整私信/发帖流程宣称 PASS。私信仍须在正式 port 后验证实际入口。

### 4.2 两种 hook 的结果

- prompt.system 回调确实被执行，接收 sessionId、isGroup、characterId、hint；但追加的 PROMPT_HOOK_SENTINEL 没有出现在本轮相关最终请求中。它依赖预设展开相应宏，并非独立强制系统消息。
- llm.request 接收 messages、purpose、sessionId；`purpose=custom_app:<runtimeAppId>` 可识别匿名 App 生成通道，不能误说完全没有来源信息。
- 正常 llm.request 可插入来源限定规则，并可替换最终 messages 保留图片。#23 用受控、显式安全 fixture 重建请求，同时保住人设、账号历史与图片，并排除全部非授权 marker。
- #23 是能力阳性对照，不是通用过滤器：尚未实现任意用户预设、世界书、人设、并发任务的安全投影。不能据此宣布生产插件已经完成。
- 真正通过 loader/runtime 安装 `phase0.guard-probe` 成功；#41 / #42 证明安装态插件也能插入规则。规则文本来自现有来源限定条目，没有加入 owner 映射。
- #22 / #43：ai.chat 不走这两个 hook，最终请求无插件规则。
- #33：原生长期总结也绕过 llm.request；安装到预设的规则同样没有进入。
- #25：hook 主动抛错后仍发出原始请求；#26：超时后仍发出原始请求。二者均没有 guard，未被 fail-closed 阻断。

**最小插件候选**：按可信 purpose/session 选择 App 任务，在 llm.request 使用白名单重建多模态上下文；对普通聊天只加来源限定规则及当前 viewer 的账号状态，不删普通聊天身份知识。prompt.system 只作补充。但公开 hook 目前不能覆盖 raw chat/总结、不能在插件不可用时保证阻断，因此插件方案整体是 **PARTIAL，不是可靠安全边界**。

不采用全局 fetch monkey-patch 或临时改全局记忆配置来绕开这些缺口；它们未被验证为可靠方案，也会扩大影响范围。

## 5. 长期记忆实测

### 5.1 timeline

`timeline-501-and-counter` 实际写入 501 条、交替两个 viewer：

- App 合计保留 500 条，各 viewer 250 条。
- 最旧变为 CAPACITY_1，最新 CAPACITY_500；原来的 APP_TIMELINE_SENTINEL 被淘汰。
- 写入前后事件计数均为 54，timeline 单独写入未增加原生计数。
- summary 输入超过 2000 字符后截断为 2000；尾部账号标记会丢，data.accountId 留在 metadata。
- #27 普通聊天中确实能看到当前 viewer 的近期匿名事件，其他 viewer 的事件不进入。
- #30 截断后原事件不再进入最终请求；memory.search 也找不到它。
- 同一事件在 App 私有 account_events 中仍存在，页面重载后仍存在。因此私有库应继续作为权威来源。

### 5.2 memory.search 范围与 disclosure

实际命中：

- 当前 viewer 的 core / long_term：可命中。
- 同一 viewer 近期 timeline：不命中。
- 刚写入私聊、尚未总结的 FRESH_DISCLOSURE：不命中。
- 不同表述的同义 query：不命中；它是文本子串搜索，不是这里的语义搜索。
- 用当前 viewer 查询，不返回另一个 viewer 的长期记忆。
- 但 SDK 接受调用方传入另一个 characterId，实际返回了 OTHER_MEMORY_SECRET。**Host 不强制“当前 viewer”**；App wrapper 必须固定 viewer 参数，不能把任意 characterId 交给模型或通用调用器。

撤销反例：

1. memory.add 写入明确揭露的旧长期记忆。
2. 删除该 viewer 的 disclosure timeline，返回 deletedCount=1。
3. memory.search 仍返回旧明确揭露。
4. 将实际返回文本送进现有生产 `strictDisclosureMatch`，结果为 true。

所以“删掉 disclosure 行恢复 unknown”会被重新发现。需要私有 `viewerCharacterId + accountId` 的撤销 tombstone、证据版本/时间和人工确认状态；旧证据不能覆盖撤销。不能简单全局删记忆或改普通聊天。

### 5.3 memory.add 与原生自动总结：修正 audit

memory.add 的长期条目：

- 实际入库，保留 App metadata；#31 随后普通聊天的最终 payload 包含 ACCOUNT_ARCHIVE_SENTINEL。
- 页面重载后 memory.search 仍可找到。
- Host 将 sourceApp 写为 chat，另外放 origin=custom_app/appId metadata；并不是强类型、不可混并的社交账号记忆表。
- 长期条目进入当前请求也受预算、检索策略和后续总结影响，不等于无限记忆或实际模型稳定召回。

**上次 audit 需要补充**：timeline 写入确实不触发原生总结；但 ai.generate 经 generateChatCompletion，每次增加两个事件计数，并可能非阻塞触发 maybeRunSummarization。本轮把阈值设为 2 后实际产生：

- #32 正常生成请求，有规则；
- #33 另一个原生总结请求，匿名账号事件与普通来源 kk=Chloe 混合进入，只有 user message，无匿名 guard；
- 数据库真实新增原生 long_term summary。

固定返回的 PHASE0_RESPONSE 仅用于证明入库链路，不能据此判断真实总结语义好坏。问题是总结请求本身缺账号连续性/身份保护保证，且和普通来源共用原生管线；这已经足以否定“全链路已覆盖”。

### 5.4 纯 App 能做到的最佳方案

- 私有 accountId 历史/关系账本 + 按 viewer 的见闻与披露/撤销状态作为权威数据。
- timeline 只投放有明确 accountId/displayName 的短摘要；身份主键放在摘要开头与 metadata 两处。
- 用 App 自己的受控上下文生成逐账号摘要，必要时 memory.add 投影长期条目；提供按 accountId 查询的 App 工具，后续正式验证模型是否会调用。
- 普通聊天中新鲜揭露可用该 viewer 的 chat.readHistory 或 chat.message.created 事件作为候选证据，保留说话人、原文、消息ID；歧义仍 unknown，人工确认兜底。本轮没有实现/验收这条自动提取管线。
- memory.search 只作当前 viewer 的候选检索，不当揭露判定器；撤销 tombstone 优先于旧检索结果。

差异必须保留：这不是原生全局自动总结的等价实现，也无法在纯 App 下保证所有后续原生总结/核心提炼与普通聊天预设都遵守 App 账本。不能关闭用户全局总结来制造通过。

## 6. App 生命周期

使用真实 CustomAppRunner 的 SDK `app.close()` 导致 React unmount，模拟 desktop-shell 切换 activeApp 的同一卸载边界；未把 CSS 隐藏当关闭，也没有替换 iframe 的 SDK。

两条通道均测试：

| 步骤 | ai.chat | ai.generate |
|---|---|---|
| 保持打开，生成后 db 写入 | 成功，结果 PHASE0_RESPONSE | 成功，结果 PHASE0_RESPONSE |
| 先写 pending，开始请求 | 成功 | 成功 |
| 记录服务器收到请求后关闭 App | iframe 销毁 | iframe 销毁 |
| Host HTTP 返回 | 完成 #38 | 完成 #40 |
| 重新进入查询 | pending，无结果 | pending，无结果 |
| 整页重载查询 | 仍 pending | 仍 pending |

**FAIL**：请求完成不等于 App 后续 JS 继续执行。数据库中既有记录没损坏，但生成后的解析/保存链丢失。

另实调 `executeCustomAppHostAction(type="ai.generate")` 返回“未知后台动作：ai.generate”。不能把现有 tasks.schedule 当成可运行并保存任意生成结果的 API。

没有运行完整 DesktopShell 桌面导航；这里真实测的是它使用的 runner 卸载边界。也未证明已有 background event/tool runner 可以无缝接管任意前台任务，因此不声称那条替代路径已经 parity。

最小插件候选：宿主侧长驻任务执行与 durable pending/result journal；但现有公开插件与 Custom App 之间的任务提交/结果读取桥、稳定 jobId、取消/重试/提交尚未验证，不把“插件一直在”当完成证明。

## 7. 分享边界

`share-card-storage` 与 `sdk-share-card` 分别实调 Host 和真实 SDK。写入结构：

```json
{
  "role": "user",
  "mediaType": "app_card",
  "content": "[匿名小红书] 当前聊天者分享一篇帖子。帖主 social_account accountId=acct_moth displayName=moth；现实身份 unknown。分享者不等于帖主。内容：15m, ten rounds.",
  "mediaData": {
    "appName": "匿名小红书",
    "appCardLayout": {
      "author": { "kind": "social_account", "accountId": "acct_moth", "displayName": "moth" }
    },
    "appHistoryText": "同上"
  }
}
```

message 的 sessionId 是宿主存储路由，不是帖主。最终模型请求中的该条分享内容没有携带 ownerId/ownerKind/真实角色ID/私有 binding，Host 也没有自动将帖主改写成 Chloe。

#27 / #28 实际后续聊天 payload 保留分享语义、acct_moth/moth；#36 验证 SDK 分享也进入后续 payload。完整普通聊天仍含其正常角色/用户/既有记忆，**这是普通聊天，不应为了匿名帖主改写或清空 kk=Chloe**。要求“只能匿名作者”应施加在该来源的帖子与作者信息，不是把整个普通聊天所有人都匿名化。

传输部分 PASS；整体 PARTIAL：自定义预设无规则，只有已运行插件能补；本轮未做真实模型的“分享者不是作者”行为测试。不能保证仅靠一句 historyText 模型永不推断。

## 8. 纯导入最终边界与最小扩展候选

目前纯 App 可做：

- 忠实 UI port 的构建基础、独立 storage、自动角色账号、私有 binding 与公共身份 DTO。
- 显式自建文本上下文，手动带入人设/账号记忆；UI 使用真实头像而 AI 不用。
- 逐 viewer timeline / memory.add 投影，私有长期账本、撤销优先状态。
- 匿名 share card 数据投影。

目前不可宣称满足：

- 原版视觉能力、人设/App上下文与严格非授权上下文隔离同时成立。
- 自定义预设、raw chat、原生总结全链路 guard 且失败时阻断。
- 前台 iframe 关闭后原生成流程自动完成并落库。
- 自动长期总结始终保持 accountId 主体和按 viewer disclosure。

按“插件优先，仍不足才考虑核心”的最小候选如下；**全部是提案，没有修改**：

| 阻断项 | 已验证的插件能力/不足 | 最小 Host 候选接口与文件 |
|---|---|---|
| 视觉+隔离 | llm.request 能重建安全多模态请求；但未覆盖 raw chat/失败保护 | 首选给 ai.chat 增加受校验的 text/image parts，明确不自动注入宿主上下文、不隐式触发普通总结；涉及 lib/custom-app-host-api.ts、lib/api-helpers.ts（或复用 provider adapter）、SDK契约/文档/测试 |
| 保留原生生成能力而来源过滤 | 插件可按 purpose识别任务，但不能可靠从混合长文本恢复所有来源 | 可选替代：ai.generate 增加独立任务/媒体输入与来源白名单、结构化 context projection；涉及 host API、chat-engine、short-term-assembler、llm-prompt-assembler。不是一次性关闭 shortTermMemory |
| guard 全覆盖/失败阻断 | prompt.system 依赖宏；llm.request 异常/超时 fail-open；simpleLLMCall 通道绕过 | 宿主支持来源限定的必需 policyId、可信 appId/viewer/requestId 与终端发送前校验；受保护请求规则缺失/失败必须拒绝发送。覆盖 llm-http / api-helpers 及 memory-summarizer/core-memory-builder 的调用入口；插件 hook若承载策略需可声明必需执行，不能只继续忽略错误 |
| 后续聊天及撤销 | 已运行插件能加规则；权威账号状态桥与旧记忆否决尚不足 | 将当前 viewer 的 App 公共状态/检索接入普通聊天与总结；禁止注入全量 ActorBinding。若增接口，应含 accountId、状态、证据版本、撤销版本，不能按全局 owner映射处理 |
| 关闭后执行/提交 | 公开插件未证明能接管前台 iframe 的 JS | 最小桌面方案是 runner 显式 job/busy 生命周期 + 关闭只隐藏、job完成并提交后才卸载；涉及 custom-app-runner.tsx、desktop-shell.tsx、SDK能力声明。不能在网络刚返回、db写入尚未开始时提前卸载。更稳的持久任务 API 属于较大扩展，应另行批准 |
| 长期记忆更正与隔离 | App可写长期，但不能保证原生总结/核心提炼不混并 | 优先使用上述 source-aware policy；若需正式更正/删除投影，增加仅能更新本 App 来源条目的 scoped API，保留 revision/accountId/viewer，不授权任意改普通记忆 |

这不是要求把所有提案一起实施；尤其不应先改核心再解释。先选择边界方案，才能决定是否满足纯导入约束以及是否进入正式 port。

## 9. 未做事项与下一关

未做：正式 UI port、原版业务流程迁移、生产匿名 App 修改、真实 RP 数据读写、真实模型推理、外部网络调用、版本安装包、commit/push。

下一关建议：先确认接受哪一种宿主/伴随插件边界。若继续坚持“纯导入、不新增核心能力且所有验收条件不变”，本轮结果是阻断，不应开始以降级方案包装正式版本。
