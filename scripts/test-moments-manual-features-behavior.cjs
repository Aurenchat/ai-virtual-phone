// Runs the real TS services with deterministic API/storage boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = async function run() {
    let checks = 0;
    const pass = label => { checks++; console.log(`PASS ${label}`); };
    const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };
    const events = [];
    const browser = { dispatchEvent: event => events.push(event.type) };
    function load(rel, imports, extra = '') {
        const source = fs.readFileSync(rel, 'utf8') + extra;
        const compiled = ts.transpileModule(source, {compilerOptions: {
            target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
        }}).outputText;
        const m = {exports:{}};
        const missing = name => new Proxy({}, {get: (_, key) => (...args) => {throw Error(`Unexpected side effect/import ${name}.${String(key)}`);}});
        vm.runInNewContext(`(function(require,module,exports,window,CustomEvent,console){${compiled}\n})`, {setTimeout,clearTimeout})(
            name => imports[name] || missing(name), m, m.exports, browser,
            class { constructor(type) {this.type=type;} }, console);
        return m.exports;
    }
    const clone = value => structuredClone(value);
    const diskPosts = new Map(), diskComments = new Map();
    let confirmPost = async row => {diskPosts.set(row.id,clone(row));};
    const db = {
        initMomentsDb: async () => ({posts:[...diskPosts.values()].map(clone),comments:[...diskComments.values()].map(clone)}),
        dbPutPost: row => diskPosts.set(row.id,clone(row)),
        dbPutPostConfirmed: row => confirmPost(row),
        dbReplacePosts: rows => {diskPosts.clear(); rows.forEach(row => diskPosts.set(row.id,clone(row)));},
        dbPutComment: row => diskComments.set(row.id,clone(row)),
        dbDeletePost: id => diskPosts.delete(id),
        dbDeleteComment: id => diskComments.delete(id),
        dbDeleteCommentsByPost: id => {for(const [key,row] of diskComments){if(row.postId===id)diskComments.delete(key);}},
    };
    const characters = [{id:'a',name:'Alice'},{id:'b',name:'Bob'},{id:'x',name:'Other world'}];
    const kv = new Map();
    const baseImports = {
        './moments-db':db,
        './kv-db':{kvGet:key=>kv.get(key)||null,kvSet:(key,value)=>kv.set(key,value),registerKvMigration:()=>{}},
        './character-storage':{loadCharacters:()=>characters},
        './chat-storage':{loadChatContacts:()=>characters.map(c=>({characterId:c.id}))},
        './bilingual-prompt-defaults':{DEFAULT_MOMENTS_BILINGUAL_PROMPT:'bilingual',resolveBilingualPrompt:enabled=>enabled?'bilingual':''},
    };
    const world = load('lib/character-world-storage.ts',baseImports);
    world.saveCharacterWorldGroups([
        {id:'world_default',name:'One',memberIds:['a','b'],relations:[],description:''},
        {id:'other',name:'Two',memberIds:['x'],relations:[],description:''},
    ]);
    baseImports['./character-world-storage']=world;
    const storage = load('lib/moments-storage.ts',baseImports);
    await storage.hydrateMomentsStorage();
    const post = (patch={}) => ({id:'p',authorType:'character',authorId:'a',content:'Post',visibility:['a','b'],likes:[],createdAt:'2026-10-12T00:00:00Z',...patch});
    let comments = [];
    const comment = (patch={}) => ({id:'c',postId:'p',authorType:'character',authorId:'b',content:'old',createdAt:'2026-10-12T00:01:00Z',...patch});
    // Use real comment update/delete implementations and hydrate a fresh cache per fixture.
    let commentStorage;
    async function reset(p=post(), rows=[comment()]) {
        diskPosts.clear(); diskComments.clear();
        diskPosts.set(p.id,clone(p)); rows.forEach(row=>diskComments.set(row.id,clone(row)));
        commentStorage=load('lib/moments-storage.ts',baseImports);
        await commentStorage.hydrateMomentsStorage();
        storage.saveMomentPosts([p]);
        comments=rows;
        events.length=0;
    }
    const engineStorage = new Proxy(storage,{get:(target,key) => {
        if(['loadMomentComments','updateMomentComment','deleteMomentCommentThread'].includes(key)) return commentStorage[key];
        if(['addMomentComment','toggleMomentLike','addPendingReaction'].includes(key)) return ()=>{throw Error(`Forbidden social mutation ${key}`);};
        return target[key];
    }});
    let saveAsset = async () => 'manual-asset';
    let generateImage = async () => ({blob:{},prompt:'new AI prompt'});
    const assets = {saveChatImageToIndexedDB:file=>saveAsset(file),getChatImageFromIndexedDB:async()=> 'data:image/png;base64,NEW'};
    const photo = load('lib/moments-manual-photo.ts',{'./moments-storage':storage,'./chat-asset-storage':assets});
    const retry = load('lib/generated-image-retry.ts',{
        './moments-storage':storage,'./chat-asset-storage':assets,'./moments-manual-photo':photo,
        './image-generation-service':{generateImageFromConfiguredApi:args=>generateImage(args)},
    });
    let requests=[],assembled=[];
    let response = async () => '[评论]fresh[/评论][test-action]';
    const settings = {
        loadBindingConfig:()=>({}), resolveBinding:(_,id)=>({apiConfigId:`api-${id}`,presetId:'preset',worldBookIds:[id],regexIds:[]}),
        loadApiConfigs:()=>characters.map(c=>({id:`api-${c.id}`,enableImageRecognition:false})),
        loadPresets:()=>[{id:'preset',builtIn:true}],loadWorldBooks:()=>characters.map(c=>({id:c.id})),loadRegexes:()=>[],
        resolveUserIdentity:id=>({name:`User-${id}`}),
    };
    const engine = load('lib/moments-engine.ts',{
        ...baseImports,'./moments-storage':engineStorage,'./settings-storage':settings,
        './memory-storage':{loadMemoryConfig:()=>({})},
        './memory-service':{retrieveCoreMemoriesForPrompt:async()=>[],retrieveMemoriesForPrompt:async()=>[]},
        './memory-injector':{formatCoreMemories:()=> 'private core',formatLongTermMemories:()=> 'private memory'},
        './calendar-storage':{buildCalendarScheduleMarker:()=> 'private calendar'},'./calendar-utils':{getWeekStartIso:()=>''},
        './custom-sticker-storage':{getCustomStickerNames:()=>'',getCustomStickerExample:()=>''},
        './short-term-assembler':{prepareShortTermContext:()=>({recentBlocks:[{tag:'recent_moments',content:'old comment and other NPC worlds'},{tag:'recent_chat',content:'private chat'}],wbActivationContext:'old',unifiedRecentItems:[{kind:'event',sourceApp:'moments',text:'old'}]})},
        './llm-prompt-assembler':{assemblePromptPayload:input=>{assembled.push(input);return [];}},
        './chat-engine':{sendLLMRequest:async(config,preset,messages,regexes,identity,options)=>{requests.push({config,messages,identity,options}); return response();}},
        './action-parser':{parseActionTags:text=>({cleanText:text.replace('[test-action]',''),actions:[{type:'forbidden'}]})},
        './moments-comment-threading':load('lib/moments-comment-threading.ts',{}),
        './moments-manual-photo':photo,'./chat-asset-storage':assets,
        './image-generation-service':{generateImageFromConfiguredApi:args=>generateImage(args)},
        './abort-utils':{throwIfAborted:()=>{},isAbortError:()=>false},
    }, '\nexport const __test = { buildMomentUiSnapshot, buildMomentSnapshotMessage };');

    for(const authorType of ['character','npc']) for(const nested of [false,true]) {
        const target=comment({authorType,authorId:authorType==='npc'?'npc-1':'b',
            ...(authorType==='npc'?{authorName:'Neighbor',generationSourceCharacterId:'a'}:{}),
            ...(nested?{replyToCommentId:'parent',replyToAuthorId:'user',replyToAuthorType:'user',replyToAuthorName:'User-a'}:{})});
        const rows=[...(nested?[comment({id:'parent',authorType:'user',authorId:'user',createdAt:'2026-10-12T00:00:30Z'})]:[]),target,
            comment({id:'child',authorType:'user',authorId:'user',replyToCommentId:'c',replyToAuthorId:target.authorId,replyToAuthorType:authorType})];
        await reset(post(),rows);
        const updated=await engine.regenerateMomentComment('p','c');
        assert.deepEqual({...clone(updated),content:'old'},target);
        assert.equal(updated.content,'fresh');
        assert.deepEqual(Array.from(commentStorage.loadMomentComments('p'),c=>c.id),rows.map(c=>c.id));
        assert.deepEqual(clone(commentStorage.loadMomentComments('p').find(c=>c.id==='child')),rows.at(-1));
        assert.equal(requests.at(-1).config.id,authorType==='npc'?'api-a':'api-b');
        assert.deepEqual(events,['moments-updated']);
        if(authorType==='npc') {
            assert.equal(assembled.at(-1).coreMemories,'');
            assert.equal(assembled.at(-1).longTermMemories,'');
            assert.equal(assembled.at(-1).recentBlocks.length,0);
            assert.ok(assembled.at(-1).appTags.includes('npc_reply'));
            assert.match(requests.at(-1).messages.at(-1).content,/Neighbor/);
        }
        pass(`${authorType} ${nested?'reply':'root'} preserves identity, children, order and API binding`);
    }
    await reset(post(),[comment({authorType:'user',authorId:'user'})]);
    await assert.rejects(engine.regenerateMomentComment('p','c'),/非用户/); pass('user comments rejected');
    const npc=comment({authorType:'npc',authorId:'npc',authorName:'Neighbor'});
    await reset(post({authorType:'user',authorId:'user',visibility:['a','x']}),[npc]);
    const beforeCalls=requests.length;
    await assert.rejects(engine.regenerateMomentComment('p','c'),/安全确定/);
    assert.equal(requests.length,beforeCalls); pass('ambiguous legacy NPC user post fails closed before API call');
    await reset(post({authorType:'user',authorId:'user',visibility:['a']}),[npc]);
    await engine.regenerateMomentComment('p','c'); assert.equal(requests.at(-1).config.id,'api-a'); pass('single-viewer legacy NPC safe fallback');
    await reset(post(),[npc]); await engine.regenerateMomentComment('p','c'); pass('legacy NPC character post uses post owner');
    for(const owner of ['deleted','x']) {
        await reset(post(),[{...npc,generationSourceCharacterId:owner}]);
        await assert.rejects(engine.regenerateMomentComment('p','c')); pass(`explicit NPC owner ${owner} never falls back`);
    }
    await reset(post(),[comment({replyToCommentId:'parent',replyToAuthorType:'user',replyToAuthorId:'user'}),comment({id:'parent',authorId:'x'})]);
    await assert.rejects(engine.regenerateMomentComment('p','c'),/回复关系/); pass('cross-world actual parent rejected');
    await reset(post({authorType:'user',authorId:'user',visibility:['a','x'],likes:[{authorType:'npc',authorId:'unknown',authorName:'UNKNOWN WORLD',createdAt:'now'}]}),[{...npc,generationSourceCharacterId:'a'},comment({id:'secret',authorType:'npc',authorId:'npc-x',authorName:'SECRET',content:'OTHER WORLD',generationSourceCharacterId:'x'}),comment({id:'secret-child',authorId:'a',content:'OTHER WORLD CHILD',replyToCommentId:'secret',replyToAuthorType:'npc',replyToAuthorId:'npc-x',replyToAuthorName:'SECRET'})]);
    await engine.regenerateMomentComment('p','c');
    assert.doesNotMatch(requests.at(-1).messages.at(-1).content,/SECRET|OTHER WORLD|UNKNOWN WORLD/); pass('NPC snapshot excludes other-world provenance, descendants and unknown NPC likes');
    for(const failure of [null,'[不回复]','[test-action]']) {
        await reset(); response=async()=>failure;
        await assert.rejects(engine.regenerateMomentComment('p','c'));
        assert.equal(commentStorage.loadMomentComments('p')[0].content,'old'); pass(`invalid response ${failure} preserves old comment`);
    }
    response=async()=>{throw Error('network');}; await reset();
    await assert.rejects(engine.regenerateMomentComment('p','c')); assert.equal(commentStorage.loadMomentComments('p')[0].content,'old'); pass('network failure preserves comment');
    for(const mutation of ['delete','edit','identity','world','photo']) {
        await reset(); const gate=deferred(); response=()=>gate.promise;
        const callsBefore=requests.length;
        const job=engine.regenerateMomentComment('p','c');
        await assert.rejects(engine.regenerateMomentComment('p','c'),/正在/);
        // Let the request pass prompt assembly before mutating current state.
        while(requests.length===callsBefore) await new Promise(r=>setImmediate(r));
        if(mutation==='delete') commentStorage.deleteMomentCommentThread('c');
        if(mutation==='edit') commentStorage.updateMomentComment('c',{content:'edited'});
        if(mutation==='identity') commentStorage.updateMomentComment('c',{replyToAuthorName:'changed'});
        if(mutation==='world') storage.updateMomentPost('p',{visibility:[]});
        if(mutation==='photo') storage.updateMomentPost('p',{photoUrl:'asset://new',photoGenerationRevision:'new'});
        gate.resolve('late');
        if(mutation==='world') {
            // The post author and same-world role can still see a character post only if visible.
            await assert.rejects(job);
        } else await assert.rejects(job);
        assert.ok(!commentStorage.loadMomentComments('p').some(c=>c.content==='late'));
        pass(`duplicate click and concurrent ${mutation} reject stale response`);
    }
    response=async()=> 'fresh'; await reset(); await engine.regenerateMomentComment('p','c'); pass('failure releases comment lock');

    const file={type:'image/png'};
    await reset(post({photoUrl:'asset://old',photoDescription:'DOG',photoGenerationPrompt:'DOG PROMPT',photoUseReferenceImage:true,photoGenerationError:'old error',photoGenerationRevision:'old'}));
    await photo.replaceMomentPhotoFromLocalFile('p',file);
    const freshStorage=load('lib/moments-storage.ts',baseImports); await freshStorage.hydrateMomentsStorage();
    const persisted=freshStorage.loadMomentPosts()[0];
    assert.equal(persisted.photoUrl,'asset://manual-asset');
    for(const key of ['photoDescription','photoGenerationPrompt','photoUseReferenceImage','photoGenerationError']) assert.equal(persisted[key],undefined);
    assert.doesNotMatch(JSON.stringify(persisted),/DOG/); pass('durable post rehydration contains manual asset and no old prompt');
    for(const kind of ['asset','row']) {
        await reset(post({photoUrl:'asset://old',photoDescription:'DOG'}));
        if(kind==='asset') saveAsset=async()=>{throw Error('asset failure');};
        else confirmPost=async()=>{throw Error('row failure');};
        await assert.rejects(photo.replaceMomentPhotoFromLocalFile('p',file),/failure/);
        assert.equal(storage.loadMomentPosts()[0].photoUrl,'asset://old');
        assert.equal(storage.loadMomentPosts()[0].photoDescription,'DOG');
        pass(`${kind} storage failure preserves original image/metadata`);
        saveAsset=async()=> 'manual-asset'; confirmPost=async row=>diskPosts.set(row.id,clone(row));
    }
    await reset(); const uploadGate=deferred(); saveAsset=()=>uploadGate.promise;
    const upload=photo.replaceMomentPhotoFromLocalFile('p',file);
    await assert.rejects(photo.replaceMomentPhotoFromLocalFile('p',file),/正在上传/);
    storage.deleteMomentPost('p'); uploadGate.resolve('asset');
    await assert.rejects(upload,/已删除/); assert.equal(storage.loadMomentPosts().length,0); pass('concurrent uploads locked and deleted post never resurrected');
    saveAsset=async()=> 'manual-asset';
    for(const mode of ['retry-success','retry-error','background-success','background-error','newer-retry']) {
        await reset(post({photoUrl:'asset://old',photoDescription:'DOG'}));
        const gate=deferred(); generateImage=()=>gate.promise;
        let job;
        if(mode.startsWith('background')) engine.attachMomentPhotoInBackground('p','DOG','a',true);
        else job=retry.retryMomentGeneratedPhoto(storage.loadMomentPosts()[0]);
        await photo.replaceMomentPhotoFromLocalFile('p',file);
        const manualRevision=storage.loadMomentPosts()[0].photoGenerationRevision;
        if(mode==='newer-retry') {
            generateImage=async()=>({blob:{},prompt:'CAT'});
            await retry.retryMomentGeneratedPhoto(storage.loadMomentPosts()[0],'CAT',false);
        }
        if(mode.endsWith('error')) gate.reject(Error('late failure'));
        else gate.resolve({blob:{},prompt:'DOG PROMPT'});
        if(job) await job;
        else await new Promise(r=>setImmediate(r));
        const current=storage.loadMomentPosts()[0];
        assert.doesNotMatch(JSON.stringify(current),/DOG/);
        if(mode!=='newer-retry') {
            assert.equal(current.photoSource,'manual_upload'); assert.equal(current.photoGenerationRevision,manualRevision);
        } else assert.equal(current.photoGenerationPrompt,'CAT');
        pass(`${mode} late completion cannot overwrite manual/newer image`);
    }
    await reset(post({photoUrl:'asset://old',photoDescription:'DOG'}));
    const stalePost=storage.loadMomentPosts()[0];
    await photo.replaceMomentPhotoFromLocalFile('p',file);
    await assert.rejects(retry.retryMomentGeneratedPhoto(stalePost),/缺少图片描述/); pass('stale caller cannot reuse removed prompt after manual upload');
    const dirtyManual={...storage.loadMomentPosts()[0],photoDescription:'DOG',photoGenerationPrompt:'DOG PROMPT'};
    const message=await engine.__test.buildMomentSnapshotMessage(dirtyManual,'a',{enableImageRecognition:false},'test');
    assert.match(message.content,/禁止推测/); assert.doesNotMatch(message.content,/DOG|见附图/); pass('vision disabled snapshot does not describe manual image from old prompt');
    const missingImage=engine.__test.buildMomentUiSnapshot({...dirtyManual,photoUrl:undefined},'a');
    assert.doesNotMatch(missingImage,/DOG/); pass('missing manual asset never falls back to stale description');
    const vision=await engine.__test.buildMomentSnapshotMessage(dirtyManual,'a',{enableImageRecognition:true},'test');
    assert.equal(vision.content[1].type,'image_url'); pass('enabled vision attaches current asset');
    const React=require('react'), render=require('react-dom/server').renderToStaticMarkup;
    const cardImports={
        'react':React,'react/jsx-runtime':require('react/jsx-runtime'),'react-dom':require('react-dom'),'lucide-react':require('lucide-react'),
        '@/lib/moments-storage':engineStorage,'@/lib/character-storage':baseImports['./character-storage'],'@/lib/settings-storage':settings,
        '@/lib/moments-comment-threading':load('lib/moments-comment-threading.ts',{}),
        '@/lib/chat-asset-storage':assets,'@/lib/generated-image-retry':retry,'@/lib/moments-engine':engine,'@/lib/moments-manual-photo':photo,
        '@/lib/image-generation-service':{hasCharacterReferenceImage:()=>false},
        '@/lib/bilingual-text':load('lib/bilingual-text.ts',{}),
        '@/components/chat/message-bubble':{BilingualTextBlock:()=>null,MediaImageWithPreview:()=>null},
        './media-preview-overlay':{MediaPreviewOverlay:()=>null},'./generated-image-error-dialog':{GeneratedImageErrorDialog:()=>null},
        '@/components/ui':{ConfirmDialog:()=>null},
    };
    const {MomentPostCard}=load('components/chat/moment-post-card.tsx',cardImports);
    await reset(post(),[comment(),{...npc,id:'npc-root'},comment({id:'user',authorType:'user',authorId:'user'}),comment({id:'reply',replyToCommentId:'c'})]);
    const html=render(React.createElement(MomentPostCard,{post:post(),onUpdate:()=>{}}));
    assert.equal((html.match(/aria-label="重新生成评论"/g)||[]).length,3);
    assert.equal((html.match(/type="file"/g)||[]).length,1);
    const userHtml=render(React.createElement(MomentPostCard,{post:post({authorType:'user',authorId:'user'}),onUpdate:()=>{}}));
    assert.doesNotMatch(userHtml,/type="file"/); pass('actual React render shows reroll for character/NPC roots/replies only and file picker only on character posts');
    await reset(post(),[comment({content:'Hello | 你好'})]);
    const bilingualHtml=render(React.createElement(MomentPostCard,{post:post(),onUpdate:()=>{}}));
    assert.match(bilingualHtml,/Hello/); assert.match(bilingualHtml,/feed-inline-translation-toggle/);
    storage.saveMomentsConfig({...storage.loadMomentsConfig(),collapseBilingualTranslation:false});
    const expandedHtml=render(React.createElement(MomentPostCard,{post:post(),onUpdate:()=>{}}));
    assert.match(expandedHtml,/你好/); pass('existing bilingual comment rendering and collapse preference retained');
    const getAsset=assets.getChatImageFromIndexedDB;
    assets.getChatImageFromIndexedDB=async()=>null;
    await reset(post({photoUrl:'asset://old'}));
    await assert.rejects(photo.replaceMomentPhotoFromLocalFile('p',file),/图片存储失败/);
    assert.equal(storage.loadMomentPosts()[0].photoUrl,'asset://old');
    assets.getChatImageFromIndexedDB=getAsset; pass('silent asset-store open failure cannot replace original image');
    console.log(`PASS ${checks} extended behavior cases`);
};
