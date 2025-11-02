const test = require('node:test');
const assert = require('node:assert');

const { encodeValue, decodeValue } = require('../lib/codecs');

test('encode/decode sint16 with scale', () => {
  const codec = { format: 'sint16', scale: 0.01 };
  const buffer = encodeValue(12.34, codec);
  assert.strictEqual(buffer.length, 2);
  assert.strictEqual(buffer.readInt16LE(0), 1234);

  const decoded = decodeValue(buffer, codec);
  assert.strictEqual(decoded, 12.34);
});

test('encode sint16 clamps to allowed range', () => {
  const codec = { format: 'sint16', scale: 1 };
  const buffer = encodeValue(99999, codec);
  assert.strictEqual(buffer.readInt16LE(0), 32767);

  const min = encodeValue(-99999, codec);
  assert.strictEqual(min.readInt16LE(0), -32768);
});

test('encode sint16 rejects NaN', () => {
  assert.throws(() => encodeValue(NaN, { format: 'sint16', scale: 1 }), /number/);
});

test('encode/decode utf8 strings', () => {
  const codec = { format: 'utf8' };
  const buffer = encodeValue('Hello', codec);
  assert.strictEqual(buffer.toString('utf8'), 'Hello');

  const decoded = decodeValue(buffer, codec);
  assert.strictEqual(decoded, 'Hello');
});

test('encode/decode float', () => {
  const codec = { format: 'float' };
  const buffer = encodeValue(12.5, codec);
  assert.strictEqual(buffer.length, 4);
  const decoded = decodeValue(buffer, codec);
  assert.ok(Math.abs(decoded - 12.5) < 1e-6);
});
