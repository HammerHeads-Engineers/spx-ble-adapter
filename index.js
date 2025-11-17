#!/usr/bin/env node
const bleno = require('@abandonware/bleno');
const { createState } = require('./lib/state');
const { loadConfig } = require('./lib/config');
const { AdapterController } = require('./lib/controller');
const { createHttpServer } = require('./server/http');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const HTTP_PORT = Number.parseInt(process.env.HTTP_PORT || '8080', 10);
const HTTP_HOST = process.env.HTTP_HOST || '0.0.0.0';

let initialConfigData;
let initialConfigPath;
try {
  const { data, path: resolvedPath } = loadConfig();
  initialConfigData = data;
  initialConfigPath = resolvedPath;
  console.log('[CONFIG] loaded', initialConfigPath);
} catch (err) {
  console.error('[CONFIG] failed to load:', err.message);
  process.exit(1);
}

const state = createState(initialConfigData.state || {});
const controller = new AdapterController({
  bleno,
  state,
  configData: initialConfigData,
  configPath: initialConfigPath,
});

try {
  controller.init();
} catch (err) {
  console.error('[BLE] failed to build services:', err.message);
  process.exit(1);
}

bleno.on('stateChange', (stateChange) => {
  console.log('[BLE] state:', stateChange);
  if (stateChange === 'poweredOn') {
    if (!controller.hasServices()) {
      console.log('[BLE] no services configured yet – waiting for HTTP /config');
      return;
    }
    bleno.startAdvertising(controller.getDeviceName(), controller.getAdvertisedUuids(), (err) => {
      if (err) console.error('[BLE] adv error:', err);
      else console.log('[BLE] advertising as', controller.getDeviceName());
    });
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (err) return console.error('[BLE] advertisingStart error:', err);
  if (!controller.hasServices()) {
    console.log('[BLE] skip setServices – no services defined');
    return;
  }
  controller.applyServices()
    .then(() => console.log('[BLE] services set from config'))
    .catch((setErr) => console.error('[BLE] setServices error:', setErr));
});

// mały „oddech” wartości co 2s, jeśli mamy temperaturę w stanie
setInterval(() => {
  const current = state.get('temperatureC');
  if (typeof current === 'number' && !Number.isNaN(current)) {
    const drift = (Math.random() - 0.5) * 0.2;
    state.set('temperatureC', clamp(current + drift, -40, 125));
  }
}, 2000);

const httpServer = createHttpServer({
  port: HTTP_PORT,
  host: HTTP_HOST,
  controller,
});

httpServer.listen().then((port) => {
  console.log(`[HTTP] server listening on ${HTTP_HOST}:${port}`);
}).catch((err) => {
  console.error('[HTTP] failed to start server:', err);
  process.exit(1);
});
