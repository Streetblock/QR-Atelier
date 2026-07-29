import { FormatRegistry } from './FormatRegistry.js'
import { aztecFormat } from './aztec.js'
import { qrFormat } from './qr.js'

export const formatRegistry = new FormatRegistry([qrFormat, aztecFormat])
