const test = require('node:test');
const assert = require('node:assert');
const bleno = require('@abandonware/bleno');

const { buildServices } = require('../lib/build-services');
const { createState } = require('../lib/state');

test('buildServices creates readable characteristic that encodes state value', async () => {
  const config = {
    device: { name: 'TestDevice' },
    services: [
      {
        uuid: '1234',
        characteristics: [
          {
            uuid: 'abcd',
            name: 'Temperature',
            properties: ['read'],
            value: { source: 'state', key: 'temperature' },
            codec: { format: 'sint16', scale: 0.01 },
          },
        ],
      },
    ],
  };

  const state = createState({ temperature: 12.34 });
  const services = buildServices(config, state);

  assert.strictEqual(services.length, 1);
  const characteristic = services[0].characteristics[0];

  await new Promise((resolve) => {
    characteristic.onReadRequest(0, (result, data) => {
      assert.strictEqual(result, bleno.Characteristic.RESULT_SUCCESS);
      assert.strictEqual(data.readInt16LE(0), 1234);
      resolve();
    });
  });

  await new Promise((resolve) => {
    characteristic.onReadRequest(1, (result) => {
      assert.strictEqual(result, bleno.Characteristic.RESULT_ATTR_NOT_LONG);
      resolve();
    });
  });
});

test('buildServices write characteristic decodes value and runs actions', async () => {
  const config = {
    device: { name: 'WriterDevice' },
    services: [
      {
        uuid: '9999',
        characteristics: [
          {
            uuid: 'eeee',
            name: 'Command',
            properties: ['write'],
            codec: { format: 'utf8' },
            onWrite: [
              {
                action: 'parse',
                type: 'float',
                clamp: { min: -10, max: 10 },
                target: 'state',
                key: 'temperature',
              },
            ],
          },
        ],
      },
    ],
  };

  const state = createState({ temperature: 0 });
  const services = buildServices(config, state);
  const characteristic = services[0].characteristics[0];

  await new Promise((resolve) => {
    characteristic.onWriteRequest(Buffer.from('12.5', 'utf8'), 0, false, (result) => {
      assert.strictEqual(result, bleno.Characteristic.RESULT_SUCCESS);
      assert.strictEqual(state.get('temperature'), 10);
      resolve();
    });
  });

  await new Promise((resolve) => {
    characteristic.onWriteRequest(Buffer.from('0', 'utf8'), 1, false, (result) => {
      assert.strictEqual(result, bleno.Characteristic.RESULT_ATTR_NOT_LONG);
      resolve();
    });
  });
});
