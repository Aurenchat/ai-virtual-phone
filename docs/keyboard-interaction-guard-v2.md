# Keyboard automatic reply interaction guard v2

When a protected chat surface interrupts an unfired keyboard-dismiss timer, the
timer is cancelled and its intent remains local to the mounted session. Closing
the final surface starts the full configured delay again. Focusing/typing in the
real composer clears that intent. Existing reply eligibility, explicit sending,
manual triggers and running generation retain their original behavior.

Native state covers emoji/stickers/plus, rich composers and the actual active
message menu. A positioning anchor alone does not mean a menu is still open:
quote/other actions can retain that anchor after dismissing the menu. Long press
is protected from pointerdown, including its initial 500ms, with deferred release
to allow the following click to open a surface at 0ms debounce. Pointer identities
prevent an older release from releasing a new or overlapping gesture.

## Collect

The inspected `fis.collect` 0.11.0-restorefix.2 package declares
`share-from-collect` as **panel**, also in its canonical chat extension. Installed
runtime IDs have random suffixes, so the host matches the installed manifest ID
and exact action ID. Its entire share panel remains protected through selection,
sendCard, cancellation and nested overlays. No fullscreen-return persistence is
needed for this package. `my-wardrobe` remains excluded; closing the original plus
panel still has its original countdown semantics. An independently customized
fullscreen Collect entry needs a separate lifecycle audit before claiming support.

## iMessage toolbar

The toolbar's `.im-toolbar-menu` is separate from React `showPlusMenu`. Its open
and close paths now dispatch `float:chat-keyboard-interaction` on the owning
`.chat-room-wrapper`, with `{surface: s.menuId, open: boolean}`. The Hook accepts
only this root and `im-toolbar-` surface identities. Deferred close reconciles
current native state so a toolbar -> native plus -> rich modal handoff has no
intermediate countdown. No new DOM observers, CSS visibility guesses or scans
are used by the guard. The existing long-press beautifier forwards the native
contextmenu/pointercancel lifecycle and needs no change.

**An installed toolbar plugin must be updated by same-ID import and enabled.**
Website deployment does not replace plugins stored in the browser. The repository
toolbar is alpha.8. For the current perf.3 composer-flashfix toolbar, use the
delivered `iMessage-Toolbar-perf.3-keyboard-v2.js` copy: it preserves its performance
and flash fixes and adds only the lifecycle signals/version. Preserve the old
plugin file for rollback; no uninstall, database clearing or CSS replacement is
needed. Other installed custom menu plugins need their own explicit lifecycle.

## Validation

Run `node --experimental-strip-types --test scripts/keyboard-interaction/*.test.mjs`
and `node scripts/test-keyboard-interaction.mjs`. The latter uses the real Hook,
ChatRoom, synthetic stores, a local SSE endpoint and a fresh browser context; all
external requests are blocked. It requires the repository dependencies and a
bundled Playwright runtime; `KEYBOARD_BROWSER` defaults to `msedge`.

`KEYBOARD_EVIDENCE` selects the output directory. `KEYBOARD_COLLECT_ZIP` optionally
points to the application-only Collect package, whose code is installed into the
disposable origin with one synthetic keepsake. `KEYBOARD_THEME` optionally points
to a prepared theme directory using the standard repository filenames plus
`menu.js` and `reactions.js`. Original user theme files are never changed.

The handoff installer stopped safely because its emoji anchor occurs twice
(online and offline render paths). Reconciliation updates both; the Hook's former
void return annotation is removed because it now returns imperative handlers.

Desktop Chromium checks include 0/2/5-second waits, consecutive interruptions,
500ms long press, rich composers and desktop picker cancellation, Collect share
and cancel, generation continuity, drafts, no pending reply, disabled settings,
session changes, group transfer, offline and multi-select. Separate repository
quote/theme regression covers layout, reactions and manual scroll anchoring.

iPhone/WKWebView keyboard/visualViewport timing, native Photos permission/cancel,
background suspension and the final installed plugin combination still require
real-device acceptance. A dispatched browser file-input cancel event does not
establish native iOS picker behavior. Local SSE proves lifecycle continuity with
a synthetic provider, not a real remote provider or production archive.
