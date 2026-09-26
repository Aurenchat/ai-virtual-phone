# Auditable source provenance

Canonical repository: https://github.com/xiaolongbao0709/ai-virtual-phone

Pinned revision: `6cec66372457d3f8199f0d1a49d9fba94544e084`.

All fetched files are unmodified under `upstream/<path>.source`, with SHA256 in `upstream/provenance.json`. The suffix keeps snapshots out of the Host TypeScript program. `source-map.json` maps every copied file and lists intentional changes. `SOURCE-DIFF.patch` is generated directly between the snapshots and fork files.

| Upstream | Fork | Copy/adaptation |
|---|---|---|
| `components/xiaohongshu/xiaohongshu-app.tsx` | `src/fork/components/xiaohongshu/xiaohongshu-app.tsx` | Complete file: all pages, full settings, handlers and helpers |
| `lib/xiaohongshu-engine.ts` | `src/fork/lib/xiaohongshu-engine.ts` | Complete file: all nine generators, block parsers, reducers and vision fallback |
| `lib/xiaohongshu-types.ts` | `src/fork/lib/xiaohongshu-types.ts` | Unchanged complete schema/defaults |
| `lib/xiaohongshu-storage.ts` | `src/fork/lib/xiaohongshu-storage.ts` | Complete normalizers/factories; scoped KV adapter |
| `lib/xiaohongshu-memory.ts` | `src/fork/lib/xiaohongshu-memory.ts` | Complete event builders/deletion; source-aware projection |
| `lib/xiaohongshu-character-profile.ts` | `src/fork/lib/xiaohongshu-character-profile.ts` | Public social-name resolver replaces private phone-snapshot lookup |
| `lib/bilingual-text.ts` | `src/fork/lib/bilingual-text.ts` | Unchanged |
| `lib/bilingual-prompt-defaults.ts` | `src/fork/lib/bilingual-prompt-defaults.ts` | Unchanged |
| `components/checkphone/checkphone-bilingual-text.tsx` | `src/fork/components/checkphone/checkphone-bilingual-text.tsx` | Import paths / scoped translation settings only |
| `components/checkphone/checkphone-debug-error-card.tsx` | `src/fork/components/checkphone/checkphone-debug-error-card.tsx` | Unchanged |
| `components/ui/form.tsx` | `src/fork/components/ui/form.tsx` | Unchanged Toggle/input controls |
| `styles/xiaohongshu.css` | `src/fork/styles/xiaohongshu.css` | Unchanged |
| `styles/checkphone.css` | `src/fork/styles/checkphone.css` | Unchanged complete shared stylesheet |
| `styles/{tokens,base,components,animations}.css` | `src/fork/styles/{tokens,base,components,animations}.css` | Four unchanged complete shared stylesheets |
| Xiaohongshu blocks in `lib/builtin-preset.ts` | `src/fork/lib/xiaohongshu-prompts.ts` | Four exact protocol blocks, not the unrelated global preset |
| `tailwindcss@4.2.1/preflight.css` (the reset imported by original `app/globals.css`) | `src/fork/styles/tailwind-preflight.css` | Unchanged package dependency; version/hash recorded in source map |
| `public/xiaohongshu/avatars/default-01.png` … `default-06.png` | `assets/avatars/default-01.png` … `default-06.png` | Six byte-identical pinned upstream assets; only used as fallback when a Character lacks an avatar |

## Exact intentional differences

1. Imports of native Character, settings, KV, AI, image, chat and memory services point to thin App adapters. React, Lucide and Phosphor still come from the repository's installed dependencies.
2. The original UI remains; startup uses an independent user profile. Existing avatar presentation allows an independent user image. Character avatars remain card avatars. Participant real-name labels are local-only; the only new settings section edits already-generated social names.
3. Native global prompt assembly is replaced at its service boundary, not inside the nine generators. Only own projected persona, public App context, current-viewer own-source memory and post images enter scoped generation. Native global-user/owner inference hints are removed at the identity projection boundary; block output protocols remain intact.
4. Public authors/comments/DM contexts carry stable accountIds. Native product-only `source`/`authorType` discriminants remain in private App state for original rendering/reducers; they are not serialized as model-facing owner types.
5. KV is hydrated from App-scoped storage. Saving normalizes authors through the identity projection. Original schema, settings defaults, normalization, social graph, counters and UI interactions remain intact.
6. Five original async UI handlers receive a small input journal and completion checkpoint. Fork-only ID/time/random adapters make replay deterministic. Cached Host task results are consumed atomically; the original handlers parse/apply them. No duplicate product reducer is introduced.
7. `requestClose` never asks Float to preserve an iframe just because generation is busy. Media URLs and share routing are adapter concerns.
8. Original event text builders keep explicit account subjects; ownership labels are removed. Their Host projections have source lineage, a persistent outbox and invalidation tombstones. Native mixed RP summarization is deliberately not called.

Changes in copied files are marked `CUSTOM-APP-ADAPTER` / `ANON-FORK`; each can be regenerated with `scripts/port-anonymous-xhs-source.mjs`. The former hand-built simplified product and extraction script were removed, not retained as an alternative runtime.

## Call graph (two selected Characters)

| Cycle | Native built-in | Old Phase 1A | Source fork |
|---|---:|---:|---:|
| First feed | 1 background + 2 activity = 3 | 2 sequential names + 1 background + 2 activity = 5 | 1 background batch of names + 1 background + 2 activity = 4 |
| Later feed | 3 | 3 | 3 |
| User post, 100% reaction | 1 background + 2 reactions = 3 | 3 | 3 |

Native and fork counts are captured by the browser test; the old Phase 1A count is from its previous source/evidence, not a new benchmark. Naming runs alongside the feed, not as sequential per-Character prerequisites. Copying the original sequential Character activity loop is intentional.
