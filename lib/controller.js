const { buildServices } = require('./build-services');
const { loadConfig } = require('./config');

class AdapterController {
  constructor({ bleno, state, configData, configPath }) {
    this.bleno = bleno;
    this.state = state;
    this.configData = configData;
    this.configPath = configPath;
    this.services = [];
    this.lastConfigUpdated = new Date().toISOString();
  }

  init() {
    this.state.ensureDefaults(this.configData.state || {});
    this.services = buildServices(this.configData, this.state);
  }

  hasServices() {
    return Array.isArray(this.services) && this.services.length > 0;
  }

  getDeviceName() {
    return process.env.BLE_DEVICE_NAME || this.configData.device?.name || 'BLE-Adapter';
  }

  getAdvertisedUuids() {
    return this.configData.device?.advertiseServiceUuids || [];
  }

  async reloadConfig(rawConfig) {
    if (rawConfig) {
      this.configData = rawConfig;
      this.configPath = '[runtime]';
    } else {
      const { data, path } = loadConfig(this.configPath);
      this.configData = data;
      this.configPath = path;
    }
    this.state.ensureDefaults(this.configData.state || {});
    this.services = buildServices(this.configData, this.state);
    this.lastConfigUpdated = new Date().toISOString();

    if (this.bleno?.setServices) {
      await this.applyServices();
    }
  }

  async applyServices() {
    if (!this.bleno?.setServices) return;

    await new Promise((resolve, reject) => {
      this.bleno.setServices(this.services, (err) => (err ? reject(err) : resolve()));
    });
  }

  async restartAdvertising() {
    if (!this.bleno?.startAdvertising) return;

    await new Promise((resolve) => {
      if (!this.bleno?.stopAdvertising) return resolve();
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      this.bleno.stopAdvertising((err) => {
        if (err) console.warn('[BLE] stopAdvertising warning:', err);
        done();
      });
      setTimeout(done, 1500);
    });

    await this.applyServices();

    return new Promise((resolve, reject) => {
      this.bleno.startAdvertising(this.getDeviceName(), this.getAdvertisedUuids(), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getHealth() {
    return {
      status: 'ok',
      deviceName: this.getDeviceName(),
      configPath: this.configPath,
      lastConfigUpdated: this.lastConfigUpdated,
      stateKeys: Object.keys(this.state.snapshot()),
    };
  }

  async getState() {
    return this.state.snapshot();
  }

  async setState(partial) {
    this.state.setMany(partial || {});
  }

  async getConfig() {
    return {
      path: this.configPath,
      data: this.configData,
    };
  }

  async setConfig(config) {
    await this.reloadConfig(config);
    if (this.bleno?.state === 'poweredOn') {
      this.restartAdvertising()
        .then(() => console.log('[BLE] advertising restarted after config update'))
        .catch((err) => console.error('[BLE] restart advertising failed:', err));
    }
  }

  async onEvent(event) {
    // placeholder for SPA -> SPX event forwarding
    console.log('[EVENT] received:', event);
  }
}

module.exports = {
  AdapterController,
};
