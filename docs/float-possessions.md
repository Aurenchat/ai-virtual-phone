# Float 我的背包 · 物品持有 1.0.1

## 1.0.0 手机存档升级

在 `f1dfa85da8f13bbe30c1aace62bcc8cb7fc029ca` 上应用增量 `patches/float-possessions-v1.0.1.patch`；原有 core/full/optional-ui 补丁是 1.0.0 的历史交付，不包含本次修复。更新宿主后，同 ID 覆盖导入新版 `plugins/float-possessions.js`，不要卸载旧版 possessions。仅更新网站不会更新已经保存在手机插件安装表里的 JS。

无需账本迁移，仍为 `auren.float-possessions` / `ledger-v1` / version 1。初始化只沿用原账本并执行已有去重恢复，不重编号、不猜所有权、不清理记录。v1.0.0 已有 itemIds、ownerId、provenance、transferHistory、events、shopKeys、orders、reservations、deletedAt 均保留。v1.0.0 删除时已清空的展示字段无法凭空还原，但其 tombstone 与审计身份继续有效。

底部旧“背包”原由社区 `gift-backpack` 3.25.0 注入 `.chat-plus-menu`，读写它自己的 `backpack_gifts_v1`。移除该第三方插件后，不假设手机已有我们的底部入口。本次通过现有 `ctx.ui.slot("chat.inputToolbar", ...)` 在「聊天 → 线上 → 扩展栏」注册唯一“背包”，复用现有 viewer；不保留之前未发布的核心 `PossessionsBackpackButton`。图标使用 Float 已有 Lucide Backpack 的轮廓路径，以 DOM SVG 绘制（插件不依赖 React），附 ISC 授权说明。

核心 `ChatTextInputBar` 已在在线 `showPlusMenu` 时挂载该扩展 slot，本次只补传 sessionId。通用 `ChatPluginSlot` 同时修复遗漏的 characterId 转发，使角色详情快捷入口定位正确；未硬编码新的背包 UI 或新增 ownership store。宿主检测到 possessions 已安装时，仍不运行旧 `gift-backpack` 的扫描、写入与 prompt（即使 possessions 暂时禁用或启动失败也不回退旧所有权）。旧插件保存数据不删除，其他插件不受影响。

实测描述符合“账本已正确转移，旧 UI 仍显示旧快照”；此情况更新宿主和插件后自动消除显示分歧，无需清理测试物品或迁移旧行。这里不宣称检查过手机实际账本；如果账本本身已存在两个不同 itemId，不能靠同名自动合并，需先导出账本明确核对。请勿把这批测试礼物再从旧背包预览中导入；旧快照没有足够关联身份可安全自动合并。

## 安装
1. 在基线 `fc65539c8494b9328ea76c1e557ec12b168e24bc` 上应用 `patches/float-possessions-core.patch`，重新构建并部署 Float。角色详情快捷入口和礼物卡状态文字可另行应用 `patches/float-possessions-optional-ui.patch`。
2. 从 `plugins/float-possessions.js` 下载文件，在 Float 插件管理中导入 JS 并启用。
3. 如已使用穆叶的 `gift-backpack`，先禁用旧插件（不要卸载）。打开新背包 →「预览旧背包迁移」→ 核对列表 → 确认导入。
4. 「聊天 → 线上 → 扩展栏」有「背包」，插件设置有「我的背包」；角色档案详情下有「查看角色背包」。三个入口复用同一个 viewer，不注入 chat.header。

这是“插件 + 原生通用接口适配”，不是能够安装到任意旧版 Float 的纯 JS 插件。旧宿主会明确提示缺少接口。原生礼物卡片、消息发送、群聊权限、自动回复触发和记忆摘要仍由 Float 处理。

## 使用
- 角色新礼物：沿用 `[礼物:名称]`。群聊用 `[礼物:名称:收礼人]`。
- 明确送出已持有物：`[礼物实例:itemId:收礼人]`。插件动态 prompt 提供准确 ID；`用户` 表示全局用户。
- 用户转赠：聊天「礼物」→「我的背包」→ 选择物品 → 原生送出。
- 背包快捷赠送：在会话内预选物品打开该会话的原生赠礼。在全局背包用同一原生选择器先选角色，再到聊天确认发送。没有插件私建礼物卡／消息／记忆。
- 购物付款成功后按订单数量建独立实例，包括角色代付成功；待付款、拒绝、取消不入包。数量解析保持原有规则：1–50 单件。
- 用户背包包含已付款但尚在运输中的物品，并标注运输中；原生“购物商店”标签仍只列已到货物品。“我的背包”允许赠送当前归用户所有的物品。
- 任意当前活跃且未预留的物品，无论归用户还是角色，均可由用户编辑名称、描述、价格、来源、emoji，或确认后删除。这是用户侧世界状态管理，不表示角色主动修改或丢弃。字段可留空；编辑只改语义字段和 updatedAt，删除只设置 tombstone，不创建转移／叙事事件。只有归用户的物品可通过用户原生赠礼发送；角色仍通过既有实例赠礼协议转移自己的物品。旧编辑窗口若归属已经变化会拒绝保存，重新打开当前角色背包后可管理。
- 每个角色独立拥有物品。角色卡删除后，账本保留该 ownerId，管理器以“已移除角色”展示，不把东西归给其他角色。
- 归属不明的群聊赠礼进入“待核对礼物”，不会猜测接收人。可明确收礼人再核对。所有权冲突不会以新物品替代旧物品。

## 审计基线
2026-09-17：上游 `xiaolongbao0709/ai-virtual-phone` 和用户仓库 `Aurenchat/ai-virtual-phone` 的 main 都为 `fc65539c8494b9328ea76c1e557ec12b168e24bc`。审计未访问用户正在运行的 Float 存档；是否已有旧背包数据在插件内读取和预览，不能由代码仓库推断。

| 范围 | 原实现 | 本次处理 |
|---|---|---|
| 旧背包 | 资源仓库 `资源/Js插件/礼物背包/（9.13）背包.js`，id `gift-backpack`，3.25.0；`backpack_gifts_v1` 数组；id/title/source/value/date/sessionId/recipient/note 等。会话和 DOM 扫描、独立给予/拿取/丢弃指令、会话 prompt | 不改写旧插件；独立 ledger，预览迁移当前所有者 |
| 原生商店 | `components/shopping/shopping-app.tsx::handleCheckout` 扣款后持久化订单；`lib/shopping-storage.ts::saveShoppingState` 发 shopping-state-updated | 不改购买函数；读取支付完成订单，按原有数量规则建实例 |
| 订单赠礼候选 | `lib/shopping-gift-utils.ts::loadDeliveredShoppingGifts` 从到货订单拆单件，ID 为 order::product::unit，扫描聊天排除已送 | provider 声明管理的订单单件 ID，避免已删除/已转移物品重新由订单生成 |
| 用户赠礼 | `chat-room.tsx::sendShoppingGiftMessage` → `sendRichMessage("gift", mediaData)` | 仍调用同一个发送函数，增加 provider 验证/预留/完成 |
| 角色赠礼 | `rich-message-parser.ts` 把礼物标记转原生 gift 媒体消息；角色可以新建礼物 | message.persisted 接收新礼物；增加原生实例引用标记 |
| 礼物 payload | giftName/label/giftMerchantLabel/giftPriceLabel/giftPreviewIcon/giftTone，shoppingGiftId/giftOrderId/giftItemId 为可选追踪数据 | 新增 giftDescription/giftInstanceId/giftTransferToken/giftOwnershipStatus，老数据兼容 |
| 卡片生成 | `components/chat/message-bubble.tsx::GiftBubble` 不要求有效 product ID；可用消息 ID 出编号 | 保留卡片样式，额外显示处理/冲突状态 |
| 赠礼记忆 | 无专用“赠礼即写永久记忆”函数。gift 消息由 `llm-prompt-assembler.ts` 与 `short-term-assembler.ts` 格式化；`memory-summarizer.ts` 达阈值后写长期摘要 | 不另建或重复写赠礼记忆 |
| 单聊 prompt | `chat-engine.ts` 调 prompt.system，传 characterId/sessionId/isGroup | 动态注入该角色当前拥有的物品 |
| 群聊 prompt | `group-chat-engine.ts` 调 prompt.system，传会话和 isGroup，无单一 characterId | 仅遍历该群 participantIds，按角色单独标注 |
| 插件扩展 | 现有 transform、消息事件、插件 KV、DOM slots；缺少 item provider/原生赠礼入口/角色详情 slot | 追加可选 gifts API、购物与用户名称读取、character.details slot |
| 持久存储 | 现有 kvSet 是同步缓存 + 异步 IDB 写入，插件数据在 Float 备份前缀中 | 增加原子 IDB 读改写接口，持久写入成功后才完成账本事务 |

### 为什么不是纯插件
React 内部赠礼窗口和 `sendRichMessage` 不在插件 ctx 暴露范围，现有选择器仅接受 ShoppingGiftCandidate[]。通过 DOM 点击、私有 React fiber 或重写 fetch 猜测流程会脆弱，且无法可靠防止同物品双送。因此新增通用 provider 注册及原生窗口快捷入口，而非模拟卡片或另推聊天消息。

礼物本体不强依赖商品 ID。adapter 把 display 字段映射为 native gift 的名称、详情、价格、商家显示和图标；真实 itemId 单独存 giftInstanceId。购物订单追踪 ID 和全局物品实例 ID 是不同概念。

## 数据模型与事务
插件 id：`auren.float-possessions`。数据位于原生插件数据桶：
`chat_plugin_data_v1:auren.float-possessions` → `ledger-v1`。

- itemId：创建一次，不随所有者／名称／来源变化。
- ownerId：`user` 或角色全局 Character.id；不使用会话 ID 作为所有权。
- display：name/description/price/source/emoji（字符串，允许空）。
- provenance：sourceType、sourceId、creatorId、订单追踪信息（只记录可证明的信息）。
- transferHistory：fromId/toId/at/reason/eventId。
- createdAt/updatedAt；购物可有 availableAt。
- 删除只设置 deletedAt/updatedAt，不清空展示字段、itemId、provenance、transferHistory、events 或 shopKeys。所有活跃视图与候选过滤 tombstone；ownerId 保留末任所有者用于审计，已删除实例没有活跃所有者。不删除聊天礼物消息或购物订单。
- events：按消息 ID、订单单件 ID 或旧快照 ID 去重。
- reservations：唯一物品发送预留。原生发送返回 false 时释放；成功后移动原实例。双击／多个标签页争抢依赖 IDB 原子读改写。
- 原生发送后若账本写入失败，保留 token；重启后以原生消息中的 token 恢复。无消息的过期预留 5 分钟后释放。
- Float 聊天数据库本身仍使用原生异步写入，这不是跨聊天 DB 与插件 KV DB 的分布式原子事务；不声称断电下两库严格同时提交。插件不会更改原生聊天落库语义。

### 新增宿主 API
- `ctx.gifts.register({label,list,send})`：原生赠礼 provider 注册，禁用自动撤销。
- `ctx.ui.slot("chat.inputToolbar", ...)`：线上扩展栏“背包”注册，点击调用同一个账本 viewer；slot 清理移除按钮，不使用 DOM 扫描／注入 React 树。
- `ctx.gifts.open({itemId,sessionId?})`：原生赠礼入口。
- `ctx.gifts.changed()`：通知候选更新。
- `ctx.data.shopping.get()`：原生订单只读快照。
- `ctx.data.user.name(characterId?,isGroup?)`：正确识别用户在群聊／单聊中的显示名。
- `ctx.system.storage.atomic(key, updater)`：updater 必须同步；IDB 事务 fresh read + commit，拒绝时不更新缓存。
- `ctx.system.storage.readOther(pluginId,key)`：只读迁移来源；无写入其他插件数据的方法。
- `character.details` 插槽提供 characterId。
以上为 apiVersion 1 的增量可选扩展，不破坏旧插件。

## Prompt 与边界
仅注入当前归属、名称、描述、价格／价值、可编辑来源和实例引用 ID。原生消息与记忆摘要共用 gift-prompt.ts，保留名称、描述、价格、来源及消息已有 giver，并明确它是历史赠礼而非当前持有。用 JSON 编码语义字段，不注入 token、reservation、ledger key 或内部 provenance ID。角色不需要先拥有物品才能创造新礼物，不授予自动拿取用户物品、删除或随意编辑后台物品的能力。

每角色约 6000 字符预算，描述缩略到 180 字符、来源到 100 字符，超出时明确标注省略件数。大型背包仍可在管理 UI 查看全部。群聊共享同一模型请求，按角色分段，并非群内模型层面的保密隔离。后台未经过 prompt.system 的外部自动化／独立云端聊天路径不在此版本的动态注入覆盖范围。

## 迁移与备份
- 首次启用不自动从历史礼物文本重建全部物品。
- 已支付的历史订单标为 baseline；仍可经原生商店赠礼，发生新的明确转赠后才登记所有权。待代付旧订单在本插件观察到完成付款后正常入包。
- 旧背包“user”记录可导入；“character”记录仅在 sessionId 能唯一定位现存角色时导入；群礼物堆和无法定位的记录跳过。
- 迁移创建 `legacy-snapshot` provenance；不虚构 earlier transfer history，不改写原旧记录。重复导入不产生新实例。
- 1.0.1 宿主自动暂停旧背包执行与 prompt；仅对确认从未入新账本的独立旧物品使用手工迁移，不将陈旧归属覆盖当前账本。
- 插件数据仍在 Float 完整备份的 `chat_plugin_data_v1:` 范围内。可额外导出 JSON 账本用于核对；恢复请使用 Float 原生完整备份。
- 禁用插件保留数据；卸载插件会由 Float 原生机制删除其私有数据桶，卸载前请备份。

## 验证
`node scripts/test-float-possessions.mjs` 覆盖原 18 个场景及新的所有权视图、旧插件隔离、权限、语义 prompt、删除审计、购物 tombstone、v1 兼容和 DOM 适配场景。DOM 测试执行真实插件 setup/按钮操作与真实 gift bridge，使用模拟浏览器节点及存储；不替代手机渲染与交互验收。

本批保持未发布版本 1.0.1；账本仍是 version 1，扩展入口和管理权限调整不需要数据迁移或卸载。更新同 ID 插件源码即可保留手机数据。最新回归增加角色编辑／删除、无伪转移、角色购物 tombstone、唯一 slot 注册／重挂载、sessionId/characterId 转发；原有赠礼、价格、恢复、购物和删除检查保留。完整 build 在临时源副本执行，避免生成脚本触碰主工作区的受保护文件。具体结果见交付报告。`.github/workflows/float-possessions.yml` 继续运行同一测试脚本及 TypeScript 检查。
1. 更新宿主后导入插件，打开角色档案背包及聊天背包入口。
2. 让 Jay 用原生礼物标记送新刀，确认卡片与用户背包。
3. 在编辑器修改来源后，从原生赠礼“我的背包”送给 Sebastian。
4. 核对同一 ID、用户移除／角色获得；让 Sebastian 正常聊天确认能读取持有物。
5. 群聊新礼物指定用户／另一个角色各一次；指定旧物品 ID 转赠一次。
6. 购物同商品 2 件，检查待代付不入包、完成付款入 2 件、到货后商店列表正确。
7. Float 完整备份、刷新与恢复；删除物品后刷新不复活。
