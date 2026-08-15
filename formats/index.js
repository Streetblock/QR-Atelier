import { FormatRegistry } from './FormatRegistry.js'
import { aztecFormat } from './aztec.js'
import { aztecRuneFormat } from './aztec-rune.js'
import { qrFormat } from './qr.js'

export const formatRegistry = new FormatRegistry([qrFormat, aztecFormat, aztecRuneFormat])
