# spx-ble-adapter
SPX BLE Adapter: a lightweight service that exposes a configurable BLE peripheral controlled by SPX models. Via a simple HTTP/JSON Control API, SPX can define GATT services/characteristics and push values (Notify). macOS CoreBluetooth and Linux BlueZ backends supported. Ships as a standalone binary. Includes examples, OpenAPI spec, docs, and tests.

## Requirements
- Node.js 16.x (recommended by `@abandonware/bleno`)
- macOS with Bluetooth enabled and Terminal granted Bluetooth permission
- iOS device with a BLE client app (e.g. CoreBluetooth-based tester)

## Run locally
```bash
npm install
npm start
```

> On macOS you may need to run `sudo npm start` (or `sudo node index.js`) so CoreBluetooth can expose the peripheral.

## iOS testing notes
- Peripheral advertises as `SPX-Sim` (or `BLE_DEVICE_NAME` env override) with Environmental Sensing service `0x181A`.
- Temperature characteristic `0x2A6E` currently supports `read`. Live updates will require adding `notify` handling in a future iteration.
- Custom write characteristic (`f0c09111-8b3a-4e69-bdd0-9f0f613d1a90`) przyjmuje UTF-8. Zapis tekstu (np. `23.5`) jest parsowany do float, ograniczany do -40…125 °C i trafia do stanu adaptera.
- Kolejne wpisy w `onWrite` są wykonywane sekwencyjnie. Na tym etapie dane są jedynie logowane (`[BLE] emit event -> …`), aby łatwo podpiąć później wywołanie HTTP do SPX.

## Konfiguracja urządzenia
- Domyślna konfiguracja: `config/spx-sim.json`. Ścieżkę możesz nadpisać zmienną `BLE_DEVICE_CONFIG`.
- JSON opisuje nazwę (`device.name`), reklamowane usługi (`advertiseServiceUuids`), stan początkowy (`state.temperatureC`) i komplet usług/charakterystyk.
- Charakterystyka określa `properties`, sposób kodowania danych (`codec.format`, `scale`) oraz sekwencję akcji w `onWrite`, dzięki czemu adapter może logować, parsować i przekazywać dane dalej. (Na razie descriptor `0x2901`; `0x2904` dodamy po dopracowaniu wsparcia na macOS.)
- Nową konfigurację dodajesz, tworząc kolejny plik w `config/` i startując adapter z `BLE_DEVICE_CONFIG=/ścieżka/do/config.json npm start`.

## Tests
- Uruchom `npm test`, aby odpalić zestaw jednostkowy (`node --test`, wymagany Node 16.17+).
- Testy pokrywają: ładowanie konfiguracji (`lib/config`), obsługę stanu (`lib/state`), kodery/dekodery (`lib/codecs`), akcje `onWrite` (`lib/actions`) oraz budowanie usług GATT (`lib/build-services`).
