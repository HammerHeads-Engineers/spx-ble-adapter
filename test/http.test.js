const test = require('node:test');
const assert = require('node:assert');
const { Readable } = require('node:stream');

const { routeRequest, readJsonBody } = require('../server/http');

test('routeRequest maps HTTP verbs to controller methods', async () => {
  const calls = [];
  const controller = {
    async getHealth() {
      calls.push(['getHealth']);
      return { status: 'ok' };
    },
    async getState() {
      calls.push(['getState']);
      return { temperatureC: 22 };
    },
    async setState(payload) {
      calls.push(['setState', payload]);
    },
    async getConfig() {
      calls.push(['getConfig']);
      return { path: '/tmp/config.json', data: { device: { name: 'Test' } } };
    },
    async setConfig(payload) {
      calls.push(['setConfig', payload]);
    },
    async onEvent(payload) {
      calls.push(['onEvent', payload]);
    },
  };

  let result = await routeRequest(controller, 'GET', '/health');
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { status: 'ok' });

  result = await routeRequest(controller, 'GET', '/state');
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { temperatureC: 22 });

  result = await routeRequest(controller, 'PUT', '/state', { temperatureC: 25 });
  assert.strictEqual(result.status, 204);

  result = await routeRequest(controller, 'GET', '/config');
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { path: '/tmp/config.json', data: { device: { name: 'Test' } } });

  result = await routeRequest(controller, 'PUT', '/config', { foo: 'bar' });
  assert.strictEqual(result.status, 204);

  result = await routeRequest(controller, 'POST', '/events', { characteristic: 'x' });
  assert.strictEqual(result.status, 202);

  result = await routeRequest(controller, 'GET', '/unknown');
  assert.strictEqual(result.status, 404);

  assert.deepStrictEqual(calls, [
    ['getHealth'],
    ['getState'],
    ['setState', { temperatureC: 25 }],
    ['getConfig'],
    ['setConfig', { foo: 'bar' }],
    ['onEvent', { characteristic: 'x' }],
  ]);
});

test('readJsonBody rejects invalid JSON payloads', async () => {
  const stream = Readable.from([Buffer.from('not-json')]);
  await assert.rejects(async () => {
    await readJsonBody(stream);
  }, (err) => {
    assert.strictEqual(err.statusCode, 400);
    assert.match(err.message, /Unexpected token/);
    return true;
  });
});
