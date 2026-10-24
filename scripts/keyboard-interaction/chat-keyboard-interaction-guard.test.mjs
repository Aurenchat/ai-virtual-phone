import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatKeyboardInteractionGuard as Guard } from '../../lib/chat-keyboard-interaction-guard.ts';

function state() { return new Guard(); }

test('normal keyboard dismissal retains Float default eligibility', () => {
  const g=state();
  assert.equal(g.keyboardDismissed(), true);
  assert.equal(g.takeRestart(), false);
});

test('interrupt a timer, hold menu, then restart once at full delay', () => {
  const g=state();
  g.beginGesture(true); // had a 2s timer (even if 1.5s elapsed)
  assert.equal(g.blocked,true);
  assert.equal(g.keyboardDismissed(), false);
  assert.equal(g.setSurfaceOpen(true,false),false);
  assert.equal(g.endGesture(),false);
  assert.equal(g.takeRestart(),false);
  assert.equal(g.setSurfaceOpen(false,false),true);
  assert.equal(g.takeRestart(),true);
  assert.equal(g.takeRestart(),false); // never double-restart
});

test('two menu cycles each interrupt and restart independently', () => {
  const g=state();
  g.setSurfaceOpen(true,true);
  assert.equal(g.setSurfaceOpen(false,false),true);
  assert.equal(g.takeRestart(),true); // first restart consumed by hook
  g.setSurfaceOpen(true,true); // second interaction within fresh 2s timer
  assert.equal(g.setSurfaceOpen(false,false),true);
  assert.equal(g.takeRestart(),true);
});

test('surface handoff plus-menu -> rich modal -> iOS photo picker does not restart early', () => {
  const g=state();
  g.setSurfaceOpen(true,true);
  g.legacyPanelClosed();
  assert.equal(g.setSurfaceOpen(true,false),false);
  assert.equal(g.takeRestart(),false);
  assert.equal(g.setSurfaceOpen(false,false),true);
});

test('keyboard dismiss while modal is open is deferred until modal closes', () => {
  const g=state();
  g.setSurfaceOpen(true,false);
  assert.equal(g.keyboardDismissed(),false);
  assert.equal(g.setSurfaceOpen(false,false),true);
});

test('legacy plus/emoji panel close still requests countdown without old timer', () => {
  const g=state();
  g.setSurfaceOpen(true,false);
  g.legacyPanelClosed();
  assert.equal(g.setSurfaceOpen(false,false),true);
});

test('main keyboard focus cancels old eligibility even during an interaction', () => {
  const g=state();
  g.setSurfaceOpen(true,true);
  g.composerResumed();
  assert.equal(g.setSurfaceOpen(false,false),false);
  assert.equal(g.keyboardDismissed(),true);
});

test('gesture is protected before a long-press menu becomes visible', () => {
  const g=state();
  g.beginGesture(true);
  assert.equal(g.blocked,true);
  assert.equal(g.takeRestart(),false);
  assert.equal(g.endGesture(),true); // short tap/no menu: full delay restarts
});

test('0ms debounce cannot fire within a pointerdown gesture', () => {
  const g=state();
  g.beginGesture(false);
  assert.equal(g.keyboardDismissed(),false);
  assert.equal(g.takeRestart(),false);
  assert.equal(g.endGesture(),true); // schedule 0ms only after gesture release
});

test('reset on session change removes pending state', () => {
  const g=state();
  g.beginGesture(true);
  g.setSurfaceOpen(true,true);
  g.reset();
  assert.equal(g.blocked,false);
  assert.equal(g.takeRestart(),false);
});

test('long press without an auto-reply timer does not invent a new timer', () => {
  const g=state();
  g.beginGesture(false);
  g.setSurfaceOpen(true,false);
  assert.equal(g.endGesture(),false);
  assert.equal(g.setSurfaceOpen(false,false),false);
});

test('a previously running timer can be paused by opening an external Collect surface', () => {
  const g=state();
  g.setSurfaceOpen(true,true);
  assert.equal(g.takeRestart(),false);
  assert.equal(g.setSurfaceOpen(false,false),true);
});

test('overlapping pointer releases cannot release a different gesture', () => {
  const g=state();g.beginGesture(true,1);g.beginGesture(false,2);
  assert.equal(g.endGesture(1),false);assert.equal(g.blocked,true);
  g.endGesture(1);assert.equal(g.blocked,true);
  assert.equal(g.endGesture(2),true);assert.equal(g.takeRestart(),true);
});
