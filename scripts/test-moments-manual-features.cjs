/* Run after the bundle is applied, inside Float repo: node scripts/test-moments-manual-features.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const code = read('lib/moments-manual-photo.ts');
const compiled = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).length, 0, 'photo module syntax');

let posts = [];
let nextSave = async () => 'new-photo-asset';
let updates = [];
let dispatches = [];
const storage = {
    loadMomentPosts: () => posts,
    updateMomentPostPersisted: async (id, patch) => storage.updateMomentPost(id, patch),
    updateMomentPost: (id, patch) => {
        const index = posts.findIndex(p => p.id === id);
        if (index < 0) return null;
        posts[index] = { ...posts[index], ...patch };
        updates.push({ id, patch });
        return posts[index];
    },
};
const moduleObj = { exports: {} };
const requireStub = id => {
    if (id === './moments-storage') return storage;
    if (id === './chat-asset-storage') return { saveChatImageToIndexedDB: file => nextSave(file), getChatImageFromIndexedDB: async () => 'data:image/jpeg;base64,stored' };
    throw new Error(`unexpected import: ${id}`);
};
const fakeWindow = { dispatchEvent: e => dispatches.push(e.type) };
const wrapped = `(function(require,module,exports,window,CustomEvent){${compiled.outputText}\n})`;
const execute = vm.runInNewContext(wrapped)(requireStub, moduleObj, moduleObj.exports, fakeWindow, class {constructor(type) {this.type=type;}});
const { replaceMomentPhotoFromLocalFile, isCurrentMomentPhotoRevision } = moduleObj.exports;
const fakeFile = {type:'image/jpeg',size:17000};

(async () => {
    posts = [{ id: 'post1', authorType: 'character', authorId:'c', photoUrl:'asset://old',
        photoDescription:'a puppy',photoGenerationPrompt:'dog',photoUseReferenceImage:true,
        photoGenerationStatus:'pending',photoGenerationError:'timeout',photoGenerationRevision:'old-revision',
        photoSource:'ai_generated' }];
    const oldRevision = posts[0].photoGenerationRevision;
    const updated = await replaceMomentPhotoFromLocalFile('post1', fakeFile);
    assert.equal(updated.photoUrl, 'asset://new-photo-asset');
    assert.equal(updated.photoDescription, undefined);
    assert.equal(updated.photoGenerationPrompt, undefined);
    assert.equal(updated.photoUseReferenceImage, undefined);
    assert.equal(updated.photoGenerationError, undefined);
    assert.equal(updated.photoSource, 'manual_upload');
    assert.equal(updated.photoGenerationStatus, 'generated');
    assert.notEqual(updated.photoGenerationRevision, oldRevision);
    assert.equal(isCurrentMomentPhotoRevision('post1', oldRevision), false);
    assert.equal(isCurrentMomentPhotoRevision('post1', updated.photoGenerationRevision), false,
        'manual upload cannot be overwritten by even a matching revision');
    assert.deepEqual(dispatches, ['moments-updated']);

    posts = [{ id: 'post2', authorType:'character', authorId:'c', photoUrl:'asset://original' }];
    nextSave = async () => { throw new Error('disk full') };
    updates = [];
    await assert.rejects(replaceMomentPhotoFromLocalFile('post2', fakeFile), /disk full/);
    assert.equal(posts[0].photoUrl, 'asset://original');
    assert.equal(updates.length, 0, 'failed upload must not mutate post');

    nextSave = async () => 'asset3';
    posts = [{ id:'post3',authorType:'user',authorId:'user' }];
    await assert.rejects(replaceMomentPhotoFromLocalFile('post3', fakeFile), /角色朋友圈/);
    posts = [{ id:'post4',authorType:'character',authorId:'c' }];
    await assert.rejects(replaceMomentPhotoFromLocalFile('post4', {type:'image/svg+xml'}), /图片文件/);

    const engine = read('lib/moments-engine.ts');
    const retry = read('lib/generated-image-retry.ts');
    const card = read('components/chat/moment-post-card.tsx');
    const types = read('lib/moments-types.ts');
    assert.match(engine, /export async function regenerateMomentComment\(/);
    assert.match(engine, /redactCommentId: commentId/);
    assert.match(engine, /updateMomentComment\(commentId, \{ content \}\)/);
    assert.match(engine, /if \(!isCurrentMomentPhotoRevision\(postId, revision\)\) return;/);
    assert.match(retry, /if \(!isCurrentMomentPhotoRevision\(post\.id, revision\)\)/);
    assert.match(card, /root\.authorType !== "user"/);
    assert.match(card, /reply\.authorType !== "user"/);
    assert.match(card, /从相册替换图片/);
    assert.match(types, /generationSourceCharacterId\?: string/);
    console.log('PASS Moments manual-photo behavior (save/fail/stale protections), integration structure');
    await require('./test-moments-manual-features-behavior.cjs')();
})().catch(err => {console.error(err);process.exitCode=1});
