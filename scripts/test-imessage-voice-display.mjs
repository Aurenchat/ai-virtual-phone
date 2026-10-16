import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), ts = require('typescript');
const load = async file => {
    const m = { exports: {} };
    const result = ts.transpileModule(await fs.readFile(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        reportDiagnostics: true,
    });
    assert.equal(result.diagnostics?.length || 0, 0, `${file} transpile diagnostics`);
    new Function('exports', result.outputText)(m.exports);
    return m.exports;
};
const { filterVoiceDisplayText: filter, VOICE_SOUND_TAGS, VOICE_ACTION_TAGS_ZH } = await load('lib/voice-display-text.ts');
const { splitBilingualText } = await load('lib/bilingual-text.ts');
const checks = [];
const check = (actual, expected, name) => { assert.deepEqual(actual, expected, name); checks.push(name); };

// MiniMax 2.8's known tags remain supported; arbitrary translations now also
// disappear from the voice transcript without affecting the original message.
for (const tag of VOICE_SOUND_TAGS) {
    check(filter(`(${tag}) Hello (${tag.toUpperCase()}).`), 'Hello.', tag);
    check(filter(`（ ${tag.toUpperCase()} ）Hello`), 'Hello', `${tag} fullwidth`);
}
for (const tag of VOICE_ACTION_TAGS_ZH) {
    check(filter(`（${tag}）你好 (${tag})。`), '你好。', `${tag} Chinese`);
}
for (const text of ['(New York)', '(2026)', '（明天）', '（补充说明）', '(whispers)', '(laughing quietly)', '(New York)  (2026)']) {
    check(filter(text), '', `new broad parenthesis rule: ${text}`);
}
check(filter('(chuckle)(inhale) Mwah. (sighs) Screen off.（呼气）'), 'Mwah. Screen off.', 'consecutive and inline');
check(filter('a(chuckle)b'), 'a b', 'do not join Latin words');
check(filter('( clear - throat ) Hello'), 'Hello', 'noncanonical English tag');
check(filter('Hello (laughs)!\n（叹气）明天见。'), 'Hello!\n明天见。', 'punctuation and newline');
check(filter('(chuckle) Hello  there.  \n    Keep indentation.'), 'Hello  there.  \n    Keep indentation.', 'Markdown hard break');
check(filter('Keep  (New York)  intact. (sighs)'), 'Keep intact.', 'broad rule also hides ordinary parentheses in voice only');
check(filter('你好(低笑)世界'), '你好世界', 'no artificial space between Han words');
check(filter('你好，(轻吸气) 世界'), '你好，世界', 'no artificial space after Chinese punctuation');
check(filter('Hello, (laughs) world'), 'Hello, world', 'space after ASCII punctuation');

// ElevenLabs v3/v4 natural-language audio tag format, including Chinese and
// fullwidth square-bracket variants (model-produced translations).
check(filter('[whispers] Hello [low, gravelly voice] [laughing quietly].'), 'Hello.', 'Eleven audio tags');
check(filter('［低声］ 你好 ［轻吸气］！'), '你好！', 'fullwidth Eleven-style translated tags');
check(filter('Hello [short pause] there'), 'Hello there', 'Eleven pause in square brackets');

// MiniMax pause numeric range and legacy ElevenLabs SSML break tags.
check(filter('Wait <#0.01#> here <#99.99#> now.'), 'Wait here now.', 'MiniMax numeric pause boundaries');
check(filter('Wait <#1#> here <#0.5#> now.'), 'Wait here now.', 'MiniMax integer and decimal pauses');
check(filter('Wait <break time="1.5s" /> here <BREAK time=\'2s\'/> now.'), 'Wait here now.', 'Eleven SSML breaks');
check(filter('A <break time="xs" /> B'), 'A B', 'legacy generated xs break');
for (const text of [
    'A <#0#> B', 'A <#0.001#> B', 'A <#100#> B', 'A <#1.234#> B',
    'A <0.01> B', 'A <break time="later" /> B', 'A <div>voice</div> B',
    'A <phoneme alphabet="ipa" ph="tɛst">test</phoneme> B',
    'Hello ... — um uh!', 'An unclosed (laugh and [sigh',
]) check(filter(text), text, `preserve ordinary or malformed text ${text}`);

// Critical negative tests: markdown material within a voice transcript must
// not be destroyed by a permissive ElevenLabs square-bracket filter.
for (const text of [
    'Read [this link](https://example.com/a_(b)) please.',
    'Look at ![photo](https://example.com/photo.jpg) now.',
    'Use [this][reference] and [another][] today.',
    '[reference]: https://example.com/a_(b)',
    '- [x] completed',
    'Inside `[whispers] (laughs) <#0.5#>` is literal.',
    '```txt\n(laughs) [whispers] <#0.5#>\n```',
    '~~~\n(clear-throat)\n~~~',
    '~~~\n[whispers] never closed',
    'Escaped \\[laughs] and \\(laughs\\) markers',
]) check(filter(text), text, `protect Markdown/code ${text}`);
check(filter('[see here](https://example.com) [laughs] Go'), '[see here](https://example.com) Go', 'preserve link next to tag');
check(filter('`[tag]` [whispers] hi'), '`[tag]` hi', 'filter outside code but not inside');

// The exact escaped tag lines reported in Krueger's voice message.
const english = '(clear-throat) (chuckle) Guy lives out of desert shipping containers, eats cold rations off the hood of a truck, (breath) and the first thing he does back in LA is inhale a bagel like a starved coyote.';
const chinese = '(清嗓) (低笑) 这人成天住在沙漠集装箱里，趴在卡车引擎盖上啃冷干粮，(轻吸气) 回了洛杉矶第一件事是像只饿死狼一样生吞贝果。';
check(filter(english), 'Guy lives out of desert shipping containers, eats cold rations off the hood of a truck, and the first thing he does back in LA is inhale a bagel like a starved coyote.', 'real voice English');
check(filter(chinese), '这人成天住在沙漠集装箱里，趴在卡车引擎盖上啃冷干粮，回了洛杉矶第一件事是像只饿死狼一样生吞贝果。', 'real voice Chinese');

// Do not change the message protocol parser, TTS source or storage record.
const raw = '(chuckle) Mwah. Screen off.|(低笑) Mwah。关屏幕吧。';
const parsed = splitBilingualText(raw);
check(parsed, { original: '(chuckle) Mwah. Screen off.', translated: '(低笑) Mwah。关屏幕吧。' }, 'parser retains raw tags');
check(filter(parsed.original), 'Mwah. Screen off.', 'display original');
check(filter(parsed.translated), 'Mwah。关屏幕吧。', 'display translation');
check(raw, '(chuckle) Mwah. Screen off.|(低笑) Mwah。关屏幕吧。', 'raw string never mutated');
check(splitBilingualText('a | b'), null, 'ordinary pipe follows host parser');
check(splitBilingualText('Name|姓名: Alex|亚历克斯'), { original: 'Name: Alex', translated: '姓名: 亚历克斯' }, 'segmented protocol delegated to host');
const bubbleSource = await fs.readFile('components/chat/message-bubble.tsx', 'utf8');
check(bubbleSource.includes('presentation.enabled && presentation.voiceTranscript ? filterVoiceDisplayText(value) : value'), true, 'strict iMessage voice-only call site');

await fs.mkdir('themes/imessage-native-day/verification/phase1.5', { recursive: true });
await fs.writeFile('themes/imessage-native-day/verification/phase1.5/filter-results.json', JSON.stringify({ checks }, null, 2));
console.log(`${checks.length} voice display/parser safety checks passed`);
