import { MaxiCodeCore } from '../libs/MaxiCodeCore.js'
import { parseMaxiCodeRawInput } from '../libs/MaxiCodeRaw.js'
import { MaxiCodeSvgRenderer } from '../libs/MaxiCodeSvg.js'

const isCarrierMode = (options) => ['2', '3'].includes(options.maxiCodeMode)

export const maxiCodeFormat = {
  id: 'maxi-code',
  label: 'MaxiCode',
  filePrefix: 'maxi-code',
  defaults: {
    maxiCodeInputMode: 'text',
    maxiCodeMode: '4',
    maxiCodePostalCode: '',
    maxiCodeCountryCode: '840',
    maxiCodeServiceClass: '001',
  },
  fields: [
    {
      key: 'maxiCodeInputMode',
      label: 'MaxiCode Input',
      type: 'select',
      options: [['text', 'Text'], ['raw', 'Raw control escapes']],
      hint: 'Supports ~029 / <GS>, ~030 / <RS> and ~004 / <EOT>.',
    },
    {
      key: 'maxiCodeMode',
      label: 'MaxiCode Mode',
      type: 'select',
      options: [['4', 'Mode 4 - standard ECC'], ['5', 'Mode 5 - enhanced ECC'], ['2', 'Mode 2 - numeric postal'], ['3', 'Mode 3 - alphanumeric postal']],
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
  ],
  preserveWhitespace: (options) => options.maxiCodeInputMode === 'raw',
  inputLabel: (options) => options.maxiCodeInputMode === 'raw' ? 'Raw MaxiCode data' : 'Text',
  inputPlaceholder: (options) => options.maxiCodeInputMode === 'raw'
    ? '[)>~03001~02996TRACKING...~030~004'
    : 'Kurzer Text',
  preparePayload(payload, options) {
    return options.maxiCodeInputMode === 'raw' ? parseMaxiCodeRawInput(payload) : payload
  },
  createRenderer({ payload, size, options }) {
    const maxi = new MaxiCodeCore(payload, {
      mode: options.maxiCodeMode,
      preserveControls: options.maxiCodeInputMode === 'raw',
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
