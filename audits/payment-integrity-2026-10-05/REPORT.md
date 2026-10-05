# Phase 1 Payment Integrity Foundation — 本地实现与验证

基线：`138e18114ae0761329dbb5728b0a158774ee8249`。日期：2026-10-05。

发布决策（2026-10-05）：用户确认将旧 iMessage preview 的 3 项失败视为 baseline-known failures，明确放行 Phase 1。这 3 项在未改动的同一基线上复现，未修改主题或测试断言。最终提交仅限本报告列出的 payment integrity 代码、测试和报告；不扩展功能。

## 原子边界与数据

实际钱包不是独立 WalletDB，而是 `AiPhoneKvDB.entries` 的 `ai_phone_wallet_state_v1` JSON。
新增可选 `paymentLedger`，保存在同一记录中。因此沿用 Dexie version 1，无新 store、无 eager migration、无 ChatDB 批量改写。

`paymentLedger = { version: 1, records, drafts }`。
每个 payment record 保存稳定 payment ID、session、类型、方向、总分数、份数、备注/参与者、状态、claims、operations、legacy 关联和发送 publication 标记。不保存完整聊天消息。
operation 保存 key、paymentId、action、actorId、deltaFen、amountFen、committedAt、transactionId。
key 为 `JSON.stringify([paymentId, action, actorId])`；用户 identity 固定 `self`，角色使用宿主角色 ID。

所有钱包写入口都使用现有 `kvUpdateAtomic` 的同一 entries rw transaction：fresh read → 查凭据/验证 → 余额、流水、ledger 一起序列化 put → commit 后更新缓存并广播。
进程内 busy ref 只是 UI 防连点；最终幂等依靠 IndexedDB rw transaction 串行化与稳定 key。
银行卡/购物/自定义 App 等旧入口改为等待原子提交，保留原业务节点；本轮没有为它们新增独立业务幂等协议。
可见流水继续截断到 300 条；ledger 不随流水裁剪。

## 支付状态与恢复

- send：在既有发送扣款节点 debit。草稿 ID 在 modal 打开时预留并持久保存，失败重试/第二个标签页复用；成功发布后才退休。失败扣款不留下已承诺的金额记录，允许修改草稿金额。
- collect / claim：钱包提交后才更新消息。重复操作返回之前的提交结果；红包每个 actor 至多一份。
- return：只允许 pending、无已领取份额的交易；用户发出交易只退回实际已扣的金额。collect 和 return 互斥。
- 群红包角色“退回”原行为仅生成通知，本轮仍然保留，不新增整包退回/剩余退款时点。
- 角色→角色不创建角色钱包，只推进已有交易状态和份额。
- 群 action 保留原指令中的参与人语义：当前 speaker 用真实 characterId；明确指定的其它群成员必须能在当前成员表唯一映射，否则停止。

ChatDB 新增可选 `paymentId/paymentProtocol/paymentRevision`，仅作为投影。
消息保存失败后再次操作只补投影，不重复钱包 effect。
详情打开时按钱包 ledger reconcile；revision 防止较旧的异步投影覆盖较新完成状态。
发送消息未成功落库时，会话下次进入恢复该未发布 payment 的稳定消息 ID；已发布且后来删除的消息不会自动复活。
消息发布与钱包不是跨库原子事务；没有声称二者能同时 commit。

## Legacy 政策

- 无新协议的旧终态：作为既成事实，记录无资金变化的 accepted-terminal 状态，不 credit/debit，不伪造原始 debit。
- 旧 pending 收款/领取：第一次实际执行才建立 operation。
- 旧 pending 用户发送退款：验证 walletTransactionId 指向余额账户 payment/debit、金额相符、无已有退款 ID、无已使用该 debit 的其它 ledger 记录。保留流水中有匹配金额/备注的退款凭据时，不能确认未退款，拒绝自动再退；无关退款不阻止验证。
- 原 debit 被裁剪或证据不足：不改变余额、不标记已退回，提示：
  `该旧交易缺少可验证的原始扣款记录，无法安全自动退款，请人工核对。`
- 已有退款凭据则报告已存在退款，不重复资金动作。
- 新协议消息缺失 ledger（如不完整恢复）：明确报错，不猜余额是否已变化。
- 不运行批量历史迁移，不访问真实用户浏览器存档。

## 备份 / 恢复

余额、流水、ledger 在同一个钱包 JSON，既有完整备份与使用同一 data-management 导出/导入的同步路径携带整条记录。
钱包导出从 durable IDB 读取，旧标签页缓存不会盖掉它。
导入在单个原子 transaction 中恢复完整钱包快照；禁止独立合并 ledger 与另一份余额。overwrite=false 时已有钱包保持原样并记 skipped。
恢复旧无 ledger 的钱包仍支持，旧终态不补款。只恢复聊天、不恢复配套钱包的新协议交易会 fail closed。
测试使用实际 exportSource/importSource；未连接真实云账号验证网络同步，也没有修改云同步协议。

## 金额及红包

CNY 输入转 integer fen，边界采用十进制 half-away-from-zero 四舍五入。余额写回兼容原 yuan number；超出安全/可精确保存范围拒绝。
红包全程使用整数分：每人至少 1 分，二倍均值随机上限同时预留其他人的最低份额，最后一份为精确余额。
`0.01 / 4` 被拒绝；手动输入和 AI 红包解析均校验。没有新增币种、FX、picker 或支付卡片样式。

## 文件清单

- `lib/payment-money.ts`：整数金额与红包分配。
- `lib/payment-ledger.ts`：持久凭据、原子状态机、legacy 验证、发送草稿。
- `lib/payment-chat.ts`：消息投影、发送发布/恢复、reconcile。
- `lib/wallet-storage.ts`、`lib/wallet-types.ts`：原子钱包写入口、兼容 ledger。
- `lib/chat-storage.ts`：稳定支付消息 ID、等待 durable projection、revision。
- `lib/data-management/idb.ts`：钱包 durable 导出及整快照原子恢复。
- `lib/rich-message-parser.ts`：拒绝金额不足的 AI 红包。
- `components/chat/chat-room.tsx`：现有支付动作接入、群角色 identity、发送恢复。
- `components/chat/message-bubble.tsx`：详情先结算后投影、错误提示和 busy guard。
- `components/chat/rich-input-modals.tsx`：稳定草稿 ID、金额校验、异步提交。
- `components/chat/wallet-panel.tsx`、`components/shopping/shopping-app.tsx`、`lib/custom-app-host-api.ts`：旧钱包入口等待原子提交，避免旧 cache snapshot 覆盖账务。
- `scripts/payment-integrity/fixture.ts`、`scripts/test-payment-integrity.mjs`：真实浏览器 IndexedDB/React 故障注入。
- `audits/payment-integrity-2026-10-05/REPORT.md`、`audits/payment-integrity-2026-10-05/results.json`：必要审计报告与最新专项结果。

## 验证

执行 `node scripts/test-payment-integrity.mjs`：25 个场景通过，详情见 `results.json`。
包括：12 次并发 collect、双标签页竞争、send/refund 双击、非法 collect/refund 互斥、事务失败回滚、钱包成功/ChatDB 失败重试、过早完成消息修复、legacy terminal/pending/退款证据、发送失败后恢复、旧写入口保留 ledger、300 条裁剪、刷新、实际备份恢复、旧 wallet 快照、乱序投影、真实 MediaDetailModal/RedPacketModal 双击。
10,000 个随机红包 + 边界组，总计约 50 万份，全部正整数分且总额严格守恒。

其它检查：
- shopping share purchase：15 项通过。
- shopping product share：通过。
- 独立 TypeScript (`npx tsc --noEmit --incremental false`)：通过。Next 构建配置跳过类型检查，因此独立执行。
- production build：隔离 worktree 通过（最终生产文件逐个 hash 对齐，不包含主工作区其它脏文件）。
- `git diff --check`：通过。
- iMessage 真实 ChatRoom 部分：通过，0 uncaught errors。
- iMessage 旧 preview fixture：失败 3 项；同一未改基线也失败：第二聊天室不接续第一聊天室、群聊不合并不同发言人、群聊保留成员头像和姓名。

## 发布与限制

此前因 3 项旧 preview 失败暂停发布；用户确认基线复现后解除这 3 项阻塞。发布前重新执行支付专项、随机红包、shopping 回归、独立 TypeScript、隔离 production build 和 diff check。最终 commit SHA / push 状态以 Git 和交付消息为准。
未动主题 CSS、Message Bridge、Reactions、Long Press、PWA、ChatDB 冷启动、世界卷宗；主工作区原有微信生成文件及其它 untracked 内容未纳入本轮。
未做 iPhone WebKit 实机验收。浏览器测试采用隔离 origin 的 Chromium/Edge 真实 IndexedDB，不等同于 iPhone 已通过。
ledger 当前随钱包 JSON 原子保存，随历史支付数量增长而增长；没有为了节省空间裁剪幂等凭据。
回退必须保留配套钱包/ledger 完整快照；不要让旧版整钱包缓存写入器处理已经包含新 ledger 的活跃数据。GitHub 推送不等于线上已部署；本次测试没有操作用户存档。
