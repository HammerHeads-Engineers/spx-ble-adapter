const test = require('node:test');
const assert = require('node:assert');

const { createState } = require('../lib/state');

test('createState returns getters and setters', () => {
  const state = createState({ temperature: 10 });

  assert.strictEqual(state.get('temperature'), 10);
  assert.strictEqual(state.get('missing', 'fallback'), 'fallback');

  const updated = state.set('temperature', 15.5);
  assert.strictEqual(updated, 15.5);
  assert.strictEqual(state.get('temperature'), 15.5);

  const snapshot = state.snapshot();
  assert.deepStrictEqual(snapshot, { temperature: 15.5 });
  snapshot.temperature = 0;
  assert.strictEqual(state.get('temperature'), 15.5);
});

test('state helpers setMany and ensureDefaults', () => {
  const state = createState({ a: 1 });
  state.setMany({ b: 2, c: 3 });
  assert.deepStrictEqual(state.snapshot(), { a: 1, b: 2, c: 3 });

  state.ensureDefaults({ c: 100, d: 4 });
  assert.deepStrictEqual(state.snapshot(), { a: 1, b: 2, c: 3, d: 4 });

  state.replace({ z: 9 });
  assert.deepStrictEqual(state.snapshot(), { z: 9 });

  state.clear();
  assert.deepStrictEqual(state.snapshot(), {});
});

test('onChange emits updates for specific keys', () => {
  const state = createState({ temp: 20 });
  const events = [];
  const unsubscribe = state.onChange('temp', (value, key) => {
    events.push({ key, value });
  });

  state.set('temp', 21);
  state.set('other', 5);
  state.replace({ temp: 22 });
  unsubscribe();
  state.set('temp', 23); // no emit after unsubscribe

  assert.deepStrictEqual(events, [
    { key: 'temp', value: 21 },
    { key: 'temp', value: 22 },
  ]);
});
