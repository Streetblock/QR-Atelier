import { FormatRegistry } from './FormatRegistry.js'
import { microQrFormat } from './microqr.js'
import { qrFormat } from './qr.js'

export const formatRegistry = new FormatRegistry([qrFormat, microQrFormat])
