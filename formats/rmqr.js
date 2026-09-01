import { RMqrCore, RMQR_VERSIONS } from '../libs/RMQRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

const VERSION_OPTIONS = [['auto', 'Auto'], ...RMQR_VERSIONS.map(({ name }) => [name, name])]

export const rmqrFormat = {
  id: 'rmqr',
  label: 'Rectangular Micro QR (rMQR)',
  filePrefix: 'rmqr-code',
  defaults: {
    rmqrErrorCorrectionLevel: 'M',
    rmqrVersion: 'auto',
    rmqrMode: 'auto',
    rmqrEncoding: 'utf-8',
  },
  capabilities: { dotStyle: false, cornerStyle: false, logo: false },
  fields: [
    selectField('rmqrErrorCorrectionLevel', 'rMQR ECL', [['M', 'M'], ['H', 'H']]),
    selectField('rmqrVersion', 'rMQR Version', VERSION_OPTIONS),
    selectField('rmqrMode', 'rMQR Mode', [
      ['auto', 'auto'], ['numeric', 'numeric'], ['alphanumeric', 'alphanumeric'], ['byte', 'byte'],
    ]),
    selectField('rmqrEncoding', 'rMQR Encoding', [
      ['utf-8', 'UTF-8'], ['iso-8859-1', 'ISO-8859-1'], ['windows-1252', 'Windows-1252'],
    ]),
  ],
  createRenderer({ payload, size, options }) {
    const symbol = new RMqrCore(payload, {
      errorCorrectionLevel: options.rmqrErrorCorrectionLevel,
      version: options.rmqrVersion,
      mode: options.rmqrMode,
      encoding: options.rmqrEncoding,
    }).generate()
    return new QrSvgRenderer(symbol, {
      size,
      margin: 2,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
      dotStyle: 'square',
      logo: null,
    })
  },
}

function selectField(key, label, options) {
  return { key, label, type: 'select', options }
}
