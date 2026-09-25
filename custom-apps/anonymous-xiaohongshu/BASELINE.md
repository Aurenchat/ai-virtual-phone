# Phase 1A source provenance

Float baseline: local checkout HEAD `da06721856e412777bec6f4db6427a74db100b34` (AGPL-3.0-only).

- `src/baseline-ui.tsx`: original `components/xiaohongshu/xiaohongshu-app.tsx` NoteCard, NoteImage, NoteDetailSlider, CommentList and their rendering helpers, mechanically extracted.
- `src/styles/checkphone.css`, `xiaohongshu.css`: original styles, copied without product redesign.
- `src/baseline-engine.ts`: original block parsers and interaction reducers. Character arguments are projected social accounts, never runtime character objects. Global user-name lookup removed.
- `src/baseline-storage.ts`, `xiaohongshu-types.ts`: original factories, schemas and defaults. Native KV/global profile access removed.
- `src/baseline-prompts.ts`: original activity/reaction/comment protocol blocks. At request time identity hints and real-user macros are replaced by the App's account context.
- Bilingual parser/component: original, with native settings subscription removed.
- `src/xiaohongshu-app.tsx`: iframe controller and scoped Phase 1A page composition around these components; header/detail classes reuse native structure. Peripheral views are explicitly deferred, not parity claims.
- Default avatars: original `public/xiaohongshu/avatars` resources.

Assets are build products. Run `node scripts/build-anonymous-xiaohongshu.mjs` from the repository root. Do not hand-edit assets.

The mechanical extraction script is a provenance aid, not a build step; running it again replaces forked files and requires reapplying documented identity adaptations.
