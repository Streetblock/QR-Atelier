import assert from 'node:assert/strict'
import test from 'node:test'
import {
  UpsMaxiCodeEncoder,
  buildUpsMaxiCodeSecondary,
  encodeUpsFormat07Transport,
  normalizeUpsFormat07Payload,
} from '../libs/UpsMaxiCode.js'

// KORSCHENBROICH<GS><GS>DON-BOSCO-STRASSE 2-4<GS>GYKO, encoded in exactly 252 substitution bits.
const PAYLOAD = '684Q.0KG3Z2AQ0$$1$OIXZWA14CGIO%K FZ( GPF9VEL\r'
const TRANSPORT_HEX = '125184be1fb50be42467c3f76a23149fcc77c319398ff7c0b1189e7737ab44a3'
const TRANSPORT_BYTES = Uint8Array.from(TRANSPORT_HEX.match(/../g), (value) => Number.parseInt(value, 16))

test('recreates a synthetic exact-length Format 07 transport vector from 32 bytes', () => {
  assert.equal(encodeUpsFormat07Transport(TRANSPORT_BYTES), PAYLOAD)
  assert.equal(normalizeUpsFormat07Payload(`07${PAYLOAD}`), PAYLOAD)
})

test('builds the Mode 2/3 secondary message without duplicating primary fields', () => {
  const secondary = buildUpsMaxiCodeSecondary({
    trackingNumber: '1z50147020',
    scac: 'upsn',
    shipperId: '123a7v',
    format07Payload: PAYLOAD,
  })

  assert.equal(
    secondary,
    `[)>\x1e01\x1d961Z50147020\x1dUPSN\x1d123A7V\x1e07${PAYLOAD}\x1e\x04`,
  )
  assert.equal(secondary.includes('\x1d276\x1d068\x1d'), false)
})

test('generates complete Mode 2 and Mode 3 symbols from Format 07 transport', () => {
  const cases = [
    { mode: 2, postalCode: '41352' },
    { mode: 3, postalCode: 'K1A0B1' },
  ]
  for (const options of cases) {
    const result = new UpsMaxiCodeEncoder({
      ...options,
      countryCode: '276',
      serviceClass: '068',
      trackingNumber: '1Z50147020',
      scac: 'UPSN',
      shipperId: '123A7V',
      format07Bytes: TRANSPORT_BYTES,
    }).generate()

    assert.equal(result.mode, options.mode)
    assert.equal(result.codewords.length, 144)
    assert.equal(result.format07Payload, PAYLOAD)
    assert.equal(result.secondaryMessage.includes(`07${PAYLOAD}`), true)
  }
})

test('validates Format 07 transport and UPS routing fields', () => {
  assert.throws(() => encodeUpsFormat07Transport(new Uint8Array(31)), /exactly 32 bytes/)
  assert.throws(() => normalizeUpsFormat07Payload('A'.repeat(44)), /exactly 45 symbols/)
  assert.throws(() => normalizeUpsFormat07Payload('A'.repeat(44) + '@'), /invalid symbol/)
  assert.throws(
    () => buildUpsMaxiCodeSecondary({ trackingNumber: 'SHORT', scac: 'UPSN', shipperId: '123A7V', format07Payload: PAYLOAD }),
    /tracking number must contain exactly 10/,
  )
  assert.throws(
    () => new UpsMaxiCodeEncoder({ mode: 4, trackingNumber: '1Z50147020', scac: 'UPSN', shipperId: '123A7V', format07Payload: PAYLOAD }).generate(),
    /requires mode 2 or mode 3/,
  )
  assert.throws(
    () => buildUpsMaxiCodeSecondary({
      trackingNumber: '1Z50147020',
      scac: 'UPSN',
      shipperId: '123A7V',
      format07Payload: PAYLOAD,
      format07Bytes: TRANSPORT_BYTES,
    }),
    /either format07Payload or format07Bytes/,
  )
})
