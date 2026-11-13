import assert from 'node:assert/strict';
import { createPressHold, pressHoldMs } from '../src/press-hold.js';

function setup(complete = async () => true) {
  let time = 0;
  let next = 0;
  let completed = 0;
  const frames = new Map();
  const positions = [];
  const phases = [];
  const hold = createPressHold({
    now: () => time,
    requestFrame: action => { frames.set(++next, action); return next; },
    cancelFrame: id => frames.delete(id),
    paint: progress => positions.push(progress),
    phase: phase => phases.push(phase),
    complete: () => { completed++; return complete(); },
  });
  return { hold, positions, phases, completed: () => completed, step(at) {
    time = at;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(action => action(at));
  } };
}

{
  const test = setup();
  assert.equal(test.hold.start(3), true);
  test.step(pressHoldMs / 4);
  test.step(pressHoldMs / 2);
  assert.deepEqual(test.positions, [0, .25, .5], 'holding must advance the circle continuously, before completion');
  assert.equal(test.completed(), 0);
  test.step(pressHoldMs);
  await Promise.resolve();
  assert.equal(test.completed(), 1);
  assert.equal(test.positions.at(-1), 1);
  assert.equal(test.phases.at(-1), 'saving');
  test.hold.cancel(3);
  assert.equal(test.hold.start(4), false, 'finishing the album must not start a second press');
  test.hold.destroy();
}
{
  const test = setup();
  test.hold.start('finger');
  test.step(900);
  test.hold.cancel('other-finger');
  assert(test.positions.at(-1) > 0, 'a different touch must not cancel the held finger');
  test.hold.cancel('finger');
  assert.equal(test.positions.at(-1), 0, 'releasing early must return the circle to the starting position');
  test.step(pressHoldMs * 2);
  await Promise.resolve();
  assert.equal(test.completed(), 0, 'an interrupted press must never finish later');
  assert.equal(test.hold.start('keyboard'), true);
  test.hold.cancel();
  assert.equal(test.phases.at(-1), 'idle', 'hiding the page must cancel either pointer or keyboard holds');
  test.hold.destroy();
}
{
  const test = setup(async () => false);
  test.hold.start(1);
  test.step(pressHoldMs);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(test.positions.at(-1), 0, 'a failed save must reset the press instead of leaving it stuck');
  assert.equal(test.hold.start(2), true, 'a failed save must allow another attempt');
  test.hold.destroy();
}
{
  const test = setup();
  test.hold.start(1);
  test.step(pressHoldMs);
  test.hold.destroy();
  const changes = test.positions.length;
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(test.completed(), 0, 'leaving the press screen must cancel a completion that has not yet started');
  assert.equal(test.positions.length, changes, 'a disposed press must not update the screen');
}
console.log('PASS: press circle progress, early release, single completion, retry and cleanup');
