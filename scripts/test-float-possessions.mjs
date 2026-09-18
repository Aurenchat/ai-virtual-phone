import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import ts from "typescript";
async function loadTs(path, dependencies = {}) {
  const code = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(code, { fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(id => {
    if (!(id in dependencies)) throw new Error("Unexpected dependency: " + id);
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}
const { formatGiftForPrompt } = await loadTs("../lib/gift-prompt.ts");
const source = await readFile(new URL("../plugins/float-possessions.js", import.meta.url), "utf8");
const { createPossessionsEngine, default: plugin } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

export async function runPossessionTests(createEngine) {
  const results = [];
  function ok(value, message) { if (!value) throw new Error(message); }
  function eq(a,b,message) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(message + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); }
  async function rejects(fn, message) { let failed=false; try { await fn(); } catch { failed=true; } ok(failed,message); }
  function fixture() {
    let state=null, seq=0, messageSeq=0;
    let time="2026-09-17T00:00:00.000Z";
    let queue=Promise.resolve();
    const chars=[{id:"jay",name:"Jay Mercer"},{id:"seb",name:"Sebastian Krueger"}];
    const sessions=[{id:"jay-chat",contactId:"jay"},{id:"seb-chat",contactId:"seb"},{id:"group",isGroup:true,participantIds:["jay","seb"]}];
    const messages=[], orders=[], legacy=[];
    let failNext=false;
    const ctx={
      gifts:{ changed(){} },
      system:{log(){},storage:{
        atomic(key,fn) {
          const task=queue.then(()=>{
            if (failNext) { failNext=false; throw new Error("disk failure"); }
            const next=fn(state ? JSON.parse(JSON.stringify(state)) : null);
            state=JSON.parse(JSON.stringify(next)); return JSON.parse(JSON.stringify(state));
          });
          queue=task.catch(()=>{}); return task;
        },
        readOther(){return legacy},
      }},
      data:{
        characters:{list:()=>chars,get:id=>chars.find(c=>c.id===id)},
        sessions:{list:()=>sessions,get:id=>sessions.find(s=>s.id===id)},
        user:{name:()=>"Chloe"}, shopping:{get:()=>({orders})},
        messages:{list:sid=>messages.filter(m=>m.sessionId===sid),update(id,patch){const m=messages.find(m=>m.id===id); if(m)Object.assign(m,patch)}},
      },
    };
    const make=()=>createEngine(ctx,{now:()=>time,uuid:()=>"item_"+(++seq)});
    let engine=make();
    function message(data={}) {
      const msg={id:"m"+(++messageSeq),sessionId:"jay-chat",role:"assistant",createdAt:time,mediaType:"gift",mediaData:{giftName:"Custom balisong",giftDescription:"Titanium handles",giftPreviewIcon:"🔪"},...data};
      messages.push(msg); (ctx.persisted || engine.onMessage)(msg); return msg;
    }
    function send(target="seb", success=true) {
      return gift => {
        if (!success) return false;
        message({sessionId:target+"-chat",role:"user",mediaData:{
          giftName:gift.productName,giftInstanceId:gift.inventoryItemId,giftTransferToken:gift.transferToken,recipientId:target,
        }});
        return true;
      };
    }
    return {ctx,chars,sessions,messages,orders,legacy,message,send,
      get e(){return engine},get state(){return state},
      async start(){await engine.init()},async reload(){engine=make();await engine.init()},
      advance(){time="2026-09-17T01:00:00.000Z"}, fail(){failNext=true},
    };
  }
  async function test(name,fn) {await fn();results.push(name)}
  await test("Jay → user → Sebastian preserves one instance and two transfers", async()=>{
    const f=fixture(); await f.start(); f.message(); await f.e.drain();
    const item=Object.values(f.state.items)[0]; eq(item.ownerId,"user","initial owner");
    await f.e.sendItem(item.itemId,"seb",f.send());
    eq(Object.keys(f.state.items).length,1,"no cloned knife");
    eq(f.state.items[item.itemId].ownerId,"seb","recipient");
    eq(f.state.items[item.itemId].transferHistory.map(h=>[h.fromId,h.toId]),[["jay","user"],["user","seb"]],"history");
    const p=await f.e.prompt({sessionId:"seb-chat",characterId:"seb",isGroup:false,hint:"existing"});
    ok(p.hint.includes("Custom balisong")&&p.hint.includes("Titanium handles"),"prompt");
    eq((await f.e.list()).gifts.length,0,"removed from user");
  });
  await test("editable source and cleared display fields preserve provenance",async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];
    const previous=JSON.stringify(f.state.items[id].provenance), history=JSON.stringify(f.state.items[id].transferHistory);
    await f.e.editItem(id,{name:"",source:"从V那里顺来的",description:"",price:"",emoji:"",ownerId:"jay"});
    eq(f.state.items[id].ownerId,"user","owner protected"); eq(JSON.stringify(f.state.items[id].provenance),previous,"provenance");eq(JSON.stringify(f.state.items[id].transferHistory),history,"history");
    await f.e.editItem(id,{source:""});eq(f.state.items[id].source,"","clear source");
  });
  await test("replay and reload do not duplicate gifts",async()=>{
    const f=fixture();await f.start();const m=f.message();await f.e.drain();f.e.onMessage(m);await f.e.drain();await f.reload();eq(Object.keys(f.state.items).length,1,"one item");
  });
  await test("deleted items stay deleted after reload and replays",async()=>{
    const f=fixture();await f.start();const m=f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];await f.e.deleteItem(id);f.e.onMessage(m);await f.e.drain();await f.reload();eq((await f.e.list()).gifts.length,0,"tombstone");
  });
  await test("native refusal releases reservation without transfer",async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];eq(await f.e.sendItem(id,"seb",f.send("seb",false)),false,"native refusal");eq(f.state.items[id].ownerId,"user","owner");eq(Object.keys(f.state.reservations).length,0,"release");
  });
  await test("double click can send the instance only once",async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];let sends=0;
    const native=g=>{sends++;return f.send()(g)};
    const outcomes=await Promise.allSettled([f.e.sendItem(id,"seb",native),f.e.sendItem(id,"jay",native)]);
    eq(sends,1,"native called once");eq(outcomes.filter(x=>x.status==="fulfilled").length,1,"one success");
  });
  await test("storage failure before send prevents native side effects",async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];let calls=0;f.fail();
    await rejects(()=>f.e.sendItem(id,"seb",()=>{calls++;return true}),"must reject");eq(calls,0,"no sent card");
  });
  await test("failure after native send recovers from the persisted token",async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];
    await rejects(()=>f.e.sendItem(id,"seb",g=>{const result=f.send()(g);f.fail();return result}),"commit fails");
    eq(f.state.items[id].ownerId,"user","not prematurely moved");await f.reload();eq(f.state.items[id].ownerId,"seb","recovered");eq(f.state.items[id].transferHistory.length,2,"exactly once");
  });
  await test("paid order quantities create separate instances; updates do not duplicate",async()=>{
    const f=fixture();await f.start();f.advance();
    f.orders.push({id:"o1",paidAt:"2026-09-17T00:30:00.000Z",items:[{id:"p",title:"Book",detail:"A book",priceLabel:"10",previewIcon:"📚",quantityLabel:"x 2"}]});
    await f.e.sync();await f.e.sync();eq(Object.keys(f.state.items).length,2,"units");eq(Object.keys(f.state.shopKeys).length,2,"shop keys");
  });
  await test("pending, declined and canceled payments do not create possessions",async()=>{
    const f=fixture();await f.start();f.advance();
    for(const status of ["payment_requested","payment_declined","payment_canceled"])f.orders.push({id:status,paymentStatus:status,items:[{id:"p",title:"No"}]});
    await f.e.sync();eq(Object.keys(f.state.items).length,0,"no unpaid items");
    f.orders[0].paymentStatus="paid_by_character";f.orders[0].characterPaidAt="2026-09-17T00:30:00.000Z";await f.e.sync();eq(Object.keys(f.state.items).length,1,"paid transition");
  });
  await test("old orders and old chat are not blindly imported",async()=>{
    const f=fixture();f.orders.push({id:"old",paidAt:"2020-01-01T00:00:00Z",items:[{id:"p",title:"Old"}]});f.messages.push({id:"old",createdAt:"2020-01-01T00:00:00Z",sessionId:"jay-chat",role:"assistant",mediaType:"gift",mediaData:{giftName:"Old"}});
    await f.start();eq(Object.keys(f.state.items).length,0,"no historical guessing");
  });
  await test("character → character can create a new gift in group chat",async()=>{
    const f=fixture();await f.start();f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"New book",recipientName:"Sebastian Krueger"}});await f.e.drain();eq(Object.values(f.state.items)[0].ownerId,"seb","new gift recipient");
  });
  await test("explicit character instance moves; wrong owner cannot clone or transfer",async()=>{
    const f=fixture();await f.start();f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"Book",recipientName:"Sebastian Krueger"}});await f.e.drain();const id=Object.keys(f.state.items)[0];
    f.message({sessionId:"group",senderCharacterId:"seb",mediaData:{giftInstanceId:id,recipientName:"Jay Mercer"}});await f.e.drain();
    eq(f.state.items[id].ownerId,"jay","moved to Jay");
    f.message({sessionId:"group",senderCharacterId:"seb",mediaData:{giftInstanceId:id,recipientName:"Chloe"}});await f.e.drain();
    eq(f.state.items[id].ownerId,"jay","wrong owner blocked");eq(Object.keys(f.state.items).length,1,"no clone");eq(Object.keys(f.state.conflicts).length,1,"visible conflict");
  });
  await test("ambiguous and missing group recipient are quarantined",async()=>{
    const f=fixture();await f.start();f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"Book"}});await f.e.drain();eq(Object.keys(f.state.items).length,0,"no invented owner");
    await f.e.resolveConflict(Object.keys(f.state.conflicts)[0],"seb");eq(Object.values(f.state.items)[0].ownerId,"seb","explicit resolution");
  });
  await test("user display name resolves group gifts to global user",async()=>{
    const f=fixture();await f.start();f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"Book",recipientName:"Chloe"}});await f.e.drain();eq(Object.values(f.state.items)[0].ownerId,"user","global user");
  });
  await test("unknown instance ID never becomes a new item",async()=>{
    const f=fixture();await f.start();f.message({mediaData:{giftInstanceId:"missing"}});await f.e.drain();eq(Object.keys(f.state.items).length,0,"no replacement instance");
  });
  await test("legacy migration preserves originals and is idempotent; group pile skipped",async()=>{
    const f=fixture();await f.start();f.legacy.push({id:"a",title:"Legacy knife",recipient:"user",source:"Edited",note:"note"},{id:"b",title:"Legacy book",recipient:"character",sessionId:"seb-chat"},{id:"c",recipient:"group",sessionId:"group"});
    const original=JSON.stringify(f.legacy),preview=f.e.legacyPreview();eq(preview.rows.length,2,"resolved");eq(preview.skipped.length,1,"unknown");await f.e.importLegacy(preview.rows);await f.e.importLegacy(preview.rows);eq(Object.keys(f.state.items).length,2,"no duplicate");eq(JSON.stringify(f.legacy),original,"old data untouched");
  });
  await test("single-character prompts do not expose other backpacks; group sections preserve owners",async()=>{
    const f=fixture();await f.start();f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"Private book",recipientName:"Sebastian Krueger"}});await f.e.drain();
    const single=await f.e.prompt({sessionId:"jay-chat",characterId:"jay",isGroup:false,hint:""});ok(!single.hint.includes("Private book"),"no leak to Jay");
    const group=await f.e.prompt({sessionId:"group",isGroup:true,hint:""});ok(group.hint.includes("Sebastian Krueger")&&group.hint.includes("Private book"),"group sections");
  });
  await test("all inventory projections and permissions follow one owner despite stale legacy rows", async()=>{
    const f=fixture(); await f.start(); f.message(); await f.e.drain(); const id=Object.keys(f.state.items)[0];
    f.legacy.push({id:"stale",title:"Custom balisong",recipient:"user"});
    eq(f.e.inventory("user").map(i=>i.itemId),[id],"one authoritative item");
    ok(f.e.inventory("user")[0].canManage,"user controls");
    let changes=0; f.e.subscribe(()=>changes++);
    await f.e.sendItem(id,"seb",f.send());
    eq(f.e.inventory("user"),[],"sender immediately empty");
    eq(f.e.inventory("seb").map(i=>i.itemId),[id],"recipient once");
    ok(f.e.inventory("seb")[0].canManage,"character world-state management");
    ok(!f.e.inventory("seb")[0].canSend,"character item cannot be sent as user"); ok(changes>0,"views notified");
    await rejects(()=>f.e.editItem(id,{name:"stale edit"},"user"),"stale user editor rejected");
    await rejects(()=>f.e.deleteItem(id,"user"),"stale user deletion rejected");
    await rejects(()=>f.e.sendItem(id,"jay",f.send("jay")),"former owner send rejected");
    await f.reload(); await f.e.sync();
    eq(f.e.inventory("user"),[],"reload cannot resurrect former owner");
    eq(f.e.inventory("seb").length,1,"recipient still once");
    eq(Object.keys(f.state.items),[id],"single stable identity");
  });
  await test("edited semantics survive native transfer into recipient and history prompts", async()=>{
    const f=fixture(); await f.start(); f.message(); await f.e.drain(); const id=Object.keys(f.state.items)[0];
    const edited={name:"Engraved knife",description:"Blue titanium",price:"¥ 1,250 / priceless",source:"A gift from Jay"};
    await f.e.editItem(id,edited); await f.e.sendItem(id,"seb",f.send());
    const card=f.messages.at(-1);
    eq(card.mediaData.giftPriceLabel,edited.price,"card price");
    const current=await f.e.prompt({sessionId:"seb-chat",characterId:"seb",hint:""});
    const historical=formatGiftForPrompt(card);
    for(const value of Object.values(edited)) {ok(current.hint.includes(value),"current semantics: "+value);ok(historical.includes(value),"historical semantics: "+value)}
    for(const privateValue of [card.mediaData.giftTransferToken,"ledger-v1","reservations","giftOwnershipStatus"])ok(!historical.includes(privateValue),"no internal metadata");
    ok(!current.hint.includes(card.mediaData.giftTransferToken),"no token in current prompt");
  });
  await test("soft deletion preserves audit fields, messages, dedup and reload behavior", async()=>{
    const f=fixture(); await f.start(); const message=f.message(); await f.e.drain(); const id=Object.keys(f.state.items)[0];
    const original=structuredClone(f.state.items[id]), messages=JSON.stringify(f.messages), events=JSON.stringify(f.state.events);
    await f.e.deleteItem(id);
    eq(f.e.inventory("user"),[],"deleted absent in UI"); eq((await f.e.list()).gifts,[],"deleted absent in picker");
    await rejects(()=>f.e.editItem(id,{name:"resurrect"}),"deleted edit blocked");
    await rejects(()=>f.e.sendItem(id,"seb",f.send()),"deleted send blocked");
    f.e.onMessage(message); await f.e.drain(); await f.reload(); await f.e.sync();
    eq(f.e.inventory("user"),[],"deleted stays absent"); eq(Object.keys(f.state.items),[id],"no replacement gift");
    for(const key of ["itemId","provenance","transferHistory","name","description","price","source"])eq(f.state.items[id][key],original[key],"audit "+key);
    eq(JSON.stringify(f.state.events),events,"event dedup intact"); eq(JSON.stringify(f.messages),messages,"original messages unchanged");
    ok(f.state.items[id].deletedAt,"tombstone retained");
  });
  await test("deleted shopping item never falls back or gets recreated; order retained", async()=>{
    const f=fixture(); await f.start(); f.advance();
    f.orders.push({id:"o1",paidAt:"2026-09-17T00:30:00.000Z",items:[{id:"p",title:"Book",priceLabel:"10",quantityLabel:"1"}]});
    await f.e.sync();const id=Object.keys(f.state.items)[0], orders=JSON.stringify(f.orders), keys=JSON.stringify(f.state.shopKeys);
    await f.e.deleteItem(id); await f.e.sync(); await f.reload(); await f.e.sync();
    eq((await f.e.list()).gifts,[],"deleted shop not available"); eq((await f.e.list()).managedShoppingIds,["o1::p::1"],"native fallback suppressed");
    eq(JSON.stringify(f.orders),orders,"shopping history unchanged");eq(JSON.stringify(f.state.shopKeys),keys,"dedup identity retained");eq(Object.keys(f.state.items),[id],"no replacement shop instance");
  });
  await test("v1 ledger with transfers and tombstones reloads without schema or identity migration", async()=>{
    const f=fixture(); await f.start(); f.message(); f.message(); await f.e.drain(); const [a,b]=Object.keys(f.state.items);
    await f.e.sendItem(a,"seb",f.send());await f.e.deleteItem(b);
    const before=structuredClone(f.state); await f.reload(); await f.reload();eq(f.state,before,"idempotent existing v1 ledger");eq(f.state.version,1,"schema unchanged");
  });
  await test("legacy plugin execution and stored prompts are suppressed without modifying legacy data", async()=>{
    const kv=new Map(), before=[];
    const store=await loadTs("../lib/chat-plugin-storage.ts",{
      "./kv-db":{kvGet:k=>kv.get(k),kvSet:(k,v)=>{before.push(k);kv.set(k,v)},kvRemove:k=>kv.delete(k),registerKvMigration(){}},
      "./chat-plugin-types":{CHAT_PLUGIN_API_VERSION:1},
    });
    const installed=[{manifest:{id:"gift-backpack"},enabled:true,code:"legacy"},{manifest:{id:"auren.float-possessions"},enabled:true,code:source},{manifest:{id:"other"},enabled:true,code:"other"}];
    kv.set("chat_plugins_v3",JSON.stringify(installed));kv.set("chat_plugin_fragments_v2",JSON.stringify({"gift-backpack":{__global__:"stale ownership"},other:{__global__:"unrelated prompt"}}));
    eq(store.loadRunnableChatPlugins().map(p=>p.manifest.id),["auren.float-possessions","other"],"legacy never executes");
    eq(store.buildChatPluginPromptFragments(),"unrelated prompt","legacy prompt excluded");
    installed[1].enabled=false;kv.set("chat_plugins_v3",JSON.stringify(installed));
    eq(store.loadRunnableChatPlugins().map(p=>p.manifest.id),["other"],"disabled authority never falls back");eq(before,[],"no storage writes");
    kv.set("chat_plugins_v3",JSON.stringify([installed[0]]));eq(store.loadRunnableChatPlugins().length,1,"legacy-only installations unaffected");
  });
  await test("one online extension slot entry opens the shared viewer with management and native send", async()=>{
    class Element {
      constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.attributes={};this.disabled=false}
      append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}} replaceChildren(){this.children=[]}
      setAttribute(k,v){this.attributes[k]=v} focus(){} remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)} click(){return this.onclick?.()}
    }
    const previousWindow=globalThis.window,previousDocument=globalThis.document;
    const win=new EventTarget();let confirmation=false,confirmCount=0;
    win.confirm=()=>{confirmCount++;return confirmation};globalThis.window=win;globalThis.document={createElement:tag=>new Element(tag),createElementNS:(_ns,tag)=>new Element(tag)};
    const walk=node=>[node,...node.children.flatMap(walk)];
    const buttons=node=>walk(node).filter(n=>n.tag==="button");
    const f=fixture(),slots=new Map(),modals=[],errors=[],sendRequests=[]; let provider,cleanup;
    try {
      await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];f.legacy.push({id:"stale",title:"Custom balisong",recipient:"user"});
      const bridge=await loadTs("../lib/native-gift-bridge.ts",{"./shopping-gift-utils":{loadDeliveredShoppingGifts:()=>[]},"./chat-plugin-storage":{loadChatPlugins:()=>[{manifest:{id:"auren.float-possessions"}}]}});
      f.ctx.gifts.register=p=>{provider=p;cleanup=bridge.registerNativeGiftProvider("auren.float-possessions",p)};
      f.ctx.gifts.changed=bridge.notifyNativeGiftsChanged;f.ctx.gifts.open=request=>sendRequests.push(request);
      f.ctx.hooks={on(name,fn){f.ctx.persisted=m=>fn({message:m})},transform(){}};
      f.ctx.system.storage.readOther=()=>{throw new Error("Viewer must not read legacy ownership")};
      f.ctx.ui={injectCSS(){},slot(name,mount){ok(!slots.has(name),"one registration per slot");slots.set(name,mount)},toast:e=>errors.push(e),openModal(mount){const node=new Element("div");const entry={node};modals.push(entry);entry.cleanup=mount(node,{close:()=>entry.cleanup?.()});return {close:()=>entry.cleanup?.()}}};
      const stop=await plugin.setup(f.ctx);
      ok(!slots.has("chat.header"),"no header control");ok(slots.has("character.details")&&slots.has("settings.section"),"other entry points retained");
      const toolbar=new Element("div");let unmount=slots.get("chat.inputToolbar")(toolbar,{sessionId:"seb-chat"});
      eq(buttons(toolbar).length,1,"exactly one extension button");eq(buttons(toolbar)[0].attributes["aria-label"],"背包","exact label");
      eq(walk(toolbar).filter(n=>n.tag==="span"&&n.textContent==="背包").length,1,"visible label once");
      ok(walk(toolbar).some(n=>n.tag==="svg"&&n.attributes.fill==="none"),"outline SVG icon");
      unmount();eq(buttons(toolbar).length,0,"slot cleanup removes entry");unmount=slots.get("chat.inputToolbar")(toolbar,{sessionId:"seb-chat"});
      eq(buttons(toolbar).length,1,"reopen does not duplicate entry");await buttons(toolbar)[0].click();
      let root=modals.at(-1).node; eq(walk(root).filter(n=>n.tag==="article").length,1,"one item, no legacy copy");
      for(const label of ["编辑","删除","赠送"])ok(buttons(root).some(n=>n.textContent===label),"user action "+label);
      await buttons(root).find(n=>n.textContent==="赠送").click();eq(sendRequests,[{itemId:id,sessionId:"seb-chat"}],"existing native gift flow retains session");
      await buttons(toolbar)[0].click();root=modals.at(-1).node;
      // Keep the editor open during transfer: its eventual save must fail.
      await buttons(root).find(n=>n.textContent==="编辑").click();const editor=modals.at(-1).node;
      await provider.send(id,"seb",f.send());eq(walk(root).filter(n=>n.tag==="article").length,0,"open sender modal updates immediately");
      await buttons(editor).find(n=>n.textContent==="保存").click();ok(errors.some(e=>e.includes("归属已变化")),"stale editor refused");
      const select=walk(root).find(n=>n.tag==="select");select.value="seb";select.onchange();
      eq(walk(root).filter(n=>n.tag==="article").length,1,"recipient exactly once");
      for(const label of ["编辑","删除"])ok(buttons(root).some(n=>n.textContent===label),"character management "+label);
      ok(!buttons(root).some(n=>n.textContent==="赠送"),"cannot send character's item as user");
      await buttons(root).find(n=>n.textContent==="编辑").click();const characterEditor=modals.at(-1).node;
      walk(characterEditor).find(n=>n.tag==="input").value="World-state edit";
      const history=JSON.stringify(f.state.items[id].transferHistory);
      await buttons(characterEditor).find(n=>n.textContent==="保存").click();eq(f.state.items[id].name,"World-state edit","character editor saves");
      eq(JSON.stringify(f.state.items[id].transferHistory),history,"no edit transfer");
      await buttons(root).find(n=>n.textContent==="删除").click();eq(confirmCount,1,"character delete asks confirmation");ok(!f.state.items[id].deletedAt,"cancel preserves character item");
      confirmation=true;await buttons(root).find(n=>n.textContent==="删除").click();ok(f.state.items[id].deletedAt,"character tombstone");eq(walk(root).filter(n=>n.tag==="article").length,0,"character deleted from viewer");
      eq(f.state.items[id].ownerId,"seb","deletion is not transfer to user");eq(JSON.stringify(f.state.items[id].transferHistory),history,"no deletion transfer");
      // A fresh incoming item is deleted through the same bottom-toolbar viewer.
      confirmation=false;confirmCount=0;
      const fresh=f.message();await provider.list();await buttons(toolbar)[0].click(); const deletion=modals.at(-1).node;
      await buttons(deletion).find(n=>n.textContent==="删除").click();eq(confirmCount,1,"confirmation asked");eq(walk(deletion).filter(n=>n.tag==="article").length,1,"cancel retained");
      confirmation=true;await buttons(deletion).find(n=>n.textContent==="删除").click();eq(walk(deletion).filter(n=>n.tag==="article").length,0,"confirmed deletion updates view");
      eq((await bridge.loadNativeGifts()).length,0,"native picker excludes deletion and transfer");ok(f.messages.some(m=>m.id===fresh.id),"original message retained");
      unmount();stop();
    } finally {cleanup?.();for(const m of modals)m.cleanup?.();globalThis.window=previousWindow;globalThis.document=previousDocument}
  });
  await test("character editing preserves ownership, immutable identity and all semantic fields", async()=>{
    const f=fixture();await f.start();f.message();await f.e.drain();const id=Object.keys(f.state.items)[0];await f.e.sendItem(id,"seb",f.send());
    const before=structuredClone(f.state.items[id]),events=JSON.stringify(f.state.events);f.advance();
    const patch={name:"New name",description:"New description",price:"¥900",source:"Story correction",emoji:"📘"};
    await f.e.editItem(id,{...patch,ownerId:"user",itemId:"fake",provenance:{},transferHistory:[]},"seb");
    for(const key of Object.keys(patch))eq(f.state.items[id][key],patch[key],"editable field "+key);
    for(const key of ["itemId","ownerId","provenance","transferHistory","createdAt"])eq(f.state.items[id][key],before[key],"immutable "+key);
    ok(f.state.items[id].updatedAt!==before.updatedAt,"updatedAt updated");eq(JSON.stringify(f.state.events),events,"no new transfer or event");
    const prompt=await f.e.prompt({sessionId:"seb-chat",characterId:"seb",hint:""});ok(prompt.hint.includes("¥900")&&prompt.hint.includes("New description"),"character prompt sees edits");
    await f.reload();eq(f.e.inventory("seb")[0].name,patch.name,"character edit survives reload");
  });
  await test("deleted character gift keeps history and cannot recover from gift messages", async()=>{
    const f=fixture();await f.start();const gift=f.message({sessionId:"group",senderCharacterId:"jay",mediaData:{giftName:"Book",recipientName:"Sebastian Krueger"}});await f.e.drain();
    const id=Object.keys(f.state.items)[0],before=structuredClone(f.state),messages=JSON.stringify(f.messages);
    await f.e.deleteItem(id,"seb");f.e.onMessage(gift);await f.e.drain();await f.reload();await f.e.sync();await f.reload();
    eq(Object.keys(f.state.items),[id],"no replacement instance");ok(f.state.items[id].deletedAt,"tombstone retained");
    for(const owner of ["user","jay","seb"])eq(f.e.inventory(owner),[],"no active view after deletion");
    for(const key of ["itemId","ownerId","provenance","transferHistory"])eq(f.state.items[id][key],before.items[id][key],"audit "+key);
    eq(f.state.events,before.events,"dedup unchanged");eq(JSON.stringify(f.messages),messages,"original gift retained");
    await rejects(()=>f.e.editItem(id,{name:"revived"}),"deleted character item cannot edit");await rejects(()=>f.e.sendItem(id,"jay",f.send("jay")),"deleted character item cannot send");
  });
  await test("deleted character-owned shopping instance survives shopping sync without replacement", async()=>{
    const f=fixture();await f.start();f.advance();f.orders.push({id:"o2",paidAt:"2026-09-17T00:30:00.000Z",items:[{id:"p",title:"Book",quantityLabel:"1"}]});
    await f.e.sync();const id=Object.keys(f.state.items)[0];await f.e.sendItem(id,"seb",f.send());const before=structuredClone(f.state),orders=JSON.stringify(f.orders),messages=JSON.stringify(f.messages);
    await f.e.deleteItem(id,"seb");await f.e.sync();await f.reload();await f.e.sync();
    eq(Object.keys(f.state.items),[id],"no new instance");eq(f.e.inventory("seb"),[],"character inventory empty");eq((await f.e.list()).gifts,[],"user picker empty");
    eq(f.state.items[id].transferHistory,before.items[id].transferHistory,"no fake deletion transfer");eq(f.state.shopKeys,before.shopKeys,"shop identity retained");eq(f.state.events,before.events,"event identity retained");
    eq(JSON.stringify(f.orders),orders,"order unchanged");eq(JSON.stringify(f.messages),messages,"gift messages unchanged");
  });
  await test("existing slot forwards online session and character identity to plugin mount", async()=>{
    const mounted=[],effects=[];
    const {ChatPluginSlot}=await loadTs("../components/chat/chat-plugin-slot.tsx",{
      react:{memo:fn=>fn,useRef:()=>({current:{replaceChildren(){}}}),useEffect:fn=>effects.push(fn),useSyncExternalStore:(_subscribe,get)=>get()},
      "react/jsx-runtime":{jsx:()=>null},
      "@/lib/chat-plugin-runtime":{getChatPluginRuntime:()=>({subscribeSlotsChanged(){},getSlotsVersion:()=>1,getSlotRegistrations:()=>[{}],mountSlot:(name,_el,props)=>{mounted.push({name,props});return ()=>{}}})},
    });
    ChatPluginSlot({name:"chat.inputToolbar",slotProps:{sessionId:"seb-chat",isGroup:false}});effects.splice(0).forEach(fn=>fn());
    ChatPluginSlot({name:"character.details",slotProps:{characterId:"seb"}});effects.splice(0).forEach(fn=>fn());
    eq(mounted[0].props.sessionId,"seb-chat","online session forwarded");eq(mounted[1].props.characterId,"seb","character details forwarded");
    const room=await readFile(new URL("../components/chat/chat-room.tsx",import.meta.url),"utf8");
    eq((room.match(/name="chat.inputToolbar"/g)||[]).length,1,"one core extension mount");ok(room.includes('slotProps={{ sessionId, isGroup }}'),"session wiring");ok(!room.includes("PossessionsBackpackButton"),"no hard-coded second entry");
  });
  await test("native shop cannot bypass tombstones or fall back while possessions reloads", async()=>{
    const bridge=await loadTs("../lib/native-gift-bridge.ts",{
      "./shopping-gift-utils":{loadDeliveredShoppingGifts:()=>[{id:"o::p::1"}]},
      "./chat-plugin-storage":{loadChatPlugins:()=>[{manifest:{id:"auren.float-possessions"}}]},
    });
    await rejects(()=>bridge.loadNativeGifts(),"not ready is not an empty ownership store");
    const off=bridge.registerNativeGiftProvider("auren.float-possessions",{list:async()=>({gifts:[],managedShoppingIds:["o::p::1"]}),send:()=>{throw new Error("not owned")}});
    try {
      eq(await bridge.loadNativeGifts(),[],"deleted shop candidate suppressed");let calls=0;
      await rejects(()=>bridge.sendNativeGift({id:"o::p::1"},"seb",()=>{calls++;return true}),"stale shop candidate rejected");eq(calls,0,"no send side effect");
    } finally {off()}
    await rejects(()=>bridge.loadNativeGifts(),"reload never resurrects shop item");
  });
  return results;
}

const passed = await runPossessionTests(createPossessionsEngine);
assert.equal(passed.length, 30);
for (const name of passed) console.log("PASS", name);
console.log(passed.length + " possessions checks passed.");
