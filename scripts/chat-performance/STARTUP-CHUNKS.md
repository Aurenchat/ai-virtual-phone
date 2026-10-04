# Stage 3B: bounded startup ChatDB reads

Baseline: `4324623a88eef5f929bf4b129798f06a330663da`. No schema change, data cleanup, new migration, lazy cache, plugin/CSS/world-dossier changes. Existing legacy migration/normalization behavior remains; this work does not initiate a new historical rewrite.

## Implementation and ordering

- `lib/chat-db.ts`: one readonly Dexie transaction for the complete messages snapshot; primary-key keyset reads of 256 records, `where(":id").above(lastKey).limit(256).toArray()`. The first batch uses `toCollection()`. No offset rescans, preloaded key array, deep copies, repeated concat, or partial return on error. Append existing object references. Empty string IDs and missing message `order` remain supported. Physical read order is the same primary-key order as the old table `toArray()`; existing session sorting/index semantics stay untouched.
- Installed Dexie **4.3.0**, inspected in `node_modules/dexie/dist/dexie.js`: plain ascending range plus limit takes bounded `getAll(range, limit)`, with `openCursor` fallback. Each awaited request completes in an IndexedDB event-loop task, giving other tasks an opportunity to run. No timer awaits or `Dexie.waitFor` keepalive inside the transaction; timers could prematurely end the snapshot. A timer is not necessary for IDB request-task yields, and the benchmark verifies heartbeat scheduling.
- The same readonly transaction prevents concurrent writes between chunks from producing a mixed snapshot. Writers can wait longer while a slow startup read is in progress. Read errors reject the complete result; the existing three-attempt initialization path remains. Lost migration flag + existing DB + failed read now rejects instead of falling through to an empty legacy snapshot.
- `components/main-app.tsx`: after existing KV readiness checks, await the shared ChatStorage hydration before theme read/decode. Desktop/AUX mounting follows the existing theme/splash flow, so initial AUX also cannot overlap the chat read. The added cancellation check prevents a discarded React effect from starting theme work.
- `lib/map-storage.ts`: defer the module-top-level auto-call to a microtask, await KV (so this auto-call cannot start chat normalization ahead of settings), then await shared ChatStorage hydration. Coalesce overlapping callers onto one Map promise. Existing Map read/catch/cache behavior is retained. Map and theme may overlap after Chat; KV/VN and other startup work are not globally serialized. This is the RPG Map storage, not world dossier.
- Stage 3A marker names/calls and both tiny diagnostic keys remain unchanged. No per-batch telemetry writes or progress count query were added. `CHAT_MESSAGES_DONE` occurs only after the complete read succeeds.

References: [Dexie Collection](https://dexie.org/docs/Collection/Collection), [primary-key queries](https://dexie.org/docs/Table/Table.where%28%29), [transaction lifetime](https://dexie.org/docs/Dexie/Dexie.transaction%28%29), [async transaction best practices](https://dexie.org/docs/Tutorial/Best-Practices).

## Measurement

Windows desktop Edge/Chromium 154.0.4258.48, headless, isolated browser profile/context/origin, actual Dexie + IndexedDB. Never reads real Float data. 200 sessions; messages inserted in reversed batches, every ninth message missing `order`. Short content is 120 ASCII bytes; long content is 2,048 / 10,240 ASCII bytes plus metadata. 100k short messages also tested.

Three runs per variant, alternating variant order; table cells are medians. Every run reloads the page and forces GC before measurement. This matters: repeatedly evaluating ChatStorage in the same page installs additional module-level listeners that retain obsolete test caches. An initial contaminated run was discarded and is not used here.

The actual unchanged ChatStorage normalizer/index/preview hydrate executes with synthetic settings/characters and mocked persistence helpers. `CHAT_MESSAGES_BEGIN -> DONE` uses real markers from the old/new ChatDB implementations. Hydrate time covers the synthetic core path, not complete Float boot or theme/Map decode. Small module evaluation cost is included. Full field/order equality is separately tested through 50k; every benchmark checks count and all ID positions. No real images are decoded.

| Messages/content | Message stage ms before -> after | Hydrate ms before -> after | Longest reported task ms before -> after | Max heartbeat gap ms before -> after | Heartbeat callbacks before -> after |
|---|---:|---:|---:|---:|---:|
| 50k / short | 219.9 -> 259.9 | 230.6 -> 270.7 | <50 -> <50 | 39.6 -> 10.7 | 37 -> 52 |
| 50k / 2 KiB | 457.6 -> 406.4 | 470.4 -> 419.9 | 69 -> <50 | 84.2 -> 15.6 | 77 -> 81 |
| 50k / 10 KiB | 1618.5 -> 2102.3 | 1639.9 -> 2117.6 | 209 -> <50 | 226.9 -> 21.3 | 253 -> 415 |
| 100k / short | 444.9 -> 527.4 | 467.6 -> 545.6 | 79 -> <50 | 81.3 -> 19.6 | 74 -> 103 |

Long Tasks reports only tasks >=50 ms. `<50` means no such task was observed, not zero CPU or an exact maximum. The 5 ms heartbeat measures scheduling gaps, not pure CPU time; its longest gap includes synchronous final hydrate work. Baseline reads also yield while waiting for IDB, so this is a reduction in large delivery/processing stalls, not a claim the whole baseline duration is one blocked task.

### Heap: no demonstrated peak reduction

| Messages/content | Sampled JS heap peak MiB before -> after | Retained JS heap after forced GC MiB before -> after |
|---|---:|---:|
| 50k / short | 20.83 -> 23.11 | 16.57 -> 16.51 |
| 50k / 2 KiB | 113.07 -> 113.25 | 108.57 -> 108.71 |
| 50k / 10 KiB | 503.29 -> 503.81 | 499.30 -> 499.38 |
| 100k / short | 37.67 -> 39.00 | 31.21 -> 31.18 |

Heap sampling uses Chromium precise `performance.memory` at 5 ms intervals and completion boundaries; retained heap uses CDP `Runtime.getHeapUsage` after GC. Sampled peaks are lower bounds: blocked intervals may hide spikes; native/IDB/IPC buffers, GPU memory and iPhone process memory are excluded. This does **not** establish lower peak heap. Array growth and temporary batches can increase sampled JS peak for short messages. The final complete message cache is intentionally retained, so steady heap is unchanged. No iPhone OOM threshold is inferred.

### Chunk-size calibration

Separate 50k x 10 KiB prototype calibration, also 3 runs with clean page/GC per run:

| Batch size | Read ms | Hydrate ms | Max heartbeat gap ms | Longest reported task ms |
|---:|---:|---:|---:|---:|
| original full read | 2055.3 | 2077.1 | 297.3 | 276 |
| 256 | 2584.5 | 2606.0 | 22.7 | <50 |
| 1024 | 2794.9 | 2816.1 | 24.6 | <50 |
| 4096 | 2198.3 | 2219.9 | 37.1 | <50 |

Selected 256 for shorter scheduling gaps and smaller per-request payload (about 2.5 MiB of 10 KiB content vs 40 MiB at 4096), accepting additional request overhead. This caps records, not bytes: one unusually large message can still be expensive. Calibration and final timings differ with machine/cache state; comparisons are within each run group, not across tables.

## Validation and reproduction

- `node scripts/test-chat-startup-chunks.cjs`: 31 checks. 0/1/9/256/257/4097/10k/50k; field/order equality; concurrent delete isolation; mid-read failure; exhausted initialization retry; lost migration flag failure; actual native cursor fallback equality and request abort; rawResponseText/media metadata/missing order; empty-string ID; invalid batch size.
- `node scripts/test-chat-startup-scheduling.cjs`: 14 checks. Executes actual Map module and extracted actual MainApp effect against deferred boundaries; tests early-module deferral, KV before Chat, Map single-flight, theme gating and cancellation.
- `node scripts/test-chat-storage-performance.cjs`: 1,355 checks, including order/index/preview, import/merge/reassign, push/edit/delete/delete-below/retry-below/retract, media/voice updates, replacements, legacy normalization, plugin messages.list/sessions.get/revision.
- `node scripts/test-message-bridge-performance.cjs`: 26 checks.
- Existing `scripts/test-chat-performance-browser.cjs`: 15 actual ChatRoom/browser checks, including initial 50/+30, media, edit/index and safe mode. For this run only, output destinations were redirected in memory to a temporary directory to preserve existing local evidence files.
- `node scripts/test-boot-diagnostics-integration.cjs`: 74 helper + 35 integration checks. Three intentionally modified startup files now compare marker calls with the telemetry baseline; unchanged startup files retain their structural guard.
- `node scripts/test-boot-diagnostics-browser.cjs`: 8 browser checks. Telemetry remains 25 normal writes, independent of message/chunk count.
- `npx tsc --noEmit --incremental false`; `git diff --check`; scoped diff review.

Benchmarks (Windows PowerShell; raw JSON stays in TEMP):

```powershell
node scripts/test-chat-startup-chunks.cjs --candidate --benchmark --calibrate --out=$env:TEMP/float-chat-chunk-calibration.json
node scripts/test-chat-startup-chunks.cjs --benchmark --out=$env:TEMP/float-chat-chunk-final.json
```

Tests use the same bundled Playwright/Edge location as existing repository browser tests and need git baseline `4324623` available. The runtime does not contain benchmark samplers, mock fixtures or timers.

## Release interpretation

The adoption criterion is met by reduced long-task/scheduling stalls with equivalent results, not by heap reduction or faster total boot. Chat read remains O(M) materialization and O(M) retained objects/references; auxiliary batch reference storage is O(256), queries O(ceil(M/256)) with primary-key seeks. Snapshot reads do not offset-rescan old records. Map/theme overlap with the chat read is removed by ordering, but its additional real-device peak-memory benefit has not been quantified.

This is a bounded-read/staggering trial for iPhone acceptance. It does not establish the sole cause of the earlier termination, guarantee cold-start success, or justify silently introducing session lazy loading. Verify the new build's previous/current boot stages on the phone. World dossier deferred.
