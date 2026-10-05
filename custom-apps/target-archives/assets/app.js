(function () {
  "use strict";

  var PAGE_SIZE = 20;
  var state = {
    tab: "characters",
    worlds: [],
    summaries: { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 },
    search: "",
    worldFilter: "",
    page: 1,
    loading: true,
    error: "",
    detail: null,
    detailMode: "view",
    detailWorldId: "",
    editAvatar: undefined,
    relationWorldId: "",
    worldExpandedId: ""
  };

  var app = document.getElementById("app");
  var modalRoot = document.getElementById("modal-root");
  var toastRoot = document.getElementById("toast-root");

  function api() {
    if (!window.AiPhone || !window.AiPhone.characters || !window.AiPhone.characterWorlds) {
      throw new Error("当前 Float Host 尚未接入 Target Archives 所需的角色管理 API。");
    }
    return window.AiPhone;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function attr(value) { return esc(value); }

  function fmtDate(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function initials(name) {
    var s = String(name || "?").trim();
    return esc((s[0] || "?").toUpperCase());
  }

  function avatarHtml(src, name, cls) {
    cls = cls || "avatar";
    if (!src) return '<div class="' + cls + ' avatar-placeholder">' + initials(name) + '</div>';
    return '<img class="' + cls + '" src="' + attr(src) + '" alt="" loading="lazy" decoding="async">';
  }

  function toast(message) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = String(message || "");
    toastRoot.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function setError(err) {
    state.error = err ? (err.message || String(err)) : "";
  }

  function worldName(id) {
    var w = state.worlds.find(function (item) { return item.id === id; });
    return w ? w.name : "—";
  }

  function characterName(id) {
    var hit = state.summaries.items.find(function (item) { return item.id === id; });
    if (hit) return hit.name;
    for (var i = 0; i < state.worlds.length; i++) {
      var map = state.worlds[i].memberNames || {};
      if (map[id]) return map[id];
    }
    return id;
  }

  function topbar() {
    return '<header class="topbar"><div class="brand">' +
      '<div class="brand-kicker">FLOAT · NATIVE DATA</div>' +
      '<div class="brand-title">Target Archives</div></div></header>';
  }

  function tabs() {
    var defs = [["characters","角色"],["relations","关系"],["worlds","世界卷宗"]];
    return '<nav class="tabs" aria-label="Target Archives">' + defs.map(function (d) {
      return '<button class="tab ' + (state.tab === d[0] ? "active" : "") + '" data-action="tab" data-tab="' + d[0] + '">' + d[1] + '</button>';
    }).join("") + '</nav>';
  }

  function render() {
    var content = state.loading
      ? '<div class="state"><div><strong>正在读取原生档案</strong><div class="loading-line"></div></div></div>'
      : state.tab === "characters" ? renderCharacters()
      : state.tab === "relations" ? renderRelations()
      : renderWorlds();

    app.innerHTML = topbar() + tabs() +
      (state.error ? '<div class="error-banner">' + esc(state.error) + '<div class="spacer"></div><button class="button" data-action="reload">重试</button></div>' : '') +
      content;
  }

  function worldOptions(selected, includeAll) {
    var html = includeAll ? '<option value=""' + (!selected ? " selected" : "") + '>全部世界</option>' : "";
    state.worlds.forEach(function (w) {
      html += '<option value="' + attr(w.id) + '"' + (selected === w.id ? " selected" : "") + '>' + esc(w.name) + '</option>';
    });
    return html;
  }

  function renderCharacters() {
    if (state.detail) return renderDetail();
    var items = state.summaries.items || [];
    var list = items.length ? '<div class="archive-list">' + items.map(function (c) {
      var tags = (c.tags || []).slice(0,3).map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join("");
      if ((c.tags || []).length > 3) tags += '<span class="tag">+' + ((c.tags || []).length - 3) + '</span>';
      return '<article class="archive-row">' +
        avatarHtml(c.avatarPreview, c.name, "avatar") +
        '<div class="row-main" data-action="open-character" data-id="' + attr(c.id) + '">' +
          '<div class="row-name">' + esc(c.name) + '</div>' +
          '<div class="row-meta"><span>' + esc(worldName(c.worldId)) + '</span><span>' + esc(fmtDate(c.updatedAt)) + '</span><span>REL ' + Number(c.relationshipCount || 0) + '</span></div>' +
          '<div class="tags">' + tags + '</div>' +
        '</div>' +
        '<div class="row-actions"><button class="icon-button" data-action="open-character" data-id="' + attr(c.id) + '" aria-label="查看">查看</button></div>' +
      '</article>';
    }).join("") + '</div>' : '<div class="state"><div><strong>没有匹配档案</strong><span>调整搜索或世界筛选，或新建一个角色。</span></div></div>';

    var totalPages = state.summaries.totalPages || 0;
    return '<section class="toolbar">' +
      '<input class="field" id="char-search" value="' + attr(state.search) + '" placeholder="搜索姓名 / 标签">' +
      '<select class="select" id="char-world-filter">' + worldOptions(state.worldFilter, true) + '</select>' +
      '<button class="button primary wide" data-action="new-character">＋ 新建角色档案</button>' +
    '</section>' + list +
    '<div class="pagination">' +
      '<button class="button" data-action="prev-page"' + (state.page <= 1 ? " disabled" : "") + '>上一页</button>' +
      '<div class="page-meta">第 ' + state.page + ' 页 · 共 ' + state.summaries.total + ' 条' + (totalPages ? ' · ' + totalPages + ' 页' : '') + '</div>' +
      '<button class="button" data-action="next-page"' + (!totalPages || state.page >= totalPages ? " disabled" : "") + '>下一页</button>' +
    '</div>';
  }

  function detailWorldId(charId) {
    for (var i = 0; i < state.worlds.length; i++) {
      if ((state.worlds[i].memberIds || []).indexOf(charId) >= 0) return state.worlds[i].id;
    }
    return "";
  }

  function renderDetail() {
    var c = state.detail;
    if (state.detailMode === "edit" || state.detailMode === "create") return renderCharacterEditor(c);
    var wid = detailWorldId(c.id);
    var incident = 0;
    state.worlds.forEach(function (w) {
      (w.relations || []).forEach(function (r) {
        if (r.fromCharacterId === c.id || r.toCharacterId === c.id) incident += 1;
      });
    });
    return '<div class="detail-actions">' +
      '<button class="button" data-action="back-list">← 返回列表</button>' +
      '<button class="button primary" data-action="edit-character">编辑</button>' +
      '<button class="button danger" data-action="delete-character">删除</button>' +
    '</div>' +
    '<section class="panel">' +
      '<div class="section-title"><span>TARGET ARCHIVE</span><span>#' + esc(String(c.id).slice(-10)) + '</span></div>' +
      '<div class="detail-head">' +
        avatarHtml(c.avatar, c.name, "detail-avatar") +
        '<div><h2 class="detail-name">' + esc(c.name) + '</h2><span class="stamp">ACTIVE</span>' +
        '<dl class="kv">' +
          '<dt>WORLD</dt><dd>' + esc(worldName(wid)) + '</dd>' +
          '<dt>WECHAT</dt><dd>' + esc(c.wechatID || "—") + '</dd>' +
          '<dt>TIMEZONE</dt><dd>' + esc(c.timeZone || "SYSTEM") + '</dd>' +
          '<dt>UPDATED</dt><dd>' + esc(fmtDate(c.updatedAt)) + '</dd>' +
          '<dt>RELATIONS</dt><dd>' + incident + '</dd>' +
        '</dl></div>' +
      '</div>' +
      '<div class="tags">' + (c.tags || []).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join("") + '</div>' +
    '</section>' +
    '<section class="panel"><div class="section-title">PERSONA / TRAITS</div><div class="copy">' + esc(c.persona || "NO DATA AVAILABLE.") + '</div></section>' +
    '<section class="panel"><div class="section-title">PERSONALITY</div><div class="copy">' + esc(c.personality || "—") + '</div></section>' +
    '<section class="panel"><div class="section-title">BRIEF PERSONA</div><div class="copy">' + esc(c.briefPersona || "—") + '</div></section>';
  }

  function renderCharacterEditor(c) {
    var isCreate = state.detailMode === "create";
    c = c || { name:"", persona:"", personality:"", briefPersona:"", timeZone:"", tags:[], avatar:null };
    var preview = state.editAvatar !== undefined ? state.editAvatar : c.avatar;
    return '<div class="detail-actions"><button class="button" data-action="cancel-edit">← 取消</button></div>' +
    '<form id="character-form" class="panel form-grid">' +
      '<div class="section-title">' + (isCreate ? "NEW TARGET FILE" : "EDIT TARGET FILE") + '</div>' +
      '<div class="avatar-editor"><div>' + avatarHtml(preview, c.name, "detail-avatar") + '</div><div>' +
        '<label class="label">头像文件<input id="avatar-file" class="field" type="file" accept="image/*"></label>' +
        '<div class="card-actions"><button class="button" type="button" data-action="clear-avatar">清除头像</button></div>' +
      '</div></div>' +
      '<div class="form-grid two">' +
        '<label class="label">姓名<input class="field" name="name" required value="' + attr(c.name || "") + '"></label>' +
        '<label class="label">世界<select class="select" name="worldId">' + worldOptions(isCreate ? (state.worldFilter || "") : detailWorldId(c.id), false) + '</select></label>' +
      '</div>' +
      '<label class="label">标签（逗号分隔）<input class="field" name="tags" value="' + attr((c.tags || []).join(", ")) + '"></label>' +
      '<label class="label">时区<input class="field" name="timeZone" value="' + attr(c.timeZone || "") + '" placeholder="例如 America/New_York；留空=系统"></label>' +
      '<label class="label">Persona / Traits<textarea class="textarea" name="persona">' + esc(c.persona || "") + '</textarea></label>' +
      '<label class="label">Personality<textarea class="textarea" name="personality">' + esc(c.personality || "") + '</textarea></label>' +
      '<label class="label">Brief Persona<textarea class="textarea" name="briefPersona">' + esc(c.briefPersona || "") + '</textarea></label>' +
      '<div class="detail-actions">' +
        (isCreate ? '<button class="button primary" type="submit" data-save-mode="create">创建档案</button>' :
          '<button class="button primary" type="submit" data-save-mode="overwrite">保存覆盖</button><button class="button" type="submit" data-save-mode="backup">保存并备份旧卡</button>') +
      '</div>' +
    '</form>';
  }

  function renderRelations() {
    if (!state.worlds.length) return '<div class="state"><div><strong>没有世界卷宗</strong></div></div>';
    var wid = state.relationWorldId || state.worlds[0].id;
    var world = state.worlds.find(function(w){return w.id === wid;}) || state.worlds[0];
    var rels = world.relations || [];
    var names = {};
    (world.members || []).forEach(function (m) { names[m.id] = m.name; });
    var rows = rels.length ? rels.map(function(r){
      return '<div class="relation-row"><div><strong>' + esc(names[r.fromCharacterId] || r.fromCharacterId) +
        '</strong> <span class="relation-arrow">→</span> <strong>' + esc(names[r.toCharacterId] || r.toCharacterId) +
        '</strong></div><div class="muted">' + esc(r.label) + '</div>' +
        '<div class="card-actions"><button class="button" data-action="edit-relation" data-world="' + attr(world.id) + '" data-rel="' + attr(r.id) + '">编辑</button>' +
        '<button class="button danger" data-action="delete-relation" data-world="' + attr(world.id) + '" data-rel="' + attr(r.id) + '">删除</button></div></div>';
    }).join("") : '<div class="state"><div><strong>此世界暂无关系</strong><span>关系是有方向的：A → B 与 B → A 是两条不同记录。</span></div></div>';

    return '<section class="toolbar"><select class="select wide" id="relation-world">' + worldOptions(world.id, false) + '</select>' +
      '<button class="button primary wide" data-action="new-relation">＋ 新建关系</button></section>' + rows;
  }

  function renderWorlds() {
    if (!state.worlds.length) return '<div class="state"><div><strong>没有世界卷宗</strong><button class="button primary" data-action="new-world">建立第一份卷宗</button></div></div>';
    var cards = state.worlds.map(function(w) {
      var expanded = state.worldExpandedId === w.id;
      var members = (w.members || []).map(function(m) {
        return '<div class="member-row"><div><strong>' + esc(m.name) + '</strong><div class="muted">' + esc(m.id) + '</div></div>' +
          '<select class="select" data-action="move-member" data-character="' + attr(m.id) + '" data-current-world="' + attr(w.id) + '">' +
          worldOptions(w.id, false) + '</select></div>';
      }).join("");
      return '<article class="world-card">' +
        '<div class="world-title">' + esc(w.name) + (w.id === "world_default" ? ' <span class="tag">DEFAULT</span>' : '') + '</div>' +
        '<div class="world-desc">' + esc(w.description || "暂无卷宗描述。") + '</div>' +
        '<div class="world-stats"><span>MEMBERS ' + (w.memberIds || []).length + '</span><span>RELATIONS ' + (w.relations || []).length + '</span></div>' +
        '<div class="card-actions"><button class="button" data-action="toggle-world" data-id="' + attr(w.id) + '">' + (expanded ? "收起成员" : "成员") + '</button>' +
        '<button class="button" data-action="edit-world" data-id="' + attr(w.id) + '">编辑</button>' +
        (w.id !== "world_default" ? '<button class="button danger" data-action="delete-world" data-id="' + attr(w.id) + '">删除</button>' : '') +
        '</div>' + (expanded ? '<div class="spacer"></div>' + (members || '<div class="muted">暂无成员。</div>') : '') +
      '</article>';
    }).join("");
    return '<div class="detail-actions"><button class="button primary" data-action="new-world">＋ 新建世界卷宗</button></div>' + cards;
  }

  async function refreshWorlds() {
    var result = await api().characterWorlds.list({});
    state.worlds = Array.isArray(result && result.worlds) ? result.worlds : [];
    if (!state.relationWorldId && state.worlds[0]) state.relationWorldId = state.worlds[0].id;
    if (state.worldFilter && !state.worlds.some(function(w){ return w.id === state.worldFilter; })) state.worldFilter = "";
  }

  async function refreshSummaries() {
    var result = await api().characters.listSummaries({
      page: state.page,
      pageSize: PAGE_SIZE,
      search: state.search,
      worldId: state.worldFilter || undefined
    });
    state.summaries = result;
    state.page = result.page || 1;
  }

  async function refreshAll() {
    state.loading = true; setError(""); render();
    try {
      await refreshWorlds();
      await refreshSummaries();
    } catch (err) {
      setError(err);
    } finally {
      state.loading = false; render();
    }
  }

  async function openCharacter(id) {
    state.loading = true; setError(""); render();
    try {
      state.detail = await api().characters.get(id);
      if (!state.detail) throw new Error("角色档案不存在或已被删除。");
      state.detailMode = "view";
      state.editAvatar = undefined;
    } catch (err) {
      setError(err);
    } finally {
      state.loading = false; render();
    }
  }

  function tagsFrom(value) {
    var seen = {};
    return String(value || "").split(/[,，]/).map(function(v){ return v.trim(); }).filter(function(v){
      if (!v || seen[v]) return false; seen[v] = true; return true;
    });
  }

  function editorPayload(form) {
    var fd = new FormData(form);
    return {
      name: String(fd.get("name") || "").trim(),
      persona: String(fd.get("persona") || ""),
      personality: String(fd.get("personality") || "").trim() || null,
      briefPersona: String(fd.get("briefPersona") || "").trim() || null,
      timeZone: String(fd.get("timeZone") || "").trim() || null,
      tags: tagsFrom(fd.get("tags")),
      avatar: state.editAvatar !== undefined ? state.editAvatar : (state.detail && state.detail.avatar || null),
      worldId: String(fd.get("worldId") || "")
    };
  }

  async function submitCharacter(form, mode) {
    var value = editorPayload(form);
    if (!value.name) { toast("姓名不能为空"); return; }
    state.loading = true; setError(""); render();
    try {
      if (state.detailMode === "create") {
        var created = await api().characters.create({
          name: value.name, persona: value.persona, avatar: value.avatar,
          personality: value.personality, briefPersona: value.briefPersona,
          timeZone: value.timeZone, tags: value.tags, worldId: value.worldId || undefined
        });
        await refreshWorlds();
        await refreshSummaries();
        state.detail = created.character;
        state.detailMode = "view";
        toast("角色档案已创建");
      } else {
        var result = await api().characters.update({
          id: state.detail.id,
          versionMode: mode === "backup" ? "backup" : "overwrite",
          patch: {
            name: value.name, persona: value.persona, avatar: value.avatar,
            personality: value.personality, briefPersona: value.briefPersona,
            timeZone: value.timeZone, tags: value.tags
          }
        });
        if (value.worldId && value.worldId !== detailWorldId(state.detail.id)) {
          await api().characterWorlds.moveCharacter({ characterId: state.detail.id, toWorldId: value.worldId });
        }
        await refreshWorlds();
        await refreshSummaries();
        state.detail = result.character;
        state.detailMode = "view";
        toast(mode === "backup" ? "已保存并备份旧卡" : "已保存覆盖");
      }
      state.editAvatar = undefined;
    } catch (err) {
      setError(err);
    } finally {
      state.loading = false; render();
    }
  }

  function showModal(title, bodyHtml, onSubmit, submitLabel, danger) {
    modalRoot.innerHTML = '<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true">' +
      '<h3 class="modal-title">' + esc(title) + '</h3><form id="modal-form">' + bodyHtml +
      '<div class="modal-actions"><button class="button" type="button" data-action="close-modal">取消</button>' +
      '<button class="button ' + (danger ? "danger" : "primary") + '" type="submit">' + esc(submitLabel || "确认") + '</button></div></form></section></div>';
    var form = document.getElementById("modal-form");
    form.addEventListener("submit", async function(e) {
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await onSubmit(new FormData(form));
        closeModal();
      } catch (err) {
        button.disabled = false;
        var old = form.querySelector(".error-banner");
        if (old) old.remove();
        var box = document.createElement("div");
        box.className = "error-banner";
        box.textContent = err && err.message ? err.message : String(err);
        form.insertBefore(box, form.firstChild);
      }
    });
  }

  function closeModal() { modalRoot.innerHTML = ""; }

  function relationForm(world, relation) {
    var members = world.members || [];
    var opts = function(selected) {
      return members.map(function(m){ return '<option value="' + attr(m.id) + '"' + (selected === m.id ? " selected" : "") + '>' + esc(m.name) + '</option>'; }).join("");
    };
    showModal(relation ? "编辑关系" : "新建关系",
      '<div class="form-grid">' +
      '<label class="label">FROM<select class="select" name="from">' + opts(relation && relation.fromCharacterId) + '</select></label>' +
      '<label class="label">TO<select class="select" name="to">' + opts(relation && relation.toCharacterId) + '</select></label>' +
      '<label class="label">LABEL<input class="field" name="label" required value="' + attr(relation && relation.label || "") + '"></label></div>',
      async function(fd) {
        var payload = {
          worldId: world.id,
          fromCharacterId: String(fd.get("from") || ""),
          toCharacterId: String(fd.get("to") || ""),
          label: String(fd.get("label") || "").trim()
        };
        if (relation) {
          await api().characterWorlds.updateRelation({
            worldId: world.id, relationId: relation.id,
            patch: { fromCharacterId: payload.fromCharacterId, toCharacterId: payload.toCharacterId, label: payload.label }
          });
        } else {
          await api().characterWorlds.createRelation(payload);
        }
        await refreshWorlds(); render(); toast(relation ? "关系已更新" : "关系已创建");
      }, relation ? "保存" : "创建");
  }

  async function compressAvatar(file) {
    var LIMIT = 600 * 1024;
    var attempts = [
      [1280, .86], [1280, .8], [1024, .8], [1024, .72],
      [768, .72], [640, .68], [512, .64], [400, .6], [320, .56]
    ];
    var source = await fileToDataUrl(file);
    var img = await loadImage(source);
    var canvas = document.createElement("canvas");
    for (var i = 0; i < attempts.length; i++) {
      var maxSize = attempts[i][0], quality = attempts[i][1];
      var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("当前浏览器无法处理图片");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob.size <= LIMIT) return await blobToDataUrl(blob);
    }
    throw new Error("图片压缩后仍超过 600KB，请更换图片");
  }

  function fileToDataUrl(file) {
    return new Promise(function(resolve,reject){
      var r = new FileReader(); r.onload = function(){resolve(String(r.result||""));}; r.onerror = function(){reject(r.error||new Error("读取图片失败"));}; r.readAsDataURL(file);
    });
  }
  function blobToDataUrl(blob) {
    return new Promise(function(resolve,reject){
      var r = new FileReader(); r.onload = function(){resolve(String(r.result||""));}; r.onerror = function(){reject(r.error||new Error("读取压缩图片失败"));}; r.readAsDataURL(blob);
    });
  }
  function loadImage(src) {
    return new Promise(function(resolve,reject){
      var img = new Image(); img.onload=function(){resolve(img);}; img.onerror=function(){reject(new Error("无法解析图片"));}; img.src=src;
    });
  }
  function canvasBlob(canvas, mime, quality) {
    return new Promise(function(resolve,reject){
      canvas.toBlob(function(blob){ blob ? resolve(blob) : reject(new Error("图片编码失败")); }, mime, quality);
    });
  }

  app.addEventListener("input", function(e) {
    if (e.target && e.target.id === "char-search") {
      state.search = e.target.value;
      clearTimeout(app._searchTimer);
      app._searchTimer = setTimeout(async function(){ state.page=1; try{await refreshSummaries(); setError("");}catch(err){setError(err);} render(); }, 220);
    }
  });

  app.addEventListener("change", async function(e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "char-world-filter") {
      state.worldFilter = t.value; state.page = 1;
      try { await refreshSummaries(); setError(""); } catch(err){ setError(err); }
      render();
    } else if (t.id === "relation-world") {
      state.relationWorldId = t.value; render();
    } else if (t.id === "avatar-file" && t.files && t.files[0]) {
      try { state.editAvatar = await compressAvatar(t.files[0]); toast("头像已压缩，保存后写入原生角色档案"); render(); } catch(err){ toast(err.message || String(err)); }
    } else if (t.dataset.action === "move-member") {
      var toWorldId = t.value;
      if (toWorldId === t.dataset.currentWorld) return;
      try {
        await api().characterWorlds.moveCharacter({ characterId: t.dataset.character, toWorldId: toWorldId });
        await refreshWorlds(); await refreshSummaries(); render(); toast("角色已移动");
      } catch(err) { setError(err); render(); }
    }
  });

  app.addEventListener("submit", function(e) {
    if (e.target && e.target.id === "character-form") {
      e.preventDefault();
      var active = document.activeElement;
      var mode = active && active.getAttribute("data-save-mode") || (state.detailMode === "create" ? "create" : "overwrite");
      submitCharacter(e.target, mode);
    }
  });

  app.addEventListener("click", async function(e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.dataset.action;
    try {
      if (action === "tab") {
        state.tab = el.dataset.tab; state.detail = null; state.detailMode = "view"; setError(""); render();
      } else if (action === "reload") {
        await refreshAll();
      } else if (action === "open-character") {
        await openCharacter(el.dataset.id);
      } else if (action === "back-list") {
        state.detail = null; state.detailMode = "view"; state.editAvatar = undefined; render();
      } else if (action === "edit-character") {
        state.detailMode = "edit"; state.editAvatar = undefined; render();
      } else if (action === "new-character") {
        state.detail = null; state.detailMode = "create"; state.editAvatar = null; render();
      } else if (action === "cancel-edit") {
        state.detailMode = state.detail ? "view" : "view";
        if (!state.detail) { state.detail = null; }
        state.editAvatar = undefined; render();
      } else if (action === "clear-avatar") {
        state.editAvatar = null; render();
      } else if (action === "prev-page" && state.page > 1) {
        state.page -= 1; await refreshSummaries(); render();
      } else if (action === "next-page" && state.page < (state.summaries.totalPages || 0)) {
        state.page += 1; await refreshSummaries(); render();
      } else if (action === "delete-character") {
        var charId = state.detail.id;
        showModal("销毁角色档案",
          '<p>将删除角色档案、联系人及该角色单聊记录，并从群聊成员中移除；群聊与群聊历史保留。角色版本、世界成员引用和涉及该角色的关系记录也会清理。此操作无法恢复。</p>',
          async function() {
            await api().characters.delete({ id: charId });
            state.detail = null; state.detailMode = "view"; state.page = 1;
            await refreshWorlds(); await refreshSummaries(); render(); toast("角色档案已删除");
          }, "确认删除", true);
      } else if (action === "new-relation") {
        var rw = state.worlds.find(function(w){return w.id === (state.relationWorldId || state.worlds[0].id);});
        if ((rw.members || []).length < 2) { toast("当前世界至少需要两个角色"); return; }
        relationForm(rw, null);
      } else if (action === "edit-relation") {
        var ew = state.worlds.find(function(w){return w.id === el.dataset.world;});
        var rel = ew && (ew.relations || []).find(function(r){return r.id === el.dataset.rel;});
        if (!rel) throw new Error("关系记录不存在");
        relationForm(ew, rel);
      } else if (action === "delete-relation") {
        var dw = state.worlds.find(function(w){return w.id === el.dataset.world;});
        var dr = dw && (dw.relations || []).find(function(r){return r.id === el.dataset.rel;});
        showModal("删除关系", '<p>仅删除这条有方向的关系记录：<strong>' + esc(dr && dr.label || "") + '</strong>。</p>',
          async function(){ await api().characterWorlds.deleteRelation({worldId:el.dataset.world, relationId:el.dataset.rel}); await refreshWorlds(); render(); toast("关系已删除"); },
          "删除", true);
      } else if (action === "new-world") {
        showModal("新建世界卷宗",
          '<div class="form-grid"><label class="label">名称<input class="field" name="name" value="新的世界"></label><label class="label">描述<textarea class="textarea" name="description"></textarea></label></div>',
          async function(fd){ await api().characterWorlds.create({name:String(fd.get("name")||""), description:String(fd.get("description")||"")}); await refreshWorlds(); await refreshSummaries(); render(); toast("世界卷宗已创建"); },
          "创建");
      } else if (action === "edit-world") {
        var w = state.worlds.find(function(x){return x.id === el.dataset.id;});
        showModal("编辑世界卷宗",
          '<div class="form-grid"><label class="label">名称<input class="field" name="name" value="' + attr(w.name) + '"></label><label class="label">描述<textarea class="textarea" name="description">' + esc(w.description || "") + '</textarea></label></div>',
          async function(fd){ await api().characterWorlds.update({id:w.id, patch:{name:String(fd.get("name")||""),description:String(fd.get("description")||"")}}); await refreshWorlds(); await refreshSummaries(); render(); toast("世界卷宗已更新"); },
          "保存");
      } else if (action === "delete-world") {
        var delw = state.worlds.find(function(x){return x.id === el.dataset.id;});
        showModal("删除世界卷宗",
          '<p>卷宗「' + esc(delw.name) + '」会被删除；其中角色不会删除，而是并回默认世界。该卷宗中的关系记录随卷宗删除。</p>',
          async function(){ await api().characterWorlds.delete({id:delw.id}); await refreshWorlds(); await refreshSummaries(); render(); toast("世界卷宗已删除，角色已并回默认世界"); },
          "删除卷宗", true);
      } else if (action === "toggle-world") {
        state.worldExpandedId = state.worldExpandedId === el.dataset.id ? "" : el.dataset.id; render();
      }
    } catch (err) {
      setError(err); render();
    }
  });

  modalRoot.addEventListener("click", function(e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.dataset.action === "close-modal") closeModal();
    if (el.dataset.action === "modal-backdrop" && e.target === el) closeModal();
  });

  refreshAll();
})();
