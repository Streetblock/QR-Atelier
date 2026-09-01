// Stable, DOM-free encoder surface. Individual module imports remain supported.

export { QrCore, QrSegment, calculateQrStructuredAppendParity } from './QRcore.js'
export { MicroQrCore } from './MicroQRcore.js'
export {
  RMqrCore,
  RMqrSegment,
  RMQR_FNC1_SEPARATOR,
  RMQR_GS1_SEPARATOR,
  RMQR_VERSIONS,
} from './RMQRcore.js'

export { DmCore, DM_ECC200_SYMBOL_SIZES, DMRE_SYMBOL_SIZES } from './DMcore.js'
export {
  generateLegacyDataMatrix,
  LEGACY_MASTER_RANDOM_BITS,
} from './DMlegacy.js'

export { AztecCore } from './AztecCore.js'
export {
  MaxiCodeCore,
  encodeMaxiCodeEci,
  encodeMaxiCodeStructuredAppend,
} from './MaxiCodeCore.js'
export { parseMaxiCodeRawInput } from './MaxiCodeRaw.js'
export {
  UpsMaxiCodeEncoder,
  buildUpsMaxiCodeSecondary,
  encodeUpsFormat07Transport,
  normalizeUpsFormat07Payload,
  UPS_FORMAT_07_ALPHABET,
} from './UpsMaxiCode.js'

export {
  Pdf417Core,
  PDF417Core,
  MicroPdf417Core,
  MicroPDF417Core,
  MICRO_PDF417_VARIANTS,
  getPdf417CodewordPattern,
} from './PDF417core.js'
export { Pdf417CompactionMode, compactPdf417 } from './PDF417Compaction.js'

export { QrSvgRenderer } from './QRsvg.js'
export { MicroQrSvgRenderer } from './MicroQRsvg.js'
export { DmSvgRenderer } from './DMsvg.js'
export { AztecSvgRenderer } from './AztecSvg.js'
export { MaxiCodeSvgRenderer } from './MaxiCodeSvg.js'
