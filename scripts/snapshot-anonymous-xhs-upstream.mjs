// Download the pinned, unmodified source baseline. No Float source is overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const revision='6cec66372457d3f8199f0d1a49d9fba94544e084';
export const files=[
 'components/xiaohongshu/xiaohongshu-app.tsx',
 'lib/xiaohongshu-engine.ts','lib/xiaohongshu-types.ts','lib/xiaohongshu-storage.ts',
 'lib/xiaohongshu-memory.ts','lib/xiaohongshu-character-profile.ts',
 'styles/xiaohongshu.css','styles/checkphone.css',
 'lib/bilingual-text.ts','lib/bilingual-prompt-defaults.ts',
 'components/checkphone/checkphone-bilingual-text.tsx',
 'components/checkphone/checkphone-debug-error-card.tsx','components/ui/form.tsx',
 'lib/builtin-preset.ts',
 'styles/tokens.css','styles/base.css','styles/components.css','styles/animations.css',
 ...Array.from({length:6},(_,i)=>`public/xiaohongshu/avatars/default-0${i+1}.png`),
];
const root='custom-apps/anonymous-xiaohongshu/upstream';
await fs.mkdir(root,{recursive:true});
const records=await Promise.all(files.map(async file=>{
 const response=await fetch(`https://raw.githubusercontent.com/xiaolongbao0709/ai-virtual-phone/${revision}/${file}`);
 if(!response.ok)throw Error(`${file}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 const dest=path.join(root,file+'.source');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);
 return {path:file,sha256:createHash('sha256').update(bytes).digest('hex')};
}));
await fs.writeFile(path.join(root,'provenance.json'),JSON.stringify({repository:'https://github.com/xiaolongbao0709/ai-virtual-phone',revision,files:records},null,2)+'\n');
console.log(`Pinned ${records.length} upstream source files at ${revision}`);
