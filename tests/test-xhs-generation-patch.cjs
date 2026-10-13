#!/usr/bin/env node
const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'..');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xhs-a-fixture-'));
const app=path.join(dir,'components/xiaohongshu/xiaohongshu-app.tsx');const engine=path.join(dir,'lib/xiaohongshu-engine.ts');fs.mkdirSync(path.dirname(app),{recursive:true});fs.mkdirSync(path.dirname(engine),{recursive:true});
const engineFixture=`export async function generateXiaohongshuCharacterActivity(\n  characterId: string, notes: XiaohongshuNote[], settings?: XiaohongshuSettings,\n) {\n  const resolved = await resolveCharacterAssemblerInput(characterId, ["xiaohongshu", "activity"], { feedContext: "" }, settings);\n  if (!resolved?.apiConfig) return null;\n  const messages = assemblePromptPayload(resolved.input);\n  const raw = await sendLLMRequest(\n    resolved.apiConfig,\n    resolved.preset,\n    messages,\n    resolved.regexes,\n    { characterName: \`小红书:\${resolved.character.name}\`, userName: resolved.input.userIdentity?.name },\n    { appId: "xiaohongshu", appTags: ["xiaohongshu", "activity"] },\n  );\n  return parseWithDebug(raw, output => parseXiaohongshuCharacterActivity(output, notes.map(note => note.id)), "无法解析小红书角色互动内容");\n}\n`;
const appFixture=`import type { Character } from "@/lib/character-types";\n  generateXiaohongshuCharacterActivity,\ntype BusyState = "idle" | "npc-feed" | "character-activity" | "publish";\n  const [pendingFeedAction, setPendingFeedAction] = useState<PendingFeedAction | null>(null);\n  async function generateCharacterActivityState(baseState: XiaohongshuState, activeSettings: XiaohongshuState["settings"]): Promise<XiaohongshuState> { return baseState; }\n\n  async function handleGenerateHomeContent() { }\n\n  function handleSaveProfile() { }\n  function requestFeedAction(action: PendingFeedAction) {\n    if (busy !== "idle") return;\n    setPendingFeedAction(action);\n  }\n    if (action === "refresh") {\n      await handleGenerateHomeContent();\n    } else {\n      handleClearAllContent();\n    }\n          <span>生成首页、附近、视频和角色互动</span>\n              onClick={handleGenerateHomeContent}\n              {busy === "npc-feed" || busy === "character-activity" ? "正在生成" : "生成小红书内容"}\n            {busy === "npc-feed" ? "正在生成帖子内容" : busy === "character-activity" ? "正在生成角色互动内容" : busy === "publish" ? "正在发布笔记" : "其它"}\n      {pendingFeedAction ? (\n        <div/>\n      ) : null}\n    </section>\n  );\n}\n`;
fs.writeFileSync(app,appFixture);fs.writeFileSync(engine,engineFixture);
const run=mode=>cp.spawnSync('python3',[path.join(root,'apply_patch.py'),'--repo',dir,mode],{encoding:'utf8'});
(async()=>{try{
 const packaged=fs.existsSync(path.join(root,'apply_patch.py'));
 let patchApp,patchEngine;
 if(packaged){
 for(const mode of ['--check','--diff']){const r=run(mode);assert.equal(r.status,0,r.stderr);}
 assert.equal(fs.readFileSync(app,'utf8'),appFixture,'check/diff must not mutate');
 assert.equal(run('--apply').status,0);
 patchApp=fs.readFileSync(app,'utf8').replace(/\r\n/g,'\n');patchEngine=fs.readFileSync(engine,'utf8').replace(/\r\n/g,'\n');
 } else {
 patchApp=fs.readFileSync(path.join(root,'components/xiaohongshu/xiaohongshu-app.tsx'),'utf8').replace(/\r\n/g,'\n');
 patchEngine=fs.readFileSync(path.join(root,'lib/xiaohongshu-engine.ts'),'utf8').replace(/\r\n/g,'\n');
 }
 assert(patchApp.includes('selectedPostCharacterIds'));
 assert(patchApp.includes('setCharacters(loadCharacters())'));
 assert(patchApp.includes('role="radiogroup"'));
 assert(patchApp.includes('feedGenerationMode === "selected-posts"'));
 assert(patchApp.includes('generateXiaohongshuCharacterPost(character.id'));
 assert(!patchApp.includes('handleGenerateHomeContent'));
 assert(!patchApp.includes('const characterPost = createCharacterPost(character, activity);'));
 assert(patchEngine.includes('return { comments: parsed.comments };'));
 assert(patchEngine.includes('恰好一篇'));
 assert(patchEngine.includes('parsed.post'));
 const e=ts.createSourceFile('engine.ts',patchEngine,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(e.parseDiagnostics.length,0,e.parseDiagnostics.map(x=>x.messageText).join('\n'));
 // JSX fixture is deliberately a fragment (not a whole valid React component), so
 // test its injected selector JSX as an independently parseable component.
 const begin=patchApp.indexOf('      {pendingFeedAction === "refresh" ? (');
 const end=patchApp.indexOf('    </section>\n  );\n}',begin);
 const jsx='function Test(){return <div>\n'+patchApp.slice(begin,end)+'\n</div>;}';
 const a=ts.createSourceFile('selector.tsx',jsx,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(a.parseDiagnostics.length,0,a.parseDiagnostics.map(x=>x.messageText).join('\n'));
 if(packaged)assert.notEqual(run('--check').status,0,'second application must fail closed');
 // Exercise the actual generated post loop with realistic partial success.
 const startFns=patchApp.indexOf('  async function generateCharacterPostsState(');
 const endFns=patchApp.indexOf('  async function handleGenerateFeedMode(',startFns);
 const tsFns=patchApp.slice(startFns,endFns);
 const env={
  characters:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],
  generateXiaohongshuCharacterPost:async id=>{if(id==='b')throw Error('API failed');return {post:{title:id},comments:[]};},
  createCharacterPost:(character,activity)=>({id:'post-'+character.id,title:activity.post.title,comments:[]}),
  saveXiaohongshuState:s=>JSON.parse(JSON.stringify(s)),setState:()=>{},
  loadCharacters:()=>env.characters,onNotice:()=>{},
  commitGeneratedState:async update=>{stored=JSON.parse(JSON.stringify(update(stored)));return stored;},
  recordXiaohongshuPostEvent:({characterId})=>writes.push(characterId),
  recordCharacterThreadCommentEvents:()=>{},touchCharacterMemory:character=>memories.push(character.id),
  generateXiaohongshuCharacterActivity:async()=>({post:{title:'should not publish'},comments:[]}),
  applyCharacterActivityComment:()=>{throw Error('Unexpected activity comment')},
  recordXiaohongshuCommentEvent:()=>{}, console:{warn:()=>{}}
 };
 let stored={notes:[],notifications:[]};
 const writes=[],memories=[];
 const fns=ts.transpileModule(tsFns,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
 const factories=new Function(...Object.keys(env),fns+';return {generateCharacterPostsState,generateCharacterActivityState};')(...Object.values(env));
 const original={notes:[],notifications:[]};
 const result=await factories.generateCharacterPostsState(original,{},['a','b','c']);
 assert.equal(result.created,2);assert.equal(result.failed,1);
 assert.deepEqual(result.state.notes.map(note=>note.id),['post-c','post-a']);
 assert.deepEqual(writes,['a','c']);assert.deepEqual(memories,['a','c']);
 const activity=await factories.generateCharacterActivityState(result.state,{},['a']);
 assert.equal(activity.notes.length,2,'activity must not create a post');
 console.log('PASS partial role failure keeps successful posts and native memory events, activity cannot publish');
 console.log(packaged?'PASS patch anchors, safe check/diff/apply, selector JSX syntax and dedicated TS engine syntax':'PASS installed selector JSX syntax and dedicated engine syntax (applier tested separately in original package)');
}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
