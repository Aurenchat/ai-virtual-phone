// COPY FIRST. This script copies complete pinned modules and applies only named patches.
// Re-run after editing this script; it never reads or writes built-in product files.
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const app='custom-apps/anonymous-xiaohongshu',root=app+'/src/fork';
const provenance=JSON.parse(await fs.readFile(app+'/upstream/provenance.json','utf8'));
// Source snapshots are data, not part of the Host TypeScript program.
for(const row of provenance.files){const old=app+'/upstream/'+row.path;try{await fs.rename(old,old+'.source');}catch(e){if(e.code!=='ENOENT')throw e;}}
const map=[];
function replaceFunction(s,name,body){const file=ts.createSourceFile('source.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!node)throw Error('Missing upstream function '+name);return s.slice(0,node.getStart(file))+body+s.slice(node.end);}
function swap(s,from,to){if(!s.includes(from))throw Error('Missing patch anchor: '+from.slice(0,90));return s.replace(from,to);}
for(const row of provenance.files){
 if(row.path==='lib/builtin-preset.ts')continue;
 if(row.path.startsWith('public/xiaohongshu/avatars/')){
  const fork='assets/avatars/'+path.basename(row.path);await fs.copyFile(app+'/upstream/'+row.path+'.source',app+'/'+fork);
  map.push({upstream:row.path,fork,copiedDirectly:true,modifications:[]});continue;
 }
 let s=(await fs.readFile(app+'/upstream/'+row.path+'.source','utf8')).replaceAll('\r\n','\n');const changes=[];
 const adapt=(from,to,reason)=>{s=swap(s,from,to);changes.push(reason);};
 if(row.path.startsWith('styles/')){} else {
 const imports={
  '@/lib/chat-asset-storage':'../../../adapters/media','@/lib/character-storage':'../../../adapters/characters','@/lib/character-types':'../../../adapters/characters',
  '@/lib/memory-storage':'../../../adapters/memory','@/lib/memory-summarizer':'../../../adapters/memory','@/lib/settings-storage':'../../../adapters/settings',
  '@/lib/chat-share':'../../../adapters/chat','@/lib/checkphone-settings':'../../../adapters/settings',
  './chat-asset-storage':'../../adapters/media','./chat-engine':'../../adapters/ai','./character-storage':'../../adapters/characters','./character-types':'../../adapters/characters',
  './llm-prompt-assembler':'../../adapters/ai','./settings-storage':'../../adapters/settings','./settings-types':'../../adapters/ai','./kv-db':'../../adapters/storage',
 };
 for(const [from,to] of Object.entries(imports)){if(s.includes('"'+from+'"')){s=s.replaceAll('"'+from+'"','"'+to+'"');changes.push(`CUSTOM-APP-ADAPTER: ${from} -> ${to}`);}}
 s=s.replaceAll('"@/lib/', '"../../lib/').replaceAll('"@/components/', '"../');
 }
 if(row.path==='lib/xiaohongshu-engine.ts'){
  s='// ANON-FORK: append stable public account references in DM input, never owner metadata.\nimport { accountByName } from "../../adapters/identity";\n'+s;
  s=s.replace(/^import .* from "\.\/(memory-injector|memory-storage|memory-service|short-term-assembler)";\n/gm,'');
 s=replaceFunction(s,'resolveCharacterAssemblerInput',`// CUSTOM-APP-ADAPTER: source-scoped character configuration; no native RP memory assembly.
async function resolveCharacterAssemblerInput(characterId: string, appTags: string[], context: {feedContext?:string;userPostContext?:string;commentContext?:string;mentionContext?:string}, settings?:XiaohongshuSettings):Promise<AssemblerResult|null>{
 const character=loadCharacters().find(c=>c.id===characterId);if(!character)return null;
 const input:AssemblerInput={character,appTags,...context,xiaohongshuBilingualInstruction:buildXiaohongshuBilingualInstruction(settings)};
 return {character,apiConfig:{id:character.id,enableImageRecognition:true,defaultModel:""},preset:null,regexes:[],input};
}`);
  s=s.replace('function isVisionUnsupportedError(error: unknown): boolean {\n  const message', 'function isVisionUnsupportedError(error: unknown): boolean {\n  // CUSTOM-APP-ADAPTER: Host preserves provider semantics; only this stable code permits the native text-only retry.\n  const code = error && typeof error === "object" ? String((error as { code?: unknown }).code ?? "") : "";\n  if (code === "MULTIMODAL_UNSUPPORTED") return true;\n  if (code) return false;\n  const message');
  changes.push('CUSTOM-APP-ADAPTER: consume structured multimodal error; never retry ordinary provider failures');
  s=replaceFunction(s,'buildXiaohongshuUserIdentityHint',`// ANON-FORK: following an account never establishes its real-world owner.
function buildXiaohongshuUserIdentityHint(_input:{characterId:string;userName?:string;xiaohongshuNames?:string[]}):string{return "[匿名小红书] 所有发言者为独立 social_account。身份以当前 viewer 的明确揭露为准，关注关系不构成身份揭露。";}`);
  changes.push('ANON-FORK: replace only native global-context assembly and follow-implies-owner hint; all nine generators, parsers, reducers and fallback retained');
  s=s.replace('`[来源]${note.source === "user" ? "用户笔记" : note.source === "character" ? "角色笔记" : "NPC笔记"}`','"[来源][匿名小红书] social_account"');
  s=s.replaceAll('`[作者]${note.authorName}`','`[作者]${note.authorName} [accountId]${note.authorId}`').replace('[作者]${comment.authorName}${reply}', '[作者]${comment.authorName} [accountId]${comment.authorId}${reply}');
  s=s.replace('${comment.authorName}${reply}：${comment.text}', '${comment.authorName} [accountId]${comment.authorId}${reply}：${comment.text}');
  s=s.replace('return `[${speaker}] ${message.text}`;', 'return `[${speaker}] [accountId]${accountByName(speaker)?.accountId || "unknown"} ${message.text}`;');
  s=s.replace('`[对话对象]${input.threadName}`','`[对话对象]${input.threadName} [accountId]${accountByName(input.threadName)?.accountId || "unknown"}`');
  s=s.replace('model: resolved.apiConfig.defaultModel,','model: resolved.apiConfig.defaultModel ?? "",');
 }
 if(row.path==='lib/xiaohongshu-character-profile.ts'){
  s=s.replace(/^import .* from "\.\/(checkphone-config|checkphone-storage)";\n/gm,'');
  s=replaceFunction(s,'resolveCharacterXiaohongshuDisplayName',`// ANON-FORK: Character is already a public account projection; never read the native phone snapshot.
export function resolveCharacterXiaohongshuDisplayName(character:Pick<Character,"id"|"name">):string{return character.name;}`);
  changes.push('ANON-FORK: resolve projected social nickname without native snapshot or real-name fallback');
 }
 if(row.path==='lib/xiaohongshu-memory.ts'){
  s='// CUSTOM-APP-ADAPTER: preserve native event builders; explicit subjects and source invalidation.\nimport { publishEventProjection, removeEventProjections } from "../../adapters/memory";\nimport { subjectAccount } from "../../adapters/identity";\n'+s;
  s=s.replace('  commentId?: string;','  commentId?: string;\n  subjectIds?: string[]; // ANON-FORK: stable subjects, never inferred from prose.');
  s=s.replace('  saveEvents(characterId, next);','  saveEvents(characterId, next);\n  publishEventProjection(characterId, entry);');
  s=s.replace('    id: `xiaohongshu_post_${input.note.id}`,','    subjectIds: [input.characterId, subjectAccount(input.note.authorId,input.note.authorName,input.note.source).accountId],\n    id: `xiaohongshu_post_${input.note.id}`,');
  s=s.replace('    id: `xiaohongshu_comment_${input.comment.id}`,','    subjectIds: [input.characterId, subjectAccount(input.note.authorId,input.note.authorName,input.note.source).accountId],\n    id: `xiaohongshu_comment_${input.comment.id}`,');
  s=s.replace('    id: `xiaohongshu_reply_${input.comment.id}`,','    subjectIds: [input.characterId, ...(input.targetComment ? [subjectAccount(input.targetComment.authorId,input.targetComment.authorName,input.targetComment.authorType).accountId] : [])],\n    id: `xiaohongshu_reply_${input.comment.id}`,');
  s=s.replace('    id: "xiaohongshu_follow_user",','    subjectIds: [input.characterId, subjectAccount("",input.userDisplayName,"user").accountId],\n    id: "xiaohongshu_follow_user",');
  s=s.replace('  if (!noteId || typeof window === "undefined") return;','  if (!noteId || typeof window === "undefined") return;\n  removeEventProjections({noteId}); // CUSTOM-APP-ADAPTER: also invalidate Host evidence.');
  s=s.replace('  if (!commentId || typeof window === "undefined") return;','  if (!commentId || typeof window === "undefined") return;\n  removeEventProjections({commentId});');
  s=s.replace('export function clearXiaohongshuProjectionEvents(): void {','export function clearXiaohongshuProjectionEvents(): void {\n  removeEventProjections({all:true});');
  s=s.replace('return authorType === "user" ? `“${name}”（用户的小红书账号）` : `“${name}”`;','return `“${name}”`;');
  s=s.replaceAll('（用户的小红书账号）','').replaceAll('[小红书 ${time}]','[匿名小红书 ${time}]');
  changes.push('ANON-FORK: remove controller ownership labels; publish stable account source evidence via adapter');
 }
 if(row.path==='lib/xiaohongshu-storage.ts'){
  s='// ANON-FORK: canonical public author IDs at the local persistence boundary.\nimport { canonicalPlatform } from "../../adapters/identity";\n'+s;
  s=s.replace('const next = { ...state, updatedAt: new Date().toISOString() };','const next = canonicalPlatform({ ...state, updatedAt: new Date().toISOString() });');
  changes.push('ANON-FORK: canonicalize stable social account IDs on persistence; preserve upstream schema and normalization');
 }
 if(row.path==='components/xiaohongshu/xiaohongshu-app.tsx'){
  s=s.replace(/const DEFAULT_XHS_AVATARS = \[[\s\S]*?\];/,'// CUSTOM-APP-ADAPTER: package asset URLs are hydrated before mount.\nconst DEFAULT_XHS_AVATARS = defaultAvatars();');
  s='import { defaultAvatars } from "../../../adapters/media";\n'+s;
  s=s.replace('const requestClose = () => onClose(busy !== "idle");','// CUSTOM-APP-ADAPTER: Host owns requests; closing is unconditional.\n  const requestClose = () => onClose(false);');
  s=s.replace('  const [profileOpen, setProfileOpen] = useState(false);','  const [profileOpen, setProfileOpen] = useState(!hasUserProfile());');
  s=s.replace('  const profileCoverFileRef = useRef<HTMLInputElement | null>(null);','  const profileCoverFileRef = useRef<HTMLInputElement | null>(null);\n  const profileAvatarFileRef = useRef<HTMLInputElement | null>(null); // ANON-FORK: independent local avatar.');
  s=s.replace('  async function handleProfileCoverChange(event: ChangeEvent<HTMLInputElement>) {',`  // ANON-FORK: reuse the native image processor for this App's own user avatar only.
  async function handleProfileAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    const image=await processImageFile(file);if(!image?.assetId)return;
    const dataUrl=await getChatImageFromIndexedDB(image.assetId);if(!dataUrl)return;
    setUserAvatar(dataUrl);setState(loadXiaohongshuState());
  }
  async function handleProfileCoverChange(event: ChangeEvent<HTMLInputElement>) {`);
  s=s.replace('<div className="cp-xhs-profile-avatar-wrap">','{/* ANON-FORK: same avatar presentation, independently editable, never global profile. */}\n                  <input ref={profileAvatarFileRef} type="file" accept="image/*" hidden onChange={handleProfileAvatarChange} />\n                  <div className="cp-xhs-profile-avatar-wrap" role="button" tabIndex={0} aria-label="修改匿名头像" onClick={() => profileAvatarFileRef.current?.click()} onKeyDown={event => { if(event.key === "Enter") profileAvatarFileRef.current?.click(); }}>');
  s=s.replace('const userIdentity = useMemo(() => resolveUserIdentity(undefined, "xiaohongshu") ?? resolveUserIdentity(), []);','const userIdentity = resolveUserIdentity(undefined, "xiaohongshu") ?? resolveUserIdentity();');
  // Keep the native settings model and every original section. Real labels only in participant management.
  s=s.replace('<em>{character.name}</em>','<em>{managementName(character.id)}</em>');
  s=s.replace('              <div className="xhs-profile-edit-field">\n                <span className="xhs-profile-edit-section-title">PROMPTS', '              {/* ANON-FORK: only additional settings control: edit already-created social names. */}\n              <NicknameSettings onChange={() => { setCharacters(loadCharacters()); setState(loadXiaohongshuState()); }} />\n              <div className="xhs-profile-edit-field">\n                <span className="xhs-profile-edit-section-title">PROMPTS');
  s=s.replace('window.dispatchEvent(new CustomEvent("open-mini-chat", { detail: { share } }));','void shareCard(share); // CUSTOM-APP-ADAPTER: existing Host chat.sendCard boundary.');
  s=s.replace('    setCharacters(loadCharacters());\n  }, []);','    setCharacters(loadCharacters());\n    return subscribeCharacters(() => setCharacters(loadCharacters()));\n  }, []);');
  // Durable action journal replays these ORIGINAL handlers against their saved input; no rewritten workflow.
  const file=ts.createSourceFile('ui.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const component=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='XiaohongshuApp');
  const handlers=['handleGenerateHomeContent','handlePublish','submitUserComment','handleLoadMoreComments','handleGenerateDmReply'];
  const edits=[];
  for(const n of component.body.statements){if(!ts.isFunctionDeclaration(n)||!handlers.includes(n.name?.text))continue;
   const name=n.name.text;const start=n.getStart(file),end=n.end;let body=s.slice(start,end);
   const guard=body.indexOf('return;')+7;
   const args=name==='submitUserComment'?'[options]':name==='handleLoadMoreComments'?'[note]':name==='handleGenerateDmReply'?'[thread]':'[]';
   body=body.slice(0,guard)+`\n    // CUSTOM-APP-ADAPTER: save the original handler input before the first await.\n    if (!(await beginAction("${name}", {state,draft,tagInput,commentDraft,replyTarget,selectedNoteId,dmDraft,selectedDmThreadId}, ${args}))) return;`+body.slice(guard);
   if(name==='handleGenerateDmReply')body=body.replace('    if (!latestUserText) {','    if (!latestUserText) {\n      await finishAction(); // CUSTOM-APP-ADAPTER: no request started.');
   body=body.replace('    } finally {\n      setBusy("idle");','    } finally {\n      await finishAction(); // CUSTOM-APP-ADAPTER: durable checkpoint.\n      setBusy("idle");');
   edits.push({start,end,body});
  }
  for(const e of edits.reverse())s=s.slice(0,e.start)+e.body+s.slice(e.end);
  s=s.replace('  function persist(next: XiaohongshuState)',`  // CUSTOM-APP-ADAPTER: restore original handler inputs after iframe destruction.
  const [recoveryStep, setRecoveryStep] = useState(0);
  useEffect(() => {
    const pending = pendingAction(); if (!pending) return;
    const v = pending.view;
    setState(v.state); setDraft(v.draft); setTagInput(v.tagInput); setCommentDraft(v.commentDraft);
    setReplyTarget(v.replyTarget); setSelectedNoteId(v.selectedNoteId); setDmDraft(v.dmDraft); setSelectedDmThreadId(v.selectedDmThreadId);
    setRecoveryStep(1);
  }, []);
  useEffect(() => {
    if (recoveryStep !== 1 || !characters.length) return;
    setRecoveryStep(2);
    const pending = pendingAction(); if (!pending) return;
    const actions:Record<string,(...args:any[])=>Promise<void>>={handleGenerateHomeContent,handlePublish,submitUserComment,handleLoadMoreComments,handleGenerateDmReply};
    void actions[pending.kind]?.(...pending.args);
  }, [recoveryStep,characters]);

  function persist(next: XiaohongshuState)`);
  s=s.replace('    const ids = activeSettings.participantCharacterIds;','    const ids = activeSettings.participantCharacterIds;\n    void initializeNicknames(ids); // ANON-FORK: one background batch, never awaited by feed.');
  s=s.replace('      const activeSettings = state.settings;','      const activeSettings = state.settings;\n      void initializeNicknames(activeSettings.participantCharacterIds); // ANON-FORK: overlaps NPC generation.');
  s=s.replace('      for (const characterId of current.settings.participantCharacterIds) {','      void initializeNicknames(current.settings.participantCharacterIds);\n      for (const characterId of current.settings.participantCharacterIds) {');
  s=s.replace('    persist({\n      ...state,\n      profile:', '    if (!setUserProfile(profileDraft.nickname)) return; // ANON-FORK: no global user profile.\n    persist({\n      ...state,\n      profile:');
  s=s.replace('"use client";','"use client";\n// CUSTOM-APP-ADAPTER: lifecycle and identity additions; all native page JSX remains.\nimport { beginAction,finishAction,pendingAction } from "../../../adapters/tasks";\nimport { hasUserProfile,setUserProfile,setUserAvatar } from "../../../adapters/identity";\nimport { managementName,subscribeCharacters,initializeNicknames } from "../../../adapters/characters";\nimport { NicknameSettings } from "../../../identity/nickname-settings";\nimport { shareCard } from "../../../adapters/chat";');
  changes.push('CUSTOM-APP-ADAPTER: journal original generation handlers, resume on remount, unconditional close, Host sharing');
  changes.push('ANON-FORK: independent user profile; participant labels local only; automatic background names and one nickname editor');
 }
 // Deterministic IDs during recovery, scoped to fork code, never patch global Math/Date.
 if(['lib/xiaohongshu-engine.ts','lib/xiaohongshu-storage.ts','components/xiaohongshu/xiaohongshu-app.tsx'].includes(row.path)){
  const rel=row.path.startsWith('lib/')?'../../adapters/tasks':'../../../adapters/tasks';
  s=`// CUSTOM-APP-ADAPTER: stable IDs/probability decisions when a durable action resumes.\nimport { actionRandom, actionNow, actionUuid } from "${rel}";\n`+s.replaceAll('Math.random()','actionRandom()').replaceAll('Date.now()','actionNow()').replaceAll('crypto.randomUUID()','actionUuid()').replace('typeof crypto !== "undefined" && crypto.randomUUID','typeof crypto !== "undefined"');
  changes.push('CUSTOM-APP-ADAPTER: deterministic action randomness/time for repeatable continuation');
 }
 const dest=path.join(root,row.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,s);
 map.push({upstream:row.path,fork:path.relative(app,dest).replaceAll('\\','/'),copiedDirectly:true,modifications:changes});
}
const preset=await fs.readFile(app+'/upstream/lib/builtin-preset.ts.source','utf8');const blocks={};
for(const [kind,id] of Object.entries({activity:'xiaohongshu_character_activity',reaction:'xiaohongshu_user_post_reaction',reply:'xiaohongshu_comment_reply',mention:'xiaohongshu_mention_reply'})){
 const start=preset.indexOf('"<'+id+'_instruction>"');if(start<0)throw Error(id);const literal=preset.slice(start,preset.indexOf('].join("\\n")',start));
 blocks[kind]=[...literal.matchAll(/^\s*("(?:[^"\\]|\\.)*"),?\s*$/gm)].map(m=>JSON.parse(m[1])).join('\n');
}
await fs.writeFile(root+'/lib/xiaohongshu-prompts.ts','// CUSTOM-APP-ADAPTER: exact Xiaohongshu protocol blocks from pinned builtin-preset.ts.\nexport const NATIVE_CHARACTER_PROMPTS='+JSON.stringify(blocks,null,2)+' as const;\n');
map.push({upstream:'lib/builtin-preset.ts',fork:'src/fork/lib/xiaohongshu-prompts.ts',copiedDirectly:false,modifications:['CUSTOM-APP-ADAPTER: extract the four exact Xiaohongshu protocol blocks, not the unrelated global chat preset']});
// app/globals.css imports Tailwind before product CSS. Its reset is part of the visual dependency closure.
const tw=JSON.parse(await fs.readFile('node_modules/tailwindcss/package.json','utf8'));
const reset=await fs.readFile('node_modules/tailwindcss/preflight.css');
await fs.writeFile(root+'/styles/tailwind-preflight.css',reset);
const dependency={package:'tailwindcss',version:tw.version,path:'preflight.css',sha256:createHash('sha256').update(reset).digest('hex'),fork:'src/fork/styles/tailwind-preflight.css',reason:'Original app/globals.css @import tailwindcss reset; copied unchanged'};
await fs.writeFile(app+'/source-map.json',JSON.stringify({revision:provenance.revision,files:map,dependencies:[dependency]},null,2)+'\n');
let diff='';for(const row of map.filter(r=>r.copiedDirectly)){
 const original=app+'/upstream/'+row.upstream+'.source',fork=app+'/'+row.fork;
 const result=spawnSync('git',['diff','--no-index','--no-ext-diff','--',original,fork],{encoding:'utf8'});if(result.status>1)throw Error(result.stderr);
 diff+=result.stdout.replaceAll(original,row.upstream).replaceAll(fork,row.fork);
}
await fs.writeFile(app+'/SOURCE-DIFF.patch',diff.replace(/[ \t]+$/gm,''));
console.log(`Copied ${map.filter(r=>r.copiedDirectly&&!r.upstream.endsWith('.png')).length} COMPLETE modules, 6 avatars and 4 native prompt blocks; generated source map and exact unified diff.`);
