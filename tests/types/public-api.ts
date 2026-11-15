import { QrCore as RootQr, DmSvgRenderer as RootDmSvg } from 'qr-atelier';
import { QrCore, QrSegment, calculateQrStructuredAppendParity } from 'qr-atelier/qr';
import { MicroQrCore } from 'qr-atelier/microqr';
import { RMqrCore, RMqrSegment, RMQR_VERSIONS, RMQR_FNC1_SEPARATOR } from 'qr-atelier/rmqr';
import { DmCore, DM_ECC200_SYMBOL_SIZES, DMRE_SYMBOL_SIZES } from 'qr-atelier/data-matrix';
import { generateLegacyDataMatrix, encodeLegacyData, getLegacyPlacement } from 'qr-atelier/legacy-data-matrix';
import { AztecCore, buildAztecRuneMatrix } from 'qr-atelier/aztec';
import { AztecRuneCore } from 'qr-atelier/aztec-rune';
import { MaxiCodeCore, UpsMaxiCodeEncoder, parseMaxiCodeRawInput, encodeUpsFormat07Transport } from 'qr-atelier/maxicode';
import { MAXICODE_FIXED_TEMPLATE, buildMaxiCodeLayout } from 'qr-atelier/libs/MaxiCodeCore.js';
import { Pdf417Core, PDF417Core, MicroPdf417Core, MicroPDF417Core, MICRO_PDF417_VARIANTS, compactPdf417 } from 'qr-atelier/pdf417';
import { QrCore as PureQr } from 'qr-atelier/cores';
import { QrSvgRenderer, MicroQrSvgRenderer, DmSvgRenderer, AztecSvgRenderer, MaxiCodeSvgRenderer } from 'qr-atelier/renderers';
import { QrSvgRenderer as DirectQrSvg } from 'qr-atelier/renderers/qr';
import { DmCore as LegacyPathDm } from 'qr-atelier/libs/DMcore.js';
import { formatRegistry } from 'qr-atelier/formats';
import { FormatRegistry } from 'qr-atelier/formats/FormatRegistry.js';
import { qrFormat } from 'qr-atelier/formats/qr.js';
import type { ModuleMatrix, QrResult, DataMatrixResult } from 'qr-atelier';

const qr = new QrCore('VALUE', { model: 2, mode: 'byte', encoding: 'utf-8', mask: 7, errorCorrectionLevel: 'H',
  structuredAppend: { position: 1, total: 2, parity: calculateQrStructuredAppendParity('VALUE') } }).generate();
const explicit = new QrCore(null, { segments: [QrSegment.numeric('123'), QrSegment.byte('字'), QrSegment.bytes([65]), QrSegment.kanji('漢字')] });
const customMask = new QrCore('ABC', { includeMaskMetadata: true, maskScoringRemainder: 'legacy-null',
  maskPenaltyEvaluator: candidate => candidate.flat().filter(Boolean).length }).generate();
const selectedMask: number | undefined = customMask.mask;
const shared: typeof QrCore = RootQr; const same: typeof QrCore = PureQr;
const grid: ModuleMatrix = qr.modules; const qrResult: QrResult = qr;
const micro = new MicroQrCore('漢字', { preferredMode: 'kanji', minVersion: 'M4', maxVersion: 'M4', mask: 3 }).generate();
const rmqr = new RMqrCore(null, { segments: [RMqrSegment.byte('ABC'), RMqrSegment.eci(26)], version: RMQR_VERSIONS[0].name,
  fitStrategy: 'minimize-height', errorCorrectionLevel: 'H', eci: true }).generate();
const separator: '\u001d' = RMQR_FNC1_SEPARATOR;
const aim = new RMqrCore('ABC', { aimApplicationIndicator: 'A' }).generate();
const applicationIndicator: string | undefined = aim.segments.find(segment => segment.mode === 'fnc1Second')?.applicationIndicator;
const dm = new DmCore(new Uint8Array([65, 66]), { eci: null, shape: 'square', symbolSize: { rows: 14, cols: 14 } }).generate();
const dmre = new DmCore('ABC', { shape: 'dmre', symbolSize: '8x48' }).generate();
new DmCore(Uint8Array.of(65, 0), { eci: null, rows: 0, columns: 18, modes: ['ascii'],
  specialCodewords: new Map([[1, Uint8Array.of(232)]]) }).generate();
const segments = new DmCore(null, { segments: [{ data: '字', encoding: 'utf-8', eci: 26 }], macro: null }).generate();
const dmResult: DataMatrixResult = dm; const legacyPath: typeof DmCore = LegacyPathDm;
const normalizedFileId: number | undefined = dm.structuredAppend?.fileId;
const legacy = generateLegacyDataMatrix('A', { ecc: 80, format: 6, symbolSize: 13 });
const encodedBits: string = encodeLegacyData('A').encodedBits;
const placement: readonly number[] = getLegacyPlacement(11);
const aztec = new AztecCore('ABC', { mode: 'compact', minLayers: 1, maxLayers: 4, errorCorrectionPercent: 33 }).generate();
const stuffed: readonly number[] = aztec.stuffedBits;
const rune = new AztecRuneCore('255').generate();
const runeGrid: ModuleMatrix = buildAztecRuneMatrix(0).modules;
const carrierCount: number = MaxiCodeCore.measureCarrierSecondary('ABC').codewords;
const carrierCapacity: 84 = MaxiCodeCore.measureCarrierSecondary('ABC').capacity;
const carrierFits: boolean = MaxiCodeCore.measureCarrierSecondary('ABC').fits;
// @ts-expect-error Carrier message measurement requires a string.
MaxiCodeCore.measureCarrierSecondary(null);
const maxi = new MaxiCodeCore(parseMaxiCodeRawInput('ABC<GS>'), { mode: 4, structuredAppend: { index: 1, count: 2 } }).generate();
const bytes: Uint8Array = maxi.codewords.subarray(0, 2);
const elementSize: number = maxi.codewords.BYTES_PER_ELEMENT;
const fixedCoordinate: number = MAXICODE_FIXED_TEMPLATE.black[0][0];
const layoutScale: number = buildMaxiCodeLayout(300, 4, 30, 33).scale;
const ups = new UpsMaxiCodeEncoder({ trackingNumber: '1234567890', shipperId: 'ABC123', format07Bytes: new Uint8Array(32),
  mode: 2, postalCode: '12345', countryCode: 840, serviceClass: 1 }).generate();
const payload: string = encodeUpsFormat07Transport(new Uint8Array(32));
const pdf = new Pdf417Core(new Uint16Array([65, 66]), { columns: 3, rows: 8, errorCorrectionLevel: 2 }).generate();
const pdfBytes: Uint8Array = pdf.bytes.subarray(0, 1);
const pdfAlias: typeof Pdf417Core = PDF417Core;
const microPdfAlias: typeof MicroPdf417Core = MicroPDF417Core;
const microPdf = new MicroPdf417Core('ABC', { variant: MICRO_PDF417_VARIANTS[0].id }).generate();
const cluster: number = microPdf.rowAddressPatterns[0].cluster;
const compacted: readonly number[] = compactPdf417(new ArrayBuffer(2), { mode: 'byte', initialMode: 'text' });
const svg: string = new QrSvgRenderer(rmqr, { cornerStyle: 'dot', dotStyle: 'classy-rounded', size: 300 }).render();
new DirectQrSvg(qr).getOutputDimensions().height;
new MicroQrSvgRenderer(micro).render(); new DmSvgRenderer(dmre).render(); new RootDmSvg(dm).render();
new AztecSvgRenderer(aztec).render(); new AztecSvgRenderer(rune).render(); new MaxiCodeSvgRenderer(maxi).render();
new FormatRegistry([qrFormat]).createRenderer('qr', { payload: 'ABC', size: 300, options: {} }).render();
formatRegistry.list()[0].id;

// @ts-expect-error Unsupported QR correction level.
new QrCore('A', { errorCorrectionLevel: 'Z' });
// @ts-expect-error Explicit QR masks are -1 or 0 through 7.
new QrCore('A', { mask: 8 });
// @ts-expect-error Unknown encoder options must not be accepted silently by the type contract.
new QrCore('A', { printerDpi: 300 });
// @ts-expect-error Structured-append metadata requires all fields.
new QrCore('A', { structuredAppend: { position: 1, total: 2 } });
// @ts-expect-error Null QR input requires explicit segments.
new QrCore(null);
// @ts-expect-error Micro QR has only four masks.
new MicroQrCore('A', { mask: 7 });
// @ts-expect-error rMQR supports M and H correction only.
new RMqrCore('A', { errorCorrectionLevel: 'L' });
// @ts-expect-error Data Matrix ECI is explicit integer, auto or null.
new DmCore('A', { eci: true });
// @ts-expect-error A segmented Data Matrix uses null data.
new DmCore(null);
// @ts-expect-error Explicit Data Matrix segments cannot be combined with nonempty data.
new DmCore('A', { segments: [{ data: 'B' }] });
// @ts-expect-error Segments and external codeword markers are separate input contracts.
new DmCore(null, { segments: [{ data: 'ABC' }], specialCodewords: new Map([[0, [232]]]) });
// @ts-expect-error Compaction names are explicit.
new DmCore('ABC', { modes: ['unknown'] });
// @ts-expect-error Scoring callbacks return a number.
new QrCore('ABC', { maskPenaltyEvaluator: () => 'bad' });
// @ts-expect-error Macro auto is not accepted with segments.
new DmCore(null, { segments: [{ data: 'A' }], macro: 'auto' });
// @ts-expect-error Aztec mode is a bounded family option.
new AztecCore('A', { mode: 'square' });
// @ts-expect-error MaxiCode modes start at two.
new MaxiCodeCore('A', { mode: 1 });
new MaxiCodeCore('A', { mode: 2, postalCode: '12345', countryCode: '840', serviceClass: '001', mode2PostalCodePolicy: 'literal' });
// @ts-expect-error Postal-code policy is explicit and bounded.
new MaxiCodeCore('A', { mode2PostalCodePolicy: 'guess' });
// @ts-expect-error Choose one UPS Format07 source.
new UpsMaxiCodeEncoder({ trackingNumber: '1234567890', shipperId: 'ABC123', format07Bytes: new Uint8Array(32), format07Payload: 'X', mode: 2, postalCode: '12345', countryCode: 840, serviceClass: 1 });
// @ts-expect-error PDF417 does not define correction level nine.
new Pdf417Core('A', { errorCorrectionLevel: 9 });
// @ts-expect-error SVG dimensions are numeric.
new QrSvgRenderer(qr, { size: 'large' });
// @ts-expect-error Renderer options are explicit.
new DmSvgRenderer(dm, { arbitrary: true });
// @ts-expect-error Result module matrices are read-only.
qr.modules[0][0] = true;
// @ts-expect-error Frozen symbol-size descriptions are read-only.
DM_ECC200_SYMBOL_SIZES[0].rows = 10;
// @ts-expect-error Core metadata is read-only.
DMRE_SYMBOL_SIZES.push({ rows: 8, cols: 48, rectangular: true, dmre: true, dataCodewords: 18, errorCodewords: 15 });
// @ts-expect-error Encoder-only entry has no renderer value export.
import { QrSvgRenderer as NotACore } from 'qr-atelier/cores';

type IsAny<T> = 0 extends (1 & T) ? true : false;
type Assert<T extends true> = T;
type CheckedOptions = Assert<IsAny<NonNullable<ConstructorParameters<typeof DmCore>[1]>> extends false ? true : false>;
type CheckedModules = Assert<IsAny<ReturnType<QrCore['generate']>['modules'][number][number]> extends false ? true : false>;
void [explicit, shared, same, grid, qrResult, separator, segments, dmResult, legacyPath, normalizedFileId, legacy, encodedBits,
  placement, stuffed, runeGrid, bytes, elementSize, fixedCoordinate, layoutScale, ups, payload, pdfBytes, pdfAlias, microPdfAlias, cluster, compacted, svg];
