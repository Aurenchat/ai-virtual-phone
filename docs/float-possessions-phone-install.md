# Float 物品持有：手机安装与验收

## 已安装 1.0.0 的升级

当前修复为 1.0.1。在已部署的 `f1dfa85` 上使用增量 `patches/float-possessions-v1.0.1.patch`，然后同 ID 覆盖导入新版 JS；不要卸载 possessions 或清空数据。以下 core/full/optional-ui 补丁与首次安装步骤描述的是 1.0.0 基线，新的底部背包需要本次增量核心修改。

- 插件通过现有 `chat.inputToolbar` slot 注册「聊天 → 线上 → 扩展栏 → 背包」，复用账本 viewer。轮廓 SVG 采用现有 Lucide Backpack 路径。未发布的 `PossessionsBackpackButton` 已移除，不需要新的专用核心按钮。
- 修改 `lib/chat-plugin-storage.ts` / `lib/chat-plugin-runtime.ts`：有 possessions 安装记录时，阻止旧 gift-backpack 执行与旧 prompt 注入，保留其存档；没有 possessions 的安装不受影响。
- 新增 `lib/gift-prompt.ts`，修改 `lib/llm-prompt-assembler.ts` / `lib/short-term-assembler.ts`：将编辑后的描述、价格、来源保留在收礼模型和记忆上下文中。
- `components/chat/chat-room.tsx` 为现有扩展 slot 补传 sessionId；`components/chat/chat-plugin-slot.tsx` 补传 characterId，使角色入口正确定位。`lib/native-gift-bridge.ts` 保留购物候选校验与 provider 重载保护；不维护第二份库存。

ledger-v1 无需 schema 迁移。旧 UI 中的陈旧行在切换视图后不再显示，不删除其历史存档，不自动猜测／合并 itemId。若测试礼物在 ledger 中确实只有一个 itemId 且 ownerId 已为收件人，无需手工清理；否则先导出账本核对，不要再次导入同一测试礼物的旧快照。仅部署宿主不能替换手机已安装的插件源码，必须覆盖导入 1.0.1。

### 本次重点验收

- [ ] 聊天标题没有额外“我的背包”；线上扩展栏只有一个“背包”（轮廓图标），重开扩展栏不重复；设置入口和角色入口仍可用。
- [ ] 我的物品有编辑／删除／赠送；角色物品有编辑／删除，没有用户赠送按钮。用户与角色的物品均可编辑名称、描述、价格、来源和图标。
- [ ] 管理角色物品不新增转移记录或叙事消息，不改变所有者、itemId、provenance 和 dedup 索引；确认删除后保留 tombstone 与末任所有者。
- [ ] 转赠后所有用户背包视图立即移除，角色包只显示一件；旧编辑窗口保存被拒绝，刷新后不恢复旧归属。
- [ ] 修改价格／描述／来源后转赠，收件角色上下文包含这些语义字段，没有转移 token。
- [ ] 删除先确认，取消不改动；确认后普通背包和原生赠礼候选立即消失。
- [ ] 删除后重载、购物同步和消息重放不产生替代实例；原聊天卡片和订单仍在。
- [ ] 原 v1 ledger 的 itemId、归属、provenance、transferHistory、去重索引和 tombstone 保留。

## 结论

`plugins/float-possessions.js` 不是当前未修改 upstream Float 的纯单文件插件。它是最终可导入的插件文件，但运行前必须先把 `patches/float-possessions-core.patch` 合并到 Float 宿主、重新构建并部署。未打核心补丁时，插件会在 `setup()` 阶段明确报错并停止，不会退化到不安全的 DOM 模拟或复制礼物消息。

补丁基线：`fc65539c8494b9328ea76c1e557ec12b168e24bc`。

## 手机安装顺序

1. 备份手机 Float 的完整数据；如已使用 `gift-backpack`，先禁用但不要卸载。
2. 在 Float 源码基线上运行 `git apply --check patches/float-possessions-core.patch`，再运行 `git apply patches/float-possessions-core.patch`。
3. 如需角色详情页快捷入口和礼物卡处理状态文字，再应用 `patches/float-possessions-optional-ui.patch`。
4. 运行 `npm ci`、`node scripts/test-float-possessions.mjs`、`npx tsc --noEmit`、`npm run build`，然后部署这份宿主到手机实际使用的站点。
5. 下载 `plugins/float-possessions.js` 到手机，在 Float「聊天 → 主页 → 扩展插件 → 导入插件」中选择该文件并启用。
6. Float 会提示插件与宿主同权限。确认文件校验值与交付结果一致、来源可信后，再由你在手机上确认安装。
7. 打开「我的背包」。如需迁移旧背包，先预览、核对归属，再确认导入。

## 必需的宿主文件

| 文件 | 为什么必需 |
| --- | --- |
| `lib/kv-db.ts` | 提供 awaited IndexedDB fresh-read/read-modify-write 事务；预留和所有权移动不能依赖旧标签页缓存。 |
| `lib/chat-plugin-types.ts` | 声明 gifts、shopping/user 只读数据、atomic/readOther 存储接口及新增 slot；这是宿主构建时的 API 合同。 |
| `lib/chat-plugin-runtime.ts` | 把原生订单、用户名称、原子存储、迁移读取和 gift provider/open/changed 能力安全暴露给插件，并在禁用时注销 provider。 |
| `lib/native-gift-bridge.ts` | 合并原生商店与插件候选、屏蔽已由账本管理的购物实例、委托预留发送，并保存原生赠礼快捷入口队列。 |
| `components/chat/gift-picker-modal.tsx` | 在原生礼物选择器中提供「购物商店 / 我的背包」、异步候选、预选、忙碌和错误状态。 |
| `components/chat/chat-room.tsx` | 继续走原生 `sendRichMessage("gift")`，同时让 provider 在发送前预留、发送后提交；写入 itemId/token 元数据并消费快捷入口。 |
| `components/chat/native-gift-launcher.tsx` | 全局背包快捷赠送先选角色，再进入对应原生聊天礼物流程；会话内快捷赠送直接预选。 |
| `components/chat-plugin-bootstrap.tsx` | 在现有插件运行时旁挂载全局 native gift launcher。 |
| `lib/chat-storage.ts` | 保存稳定实例 ID、转移 token、描述和所有权处理状态，供重载恢复和原生卡片兼容使用。 |
| `lib/rich-message-parser.ts` | 把角色输出的 `[礼物实例:itemId:收礼人]` 解析成普通原生 gift 消息，使已有实例可在角色之间移动而不复制。 |

`lib/shopping-gift-utils.ts` 仍由 gift bridge 调用，但本实现不再修改它；upstream 现有版本即可。

## 可选宿主集成

| 文件 | 省略后的影响 |
| --- | --- |
| `components/chat/message-bubble.tsx` | 省略后核心所有权和恢复仍工作，但原生礼物卡不会显示「物品处理中 / 物品转移待核对」。 |
| `components/phone-character-app.tsx` | 省略后仍可在插件设置的背包 owner 下拉中查看、编辑或确认删除角色物品，但角色详情页没有「查看角色背包」快捷按钮。 |

这两项位于 `patches/float-possessions-optional-ui.patch`，不在最小必需核心补丁内。

## 测试、CI 与文档文件

- `scripts/test-float-possessions.mjs`：Node 账本／UI adapter 回归测试；手机运行时不加载。
- `.github/workflows/float-possessions.yml`：CI；手机运行时不加载。
- `docs/float-possessions.md`：设计、数据和边界说明；手机运行时不加载。
- `docs/float-possessions-phone-install.md`：本安装与验收说明；手机运行时不加载。
- `patches/*.patch`：宿主源码交付物；构建部署后不由手机运行时加载。

## 手机手工验收清单

- [ ] 插件启用后无运行时错误；插件禁用后原有聊天、购物和礼物功能仍可使用。
- [ ] Jay 通过普通 `[礼物:名称]` 赠送新物品；原生礼物卡、聊天回复和既有记忆路径正常，用户背包只新增一个实例。
- [ ] 导出账本记录该 `itemId`；编辑并清空名称、描述、价格、来源、emoji 后刷新，字段保持且 owner/history/provenance 不变。
- [ ] 原生礼物窗口「我的背包」把该物品送给 Sebastian；用户背包消失、Sebastian 背包出现、`itemId` 不变、只追加一次转移且没有副本。
- [ ] 在会话内点背包「赠送」时原生礼物窗口打开并预选；在全局背包点「赠送」时先选角色再进入对应原生会话。取消不转移，确认一次只发送一次。
- [ ] 连点两次发送只产生一个礼物消息和一次所有权移动；原生发送拒绝或取消后物品仍归用户且可再次赠送。
- [ ] 如能使用调试构建注入存储失败：预留写失败时不产生原生消息；原生消息已写而账本提交失败时，刷新后按 token 恢复且不重复移动。
- [ ] 购买单件和多件商品：待付款、拒绝和取消不入包；付款后每个数量生成独立实例；运输中只在用户背包显示，到货后可从购物标签选择。
- [ ] 已转移或删除的购物实例不因订单扫描重新出现；旧已支付订单只 baseline，不猜历史归属。
- [ ] 角色详情快捷入口（若应用可选补丁）和插件设置 owner 下拉都显示每个角色独立背包；Sebastian 的普通聊天能读到自己的持有物，其他角色单聊不能读到。
- [ ] 群聊中测试角色→用户、角色→角色的新礼物，以及 `[礼物实例:itemId:收礼人]`；未知 ID 或不明确收礼人进入冲突，不克隆物品。
- [ ] 旧背包迁移先预览；重复导入不重复，群聊堆或无法确定 owner 的记录被跳过，旧插件数据未改写。
- [ ] 完整备份、刷新、恢复后物品和历史一致；删除后的 tombstone 不被消息或订单重放复活。
- [ ] 回归普通单聊、群聊、原生礼物卡、聊天消息、记忆摘要、购物到货和原有商店赠礼。
