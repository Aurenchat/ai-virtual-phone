# ElevenLabs → Float 移植说明

日期：2026-11-15。目标基线：当前本地 Float 工作区，HEAD `5526bcf`，包含本地阅读朗读、请求取消和其他既有改动。首次适配阶段仅完成本地验证；下述发布验证在隔离工作树执行。

## 来源与复用

原作者／仓库：[Yyk-Y2k/ai-virtual-phone-Y2Kversion](https://github.com/Yyk-Y2k/ai-virtual-phone-Y2Kversion)。复用版本：`c49730e12c60be7c3db916d96b2f8c4a82c86996`，许可证 `AGPL-3.0-only`。移植时另行确认 main 的 ElevenLabs 模块与该版本内容一致。

- [lib/elevenlabs-tts.ts](https://github.com/Yyk-Y2k/ai-virtual-phone-Y2Kversion/blob/c49730e12c60be7c3db916d96b2f8c4a82c86996/lib/elevenlabs-tts.ts)：请求体、音色分页、HTTPS 地址校验、安全错误提示、音频校验。
- [lib/voice-expression.ts](https://github.com/Yyk-Y2k/ai-virtual-phone-Y2Kversion/blob/c49730e12c60be7c3db916d96b2f8c4a82c86996/lib/voice-expression.ts) 和 [lib/voice-guides/elevenlabs.ts](https://github.com/Yyk-Y2k/ai-virtual-phone-Y2Kversion/blob/c49730e12c60be7c3db916d96b2f8c4a82c86996/lib/voice-guides/elevenlabs.ts)：表达指南、标记转换、显示与合成分离、旧表达与编辑后文本的匹配校验。
- [components/settings/voice-settings.tsx](https://github.com/Yyk-Y2k/ai-virtual-phone-Y2Kversion/blob/c49730e12c60be7c3db916d96b2f8c4a82c86996/components/settings/voice-settings.tsx)：ElevenLabs 设置区块、模型参数分支、供应商切换清理和音色同步流程。
- 同版本的 TTS 分发、消息解析、历史格式、语音条和通话接入方式，以及 `check-elevenlabs.cjs`、`check-voice-expression.cjs` 测试被按当前 Float 结构适配。复用文件保留作者与版本注释。

## 当前行为

设置 → 语音中可选择 ElevenLabs，填写 API Key 和 HTTPS 接口地址，分页同步账户音色，或手填 Voice ID。同步结果持久保存；不预置其他供应商的音色。跨供应商切换清理旧密钥和音色，Minimax 国内／海外切换仍保留同供应商设置。

保留原作者模型列表和参数分支：Multilingual v2、Flash v2.5、Turbo v2.5 可调稳定性、相似度、风格、语速和音色增强；v3 使用账户音色默认参数；v4／v4 Turbo 仅发送稳定性、相似度及可选语言代码。自定义模型 ID 仍可输入，不自动切换或回退型号。参数含义对照 [ElevenLabs 官方文档](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech)。

表达链路沿用原作者协议：启用 TTS 且绑定 ElevenLabs v3/v4 的角色 → 角色专属指南进入最终聊天／通话提示词 → 模型输出 `{voice:...}` → 解析器分别保存可见 `label` 与带指令的 `speechText` → 双语处理只取原文 → 转为 `[whispers]` 等音频标签 → ElevenLabs 请求体。语音条历史保留原表达；编辑后台词不匹配时丢弃旧指令。通话字幕与保存的正文不显示控制标记，纯声音回复也可合成。标签用法见 [官方 audio tags 说明](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4)。

## 必要适配与保留

- 不引入来源仓库的 Fish Audio 或身份隔离系统；配置继续使用当前 Float 存储和绑定级联。
- ElevenLabs 合成／同步接入调用方 AbortSignal，取消与 120 秒超时覆盖响应体读取。保留当前 Minimax/OpenAI 的取消及超时函数和音频播放器。
- 试听可在请求期间停止，关闭设置编辑器及卸载时取消试听并释放音频 URL；防止晚到结果重新播放。同步完成前核对当前供应商、地址和密钥，避免旧响应覆盖已切换配置。
- 阅读继续使用现有播放器、暂停续播、预取、跳段、缓存和请求取消；只将 ElevenLabs 参数加入缓存键。普通阅读文本中的方括号不当成声音指令删除。
- 非表达模型／其他供应商播放带有旧表达的语音时移除声音指令，保留原有 Minimax 情绪、音量、音高和运行时语速覆盖。
- 微信浏览器桥接沿用相同 speechText 取值；既有云函数及生成分发文件未覆盖。
- 原有工作区 1,445 个已修改或未跟踪文件进行前后 SHA-256 比对，全部保持不变。

## 验证与边界

可复跑检查：

```text
node scripts/check-elevenlabs.cjs
node scripts/check-voice-expression.cjs
node scripts/test-elevenlabs-adaptation.cjs
node scripts/test-elevenlabs-browser.mjs
node scripts/test-reading-tts.mjs
node scripts/test-voice-volume-browser.mjs
node scripts/test-imessage-voice-display.mjs
npx tsc --noEmit --incremental false
git diff --check
```

结果与日志见 `audits/elevenlabs-port-2026-11-15/`。适配检查 21 项、ElevenLabs 桌面 Chromium 浏览器检查 11 项、阅读回归 57 项、现有音量浏览器回归 7 项、显示／双语过滤回归 63 项通过；复用的两组请求／表达检查通过；全量 TypeScript 检查及 diff 检查通过。

浏览器测试使用真实设置组件与隔离 origin 的 IndexedDB，所有服务响应均为合成夹具。未调用真实模型或付费 ElevenLabs API，未验证账户音色权限、音质、情绪听感、iPhone/WKWebView 或真实麦克风通话。完成的是源码适配、请求契约及桌面浏览器集成验证。未执行完整生产构建；浏览器夹具完成了真实组件的 webpack 构建。


## 隔离发布验证（2026-11-15）

待发布版本以远程 main `bc7296fabdccab81f54794d0c9818720d15aa5c2` 为基线，三方合并本次 ElevenLabs 差异，无冲突；保留上游引用、键盘、九图视觉及其他既有修改。实际提交范围为 24 个明确列出的路径（15 个既有文件、9 个新文件），不包含历史审计文件或生成分发文件。

隔离目录从锁文件独立执行 `npm ci`，不复用主工作区 node_modules 或环境文件。完整 `npm run build` 通过，包含微信／推送分发生成、Dexie 生成、Next.js 71 页构建、backdrop-filter 恢复和 PWA 构建身份验证；独立全量 TypeScript 检查通过。

上述 7 个功能脚本在隔离候选原样通过。另验证上游引用 hotfix、语音转录布局、Weibo 图片／最终 Provider 请求及 SDK 一致性。Weibo 图片脚本因新增提示词依赖触发严格 mock 失败；只补充真实 voice-expression 模块与隔离空语音配置，原视觉断言保持不变，复跑通过。

生产构建生成文件只留在隔离目录，未纳入发布提交。合成／桌面浏览器证据边界保持不变；实际 Netlify 发布 SHA 与生产 HTTP 身份在发布后单独核验。
