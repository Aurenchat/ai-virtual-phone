'use strict';
// Local guard scenarios + static wiring. Real ChatRoom and WKWebView remain release gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const guardSrc = fs.readFileSync(path.join(root, 'lib/chat-user-layout-intent.ts'),'utf8');
const scrollSrc = fs.readFileSync(path.join(root, 'lib/chat-scroll-stability.ts'),'utf8');
const roomSrc = fs.readFileSync(path.join(root, 'components/chat/chat-room.tsx'),'utf8');
assert.match(scrollSrc,/resumeIfAtBottom:\s*\(\)\s*=>\s*\{/,'controller exposes narrowly scoped rejoin');
assert.match(scrollSrc,/if \(!scroller \|\| bottomDistance\(\) > REJOIN_BOTTOM_PX\) return;/,'controller checks physical bottom');
assert.match(roomSrc,/beginChatUserLayoutChange\(scrollRef\.current, target, scrollStability\.suspend, scrollStability\.resumeIfAtBottom\)/,'text & quote use conditional bottom follow');
assert.match(roomSrc,/beginChatUserLayoutChange\(scroller, bubble, scrollStability\.suspend, scrollStability\.resumeIfAtBottom\)/,'voice menu uses same rule');
// Current full ChatRoom renders voice transcript with same callback; the local fixture lacks this JSX.
if (roomSrc.includes('voiceTranscript: true')) assert.match(roomSrc, /voiceTranscript: true, beforeTranslationToggle/, 'voice translation inherits callback');

class FakeElement {}
for (const supportsAnchor of [true,false]) {
  const guardExports={};
  const script=ts.transpileModule(guardSrc,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(script,{exports:guardExports,Element:FakeElement,CSS:{supports:()=>supportsAnchor},window:{getSelection:()=>({toString:()=>''})}});
  const {beginChatUserLayoutChange: begin, releaseChatUserLayoutHold: release}=guardExports;
  function fixture({initialDistance=0,initialPinned=true}={}) {
    let height=3010,top=3010-874-initialDistance,writes=0,pinned=initialPinned,suspends=0,resumes=0;
    const css=new Map(), listeners=new Map();
    const style={getPropertyValue:k=>css.get(k)?.val??'',getPropertyPriority:k=>css.get(k)?.pri??'',setProperty:(k,val,pri='')=>css.set(k,{val,pri}),removeProperty:k=>css.delete(k)};
    const anchor=Object.assign(new FakeElement(),{isConnected:true,getBoundingClientRect:()=>({top:2850.28-top})});
    const trigger=Object.assign(new FakeElement(),{isConnected:true,closest:selector=>selector==='[data-msg-id]'?anchor:null});
    const scroller={isConnected:true,style,clientHeight:874,get scrollHeight(){return height},get scrollTop(){return top},set scrollTop(v){writes++;top=Math.max(0,Math.min(v,height-874))},contains:node=>node===anchor||node===trigger,
      getBoundingClientRect:()=>({right:430}),
      addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},
      removeEventListener:(k,f)=>listeners.get(k)?.delete(f)};
    const suspend=()=>{suspends++;pinned=false};
    const resume=()=>{resumes++;if(height-top-874<=2)pinned=true};
    const mutate=(delta, nativeShift=0)=>{height+=delta;top=Math.max(0,Math.min(top+nativeShift,height-874))};
    const snapshot=()=>({top,height,writes,pinned,suspends,resumes,anchorTop:anchor.getBoundingClientRect().top,distance:height-top-874});
    return {scroller,trigger,anchor,suspend,resume,mutate,snapshot, release:()=>release(scroller)};
  }
  // Continuous bottom expansion/collapse. Must follow bottom and restore future AI pinned state.
  {
    const f=fixture();
    let writesBefore=0;
    for (let i=0;i<40;i++) {
      const before=f.snapshot();
      const finish=begin(f.scroller,f.trigger,f.suspend,f.resume);
      assert.equal(typeof finish,'function');
      f.mutate(i%2===0?85:-85);
      finish(); finish();
      const after=f.snapshot();
      assert.equal(after.distance,0,'bottom remains aligned');
      assert.equal(after.pinned,true,'bottom following restored for later incoming messages');
      assert.equal(after.resumes,i+1,'exactly one resume per toggle');
      if(i%2===0) assert.equal(after.top,before.top+85,'opening follows new bottom before paint');
      else assert.equal(after.top,before.top-85,'closing follows shorter bottom');
      assert(after.writes-writesBefore<=1,'no unnecessary repeated JS writes');
      writesBefore=after.writes;
    }
    // When WebKit already moved the scroll offset, don't issue redundant writes.
    const native=fixture();
    const nativeStart=native.snapshot();
    const nativeDone=begin(native.scroller,native.trigger,native.suspend,native.resume);
    native.mutate(91,91);
    nativeDone();
    assert.equal(native.snapshot().writes,0,'no second JS scroll when already bottom after native adjustment');
    assert.equal(native.snapshot().top,nativeStart.top+91);
    native.release();
    // Small bottom rounding tolerances are permitted; 3px+ is history mode.
    const within=fixture({initialDistance:2});
    const withinDone=begin(within.scroller,within.trigger,within.suspend,within.resume);
    within.mutate(40);withinDone();
    assert.equal(within.snapshot().distance,0,'2px bottom rounding follows');
    within.release();
    const f2=fixture({initialPinned:false});
    const finish=begin(f2.scroller,f2.trigger,f2.suspend,f2.resume);
    f2.mutate(40); finish();
    assert.equal(f2.snapshot().pinned,true,'physical bottom wins even when a stale controller state was unpinned');
    f.release();f2.release();
  }
  // History: no bottom follow, preserve touched bubble even under native scroll anchoring.
  for(const distance of [3,40,400]) {
    const f=fixture({initialDistance:distance});
    const before=f.snapshot();
    for(let i=0;i<20;i++) {
      const top=f.snapshot().anchorTop;
      const done=begin(f.scroller,f.trigger,f.suspend,f.resume);
      const delta=i%2===0?40:-40;
      f.mutate(delta,delta); // simulate native scroll/scroll anchoring not written through JS setter
      done();
      assert.equal(f.snapshot().anchorTop,top,`history ${distance}px from bottom retained selected bubble`);
      assert.equal(f.snapshot().resumes,0,'history must not be re-pinned');
      assert.equal(f.snapshot().pinned,false,'history reading stays suspended');
    }
    assert.equal(f.snapshot().top,before.top);
    f.release();
  }
  // Legacy callers without new resume callback remain v2.2-style anchor preserving.
  {
    const f=fixture();const top=f.snapshot().anchorTop;
    const done=begin(f.scroller,f.trigger,f.suspend);
    f.mutate(40,40);done();
    assert.equal(f.snapshot().anchorTop,top,'legacy anchor correction unchanged');
    assert.equal(f.snapshot().resumes,0);
    f.release();
  }
  // Layout guard must not trigger when target has detached.
  {
    const f=fixture();const done=begin(f.scroller,f.trigger,f.suspend,f.resume);
    f.anchor.isConnected=false; f.mutate(80);done();
    assert.equal(f.snapshot().resumes,0,'invalid anchor cannot restore follow');
    f.release();
  }
  console.log(`PASS conditional bottom follow + history/legacy guard, CSS native anchor support=${supportsAnchor}`);
}
