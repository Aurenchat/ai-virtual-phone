// Synthetic audio lifecycle and provider contracts. No network, microphone, or paid API.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let configs=[], media=[], contexts=[], denyResume=false, resumeGate=null, primeGate=null, decodeGate=null;
class Node {
 constructor(context,kind){this.context=context;this.kind=kind;this.gain={value:1};this.connections=[];}
 connect(node){this.connections.push(node);return node;}
 disconnect(){this.connections=[];}
}
class Context {
 constructor(){this.state='suspended';this.destination=new Node(this,'destination');this.mediaSources=[];this.bufferSources=[];contexts.push(this);}
 resume(){if(denyResume)return Promise.reject(Error('resume blocked'));if(resumeGate)return resumeGate.then(()=>{this.state='running';});this.state='running';return Promise.resolve();}
 suspend(){this.state='suspended';return Promise.resolve();}
 createGain(){return new Node(this,'gain');}
 createWaveShaper(){return new Node(this,'shaper');}
 createMediaElementSource(audio){const n=new Node(this,'media');n.audio=audio;this.mediaSources.push(n);return n;}
 createBufferSource(){const n=new Node(this,'buffer');n.start=()=>{};n.stop=()=>{};this.bufferSources.push(n);return n;}
 decodeAudioData(_bytes,resolve){const result=(decodeGate||Promise.resolve()).then(()=>({synthetic:true}));result.then(resolve);return result;}
}
class Audio {
 constructor(){this.paused=true;this.currentTime=0;this._src='';media.push(this);}
 // iOS-style ignored volume writes: tests must observe gain nodes, not audio.volume.
 get volume(){return 1;} set volume(_v){}
 set src(v){this._src=v;} get src(){return this._src;}
 play(){this.paused=false;const gate=primeGate;primeGate=null;return gate||Promise.resolve();} pause(){this.paused=true;}
 setAttribute(){} removeAttribute(){this._src='';} load(){}
}
const window=Object.assign(new EventTarget(),{AudioContext:Context,localStorage:{getItem:()=>null,setItem(){}}});
const storage={loadVoiceConfigs:()=>configs,loadBindingConfig:()=>({}),resolveBinding:()=>({})};
const cache=new Map();let fetcher=()=>{throw Error('Unexpected network');};
function load(file){
 if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
 const require=name=>name==='./settings-storage'?storage:name==='./elevenlabs-tts'?load('lib/elevenlabs-tts.ts'):name==='./speech-playback-volume'?load('lib/speech-playback-volume.ts'):name==='./voice-expression'?{supportsVoiceExpression:()=>true,voiceSpeechText:x=>x,voiceDisplayText:x=>x}:{};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require,window,Audio,Blob,URL,URLSearchParams,AbortController,DOMException,Event,console,fetch:(...args)=>fetcher(...args),setTimeout,clearTimeout});return exports;
}
const service=load('lib/tts-service.ts'),volume=load('lib/speech-playback-volume.ts'),eleven=load('lib/elevenlabs-tts.ts');
const voice=(id='a',gain)=>({id,provider:'ElevenLabs',apiKey:'fixture',defaultVoice:'voice',model:'eleven_v4',enableTTS:true,enableSTT:false,...gain===undefined?{}:{playbackVolume:gain}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const refresh=()=>window.dispatchEvent(new Event('voice-configs-updated'));
const pathFrom=source=>{const nodes=[];let n=source;while(n&&nodes.length<12){nodes.push(n);n=n.connections[0];}return nodes;};
let passed=0;const check=(value,name)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
(async()=>{
 for(const value of [undefined,NaN,Infinity,-1,0,2.1,'0.5',null])check(volume.speechPlaybackVolume(voice('a',value))===1,'safe legacy/invalid gain '+String(value));
 for(const value of [.1,.5,1,2])check(volume.speechPlaybackVolume(voice('a',value))===value,'valid gain '+value);
 check(volume.speechPlaybackVolume({...voice('a',2),provider:'Minimax',speechVolume:1.7})===1,'MiniMax API volume is not a playback multiplier');
 const curve=volume.playbackVolumeCurve(2);check(Math.max(...curve)<=1&&Math.min(...curve)>=-1,'soft knee contains amplified peaks');
 check(Math.abs(curve[Math.round((.1+1)/2*(curve.length-1))]-.2)<.001,'quiet amplified samples remain linear');
 const blob=new Blob(['original']);
 const plain=service.createSpeechMediaPlayer({useGlobalVolume:false});plain.setVoiceConfig(voice());
 const unity=plain.play(blob);await unity.started;check(contexts.length===0,'unity media playback allocates no Web Audio graph');
 const originalUrl=media.at(-1).src;unity.stop();await unity.ended;plain.dispose();
 check(await blob.text()==='original','source blob is never processed or overwritten');
 const reader=service.createSpeechMediaPlayer();configs=[voice('a',.5),voice('b',2)];reader.setVoiceConfig(configs[0]);
 const clip=reader.play(blob);await clip.started;const context=contexts[0],audio=media.at(-1),source=context.mediaSources.at(-1);
 let nodes=pathFrom(source);check(nodes[1].gain.value===.5&&nodes[2].gain.value===1,'attenuation uses a node when audio.volume writes are ignored');
 service.setTtsVolume(.4);nodes=pathFrom(source);check(nodes[1].gain.value===.5&&nodes[2].gain.value===.4,'reading global volume and config volume apply once each');
 audio.currentTime=1.25;const retained=audio.src;
 configs=[voice('a',2),voice('b',.1)];refresh();await tick();nodes=pathFrom(source);
 check(nodes.some(n=>n.kind==='shaper')&&nodes.at(-2).gain.value===.4,'gain above unity has a limiter before global volume');
 check(audio.currentTime===1.25&&audio.src===retained&&!audio.paused,'live gain changes neither source nor playback position');
 configs=[voice('a',2),voice('b',1)];const curveBefore=nodes.find(n=>n.kind==='shaper').curve;refresh();
 check(pathFrom(source).find(n=>n.kind==='shaper').curve===curveBefore,'unrelated config edits do not rebuild this character gain');
 clip.pause();check(audio.paused&&context.state==='suspended','pause suspends the shared audio session');
 configs=[voice('a',.3)];refresh();check(audio.paused&&audio.currentTime===1.25,'gain edit while paused does not resume or seek');
 await clip.resume();check(!audio.paused&&audio.currentTime===1.25&&context.state==='running','resume keeps the same media position and restores context');
 clip.stop();await clip.ended;check(context.state==='suspended'&&!audio.src,'stop releases source and audio session');
 reader.dispose();
 configs=[voice('a',1)];const unityReader=service.createSpeechMediaPlayer();unityReader.setVoiceConfig(voice('a',1));const unified=unityReader.play(blob);await unified.started;
 check(pathFrom(context.mediaSources.at(-1)).at(-2).gain.value===.4,'ElevenLabs unity config still applies non-unity global gain on iOS');unified.stop();unityReader.dispose();
 let releaseResume;resumeGate=new Promise(resolve=>{releaseResume=resolve;});
 const stoppedPlayer=service.createSpeechMediaPlayer();stoppedPlayer.setVoiceConfig(voice('a',2));const stopped=stoppedPlayer.play(blob);stopped.stop();releaseResume();await stopped.started;await tick();resumeGate=null;
 check(context.state==='suspended'&&media.at(-1).paused,'late context resume after stop is suspended again');stoppedPlayer.dispose();
 let releaseFastResume;resumeGate=new Promise(resolve=>{releaseFastResume=resolve;});
 const fastPlayer=service.createSpeechMediaPlayer();fastPlayer.setVoiceConfig(voice('a',2));const fastClip=fastPlayer.play(blob);fastClip.pause();const fastResume=fastClip.resume();releaseFastResume();
 await Promise.all([fastClip.started,fastResume]);resumeGate=null;
 check(context.state==='running'&&!media.at(-1).paused,'stale resume completion cannot suspend a newer resume on the same element');fastClip.stop();fastPlayer.dispose();
 service.setTtsVolume(.6);configs=[voice('a',2),voice('b',.2)];
 const a=service.playAudioBlob(blob,configs[0]);await tick();await tick();
 const buffer=context.bufferSources.at(-1);let chain=pathFrom(buffer);
 check(chain.some(n=>n.kind==='shaper')&&chain.at(-2).gain.value===.6,'iOS buffer playback limits config gain then applies global volume once');
 configs=[voice('a',.5),voice('b',2)];refresh();chain=pathFrom(buffer);
 check(chain[1].gain.value===.5&&chain.at(-2).gain.value===.6,'active call config gain updates without decoding or synthesis');
 a.abort();await a.promise;check(context.state==='suspended'&&buffer.connections.length===0,'call abort disconnects local nodes and hands microphone session back');
 const b=service.playAudioBlob(blob,{...voice('b',2),provider:'Minimax',speechVolume:1.9});await tick();await tick();
 chain=pathFrom(context.bufferSources.at(-1));check(chain.length===3&&chain[1].gain.value===.6,'next MiniMax call keeps the original graph and no ElevenLabs multiplier');b.abort();await b.promise;
 configs=[voice('a',2),voice('b',2)];let releasePrime;primeGate=new Promise(resolve=>{releasePrime=resolve;});window.dispatchEvent(new Event('pointerdown'));
 const mediaCall=service.playAudioBlobViaMediaElement(blob,voice('a',2));await tick();releasePrime();await tick();
 check(!media.find(element=>!element.paused&&element.src)?.muted,'late shared unlock completion cannot pause/mute the real call clip');
 check(pathFrom(context.mediaSources.at(-1)).some(n=>n.kind==='shaper'),'Android/group/video media call path applies local gain');
 const activeMedia=media.find(element=>!element.paused&&element.src),activeUrl=activeMedia.src;window.dispatchEvent(new Event('pointerdown'));await tick();
 check(activeMedia.src===activeUrl&&!activeMedia.paused,'unlock gesture cannot overwrite an active shared media call with silence');
 mediaCall.abort();await mediaCall.promise;check(context.state==='suspended','media call end releases audio session');
 context.state='interrupted';const sourcesBeforeInterruption=context.bufferSources.length;const resumedCall=service.playAudioBlob(blob,voice('a',2));await tick();await tick();
 check(context.state==='running'&&context.bufferSources.length===sourcesBeforeInterruption+1,'WebKit interrupted context resumes on the original call path');resumedCall.abort();await resumedCall.promise;
 const delayed=service.playAudioBlob(blob,voice('a',2));delayed.abort();await delayed.promise;await tick();
 check(context.state==='suspended','stop during asynchronous decode cannot resume later');
 configs=[voice('a',.25)];const stalePlayer=service.createSpeechMediaPlayer({useGlobalVolume:false});stalePlayer.setVoiceConfig(voice('a',2));const staleClip=stalePlayer.play(blob);await staleClip.started;
 check(pathFrom(context.mediaSources.at(-1))[1].gain.value===.25,'media playback resolves gain saved while synthesis was in flight');staleClip.stop();stalePlayer.dispose();
 configs=[voice('a',2)];let releaseDecode;decodeGate=new Promise(resolve=>{releaseDecode=resolve;});const decoding=service.playAudioBlob(blob,voice('a',2));await tick();configs=[voice('a',.3)];refresh();releaseDecode();await tick();await tick();decodeGate=null;
 check(pathFrom(context.bufferSources.at(-1))[1].gain.value===.3,'gain changes during call decoding apply to the first audible buffer');decoding.abort();await decoding.promise;
 const fallbackPlayer=service.createSpeechMediaPlayer();fallbackPlayer.setVoiceConfig(voice('a',2));denyResume=true;
 const fallback=fallbackPlayer.play(blob);await fallback.started;check(!media.at(-1).paused,'failed context resume retains audible native media fallback');
 fallback.stop();await fallback.ended;fallbackPlayer.dispose();denyResume=false;
 context.state='closed';const reopened=service.createSpeechMediaPlayer({useGlobalVolume:false});reopened.setVoiceConfig(voice('a',.5));const reopenedClip=reopened.play(blob);await reopenedClip.started;
 check(contexts.at(-1)!==context&&contexts.at(-1).state==='running','closed shared context is replaced for subsequent non-unity playback');reopenedClip.stop();reopened.dispose();
 let body;fetcher=async(_url,init)=>{body=JSON.parse(init.body);return new Response('audio',{headers:{'content-type':'audio/mpeg'}});};
 const expected=JSON.stringify(eleven.elevenLabsSpeechRequest('[whispers] hello',voice('a',1)).body);
 for(const gain of [.2,1,2]){await service.synthesizeSpeech('[whispers] hello',voice('a',gain));check(JSON.stringify(body)===expected,'playback gain '+gain+' leaves model/emotion request byte-equivalent');}
 for(const model of eleven.ELEVENLABS_MODELS){const before=JSON.stringify(eleven.elevenLabsSpeechRequest('hello',{...voice('a',1),model}).body);check(before===JSON.stringify(eleven.elevenLabsSpeechRequest('hello',{...voice('a',2),model}).body),'model parameter isolation '+model);}
 window.webkitAudioContext=Context;delete window.AudioContext;cache.delete('lib/tts-service.ts');
 const webkitService=load('lib/tts-service.ts'),webkitPlayer=webkitService.createSpeechMediaPlayer();webkitPlayer.setVoiceConfig(voice('a',.5));
 const webkitClip=webkitPlayer.play(blob);await webkitClip.started;check(contexts.at(-1).mediaSources.length===1,'legacy webkitAudioContext constructor retains the gain path');webkitClip.stop();webkitPlayer.dispose();
 delete window.webkitAudioContext;cache.delete('lib/tts-service.ts');const unsupported=load('lib/tts-service.ts').createSpeechMediaPlayer();unsupported.setVoiceConfig(voice('a',2));
 const count=contexts.length,untreated=unsupported.play(blob);await untreated.started;check(contexts.length===count&&!media.at(-1).paused,'browser without Web Audio keeps original native fallback instead of failing speech');untreated.stop();unsupported.dispose();
 window.AudioContext=Context;
 console.log(`PASS ${passed} playback volume lifecycle and request assertions`);
})().catch(error=>{console.error(error);process.exitCode=1;});
