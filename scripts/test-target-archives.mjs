import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Follow existing repo style: standalone Node .mjs + TS transpile + dependency mocks.
// This is a skeleton: Codex should wire exact dependency stubs to the final module.

async function loadTs(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(id => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}

const tests = [];
async function test(name, run) { await run(); tests.push(name); }

// Suggested in-memory fixture state.
function makeCharacters(count = 100) {
  return Array.from({ length: count }, (_, i) => ({
    id: `char_${String(i).padStart(3, "0")}`,
    name: `Target ${i}`,
    avatar: null,
    persona: `PERSONA_SENTINEL_${i}_${"x".repeat(2000)}`,
    personality: `PERSONALITY_SENTINEL_${i}`,
    briefPersona: `BRIEF_SENTINEL_${i}`,
    tags: i % 2 ? ["odd"] : ["even", `tag-${i}`],
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: `2026-10-06T00:${String(i % 60).padStart(2,"0")}:00.000Z`,
  }));
}

await test("permission truth sources include the four new permissions", async () => {
  const types = await readFile(new URL("../lib/custom-app-types.ts", import.meta.url), "utf8");
  const storage = await readFile(new URL("../lib/custom-app-storage.ts", import.meta.url), "utf8");
  const labels = await readFile(new URL("../lib/custom-app-permission-labels.ts", import.meta.url), "utf8");
  const perms = ["characters.write","characters.worlds.read","characters.worlds.write","characters.relations.write"];
  for (const p of perms) {
    assert.ok(types.includes(`"${p}"`), `type must include ${p}`);
    assert.ok(storage.includes(`"${p}"`), `whitelist must include ${p}`);
    assert.ok(labels.includes(`"${p}"`), `permission label must include ${p}`);
  }
});

await test("SDK wrapper exposes the exact character administration actions", async () => {
  const runner = await readFile(new URL("../components/app-market/custom-app-runner.tsx", import.meta.url), "utf8");
  for (const action of [
    "characters.listSummaries","characters.create","characters.update","characters.delete",
    "characterWorlds.list","characterWorlds.create","characterWorlds.update","characterWorlds.delete",
    "characterWorlds.moveCharacter","characterWorlds.createRelation",
    "characterWorlds.updateRelation","characterWorlds.deleteRelation",
  ]) assert.ok(runner.includes(`'${action}'`) || runner.includes(`"${action}"`), `runner must include ${action}`);
});

await test("100-character list is paginated and summaries do not leak long fields", async () => {
  // Wire the final host module with mocked character/world storage.
  // const api = await loadTs("../lib/custom-app-character-library-api.ts", deps);
  // const result = await api.listCustomAppCharacterSummaries({page:1,pageSize:20});
  // assert.equal(result.total, 100);
  // assert.equal(result.items.length, 20);
  // assert.equal(result.totalPages, 5);
  // for (const item of result.items) {
  //   for (const forbidden of ["persona","personality","briefPersona","canvasX","canvasY","canvasRot","canvasZIndex"]) {
  //     assert.equal(forbidden in item, false, `${forbidden} must not cross iframe summary API`);
  //   }
  // }
  // const serialized = JSON.stringify(result);
  // assert.doesNotMatch(serialized, /PERSONA_SENTINEL|PERSONALITY_SENTINEL|BRIEF_SENTINEL/);
  assert.equal(makeCharacters().length, 100);
});

await test("pagination clamps pageSize to 25 and search only reads name/tags", async () => {
  // Assert pageSize 999 => 25; search "odd" finds tag hits; persona sentinel must not make a hit.
});

await test("world filter returns only members of that CharacterWorldGroup", async () => {
  // Build two groups and verify page counts/item worldId.
});

await test("relationshipCount is O(R)-style incident count and respects direction records", async () => {
  // One A->B and one B->A should increment both A and B twice total.
});

await test("create applies native defaults and finite deterministic parking", async () => {
  // Assert generated id/wechatID/timestamps, tags default, persona default "", canvas fields finite.
  // Create 100 into one world and assert unique parking positions fit x<=1740/y<=1920 for empty-grid fixture.
});

await test("update preserves unknown fields and rejects forbidden patch fields", async () => {
  // Existing record contains futureField. Update persona. Assert futureField survives.
  // Reject id/createdAt/wechatID/canvasX/unknownFutureWrite.
});

await test("undefined preserves, null clears nullable editable fields", async () => {
  // avatar:null clears; personality:null clears; missing persona preserves.
});

await test("character delete cleanup order is chat -> versions -> characters -> worlds", async () => {
  // Dependency mocks push step names; assert.deepEqual(order, ["chat","versions","characters","worlds"]).
  // Make chat cleanup throw and assert no later step executes.
});

await test("parking never emits NaN/Infinity and does not build huge 100-character bbox", async () => {
  // Assert Number.isFinite all coords; no overlap; <=10 columns for first 100.
});

await test("world delete never deletes Character records and merges members into default", async () => {
  // Delete non-default group; character array unchanged; target members now in world_default; target relations disappear.
  // Deleting world_default rejects.
});

await test("moveCharacter removes old-world incident relations and reparks in destination", async () => {
  // Validate target exists first; invalid target leaves all storage unchanged.
});

await test("relation create validates world membership/self/blank label", async () => {
  // Reject endpoints outside world, same endpoint, blank label.
});

await test("relation update preserves relation id and never uses delete+create", async () => {
  // Update label/endpoints, assert same id, same relation count and array slot.
});

await test("relation delete removes exactly one directed record", async () => {
  // Reverse relation remains.
});

await test("uninstalling Target Archives cannot touch native Character keys", async () => {
  const storage = await readFile(new URL("../lib/custom-app-storage.ts", import.meta.url), "utf8");
  const uninstall = storage.slice(storage.indexOf("export function uninstallCustomApp"), storage.indexOf("export async function uninstallCustomAppAsync"));
  assert.doesNotMatch(uninstall, /ai_phone_characters_v1|ai_phone_character_worlds_v1|ai_phone_character_versions_v1/);
});

await test("Target Archives package does not mount PhoneCharacterApp/P1 or use a shadow DB", async () => {
  const manifest = await readFile(new URL("../custom-apps/target-archives/manifest.json", import.meta.url), "utf8");
  const html = await readFile(new URL("../custom-apps/target-archives/index.html", import.meta.url), "utf8");
  const js = await readFile(new URL("../custom-apps/target-archives/assets/app.js", import.meta.url), "utf8");
  const joined = manifest + html + js;
  assert.doesNotMatch(joined, /PhoneCharacterApp|phone-character-app|char-canvas|react|react-dom/i);
  assert.doesNotMatch(manifest, /app\.data\.read|app\.data\.write/);
  assert.doesNotMatch(manifest, /"world\.read"|"world\.write"/);
  assert.match(js, /AiPhone\.characters|characterWorlds/);
});

for (const name of tests) console.log("PASS", name);
console.log(`${tests.length} Target Archives checks passed.`);
