// Test-only entry. Real production modules, real browser IndexedDB, isolated origin.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CustomAppRunner } from '../../components/app-market/custom-app-runner';
import * as host from '../../lib/custom-app-host-api';
import * as kv from '../../lib/kv-db';
import * as settings from '../../lib/settings-storage';
import * as chars from '../../lib/character-storage';
import * as chat from '../../lib/chat-storage';
import * as engine from '../../lib/chat-engine';
import * as memory from '../../lib/memory-storage';
import * as apps from '../../lib/custom-app-storage';
import * as registration from '../../lib/custom-app-registration';
import * as hooks from '../../lib/chat-plugin-hooks';
import * as shortTerm from '../../lib/short-term-assembler';
import * as summarizer from '../../lib/memory-summarizer';
import * as worlds from '../../lib/character-world-storage';
import * as pluginLoader from '../../lib/chat-plugin-loader';
import * as pluginRuntime from '../../lib/chat-plugin-runtime';
import * as pluginStorage from '../../lib/chat-plugin-storage';
import { DEFAULT_MEMORY_CONFIG } from '../../lib/memory-types';
import * as scoped from '../../lib/custom-app-scoped-generation';
import * as policy from '../../lib/custom-app-protected-policy';
import * as sourceMemory from '../../lib/custom-app-source-memory';
import * as aiTasks from '../../lib/custom-app-ai-tasks';
import * as coreBuilder from '../../lib/core-memory-builder';
import * as provenance from '../../lib/memory-provenance';
import * as provider from '../../lib/llm-provider-adapter';
import * as transport from '../../lib/llm-http';
import * as nativeSocial from '../../lib/xiaohongshu-engine';
import {XiaohongshuApp} from '../../components/xiaohongshu/xiaohongshu-app';
import * as nativeStorage from '../../lib/xiaohongshu-storage';
import { DEFAULT_XIAOHONGSHU_SETTINGS } from '../../lib/xiaohongshu-types';

let root: ReturnType<typeof createRoot> | null = null;
const probe = {
  nativeSocial,nativeStorage, nativeSocialSettings: DEFAULT_XIAOHONGSHU_SETTINGS,
  scoped, policy, sourceMemory, aiTasks, coreBuilder, provenance, provider, transport,
  host, kv, settings, chars, chat, engine, memory, apps, registration, hooks, shortTerm, summarizer, worlds, pluginLoader, pluginRuntime, pluginStorage,
  DEFAULT_MEMORY_CONFIG,
  async ready() {
    await kv.hydrateKvDb();
    await settings.ensureSettingsStorageHydrated();
    await chat.hydrateChatStorage();
  },
  mount(app: any) {
    if (!root) root = createRoot(document.getElementById('app')!);
    root.render(<CustomAppRunner app={app} onClose={() => probe.close()} onNotice={console.log} />);
  },
  close() { root?.unmount(); root = null; },
  mountNative() { if(!root)root=createRoot(document.getElementById('app')!);root.render(<XiaohongshuApp onClose={()=>probe.close()} onNotice={console.log}/>); },
};
(window as any).phase0 = probe;
