import { MaxiCodeCore } from './MaxiCodeCore.js'

export const UPS_FORMAT_07_ALPHABET = "\rABCDEFGHIJKLMNOPQRSTUVWXYZ\x1c\x1d \"#$%&'()*+,-./0123456789:"

const GS = '\x1d'
const RS = '\x1e'
const EOT = '\x04'
const FORMAT_07_VERSION = '07'
const FORMAT_07_SYMBOL_COUNT = 45
const FORMAT_07_BYTE_COUNT = 32

export function encodeUpsFormat07Transport(source) {
  const bytes = normalizeTransportBytes(source)
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)

  let payload = ''
  for (let index = 0; index < FORMAT_07_SYMBOL_COUNT; index += 1) {
    const digit = Number(value % 55n)
    payload += UPS_FORMAT_07_ALPHABET[digit]
    value /= 55n
  }
  if (value !== 0n) throw new Error('UPS Format 07 transport exceeds 45 base-55 symbols.')
  return payload
}

export function normalizeUpsFormat07Payload(source) {
  let payload = String(source ?? '')
  if (payload.startsWith(FORMAT_07_VERSION) && payload.length === FORMAT_07_SYMBOL_COUNT + 2) {
    payload = payload.slice(2)
  }
  if (payload.length !== FORMAT_07_SYMBOL_COUNT) {
    throw new Error(`UPS Format 07 payload must contain exactly ${FORMAT_07_SYMBOL_COUNT} symbols.`)
  }
  for (const symbol of payload) {
    if (!UPS_FORMAT_07_ALPHABET.includes(symbol)) {
      throw new Error(`UPS Format 07 payload contains an invalid symbol: ${JSON.stringify(symbol)}.`)
    }
  }
  return payload
}

export function buildUpsMaxiCodeSecondary(options = {}) {
  const trackingNumber = normalizeAnField(options.trackingNumber, 'tracking number', 10)
  const scac = normalizeAnField(options.scac ?? 'UPSN', 'SCAC', 4)
  const shipperId = normalizeAnField(options.shipperId, 'shipper ID', 6)
  const format07Payload = resolveFormat07Payload(options)

  return `[)>${RS}01${GS}96${trackingNumber}${GS}${scac}${GS}${shipperId}`
    + `${RS}${FORMAT_07_VERSION}${format07Payload}${RS}${EOT}`
}

export class UpsMaxiCodeEncoder {
  constructor(options = {}) {
    this.options = { ...options }
  }

  generate() {
    const mode = Number(this.options.mode)
    if (mode !== 2 && mode !== 3) {
      throw new Error('UPS Format 07 MaxiCode requires mode 2 or mode 3.')
    }
    const format07Payload = resolveFormat07Payload(this.options)
    const secondaryMessage = buildUpsMaxiCodeSecondary({ ...this.options, format07Payload, format07Bytes: undefined })
    const generated = new MaxiCodeCore(secondaryMessage, {
      mode,
      preserveControls: true,
      postalCode: this.options.postalCode,
      countryCode: this.options.countryCode,
      serviceClass: this.options.serviceClass,
    }).generate()

    return {
      ...generated,
      secondaryMessage,
      format07Payload,
    }
  }
}

function resolveFormat07Payload(options) {
  if (options.format07Payload !== undefined && options.format07Bytes !== undefined) {
    throw new Error('Provide either format07Payload or format07Bytes, not both.')
  }
  return options.format07Bytes !== undefined
    ? encodeUpsFormat07Transport(options.format07Bytes)
    : normalizeUpsFormat07Payload(options.format07Payload)
}

function normalizeTransportBytes(source) {
  if (!(source instanceof Uint8Array) && !Array.isArray(source)) {
    throw new TypeError('UPS Format 07 transport must be a Uint8Array or an array of byte values.')
  }
  const bytes = Uint8Array.from(source)
  if (bytes.length !== FORMAT_07_BYTE_COUNT) {
    throw new Error(`UPS Format 07 transport must contain exactly ${FORMAT_07_BYTE_COUNT} bytes.`)
  }
  if ([...source].some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('UPS Format 07 transport contains an invalid byte value.')
  }
  return bytes
}

function normalizeAnField(value, label, length) {
  const normalized = String(value ?? '').toUpperCase()
  if (!new RegExp(`^[A-Z0-9]{${length}}$`).test(normalized)) {
    throw new Error(`UPS ${label} must contain exactly ${length} alphanumeric characters.`)
  }
  return normalized
}
