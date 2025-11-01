const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_RELATIVE = path.join('config', 'spx-sim.json');

function resolveConfigPath(envPath) {
  if (envPath) return path.resolve(envPath);
  return path.join(__dirname, '..', DEFAULT_CONFIG_RELATIVE);
}

function loadConfig(configPath = resolveConfigPath(process.env.BLE_DEVICE_CONFIG)) {
  const absolutePath = resolveConfigPath(configPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const config = JSON.parse(raw);

  if (!config.device || !config.device.name) {
    throw new Error('Config missing device.name');
  }
  if (!Array.isArray(config.services) || config.services.length === 0) {
    throw new Error('Config requires at least one service');
  }

  return { path: absolutePath, data: config };
}

module.exports = {
  resolveConfigPath,
  loadConfig,
};
