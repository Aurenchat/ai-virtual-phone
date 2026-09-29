/* Reimplemented from the room-local grouping idea in 初智齿's
 * 末尾气泡标记.js. No Float core patches or chat writes. */
export default {
  manifest: {
    id: "imessage-native-message-bridge",
    name: "iMessage · 分组与原生外观适配",
    apiVersion: 1,
    version: "1.1.0-alpha.6",
    author: "Auren · Chloe 自用适配",
    description: "只处理已导入 iMessage Native Day CSS 的聊天室；动态头像、独立消息分组、真实状态、语音外观。",
    permissions: ["chat.read", "ui"],
    settings: [{ key: "receiptStyle", label: "sent 状态显示方式", type: "select", default: "truthful", options: [
      { value: "truthful", label: "已发送（Float 实际语义）" },
      { value: "reference", label: "已送达（截图外观模拟）" },
      { value: "off", label: "不显示成功回执" }
    ], description: "Float 的 sent 是本地保存状态。外观模拟只更换显示文字，不代表真实设备送达；发送中和失败仍显示。" }]
  },
  setup(ctx) {
    const rooms = new Map();
    const off = [];
    let frame = 0, geometryFrame = 0, disposed = false;
    const resized = new Map();
    // One observer; resizing a transcript must not rescan every message or
    // reread chat storage. Delivery occurs after layout, outside our writes.
    const resizeObserver = new ResizeObserver(entries => {
      for (const {target} of entries) {
        for (const state of rooms.values()) {
          if (state.outlines.has(target)) { resized.set(target,state); break; }
        }
      }
      if (!disposed && !geometryFrame) geometryFrame=requestAnimationFrame(() => {
        geometryFrame=0;
        resized.forEach((state,bubble) => {
          if (bubble.isConnected && state.outlines.has(bubble)) outline(bubble,state,true);
        });
        resized.clear();
      });
    });
    const bubbleSelector = '.chat-bubble-role-user, .chat-bubble-role-assistant';
    const flag = (el, name, enabled) => { if (el.classList.contains(name) !== !!enabled) el.classList.toggle(name, !!enabled); };
    const attr = (el, name, value) => {
      if (value == null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
      else if (el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value));
    };
    const own = (el, state) => { el.dataset.imOwned = 'message'; state.nodes.add(el); return el; };
    const text = (el, value) => { if (el.textContent !== value) el.textContent = value; };
    const isEnabled = room => getComputedStyle(room).getPropertyValue('--im-theme').trim() === '1';
    const getId = room => Array.from(room.classList).find(c => c.startsWith('session-'))?.slice(8);
    const listen = (state, el, event, fn) => {
      el.addEventListener(event, fn);
      if (!state.handlers.has(el)) state.handlers.set(el, []);
      state.handlers.get(el).push(() => el.removeEventListener(event, fn));
    };
    const touch = (state, el, name, value) => {
      let attrs = state.attrs.get(el);
      if (!attrs) { attrs = new Map(); state.attrs.set(el, attrs); }
      if (!attrs.has(name)) attrs.set(name, el.getAttribute(name));
      attr(el, name, value);
    };
    const newState = () => ({ nodes: new Set(), attrs: new Map(), handlers: new Map(), off: [], header: null, outlines: new Map(), marked: new Set() });
    const messageClasses = ['im-message-block','im-follow','im-message-row','im-bubble','im-kind-text','im-kind-plain','im-kind-voice','im-kind-media','im-time-wrap','im-geometry-ready'];
    const messageAttrs = ['data-im-last','data-im-first','data-im-group','data-im-plain','data-im-text-gap'];
    function clearMessage(el) {
      messageClasses.forEach(c => flag(el,c,false));
      messageAttrs.forEach(a => attr(el,a,null));
    }
    // Only the background is drawn. React content, pointer handlers and plugin
    // attachments remain unwrapped/unclipped. One filled path avoids overlap seams.
    function outline(bubble, state, enabled) {
      let item = state.outlines.get(bubble);
      if (!enabled) {
        if (item) { resizeObserver.unobserve(bubble); resized.delete(bubble); item.svg.remove(); state.nodes.delete(item.svg); state.outlines.delete(bubble); }
        flag(bubble,'im-geometry-ready',false);
        return;
      }
      if (!item) {
        const svg = own(document.createElementNS('http://www.w3.org/2000/svg','svg'),state);
        svg.setAttribute('class','im-text-outline'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
        const path = document.createElementNS(svg.namespaceURI,'path'); svg.append(path); bubble.append(svg);
        item = {svg,path,key:null}; state.outlines.set(bubble,item);
        resizeObserver.observe(bubble);
      }
      const box = getComputedStyle(bubble), w = parseFloat(box.width), h = parseFloat(box.height);
      if (!w || !h) return;
      const key = `${w}/${h}/${bubble.hasAttribute('data-im-last')}/${bubble.classList.contains('chat-bubble-role-assistant')}`;
      if (item.key === key) { flag(bubble,'im-geometry-ready',true); return; }
      item.key = key;
      // P6 fit: multiline quarter corner r=23.9, control inset=8.4 CSS px.
      // Short 42.67px capsules fit a circular quarter. No text/font adjustment.
      const r = Math.min(24,h/2,w/2);
      const a = r < 24 ? r * .447715 : 8.4;
      const n = value => Math.round(value*1000)/1000;
      let d = `M${r} 0H${n(w-r)}C${n(w-a)} 0 ${n(w)} ${a} ${n(w)} ${r}V${n(h-r)}C${n(w)} ${n(h-a)} ${n(w-a)} ${n(h)} ${n(w-r)} ${n(h)}H${r}C${a} ${n(h)} 0 ${n(h-a)} 0 ${n(h-r)}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
      if (bubble.hasAttribute('data-im-last')) {
        // Coordinates are measured from the body's right/bottom, not its bounds
        // plus an outward offset. Tip stays ~9px inset and descends ~7.3px.
        const x = offset => n(w-offset), y = offset => n(h+offset), root = Math.min(24,w/2);
        d += `M${x(3)} ${y(-13)}C${x(3.8)} ${y(-8.8)} ${x(5.8)} ${y(-7)} ${x(8.5)} ${y(-4.8)}C${x(12.4)} ${y(-1.8)} ${x(12)} ${y(1.5)} ${x(9.3)} ${y(5.5)}C${x(7.7)} ${y(8.6)} ${x(11.1)} ${y(7.1)} ${x(13.5)} ${y(5.8)}L${x(root-2.5)} ${y(.6)}Q${x(root-1.4)} ${y(0)} ${x(root)} ${y(0)}L${x(root)} ${y(-13)}Z`;
      }
      const incoming = bubble.classList.contains('chat-bubble-role-assistant');
      if (incoming && bubble.hasAttribute('data-im-last')) {
        // Incoming is a single exterior contour measured from the incoming
        // text in iMessage对比.png. No mirrored outgoing patch or overlap join.
        // Coordinates below are from the LEFT edge / body bottom; the base
        // returns at 24px, the rounded tip is ~9px inset and ~7.3px below.
        const y = offset => n(h+offset), root = Math.min(24,w/2);
        d = `M${r} 0H${n(w-r)}C${n(w-a)} 0 ${n(w)} ${a} ${n(w)} ${r}V${n(h-r)}C${n(w)} ${n(h-a)} ${n(w-a)} ${n(h)} ${n(w-r)} ${n(h)}H${root}`;
        d += `Q${n(root-1.2)} ${y(0)} ${n(root-2.4)} ${y(.7)}L13.2 ${y(6)}C10.5 ${y(7.6)} 7.5 ${y(8.3)} 9 ${y(5.5)}C11.7 ${y(1.7)} 12 ${y(-1.8)} 8 ${y(-5)}C2.2 ${y(-9.2)} 0 ${y(-12.5)} 0 ${n(h-r)}V${r}C0 ${a} ${a} 0 ${r} 0Z`;
      }
      attr(item.svg,'viewBox',`0 0 ${n(w)} ${n(h+8)}`);
      attr(item.svg,'height',n(h+8));
      attr(item.path,'d',d);
      attr(item.path,'transform',null);
      flag(bubble,'im-geometry-ready',true);
    }
    function clean(room, state) {
      state.outlines.forEach((item,bubble) => { resizeObserver.unobserve(bubble); resized.delete(bubble); }); state.outlines.clear();
      state.marked.forEach(clearMessage); state.marked.clear();
      state.off.forEach(fn => fn());
      state.handlers.forEach(fns => fns.forEach(fn => fn()));
      state.nodes.forEach(n => n.remove());
      state.attrs.forEach((attrs, el) => attrs.forEach((value, name) => attr(el, name, value)));
      const classes = ['im-header-ready','im-single','im-group','im-wallpaper','im-plain-background','im-message-block','im-follow','im-message-row','im-bubble','im-kind-text','im-kind-plain','im-kind-voice','im-kind-media','im-time-wrap','im-wave-ready'];
      [room, ...room.querySelectorAll('*')].forEach(el => {
        classes.forEach(c => flag(el,c,false));
        ['data-im-last','data-im-first','data-im-group','data-im-plain','data-im-duration'].forEach(a => attr(el,a,null));
      });
    }
    function header(room, state, session) {
      const content = room.querySelector(':scope > .page-header .page-header-content');
      const title = content?.querySelector('.page-title');
      const more = content?.querySelector('.page-header-right button[aria-label="更多"]');
      if (!content || !title || !more) return;
      if (state.header?.content !== content) {
        const avatar = own(document.createElement('button'),state);
        avatar.type = 'button'; avatar.className = 'im-avatar';
        avatar.setAttribute('aria-label','联系人详情；双击拍一拍');
        avatar.title = '联系人详情；双击拍一拍';
        content.append(avatar);
        const nameLabel = own(document.createElement('span'),state);
        nameLabel.className = 'im-contact-name';
        nameLabel.setAttribute('aria-hidden','true');
        title.append(nameLabel);
        // Keep the original React-owned title node and its typing indicator intact.
        touch(state,title,'role','button'); touch(state,title,'tabindex','0');
        touch(state,title,'aria-label','打开聊天设置');
        const settings = () => { if (more.isConnected && !more.disabled) more.click(); };
        listen(state,title,'click',settings);
        listen(state,title,'keydown',e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); settings(); } });
        // Delay single click so a double click can still forward Float's original poke.
        let clickTimer = 0;
        listen(state,avatar,'click',() => { clearTimeout(clickTimer); clickTimer = setTimeout(settings,260); });
        listen(state,avatar,'dblclick',() => {
          clearTimeout(clickTimer);
          const targets = [...room.querySelectorAll('.im-message-row[data-role="assistant"] .chat-msg-avatar .cursor-pointer')];
          const target = targets.at(-1);
          if (!session.isGroup && target) target.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
          else settings();
        });
        state.off.push(() => clearTimeout(clickTimer));
        state.header = { content, title, avatar, more, nameLabel, avatarKey: null };
      }
      const h = state.header;
      const char = session.isGroup ? null : ctx.data.characters.get(session.contactId);
      const nativeName = [...title.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
      const name = nativeName || session.alias || (session.isGroup ? session.groupName : char?.name) || '';
      const src = char?.avatar || '';
      text(h.nameLabel, name);
      touch(state,h.title,'aria-label',`${name}，打开聊天设置`);
      const key = `${name}\n${src}`;
      if (key !== h.avatarKey) {
        h.avatarKey = key;
        h.avatar.replaceChildren();
        if (src) {
          const img = document.createElement('img'); img.alt = ''; img.src = src;
          img.addEventListener('error',() => { h.avatar.textContent = Array.from(char?.name || name)[0] || '·'; },{once:true});
          h.avatar.append(img);
        } else text(h.avatar, session.isGroup ? '⋯' : Array.from(char?.name || name)[0] || '·');
      }
      flag(room,'im-header-ready',true);
    }
    function voice(bubble, state) {
      const node = bubble.querySelector('.voice-msg-bubble');
      if (!node) return;
      const bars = node.querySelector('.voice-msg-bars');
      if (bars && !bars.querySelector('.im-wave')) {
        const wave = own(document.createElement('span'),state);
        wave.className = 'im-wave'; wave.setAttribute('aria-hidden','true');
        // Decorative waveform: Float itself supplies no audio sample peaks.
        for (let i=0;i<42;i++) {
          const bar = document.createElement('i');
          const envelope = Math.abs(Math.sin(i*.19)) * (.55 + .45*Math.abs(Math.cos(i*.37)));
          bar.style.height = `${Math.round(4+30*envelope)}px`;
          wave.append(bar);
        }
        bars.append(wave); flag(bars,'im-wave-ready',true);
      }
      const dur = node.querySelector('.voice-msg-dur');
      if (dur) {
        const match = dur.textContent.trim().match(/^(\d+(?:\.\d+)?)"$/);
        const seconds = match ? Math.round(Number(match[1])) : null;
        attr(dur,'data-im-duration',seconds == null ? null : `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);
      }
      if (!state.attrs.has(node)) {
        touch(state,node,'role','button'); touch(state,node,'tabindex','0');
        touch(state,node,'aria-label','播放或暂停语音');
        listen(state,node,'keydown',e => { if (e.target===node && (e.key==='Enter' || e.key===' ')) { e.preventDefault(); node.click(); } });
      }
      const playing = bars?.hasAttribute('data-playing');
      touch(state,node,'aria-label',playing ? '暂停语音' : '播放语音');
    }
    function updateRoom(room, state, session) {
      flag(room,'im-single',!session.isGroup); flag(room,'im-group',!!session.isGroup);
      flag(room,'im-wallpaper',room.hasAttribute('data-has-bg-image'));
      flag(room,'im-plain-background',!room.hasAttribute('data-has-bg-image'));
      header(room,state,session);
      const body = room.querySelector(':scope > .page-body.chat-room-main-pane');
      if (!body) return;
      const records = new Map(ctx.data.messages.list(session.id).map(msg => [msg.id,msg]));
      // Only main flow rows. Nested call transcripts/plugin cards are not messages.
      const rows = [...body.querySelectorAll(':scope > .chat-msg-wrapper, :scope > div > .chat-msg-wrapper')].filter(row =>
        (row.id.startsWith('message-') || row.querySelector('.chat-stream-bubble')) &&
        !row.hasAttribute('data-reasoning-row') && row.parentElement.style.display !== 'none' &&
        !row.closest('.chat-offline-body') && getComputedStyle(row).display !== 'none');
      const entries = rows.map(row => {
        const wrap = row.querySelector(':scope > .chat-msg-content-wrap');
        const bubble = wrap && [...wrap.children].find(el => el.matches(bubbleSelector));
        const id = bubble?.getAttribute('data-msg-id') || row.id.replace(/^message-/,'');
        const msg = records.get(id);
        const block = row.parentElement === body ? row : row.parentElement;
        return { row, bubble, id, msg, block, role: row.dataset.role };
      });
      const active = new Set(entries.flatMap(e => [e.row,e.block,e.bubble].filter(Boolean)));
      state.marked.forEach(el => { if (!active.has(el)) clearMessage(el); });
      state.marked = active;
      state.outlines.forEach((item,bubble) => { if (!active.has(bubble) || !item.svg.isConnected) outline(bubble,state,false); });
      const lastUser = entries.filter(e => e.role==='user' && e.bubble && !e.msg?.isRetracted).at(-1);
      entries.forEach((e,index) => {
        const {row,bubble,msg,block} = e;
        const prev = entries[index-1];
        const next = entries[index+1];
        const hasTime = entry => entry && [...entry.block.children].some(n => n!==entry.row && n.querySelector?.(':scope > .chat-sys-msg'));
        const continues = (a,b) => !!a?.bubble && !!b?.bubble && a.block!==b.block &&
          b.row.hasAttribute('data-consecutive') && a.role===b.role && !hasTime(b) &&
          (!session.isGroup || (!!a.msg && !!b.msg && a.msg.senderCharacterId===b.msg.senderCharacterId));
        const last = !continues(e,next);
        flag(row,'im-message-row',true);
        if (block.parentElement===body) { flag(block,'im-message-block',true); flag(block,'im-follow',continues(prev,e)); }
        [...block.children].forEach(n => { if (n!==row && n.querySelector?.(':scope > .chat-sys-msg')) flag(n,'im-time-wrap',true); });
        if (!bubble) { attr(row,'data-im-plain',null); attr(block,'data-im-text-gap',null); return; }
        flag(bubble,'im-bubble',true);
        const isVoice = !!bubble.querySelector('.voice-msg-bubble');
        const isMedia = !!bubble.querySelector('.chat-photo-card--image, .chat-sticker, .chat-media-file-video');
        const isText = !isVoice && !isMedia && !bubble.classList.contains('chat-bubble-media') && (!msg?.mediaType || msg.mediaType==='quote');
        flag(bubble,'im-kind-text',isText); flag(bubble,'im-kind-voice',isVoice); flag(bubble,'im-kind-media',isMedia);
        // Phase-one calibration requires a mapped ordinary text record. Keep the
        // original special renderers, translation, quotes and plugin projections.
        const textRecord = isText && !!msg && !msg.mediaType && !msg.isRetracted &&
          !msg.mediaData?.readingQuote &&
          !bubble.querySelector('.chat-quote-message, iframe, .chat-html-frame');
        const bilingual = !!bubble.querySelector('.chat-bilingual-block');
        const plain = !room.hasAttribute('data-has-bg-image') && textRecord && !bilingual;
        flag(bubble,'im-kind-plain',plain);
        attr(row,'data-im-plain',plain ? '' : null);
        // Preserve timestamp spacing. Only a real adjacent plain-text boundary
        // gets measured group spacing; audio itself keeps its original renderer.
        attr(block,'data-im-text-gap',prev?.bubble && !hasTime(e) && (plain || prev.row.hasAttribute('data-im-plain')) ? (continues(prev,e) ? 'follow' : 'break') : null);
        attr(bubble,'data-im-first',!continues(prev,e) ? '' : null);
        attr(bubble,'data-im-last',last ? '' : null);
        attr(bubble,'data-im-group',continues(prev,e) ? (last ? 'last' : 'middle') : (last ? 'single' : 'first'));
        // Geometry eligibility is independent of wallpaper and typography.
        // Incoming with the native translation toggle still uses a text shell;
        // only that shell changes, never its translation UI. Native audio and
        // reply records share this same OUTER shell; their children stay intact.
        // Keep ordinary text eligibility and all grouping decisions unchanged.
        const nativeSpecialShell = !!msg && !msg.isRetracted &&
          ((msg.mediaType==='audio' && isVoice) ||
           (msg.mediaType==='quote' && isText && !!bubble.querySelector(':scope > .chat-quote-message')));
        outline(bubble,state,(textRecord && (!bilingual || e.role==='assistant')) || nativeSpecialShell);
        if (isVoice) voice(bubble,state);
        const wrap = bubble.closest('.chat-msg-content-wrap');
        let receipt = wrap?.querySelector(':scope > .im-receipt');
        const mode = ctx.system.settings.get('receiptStyle') || 'truthful';
        const show = e.role==='user' && msg && !msg.isRetracted &&
          (msg.status==='failed' || msg.status==='sending' || (e===lastUser && last && mode!=='off'));
        const labels = { sent: mode==='reference' ? '已送达' : '已发送', read:'已读', sending:'发送中…', failed:'发送失败' };
        const label = show ? labels[msg.status] : null;
        if (label && wrap) {
          if (!receipt) { receipt=own(document.createElement('span'),state); receipt.className='im-receipt'; receipt.setAttribute('role','status'); wrap.append(receipt); }
          text(receipt,label); attr(receipt,'data-status',msg.status);
          attr(receipt,'title',mode==='reference' && msg.status==='sent' ? '外观模拟：Float sent 仅表示本地保存' : null);
        } else if (receipt) { receipt.remove(); state.nodes.delete(receipt); }
      });
      // Release detached decoration references after message deletion/virtualization.
      state.nodes.forEach(n => { if (!n.isConnected) state.nodes.delete(n); });
      state.handlers.forEach((fns,el) => { if (!el.isConnected) { fns.forEach(fn => fn()); state.handlers.delete(el); } });
      state.attrs.forEach((attrs,el) => { if (!el.isConnected) state.attrs.delete(el); });
    }
    function relevantMutation(m) {
      const el=m.target.nodeType===Node.ELEMENT_NODE ? m.target : m.target.parentElement;
      if (!el || el.closest('[data-im-owned]')) return false;
      // Session CSS injection/theme removal, ancestor visibility and room mounts.
      if (el.closest('head')) return true;
      const room=el.closest('.chat-room-wrapper');
      if (!room) {
        if (m.type==='attributes') return [...rooms.keys()].some(r=>el.contains(r));
        return [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1 && (n.matches('.chat-room-wrapper') || n.querySelector('.chat-room-wrapper')));
      }
      if (el===room) {
        if(m.attributeName==='style') {
          const relevantStyle=s=>(s||'').split(';').map(p=>p.trim()).filter(p=>p&&!p.startsWith('--chat-bottom-reserve:')).join(';');
          return relevantStyle(m.oldValue)!==relevantStyle(room.getAttribute('style'));
        }
        return true;
      }
      if (el.closest('.chat-input-bar')) return false;
      // ChatRoom adjusts the scroll pane's padding when the composer grows;
      // this does not alter sender boundaries or bubble widths.
      if (m.attributeName==='style' && el.matches('.page-body.chat-room-main-pane')) return false;
      const bars=el.closest('.voice-msg-bars');
      if (bars) {
        if (m.attributeName==='data-playing') {
          const bubble=bars.closest(bubbleSelector),state=rooms.get(room);
          if(bubble && state) voice(bubble,state);
        }
        return false; // Native waveform animation is neither grouping nor layout.
      }
      if (m.type==='attributes' && m.attributeName==='style' && el.closest(bubbleSelector)) return false; // ResizeObserver owns geometry.
      return !!el.closest('.page-body.chat-room-main-pane, .page-header.chat-room-main-pane');
    }
    const observer = new MutationObserver(records => { if(records.some(relevantMutation)) schedule(); });
    const observe = () => observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['id','data-msg-id','data-consecutive','data-role','data-playing','data-has-bg-image','class','style']});
    function refresh() {
      frame=0; if(disposed) return;
      observer.disconnect();
      try {
        rooms.forEach((state,room) => { if(!room.isConnected || !isEnabled(room)) { clean(room,state); rooms.delete(room); } });
        document.querySelectorAll('.chat-room-wrapper').forEach(room => {
          if(!isEnabled(room)) return;
          const session=ctx.data.sessions.get(getId(room));
          if(!session) return;
          if(!rooms.has(room)) rooms.set(room,newState());
          updateRoom(room,rooms.get(room),session);
        });
      } finally { if(!disposed) observe(); }
    }
    function schedule() { if(!disposed && !frame) frame=requestAnimationFrame(refresh); }
    // Stream DOM changes already schedule the corresponding render. The hook
    // would also scan while a chunk has not yet produced any visible change.
    ['session.opened','message.persisted','message.updated','message.deleted'].forEach(event => off.push(ctx.hooks.on(event,schedule)));
    off.push(ctx.system.settings.onChange(schedule));
    refresh();
    return () => {
      disposed=true; cancelAnimationFrame(frame); cancelAnimationFrame(geometryFrame); resized.clear(); resizeObserver.disconnect(); observer.disconnect(); off.forEach(fn=>fn());
      rooms.forEach((state,room)=>clean(room,state)); rooms.clear();
    };
  }
};
