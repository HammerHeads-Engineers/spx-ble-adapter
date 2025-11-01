const bleno = require('@abandonware/bleno');
const { loadConfig } = require('./lib/config');
const { createState } = require('./lib/state');
const { buildServices } = require('./lib/build-services');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

let configData;
let configPath;

try {
  const { data, path: resolvedPath } = loadConfig();
  configData = data;
  configPath = resolvedPath;
  console.log('[CONFIG] loaded', configPath);
} catch (err) {
  console.error('[CONFIG] failed to load:', err.message);
  process.exit(1);
}

const deviceName = process.env.BLE_DEVICE_NAME || configData.device.name;
const advertiseUuids = configData.device.advertiseServiceUuids || [];

const state = createState(configData.state || {});
let services;

try {
  services = buildServices(configData, state);
} catch (err) {
  console.error('[BLE] failed to build services:', err.message);
  process.exit(1);
}

bleno.on('stateChange', (stateChange) => {
  console.log('[BLE] state:', stateChange);
  if (stateChange === 'poweredOn') {
    bleno.startAdvertising(deviceName, advertiseUuids, (err) => {
      if (err) console.error('[BLE] adv error:', err);
      else console.log('[BLE] advertising as', deviceName);
    });
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', (err) => {
  if (err) return console.error('[BLE] advertisingStart error:', err);
  bleno.setServices(services, (setErr) => {
    if (setErr) console.error('[BLE] setServices error:', setErr);
    else console.log('[BLE] services set from config');
  });
});

// mały „oddech” wartości co 2s, jeśli mamy temperaturę w stanie
setInterval(() => {
  const current = state.get('temperatureC');
  if (typeof current === 'number' && !Number.isNaN(current)) {
    const drift = (Math.random() - 0.5) * 0.2;
    state.set('temperatureC', clamp(current + drift, -40, 125));
  }
}, 2000);
