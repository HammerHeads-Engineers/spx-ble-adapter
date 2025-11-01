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
