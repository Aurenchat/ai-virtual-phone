import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import JSZip from "jszip";
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, "custom-apps", "anonymous-xiaohongshu");
const manifest = JSON.parse(await fs.readFile(path.join(appRoot, "manifest.json"), "utf8"));
const outputName = `anonymous-xiaohongshu-${manifest.version}.zip`;
const outputPath = path.join(appRoot, outputName);
const zip = new JSZip();
const wp=require('next/dist/compiled/webpack/webpack');wp.init();const {webpack}=wp;
await new Promise((resolve,reject)=>webpack({mode:'production',target:'web',devtool:false,context:repoRoot,
  entry:path.join(appRoot,'src/main.tsx'),output:{path:path.join(appRoot,'assets'),filename:'app.js'},
  resolve:{extensions:['.tsx','.ts','.js']},optimization:{minimize:false},
  module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(repoRoot,'scripts/anonymous-xhs-phase0/ts-loader.cjs')}]},
  plugins:[new webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('production')})],
},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
const css=await Promise.all(['checkphone.css','xiaohongshu.css','iframe.css'].map(file=>fs.readFile(path.join(appRoot,'src/styles',file),'utf8')));
const normalizeGeneratedText = (value) => value.replace(/[ \t]+$/gm, "").replace(/\n+$/, "\n");
const generatedJsPath = path.join(appRoot, "assets", "app.js");
await fs.writeFile(generatedJsPath, normalizeGeneratedText(await fs.readFile(generatedJsPath, "utf8")));
await fs.writeFile(path.join(appRoot,'assets/app.css'),normalizeGeneratedText(css.join('\n')));

async function addDirectory(directory, relative = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.endsWith(".zip")||entry.name==='presets.json'||entry.name==='tsconfig.tsbuildinfo') continue;
    const absolute = path.join(directory, entry.name);
    const target = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await addDirectory(absolute, target);
    else zip.file(target, await fs.readFile(absolute));
  }
}

await addDirectory(appRoot);
zip.file('LICENSE',await fs.readFile(path.join(repoRoot,'LICENSE')));
const archive = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  mimeType: "application/zip"
});
await fs.writeFile(outputPath, archive);
console.log(`${path.relative(repoRoot, outputPath)} (${archive.length} bytes)`);
