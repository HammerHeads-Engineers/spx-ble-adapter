const bleno = require('@abandonware/bleno');
const { encodeValue, decodeValue } = require('./codecs');
const { runActions } = require('./actions');

const PRESENTATION_FORMATS = {
  boolean: 0x01,
  uint8: 0x04,
  uint16: 0x06,
  uint24: 0x07,
  uint32: 0x08,
  uint48: 0x09,
  uint64: 0x0a,
  uint128: 0x0b,
  sint8: 0x0c,
  sint16: 0x0e,
  sint24: 0x0f,
  sint32: 0x10,
  float32: 0x14,
  float64: 0x15,
  utf8: 0x19,
};

const UNIT_CODES = {
  celsius: 0x272f,
};

function normalizeUuid(uuid) {
  return String(uuid).toLowerCase();
}

function resolveValue(valueConfig, state) {
  if (!valueConfig) return undefined;

  switch (valueConfig.source) {
    case 'state':
      return state.get(valueConfig.key, valueConfig.default);
    case 'literal':
      return valueConfig.value;
    default:
      throw new Error(`Unsupported value source: ${valueConfig.source}`);
  }
}

function buildDescriptorValue(descriptor) {
  const uuid = normalizeUuid(descriptor.uuid);
  const value = descriptor.value;

  if (uuid === '2904' && value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const formatCode = typeof value.format === 'number'
      ? value.format
      : PRESENTATION_FORMATS[value.format];
    if (formatCode === undefined) {
      throw new Error(`Unsupported presentation format: ${value.format}`);
    }

    const unitCode = typeof value.unit === 'number'
      ? value.unit
      : UNIT_CODES[value.unit] || 0;

    const exponent = value.exponent || 0;
    const namespace = value.namespace || 1;
    const description = value.description || 0;

    const buf = Buffer.alloc(7);
    buf.writeUInt8(formatCode, 0);
    buf.writeInt8(exponent, 1);
    buf.writeUInt16LE(unitCode, 2);
    buf.writeUInt8(namespace, 4);
    buf.writeUInt16LE(description, 5);
    return buf;
  }

  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return Buffer.from(value);
  if (typeof value === 'number') {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(value >>> 0, 0);
    return buf;
  }
  if (value === null || value === undefined) return Buffer.alloc(0);
  return String(value);
}

function buildCharacteristics(serviceConfig, config, state) {
  const deviceName = config.device.name;

  return serviceConfig.characteristics.map((charConfig) => {
    const properties = charConfig.properties || [];
    const descriptors = (charConfig.descriptors || []).map(
      (descriptor) => new bleno.Descriptor({
        uuid: normalizeUuid(descriptor.uuid),
        value: buildDescriptorValue(descriptor),
      }),
    );

    const options = {
      uuid: normalizeUuid(charConfig.uuid),
      properties,
      descriptors,
    };

    if (properties.includes('read')) {
      options.onReadRequest = (offset, callback) => {
        if (offset) return callback(bleno.Characteristic.RESULT_ATTR_NOT_LONG);
        try {
          const resolvedValue = resolveValue(charConfig.value, state);
          const buffer = encodeValue(resolvedValue, charConfig.codec || {});
          return callback(bleno.Characteristic.RESULT_SUCCESS, buffer);
        } catch (err) {
          console.error(`[BLE] read error (${charConfig.uuid}):`, err.message);
          return callback(bleno.Characteristic.RESULT_UNLIKELY_ERROR);
        }
      };
    }

    if (properties.includes('write') || properties.includes('writeWithoutResponse')) {
      options.onWriteRequest = (data, offset, withoutResponse, callback) => {
        if (offset) return callback(bleno.Characteristic.RESULT_ATTR_NOT_LONG);
        try {
          const decodedValue = charConfig.codec
            ? decodeValue(data, charConfig.codec)
            : data;

          runActions(charConfig.onWrite || [], {
            deviceName,
            serviceUuid: serviceConfig.uuid,
            uuid: charConfig.uuid,
            characteristicName: charConfig.name,
            value: decodedValue,
            parsed: undefined,
            state,
          });
          return callback(bleno.Characteristic.RESULT_SUCCESS);
        } catch (err) {
          console.error(`[BLE] write error (${charConfig.uuid}):`, err.message);
          return callback(bleno.Characteristic.RESULT_UNLIKELY_ERROR);
        }
      };
    }

    return new bleno.Characteristic(options);
  });
}

function buildServices(config, state) {
  return config.services.map(
    (serviceConfig) => new bleno.PrimaryService({
      uuid: normalizeUuid(serviceConfig.uuid),
      characteristics: buildCharacteristics(serviceConfig, config, state),
    }),
  );
}

module.exports = {
  buildServices,
};
