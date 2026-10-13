const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('themes/imessage-native-day/iMessage-Message-Bridge-perf.6-geometry-stable.js','utf8');
assert.match(s,/version: "1.1.0-alpha.7-music.2-perf.6-geometry-stable"/);assert.doesNotMatch(s,/textObserver\.unobserve/);
const body=s.slice(s.indexOf('    function observeTextTargets() {'),s.indexOf('    const revisionOf'));
let targets=[{}],disconnected=0,observed=[];const watched=new Set(),state={visible:true},room={querySelectorAll:()=>targets};
const run=vm.runInNewContext('('+body.trim()+')',{rooms:new Map([[room,state]]),observedTextTargets:watched,textObserver:{disconnect(){disconnected++;observed=[]},observe(el){observed.push(el)}}});
run();run();assert.equal(observed.length,1);assert.equal(disconnected,0);
targets=[{}];run();assert.equal(disconnected,1);assert.deepEqual(observed,targets);assert.equal(watched.size,1);
state.visible=false;run();assert.equal(disconnected,2);assert.equal(watched.size,0);
console.log('PASS real text target observation: no invalid API, stable target reuse, removal rebuild, hidden cleanup');

const geometry=s.slice(s.indexOf('    const geometryObservedBy ='),s.indexOf('    const bubbleSelector'));
let native=[],outlines=[];const owner=new WeakMap();
class IO{constructor(cb,options){this.cb=cb;this.options=options;this.targets=new Set();this.closed=0;native.push(this)}observe(t){this.targets.add(t)}unobserve(t){this.targets.delete(t)}disconnect(){this.targets.clear();this.closed++}}
const api=vm.runInNewContext('(()=>{'+geometry+';return {io:geometryObserver,roots:geometryObservers};})()',{IntersectionObserver:IO,geometryOwners:owner,inGeometryBand:()=>false,outline:(b,state,enabled)=>outlines.push(enabled)});
const pane={},a={isConnected:true,closest:()=>pane},b={isConnected:true,closest:()=>pane};owner.set(a,{geometry:new Set([a])});api.io.observe(a);api.io.observe(b);assert.equal(native.length,1);assert.equal(native[0].options.root,pane);
native[0].cb([{target:a,isIntersecting:false}]);assert.deepEqual(outlines,[false]);api.io.unobserve(a);assert.equal(native[0].closed,0);api.io.unobserve(b);assert.equal(native[0].closed,1);assert.equal(api.roots.size,0);
api.io.observe(a);api.io.disconnect();assert.equal(api.roots.size,0);assert.equal(native[1].closed,1);
console.log('PASS pane-rooted 800px observation, far exit demotion, shared observer and final disconnect');
