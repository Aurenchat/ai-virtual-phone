(() => {
const BUILD_ID = "__FLOAT_BUILD_ID__";
// Old registrations still update /sw.js. Import the generated, versioned body
// there instead of activating a worker with a placeholder namespace.
if (BUILD_ID === "__FLOAT_" + "BUILD_ID__") {
  importScripts("/sw-versioned.js");
  return;
}
const BUILD_CACHE_PREFIX = "float-pwa-build-";
const BUILD_CACHE_BASE = `${BUILD_CACHE_PREFIX}${BUILD_ID}`;
const SHELL_CACHE = `${BUILD_CACHE_BASE}-shell`;
const ASSET_CACHE = `${BUILD_CACHE_BASE}-assets`;
const SHARED_CACHE = "float-pwa-shared-v1";
const BUILD_META_URL = "/__float_pwa_build_meta__";
const currentBuildClients = new Set();
let preparePromise = null;

function normalizedBuildAsset(raw) {
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/_next/static/")) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function htmlBuildId(html) {
  const tag = html.match(/<meta\b[^>]*\bname=["']float-build-id["'][^>]*>/i)?.[0] || "";
  return tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] || null;
}

function htmlBuildAssets(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/gi;
  for (const match of html.matchAll(attributePattern)) {
    const asset = normalizedBuildAsset(match[1]);
    if (asset) assets.add(asset);
  }
  return [...assets];
}

async function readBuildMeta() {
  const response = await (await caches.open(SHELL_CACHE)).match(BUILD_META_URL);
  if (!response) return null;
  try {
    const meta = await response.json();
    return meta?.buildId === BUILD_ID ? meta : null;
  } catch {
    return null;
  }
}

async function stageBuild(clientAssets = []) {
  const requestedAssets = [...new Set(clientAssets.map(normalizedBuildAsset).filter(Boolean))];
  const existing = await readBuildMeta();
  if (existing) {
    const assetCache = await caches.open(ASSET_CACHE);
    const missing = [];
    for (const asset of requestedAssets) {
      if (!(await assetCache.match(asset))) missing.push(asset);
    }
    for (const asset of existing.assets || []) {
      if (!(await assetCache.match(asset))) missing.push(asset);
    }
    if (missing.length === 0 && await (await caches.open(SHELL_CACHE)).match("/")) return existing;
  }
  if (preparePromise) return preparePromise;

  preparePromise = (async () => {
    const rootResponse = await fetch(new Request(new URL("/", self.location.origin).href, { cache: "reload", credentials: "same-origin" }));
    if (!rootResponse.ok) throw new Error(`PWA root returned ${rootResponse.status}`);
    const rootHtml = await rootResponse.clone().text();
    const discoveredBuildId = htmlBuildId(rootHtml);
    if (discoveredBuildId !== BUILD_ID) {
      throw new Error(`PWA root build mismatch: expected ${BUILD_ID}, received ${discoveredBuildId || "missing"}`);
    }

    const priorAssets = Array.isArray(existing?.assets) ? existing.assets : [];
    const assets = [...new Set([...htmlBuildAssets(rootHtml), ...priorAssets, ...requestedAssets])];
    const shellCache = await caches.open(SHELL_CACHE);
    const assetCache = await caches.open(ASSET_CACHE);
    // Bound startup memory: stream at most four responses into CacheStorage,
    // rather than retaining/cloning every large app chunk before writing any.
    for (let offset = 0; offset < assets.length; offset += 4) {
      await Promise.all(assets.slice(offset, offset + 4).map(async (asset) => {
        const response = await fetch(new Request(new URL(asset, self.location.origin).href, { cache: "reload", credentials: "same-origin" }));
        if (!response.ok || (response.headers.get("Content-Type") || "").includes("text/html")) {
          throw new Error(`PWA invalid asset response ${response.status}: ${asset}`);
        }
        await assetCache.put(asset, response);
      }));
    }
    await shellCache.put("/", rootResponse);
    const meta = {
      buildId: BUILD_ID,
      stagedAt: existing?.stagedAt || Date.now(),
      assets,
    };
    await shellCache.put(BUILD_META_URL, new Response(JSON.stringify(meta), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }));
    return meta;
  })().catch(async (error) => {
    throw error;
  }).finally(() => {
    preparePromise = null;
  });

  return preparePromise;
}

function cacheGroup(name) {
  const buildMatch = name.match(/^(float-pwa-build-.+)-(?:shell|pages|assets)$/);
  if (buildMatch) return buildMatch[1];
  const legacyMatch = name.match(/^(ai-phone-pwa-v\d+)-(?:static|runtime)$/);
  return legacyMatch ? legacyMatch[1] : null;
}

async function groupTimestamp(base, names) {
  const shellName = names.find((name) => name === `${base}-shell`);
  if (!shellName) return 0;
  try {
    const response = await (await caches.open(shellName)).match(BUILD_META_URL);
    const meta = response ? await response.json() : null;
    return Number(meta?.stagedAt) || 0;
  } catch {
    return 0;
  }
}

async function cleanupOldBuildCaches() {
  // Suspended, legacy or unknown clients block collection.
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const replies = await Promise.all(windows.map(client => new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 1500);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.buildId === BUILD_ID && event.data?.ready === true);
    };
    client.postMessage({ type: "PWA_QUERY_CLIENT" }, [channel.port2]);
  })));
  if (replies.some(ready => !ready)) return false;
  const latest = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (latest.some(client => !windows.some(known => known.id === client.id))) return false;
  const cacheNames = await caches.keys();
  const groups = new Map();
  for (const name of cacheNames) {
    const base = cacheGroup(name);
    if (!base) continue;
    const entries = groups.get(base) || [];
    entries.push(name);
    groups.set(base, entries);
  }

  const previous = [];
  for (const [base, names] of groups) {
    if (base === BUILD_CACHE_BASE) continue;
    previous.push({ base, names, stagedAt: await groupTimestamp(base, names) });
  }
  previous.sort((a, b) => b.stagedAt - a.stagedAt);
  const keepPrevious = previous[0]?.base || null;
  await Promise.all(previous
    .filter((group) => group.base !== keepPrevious)
    .flatMap((group) => group.names.map((name) => caches.delete(name))));
  return true;
}

self.addEventListener("install", (event) => {
  // A new worker cannot naturally activate without a complete, verified shell.
  // No old cache is removed even if staging fails.
  event.waitUntil(stageBuild());
});

// No claim or eviction on activate. Update only when all clients are ready,
// or naturally after the old worker no longer has clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const reply = (payload) => event.ports?.[0]?.postMessage(payload);
  if (data.type === "PWA_VERSION") {
    reply({ ok: true, buildId: BUILD_ID });
    return;
  }
  if (data.buildId !== BUILD_ID || data.type !== "PWA_CLIENT_READY") return;
  if (event.source?.id) currentBuildClients.add(event.source.id);
  event.waitUntil(stageBuild(Array.isArray(data.assets) ? data.assets : [])
    .then(cleanupOldBuildCaches)
    .then(async (allClientsReady) => {
      if (allClientsReady) await self.skipWaiting();
      reply({ ok: true, buildId: BUILD_ID });
    })
    .catch((error) => reply({ ok: false, error: String(error?.message || error) })));
});

function isCacheableRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return ["font", "image", "script", "style", "worker"].includes(request.destination);
}

async function responseBuildId(response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return null;
  try {
    return htmlBuildId(await response.clone().text());
  } catch {
    return null;
  }
}

async function networkFirstNavigation(event) {
  const request = event.request;
  const shellCache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (!response.ok) {
      const cached = await shellCache.match("/");
      return cached || response;
    }
    const responseId = await responseBuildId(response);
    if (responseId === BUILD_ID) {
      // Navigation HTML is not an offline snapshot until stageBuild verifies
      // every referenced boot asset. Only the verified shell is an offline fallback.
      if (event.resultingClientId) currentBuildClients.add(event.resultingClientId);
    } else if (responseId) {
      // A newer build must be allowed to boot from one coherent network response,
      // but is never written into this worker's cache namespace.
      if (event.clientId) currentBuildClients.delete(event.clientId);
    }
    return response;
  } catch (error) {
    const cached = await shellCache.match("/");
    if (cached) return cached;
    throw error;
  }
}

async function buildAssetFirst(event) {
  const request = event.request;
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && currentBuildClients.has(event.clientId)) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function sharedAssetFirst(request) {
  const cache = await caches.open(SHARED_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
// 离线推送：App 被杀后由系统唤起 SW 弹通知。payload 由服务端 JSON 编码。
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const declarative = data.web_push === 8030 && data.notification && typeof data.notification === "object"
    ? data.notification
    : null;
  const notificationData = declarative && declarative.data && typeof declarative.data === "object"
    ? declarative.data
    : data;
  const title = (declarative && declarative.title) || data.title || "小手机";
  event.waitUntil((async () => {
    if (notificationData.type === "chat_outbox") {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = windows.filter((client) => client.visibilityState === "visible");
      if (visible.length > 0) {
        visible.forEach((client) => client.postMessage({ type: "push_outbox_ready" }));
        return;
      }
    }
    // 来电推送：页面可见时直接进页面振铃（来电横幅），不弹系统通知
    if (notificationData.type === "incoming_call") {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = windows.filter((client) => client.visibilityState === "visible");
      if (visible.length > 0) {
        visible.forEach((client) => client.postMessage({
          type: "incoming_call_push",
          sessionId: notificationData.sessionId || "",
          callTs: notificationData.callTs || 0,
        }));
        visible.forEach((client) => client.postMessage({ type: "push_outbox_ready" }));
        return;
      }
    }
    await self.registration.showNotification(title, {
      body: (declarative && declarative.body) || data.body || "",
      icon: (declarative && declarative.icon) || data.icon || "/icon-192.png",
      badge: (declarative && declarative.badge) || "/icon-192.png",
      tag: (declarative && declarative.tag) || data.tag || `push-${Date.now()}`,
      data: {
        url: (declarative && declarative.navigate) || notificationData.url || "/",
        type: notificationData.type || "",
        commandId: notificationData.commandId || "",
        sessionId: notificationData.sessionId || "",
        callTs: notificationData.callTs || 0,
      },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || "/";
  if (notificationData.type === "shortcut_command") {
    // iOS silently ignores custom URL schemes passed to clients.openWindow().
    event.waitUntil((async () => {
      const absoluteUrl = new URL(targetUrl, self.location.origin).href;
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 有活窗口：不导航（navigate 会杀掉 SPA，回来一片空白、进行中的生成全断）。
      // 交给页面自己 location 到 /shortcut-run——302 到 shortcuts:// 属于外部 App
      // 启动，WebKit 不会卸载当前页面，聊天界面与本地生成原地保留。
      for (const client of windows) {
        if ("focus" in client) {
          client.postMessage({ type: "run_shortcut", url: absoluteUrl });
          return client.focus();
        }
      }
      // App 已被杀：没有页面可保，开新窗口走 /shortcut-run 跳转
      return self.clients.openWindow(absoluteUrl);
    })());
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if (notificationData.type === "chat_outbox") {
            client.postMessage({ type: "push_outbox_ready" });
          }
          if (notificationData.type === "incoming_call") {
            // 有活窗口：不导航（会杀掉 SPA），交给页面弹来电横幅 + 合并 outbox
            client.postMessage({
              type: "incoming_call_push",
              sessionId: notificationData.sessionId || "",
              callTs: notificationData.callTs || 0,
            });
            client.postMessage({ type: "push_outbox_ready" });
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  if (!isCacheableRequest(request)) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/static/") || ["script", "style", "worker"].includes(request.destination)) {
    event.respondWith(buildAssetFirst(event));
    return;
  }
  event.respondWith(sharedAssetFirst(request));
});

})();
