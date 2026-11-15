import assert from 'node:assert/strict';
import test from 'node:test';
import { MaxiCodeCore } from '../libs/MaxiCodeCore.js';

test('carrier secondary count shares exact mode 2/3 capacity and padding-latch decisions', () => {
  const cases = [
    ['', 0], ['A'.repeat(84), 84], ['A'.repeat(85), 85],
    ['123456789' + 'A'.repeat(78), 84],
    ['A'.repeat(82) + '\r\n', 85], ['\u00e0'.repeat(81), 84],
    ['ABC\x1d123456789\x1e\x04', 13],
  ];
  const modes = [
    { mode: 2, postalCode: '123450000', countryCode: '840', serviceClass: '001' },
    { mode: 3, postalCode: 'K1A0B1', countryCode: '124', serviceClass: '001' },
  ];
  for (const [secondary, codewords] of cases) {
    const fits = codewords <= 84;
    assert.deepEqual(MaxiCodeCore.measureCarrierSecondary(secondary), { codewords, capacity: 84, fits });
    for (const options of modes) {
      const generate = () => new MaxiCodeCore(secondary, { ...options, preserveControls: true }).generate();
      if (fits) assert.doesNotThrow(generate);
      else assert.throws(generate, /supports up to 84 codewords/);
    }
  }
});

test('carrier measurement preserves all controls and agrees with generation across set transitions', () => {
  const fragments = ['A', 'a', '\u00e0', '123456789', '\r\n', '\x1c\x1d\x1e\x04'];
  for (const fragment of fragments) {
    for (let repetitions = 0; repetitions <= 100; repetitions++) {
      const secondary = fragment.repeat(repetitions);
      const measured = MaxiCodeCore.measureCarrierSecondary(secondary);
      assert.equal(measured.fits, measured.codewords <= measured.capacity);
      const generate = () => new MaxiCodeCore(secondary, { mode: 3, postalCode: 'K1A0B1', countryCode: '124', serviceClass: '001', preserveControls: true }).generate();
      if (measured.fits) assert.doesNotThrow(generate);
      else assert.throws(generate, /supports up to 84 codewords/);
    }
  }
});

test('carrier measurement keeps invalid input separate from overflow', () => {
  for (const input of [null, undefined, 123, {}, ['A']]) assert.throws(() => MaxiCodeCore.measureCarrierSecondary(input), TypeError);
  for (const secondary of ['\u20ac', 'A'.repeat(85) + '\u20ac']) assert.throws(() => MaxiCodeCore.measureCarrierSecondary(secondary), /cannot be encoded as ISO-8859-1/);
});
