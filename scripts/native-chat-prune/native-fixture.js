fake['../chat-db']=load('chat-db');fake['../kv-db']=fake['./kv-db'];
fake['../sha256-stream']=load('sha256-stream');fake['./serializers']=load('data-management/serializers');
window.paymentRecords=[];window.published=[];
fake['./payment-ledger']={readPaymentRecords:async()=>paymentRecords,markPaymentPublished:async id=>published.push(id)};
fake['./payment-fx']={getPaymentFxQuote:()=>{throw Error('unexpected payment action')}};
window.flush=()=>db.transaction('r',db.messages,db.sessions,()=>db.messages.count());
window.exact=async()=>({disk:(await db.messages.where('sessionId').equals('target').toArray()).sort(storage.compareChatMessages),cache:storage.loadChatMessages('target')});
window.backup=rows=>({type:'indexeddb',dbName:'AiPhoneChatDB',stores:[{name:'messages',keyPath:'id',autoIncrement:false,indexes:[],records:rows.map(row=>({key:row.id,value:row}))}]});
window.paymentRecord=id=>({id,sessionId:'target',kind:'transfer',fromUser:true,currency:'CNY',totalFen:100,count:1,status:'pending',claims:[],operations:{send:{action:'send',transactionId:'synthetic-payment'}},createdAt:new Date().toISOString()});

fake['./native-gift-bridge']=trap;fake['./shopping-payment-request']=trap;fake['./shopping-storage']=trap;
