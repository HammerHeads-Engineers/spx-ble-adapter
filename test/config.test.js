const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadConfig } = require('../lib/config');

function createTempConfig(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spx-config-'));
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(file, JSON.stringify(contents, null, 2), 'utf8');
  return { dir, file };
}

test('loadConfig reads configuration file', (t) => {
  const { dir, file } = createTempConfig({
    device: { name: 'TestDevice', advertiseServiceUuids: [] },
    services: [
      {
        uuid: '1234',
        characteristics: [
          {
            uuid: 'abcd',
            properties: ['read'],
            value: { source: 'literal', value: 1 },
            codec: { format: 'sint16', scale: 1 },
          },
        ],
      },
    ],
  });

  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { data, path: resolvedPath } = loadConfig(file);
  assert.strictEqual(resolvedPath, file);
  assert.strictEqual(data.device.name, 'TestDevice');
  assert.strictEqual(data.services.length, 1);
});

test('loadConfig throws when device.name missing', (t) => {
  const { dir, file } = createTempConfig({
    device: {},
    services: [],
  });

  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  assert.throws(() => loadConfig(file), /device\.name/);
});
