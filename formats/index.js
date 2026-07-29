import { FormatRegistry } from './FormatRegistry.js'
import { dataMatrixFormat } from './datamatrix.js'
import { qrFormat } from './qr.js'

export const formatRegistry = new FormatRegistry([qrFormat, dataMatrixFormat])
