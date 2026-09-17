import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const source = await readFile(new URL("../plugins/float-possessions.js", import.meta.url), "utf8");
const { createPossessionsEngine } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

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
      messages.push(msg); engine.onMessage(msg); return msg;
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
  return results;
}

const passed = await runPossessionTests(createPossessionsEngine);
assert.equal(passed.length, 18);
for (const name of passed) console.log("PASS", name);
console.log(passed.length + " possessions checks passed.");
