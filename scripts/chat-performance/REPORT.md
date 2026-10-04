# Float 移动端性能修复：阶段 2 验证报告

已完成实现、synthetic 回归、前后基准、diff review，以及指定目录 Message-Bridge 文件同步。未 commit、未 push、未部署；没有访问真实浏览器档案、手机数据或用户存档。线上仍按用户提供的 0389dd2 作为参照。

## 测量方法与边界

- Before：git show 读取部署 commit 0389dd2 核心；Bridge 使用指定安装文件 music.1 的冻结测试副本 bridge-before.js。After：当前 HEAD 4e530d04 加本轮修改、Bridge music.2。HEAD 与线上 chat-storage 原有差异仅两个音乐字段类型声明，本轮没有改它们。
- Windows Edge 154、headless、402×874、全新隔离浏览器 context；真实 Dexie/IndexedDB materialization，synthetic 短文本。设置/角色/插件依赖 mock，hydrate 的持久化辅助写入 mock，测量不包含真实媒体解码或实际迁移写盘延迟。真实 ChatRoom 验证另用本地临时构建和隔离 context。
- 同一 scripts/test-chat-performance.cjs 的 --baseline 开关；每项中位数 3 次，messages 读取 7 次。本地最终完整结果为 before-final.json / after-repeat.json，重复输出、截图和临时 JSON 不纳入提交；这些文件可由文末命令重新生成。JSON 中 0 表示低于约 0.1 ms 计时分辨率，不是零成本。
- 5k/10k/25k/50k × 50/200 sessions；补充 50k 随机顺序、80% 消息集中一个会话、缺少 order、各规模 1%/5% legacy tool_result 和独立 tool_notice fixture。不是所有变量的笛卡尔积。主表通过 IDB 主键读取，variations 使用固定种子的随机排列。
- init、hydrate、preview、contacts 各自独立测量，不应直接相加。preview/contacts 表项是重复调用的中位数，After 可命中索引；hydrate 包含建索引及首次预览准备。

## 主基准（ms，Before → After）

| 消息数 | 会话数 | hydrate | loadChatSessions | loadChatMessages(s0) | 会话列表准备 |
|---:|---:|---:|---:|---:|---:|
| 5000 | 50 | 26.7 → 21.6 | 1.5 → <0.1 | <0.1 → <0.1 | 19.3 → 0.1 |
| 5000 | 200 | 35.1 → 22.1 | 5.6 → <0.1 | <0.1 → <0.1 | 78.6 → 0.1 |
| 10000 | 50 | 53.1 → 43.2 | 4.1 → <0.1 | <0.1 → <0.1 | 50.5 → <0.1 |
| 10000 | 200 | 75.2 → 43.3 | 13.8 → <0.1 | <0.1 → <0.1 | 213.4 → 0.1 |
| 25000 | 50 | 136.7 → 112.1 | 8.4 → <0.1 | 0.2 → <0.1 | 97.0 → <0.1 |
| 25000 | 200 | 180.9 → 110.9 | 27.4 → <0.1 | 0.1 → <0.1 | 445.8 → 0.1 |
| 50000 | 50 | 296.1 → 223.0 | 18.0 → <0.1 | 0.3 → <0.1 | 215.3 → 0.1 |
| 50000 | 200 | 363.2 → 348.3 | 37.8 → <0.1 | 0.2 → <0.1 | 538.8 → 0.2 |

50k / 200 sessions 的 initChatDb 为 222.8 → 331.7 ms；hydrate 两次最终 After 为 345.8 / 348.3 ms。因此这个场景端到端启动收益仅约 4%，不能用纯 CPU 热路径收益代替启动收益。chat-db.ts 和 toArray 没有改变，IDB、GC、运行环境及保留的索引引用仍影响总时间；没有足够证据把这部分差异单独归因于某一项。

50k / 50 sessions 的 preview 重算 16.8 → <0.1 ms；contacts recovery 15.9 → <0.1 ms。

## Legacy normalize（随机输入，ms）

| 消息数 | 会话数 | 场景 | Before | After |
|---:|---:|---|---:|---:|
| 50000 | 20 | 0% tool_result | 45.4 | 0.5 |
| 50000 | 200 | 0% tool_result | 74.0 | 0.5 |
| 50000 | 50 | 0%，80% 单大号 | 26.4 | 0.6 |
| 50000 | 50 | 0%，缺少 order | 141.1 | 0.4 |
| 5000 | 50 | 1% tool_result | 11.9 | 10.7 |
| 5000 | 50 | 5% tool_result | 33.3 | 10.4 |
| 10000 | 50 | 1% tool_result | 35.1 | 20.3 |
| 10000 | 50 | 5% tool_result | 125.7 | 20.3 |
| 25000 | 50 | 1% tool_result | 194.1 | 50.9 |
| 25000 | 50 | 5% tool_result | 857.6 | 51.7 |
| 50000 | 50 | 1% tool_result | 706.0 | 101.1 |
| 50000 | 50 | 5% tool_result | 3230.6 | 101.3 |
| 50000 | 50 | 1% tool_notice | 787.9 | 106.0 |

精确 rawResponseText、严格 60 秒窗口、directive、batch 分组、scoring、order 调整、前一 candidate 对后续匹配的影响均与原实现作差分比较。没有新增消息迁移：原有 legacy 规范化输出与原实现一致，仍可能产生原先已有的规范化写入。

## Bridge 完整 refresh（ms，中位数）

| 消息数 | 会话数 | DOM 消息行 | Before | After |
|---:|---:|---:|---:|---:|
| 5000 | 50 | 50 | 5.7 | 0.8 |
| 10000 | 50 | 50 | 11.9 | 0.7 |
| 25000 | 50 | 50 | 30.8 | 0.7 |
| 50000 | 50 | 50 | 40.8 | 0.7 |
| 50000 | 200 | 50 | 193.9 | 0.7 |
| 50000 | 50 | 500 | 51.6 | 6.6 |

这里是强制 metadata 更新的完整 refresh，包含 sessions.get、messages.list、Map 建立与 updateRoom；500 行样本使用 80% 消息集中一个会话。不是只测缩短后的 updateRoom。

| 触发 | Before sessions.get / messages.list | After |
|---|---:|---:|
| idle | 0 / 0 | 0 / 0 |
| 100 characterData writes in one task | 1 / 1 | 0 / 0 |
| 12 characterData writes across frames | 12 / 12 | 0 / 0 |
| 20 scroll changes | 0 / 0 | 0 / 0 |
| input event | 0 / 0 | 0 / 0 |
| one new message plus persisted hook same task | 1 / 1 | 1 / 1 |
| persisted hook then DOM in a later frame | 2 / 2 | 1 / 1 |
| text update with 1 visible + 4 hidden rooms | 5 / 5 | 0 / 0 |

1 visible + 4 hidden 的正文变化：5/5 → 0/0，原完整 refresh 164.0 ms；现在不调度该 refresh。文字变尺寸仍由 ResizeObserver 更新 outline，不意味着浏览器布局/绘制为零。隐藏房间恢复显示同步 1 次；隐藏期间释放 Bridge metadata Map，保留聊天室 DOM。

## 实现与复杂度

- _messagesCache 仍是唯一内存消息源。按 session 建原始引用桶，保持旧混合 order 输入顺序；另缓存排序视图和最后可见消息。没有深复制 ChatMessage。
- 普通 loadChatSessions() 从 O(S×M + Σ n_s log n_s) 历史扫描/排序变为 O(1) 缓存读取。插件 sessions.get 仍需 O(S) find，但不再修复所有预览。
- loadChatMessages(s) 从每次 O(M + n_s log n_s) 变为缓存命中 O(n_s) 浅复制；limit 只复制所需 k 项。失效后首次需 O(n_s log n_s) 排序，不扫描全局 M。原 comparator 和返回对象引用语义保留。
- hydrate 建桶 O(M)，每个会话首次排序总计 Σ O(n_s log n_s)，contacts/preview 复用最后消息；不再每个会话重复全局 filter。IndexedDB 全量 materialize 仍保留。
- 消息修改集中经过索引更新辅助函数。普通 append 保留已排序会话的增量路径；旧混合 order 回退同一 comparator。单条更新/删除仍可能有原有全局 id 查找；批量替换/reassign/merge/reindex 允许 O(M) 重建受影响桶。没有宣称所有写操作 O(1)。
- lastMessageId、lastMessagePreview、updatedAt 在消息变化和显式 hydrate/save 修复边界维护。角色、用户身份、绑定保存发预览上下文通知，避免姓名预览因廉价读取而变旧；只处理缓存的末条消息，不重写历史。普通 push 只持久化一次会话预览。
- 会话列表排序前准备标量时间，comparator 只读值。排序部分 O(S log S)，末条查询复用缓存；其他离线记录读取逻辑保持原样。
- legacy 无候选时 O(M) 探测后返回，无全量 Map/排序；有候选时一次建立精确文本、directive/时间、batch 索引，按实际匹配数查询。消除逐 candidate 的全 M map/filter；重叠匹配极多仍可能产生大量候选，不能宣称严格线性最坏界。
- Bridge 分开 metadata、DOM 外观、标题/时长、播放状态、尺寸。主体 observer 不监听 characterData；精准文本 observer 只覆盖标题和 voice duration。保留 grouping、方向、群聊、媒体、音乐/image outline、壁纸、ResizeObserver 缓存和 owned-node 防自激。
- 新增可选 revision API 与批量失效事件；旧插件无需修改。新 Bridge 在旧核心上使用每 2 秒、仅可见 room 的同步兜底；在新核心上只检查 O(1) revision，未变化不读完整数据。建议核心与 Bridge 配套测试。

## 临时数组与内存

消除了每次会话读取、每会话 preview、contacts recovery 的全局 filter/sort，以及 legacy 每候选全 M 临时数组。代价是常驻原始引用桶和排序引用数组，合计 O(M) 引用空间，以及 Map/末条缓存 O(S)。消息对象不深复制；公有 messages.list 仍返回独立浅数组。Bridge 只保留可见 room 的 metadata 映射，隐藏时释放。

本轮没有测得 iPhone heap 峰值或 GC 时间，因此不声称固定内存降低比例，也不把 1.6GB 站点存储解释成 JS heap。OOM、WebKit 进程终止、主线程长任务仍需实机证据区分。

## 回归结果

- 原实现基线：1,347 checks；修复后：1,355 checks，全部通过。单聊、群聊、push/edit、delivery/media status、delete/delete below、Retry below 的共享删除原语、撤回、mediaData/mediaUrl、voice 内存与磁盘回退、parts/batch/group round 替换、图片提示词同步、reassign、merge、import/idempotence、reindex、last id/preview/updatedAt、顺序/浅副本、插件 API 映射、随机混合 order、legacy 差分、revision 与无写副作用读取、一致性断言和姓名上下文变化。
- 真实 ChatRoom 浏览器：15 checks 通过；初始 50、加载更多 +30、编辑、分组、方向、壁纸、语音/图片/音乐、安全模式 hydrate 仍执行而 plugin setup 跳过，无 page error。
- Bridge 专项浏览器：26 checks 通过；隐藏/恢复、同 revision 切换会话、正文零读取、标题/时长/播放、音乐 resize、群聊 sender、静默变更 revision 兜底、旧 host 定时兜底及 cleanup。
- TypeScript：npx tsc --noEmit --incremental false 通过。git diff --check 通过。未运行会改共享 Next 构建输出的完整 production build；真实组件通过隔离临时 webpack 构建。没有声称完整应用 E2E、实际 Retry 按钮全流程或 iPhone 实机已经验证。

## 文件范围与交付

- lib/chat-storage.ts
- lib/chat-plugin-runtime.ts
- lib/chat-plugin-types.ts
- lib/character-storage.ts
- lib/settings-storage.ts
- components/chat/chat-message-list.tsx
- themes/imessage-native-day/iMessage-Message-Bridge.js
- 新增四个专项测试脚本：scripts/test-chat-storage-performance.cjs、test-chat-performance.cjs、test-chat-performance-browser.cjs、test-message-bridge-performance.cjs。
- scripts/chat-performance/：提交可复现所需的 harness、冻结原 Bridge 和此报告；各轮 JSON、截图与临时 verification 文件只保留在本地，不 stage。
- 指定外部 Bridge 已同步：C:/Users/Administrator.DESKTOP-068VNB6/Desktop/float插件/iMessage插件/iMessage-Message-Bridge.js。与仓库展示源码 SHA256 均为 b0569e8994003043d9036e8df2e329f8597cc54c2bf78aae157c0cc8d6cd5fc4.

未编辑 Reactions、Long-Press、Toolbar、主 CSS 或他窗未完成文件。外部三份保护插件 SHA256 与开始一致。工作区原有无关改动及未跟踪文件保留，因此不能把整个 git status 当成本轮修改集合。没有 staging、commit、push。

## 实机验收建议与剩余风险

建议进入手机实机测试，但尚不能宣告闪退已解决。使用新核心加 music.2 Bridge，依次观察普通/安全模式冷启动、大会话上下滚动、媒体与语音、切换多个已访问房间、编辑删除/撤回与会话列表预览。保留相同数据与插件状态作对照，不清空站点存储。

全量 IDB materialization、富媒体解码、已加载消息 DOM 数量、GPU 合成仍在；世界观/关系图与记忆列表未在本轮改造。若这些场景仍崩，需要独立实机采样。浅数组内的对象引用兼容旧 API；直接绕过存储 API 改对象不会触发索引维护，debug/test 一致性断言可发现这类问题。

复跑命令：

~~~powershell
node scripts/test-chat-storage-performance.cjs --baseline
node scripts/test-chat-storage-performance.cjs
node scripts/test-chat-performance.cjs --baseline --out=scripts/chat-performance/before-new.json
node scripts/test-chat-performance.cjs --out=scripts/chat-performance/after-new.json
node scripts/test-message-bridge-performance.cjs
node scripts/test-chat-performance-browser.cjs
npx tsc --noEmit --incremental false
git diff --check
~~~

性能基准串行运行，避免与其他重负载构建或测试同时进行。
