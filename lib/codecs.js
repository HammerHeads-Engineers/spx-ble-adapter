const FORMATTERS = {
  sint16: {
    encode(value, options = {}) {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new TypeError('sint16 encoder expects a number');
      }
      const scale = options.scale || 1;
      if (scale === 0) throw new Error('sint16 encoder scale cannot be zero');
      const scaled = Math.round(value / scale);
      const clamped = Math.max(-32768, Math.min(32767, scaled));
      const buf = Buffer.alloc(2);
      buf.writeInt16LE(clamped, 0);
      return buf;
    },
    decode(buffer, options = {}) {
      if (!Buffer.isBuffer(buffer) || buffer.length < 2) {
        throw new TypeError('sint16 decoder expects a buffer (>=2 bytes)');
      }
      const scale = options.scale || 1;
      const raw = buffer.readInt16LE(0);
      return raw * scale;
    },
  },
  utf8: {
    encode(value) {
      if (value === undefined || value === null) return Buffer.alloc(0);
      return Buffer.from(String(value), 'utf8');
    },
    decode(buffer) {
      if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('utf8 decoder expects a buffer');
      }
      return buffer.toString('utf8');
    },
  },
};

function encodeValue(value, codec = {}) {
  const formatter = FORMATTERS[codec.format];
  if (!formatter || typeof formatter.encode !== 'function') {
    throw new Error(`Unsupported codec format: ${codec.format}`);
  }
  return formatter.encode(value, codec);
}

function decodeValue(buffer, codec = {}) {
  const formatter = FORMATTERS[codec.format];
  if (!formatter || typeof formatter.decode !== 'function') {
    throw new Error(`Unsupported codec format: ${codec.format}`);
  }
  return formatter.decode(buffer, codec);
}

module.exports = {
  encodeValue,
  decodeValue,
};
