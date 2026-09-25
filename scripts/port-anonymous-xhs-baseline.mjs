// One-time, reproducible mechanical fork. Never writes Float's baseline files.
import fs from 'node:fs/promises';
import ts from 'typescript';
const root='custom-apps/anonymous-xiaohongshu/src';
const banner='// Forked from Float (AGPL-3.0-only), baseline da067218. See BASELINE.md.\n';
async function read(p){return (await fs.readFile(p,'utf8')).replaceAll('\r\n','\n');}
async function put(p,s){await fs.mkdir(root+'/'+p.split('/').slice(0,-1).join('/'),{recursive:true});await fs.writeFile(root+'/'+p,(p.endsWith('.css')?'/* Forked from Float, AGPL-3.0-only. */\n':banner)+s);}
function declarations(s,predicate){const f=ts.createSourceFile('source.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);return f.statements.filter(predicate).map(n=>n.getText(f)).join('\n\n');}
for(const p of ['xiaohongshu-types','bilingual-text','bilingual-prompt-defaults'])await put(p+'.ts',await read('lib/'+p+'.ts'));
let storage=await read('lib/xiaohongshu-storage.ts');
storage=declarations(storage,n=> !(ts.isImportDeclaration(n)&&!n.moduleSpecifier.text.includes('xiaohongshu-types')) && !(ts.isExpressionStatement(n)) && !(ts.isVariableStatement(n)&&n.getText().includes('XHS_STATE_KEY')) && !(ts.isFunctionDeclaration(n)&&['loadXiaohongshuState','saveXiaohongshuState'].includes(n.name?.text)));
storage=storage.replace(/const identity = resolveUserIdentity[^;]+;/,'const identity = { name: "" };');
await put('baseline-storage.ts',storage);
const engine=await read('lib/xiaohongshu-engine.ts');
const engineBody=engine.slice(engine.indexOf('function makeId('),engine.indexOf('function formatFollowedAccountsForPrompt'))+engine.slice(engine.indexOf('export function applyNpcReaction('));
const types=declarations(engine,n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./xiaohongshu-types');
await put('baseline-engine.ts',types+'\nimport {addNames,makeXiaohongshuNpcId,makeXiaohongshuComment,makeXiaohongshuNotification} from "./baseline-storage";\ntype Character={id:string;name:string};\nconst resolveCharacterXiaohongshuDisplayName=(c:Character)=>c.name;\n'+engineBody);
let bilingual=await read('components/checkphone/checkphone-bilingual-text.tsx');
bilingual=bilingual.replace('"@/lib/bilingual-text"','"./bilingual-text"').replace(/import \{\n  CHECKPHONE_SETTINGS_CHANGED_EVENT,[\s\S]*?from "@\/lib\/checkphone-settings";/,'');
bilingual=bilingual.replace(/  useEffect\(\(\) => \{\n    if \(collapseBilingualTranslationOverride[\s\S]*?\}, \[collapseBilingualTranslationOverride\]\);/,'');
await put('bilingual-component.tsx',bilingual);
const ui=await read('components/xiaohongshu/xiaohongshu-app.tsx');
const names=['formatCount','formatTime','hashString','pickDefaultAvatar','XhsAvatar','XhsDislikeIcon','getImageFrameStyle','getXhsPlainText','getNoteCardVariant','getIconImageFrameStyle','NoteDetailSlider','NoteImage','NoteCard','orderCommentsForDisplay','CommentList'];
let uiBody=declarations(ui,n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));
uiBody=uiBody.replaceAll('function ','function ').replace(/^function (XhsAvatar|NoteImage|NoteCard|CommentList|formatCount|formatTime)\(/gm,'export function $1(');
const constants=declarations(ui,n=>(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>/^(DEFAULT_XHS|XHS_.*IMAGE|ICON_XHS_IMAGE|TEXT_XHS_IMAGE|VIDEO_XHS_IMAGE)/.test(d.name.getText())))||(ts.isTypeAliasDeclaration(n)&&n.name.text==='XiaohongshuNoteCardVariant'));
await put('baseline-ui.tsx','import React,{useState,type CSSProperties} from "react";\nimport {Heart} from "lucide-react";\nimport type {XiaohongshuNote,XiaohongshuComment} from "./xiaohongshu-types";\nimport {CheckPhoneBilingualText} from "./bilingual-component";\nimport {splitBilingualText,normalizeBilingualTextInput} from "./bilingual-text";\n'+constants+'\n'+uiBody);
for(const file of ['checkphone.css','xiaohongshu.css'])await put('styles/'+file,await read('styles/'+file));
// Extract only the literal native protocol blocks, never native prompt assembly.
const preset=await read('lib/builtin-preset.ts');
const blocks={};
for(const [kind,id] of Object.entries({activity:'xiaohongshu_character_activity',reaction:'xiaohongshu_user_post_reaction',reply:'xiaohongshu_comment_reply'})){
 const start=preset.indexOf('"<'+id+'_instruction>"');if(start<0)throw Error(id);const literal=preset.slice(start,preset.indexOf('].join("\\n")',start));
 blocks[kind]=[...literal.matchAll(/^\s*("(?:[^"\\]|\\.)*"),?\s*$/gm)].map(m=>JSON.parse(m[1])).join('\n');
}
await put('baseline-prompts.ts','export const NATIVE_CHARACTER_PROMPTS='+JSON.stringify(blocks,null,2)+' as const;\n');
console.log('Forked original UI components, CSS, schemas, parsers, reducers and prompt protocols.');
