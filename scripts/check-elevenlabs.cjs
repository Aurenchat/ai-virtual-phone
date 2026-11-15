// Adapted from Yyk-Y2k/ai-virtual-phone-Y2Kversion @ c49730e (AGPL-3.0).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let mockFetch = async () => { throw new Error('Unexpected network call'); };
let timeoutCallback;
let cleared = 0;
const globals = { Blob, Response, URL, URLSearchParams, AbortController, TypeError, DOMException,
    fetch: (...args) => mockFetch(...args), setTimeout: fn => { timeoutCallback = fn; return 1; }, clearTimeout: () => { cleared++; } };
function load(file, require = () => { throw new Error('Unexpected import'); }) {
    const context = { ...globals, exports: {}, require: name => name.endsWith('identity-runtime')
        ? { assertIdentityActive: () => {}, registerIdentityRequest: () => () => {}, identityLocalStorage: {} }
        : name === './voice-expression' ? { voiceDisplayText: text => text, voiceSpeechText: text => text, supportsVoiceExpression: () => false } : require(name) };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
const eleven = load('lib/elevenlabs-tts.ts');
const config = { id:'test', provider:'ElevenLabs', apiKey:'test-key-not-real', defaultVoice:'voice/id', enableTTS:true, enableSTT:false };
const plain = value => JSON.parse(JSON.stringify(value));
async function main() {
    const request = eleven.elevenLabsSpeechRequest('你好',config);
    assert.equal(request.url,'https://api.elevenlabs.io/v1/text-to-speech/voice%2Fid?output_format=mp3_44100_128');
    assert.equal(request.body.model_id,'eleven_multilingual_v2');
    assert.equal(request.body.text,'你好');
    const body = eleven.elevenLabsSpeechRequest('test',{...config,speechSpeed:8,elevenLabs:{stability:-1,similarity:9,style:NaN,speakerBoost:false}}).body;
    assert.deepEqual(plain(body.voice_settings),{stability:0,similarity_boost:1,style:0,use_speaker_boost:false,speed:1.2});
    assert.equal(eleven.elevenLabsSpeechRequest('test',{...config,model:'eleven_v3'}).body.voice_settings,undefined);
    assert.throws(()=>eleven.elevenLabsSpeechRequest('test',{...config,defaultVoice:''}),/Voice ID/);
    assert.throws(()=>eleven.elevenLabsSpeechRequest('test',{...config,baseUrl:'http://example.com'}),/HTTPS/);
    assert.throws(()=>eleven.elevenLabsSpeechRequest('test',{...config,baseUrl:'https://user:password@example.com'}),/HTTPS/);
    let calls = 0;
    mockFetch = async (url,init) => { calls++; assert.equal(init.headers['xi-api-key'],config.apiKey); assert.equal(init.headers.Authorization,undefined); assert.equal(init.redirect,'error'); return new Response(new Uint8Array([73,68,51]),{headers:{'Content-Type':'audio/mpeg'}}); };
    const tts = load('lib/tts-service.ts',name=>name==='./elevenlabs-tts'?eleven:name==='./settings-storage'?{loadVoiceConfigs:()=>[config],loadBindingConfig:()=>({}),resolveBinding:()=>({voiceConfigId:'test'})}:{});
    assert.equal(tts.resolveVoiceConfig('char').provider,'ElevenLabs');
    assert.equal(await tts.synthesizeSpeech('  ',config),null);
    assert.equal(calls,0);
    const blob = await tts.synthesizeSpeech('你好',config,{emotion:'happy'});
    assert.equal(blob.type,'audio/mpeg'); assert.equal(blob.size,3); assert.equal(calls,1);
    await assert.rejects(eleven.synthesizeElevenLabs('test',{...config,apiKey:''}),/API Key/);
    for (const status of [401,403,404,429,500]) {
        mockFetch = async()=>new Response(JSON.stringify({detail:{message:config.apiKey}}),{status});
        await assert.rejects(eleven.synthesizeElevenLabs('test',config),error=>error.message.includes(String(status))&&!error.message.includes(config.apiKey));
    }
    mockFetch=async()=>new Response('',{headers:{'Content-Type':'audio/mpeg'}});
    await assert.rejects(eleven.synthesizeElevenLabs('test',config),/空音频/);
    mockFetch=async()=>new Response('{}',{headers:{'Content-Type':'application/json'}});
    await assert.rejects(eleven.synthesizeElevenLabs('test',config),/不是音频/);
    mockFetch=async()=>{throw new TypeError('Failed to fetch');};
    await assert.rejects(eleven.synthesizeElevenLabs('test',config),/跨域/);
    mockFetch=async()=>{timeoutCallback(); throw new DOMException('aborted','AbortError');};
    await assert.rejects(eleven.synthesizeElevenLabs('test',config),/超时/);
    calls=0;
    mockFetch=async(url)=>{
        calls++;
        assert.ok(url.startsWith('https://api.elevenlabs.io/v2/voices?'));
        if(calls===2) assert.ok(url.includes('next_page_token=next'));
        return Response.json(calls===1?{voices:[{voice_id:'a',name:'A'}],has_more:true,next_page_token:'next'}:{voices:[{voice_id:'a',name:'A'},{voice_id:'b',name:'B'}],has_more:false});
    };
    assert.deepEqual(plain(await eleven.listElevenLabsVoices({...config,baseUrl:'https://api.elevenlabs.io/v1/'})),[{id:'a',name:'A'},{id:'b',name:'B'}]);
    mockFetch=async()=>Response.json({voices:[],has_more:true,next_page_token:'repeat'});
    await assert.rejects(eleven.listElevenLabsVoices(config),/分页异常/);
    assert.ok(cleared>10);
    // Existing providers still dispatch to their original endpoints and payloads.
    mockFetch=async(url,init)=>{
        assert.ok(url.endsWith('/audio/speech')); assert.equal(init.headers.Authorization,'Bearer test-key-not-real');
        return new Response('mp3');
    };
    assert.equal((await tts.synthesizeSpeech('hi',{...config,provider:'OpenAI',defaultVoice:'alloy'})).type,'audio/mpeg');
    mockFetch=async(url,init)=>{assert.ok(url.endsWith('/t2a_v2')); assert.equal(JSON.parse(init.body).voice_setting.voice_id,'male-qn-qingse'); return Response.json({data:{audio:'494433'}});};
    assert.equal((await tts.synthesizeSpeech('hi',{...config,provider:'Minimax',defaultVoice:'male-qn-qingse'})).size,3);
    // Render the actual settings component with in-memory hook state (no user storage).
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    function renderSettings(voiceConfig) {
        let index=0;
        const source=fs.readFileSync(path.join(root,'components/settings/voice-settings.tsx'),'utf8');
        const context={exports:{},require:name=>{
            if(name==='react') return {...React,useState:initial=>{const i=index++; return [i===0?[voiceConfig]:i===1?voiceConfig.id:i===12?true:initial,()=>{}];},useEffect:()=>{},useRef:value=>({current:value}),useCallback:fn=>fn,useContext:()=>({setSubpageRightAction:()=>{}})};
            if(name==='react/jsx-runtime') return require(name);
            if(name==='./voice-settings.module.css') return { default:{} };
            if(name==='@/lib/elevenlabs-tts') return eleven;
            if(name==='@/lib/fish-audio-tts') return { FISH_AUDIO_BASE_URL:'https://api.fish.audio/v1', FISH_AUDIO_FREE_MODEL:'s2.1-pro-free', FISH_AUDIO_MODELS:['s2.1-pro-free','s2.1-pro','s2-pro','drama-3'] };
            if(name==='@/lib/tts-service') return tts;
            if(name==='@/lib/settings-storage') return {loadVoiceConfigs:()=>[voiceConfig],saveVoiceConfigs:()=>{throw new Error('Render must not write storage');}};
            if(name==='../phone-settings-app') return {SettingsContext:{}};
            if(name==='@/components/ui/form') return {Input:props=>React.createElement('input',props),Toggle:({checked})=>React.createElement('input',{type:'checkbox',checked,readOnly:true})};
            if(name==='@/components/ui/modal') return {ConfirmDialog:()=>null};
            if(name==='@/components/ui/feedback') return {Alert:({children})=>React.createElement('div',null,children)};
            if(name==='lucide-react') return new Proxy({},{get:()=>()=>null});
            throw new Error(`Unexpected UI import: ${name}`);
        }};
        vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
        return renderToStaticMarkup(context.exports.VoiceSettings());
    }
    const ui=renderSettings({...config,apiKey:'',model:'eleven_multilingual_v2'});
    assert.match(ui,/ElevenLabs/); assert.match(ui,/稳定性/); assert.match(ui,/同步音色列表/);
    assert.doesNotMatch(ui,/克隆音色初次使用|上传音频克隆音色|whisper-1/);
    const v3ui=renderSettings({...config,apiKey:'',model:'eleven_v3'});
    assert.match(v3ui,/v3 使用音色默认参数/); assert.doesNotMatch(v3ui,/稳定性/);
    console.log('PASS: ElevenLabs dispatch, binding, request contract, v3 isolation, limits, binary audio, auth/errors/timeout, voice pagination; OpenAI + Minimax regression. No real API calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
