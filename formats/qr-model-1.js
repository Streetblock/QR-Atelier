import { QrCore } from '../libs/QRcore.js'
import { QrSvgRenderer } from '../libs/QRsvg.js'

export const qrModel1Format = {
  id: 'qr-model-1',
  label: 'QR Code Model 1 (Legacy)',
  filePrefix: 'qr-model-1',
  capabilities: { dotStyle: true, cornerStyle: true, logo: false },
  createRenderer({ payload, size, options }) {
    const qr = new QrCore(payload, {
      errorCorrectionLevel: options.errorCorrectionLevel,
      model: 1,
      maxVersion: 14,
    }).generate()
    return new QrSvgRenderer(qr, { size, ...options, logo: null })
  },
}
