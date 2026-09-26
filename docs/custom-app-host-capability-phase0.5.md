# Phase 0.5 — Custom App Host Capability Patch

日期：2026-09-25。基于本地 HEAD `da06721856e412777bec6f4db6427a74db100b34`。

结论：**浏览器 Host 的四项通用能力已实现并有实际 HTTP 证据；整体状态仍为 PARTIAL，不据此进入 Phase 1。**

主要未闭合项是独立微信云端／本地助手运行包的请求出口。这些运行时不经过本次浏览器 Host gate，不能声称已经获得同等保护。另有旧无来源记忆、静态人设字面内容、已发送／已复制的历史文本等不可自动净化的边界，见第 7 节。

未改内置小红书、Character schema、匿名 App 生产文件、账号数据或既有身份关系；未生成匿名 App 安装包，未提交、推送或部署。核心新增代码没有匿名平台专属名字、账号绑定、身份识别或 disclosure 语义解析。

## 1. 改动文件

新增通用模块：

- `lib/custom-app-scoped-generation.ts`：显式 context policy、多模态校验、受限复用原 assembler、provider 调用。
- `lib/custom-app-protected-policy.ts`：公开规则存储、按 App 管理、最终 provider body 注入与 fail closed。
- `lib/custom-app-ai-tasks.ts`：Host 持有执行、Web Locks、请求指纹去重、原始结果、原子消费、取消／卸载／重启处理。
- `lib/custom-app-source-memory.ts`：当前 App 的 viewer + namespace + entity 投影读写／失效。
- `lib/memory-provenance.ts`：结构化来源、修订号、失效检查、派生 lineage、模型侧来源标签。

修改现有 Host/SDK：

- `components/app-market/custom-app-runner.tsx`：SDK wrapper、dispatcher、独立权限检查、capabilities。
- `lib/custom-app-types.ts`、`lib/custom-app-storage.ts`、`lib/custom-app-permission-labels.ts`、`lib/custom-app-creator-guide.ts`：类型／manifest 白名单／权限文案／内嵌 contract；卸载任务清理；timeline 来源字段；通用 collection key。
- `lib/kv-db.ts`：fresh durable read、多 key 原子事务。保留原有接口及行为。
- `lib/llm-prompt-assembler.ts`：仅 opt-in 的 `isolatedContext`，禁止 relationship/dwelling 隐式存储读取。
- `lib/llm-http.ts`、`lib/api-helpers.ts`：最终发送前执行 protected policy。
- `lib/mascot-engine.ts`、`lib/qa-agent-tools.ts`：原来直接 fetch 的对话请求接入统一发送出口。
- `lib/chat-engine.ts`：普通聊天组装前刷新来源失效状态。
- `lib/memory-types.ts`、`lib/memory-storage.ts`、`lib/memory-injector.ts`：原生记忆结构化 provenance、有效性过滤、来源标签；删除操作仍可清理失效记录。
- `lib/short-term-assembler.ts`、`lib/memory-summarizer.ts`、`lib/core-memory-builder.ts`：timeline 标签、总结 lineage 传递，混合来源不得冒充纯 App 来源。

验证文件：`scripts/anonymous-xhs-phase0/host-entry.tsx`、`run.mjs`、`scenarios-0.5.mjs`、`.gitignore`；复用 Phase 0 的 TS loader。完整源码指纹在各证据目录 `provenance.json`。

## 2. SDK contract / manifest 权限

所有新能力 opt-in，旧 `ai.chat` / `ai.generate` 的上下文默认行为不变。模型规则注册本身是显式、影响整个浏览器 Host 的高权限操作；不是一个普通预设或可选插件 hook。

| API | 权限 | 输入／返回 |
| --- | --- | --- |
| `AiPhone.ai.generateScoped(input)` | `ai.generateScoped` + 所选来源权限 | `{characterId,contextPolicy,messages,appContext?,maxTokens?}` → `{content,raw,usage?}` |
| `AiPhone.app.setPolicy(input)` | `app.policy.manage` | `{id,namespace,text}` 注册／覆盖自己的 rule；`{id,remove:true}` 显式撤销；返回 `{ok:true}` |
| `AiPhone.ai.startTask(input)` | `ai.tasks` + `ai.generateScoped` | `{idempotencyKey,request:ScopedGenerationRequest}` → 持久 task |
| `AiPhone.ai.getTask({taskId})` | `ai.tasks` | 自己的 task 或 null |
| `AiPhone.ai.listTasks()` | `ai.tasks` | 当前 App 的 tasks；同时识别失去执行宿主的任务 |
| `AiPhone.ai.cancelTask({taskId})` | `ai.tasks` | 当前 App task；running → cancelled，其他终态不改 |
| `AiPhone.ai.consumeTask({taskId,writes})` | `ai.tasks` + `app.data.write` | `{applied:true/false}`；App records 与消费标记同一事务 |
| `AiPhone.memory.searchSource(scope)` | `memory.source.read` | `{viewerCharacterId,sourceNamespace,sourceEntityId,query?}` → `{revision,entries}` |
| `AiPhone.memory.writeSource(input)` | `memory.source.write` | scope + `{evidenceId,expectedRevision,content,timeline?}` → 原生 long-term entry |
| `AiPhone.memory.invalidateSource(scope)` | `memory.source.write` | 递增 scope 修订号 → `{revision}` |

SDK 没有任意指定 sourceAppId 的写入口。Host 以已安装 App 参数确定来源，generation 的 memory viewer 强制使用该次 `characterId`，忽略 scope 中夹带的其他 viewer/source 属性。管理 App 的直接记忆 API 仍显式指定 viewer，以支持多角色；它不是 Host 自动解析“当前聊天者”。

### 2.1 Scoped context policy

```ts
type ScopedContextPolicy = {
  characterProfile?: boolean;
  boundPreset?: boolean;
  worldbook?: boolean;
  regex?: boolean;
  generationRules?: boolean;
  userProfile?: boolean;
  coreMemory?: 'deny' | 'own_source';
  longTermMemory?: 'deny' | 'own_source';
  memorySources?: { sourceNamespace: string; sourceEntityId: string }[];
  shortTermChat?: boolean;
  timeline?: {
    builtInSources?: NativeTimelineEntry['sourceApp'][];
    ownApp?: boolean;
    otherAppIds?: string[];
  };
};
```

必须提供 contextPolicy。遗漏来源全部拒绝；未知顶层类别报错；不支持 `includeGlobalContext`。`coreMemory/longTermMemory:true` 不被接受，因为无法把旧混合记忆可靠归因。

角色静态设定需 `characters.read`；世界书需 `world.read`；全局用户 profile 需 `user.profile.read` 和 `user.persona.read`；timeline/chat 需 `memory.readShortTerm`；安全记忆投影需 `memory.source.read`。

`boundPreset` 控制绑定预设文本，不等于授权它的全部 marker。未允许的来源 marker 被移除，relationship/dwelling 自动加载关闭。`generationRules` 独立控制绑定预设的模型参数。`regex` 复用原 assembler 的输入处理和生成后的输出规则；App 直接提供的 task messages 不经过全局历史组装。没有调用旧 generateChatCompletion，不自动累计原生总结事件，不读取 App 私有 binding 表，也不运行普通插件的任意 prompt/llm transform。

允许来源里的**字面内容**不会被改写：角色卡、预设或世界书如果自己写有其他人的身份关系，Host 无法把“性格”与“关系信息”语义拆开。这个限制必须由 App 选择来源／用户维护素材解决，不是 sanitizer 可以证明的安全性。

支持 system/user/assistant 的字符串 content；user content 可以是真正的 `{type:'text',text}` 与 `{type:'image_url',image_url:{url}}` 数组。最多 4 张，单图 URL 字符串 ≤2,800,000 字符，只接受 HTTPS 或 PNG/JPEG/WebP/GIF data URL；文字总长 ≤200,000；appContext ≤100,000。绑定配置未开启视觉时直接拒绝，**不静默降级成“成功看图”**。模型实际是否支持视觉仍依赖 provider 配置和模型能力。

无角色且未选择任何角色来源的 scoped 请求可以省略 `characterId`，API 配置按显式 `apiConfigId`、角色 Custom App/聊天绑定、全局默认、首个安全回退的顺序解析。选择全局 API 只选择 provider/model，不注入全局 prompt。请求错误以 `MULTIMODAL_UNSUPPORTED`、`PROVIDER_ERROR`、`TIMEOUT`、`CANCELLED`、`MALFORMED_REQUEST` 分类；durable task 在 `errorCode` 中保留分类。

### 2.2 Protected policies

持久 key：`ai_phone_protected_policies_v1`。每条只有 `{appId,id,namespace,text,required:true}`。Host 不读取 ActorBinding、人物 owner 或 App 数据来生成规则。

规则在普通插件处理完、provider body 构造完、最终 fetch 前添加：OpenAI-compatible 的 system message、Anthropic 的 system text block、Gemini 的 systemInstruction。simpleLLMCall 同样经过 gate，因此原生 timeline 总结与 core 总结不再绕开规则。

规则存储读取／JSON 校验／注入失败均不发送 HTTP。无规则时 provider body 保持不变。普通插件的 throw/timeout fallback 不修改。规则是公开、按来源限制的行为指令，不是内容分类器或模型输出的数学保证。

规则不随 iframe 关闭消失。卸载 App 时保留规则，以免历史投影失去保护；若需要撤销，应卸载前显式调用 remove。目前未新增 Host 规则管理 UI，孤立规则的用户管理体验仍需完善。

### 2.3 Durable tasks

key：`ai_phone_custom_app_ai_results_v1`；卸载 tombstone：`ai_phone_custom_app_ai_removed_v1`。

每条包含 taskId/appId/idempotencyKey/requestFingerprint/status/result?/error?/createdAt/completedAt?/consumedAt?。result 保存 raw provider JSON。Host 不存业务 callback、不解释帖子。

```text
startTask → running → completed → consumeTask + App DB writes → consumed
                  ↘ failed / cancelled
```

相同 App + idempotencyKey + canonical request SHA-256 返回原任务；同 key 不同 request 拒绝。Web Locks 区分“另一标签页仍在执行”与“执行宿主已消失”。关闭 iframe 不影响 Host promise；关闭整个 Host 后运行中任务不自动重发，下次查询标记 `failed/HOST_INTERRUPTED`。已 completed 未消费结果可跨刷新读取。

`writes` 是 `{collection,id,operation:'put'|'delete',value?}[]`；最多 100 操作，总 JSON ≤4MB；collection 为 `[\w.-]` 1–80 字符，id 为同字符集 1–120 字符。只可写自己的 collection，读取 fresh IDB rows，在同一事务保存所有写入与 consumed 状态。第二次消费返回 false，出错整组回滚；兼容旧整包 App data 的只读迁移回退。

这是对**此事务中 App DB 写入**的 exactly-once，不是对任意 iframe callback、发消息、支付或外部网络副作用的 exactly-once。consume 后清除 raw result，保留去重记录。每 App 最多 100 个 running/completed 未消费任务；单结果 ≤4MB。Web Locks 不可用时拒绝新任务／来源写入，不假装有跨标签页并发保证。

卸载清理所有 task 结果，写入撤销 tombstone；晚到的完成结果无法重建任务。取消可阻止结果提交，但不能承诺 provider 尚未计费，其他标签页的取消也未必能中止服务商已接收的请求。

### 2.4 Source-aware memory

仍写原生 `ai_phone_memory_db_v1/memories`，没有第二套记忆库。新增可选 provenance：

```ts
{
  sources: [{ sourceKind:'custom_app', sourceAppId,
    sourceNamespace, sourceEntityId, viewerCharacterId, revision }],
  mixed: false
}
```

作用域键是 `[sourceAppId,sourceNamespace,sourceEntityId,viewerCharacterId]`，不用昵称、不从字符串猜来源。修订号存于 `ai_phone_memory_source_revisions_v1`。写入需 expectedRevision；旧修订证据重放报错。不同 viewer / App / entity 不互相失效。App 应把帖子历史与可撤销证据放在不同 namespace，避免撤销证据时撤销同账号全部投影。

模型来源 envelope 不包含 viewerCharacterId，稳定 sourceEntityId 保留。App 自己负责 content 的安全 projection，Host 不把匿名 owner 填入文字。

timeline 可选镜像仍受原有 500 条／2000 字限制；长期 projection 不依赖 timeline 是否被截断。App 私有 DB 仍是权威历史。原生长期条数／token budget／向量召回策略未变，不保证无限保留或语义召回。

timeline → long-term → core 保存来源 refs 的并集；含旧无来源输入的结果标记 mixed。scoped 检索拒绝 mixed 或跨 entity 的总结。撤销任一来源修订后，依赖它的派生总结整体视为失效，宁可少召回，也不让旧证据复活。存储保留失效记录用于追踪；有效性检索不返回它们。

## 3. 更新后的 capability matrix

PASS 仅代表相应可执行断言通过，不代表模型语义服从或全部产品行为已经验收。

| 能力 | 结果 | 证据／边界 |
| --- | --- | --- |
| 静态角色 + 图片 + 明确 App 上下文，同时排除未授权全局来源 | PASS | `scoped-multimodal-default-deny`，真实 HTTP 中是 image part；对植入秘密逐项 assert 不存在 |
| 自有 viewer/entity 记忆 + own timeline + 图片 | PASS | `scoped-own-memory-plus-image-plus-own-timeline` |
| OpenAI / Anthropic / Gemini wire format | PASS | 三种最终 body 均实际送到本地 HTTP recorder |
| 默认／自定义 preset、普通聊天、旧 App AI 的 gate | PASS | `protected-native-chat-*`、`protected-legacy-ai-*` |
| 原版九条生成路径 protected policy 覆盖 | PASS（transport） | 默认／自定义 preset 各 9 次真实 engine 调用；包含浏览活动、新帖反应、评论、@、NPC feed／互动／更多评论／私信 |
| 分享卡片与后续普通聊天 | PASS（transport） | 原 sendCard 作者 projection 保存；follow-up 含规则；不新增分享接口 |
| 原生 timeline/core summarizer 的 gate | PASS | `protected-native-timeline-summary`、`protected-native-core-summary` |
| optional hook 替换全部消息后仍有规则 | PASS | `terminal-guard-after-plugin-replacement` |
| protected registry 损坏不发请求 | PASS | `protected-policy-corrupt-registry-fails-closed`：0 HTTP |
| 关闭 iframe 后完成、重载后读取、原子消费一次 | PASS | durable lifecycle、concurrent consume、失败写入 rollback |
| 同 key 去重、取消、重启中断、跨标签页活跃 owner、卸载 | PASS | 相应 task tests；不在整个 Host 被杀后自动续跑 |
| 按 App/viewer/namespace/entity 查新投影、旧 revision 失效 | PASS | source tests、派生总结 lineage 测试、旧证据写入拒绝 |
| timeline 淘汰后在普通聊天召回投影 | PASS（有预算的 fixture） | 510 个 filler 后 own entity 仍检索到，普通聊天最终 HTTP 含来源 envelope |
| 旧 core/long-term 可安全分解为自身生活/用户身份 | FAIL（旧数据限制） | 无可靠来源；scoped 显式拒绝，不恢复完整普通 RP memory |
| 微信云端／本地助手等独立运行时同等 protected gate | FAIL（未接线） | `weixin-cloud-sync` 导出运行包，远端发送不经浏览器 gate |
| 全 provider 实际视觉识别与长期模型不猜身份 | PARTIAL／未测 | 使用确定性本地响应，不是真实模型语义 eval |
| 正式产品 parity port | 未开始 | 本阶段不搬 UI、不发布产品 |

## 4. 实际证据和关键 payload

证据目录：`scripts/anonymous-xhs-phase0/evidence-0.5/`。

- `results.json`：逐项断言结果、browserErrors。
- `captures.json`：最终 HTTP endpoint 收到的完整 body，按 label 关联。
- `provenance.json`：实际编译源码 SHA-256、HEAD 和时间。

使用真实 runner iframe、SDK postMessage dispatcher、Host、assembler/provider、IndexedDB、Web Locks；安装的是内存里的测试 ZIP，没有生成产品安装包。浏览器 context 全新，没有访问用户真实 RP 或密钥。外网全部阻止；原生 Anthropic 仅将目标地址重定向到 loopback recorder，原始 provider body 不改；Google 使用 loopback baseUrl。

OpenAI-compatible 最终请求关键结构如下（这里只展示结构，完整原文见 captures）：

```json
{
  "model": "fixture",
  "messages": [
    {"role":"system","content":"[Host required policy; sourceAppId=...; namespace=social] ..."},
    {"role":"system","content":"<charDescription>You are ProbeViewer. ...</charDescription> ..."},
    {"role":"system","content":"[memory sources=[{sourceKind:custom_app,sourceAppId:...,sourceNamespace:social,sourceEntityId:acct_a,revision:0}]; mixed=false] ..."},
    {"role":"system","content":"App explicitly supplied context"},
    {"role":"user","content":[
      {"type":"text","text":"Describe this post image."},
      {"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}
    ]}
  ]
}
```

这个示例合并展示可选段；不同测试按 policy 选择不同段。Anthropic 则为 `system:[{type:'text',text:rule}]` 与 `messages[].content[].type:'image'`；Gemini 为 `systemInstruction.parts[].text` 与 `contents[].parts[].inlineData`。

Fixture response 固定为 `PHASE0_RESPONSE`。原版平台生成器的结构化解析因此可能返回“无法解析”，测试明确只断言其真实 HTTP 出口得到保护；没有把这些解析失败包装成产品成功。

## 5. 回归与运行

```powershell
$env:HOST_CAPABILITY_PHASE='0.5'
node scripts/anonymous-xhs-phase0/run.mjs

$env:HOST_CAPABILITY_PHASE='regression'
node scripts/anonymous-xhs-phase0/run.mjs

node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/check-custom-app-sdk-consistency.mjs
node scripts/test-shopping-share-purchase.mjs
node scripts/test-shopping-product-share.mjs
node scripts/test-float-possessions.mjs
node scripts/test-anonymous-xiaohongshu.mjs
```

浏览器测试需要本机 Edge 和 Playwright；可用 `PHASE0_NODE_MODULES` 指向带 playwright 的 node_modules。脚本不安装依赖，不访问真实模型。

通用源码补丁包含新 probe 所需的 harness/loader。`regression` 模式复用此前 Phase 0 的 scenarios 与匿名 App fixture，依赖当前工作区已存在的 Phase 0 文件；这些旧产品文件不打进通用 Host 补丁。

Phase 0 原始 `evidence/` 保留不覆盖。回归单独写 `evidence-regression/`：68 steps、44 HTTP、0 browserErrors，原有 13 个能力边界断言保持。新增能力 probe：67 steps、41 HTTP、0 browserErrors，全部步骤完成且断言通过（这是新 probe 的步骤数，与原 App 单测数量碰巧相同）。

另外通过：独立 TypeScript noEmit、SDK 一致性（5 条既有提醒）、商品购买 15 checks、possessions 35 checks、商品分享测试，以及匿名 App 原有 67 checks。最后一项仅作回归，**不是长记忆验收**。

`node node_modules/next/dist/bin/next build --no-lint` 成功生成 71 个页面。项目配置跳过 build 内类型检查，已单独执行 TypeScript；未执行 lint。Webpack 有缓存 snapshot warning，但编译成功。特意不运行 npm build 的微信分发生成步骤，以保留用户已有的两个微信文件改动。

## 6. 可可靠使用的最大上下文子集

默认安全组合为：明确选择的当前角色静态卡 + 独立生成参数 + App 自己的 public projection + 当前 viewer 的本 App source memory + 任务图片。根据需求可以显式加入自己的 timeline。它不自动包括用户身份、普通平台、普通聊天、其他角色 runtime 数据、其他 App 数据。

想恢复更多“生活连续性”，必须先有可靠来源。不允许根据相似词删除旧 memory 中的身份内容后宣称安全。静态人物卡本身如果混有身份关系，同样需要先审核允许该来源的风险。

## 7. 尚未闭合的限制与下一步最小范围

1. **独立远端 runtime**：`lib/weixin-cloud-sync.ts` 的 snapshot/promptTemplate 将上下文交给 `tools/weixin-local-assistant/assistant-core.mjs`／已部署云函数；不经过本地 gate。本次未修改这些用户已有改动或部署远端。最小后续方案：导出通用 requiredPolicy envelope + revision，远端 capability handshake，在远端最后 HTTP 出口执行同等 gate；不支持该 envelope 的旧 runtime 必须拒绝受保护上下文同步／生成。普通插件只能处理当前 Host，不能替远端落实 fail closed。已导出的历史快照还需停用或升级，不能靠本地注册规则追溯保护。
2. **撤销不是遗忘一切自然语言副本**：新 source projection 和带 lineage 的原生总结会失效；不能自动删除旧聊天里已经写下的同义句、其他 App 复制的文字、无来源旧 memory，或追回已经发出的 HTTP。App 不得把这些未受 source revision 管理的文字再次当成有效证据。跨标签页的普通聊天与 scoped generation 已 fresh refresh；其他使用同步 timeline cache 的老消费者尚需统一 freshness 边界验证。
3. **模型行为**：gate 证明规则存在、失败不发送；不能证明真实模型永不违背规则。后续需实际模型 adversarial eval、输出校验与 App 的 viewer-local 状态。Host 不承担账号绑定或身份推断。
4. **权限的信任边界**：新 API 按 manifest 拦截；不防有任意 Host JavaScript 权限的恶意插件直接篡改 IndexedDB 或自建 fetch。向量、TTS、生图接口不是 system-rule 对话通道，不属于此次 gate；不把规则强行拼到向量 input。
5. **存储和并发边界**：required durable writes 遇 quota/IDB 失败会拒绝；不能对系统清除站点数据、回滚旧整库备份或磁盘损坏作持久性保证。consumeTask 原子性不等于所有旧 db.update 跨标签页自动冲突合并。
6. **Host 生命周期**：只保证 iframe 关闭继续执行；完整浏览器被系统杀死时无法继续 HTTP，不做隐式付费重试。已完成结果在正常 IDB 保留时可恢复。

所以交付的是可审查的通用 Host patch 与实测证据，不是“全运行时保护已验收”的发布声明。正式 parity port 继续暂停。
