import { FormatRegistry } from './FormatRegistry.js'
import { aztecFormat } from './aztec.js'
import { dataMatrixFormat } from './datamatrix.js'
import { maxiCodeFormat } from './maxicode.js'
import { microQrFormat } from './microqr.js'
import { qrFormat } from './qr.js'

export const formatRegistry = new FormatRegistry([qrFormat, microQrFormat, dataMatrixFormat, aztecFormat, maxiCodeFormat])
