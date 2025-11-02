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
- Domyślna konfiguracja: `config/default.json` (pusty adapter, brak reklam, czeka na `PUT /config`). Ścieżkę możesz nadpisać zmienną `BLE_DEVICE_CONFIG`.
- Przykładowy profil `config/template-spx-sim.json` odpowiada dawnemu POC z temperaturą.
- JSON opisuje nazwę (`device.name`), reklamowane usługi (`advertiseServiceUuids`), stan początkowy (`state.temperatureC`) i komplet usług/charakterystyk.
- Charakterystyka określa `properties`, sposób kodowania danych (`codec.format`, `scale`) oraz sekwencję akcji w `onWrite`, dzięki czemu adapter może logować, parsować i przekazywać dane dalej. (Na razie descriptor `0x2901`; `0x2904` dodamy po dopracowaniu wsparcia na macOS.)
- Gdy `properties` zawierają `notify`, można ustawić pole `notify`:
  ```json
  "notify": {
    "triggers": ["state", "timer"], // domyślnie ["state"]
    "intervalMs": 1000              // dla triggera timer (opcjonalnie)
  }
  ```
  Domyślnie adapter wysyła powiadomienie po każdej zmianie stanu (np. `PUT /state`). Dodanie `timer` powoduje okresowe publikacje niezależnie od zmian.
- Nową konfigurację dodajesz, tworząc kolejny plik w `config/` i startując adapter z `BLE_DEVICE_CONFIG=/ścieżka/do/config.json npm start`.

## HTTP API
- Serwer HTTP startuje domyślnie na `0.0.0.0:8080` (zmienne `HTTP_HOST`, `HTTP_PORT`).
- Dostępne endpointy:
  - `GET /health` – status adaptera, nazwa urządzenia, ostatnia aktualizacja konfiguracji.
  - `GET /config` – aktualna konfiguracja (ścieżka + dane JSON).
  - `PUT /config` – runtime'owa aktualizacja konfiguracji BLE (adapter przeładowuje usługi i wznawia reklamowanie).
  - `GET /state` – zrzut bieżącego stanu (klucze z sekcji `state`).
  - `PUT /state` – masowa aktualizacja stanu (np. `{"temperatureC": 23.5}`).
  - `POST /events` – punkt wejściowy dla zdarzeń z BLE → SPX (na razie logowane lokalnie).

## Tests
- Uruchom `npm test`, aby odpalić zestaw jednostkowy (`node --test`, wymagany Node 16.17+).
- Testy pokrywają: ładowanie konfiguracji (`lib/config`), obsługę stanu (`lib/state`), kodery/dekodery (`lib/codecs`), akcje `onWrite` (`lib/actions`), budowanie usług GATT (`lib/build-services`) oraz routing serwera HTTP (`server/http`).
