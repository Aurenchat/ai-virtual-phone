# Native Chat Prune + FastPath v0.2

Native session-list entry: **+ → 裁剪历史**. Choose a session and retain 50/100/200/500/1000/custom real message records. Preview and a second confirmation are required. Pruning does not open the target room or clean media caches.

The implementation reuses native deletion, validates the exact session/history, waits for the local IndexedDB transaction, and checks persisted survivors. Existing-row metadata updates cannot recreate missing messages. Native insert boundaries preserve genuinely new messages and reject previously pruned IDs. ChatDB restore and pruning coordinate through a narrow Web Lock. WebCrypto is required for the bounded-history fingerprint; missing capabilities fail closed.

## Synthetic tests

Run from the repository root with Node supporting TypeScript stripping. Browser tests require Playwright and a Chromium executable. They create an isolated persistent profile under `deliveries/native-chat-prune/` and use a random localhost origin; never point them at a real user profile.

- `node --experimental-strip-types --test scripts/native-chat-prune/prune-validation.test.mjs` — 9 fingerprint/checker tests.
- `node scripts/native-chat-prune/test.mjs` — 20 native cases, including 20,000 persisted messages, batching and full-process cold restart; also retains a raw-put probe.
- `node scripts/native-chat-prune/native-writes.mjs` — 20 native asynchronous-write and isolation cases.
- `node scripts/native-chat-prune/race.mjs` — 12 native cases and 2 non-cooperating raw-put probes.
- `node scripts/native-chat-prune/fastpath.mjs` — 4 targeted cases, including 20,000 rich records, forbidden whole-history stringify/toArray, and full-process cold restart.
- `node scripts/test-shopping-share-purchase.mjs` — 15 existing shopping regressions.

Optional environment settings:

- `PLAYWRIGHT_PACKAGE`: package name or absolute module path (defaults to `playwright`).
- `CHROME_EXECUTABLE`: Chromium/Chrome executable; otherwise use Playwright's installed Chromium.
- `NATIVE_PRUNE_OUTPUT`: output directory for that script's evidence; use a distinct directory per suite.
- `RACE_STAGE`: labels the default race evidence directory.

Cloud transport and wallet execution are explicitly stubbed. Storage operations use real browser IndexedDB. No test runs production cloud deletions or accesses real archives.

## Retained known failures and limits

The two independent-connection `outside.messages.put(old)` probes remain FAIL: expected disk/cache 50/50, observed 51/50. They deliberately bypass every native write boundary. The during-transaction probe may still return `deleted: 70`; a finite readback is not a fence against all external writes. Do not remove these assertions, count them as PASS, or interpret the native tests as protection against arbitrary third-party IDB writes. Consequently test.mjs/race.mjs intentionally exit nonzero when these probes reproduce, even when all native cases pass. Read the saved per-case results.

Cloud-first deletion and local commit are not a distributed atomic transaction. A cloud partial failure or local abort may require manual inspection; neither implies both sides rolled back. The runtime-sync warning after local commit remains explicit.

Pruned-ID metadata grows with deleted history. Normal hydration still retains the complete history. FastPath bounds the additional verification copies, not all application memory. Chromium results do not establish iOS/WKWebView memory or lifecycle behavior.

Release authorization does not execute or authorize an unattended first deletion. Users must choose the target, inspect counts, and confirm in the client. This feature has no automatic pruning trigger.
