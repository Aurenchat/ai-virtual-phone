# Phase 0 capability probe (test only)

This is not the anonymous App or a release installer. It executes the unchanged Float Host modules in an isolated Edge context, imports an in-memory fixture ZIP, exercises the actual iframe SDK, and captures outgoing model-protocol HTTP request bodies at a loopback server. The server returns a deterministic response; no real LLM inference is performed.

Run from the repository root:

```powershell
node scripts/anonymous-xhs-phase0/run.mjs
```

Requires existing repository dependencies, installed Edge, and Playwright. `PHASE0_NODE_MODULES` can point to the directory containing Playwright; the default is this workspace's bundled dependency runtime. No dependency install or lockfile change is performed.

Files:

- `host-entry.tsx`: real Host/runner entry, only for this harness.
- `ts-loader.cjs`: test-only TypeScript transpilation with the repository's compiler.
- `scenarios.mjs`: fixtures, real storage/API calls, SDK bridge, plugin, failure injection and lifecycle scenarios.
- `guard-probe.js`: test companion plugin template; only installed in the ephemeral browser context.
- `evidence/captures.json`: complete outgoing JSON bodies, including synthetic image data URLs. No real credentials or user RP data.
- `evidence/results.json`: observations. `completed: true` means the probe ran, NOT that the capability passed.
- `evidence/provenance.json`: baseline HEAD and SHA-256 of compiled source inputs.
- `evidence/runtime/`: ignored generated browser bundle, not a release asset.

Network is restricted to the fresh loopback origin. The browser context is closed after the run; its test databases are not the user's profile. Re-running replaces only this directory's generated evidence/build outputs. It does not update the production Custom App or Float source.

Limitations: fixture provider only; headless runner boundary rather than full desktop navigation; OpenAI-compatible provider wire format; task-intent matrix rather than not-yet-ported anonymous product handlers. See the Phase 0 report for PASS/PARTIAL/FAIL and minimum extension proposals.
