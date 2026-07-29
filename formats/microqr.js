import { MicroQrCore } from '../libs/MicroQRcore.js'
import { MicroQrSvgRenderer } from '../libs/MicroQRsvg.js'

const VERSIONS = ['M1', 'M2', 'M3', 'M4']

export const microQrFormat = {
  id: 'microqr',
  label: 'Micro QR',
  filePrefix: 'micro-qr-code',
  defaults: {
    microErrorCorrectionLevel: 'L',
    microMinVersion: 'M1',
    microMaxVersion: 'M4',
    microByteEncoding: 'latin1',
    microPreferredMode: 'auto',
  },
  capabilities: { dotStyle: true },
  fields: [
    selectField('microErrorCorrectionLevel', 'Micro ECL', [
      ['L', 'L'], ['M', 'M'], ['Q', 'Q'], ['NONE', 'NONE (nur M1)'],
    ]),
    selectField('microMinVersion', 'Min Version', VERSIONS.map((value) => [value, value])),
    selectField('microMaxVersion', 'Max Version', VERSIONS.map((value) => [value, value])),
    selectField('microPreferredMode', 'Micro Mode', [
      ['auto', 'auto'], ['numeric', 'numeric'], ['alphanumeric', 'alphanumeric'], ['byte', 'byte'], ['kanji', 'kanji'],
    ]),
    {
      ...selectField('microByteEncoding', 'Byte Encoding', [
        ['latin1', 'latin1 (Default)'], ['utf8', 'utf8'], ['windows-1252', 'windows-1252'], ['shift-jis', 'shift_jis'],
      ]),
      hint: 'latin1 is the compact interoperability default; UTF-8 may require more capacity, while Japanese data is best encoded with shift_jis and Kanji mode.',
    },
  ],
  createRenderer({ payload, size, options }) {
    const micro = new MicroQrCore(payload, {
      errorCorrectionLevel: options.microErrorCorrectionLevel,
      minVersion: options.microMinVersion,
      maxVersion: options.microMaxVersion,
      byteEncoding: options.microByteEncoding,
      preferredMode: options.microPreferredMode,
    }).generate()
    return new MicroQrSvgRenderer(micro, {
      size,
      margin: 8,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
      dotStyle: options.dotStyle,
    })
  },
}

function selectField(key, label, options) {
  return { key, label, type: 'select', options }
}
