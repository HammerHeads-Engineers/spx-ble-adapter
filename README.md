# spx-ble-adapter
SPX BLE Adapter is a lightweight service that exposes a configurable BLE peripheral controlled by SPX models. Through a simple HTTP/JSON Control API, SPX can define GATT services/characteristics and push values (Notify). macOS CoreBluetooth and Linux BlueZ backends are supported. Ships as a standalone binary with examples, OpenAPI spec, docs, and tests.

## Requirements
- Node.js 16.x (as recommended by `@abandonware/bleno`)
- macOS with Bluetooth enabled and Terminal granted Bluetooth permission
- iOS device with a BLE client app (for testing)

## Run locally
```bash
npm install
npm start
```

> On macOS you may need `sudo npm start` (or `sudo node index.js`) so CoreBluetooth can expose the peripheral.

## iOS testing notes
- Peripheral advertises as `SPX-Sim` (or `BLE_DEVICE_NAME` env override) with Environmental Sensing service `0x181A`.
- Temperature characteristic `0x2A6E` currently supports `read`. Live updates will require adding `notify` handling in a later iteration.
- Custom write characteristic (`f0c09111-8b3a-4e69-bdd0-9f0f613d1a90`) accepts UTF-8. Text writes (e.g. `23.5`) are parsed to float, clamped to -40…125 °C, and stored in adapter state.
- `onWrite` actions run sequentially. Right now they only log (`[BLE] emit event -> …`) to make it easy to hook an HTTP call to SPX later.

## Device configuration
- Default config: `config/default.json` (empty adapter, no advertising, waits for `PUT /config`). Override path with `BLE_DEVICE_CONFIG`.
- Example profile: `config/template-spx-sim.json` matches the classic temperature POC.
- JSON defines device name (`device.name`), advertised UUIDs (`advertiseServiceUuids`), initial state (`state.temperatureC`), and the full list of services/characteristics.
- Each characteristic defines `properties`, data encoding (`codec.format`, `scale`), and a sequence of `onWrite` actions so the adapter can log, parse, and forward data. (Currently descriptor `0x2901`; `0x2904` can be added once macOS support is polished.)
- When `properties` include `notify`, set `notify` to control behavior:
  ```json
  "notify": {
    "triggers": ["state", "timer"], // default ["state"]
    "intervalMs": 1000              // for timer trigger (optional)
  }
  ```
  By default the adapter notifies on every state change (e.g. `PUT /state`). Adding `timer` enables periodic publishes regardless of state changes.
- To load a custom config, add a file under `config/` and start with `BLE_DEVICE_CONFIG=/path/to/config.json npm start`.

## HTTP API
- HTTP server binds `0.0.0.0:8080` by default (`HTTP_HOST`, `HTTP_PORT` can override).
- Endpoints:
  - `GET /health` – adapter status, device name, last config update.
  - `GET /config` – current config (path + JSON data).
  - `PUT /config` – runtime BLE config update (rebuilds services, restarts advertising).
  - `GET /state` – dump of current state (keys from `state` section).
  - `PUT /state` – bulk state update (e.g. `{"temperatureC": 23.5}`).
  - `POST /events` – ingress for BLE → SPX events (currently logged locally).

## Tests
- Run `npm test` to execute the unit suite (`node --test`, Node 16.17+ required).
- Coverage includes: config loading (`lib/config`), state handling (`lib/state`), codecs (`lib/codecs`), `onWrite` actions (`lib/actions`), GATT service build (`lib/build-services`), and HTTP routing (`server/http`).
