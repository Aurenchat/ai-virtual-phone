'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'lib/chat-user-layout-intent.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exportsObj={};
class FakeElement {}
let selectedText='';
const fakeWindow={getSelection:()=>({toString:()=>selectedText})};
vm.runInNewContext(js,{exports:exportsObj,Element:FakeElement,window:fakeWindow,CSS:{supports:()=>true}});
const {beginChatUserLayoutChange:begin,releaseChatUserLayoutHold:release}=exportsObj;
assert.equal(typeof begin,'function');assert.equal(typeof release,'function');
function fixture({supportsNativeAnchor=true}={}){
  let writes=0,scrollTop=2136,scrollHeight=3010,suspended=0,anchorY=2850.28125;
  let pinned=true;const css=new Map(),listeners=new Map();
  const style={getPropertyValue:k=>css.get(k)?.value||'',getPropertyPriority:k=>css.get(k)?.priority||'',setProperty(k,value,priority=''){css.set(k,{value,priority})},removeProperty:k=>css.delete(k)};
  const on=(kind,fn)=>{(listeners.get(kind)||listeners.set(kind,new Set()).get(kind)).add(fn)};
  const off=(kind,fn)=>listeners.get(kind)?.delete(fn);
  const anchor={isConnected:true,getBoundingClientRect:()=>({top:anchorY-scrollTop})};
  const trigger=Object.assign(new FakeElement(),{
    isConnected:true,
    matches:selector=>selector==='[data-im-text-body]',
    closest:selector=>selector==='[data-msg-id]'?anchor:null,
  });
  const scroller={isConnected:true,style,clientHeight:874,
    get scrollTop(){return scrollTop},set scrollTop(v){writes++;scrollTop=Math.max(0,Math.min(v,scrollHeight-874))},
    get scrollHeight(){return scrollHeight},contains:node=>node===anchor||node===trigger,
    getBoundingClientRect:()=>({right:430}),addEventListener:on,removeEventListener:off};
  const dispatch=(kind,event={})=>{for(const f of [...listeners.get(kind)||[]])f(event)};
  const metrics=()=>({writes,scrollTop,scrollHeight,distance:scrollHeight-scrollTop-874,suspended,pinned,
    anchorTop:anchorY-scrollTop,css:style.getPropertyValue('overflow-anchor'),priority:style.getPropertyPriority('overflow-anchor'),
    listeners:[...listeners.values()].reduce((n,x)=>n+x.size,0)});
  const mutateHeight=(n)=>{const old=scrollHeight;scrollHeight=n;
    // Chromium's native bottom anchor can move scrollTop without setter writes
    // while the source bubble's absolute document top remains unchanged.
    if(!supportsNativeAnchor || style.getPropertyValue('overflow-anchor')!=='none')scrollTop=Math.min(scrollTop+Math.max(0,n-old),n-874);
    else scrollTop=Math.min(scrollTop,n-874);
  };
  return{scroller,trigger,anchor,style,metrics,dispatch,mutateHeight,
    suspend(){suspended++;pinned=false},setAnchorY:v=>anchorY=v,setPinned:v=>pinned=v};
}
{
  const h=fixture();const original=h.metrics().anchorTop;
  for(let i=0;i<25;i++){
    const done=begin(h.scroller,h.trigger,h.suspend);assert.equal(typeof done,'function',`toggle ${i} must be protected even if unpinned`);
    assert.equal(h.metrics().css,'none');assert.equal(h.metrics().priority,'important');
    h.mutateHeight(i%2===0?3050:3010);done();done();
    assert(Math.abs(h.metrics().anchorTop-original)<0.001,`toggle ${i} changed bubble screen position`);
    assert.equal(h.metrics().scrollTop,2136);
  }
  assert.equal(h.metrics().writes,0,'native anchor disabled throughout continuous toggles; no extra scroll writes');
  assert.equal(h.metrics().suspended,25);
  assert.equal(h.metrics().listeners,4,'single set of input listeners');
  h.dispatch('touchmove');
  assert.equal(h.metrics().css,'');assert.equal(h.metrics().listeners,0,'release on deliberate scroll');
  release(h.scroller);assert.equal(h.metrics().css,'');
}
{
  const h=fixture();h.style.setProperty('overflow-anchor','auto','important');
  const done=begin(h.scroller,h.trigger,h.suspend);
  assert.equal(h.metrics().css,'none');done();assert.equal(h.metrics().css,'none','no release on completion or rAF');
  h.dispatch('wheel');assert.equal(h.metrics().css,'auto');assert.equal(h.metrics().priority,'important');
}
{
  const h=fixture();h.mutateHeight(3050);h.scroller.scrollTop=2136;const first=begin(h.scroller,h.trigger,h.suspend);
  h.setAnchorY(2859.28125);first();
  assert.equal(h.metrics().scrollTop,2145,'rare true element shift should be corrected once');
  release(h.scroller);assert.equal(h.metrics().listeners,0);
}
{
  const h=fixture();const outside={isConnected:true,closest:()=>null};
  assert.equal(begin(h.scroller,outside,h.suspend),undefined);assert.equal(h.metrics().suspended,0);
  begin(h.scroller,h.trigger,h.suspend)();h.dispatch('pointerdown',{pointerType:'mouse',clientX:425});
  assert.equal(h.metrics().css,'');assert.equal(h.metrics().listeners,0);
}
{
  const h=fixture();begin(h.scroller,h.trigger,h.suspend)();h.dispatch('keydown',{key:'PageUp',altKey:false,ctrlKey:false,metaKey:false,target:null});
  assert.equal(h.metrics().css,'');assert.equal(h.metrics().listeners,0);
}
{
 const h=fixture();begin(h.scroller,h.trigger,h.suspend)();
 h.dispatch('keydown',{key:' ',defaultPrevented:true,target:null});
 assert.equal(h.metrics().css,'none','handled keyboard toggle retains guard');
 release(h.scroller);
}
// Real native bubbling order: the scroll-pane listener receives Space before
// React can call preventDefault(). It must not discard the reading guard.
{
  const h=fixture();begin(h.scroller,h.trigger,h.suspend)();
  h.dispatch('keydown',{key:' ',defaultPrevented:false,repeat:false,target:h.trigger});
  assert.equal(h.metrics().css,'none','native pane listener must retain guard before React Space handling');
  assert.equal(h.metrics().listeners,4);
  release(h.scroller);
}
// A nested plugin, selected text, or repeated Space is NOT a translation
// toggle; these keyboard events must not become broadly swallowed.
{
  const h=fixture();const pluginChild=Object.assign(new FakeElement(),{
    matches:()=>false,closest:()=>null,
  });
  begin(h.scroller,h.trigger,h.suspend)();
  h.dispatch('keydown',{key:' ',defaultPrevented:false,repeat:false,target:pluginChild});
  assert.equal(h.metrics().listeners,0,'nested plugin Space releases reading guard');
}
{
  const h=fixture();begin(h.scroller,h.trigger,h.suspend)();
  h.dispatch('keydown',{key:' ',defaultPrevented:false,repeat:true,target:h.trigger});
  assert.equal(h.metrics().listeners,0,'repeat Space does not pretend to toggle');
}
{
  const h=fixture();begin(h.scroller,h.trigger,h.suspend)();
  selectedText='selected';
  h.dispatch('keydown',{key:' ',defaultPrevented:false,repeat:false,target:h.trigger});
  assert.equal(h.metrics().listeners,0,'Space with selected text remains scroll intent');
  selectedText='';
}
// Safari 26 / WKWebView: overflow-anchor CSS is unsupported. The pre-paint
// explicit position correction still must protect repeated toggles.
{
  const unsupported={};
  vm.runInNewContext(js,{exports:unsupported,Element:FakeElement,window:fakeWindow,CSS:{supports:()=>false}});
  const h=fixture({supportsNativeAnchor:false}),initial=h.metrics().anchorTop;
  for(let i=0;i<25;i++){
    const finish=unsupported.beginChatUserLayoutChange(h.scroller,h.trigger,h.suspend);
    assert.equal(typeof finish,'function');
    assert.equal(h.metrics().css,'','unsupported CSS must not be relied upon');
    h.mutateHeight(i%2===0?3050:3010);
    finish();
    assert(Math.abs(h.metrics().anchorTop-initial)<0.001,'WebKit fallback anchor correction failed at toggle '+i);
  }
  assert(h.metrics().writes>0,'unsupported engine relies on pre-paint JS correction');
  unsupported.releaseChatUserLayoutHold(h.scroller);assert.equal(h.metrics().listeners,0);
}
const hook=fs.readFileSync(path.join(root,'components/chat/imessage-presentation.tsx'),'utf8');
const bubble=fs.readFileSync(path.join(root,'components/chat/message-bubble.tsx'),'utf8');
const room=fs.readFileSync(path.join(root,'components/chat/chat-room.tsx'),'utf8');
const scroll=fs.readFileSync(path.join(root,'lib/chat-scroll-stability.ts'),'utf8');
assert.match(hook,/onToggle:\s*\(target: HTMLElement\) => void/);
assert.match(hook,/const target = e\.currentTarget;\s*clear\(\); timer\.current = setTimeout/);
assert.match(hook,/onToggle\(e\.currentTarget\)/);
assert.match(hook,/e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*clear\(\);\s*onToggle\(e\.currentTarget\)/,
  'handled keyboard translation must not reach window bottom-follow listener');
assert.match(bubble,/finishUserLayoutRef\.current = presentation\.beforeTranslationToggle\?\.\(target\) \?\? null/);
assert.match(bubble,/useLayoutEffect\(\(\) => \{\s*const finish = finishUserLayoutRef\.current;[\s\S]*?finish\?\.\(\);\s*\}, \[expanded\]\)/);
assert.match(room,/beginChatUserLayoutChange\(scrollRef\.current, target, scrollStability\.suspend\)/);
assert.match(room,/releaseChatUserLayoutHold\(el\);\s*scrollStability\.initial\(\)/);
assert.match(room,/releaseChatUserLayoutHold\(el\);\s*scrollStability\.appended\(ownSend\)/);
assert.match(room,/return \(\) => releaseChatUserLayoutHold\(el\)/);
assert.match(room,/renderMsg\.mediaType === "quote"/);
assert.match(scroll,/const SETTLE_DELAYS_MS = \[90, 250, 650\]/);
assert.match(scroll,/if \(forceForOwnMessage\).*pinned = true/);
console.log('PASS 25 toggles per engine, real-order native Space guard, React propagation contract, plugin/selection/repeat scroll release');
