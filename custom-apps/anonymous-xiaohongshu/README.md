# Anonymous Xiaohongshu — local source fork

This working tree replaces the former simplified Phase 1A product. **No new release ZIP has been made.** Existing ZIPs are historical builds, not this source fork. Do not install them to review this work.

Baseline: Float upstream `6cec66372457d3f8199f0d1a49d9fba94544e084`, AGPL-3.0-only. See [source-map.json](source-map.json), [SOURCE-DIFF.patch](SOURCE-DIFF.patch) and [BASELINE.md](BASELINE.md).

## Local development

Run from the Float repository root:

```powershell
node scripts/port-anonymous-xhs-source.mjs
node scripts/build-anonymous-xiaohongshu.mjs
node scripts/test-anonymous-xhs-source.mjs
node node_modules/typescript/bin/tsc -p custom-apps/anonymous-xiaohongshu/tsconfig.json --noEmit --incremental false
$env:HOST_CAPABILITY_PHASE='source'
node scripts/anonymous-xhs-phase0/run.mjs
```

`src/fork/` is the complete copied product. Modify its named adapter patches in the port script, then regenerate. `src/adapters/` handles the iframe boundary; `src/identity/` is private/public identity projection. `assets/app.js` and `assets/app.css` are generated, never hand-edited. The build emits only these local assets unless explicitly invoked with `--package` (not authorized for this review).

## Using the local fork

- Set an independent user nickname in the original profile editor. Signature, gender, location and cover retain the original UI. Click the existing profile avatar to choose this App's independent avatar.
- Select participants in the **original full settings panel**, set interaction probability, translation and original custom prompts. No NPC setup is required.
- Missing Character social names initialize in a single background batch. A temporary random pseudonym is safe to use while the batch runs. Names are persisted, collisions receive a local suffix, and failures retry without blocking the feed or closing the App. Real names are never a fallback.
- Character card avatars are UI-only. Generated names can be edited in settings; accountId and rename history remain stable.
- Discover, Following, Video, Nearby, publishing, replies, nested comments, @, votes, saves, follow graph, notifications, DM, profile views, deletion and the original nine generation flows use copied upstream code.
- Sharing uses existing `chat.sendCard`: sharing a post is not claiming authorship. The Host mini-chat overlay cannot be rendered inside the iframe, so an adapter chooses the recipient.

## Identity and persistence boundaries

- Bindings remain in this App's private database. Native storage key strings live **inside this App's scoped collection**, never in native Xiaohongshu's database.
- Model messages contain public social accounts and the current viewer's own projected persona. Character/avatar/owner routing stays outside the provider messages. Ordinary chat, legacy mixed memory, native Xiaohongshu, global user profile and other App context are denied.
- Existing viewer-local explicit disclosure states migrate intact. Confirmation/revocation primitives remain source-aware; no ordinary-chat similarity search creates disclosures. Following does not reveal an owner. The source fork does not add a second disclosure-management settings UI: the requested sole settings addition is nickname editing.
- Copied timeline event builders project explicit account subjects to source-aware Host memory. A durable outbox and tombstones synchronize deletion/invalidation. Mixed native RP summarization is not re-enabled. The private post store, not the bounded timeline, remains authoritative.
- Closing destroys the iframe immediately. Host requests already submitted finish and retain their raw results. Reopening replays the original handler from its journal and cached results, with stable IDs and probability choices. Later, not-yet-submitted requests resume on reopen, not while the iframe is absent.
- Browser/Host shutdown is different from closing the App: completed results persist; an in-flight request interrupted by browser shutdown can fail. Concurrent editing in multiple tabs is not supported.
- Old Phase 1A and earlier prototype accounts/posts are migrated without deleting their source collections. A missing legacy post record or capped legacy collection stops migration rather than dropping data.

## Host boundary fixes used by this release

- Persona-free scoped generation can omit `characterId` and resolve the normal global/default API configuration without importing global prompt context. This restores background feed generation when Float has zero Characters.
- Provider failures retain a stable `errorCode`. The copied native vision path retries text-only only for `MULTIMODAL_UNSUPPORTED`; ordinary provider failures, timeouts, cancellation and malformed requests remain distinguishable and do not trigger that fallback.

## Evidence

[`scripts/anonymous-xhs-phase0/evidence-source/`](../../scripts/anonymous-xhs-phase0/evidence-source/) contains provider HTTP captures, source hashes, results, same-state 390×844 screenshots, full settings screenshots and runtime tests. This is the **real browser Host / runner / SDK / IndexedDB / HTTP transport**, using an isolated profile and deterministic local model responses. It is not a claim of live-model behavior or a guarantee that an LLM will never speculate.

The older `evidence-1a/` is historical and not this fork's acceptance evidence. No production account, built-in data, ZIP, remote branch or deployment was changed by these tests.

`anonymous-provider-payloads.json` contains only the anonymous fork's requests. `native-reference-payloads.json` is the native comparison control and intentionally has native context; do not conflate those two request sets. `host-boundary-probe-payloads.json` records the explicit failure probe.
