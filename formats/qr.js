import { QrCore } from '../libs/QRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

export const qrFormat = {
  id: 'qr',
  label: 'QR Code',
  filePrefix: 'qr-code',
  capabilities: { dotStyle: true, cornerStyle: true, logo: true },
  preserveWhitespace: () => true,
  createRenderer({ payload, size, options }) {
    const errorCorrectionLevel = options.logo ? 'H' : options.errorCorrectionLevel
    const { version = 0, mask = -1, encoding = 'utf-8' } = options
    const qr = new QrCore(payload, {
      errorCorrectionLevel,
      minVersion: version || 1,
      maxVersion: version || 40,
      mask,
      encoding,
    }).generate()
    return new QrSvgRenderer(qr, { size, ...options })
  },
}
