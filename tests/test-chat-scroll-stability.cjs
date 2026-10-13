'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function createHarness(options = {}) {
    const source = fs.readFileSync(path.join(__dirname, '../lib/chat-scroll-stability.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    let time = 0, nextTask = 1;
    const frames = new Map(), timers = new Map(), observations = [];
    const listeners = new Map();
    const imageClass = class FakeImage {};
    const videoClass = class FakeVideo {};
    const row = () => ({ parentElement: null });
    let height = 700, top = 0, writes = 0, queries = 0;
    const element = {
        clientHeight: 300,
        get scrollHeight() { return height; },
        get scrollTop() { return top; },
        set scrollTop(v) { writes++; top = Math.max(0, Math.min(v, height - this.clientHeight)); },
        getBoundingClientRect() { return {right: 400}; },
        querySelectorAll() { queries++; return [row(),row(),row(),row(),row(),row(),row(),row(),row()]; },
        addEventListener(name, callback) { (listeners.get(name) ?? listeners.set(name, new Set()).get(name)).add(callback); },
        removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
        fire(name, event = {}) { for (const callback of listeners.get(name) ?? []) callback(event); },
        setHeight(n) { height = n; },
    };
    class FakeResizeObserver {
        constructor(callback) { this.callback = callback; observations.push(this); }
        observe() { this.count = (this.count || 0) + 1; }
        disconnect() { this.count = 0; }
        trigger() { this.callback(); }
    }
    const runtime = {
        exports: {},
        window: {addEventListener: element.addEventListener.bind(element),removeEventListener: element.removeEventListener.bind(element),setTimeout(fn, ms) { const id = nextTask++; timers.set(id,{fn, at: time + ms}); return id; }},
        setTimeout(fn,ms) { return runtime.window.setTimeout(fn,ms); },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(fn) { const id = nextTask++; frames.set(id,fn); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        HTMLImageElement: imageClass, HTMLVideoElement: videoClass,
        ResizeObserver: options.noResizeObserver ? undefined : FakeResizeObserver,
    };
    vm.runInNewContext(compiled.outputText, runtime, {filename:'chat-scroll-stability.js'});
    const controller = runtime.exports.createChatScrollStability();
    const flushFrames = () => { for (let n=0;n<20&&frames.size;n++) {const current = [...frames.values()];frames.clear();current.forEach(fn=>fn());} };
    const advance = ms => {time+=ms;let ready=[...timers].filter(([,t])=>t.at<=time);for(const [id,t] of ready){timers.delete(id);t.fn();}flushFrames();};
    const sendTouch = (from,to) => {
        element.fire('touchstart',{touches:[{clientY:from}]});
        element.fire('touchmove',{touches:[{clientY:to}]});
        element.fire('scroll');
        element.fire('touchend');
    };
    return {controller, element, observations, frames, timers, flushFrames, advance, sendTouch, Image:imageClass, metrics:()=>({writes,queries}), listeners};
}

// Open: scroll immediately, without awaiting any image load event.
{
    const h=createHarness(), dispose=h.controller.attach(h.element);
    h.controller.initial();
    assert.equal(h.element.scrollTop,400);
    assert(h.observations[0].count<=16,'observe bounded recent rows only');
    h.element.setHeight(850);
    h.observations[0].trigger();h.flushFrames();
    assert.equal(h.element.scrollTop,550,'late iMessage row resize keeps exact bottom');
    dispose();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
}

// Image placeholder replaced asynchronously, after the append-time bottom write.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();
    h.element.setHeight(900);h.controller.appended();assert.equal(h.element.scrollTop,600);
    h.element.setHeight(1220);h.element.fire('load',{target:new h.Image()});h.flushFrames();
    assert.equal(h.element.scrollTop,920,'late resolved media retains bottom');
    h.element.setHeight(1280);h.advance(250);assert.equal(h.element.scrollTop,980);
}

// User gesture in upward direction must immediately stop all corrections.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();
    h.sendTouch(200,240);assert.equal(h.controller.isPinned(),false);
    h.element.scrollTop=240;h.element.fire('scroll');
    h.element.setHeight(920);h.observations[0].trigger();h.element.fire('load',{target:new h.Image()});h.flushFrames();h.advance(800);
    assert.equal(h.element.scrollTop,240,'cannot steal user scroll during late image load');
    h.controller.appended(false);assert.equal(h.element.scrollTop,240,'incoming update while reading history does not pull down');
    h.element.scrollTop=620;h.element.fire('wheel',{deltaY:45});h.element.fire('scroll');
    assert(h.controller.isPinned(),'a deliberate return to bottom reactivates follow');
    h.element.setHeight(990);h.controller.appended();assert.equal(h.element.scrollTop,690);
}

// Sending own message should follow even after reading history; search/load more suspend.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();
    h.sendTouch(220,260);h.element.scrollTop=100;
    h.controller.appended(true);assert.equal(h.element.scrollTop,400,'own message pulls to latest');
    h.element.fire('scroll');assert(h.controller.isPinned(),'own-send scroll event clears the previous upward gesture');
    h.controller.suspend();h.element.setHeight(900);h.controller.appended(false);h.flushFrames();
    assert.equal(h.element.scrollTop,400,'explicit history/search suspension wins');
}

// Remote image load errors and clean release cannot crash.
{
    const h=createHarness();const dispose=h.controller.attach(h.element);h.controller.initial();
    h.element.setHeight(810);h.element.fire('error',{target:new h.Image()});h.flushFrames();
    assert.equal(h.element.scrollTop,510);
    dispose();h.element.setHeight(900);h.element.fire('load',{target:new h.Image()});h.flushFrames();
    assert.equal(h.element.scrollTop,510,'unmounted room never scrolls');
}

// No ResizeObserver: image-load capture still fixes the final bottom offset.
{
    const h=createHarness({noResizeObserver:true});h.controller.attach(h.element);h.controller.initial();
    h.element.setHeight(1040);h.element.fire('load',{target:new h.Image()});h.flushFrames();
    assert.equal(h.element.scrollTop,740);
}

// True-bottom rejoin and queued touch scroll after touchend.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();
    h.element.fire('wheel',{deltaY:-0.2});h.element.scrollTop=380;h.element.fire('scroll');
    h.element.fire('wheel',{deltaY:20});h.element.fire('scroll');assert(!h.controller.isPinned(),'20px short is not the real bottom');
    h.element.fire('touchstart',{touches:[{clientY:220}]});h.element.fire('touchmove',{touches:[{clientY:200}]});h.element.fire('touchend');
    h.element.scrollTop=400;h.element.fire('scroll');assert(h.controller.isPinned(),'queued/momentum touch scroll re-arms at actual bottom');
}
// Scrollbar track click, unclassified native upward scroll, keyboard and editable input.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();
    h.element.fire('pointerdown',{pointerType:'mouse',clientX:399,clientY:100});assert(!h.controller.isPinned(),'track click cancels pending corrections before moving');
    h.element.scrollTop=100;h.element.fire('scroll');h.controller.appended();h.advance(800);assert.equal(h.element.scrollTop,100);
    h.element.scrollTop=400;h.element.fire('scroll');assert(h.controller.isPinned());h.element.fire('pointerup');
    h.element.scrollTop=250;h.element.fire('scroll');assert(h.controller.isPinned(),'unclassified scroll anchoring must not be mistaken for a user gesture');
    h.observations[0].trigger();h.flushFrames();assert.equal(h.element.scrollTop,400);
    h.controller.initial();h.element.fire('keydown',{key:'ArrowUp',target:{closest:()=>({})}});assert(h.controller.isPinned(),'editing caret navigation must not be a history gesture');
    h.element.fire('keydown',{key:'Home'});assert(!h.controller.isPinned());h.element.scrollTop=400;h.element.fire('keydown',{key:'End'});h.element.fire('scroll');assert(h.controller.isPinned());
}
// No-op geometry notifications must not rewrite scrollTop or scan rows per frame.
{
    const h=createHarness();h.controller.attach(h.element);h.controller.initial();h.advance(800);const before=h.metrics();
    for(let i=0;i<100;i++){h.observations[0].trigger();h.controller.followIfPinned();}assert.equal(h.frames.size,1);
    h.flushFrames();assert.deepEqual(h.metrics(),before,'stable bottom makes zero writes/row scans');
}
// StrictMode replay: a disposed observer/cleanup cannot touch a new attachment.
{
    const h=createHarness();const old=h.controller.attach(h.element);h.controller.initial();old();const fresh=h.controller.attach(h.element);h.controller.initial();h.advance(800);
    h.element.setHeight(990);h.observations[0].trigger();old();h.flushFrames();assert.equal(h.element.scrollTop,400,'late old observer cannot correct new geometry');
    h.observations[1].trigger();h.flushFrames();assert.equal(h.element.scrollTop,690);fresh();h.advance(800);
    assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert([...h.listeners.values()].every(set=>set.size===0));
}
// A search/history suspension must clear stale downward intent even at bottom.
{
 const h=createHarness();h.controller.attach(h.element);h.controller.initial();h.element.fire('wheel',{deltaY:20});h.controller.suspend();h.element.fire('scroll');assert(!h.controller.isPinned());h.advance(800);assert(!h.controller.isPinned());
}
// A touch on a native scrollbar has the opposite finger/content direction.
{
 const h=createHarness();h.controller.attach(h.element);h.controller.initial();
 h.element.fire('touchstart',{touches:[{clientY:200}]});h.element.fire('touchmove',{touches:[{clientY:160}]});h.element.scrollTop=250;h.element.fire('scroll');assert(!h.controller.isPinned(),'touch scrollbar upward drag escapes');h.element.fire('touchend');h.controller.appended();h.advance(800);assert.equal(h.element.scrollTop,250);
 h.element.fire('touchstart',{touches:[{clientY:160}]});h.element.fire('touchmove',{touches:[{clientY:210}]});h.element.fire('touchend');h.element.scrollTop=400;h.element.fire('scroll');assert(h.controller.isPinned(),'touch scrollbar return after touchend resumes');
 h.controller.suspend();h.element.setHeight(900);h.element.scrollTop=600;h.element.fire('scroll');assert(!h.controller.isPinned(),'programmatic anchor at bottom must not re-arm an explicit search suspension');
}
// Search target corrections are finite and must yield to every user direction.
{
 const h=createHarness();const dispose=h.controller.attach(h.element);h.controller.initial();let centers=0;
 h.controller.stabilizeTarget(()=>{centers++;h.element.scrollTop=100;});h.flushFrames();assert.equal(h.element.scrollTop,100);assert(!h.controller.isPinned());h.advance(700);assert.equal(h.timers.size,0);const done=centers;h.observations[0].trigger();h.flushFrames();assert.equal(centers,done,'search tracking expires after bounded settle checks');
 h.controller.stabilizeTarget(()=>centers++);h.element.fire('wheel',{deltaY:15});h.advance(800);assert.equal(centers,done,'downward reading cancels pending search correction too');
 h.controller.stabilizeTarget(()=>centers++);h.element.fire('keydown',{key:'ArrowUp'});h.advance(800);assert.equal(centers,done);
 h.controller.stabilizeTarget(()=>centers++);h.element.fire('touchstart',{touches:[{clientY:200}]});h.advance(800);assert.equal(centers,done);dispose();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
}
console.log('PASS chat scroll stability: initial, late resize, media load, user escape, append, send, suspension, cleanup, no ResizeObserver');
