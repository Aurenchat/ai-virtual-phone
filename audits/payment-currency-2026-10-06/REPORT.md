# Multi-currency payments and Cash cards

Base: `bf63af5e1ce3f44e1f9507f3ce7836f3c02f298f` (Phase 1). No wallet schema migration or ledger redesign.

## Currency and settlement

- Central registry: CNY/USD/EUR have 2 minor digits; JPY/KRW have 0. Explicit symbols plus ISO codes in picker/details distinguish CNY and JPY. Missing legacy currency is CNY; unknown or ambiguous codes are rejected.
- Additive ledger fields: `currency`, `originalMinor`, `fxQuote`; claim `originalMinor`; operation `settlement` (`currency`, `originalMinor`, `rateToCny`, `settledCnyFen`, `settledAt`, `rateDate`). Existing `totalFen`, claim `fen`, and operation deltas remain CNY fen.
- Additive message projection: `currency`, `paymentFxQuote`, `paymentSettlement`; existing `amount` and `claimedAmounts` retain original-currency display units. The wallet ledger remains the monetary truth.
- Frankfurter v2 public reference-rate API: `https://api.frankfurter.dev/v2/rate/{currency}/CNY`. No key; sends only currency pair. Live USD/EUR/JPY/KRW endpoints returned HTTP 200 and CORS `*` on 2026-10-06. Provider publishes daily reference rates, not executable bank quotes.
- 5-minute bounded in-memory cache (four foreign pairs), coalesced in-flight calls, 8-second timeout including JSON response. CNY never requests FX. Invalid pairs, nonpositive/malformed rates, network errors and rates dated more than 10 days ago fail closed (date allowance accommodates provider holidays).
- User send locks quote at the existing debit transaction. Incoming transfer locks at collection. Outgoing packets lock at send; incoming character packets lock once at the first successful allocation, including a character allocation. All later claims reuse that package quote. Character-to-character transfers create no wallet or monetary effect.
- Exact decimal rational conversion uses BigInt, half-up to CNY fen. Packet allocation reuses Phase 1's integer algorithm in original-currency minor units. Cumulative rounding assigns CNY fractions across claims so their fen sum equals the package rounded total.
- Refund uses the original committed send delta, never a new FX quote. Existing operation keys, atomic AiPhoneKvDB mutation, illegal-state checks, legacy receipt policy and ChatDB projection recovery are unchanged. Backup/restore already saves the whole wallet with additive ledger fields; round-trip tested.
- Completed operations replay before FX validation and never move money again. Frozen history does not request current rates. Legacy terminal CNY records are not replayed; no history migration.

## User and AI paths

- Existing send modal adds one currency select, optional last-choice preference, and CNY preview before confirmation. Single/group transfer and packet callbacks retain the existing draft and publish path.
- Optional AI directive prefix: `[转账:USD:100:备注]`, `[红包:JPY:20000:4:备注]`, and group sender/recipient suffixes. Existing amount-first directives remain CNY. Built-in prompt guidance and history serialization preserve currency. User-created/custom presets are not rewritten.
- FX pending/error disables actions that need conversion; returning remains available subject to the existing transaction rules. Retry requests a new quote after failures. No 1:1 fallback.

## UI

- Payment-only dark #222225 cards, text `Cash`, neutral status, returned strike-through, fixed `min(286px,68vw)` width and 176px height. At 402px viewport both directions measured 273.359px wide.
- Transfer primary text is original-currency amount; packet primary text is note, with no collapsed amount. Long notes clamp to two lines. iMessage's existing grouping marker decides which card gets a directional tail; theme CSS and Message Bridge are unchanged.
- Existing detail overlay/click flow retained. Dark details show original amount/code, preview or frozen CNY settlement, note, source/target/status, and simple right-aligned group claim rows. Completed/returned views have no payment actions. No green success styling.

## Files

Production (18):

- `app/globals.css` — imports payment-only stylesheet.
- `styles/cash-payment.css` — payment cards/details only.
- `components/chat/cash-payment-card.tsx` — collapsed card and payment-only directional surface.
- `components/chat/payment-fx-preview.tsx` — quote lifecycle, preview/frozen/error line.
- `components/chat/message-bubble.tsx` — payment rendering and existing detail callbacks.
- `components/chat/rich-input-modals.tsx` — currency select and send preview.
- `components/chat/chat-room.tsx` — existing send callbacks and currency-aware claim notifications.
- `lib/payment-currency.ts` — registry/normalization/formatting/exact FX arithmetic.
- `lib/payment-fx.ts` — narrow public FX service.
- `lib/payment-directive.ts` — currency-preserving history directives.
- `lib/payment-money.ts` — parameterized existing integer boundary; CNY wrapper retained.
- `lib/payment-ledger.ts` — additive original units, package quote and settlement metadata.
- `lib/payment-chat.ts` — obtain quote before transaction, project frozen result.
- `lib/chat-storage.ts` — additive TypeScript media fields; no database schema change.
- `lib/rich-message-parser.ts` — optional currency prefix and minor-unit validation.
- `lib/builtin-preset.ts` — currency directive guidance.
- `lib/llm-prompt-assembler.ts`, `lib/short-term-assembler.ts` — preserve currency in payment history.

Tests/report: `scripts/payment-currency/fixture.ts`, `scripts/test-payment-currency.mjs`, this report, `results.json`.

## Verification

- Multi-currency + real ChatRoom/real React modal suite: **40 checks passed**, zero uncaught browser errors. Covers 5 codes, aliases, legacy, exact conversion, provider failure/timeout/malformed/cache/retry, parallel credit/debit/refund, packet sums, group recipient, role-to-role, wallet-success/message-failure reconcile, backup/reload, real send modal, details, grouping tails and 8 single/group/plain/wallpaper card combinations.
- Phase 1 suite: **25 checks passed**, including 10,000 randomized packets (505,622 shares in final run), cross-tab concurrency, rollback injection and backup/restore.
- Shopping share purchase: **15 passed**; shopping product share: passed.
- Existing iMessage chat polish: **12 passed**; online/offline scale: **12 passed**. These assert existing fixture behavior; they do not claim unresolved iPhone image-fringe issues are fixed.
- Independent TypeScript `npx tsc --noEmit --incremental false`: passed. Next build skips type checking, so this ran separately.
- Full `npm run build`: passed in isolated managed worktree. All 18 production file hashes matched the main workspace after build. Build-generated unrelated files were not copied back.
- `git diff --check`: passed. Final staged scope/check required before commit.
- Three accepted baseline-known iMessage preview failures (cross-session grouping, group sender boundary, group avatar/name assertions) remain untouched; no attempt to repair that old preview fixture.

Screenshots/results captured under `%TEMP%/float-payment-currency-VzGSVW`; only JSON results are versioned. Screenshots include completed transfer details, failed FX packet details and all 8 card combinations; detail captures await the existing overlay animation.

## Limits and release scope

- Browser verification used isolated Chromium/Edge mobile viewport and real IndexedDB/ChatRoom, not a user's archive or iPhone WebKit. iPhone visual/network acceptance remains outstanding.
- The requested Apple private-use text glyph may show a missing glyph on Windows; no logo image/font was introduced. Check its iPhone rendering.
- Live FX availability from the user's network is not guaranteed. Failure is visible and cannot silently settle. Reference rate date is preserved; this is not a trading-rate guarantee.
- Do not run pre-currency builds against newly created foreign payment data: old code assumes CNY. A rollback needs a matching complete pre-feature wallet/chat backup or a forward compatibility fix; do not erase frozen metadata/ledger.
- No changes to Phase 1 atomic wallet architecture, schema, cold start, PWA, theme core, Bridge, reaction, long press, toolbar, non-payment media or unrelated plugins. Existing dirty Weixin generated files and other untracked work remain excluded. Git push does not establish production deployment or iPhone acceptance.
