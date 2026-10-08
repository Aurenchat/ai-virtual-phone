const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = async function install({ temp, repo }) {
    const loader = JSON.stringify(path.join(repo, 'scripts/anonymous-xhs-phase0/ts-loader.cjs'));
    await fs.writeFile(path.join(temp, 'panel-probe.cjs'), `
const transpile = require(${loader});
module.exports = function(source) {
 source = source.replace('loadStickerPacksForCharacters, resolveCustomStickerUrl,', 'loadStickerPacksForCharacters, resolveCustomStickerUrl as actualResolveCustomStickerUrl,');
 source = source.replace('        get,', '        _snapshot: () => ({keys: [...cache.keys()], chars, active, queued: queue.length}), _put: put, get,');
 source = source.replace('if (!cancelled) setResolved(url);', 'if (!cancelled) { (window as any).__panelTileUpdates = ((window as any).__panelTileUpdates || 0) + 1; setResolved(url); }');
 source += \`\nfunction resolveCustomStickerUrl(id: string) {
   const probe = (window as any).__panelReadProbe;
   return probe ? probe(id, () => actualResolveCustomStickerUrl(id)) : actualResolveCustomStickerUrl(id);
 }
 export const __createPanelResolverTest = createPanelStickerResolver;\`;
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'media-probe.cjs'), `
const transpile = require(${loader});
module.exports = function(source) {
 source = source.replace('export async function storeMediaBlob(', 'async function actualStoreMediaBlob(');
 source += \`\nexport async function storeMediaBlob(blob: Blob, mime: string, category: any) {
   const probe = (window as any).__photoStoreProbe;
   return probe ? probe(blob, mime, category, () => actualStoreMediaBlob(blob, mime, category)) : actualStoreMediaBlob(blob, mime, category);
 }\`;
 return transpile.call(this, source);
};`);
    await fs.writeFile(path.join(temp, 'call-probe.cjs'), `
const transpile = require(${loader});
module.exports = function(source) {
 source = source.replace('ChatMessage, loadChatMessages,', 'ChatMessage, loadChatMessages as actualLoadChatMessages,');
 source = source.replace('{ generateChatCompletion,', '{ generateChatCompletion as actualGenerateChatCompletion,');
 source = source.replace('({ getChatImageFromIndexedDB }) => getChatImageFromIndexedDB(background)', '({ getChatImageFromIndexedDB }) => (window as any).__callBgProbe(background, () => getChatImageFromIndexedDB(background))');
 source = source.replace('if (cancelled) return;', 'if (cancelled) return; (window as any).__callBgUpdates = ((window as any).__callBgUpdates || 0) + 1;');
 source += \`\nfunction loadChatMessages(id: string, limit?: number) {
   (window as any).__callHistoryReads?.push(limit ?? 'full');
   return actualLoadChatMessages(id, limit);
 }
 function generateChatCompletion(...args: Parameters<typeof actualGenerateChatCompletion>) {
   (window as any).__callContexts?.push(args[1].map(m => ({id:m.id, content:m.content})));
   return actualGenerateChatCompletion(...args);
 }\`;
 return transpile.call(this, source);
};`);
    return [
        { test: /[\\/]emoji-panel\.tsx$/, use: path.join(temp, 'panel-probe.cjs') },
        { test: /[\\/]media-cache-storage\.ts$/, use: path.join(temp, 'media-probe.cjs') },
        { test: /[\\/]voice-call-screen\.tsx$/, use: path.join(temp, 'call-probe.cjs') },
    ];
};
