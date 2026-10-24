import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatKeyboardInteractionGuard as Guard } from '../../lib/chat-keyboard-interaction-guard.ts';

/** Black-box fake timer model of the Hook's pause/restart contract. The real
 * React wiring still needs Codex's browser and iPhone acceptance. */
function scenario(t, interval=2000) {
  t.mock.timers.enable({apis:['setTimeout']});
  const guard=new Guard();
  let timer=null, replies=0, generating=false, pending=true;
  const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const schedule=()=>{cancel();timer=setTimeout(()=>{timer=null;
    if(!guard.blocked && pending && !generating) {replies++;generating=true;}
  },interval)};
  const sync=()=>{if(guard.takeRestart()) schedule();};
  return {
    guard,schedule,cancel,sync,
    replies:()=>replies, generating:()=>generating,
    open:()=>{guard.setSurfaceOpen(true,timer!==null);cancel();},
    close:()=>{guard.setSurfaceOpen(false,false);sync();},
    press:()=>{guard.beginGesture(timer!==null);cancel();},
    release:()=>{guard.endGesture();sync();},
    composer:()=>{guard.composerResumed();cancel();},
    dismiss:()=>{if(guard.keyboardDismissed())schedule();},
  };
}

test('2s: interrupt at 1.5s, keep long menu open, close -> fresh 2s', t=>{
  const h=scenario(t);
  h.dismiss();
  t.mock.timers.tick(1500);
  h.press(); // starts before longpress menu opens
  h.open();
  t.mock.timers.tick(20000);
  assert.equal(h.replies(),0);
  h.release();
  h.close();
  t.mock.timers.tick(1999);
  assert.equal(h.replies(),0);
  t.mock.timers.tick(1);
  assert.equal(h.replies(),1);
});

test('2s: closing modal restarts again after a second interaction',t=>{
  const h=scenario(t);
  h.dismiss(); t.mock.timers.tick(1800);
  h.open();h.close();t.mock.timers.tick(1900);
  h.open(); t.mock.timers.tick(30000);
  assert.equal(h.replies(),0);
  h.close();t.mock.timers.tick(1999);
  assert.equal(h.replies(),0);
  t.mock.timers.tick(1);
  assert.equal(h.replies(),1);
});

test('reopen keyboard cancels countdown and waits for fresh keyboard dismissal',t=>{
  const h=scenario(t);
  h.dismiss();t.mock.timers.tick(1900);
  h.composer();t.mock.timers.tick(10000);
  assert.equal(h.replies(),0);
  h.dismiss();t.mock.timers.tick(2000);
  assert.equal(h.replies(),1);
});

test('0ms: no reply while a photo-picker gesture is underway',t=>{
  const h=scenario(t,0);
  h.press();h.dismiss();
  t.mock.timers.tick(100);
  assert.equal(h.replies(),0);
  h.open();h.release();h.close();
  assert.equal(h.replies(),0);
  t.mock.timers.tick(0);
  assert.equal(h.replies(),1);
});

test('opening menus cannot cancel an already running AI generation',t=>{
  const h=scenario(t);
  h.dismiss(); t.mock.timers.tick(2000);
  assert.equal(h.generating(),true);
  h.open();h.close();t.mock.timers.tick(2000);
  assert.equal(h.generating(),true);
  assert.equal(h.replies(),1); // not interrupted or duplicated
});
