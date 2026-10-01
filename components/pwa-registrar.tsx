"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_PWA_BUILD_ID || "development";
const RECOVERY_QUERY = "__pwa_recover";
const WORKER_REPLY_TIMEOUT_MS = 90_000;
const APP_READY_TIMEOUT_MS = 90_000;

function collectCurrentBuildAssets(): string[] {
  const urls = [
    ...Array.from(document.scripts, (script) => script.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (link) => link.href),
  ];
  const assets = new Set<string>();
  for (const raw of urls) {
    if (!raw) continue;
    try {
      const url = new URL(raw, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith("/_next/static/")) {
        assets.add(`${url.pathname}${url.search}`);
      }
    } catch {
      // Ignore malformed third-party URLs; they are outside this build handoff.
    }
  }
  return [...assets];
}

function isApplicationReady(): boolean {
  const enter = document.querySelector<HTMLButtonElement>('button[aria-label="Enter"]');
  if (enter && !enter.disabled) return true;
  return Boolean(document.querySelector(".phone-shell-wrap:not(.splash-shell-wrap)"));
}

async function waitForApplicationReady(cancelled: () => boolean): Promise<boolean> {
  const started = Date.now();
  while (!cancelled() && Date.now() - started < APP_READY_TIMEOUT_MS) {
    if (isApplicationReady()) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return false;
}

function postWorkerMessage(worker: ServiceWorker, payload: Record<string, unknown>): Promise<{ buildId?: string }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("PWA worker preparation timed out"));
    }, WORKER_REPLY_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean; error?: string; buildId?: string }>) => {
      window.clearTimeout(timer);
      channel.port1.close();
      if (event.data?.ok) resolve(event.data);
      else reject(new Error(event.data?.error || "PWA worker preparation failed"));
    };
    worker.postMessage(payload, [channel.port2]);
  });
}

async function waitForInstalledWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorker | null> {
  if (registration.waiting) return registration.waiting;
  const installing = registration.installing;
  if (!installing) return null;
  if (["installed", "activating", "activated"].includes(installing.state)) return registration.waiting || installing;
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (["installed", "activating", "activated"].includes(installing.state)) {
        installing.removeEventListener("statechange", onStateChange);
        resolve(registration.waiting || installing);
      } else if (installing.state === "redundant") {
        installing.removeEventListener("statechange", onStateChange);
        resolve(null);
      }
    };
    installing.addEventListener("statechange", onStateChange);
  });
}

function clearSuccessfulRecoveryQuery() {
  try {
    // Keep the one-attempt guard for this build for the whole tab session.
    const url = new URL(window.location.href);
    if (url.searchParams.get(RECOVERY_QUERY) === BUILD_ID) {
      url.searchParams.delete(RECOVERY_QUERY);
      history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // Storage/history failures must not block the app.
  }
}

async function prepareRegistration(registration: ServiceWorkerRegistration) {
  const worker = await waitForInstalledWorker(registration) || registration.active;
  if (!worker) return;
  const version = await postWorkerMessage(worker, { type: "PWA_VERSION" });
  if (version.buildId !== BUILD_ID) return;
  await postWorkerMessage(worker, {
    type: "PWA_CLIENT_READY",
    buildId: BUILD_ID,
    assets: collectCurrentBuildAssets(),
  });
}

export function PWARegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let appReady = false;
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "PWA_QUERY_CLIENT") {
        event.ports[0]?.postMessage({ buildId: BUILD_ID, ready: appReady && !cancelled });
      }
    };
    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    const isCancelled = () => cancelled;
    const register = async () => {
      if (cancelled) return;
      try {
        const registration = await navigator.serviceWorker.register(
          "/sw-versioned.js",
          { scope: "/", updateViaCache: "none" },
        );
        const ready = await waitForApplicationReady(isCancelled);
        if (!ready || cancelled) return;
        appReady = true;
        await prepareRegistration(registration);
        if (!cancelled) {
          clearSuccessfulRecoveryQuery();
          document.documentElement.dataset.pwaBuildId = BUILD_ID;
          window.dispatchEvent(new CustomEvent("float:pwa-ready", { detail: { buildId: BUILD_ID } }));
        }
      } catch (error) {
        console.warn("[PWA] Service worker registration/preparation failed:", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
    };
  }, []);

  return null;
}
