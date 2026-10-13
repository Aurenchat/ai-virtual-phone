'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const reserve = fs.readFileSync(path.join(__dirname, '../components/chat/use-chat-bottom-reserve.ts'), 'utf8');
const room = fs.readFileSync(path.join(__dirname, '../components/chat/chat-room.tsx'), 'utf8');
assert.match(reserve, /shouldAutoStick\?: \(\) => boolean/);
assert.match(reserve, /wasNearBottom && \(shouldAutoStick\?\.\(\) \?\? true\)/);
assert.match(reserve, /if \(el && \(shouldAutoStick\?\.\(\) \?\? true\)\)/);
assert.match(reserve, /Math\.abs\(el\.scrollTop - target\) > 1/, 'stable overlay notifications must not rewrite scrollTop');
assert.match(room, /scrollStability\.isPinned,/);
console.log('PASS input overlay bottom-reserve honors user-intent gate');

// Exercise the real hook effect: an already queued old observer must not
// schedule work against scrollRef after it points at another room.
const vm = require('node:vm'), ts = require('typescript');
let effect, resizeCallback, next = 0, pinned = true, writes = 0, styleWrites = 0;
const frames = new Map(), listeners = new Map();
const add = (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); };
const remove = (name, fn) => listeners.get(name)?.delete(fn);
class Element { getBoundingClientRect() { return {height:80}; } }
const overlay = new Element(); overlay.dataset = {ui:'input'};
const wrapper = {children:[overlay], style:{setProperty(){styleWrites++;},removeProperty(){styleWrites++;}}};
let top=700, height=1000;
const oldScroll={clientHeight:300,get scrollHeight(){return height;},get scrollTop(){return top;},set scrollTop(v){writes++;top=v;}};
const ref={current:oldScroll};
const exportsForHook={};
const sandbox={exports:exportsForHook,HTMLElement:Element,ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}disconnect(){}},window:{
 requestAnimationFrame(fn){const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},addEventListener:add,removeEventListener:remove,
 visualViewport:{addEventListener:add,removeEventListener:remove}},require(name){assert.equal(name,'react');return{useLayoutEffect(fn){effect=fn;}};}};
vm.runInNewContext(ts.transpileModule(reserve,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
exportsForHook.useChatBottomReserve({current:wrapper},ref,'A',()=>pinned);
const cleanup=effect();assert.equal(frames.size,1);
pinned=false;height=1200;
for(const [id,fn] of [...frames]){frames.delete(id);fn();}
assert.equal(writes,0,'queued composer work respects a later user escape');
cleanup();ref.current={...oldScroll,scrollTop:800};const before=styleWrites;
resizeCallback();assert.equal(frames.size,0,'disposed observer cannot schedule into the next room');assert.equal(styleWrites,before);
assert([...listeners.values()].every(set=>set.size===0),'viewport/window listeners removed');
console.log('PASS real reserve effect: late user intent, queued observer cleanup, zero old-room writes');
