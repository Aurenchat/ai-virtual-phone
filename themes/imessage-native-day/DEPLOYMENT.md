# iMessage Native Day alpha.5 测试部署

本次 main 更新只部署宿主适配，供 iPhone 真机验收，不代表 alpha.5 已通过实机验收。不会自动改写用户会话、插件安装配置或数据库。

## 启用

1. 等待 main 对应 Netlify 生产发布完成，再更新/重载线上 Float。先保留现有会话 CSS 和 alpha.4 插件副本。
2. 在目标会话自定义 CSS 中完整替换为本目录 `iMessage-Native-Day.css`，不要追加到旧 CSS 或放进全局 CSS。
3. 导入本目录 alpha.5 `iMessage-Message-Bridge.js`，按相同插件 ID 更新并启用。Toolbar 沿用现有版本，无需重新安装。
4. 退出重进会话。语音默认仅播放器；长按菜单「转文字」展开原文，点击原文切换中文，菜单「收起转写」恢复播放器；再展开时中文默认隐藏。普通双语正文点击切换中文，Enter/Space 支持键盘操作。

宿主必须同时读到局部 `--im-theme:1` 和 `--im-presentation:1` 才启用。其他主题和 alpha.4 CSS 继续旧展示路径。局部 `--app-text-scale:1` 隔离 Float 全局文字比例，不调整系统/浏览器缩放。Sound Tags 只过滤转写和中文显示，不改 TTS、原消息或记忆。

## 提交范围

- components/chat/chat-room.tsx
- components/chat/message-bubble.tsx
- components/chat/imessage-presentation.tsx
- lib/voice-display-text.ts
- themes/imessage-native-day/iMessage-Native-Day.css
- themes/imessage-native-day/iMessage-Message-Bridge.js
- scripts/test-imessage-voice-display.mjs
- themes/imessage-native-day/DEPLOYMENT.md

主题目录此前未纳入 Git，因此 CSS/Bridge 在本次提交中作为新文件出现。私有参考图、生成截图、历史测试包、ZIP、临时构建和其他任务改动均不提交。完整本地验收资料仍保留在原目录。

## 验证记录

六个生产文件已与本地 alpha.5 manifest 的 SHA-256 一致性核对。实现阶段：118 项真实 ChatRoom 交互、63 项过滤/解析、5 项本地 SSE、228 项几何、38 项宿主回归及 46 项补充模拟检查通过。24 个冻结场景的气泡局部像素不变；plain/wallpaper 各自 100/125/150 比例截图一致。独立 TypeScript 与 Next 71/71 生产构建通过；已有 webpack cache snapshot 警告，lint 由仓库配置跳过。

仓库可直接运行 `node scripts/test-imessage-voice-display.mjs` 复验显示过滤；完整真实宿主视觉脚本及证据为本地交付材料，未将其依赖的历史包、私人参考或生成图上传 Git。

## 回退与限制

恢复保存的 alpha.4 会话 CSS，并将 Message Bridge 恢复为 alpha.4，然后退出重进会话。旧 CSS 不含新展示标记，已部署宿主会走旧 UI；无需回退全站代码，也无需清空聊天数据。Toolbar 保持原版。alpha.4 完整包和回退副本保留在本地 `themes/imessage-native-day/`。

待验证：iPhone Safari 触摸/选择、动态键盘与滚动、VoiceOver、实际 Tapback v3.7.7 及用户完整插件组合。音频测试使用本地 PCM，未覆盖远程 TTS 和硬件后台播放。GitHub 推送成功与 Netlify 发布成功须分别确认。
