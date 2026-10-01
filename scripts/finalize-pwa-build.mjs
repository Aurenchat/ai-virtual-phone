import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.env.NEXT_DIST_DIR || '.next');
const buildId = (await fs.readFile(path.join(dist, 'BUILD_ID'), 'utf8')).trim();
let count = 0;
async function visit(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const html = await fs.readFile(file, 'utf8');
    const bootstrap = html.match(/<script id="float-pwa-bootstrap">[\s\S]*?<\/script>/)?.[0];
    if (!bootstrap || !html.includes('<head>')) continue;
    // React hoists async Next chunks before an ordinary inline layout script.
    // Place the no-dependency failure listener before ALL resource tags in static
    // documents so it can catch failures even when main-app never executes.
    const output = html.replace(bootstrap, '').replace('<head>', '<head>' + bootstrap);
    await fs.writeFile(file, output);
    count++;
  }
}
await visit(path.join(dist, 'server/app'));
if (!count) throw new Error('PWA recovery bootstrap was not found in prerendered HTML');
const worker = await fs.readFile('public/sw-versioned.js', 'utf8');
if (!worker.includes(`const BUILD_ID = ${JSON.stringify(buildId)};`)) {
  throw new Error('PWA worker and Next BUILD_ID do not match');
}
console.log(`[pwa] verified build ${buildId}; installed early recovery in ${count} static documents`);
