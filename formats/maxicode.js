import { MaxiCodeCore } from '../libs/MaxiCodeCore.js'
import { parseMaxiCodeRawInput } from '../libs/MaxiCodeRaw.js'
import { MaxiCodeSvgRenderer } from '../libs/MaxiCodeSvg.js'
import { buildUpsMaxiCodeSecondary } from '../libs/UpsMaxiCode.js'

const isCarrierMode = (options) => ['2', '3'].includes(options.maxiCodeMode)
const usesStructuredAppend = (options) => Number(options.maxiCodeStructuredAppendCount) > 1
const isUpsFormat07 = (options) => options.maxiCodeInputMode === 'ups-format-07'

export const maxiCodeFormat = {
  id: 'maxi-code',
  label: 'MaxiCode',
  filePrefix: 'maxi-code',
  defaults: {
    maxiCodeInputMode: 'text',
    maxiCodeMode: '4',
    maxiCodeEncoding: 'iso-8859-1',
    maxiCodeStructuredAppendCount: '1',
    maxiCodeStructuredAppendIndex: '1',
    maxiCodePostalCode: '',
    maxiCodeCountryCode: '840',
    maxiCodeServiceClass: '001',
    maxiCodeUpsTrackingNumber: '1Z50147020',
    maxiCodeUpsScac: 'UPSN',
    maxiCodeUpsShipperId: '123A7V',
  },
  fields: [
    {
      key: 'maxiCodeInputMode',
      label: 'MaxiCode Input',
      type: 'select',
      options: [['text', 'Text'], ['raw', 'Raw control escapes'], ['ups-format-07', 'UPS Format 07 transport']],
      hint: 'Supports ~029 / <GS>, ~030 / <RS> and ~004 / <EOT>.',
      update(value, options) {
        if (value !== 'ups-format-07' || isCarrierMode(options)) return { maxiCodeInputMode: value }
        return {
          maxiCodeInputMode: value,
          maxiCodeMode: '2',
          maxiCodePostalCode: /^\d{1,9}$/.test(options.maxiCodePostalCode) ? options.maxiCodePostalCode : '336091062',
        }
      },
    },
    {
      key: 'maxiCodeMode',
      label: 'MaxiCode Mode',
      type: 'select',
      options: [['4', 'Mode 4 - standard ECC'], ['5', 'Mode 5 - enhanced ECC'], ['6', 'Mode 6 - reader programming'], ['2', 'Mode 2 - numeric postal'], ['3', 'Mode 3 - alphanumeric postal']],
      hint: 'Mode 6 contains scanner configuration commands, not ordinary scan data.',
      update(value, options) {
        let postalCode = options.maxiCodePostalCode
        if (value === '2' && !/^\d{1,9}$/.test(postalCode)) postalCode = '336091062'
        if (value === '3' && !/^[A-Z0-9 ]{6}$/.test(postalCode)) postalCode = 'K1A0B1'
        return { maxiCodeMode: value, maxiCodePostalCode: postalCode }
      },
    },
    {
      key: 'maxiCodePostalCode',
      label: (options) => options.maxiCodeMode === '2' ? 'Postal code (1-9 digits)' : 'Postal code (6 AN)',
      type: 'text',
      visible: isCarrierMode,
      normalize: (value) => value.toUpperCase(),
      placeholder: (options) => options.maxiCodeMode === '2' ? '336091062' : 'K1A0B1',
    },
    {
      key: 'maxiCodeCountryCode',
      label: 'ISO country code',
      type: 'text',
      visible: isCarrierMode,
      attributes: { inputmode: 'numeric', maxlength: '3' },
    },
    {
      key: 'maxiCodeServiceClass',
      label: 'Service class',
      type: 'text',
      visible: isCarrierMode,
      attributes: { inputmode: 'numeric', maxlength: '3' },
      hint: 'Mode 2/3 primary fields are packed into the dedicated Primary Message.',
    },
    {
      key: 'maxiCodeEncoding',
      label: 'Text encoding',
      type: 'select',
      options: [['iso-8859-1', 'ISO-8859-1 (default ECI)'], ['utf-8', 'UTF-8 (ECI 26)']],
      hint: 'UTF-8 adds ECI 26 and encodes the input as UTF-8 bytes.',
    },
    {
      key: 'maxiCodeStructuredAppendCount',
      label: 'Structured Append symbols',
      type: 'select',
      options: [['1', 'Single symbol'], ...Array.from({ length: 7 }, (_, index) => {
        const count = String(index + 2)
        return [count, `${count} symbols`]
      })],
      update(value, options) {
        return {
          maxiCodeStructuredAppendCount: value,
          maxiCodeStructuredAppendIndex: String(Math.min(Number(options.maxiCodeStructuredAppendIndex), Number(value))),
        }
      },
    },
    {
      key: 'maxiCodeStructuredAppendIndex',
      label: 'Symbol position',
      type: 'select',
      visible: usesStructuredAppend,
      options: Array.from({ length: 8 }, (_, index) => {
        const position = String(index + 1)
        return [position, position]
      }),
      hint: 'Positions are numbered from 1; the position cannot exceed the symbol count.',
      update(value, options) {
        return {
          maxiCodeStructuredAppendIndex: String(Math.min(Number(value), Number(options.maxiCodeStructuredAppendCount))),
        }
      },
    },
    {
      key: 'maxiCodeUpsTrackingNumber',
      label: 'UPS tracking fragment',
      type: 'text',
      visible: isUpsFormat07,
      normalize: (value) => value.toUpperCase(),
      attributes: { maxlength: '10' },
    },
    {
      key: 'maxiCodeUpsScac',
      label: 'Carrier SCAC',
      type: 'text',
      visible: isUpsFormat07,
      normalize: (value) => value.toUpperCase(),
      attributes: { maxlength: '4' },
    },
    {
      key: 'maxiCodeUpsShipperId',
      label: 'UPS shipper ID',
      type: 'text',
      visible: isUpsFormat07,
      normalize: (value) => value.toUpperCase(),
      attributes: { maxlength: '6' },
      hint: 'Postal code, country and service class remain in the MaxiCode Primary Message.',
    },
  ],
  preserveWhitespace: (options) => options.maxiCodeInputMode !== 'text',
  inputLabel: (options) => options.maxiCodeInputMode === 'raw'
    ? 'Raw MaxiCode data'
    : options.maxiCodeInputMode === 'ups-format-07' ? 'Format 07 transport (45 symbols)' : 'Text',
  inputPlaceholder: (options) => options.maxiCodeInputMode === 'raw'
    ? '[)>~03001~02996TRACKING...~030~004'
    : options.maxiCodeInputMode === 'ups-format-07'
      ? '684Q.0KG3Z2AQ0$$1$OIXZWA14CGIO%K FZ( GPF9VEL~013'
      : 'Kurzer Text',
  preparePayload(payload, options) {
    if (options.maxiCodeInputMode === 'raw') return parseMaxiCodeRawInput(payload)
    if (options.maxiCodeInputMode === 'ups-format-07') {
      if (!isCarrierMode(options)) throw new Error('UPS Format 07 requires MaxiCode mode 2 or mode 3.')
      return buildUpsMaxiCodeSecondary({
        format07Payload: parseMaxiCodeRawInput(payload),
        trackingNumber: options.maxiCodeUpsTrackingNumber,
        scac: options.maxiCodeUpsScac,
        shipperId: options.maxiCodeUpsShipperId,
      })
    }
    return payload
  },
  createRenderer({ payload, size, options }) {
    const maxi = new MaxiCodeCore(payload, {
      mode: options.maxiCodeMode,
      encoding: options.maxiCodeEncoding,
      structuredAppend: usesStructuredAppend(options) ? {
        index: options.maxiCodeStructuredAppendIndex,
        count: options.maxiCodeStructuredAppendCount,
      } : undefined,
      preserveControls: options.maxiCodeInputMode !== 'text',
      postalCode: options.maxiCodePostalCode,
      countryCode: options.maxiCodeCountryCode,
      serviceClass: options.maxiCodeServiceClass,
    }).generate()
    return new MaxiCodeSvgRenderer(maxi, {
      size,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
    })
  },
}
