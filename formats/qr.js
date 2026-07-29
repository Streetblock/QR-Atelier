import { QrCore } from '../libs/QRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

export const qrFormat = {
  id: 'qr',
  label: 'QR Code',
  filePrefix: 'qr-code',
  capabilities: { dotStyle: true, cornerStyle: true, logo: true },
  createRenderer({ payload, size, options }) {
    const errorCorrectionLevel = options.logo ? 'H' : options.errorCorrectionLevel
    const qr = new QrCore(payload, { errorCorrectionLevel }).generate()
    return new QrSvgRenderer(qr, { size, ...options })
  },
}
