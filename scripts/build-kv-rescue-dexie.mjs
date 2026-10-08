// Standalone rescue loads only the project's installed Dexie, never app chunks.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { version } = require('dexie/package.json');
const source = await readFile(require.resolve('dexie/dist/dexie.min.js'), 'utf8');
await writeFile('public/float-rescue/dexie-runtime.js', `// Generated from project dependency dexie ${version}; run scripts/build-kv-rescue-dexie.mjs\n${source.replace(/\/\/# sourceMappingURL=.*$/m, '')}`);
console.log(`[kv-rescue] standalone Dexie ${version}`);
