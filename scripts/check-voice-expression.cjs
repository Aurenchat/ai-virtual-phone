// Adapted from Yyk-Y2k/ai-virtual-phone-Y2Kversion @ c49730e (AGPL-3.0).
// Isolated prompt and actual rich-message parsing; no model, TTS, or user storage.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let provider='ElevenLabs',model='eleven_v4';
function load(file,deps){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,URL,Intl,require:name=>name.startsWith('./voice-guides/')?load('lib/'+name.slice(2)+'.ts',{}):deps[name]||{},console});return out;}
const voice=load('lib/voice-expression.ts',{'./settings-storage':{loadBindingConfig:()=>({}),loadVoiceConfigs:()=>[{id:'vc',provider,model,enableTTS:true}],resolveBinding:(_b,id)=>({voiceConfigId:id==='char'?'vc':undefined})}});
const configuredGuidance = voice.VOICE_EXPRESSION_GUIDANCE_ENABLED;
if (!configuredGuidance) {
 assert.equal(voice.voiceExpressionInstruction(['char']), '');
 assert.equal(voice.voiceExpressionInstruction(['char'], true), '');
 console.log('PASS: comparison mode injects no voice guidance for chat/calls.');
}
// Exercise preserved rules in isolated module memory only; don't enable live guidance.
voice.VOICE_EXPRESSION_GUIDANCE_ENABLED = true;
const instruction=voice.voiceExpressionInstruction(['char']);
assert.match(instruction,/人设、关系、当前上下文/);assert.match(instruction,/teasing/);assert.match(instruction,/无奈/);assert.match(instruction,/只在 \[语音条/);
assert.match(instruction,/沉稳、克制/);assert.match(instruction,/小狗型/);assert.match(instruction,/按实际人设与关系选择/);
assert.doesNotMatch(instruction,/官方|保证|免责声明|导演指令/);
assert.match(instruction,/统一决定回复内容、说话方式及现场声音/);
assert.match(instruction,/不按最新一句的关键词重置情绪/);
assert.match(instruction,/可以骤变/);assert.match(instruction,/无需每轮添加/);
assert.doesNotMatch(instruction,/每句通常0—2|不标肢体动作或环境音|只添加声音标记/);
for (const cue of ['happy','excited','warmly','angry','annoyed','sarcastic','sad','crying','curious','thoughtful','surprised','appalled','mischievously','soft, affectionate tone','gentle, reassuring tone','weary, resigned tone','fondly exasperated tone','playful, teasing tone','controlled, restrained anger','cool, detached tone','soft, hurt tone','anxious tone','hesitant tone','calm, firm tone','chuckles','laughs','sighs','exhales','inhales deeply','clears throat','whispers','shouting','short pause','long pause']) assert.ok(instruction.includes(cue), `retained reference: ${cue}`);
for(const direction of ['soft, composed, fondly teasing tone, gently falling intonation','bright, sincere, warmly teasing tone, gently rising intonation']) {
 assert.equal(voice.voiceDisplayText(`{voice:${direction}} 来啦？`),'来啦？');
 assert.equal(voice.voiceSpeechText(`{voice:${direction}} 来啦？`),`[${direction}] 来啦？`);
}
assert.match(voice.voiceExpressionInstruction(['char'],true),/当前为通话/);
assert.doesNotMatch(instruction,/Fish Audio|chuckling|long-break/);
assert.equal(voice.voiceExpressionInstruction(['other']),'');
provider='Minimax';assert.equal(voice.voiceExpressionInstruction(['char']),'');provider='ElevenLabs';model='eleven_multilingual_v2';assert.equal(voice.voiceExpressionInstruction(['char']),'');model='eleven_v4_turbo';assert.ok(voice.voiceExpressionInstruction(['char']));
const parser=load('lib/rich-message-parser.ts',{'./voice-expression':voice,'./state-value-parser':{parseStateValues:text=>({cleanText:text,stateValues:[]}),mergeStateValues:()=>[]},'./action-parser':{stripActionShells:text=>text},'./text-tool-protocol':{stripTextToolDirectives:text=>text},'./custom-app-chat-directives':{loadCustomAppChatDirectives:()=>[]},'./chat-echo':{canUseEcho:()=>false},'./image-grid-split':{isImageGridCount:()=>false}});
const raw='[语音条:{voice:chuckles} {voice:playful, teasing tone} 又熬夜了？]';
const part=parser.parseAIResponse(raw,[]).parts[0];
assert.equal(part.mediaType,'audio');assert.equal(part.mediaData.label,'又熬夜了？');assert.equal(part.mediaData.speechText,'[chuckles] [playful, teasing tone] 又熬夜了？');
const old=parser.parseAIResponse('[语音条:早上好。]',[]).parts[0];assert.equal(old.mediaData.label,'早上好。');assert.equal(old.mediaData.speechText,undefined);
assert.equal(voice.voiceDisplayText('{voice:sighs} 好吧。'),'好吧。');
assert.equal(voice.voiceSpeechText('{voice:sighs} 好吧。'),'[sighs] 好吧。');
assert.equal(voice.voiceDisplayText('普通消息：{其他字段}'),'普通消息：{其他字段}');
const chinese = '{voice:呼气} i get it. {voice:短停顿} come outside. {voice:低沉} right here.|{voice:清嗓子，故意走调到离谱} 过来。';
assert.equal(voice.voiceDisplayText(chinese), 'i get it.  come outside.  right here.| 过来。');
assert.equal(voice.voiceSpeechText(chinese), '[exhales] i get it. [short pause] come outside. [low tone] right here.| 过来。');
assert.equal(voice.voiceDisplayText('{VOICE：呼气} hello'), 'hello');
assert.equal(voice.voiceSpeechText('{voice:未知动作} hello'), 'hello');
const chinesePart=parser.parseAIResponse(`[语音条:${chinese}]`,[]).parts[0];
assert.doesNotMatch(chinesePart.mediaData.label,/voice:/);
assert.doesNotMatch(chinesePart.mediaData.speechText,/voice:|故意走调/);
assert.match(chinesePart.mediaData.speechText,/\[exhales\]/);
const bilingual=load('lib/bilingual-text.ts',{});
const eleven=load('lib/elevenlabs-tts.ts',{});
const config={provider:'ElevenLabs',model:'eleven_v4',defaultVoice:'test-voice'};
for (const raw of ['{voice:whispers} Hello.|你好。', '{voice:dog barking}']) {
 const callText = parser.parseAIResponse(raw,[]).parts.filter(part=>!part.mediaType).map(part=>part.content).join('\n');
 const speech = voice.voiceSpeechText(bilingual.splitBilingualText(callText)?.original || callText);
 assert.match(eleven.elevenLabsSpeechRequest(speech,config).body.text, /\[(whispers|dog barking)\]/);
 assert.doesNotMatch(voice.voiceDisplayText(callText), /voice:/);
}
for(const cue of ['dog barking','soft road noise','door closing','casual, slightly distracted','still hurt, trying to speak evenly','softly','quietly','low, gravelly voice','slowly','rushed','drawn out','gasps','snorts','wheezing','gulps','sings','footsteps','door creaking','thunder rumbling','applause','French accent','pirate voice','whispering, playful','starting calm, then losing patience','gentle confidence with a hint of mischief']) {
 const raw=`[语音条:{voice:${cue}} Hey, I'm here.|嘿，我在这儿。]`;
 const audio=parser.parseAIResponse(raw,[]).parts[0].mediaData;
 const speech=voice.voicePlaybackText(audio.label,audio.speechText);
 const original=bilingual.splitBilingualText(speech).original;
 assert.equal(eleven.elevenLabsSpeechRequest(original,config).body.text,`[${cue}] Hey, I'm here.`);
 assert.doesNotMatch(audio.label,/voice:|dog barking|road noise|door closing|distracted|still hurt/);
 assert.equal(voice.voiceHistoryText(audio.label,audio.speechText),`{voice:${cue}} Hey, I'm here.|嘿，我在这儿。`);
}
const onlySound=parser.parseAIResponse('[语音条:{voice:dog barking}]',[]).parts[0].mediaData;
assert.equal(onlySound.label,'');
assert.equal(voice.voicePlaybackText(onlySound.label,onlySound.speechText),'[dog barking]');
assert.equal(voice.voiceHistoryText(onlySound.label,onlySound.speechText),'{voice:dog barking}');
assert.equal(voice.voicePlaybackText('New line.','[angry] Old line.'),'New line.');
assert.equal(voice.voiceHistoryText('New line.','[angry] Old line.'),'New line.');
assert.equal(voice.voiceHistoryText('See [appendix].'),'See [appendix].');
assert.equal(voice.voiceHistoryText('See [appendix].','[angry] Old line.'),'See [appendix].');
assert.equal(voice.voicePlaybackText('I get it.  Come here.','[exhales] I get it. [short pause] Come here.'),'[exhales] I get it. [short pause] Come here.');
assert.equal(voice.voicePlaybackText('{voice:呼气} Hello.'),'[exhales] Hello.');
const assembler=load('lib/llm-prompt-assembler.ts',{'./voice-expression':voice});
assert.equal(assembler.formatRichMediaForHistory({mediaType:'audio',mediaData:onlySound},'User','Char'),'[语音条:{voice:dog barking}]');
assert.equal(assembler.formatRichMediaForHistory({mediaType:'audio',mediaData:{label:'Hello.'}},'User','Char'),'[语音条:Hello.]');
console.log('PASS: provider/model/character gating, persona/context/call guidance, actual voice-message parse, labels separated from speech, legacy voice compatibility; no paid calls.');
