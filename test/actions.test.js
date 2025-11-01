const test = require('node:test');
const assert = require('node:assert');

const { createState } = require('../lib/state');
const { runActions } = require('../lib/actions');

test('log action renders template with context', (t) => {
  const state = createState({ temperature: 21 });
  const messages = [];
  const original = console.log;

  console.log = (msg) => messages.push(msg);
  t.after(() => {
    console.log = original;
  });

  runActions(
    [{ action: 'log', template: '[BLE] {{deviceName}} -> {{value}} (state={{state}})' }],
    {
      deviceName: 'TestDevice',
      value: 'payload',
      state,
    },
  );

  assert.strictEqual(messages.length, 1);
  assert.match(messages[0], /\[BLE\] TestDevice -> payload/);
  assert.match(messages[0], /"temperature":21/);
});

test('parse action updates state with clamped float', () => {
  const state = createState({ temperature: 20 });

  runActions(
    [
      {
        action: 'parse',
        type: 'float',
        clamp: { min: -40, max: 40 },
        target: 'state',
        key: 'temperature',
      },
    ],
    {
      value: '55.5',
      state,
    },
  );

  assert.strictEqual(state.get('temperature'), 40);
});

test('parse action throws on invalid input', () => {
  const state = createState({});

  assert.throws(() => {
    runActions(
      [
        {
          action: 'parse',
          type: 'float',
          target: 'state',
          key: 'value',
        },
      ],
      { value: 'not-a-number', state },
    );
  }, /parse\(float\) failed/);
});
