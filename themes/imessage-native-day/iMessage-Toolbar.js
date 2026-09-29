/* Reimplements 初智齿's 按钮收纳聊天室分离版.js idea without hijacking
 * a React-owned button or depending on nth-child. Original nodes stay put. */
export default {
  manifest: {
    id: 'imessage-native-toolbar',
    name: 'iMessage · 输入栏与功能收纳',
    apiVersion: 1,
    version: '1.1.0-alpha.7',
    author: 'Auren · Chloe 自用适配',
    description: '仅在 Native Day 主题聊天室启用；原发送/停止保留，AI、表情等收进加号，波形与视频按钮调用 Float 原功能。',
    permissions: ['ui']
  },
  setup(ctx) {
    const states = new Map();
    let frame=0, disposed=false, serial=0;
    const flag=(el,name,on)=>{ if(el.classList.contains(name)!==!!on) el.classList.toggle(name,!!on); };
    const set=(el,name,value)=>{ if(value==null) { if(el.hasAttribute(name)) el.removeAttribute(name); } else if(el.getAttribute(name)!==String(value)) el.setAttribute(name,String(value)); };
    const label=button=>button.getAttribute('aria-label') || button.getAttribute('title') || '';
    function kind(button) {
      const name=label(button);
      if(name==='发送' || name==='停止本轮生成') return 'send';
      if(name.includes('触发') && (name.includes('回复') || name.includes('AI'))) return 'ai';
      if(button.classList.contains('chat-offline-toggle')) return 'offline';
      // Audited Float controls currently omit accessible names. Match the full
      // identifying path/line geometry only for these known unnamed controls.
      if(button.querySelector('line[x1="12"][y1="8"][x2="12"][y2="16"]') && button.querySelector('line[x1="8"][y1="12"][x2="16"][y2="12"]')) return 'more';
      if(button.querySelector('path[d="M8 14s1.5 2 4 2 4-2 4-2"]')) return 'emoji';
      if(button.querySelector('path[d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"]')) return 'sticker';
      return 'other';
    }
    const names={offline:'线下模式',more:'更多功能',emoji:'表情',sticker:'表情包',ai:'触发 AI 主动回复',other:'其他功能'};
    function svg(paths) {
      const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
      el.setAttribute('viewBox','0 0 24 24'); el.setAttribute('fill','none'); el.setAttribute('stroke','currentColor'); el.setAttribute('stroke-width','1.7'); el.setAttribute('stroke-linecap','round'); el.setAttribute('stroke-linejoin','round'); el.setAttribute('aria-hidden','true');
      for(const d of paths) { const p=document.createElementNS(el.namespaceURI,'path'); p.setAttribute('d',d); el.append(p); }
      return el;
    }
    function button(className,name,icon) {
      const el=document.createElement('button'); el.type='button'; el.className=className; el.dataset.imOwned='toolbar';
      el.setAttribute('aria-label',name); el.title=name; el.append(icon); return el;
    }
    function close(s,focus=false) {
      s.menu?.remove(); s.menu=null; s.menuItems=[];
      set(s.plus,'aria-expanded','false');
      if(focus && s.plus.isConnected) s.plus.focus();
    }
    function original(s,type) { return [...s.actions.children].find(el=>el.tagName==='BUTTON' && !el.dataset.imOwned && kind(el)===type); }
    function invokeItem(s,name) {
      if(disposed || !s.bar.isConnected) return;
      const find=()=>[...s.bar.querySelectorAll('.chat-plus-menu-item')].find(item=>item.textContent.trim()===name);
      const current=find();
      if(current) { current.click(); return; }
      const more=original(s,'more');
      if(!more || more.disabled) return;
      close(s); more.click();
      let attempts=0;
      const wait=()=>{
        if(disposed || !s.bar.isConnected || !states.has(s.bar)) return;
        const target=find();
        if(target) { target.click(); s.pending=0; return; }
        if(++attempts<30) s.pending=requestAnimationFrame(wait);
        else { s.pending=0; ctx.ui.toast('请在展开的更多功能中选择'+name); }
      };
      s.pending=requestAnimationFrame(wait);
    }
    function show(s) {
      if(s.menu) { close(s); return; }
      const menu=document.createElement('div'); menu.className='im-toolbar-menu'; menu.dataset.imOwned='toolbar';
      menu.id=s.menuId; menu.setAttribute('role','menu'); menu.setAttribute('aria-label','聊天功能');
      s.menu=menu; s.menuItems=[];
      const sources=[...s.actions.children].filter(el=>el.tagName==='BUTTON' && !el.dataset.imOwned && kind(el)!=='send');
      for(const source of sources) {
        const item=document.createElement('button'); item.type='button'; item.setAttribute('role','menuitem'); item.disabled=source.disabled;
        const icon=source.querySelector('svg'); if(icon) { const clone=icon.cloneNode(true); clone.setAttribute('aria-hidden','true'); item.append(clone); }
        const title=document.createElement('span'); title.textContent=label(source)||names[kind(source)]; item.append(title);
        item.addEventListener('click',()=>{
          if(!source.isConnected || source.disabled) return;
          close(s); source.click();
        });
        menu.append(item); s.menuItems.push({source,item,title});
      }
      const pokeTargets=[...s.room.querySelectorAll('.im-message-row[data-role="assistant"] .chat-msg-avatar .cursor-pointer')];
      if(s.room.classList.contains('im-single') && pokeTargets.length) {
        const poke=document.createElement('button'); poke.type='button'; poke.textContent='拍一拍'; poke.setAttribute('role','menuitem');
        poke.addEventListener('click',()=>{ close(s); const target= [...s.room.querySelectorAll('.im-message-row[data-role="assistant"] .chat-msg-avatar .cursor-pointer')].at(-1); target?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); });
        menu.append(poke);
      }
      menu.addEventListener('keydown',e=>{
        const items=[...menu.querySelectorAll('button:not(:disabled)')]; const idx=items.indexOf(document.activeElement);
        if(e.key==='Escape') { e.preventDefault(); close(s,true); }
        if(e.key==='ArrowDown' || e.key==='ArrowUp' || e.key==='Home' || e.key==='End') {
          e.preventDefault(); const n=e.key==='Home'?0:e.key==='End'?items.length-1:(idx+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
          items[n]?.focus();
        }
        if(e.key==='Tab') close(s);
      });
      s.actions.append(menu); set(s.plus,'aria-expanded','true');
      menu.querySelector('button:not(:disabled)')?.focus();
    }
    function setup(bar) {
      const room=bar.closest('.chat-room-wrapper'); const actions=bar.querySelector(':scope > .chat-input-actions');
      const s={bar,room,actions,plus:null,voice:null,menu:null,menuItems:[],menuId:`im-toolbar-${++serial}`,pending:0,off:[],camera:null,more:null,textarea:null,placeholderOriginal:null,placeholderOwned:false};
      s.plus=button('im-plus','更多聊天功能',svg(['M12 4v16M4 12h16']));
      s.plus.setAttribute('aria-haspopup','menu'); s.plus.setAttribute('aria-controls',s.menuId); s.plus.setAttribute('aria-expanded','false');
      s.voice=button('im-voice-input','语音消息',svg(['M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4']));
      s.plus.addEventListener('click',()=>show(s)); s.voice.addEventListener('click',()=>invokeItem(s,'语音条'));
      actions.append(s.plus,s.voice);
      const input=()=>schedule(); bar.addEventListener('input',input); s.off.push(()=>bar.removeEventListener('input',input));
      states.set(bar,s); return s;
    }
    function update(s) {
      const buttons=[...s.actions.children].filter(el=>el.tagName==='BUTTON'&&!el.dataset.imOwned);
      const send=buttons.find(b=>kind(b)==='send');
      const ta=s.bar.querySelector(':scope > .chat-input-textarea');
      if(!send || !ta) return;
      const stop=label(send)==='停止本轮生成'; const empty=!ta.value.trim()&&!stop;
      flag(s.bar,'im-composer',true);
      buttons.forEach(b=>{ const k=kind(b); flag(b,'im-fold-source',k!=='send'); flag(b,'im-send',k==='send'); flag(b,'im-action-more',k==='more'); });
      flag(send,'im-empty',empty); set(send,'data-im-stop',stop?'':null);
      s.voice.hidden=!empty; s.voice.disabled=ta.disabled || !!original(s,'more')?.disabled;
      // Real placeholder; never cover typed text, quote bars or native lock notices.
      if(s.textarea!==ta) { s.textarea=ta; s.placeholderOwned=false; s.placeholderOriginal=ta.getAttribute('placeholder'); }
      if(!ta.disabled && !ta.getAttribute('placeholder')) {
        s.placeholderOriginal=ta.getAttribute('placeholder'); ta.setAttribute('placeholder','iMessage信息'); s.placeholderOwned=true;
      } else if(s.placeholderOwned && ta.getAttribute('placeholder')!=='iMessage信息') s.placeholderOwned=false;
      [...s.bar.children].forEach(el=>{
        if(!el.matches('.chat-input-textarea, .chat-input-actions, .chat-quote-bar, .chat-theater-mode-strip')) flag(el,'im-panel-child',true);
      });
      if(s.menu) {
        const current=buttons.filter(b=>kind(b)!=='send');
        if(current.length!==s.menuItems.length || current.some((b,i)=>b!==s.menuItems[i]?.source)) close(s);
        else s.menuItems.forEach(({source,item,title})=>{
          item.disabled=source.disabled;
          const next=label(source)||names[kind(source)]; if(title.textContent!==next) title.textContent=next;
        });
      }
      const right=s.room.querySelector(':scope > .page-header .page-header-right');
      const more=right?.querySelector('button[aria-label="更多"]');
      const title=s.room.querySelector(':scope > .page-header .page-title[role="button"]');
      if(right && more && title && s.room.classList.contains('im-header-ready')) {
        if(!s.camera?.isConnected) {
          s.camera=button('im-camera','视频通话',svg(['M16 9l5-3v12l-5-3','M5 5h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z']));
          s.camera.addEventListener('click',()=>invokeItem(s,'视频通话')); right.append(s.camera);
        }
        s.more=more; flag(more,'im-settings-source',true);
        s.camera.disabled=!!original(s,'more')?.disabled;
      } else {
        s.camera?.remove(); s.camera=null;
        if(s.more) flag(s.more,'im-settings-source',false);
      }
    }
    function clean(s) {
      close(s); cancelAnimationFrame(s.pending); s.off.forEach(fn=>fn());
      s.plus.remove(); s.voice.remove(); s.camera?.remove();
      if(s.more) flag(s.more,'im-settings-source',false);
      if(s.placeholderOwned && s.textarea?.getAttribute('placeholder')==='iMessage信息') set(s.textarea,'placeholder',s.placeholderOriginal);
      [s.bar,...s.bar.querySelectorAll('*')].forEach(el=>{
        ['im-composer','im-fold-source','im-send','im-empty','im-action-more','im-panel-child'].forEach(c=>flag(el,c,false));
        set(el,'data-im-stop',null);
      });
    }
    const enabled=bar=>getComputedStyle(bar.closest('.chat-room-wrapper')).getPropertyValue('--im-theme').trim()==='1' &&
      !!bar.querySelector(':scope > .chat-input-actions > button[aria-label="发送"], :scope > .chat-input-actions > button[aria-label="停止本轮生成"]') &&
      [...(bar.querySelector('.chat-input-actions')?.children||[])].some(el=>el.tagName==='BUTTON' && kind(el)==='more');
    // Player/progress, message outlines and unrelated apps cannot change the
    // composer controls. Keep observing real toolbar/header React replacements.
    const observer=new MutationObserver(records=>{
      if(records.some(m=>{
        const el=m.target.nodeType===Node.ELEMENT_NODE?m.target:m.target.parentElement;
        if(!el || el.closest('[data-im-owned]')) return false;
        if(el.closest('head'))return true;
        if(el.matches('.chat-room-wrapper') && m.attributeName==='style') {
          const relevantStyle=s=>(s||'').split(';').map(p=>p.trim()).filter(p=>p&&!p.startsWith('--chat-bottom-reserve:')).join(';');
          return relevantStyle(m.oldValue)!==relevantStyle(el.getAttribute('style'));
        }
        if(el.closest('.chat-input-bar, .page-header.chat-room-main-pane') || el.matches('.chat-room-wrapper'))return true;
        if(m.type==='attributes')return [...states.values()].some(s=>el.contains(s.room));
        return [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1 && (n.matches('.chat-room-wrapper, .chat-input-bar') || n.querySelector('.chat-room-wrapper, .chat-input-bar')));
      }))schedule();
    });
    const observe=()=>observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','title','aria-label','disabled','placeholder']});
    function refresh() {
      frame=0; if(disposed) return; observer.disconnect();
      try {
        states.forEach((s,bar)=>{ if(!bar.isConnected || !enabled(bar)) { clean(s); states.delete(bar); } });
        document.querySelectorAll('.chat-room-wrapper > .chat-input-bar').forEach(bar=>{ if(enabled(bar)) update(states.get(bar)||setup(bar)); });
      } finally { if(!disposed) observe(); }
    }
    function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(refresh);}
    const outside=e=>states.forEach(s=>{ if(s.menu&&!s.menu.contains(e.target)&&!s.plus.contains(e.target)) close(s); });
    const escape=e=>{if(e.key==='Escape')states.forEach(s=>{if(s.menu)close(s,true);});};
    document.addEventListener('pointerdown',outside,true); document.addEventListener('keydown',escape);
    refresh();
    return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape);states.forEach(clean);states.clear();};
  }
};
