import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { bootDiagnosticsScript } from "@/lib/boot-diagnostics";
import { crashDiagnosticsScript } from "@/lib/crash-diagnostics-bootstrap";

import { ChatPluginBootstrap } from "@/components/chat-plugin-bootstrap";
import { ChatReasoningVisibilityController } from "@/components/chat-reasoning-visibility-controller";
import { CSSImportEnhancer } from "@/components/css-import-enhancer";
import { PWAManifestInjector } from "@/components/pwa-manifest-injector";
import { PWARegistrar } from "@/components/pwa-registrar";
import "../styles/fonts.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "float",
  description: "float",
};

const pwaBuildId = process.env.NEXT_PUBLIC_PWA_BUILD_ID || "development";

function pwaRecoveryBootstrap(buildId: string): string {
  return `(() => {
    const BUILD_ID = ${JSON.stringify(buildId)};
    const KEY = "float:pwa-recovery:" + BUILD_ID;
    const QUERY = "__pwa_recover";
    let handling = false;
    const isNextStatic = (value) => {
      try { return new URL(value, location.href).pathname.startsWith("/_next/static/"); }
      catch { return false; }
    };
    const showManualRecovery = () => {
      const render = () => {
        if (document.getElementById("float-pwa-recovery")) return;
        const panel = document.createElement("div");
        panel.id = "float-pwa-recovery";
        panel.setAttribute("role", "alert");
        panel.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:28px;background:#f8f7f2;color:#171717;font:14px/1.6 system-ui,-apple-system,sans-serif;text-align:center";
        panel.innerHTML = '<div style="max-width:320px"><strong style="display:block;font-size:17px;margin-bottom:10px">资源更新尚未完成</strong><span>Float 已停止自动刷新，避免反复重载。网络恢复后请手动重试。</span><button type="button" style="display:block;margin:18px auto 0;padding:10px 24px;border:0;border-radius:18px;background:#171717;color:white;font:inherit">重新载入</button></div>';
        panel.querySelector("button").addEventListener("click", () => {
          try { sessionStorage.removeItem(KEY); } catch {}
          location.reload();
        });
        (document.body || document.documentElement).appendChild(panel);
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
      else render();
    };
    const recover = (failedUrl) => {
      if (handling) return;
      handling = true;
      try {
        if (sessionStorage.getItem(KEY) === "1" || new URL(location.href).searchParams.get(QUERY) === BUILD_ID) {
          showManualRecovery();
          return;
        }
        sessionStorage.setItem(KEY, "1");
      } catch {
        if (new URL(location.href).searchParams.get(QUERY) === BUILD_ID) { showManualRecovery(); return; }
      }
      const namespace = "float-pwa-build-" + BUILD_ID + "-";
      const clearCurrentBuild = typeof caches === "undefined" ? Promise.resolve() : caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith(namespace)).map(async (key) => {
          if (failedUrl && isNextStatic(failedUrl)) await (await caches.open(key)).delete(failedUrl);
        }))
      );
      const updateWorker = navigator.serviceWorker?.getRegistration?.().then((registration) => registration?.update()).catch(() => undefined);
      Promise.race([Promise.allSettled([clearCurrentBuild, updateWorker]), new Promise(resolve => setTimeout(resolve, 1500))]).finally(() => {
        const url = new URL(location.href);
        url.searchParams.set(QUERY, BUILD_ID);
        window.setTimeout(() => location.replace(url.href), 120);
      });
    };
    window.addEventListener("error", (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement && isNextStatic(target.src)) recover(target.src);
      else if (target instanceof HTMLLinkElement && target.rel === "stylesheet" && isNextStatic(target.href)) recover(target.href);
      else {
        const error = event.error;
        const text = String(error?.name || "") + " " + String(error?.message || event.message || "");
        if (/ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module/i.test(text)) recover();
      }
    }, true);
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const text = String(reason?.name || "") + " " + String(reason?.message || reason || "");
      if (/ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module/i.test(text)) recover();
    });
  })();`;
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="float-build-id" content={pwaBuildId} />
        <script id="float-boot-diagnostics" dangerouslySetInnerHTML={{ __html: bootDiagnosticsScript(pwaBuildId) }} />
        <script id="float-crash-diagnostics" dangerouslySetInnerHTML={{ __html: crashDiagnosticsScript(pwaBuildId) }} />
        <script id="float-pwa-bootstrap" dangerouslySetInnerHTML={{ __html: pwaRecoveryBootstrap(pwaBuildId) }} />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content="#f8f7f2" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="float" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <PWAManifestInjector />
        <PWARegistrar />
        <CSSImportEnhancer />
        <ChatPluginBootstrap />
        <ChatReasoningVisibilityController />
        {children}
      </body>
    </html>
  );
}
