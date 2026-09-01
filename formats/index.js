import { FormatRegistry } from './FormatRegistry.js'
import { aztecFormat } from './aztec.js'
import { dataMatrixFormat } from './datamatrix.js'
import { maxiCodeFormat } from './maxicode.js'
import { microQrFormat } from './microqr.js'
import { qrFormat } from './qr.js'
import { qrModel1Format } from './qr-model-1.js'
import { rmqrFormat } from './rmqr.js'

export const formatRegistry = new FormatRegistry([
  qrFormat,
  qrModel1Format,
  microQrFormat,
  rmqrFormat,
  dataMatrixFormat,
  aztecFormat,
  maxiCodeFormat,
])
