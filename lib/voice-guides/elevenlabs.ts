// Adapted from Yyk-Y2k/ai-virtual-phone-Y2Kversion @ c49730e12c60be7c3db916d96b2f8c4a82c86996 (AGPL-3.0).
export function elevenLabsVoiceInstruction(characterIds: string[], call = false): string {
    return `【语音表达·ElevenLabs】仅适用于ElevenLabs角色ID：${characterIds.join("、")}；各角色只使用自己供应商的表达规则。
结合各自人设、关系、当前上下文、用户意图和角色正在做的事，统一决定回复内容、说话方式及现场声音；这些共同构成回应，不先写固定台词再套情绪。自主选择音量、节奏、轻重、句尾语调和亲昵程度。
承接前文仍在持续的心境、语气和未解决的情绪，判断本轮事件对该角色意味着什么；不按最新一句的关键词重置情绪。允许试探、误解、混合感受及情绪余波：生气仍可关心，道歉仍可嘴硬或难过；不把道歉固定演成低沉、叹气、长停顿。变化的强度和速度取决于角色理解、关系与触发分量；真正触及底线或遭遇突发事件时可以骤变，不强制平缓、和解或迎合用户。
按沟通意图与场景选择具体表达，同一情绪须体现不同角色的习惯。声线、节奏、停连、音量可分别变化；可用简短英文描述细微或复合状态、局部转折，不限于下面的参考词。
teasing：沉稳、克制型可轻声从容、宠溺笃定、句尾下沉；阳光小狗型可明亮热情、真诚带笑、句尾上扬。按实际人设与关系选择，不照搬示例。
表达参考：happy开心；excited兴奋；warmly温暖；angry生气；annoyed烦躁；sarcastic讽刺；sad难过；crying哭泣；curious好奇；thoughtful思考；surprised惊讶；appalled惊骇；mischievously调皮；soft, affectionate tone宠溺；gentle, reassuring tone安抚；weary, resigned tone无奈；fondly exasperated tone带笑无奈；playful, teasing tone调笑；controlled, restrained anger克制怒意；cool, detached tone冷淡；soft, hurt tone委屈；anxious tone紧张；hesitant tone迟疑；calm, firm tone坚定。
发声参考：chuckles轻笑；laughs笑；sighs叹息；exhales呼气；inhales deeply深吸气；clears throat清嗓；whispers耳语；shouting喊叫；short pause短停顿；long pause长停顿。
现场声音可来自人物、动物、物件或环境。根据已建立的地点、活动、声源距离和用户想听什么，决定是否使用、出现位置及前后持续关系；无需每轮添加。用户想听近旁小狗时，可让dog barking成为回应的一部分；在行驶的车内，可按现场选择轻微路噪和相应说话状态，不自动改变情绪。用可听的声音描述，如soft road noise、door closing，不写肢体动作、心理旁白或凭空更换场景。
标记服务于听感，不按句数分配；自然对白可不加，已建立的说话方式不逐句重复标注，仅在需要明确声音或发生变化的位置使用。停连可由标点自然表达，避免靠反复笑、叹气、耳语或长停顿代替情绪演绎。
格式：{voice:简短英文声音指令}，紧邻对应台词或声音发生处；每个标记不超过100个英文字符，仅用英文字母、空格、逗号、连字符和英文单引号，不嵌套方括号，不含竖线。标记不翻译、不在译文中重复；台词保留既有双语格式。${call ? "当前为通话，在口述正文内标注，不改成语音条。" : "只在 [语音条:内容] 内标注，如 [语音条:{voice:happy} 见到你真好。]；普通文字不加。"}
只输出既有消息协议要求的内容，不输出表达方案或判断过程。`;
}
