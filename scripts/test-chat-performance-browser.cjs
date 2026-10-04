const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const repo=process.cwd(),out=path.join(repo,'scripts/chat-performance');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'float-perf-browser-'));
 const wp=require('next/dist/compiled/webpack/webpack');wp.init();
 await new Promise((resolve,reject)=>wp.webpack({mode:'development',target:'web',devtool:false,context:repo,entry:path.join(repo,'scripts/imessage-theme/fixture.tsx'),output:{path:temp,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':repo},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repo,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},plugins:[new wp.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString({all:false,errors:true}))):resolve()));
 const css=(await require('postcss')([require('@tailwindcss/postcss')({base:repo})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.join(repo,'app/globals.css')})).css;
 const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(temp,'fixture.js')));}
 else if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
 else if(url.pathname.startsWith('/theme/')){
 const file=url.pathname.split('/').at(-1);assert(['iMessage-Native-Day.css','iMessage-Message-Bridge.js','iMessage-Toolbar.js'].includes(file));
 res.end(await fs.readFile(path.join(repo,'themes/imessage-native-day',file)));
 }else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="app"></div><script>window.process={env:{NODE_ENV:"development"}};</script><script src="/fixture.js"></script>');}
 }catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[],errors=[];
 try{
 const context=await browser.newContext({viewport:{width:402,height:874},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>!!window.imTest);
 await page.evaluate(()=>window.imTest.mount());await page.locator('.im-message-row').first().waitFor();
 const check=(name,value)=>{assert(value,name);results.push(name);};
 check('private grouping',await page.locator('.im-message-row[data-role=assistant]').count()===3);
 check('direction',await page.locator('.im-message-row[data-role=user]').count()===2);
 check('outlines',await page.locator('.im-text-outline').count()===5);
 await page.evaluate(()=>window.imTest.scene(Array.from({length:110},(_,i)=>({role:i%2?'assistant':'user',content:'synthetic '+i}))));
 await page.waitForFunction(()=>document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length===50);
 check('actual ChatRoom initial 50',await page.locator('.chat-msg-wrapper[id^="message-"]').count()===50);
 await page.getByText('查看更多消息',{exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.chat-msg-wrapper[id^="message-"]').length===80);
 check('actual ChatRoom load more +30',await page.locator('.chat-msg-wrapper[id^="message-"]').count()===80);
 await page.evaluate(()=>{const c=window.imTest.chat,s=c.loadChatSessions()[0],last=c.loadChatMessages(s.id).at(-1);c.editChatMessage(last.id,'edited through storage');window.imTest.refresh();});
 await page.getByText('edited through storage',{exact:true}).waitFor();check('edit reaches actual room',true);
 await page.evaluate(()=>window.imTest.wallpaper(true));await page.locator('.im-wallpaper').waitFor();check('wallpaper',true);
 await page.evaluate(()=>window.imTest.wallpaper(false));await page.locator('.im-plain-background').waitFor();check('plain mode',true);
 await page.evaluate(()=>window.imTest.scene([{role:'assistant',content:'voice',mediaType:'audio',mediaData:{duration:12}},{role:'user',content:'quote',mediaType:'quote',mediaData:{quoteContent:'original'}},{role:'assistant',content:'image',mediaType:'image',mediaUrl:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>'},{role:'user',content:'music',mediaType:'music_share',mediaData:{musicTitle:'synthetic song',musicArtist:'test'}}]));
 await page.locator('.voice-msg-bubble').waitFor();await page.waitForTimeout(150);
 check('voice shell',await page.locator('.im-kind-voice.im-geometry-ready').count()===1);
 check('media shell',await page.locator('.im-kind-media').count()>=1);
 check('music preserved',await page.getByText('synthetic song',{exact:true}).count()>=1);
 await page.screenshot({path:path.join(out,'browser-rich-media.png')});
 await page.evaluate(()=>{window.imTest.chat.assertChatMessageIndexConsistency();});
 check('index after React interactions',true);
 // Safe mode uses a completely separate synthetic browser context.
 const safe=await browser.newContext({viewport:{width:402,height:874}});
 await safe.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const safePage=await safe.newPage();safePage.on('pageerror',e=>errors.push(e.message));
 await safePage.goto(origin+'/?plugin-safe-mode=1');await safePage.waitForFunction(()=>!!window.imTest);
 await safePage.evaluate(()=>window.imTest.mount());await safePage.waitForTimeout(150);
 const state=await safePage.evaluate(()=>({hydrated:window.imTest.chat.isChatStorageHydrated(),messages:window.imTest.chat.loadChatMessages(window.imTest.chat.loadChatSessions()[0].id).length,decorated:document.querySelectorAll('.im-message-row').length}));
 check('safe mode still hydrates',state.hydrated&&state.messages===5);check('safe mode skips plugin setup',state.decorated===0);
 assert.deepEqual(errors,[]);check('no browser page errors',true);
 await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,results,errors}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
