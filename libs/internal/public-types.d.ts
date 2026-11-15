/** Public value contracts for the existing independent encoder modules. */
export type ModuleMatrix = readonly (readonly boolean[])[];
export type ByteArray = Uint8Array | readonly number[];
export type ByteInput = string | ByteArray;
export type Pdf417Input = ByteInput | ArrayBuffer | ArrayBufferView;
export type TextEncoding = 'utf-8' | 'utf8' | 'iso-8859-1' | 'latin1' | 'latin-1' | 'windows-1252' | 'cp1252';
export type QrCorrection = 'L' | 'M' | 'Q' | 'H';
export type QrMask = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type QrMode = 'auto' | 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
export interface MatrixResult { readonly modules: ModuleMatrix }
export interface QrStructuredAppend { readonly position: number; readonly total: number; readonly parity: number }
export interface QrDataSegment {
  readonly mode: Exclude<QrMode, 'auto'>;
  readonly text: string;
  readonly encoding?: TextEncoding | null;
  readonly bytes?: readonly number[];
  readonly kanjiValues?: readonly number[] | null;
}
export interface QrByteOptions { readonly encoding?: TextEncoding }
export const QrSegment: Readonly<{
  numeric(data: string): QrDataSegment;
  alphanumeric(data: string): QrDataSegment;
  byte(data: string, options?: QrByteOptions): QrDataSegment;
  bytes(bytes: Iterable<number>): QrDataSegment;
  kanji(data: string): QrDataSegment;
  kanjiBytes(bytes: Iterable<number>): QrDataSegment;
}>;
export interface QrOptions {
  readonly errorCorrectionLevel?: QrCorrection;
  readonly model?: 1 | 2;
  readonly minVersion?: number;
  readonly maxVersion?: number;
  readonly mask?: QrMask;
  readonly mode?: QrMode;
  readonly encoding?: TextEncoding;
  readonly eci?: boolean;
  readonly segments?: readonly QrDataSegment[];
  readonly structuredAppend?: QrStructuredAppend | null | false;
  readonly maskPenaltyEvaluator?: (candidate: readonly (readonly (boolean | null)[])[]) => number;
  readonly maskScoringRemainder?: 'light' | 'legacy-null';
  readonly includeMaskMetadata?: boolean;
}
export interface QrResult extends MatrixResult {
  readonly data: string;
  readonly model: 1 | 2;
  readonly version: number;
  readonly size: number;
  readonly errorCorrectionLevel: QrCorrection;
  readonly structuredAppend: QrStructuredAppend | null;
  readonly mask?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
export class QrCore {
  constructor(data: string, options?: QrOptions);
  constructor(data: null | undefined, options: QrOptions & { readonly segments: readonly QrDataSegment[] });
  readonly data: string;
  readonly options: QrOptions;
  generate(): QrResult;
}
export function calculateQrStructuredAppendParity(data: string | Iterable<number>, options?: QrByteOptions): number;

export type MicroQrVersion = 'M1' | 'M2' | 'M3' | 'M4';
export type MicroQrMode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
export type MicroQrByteEncoding = 'latin1' | 'utf8' | 'windows1252' | 'shift_jis';
export interface MicroQrOptions {
  readonly preferredMode?: 'auto' | MicroQrMode;
  readonly errorCorrectionLevel?: 'auto' | 'NONE' | 'L' | 'M' | 'Q';
  readonly minVersion?: MicroQrVersion;
  readonly maxVersion?: MicroQrVersion;
  readonly mask?: -1 | 0 | 1 | 2 | 3;
  readonly byteEncoding?: MicroQrByteEncoding;
}
export interface MicroQrResult extends MatrixResult {
  readonly format: 'microqr'; readonly data: string; readonly version: MicroQrVersion;
  readonly size: number; readonly errorCorrectionLevel: 'NONE' | 'L' | 'M' | 'Q';
  readonly mode: MicroQrMode; readonly byteEncoding: MicroQrByteEncoding | null;
  readonly mask: 0 | 1 | 2 | 3; readonly readyForScan: true;
}
export class MicroQrCore {
  constructor(data: string, options?: MicroQrOptions);
  readonly data: string; readonly options: MicroQrOptions;
  generate(): MicroQrResult;
}

export type RmqrVersion =
  | 'R7x43' | 'R7x59' | 'R7x77' | 'R7x99' | 'R7x139'
  | 'R9x43' | 'R9x59' | 'R9x77' | 'R9x99' | 'R9x139'
  | 'R11x27' | 'R11x43' | 'R11x59' | 'R11x77' | 'R11x99' | 'R11x139'
  | 'R13x27' | 'R13x43' | 'R13x59' | 'R13x77' | 'R13x99' | 'R13x139'
  | 'R15x43' | 'R15x59' | 'R15x77' | 'R15x99' | 'R15x139'
  | 'R17x43' | 'R17x59' | 'R17x77' | 'R17x99' | 'R17x139';
export interface RmqrVersionDescriptor { readonly name: RmqrVersion; readonly index: number; readonly height: number; readonly width: number }
export const RMQR_VERSIONS: readonly RmqrVersionDescriptor[];
export const RMQR_FNC1_SEPARATOR: '\u001d';
export const RMQR_GS1_SEPARATOR: '\u001d';
export type RmqrDataMode = 'numeric' | 'alphanumeric' | 'byte';
export interface RmqrDataSegment {
  readonly mode: RmqrDataMode; readonly data: string; readonly encodedData?: string;
  readonly encoding?: TextEncoding | null; readonly bytes?: readonly number[] | null;
}
export interface RmqrEciSegment { readonly mode: 'eci'; readonly assignmentNumber: number }
export type RmqrSegment = RmqrDataSegment | RmqrEciSegment;
export interface RmqrSegmentOptions extends QrByteOptions { readonly fnc1?: boolean; readonly gs1?: boolean }
export const RMqrSegment: Readonly<{
  numeric(data: string): RmqrDataSegment;
  alphanumeric(data: string, options?: RmqrSegmentOptions): RmqrDataSegment;
  byte(data: string, options?: RmqrSegmentOptions): RmqrDataSegment;
  bytes(bytes: Iterable<number>): RmqrDataSegment;
  eci(assignmentNumber: number): RmqrEciSegment;
}>;
export interface RmqrOptions {
  readonly errorCorrectionLevel?: 'M' | 'H'; readonly version?: 'auto' | RmqrVersion;
  readonly mode?: 'auto' | RmqrDataMode; readonly fitStrategy?: 'balanced' | 'width' | 'height' | 'minimize-width' | 'minimize-height';
  readonly encoding?: TextEncoding; readonly eci?: boolean; readonly gs1?: boolean;
  readonly aimApplicationIndicator?: string | null; readonly segments?: readonly RmqrSegment[];
}
export interface RmqrResultSegment {
  readonly mode: RmqrDataMode | 'eci' | 'fnc1First' | 'fnc1Second'; readonly data?: string;
  readonly encoding?: TextEncoding; readonly assignmentNumber?: number; readonly applicationIndicator?: string;
}
export interface RmqrResult extends MatrixResult {
  readonly data: string; readonly format: 'rmqr'; readonly symbology: 'rMQR';
  readonly version: RmqrVersion; readonly versionIndex: number; readonly width: number; readonly height: number; readonly size: number;
  readonly errorCorrectionLevel: 'M' | 'H'; readonly encoding: TextEncoding; readonly eci: boolean; readonly gs1: boolean;
  readonly fnc1Position: 'first' | 'second' | null; readonly aimApplicationIndicator: string | null;
  readonly segments: readonly RmqrResultSegment[];
}
export class RMqrCore {
  constructor(data: string, options?: RmqrOptions);
  constructor(data: null | undefined, options: RmqrOptions & { readonly segments: readonly RmqrSegment[] });
  readonly data: string; readonly options: RmqrOptions;
  generate(): RmqrResult;
}

export type DataMatrixInput = ByteInput;
export type DataMatrixEncoding = Exclude<TextEncoding, 'windows-1252' | 'cp1252'> | 'iso8859-1' | 'iso88591';
export type DataMatrixDimension = number | `${number}x${number}` | Readonly<{ rows: number; cols: number }>;
export interface DataMatrixSegment { readonly data: DataMatrixInput; readonly encoding?: DataMatrixEncoding; readonly eci?: 'auto' | number | null }
export interface DataMatrixStructuredAppend { readonly position: number; readonly total: number; readonly fileId: number | readonly [number, number] }
export interface DataMatrixStructuredAppendResult extends Omit<DataMatrixStructuredAppend, 'fileId'> { readonly fileId: number; readonly fileIdCodewords: readonly number[] }
export interface DataMatrixOptions {
  readonly shape?: 'auto' | 'square' | 'rectangle' | 'dmre'; readonly encoding?: DataMatrixEncoding;
  readonly eci?: 'auto' | number | null; readonly segments?: readonly DataMatrixSegment[] | null;
  readonly dmre?: boolean; readonly gs1?: boolean; readonly macro?: 'auto' | 5 | 6 | null;
  readonly readerProgramming?: boolean; readonly structuredAppend?: DataMatrixStructuredAppend | null;
  readonly minSize?: DataMatrixDimension | null; readonly maxSize?: DataMatrixDimension | null;
  readonly symbolSize?: DataMatrixDimension | null;
  readonly rows?: number | null; readonly columns?: number | null;
  readonly modes?: readonly ('ascii' | 'c40' | 'text' | 'x12' | 'edifact' | 'base256')[] | null;
  /** Each marker replaces one explicit zero-byte placeholder; the caller owns protocol semantics. */
  readonly specialCodewords?: ReadonlyMap<number, ByteArray> | Readonly<Record<number, ByteArray>> | null;
}
export interface DataMatrixSize {
  readonly rows: number; readonly cols: number; readonly rectangular: boolean; readonly dmre: boolean;
  readonly dataCodewords: number; readonly errorCodewords: number;
}
export interface DataMatrixSymbol extends Omit<DataMatrixSize, 'rectangular' | 'dmre'> {
  readonly rectangular?: boolean; readonly dmre?: boolean; readonly regionRows: number; readonly regionCols: number;
  readonly regionCountRows: number; readonly regionCountCols: number; readonly rsBlockData: number | null;
  readonly rsBlockError: number; readonly rsBlockDataLengths?: readonly number[];
}
export const DM_ECC200_SYMBOL_SIZES: readonly DataMatrixSize[];
export const DMRE_SYMBOL_SIZES: readonly DataMatrixSize[];
export interface DataMatrixEciSegment {
  readonly index: number; readonly byteOffset: number; readonly byteLength: number;
  readonly encoding: DataMatrixEncoding | null; readonly eciAssignmentNumber: number | null;
}
export interface DataMatrixResult extends MatrixResult {
  readonly data: DataMatrixInput | null | undefined; readonly format: 'datamatrix'; readonly encoding: DataMatrixEncoding | null;
  readonly gs1: boolean; readonly macro: 5 | 6 | null; readonly readerProgramming: boolean;
  readonly structuredAppend: DataMatrixStructuredAppendResult | null; readonly eciAssignmentNumber: number | null;
  readonly eciSegments: readonly DataMatrixEciSegment[] | null; readonly payloadBytes: readonly number[];
  readonly size: number | `${number}x${number}`; readonly rows: number; readonly cols: number; readonly symbol: DataMatrixSymbol;
  readonly encodedCodewords: number; readonly dataCodewords: readonly number[]; readonly errorCodewords: readonly number[];
}
export class DmCore {
  constructor(data: DataMatrixInput, options?: Omit<DataMatrixOptions, 'segments'> & { readonly segments?: null });
  constructor(data: null | undefined | '', options: Omit<DataMatrixOptions, 'segments' | 'macro' | 'specialCodewords'> & {
    readonly segments: readonly DataMatrixSegment[]; readonly macro?: 5 | 6 | null; readonly specialCodewords?: null;
  });
  readonly data: DataMatrixInput | null | undefined; readonly options: DataMatrixOptions;
  generate(): DataMatrixResult;
}

export interface AztecOptions {
  readonly mode?: 'auto' | 'compact' | 'full'; readonly minLayers?: number; readonly maxLayers?: number;
  readonly errorCorrectionPercent?: number;
}
export interface AztecResult extends MatrixResult {
  readonly format: 'aztec'; readonly data: string; readonly mode: 'auto' | 'compact' | 'full';
  readonly minLayers: number; readonly maxLayers: number; readonly errorCorrectionPercent: number;
  readonly payloadBytes: readonly number[]; readonly payloadBits: number; readonly stuffedBits: readonly number[];
  readonly messageWords: readonly number[]; readonly checkWords: readonly number[]; readonly modeMessageBits: readonly number[];
  readonly placedDataBits: number; readonly minimumEccBits: number; readonly eccBits: number;
  readonly actualErrorCorrectionPercent: number; readonly codewordSize: number; readonly capacityBits: number;
  readonly usableBits: number; readonly readyForScan: true; readonly isFunction: ModuleMatrix;
  readonly size: number; readonly layers: number; readonly compact: boolean;
}
export interface AztecRuneMatrix extends MatrixResult {
  readonly isFunction: ModuleMatrix; readonly size: number; readonly dataWords: readonly number[];
  readonly checkWords: readonly number[]; readonly modeMessageBits: readonly number[];
}
export interface AztecRuneResult extends AztecRuneMatrix {
  readonly format: 'aztec-rune'; readonly data: string; readonly value: number; readonly readyForScan: true;
  readonly compact: true; readonly layers: 0; readonly codewordSize: 4;
}
export class AztecCore {
  constructor(data: string, options?: AztecOptions);
  readonly data: string; readonly options: AztecOptions;
  generate(): AztecResult;
}
export function buildAztecRuneMatrix(value: number): AztecRuneMatrix;
export class AztecRuneCore {
  constructor(value: number | string);
  readonly value: number;
  generate(): AztecRuneResult;
}

export interface MaxiCodeStructuredAppend { readonly index: number; readonly count: number }
export interface MaxiCodeOptions {
  readonly mode?: 2 | 3 | 4 | 5 | 6; readonly preserveControls?: boolean;
  readonly encoding?: 'iso-8859-1' | 'latin1' | 'latin-1' | 'utf-8' | 'utf8'; readonly eci?: number | null | false;
  readonly structuredAppend?: MaxiCodeStructuredAppend | null | false;
  readonly postalCode?: string | number; readonly countryCode?: string | number; readonly serviceClass?: string | number;
}
export interface MaxiCodeResult extends MatrixResult {
  readonly data: string; readonly mode: 2 | 3 | 4 | 5 | 6; readonly size: 33; readonly width: 30; readonly codewords: Readonly<Uint8Array>;
}
export class MaxiCodeCore {
  constructor(data: string, options?: MaxiCodeOptions);
  readonly data: string; readonly options: MaxiCodeOptions;
  generate(): MaxiCodeResult;
}
export function encodeMaxiCodeEci(assignmentNumber: number): readonly number[];
export function encodeMaxiCodeStructuredAppend(value?: MaxiCodeStructuredAppend | null | false): readonly number[];
export function parseMaxiCodeRawInput(source: string): string;
export const UPS_FORMAT_07_ALPHABET: string;
export type UpsFormat07Source = Readonly<{ format07Payload: string; format07Bytes?: never }> | Readonly<{ format07Payload?: never; format07Bytes: ByteArray }>;
export interface UpsCarrierFields { readonly trackingNumber: string; readonly shipperId: string; readonly scac?: string }
export type UpsMaxiCodeSecondaryOptions = UpsCarrierFields & UpsFormat07Source;
export type UpsMaxiCodeOptions = UpsMaxiCodeSecondaryOptions & Readonly<{
  mode: 2 | 3; postalCode: string | number; countryCode: string | number; serviceClass: string | number;
}>;
export interface UpsMaxiCodeResult extends MaxiCodeResult { readonly secondaryMessage: string; readonly format07Payload: string }
export function encodeUpsFormat07Transport(source: ByteArray): string;
export function normalizeUpsFormat07Payload(source: string): string;
export function buildUpsMaxiCodeSecondary(options: UpsMaxiCodeSecondaryOptions): string;
export class UpsMaxiCodeEncoder {
  constructor(options: UpsMaxiCodeOptions);
  readonly options: UpsMaxiCodeOptions;
  generate(): UpsMaxiCodeResult;
}
export const MAXICODE_HEIGHT: 33;
export const MAXICODE_WIDTH: 30;
export const MAXICODE_BITNR: readonly (readonly number[])[];
export const MAXICODE_BULLSEYE_RADIUS_FACTOR: number;
export const MAXICODE_BULLSEYE_RADIUS_TO_HEX_RADIUS_FACTOR: number;
export const MAXICODE_BULLSEYE_SHIFT_FACTOR: number;
export const MAXICODE_BULLSEYE_CLEAR_FACTOR: number;
export const MAXICODE_HEX_RADIUS_FACTOR: number;
export const MAXICODE_GO_GRID: readonly (readonly number[])[];
export const MAXICODE_FIXED_TEMPLATE: Readonly<{ black: readonly (readonly [number, number])[]; white: readonly (readonly [number, number])[]; illegal: readonly (readonly [number, number])[] }>;
export const MAXICODE_CHARSETS: readonly string[];
export interface MaxiCodeLayout {
  readonly scale: number; readonly hexRadius: number; readonly pitchX: number; readonly pitchY: number; readonly hexWidth: number;
  readonly hexHeight: number; readonly totalWidth: number; readonly totalHeight: number; readonly offsetX: number;
  readonly offsetY: number; readonly centerX: number; readonly centerY: number;
  readonly bullseyeCenterX: number; readonly bullseyeCenterY: number; readonly bullseyeOuterRadius: number; readonly bullseyeClearRadius: number;
}
export function buildMaxiCodeLayout(size: number, margin: number, width: number, height: number): MaxiCodeLayout;

export type Pdf417Mode = 'auto' | 'text' | 'byte' | 'numeric';
export const Pdf417CompactionMode: Readonly<{ AUTO: 'auto'; TEXT: 'text'; BYTE: 'byte'; NUMERIC: 'numeric' }>;
export interface Pdf417Options {
  readonly mode?: Pdf417Mode; readonly errorCorrectionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly columns?: number | null; readonly rows?: number | null; readonly truncated?: boolean;
}
export interface MicroPdf417Options {
  readonly mode?: Pdf417Mode; readonly variant?: `${1 | 2 | 3 | 4}x${number}` | null;
  readonly rows?: number | null; readonly columns?: 1 | 2 | 3 | 4 | null;
}
export interface MicroPdf417Variant {
  readonly id: `${1 | 2 | 3 | 4}x${number}`; readonly dataColumns: 1 | 2 | 3 | 4;
  readonly rows: number; readonly errorCodewords: number; readonly dataCapacity: number; readonly moduleColumns: number;
  readonly rowAddressStarts: Readonly<{ left: number; center: number; right: number }>;
}
export const MICRO_PDF417_VARIANTS: readonly MicroPdf417Variant[];
export interface Pdf417BaseResult extends MatrixResult {
  readonly data: Pdf417Input; readonly bytes: Readonly<Uint8Array>; readonly rows: number; readonly columns: number;
  readonly dataColumns: number; readonly dataCodewords: readonly number[]; readonly errorCodewords: readonly number[];
  readonly codewords: readonly number[]; readonly compactedCodewords: readonly number[]; readonly variant: string;
}
export interface Pdf417Result extends Pdf417BaseResult { readonly errorCorrectionLevel: number; readonly truncated: boolean }
export interface MicroPdf417RowAddress {
  readonly cluster: number; readonly left: number; readonly center: number | null; readonly right: number;
}
export interface MicroPdf417Result extends Pdf417BaseResult { readonly rowAddressPatterns: readonly MicroPdf417RowAddress[] }
export class Pdf417Core {
  constructor(data: Pdf417Input, options?: Pdf417Options);
  readonly data: Pdf417Input; readonly options: Pdf417Options;
  generate(): Pdf417Result;
}
export class MicroPdf417Core {
  constructor(data: Pdf417Input, options?: MicroPdf417Options);
  readonly data: Pdf417Input; readonly options: MicroPdf417Options;
  generate(): MicroPdf417Result;
}
export { Pdf417Core as PDF417Core, MicroPdf417Core as MicroPDF417Core };
export function getPdf417CodewordPattern(codeword: number, cluster: 0 | 1 | 2): number;
export function compactPdf417(data: Pdf417Input, options?: Readonly<{ mode?: Pdf417Mode; initialMode?: 'text' | 'byte' }>): readonly number[];
export function normalizePdf417Bytes(data: Pdf417Input): Readonly<Uint8Array>;
export function encodePdf417Text(data: Pdf417Input): readonly number[];
export function encodePdf417Bytes(data: Pdf417Input): readonly number[];
export function encodePdf417Numeric(data: Pdf417Input): readonly number[];

export type LegacyFormatId = 1 | 2 | 3 | 4 | 5 | 6;
export type LegacyEcc = 0 | 50 | 80 | 100 | 140;
export interface LegacyOptions { readonly ecc?: LegacyEcc; readonly format?: 'auto' | LegacyFormatId; readonly symbolSize?: number | null }
export interface LegacyResult extends MatrixResult {
  readonly rows: number; readonly cols: number; readonly ecc: LegacyEcc; readonly formatId: LegacyFormatId;
  readonly dataSide: number; readonly unprotectedBits: string; readonly protectedBits: string;
  readonly unrandomizedBits: string; readonly randomizedBits: string;
}
export const LEGACY_MASTER_RANDOM_BITS: string;
export const LEGACY_PLACEMENT_DATA_SIDES: readonly number[];
export function getLegacyPlacement(dataSide: number): readonly number[];
export function selectLegacyFormat(data: ByteInput): LegacyFormatId;
export function encodeLegacyData(data: ByteInput, options?: Readonly<{ format?: 'auto' | LegacyFormatId }>): Readonly<{ formatId: LegacyFormatId; encodedBits: string }>;
export function encodeLegacyBase41(data: string): string;
export function calculateLegacyCrcRegister(formatId: LegacyFormatId, data: ByteInput): number;
export function calculateLegacyCrcField(formatId: LegacyFormatId, data: ByteInput): string;
export function buildLegacyUnprotectedBits(data: ByteInput, options?: Readonly<{ format?: 'auto' | LegacyFormatId; formatId?: LegacyFormatId }>): string;
export function encodeLegacyEcc000(bits: string): string;
export function encodeLegacyEcc050(bits: string): string;
export function encodeLegacyEcc080(bits: string): string;
export function encodeLegacyEcc100(bits: string): string;
export function encodeLegacyEcc140(bits: string): string;
export function selectLegacyDataSide(usedBits: number, options?: Pick<LegacyOptions, 'ecc' | 'symbolSize'>): number;
export function buildLegacyUnrandomizedBits(bits: string, options?: Pick<LegacyOptions, 'ecc' | 'symbolSize'>): Readonly<{ dataSide: number; protectedBits: string; unrandomizedBits: string }>;
export function buildLegacyEcc050UnrandomizedBits(bits: string, options?: Readonly<{ dataSide?: number }>): string;
export function randomizeLegacyBits(bits: string): string;
export function placeLegacyBits(bits: string, dataSide: number): ModuleMatrix;
export function placeLegacy11x11(bits: string): ModuleMatrix;
export function addLegacyFinderPattern(dataModules: ModuleMatrix): ModuleMatrix;
export function generateLegacyDataMatrix(data: ByteInput, options?: LegacyOptions): LegacyResult;
export function generateLegacyEcc050Reference(data: ByteInput): LegacyResult;

export interface SvgStyle {
  readonly size?: number; readonly margin?: number; readonly background?: string;
  readonly colorStart?: string; readonly colorEnd?: string;
}
export type SvgDotStyle = 'square' | 'dots' | 'diamond' | 'classy' | 'rounded' | 'extra-rounded' | 'classy-rounded';
export interface DottedSvgStyle extends SvgStyle { readonly dotStyle?: SvgDotStyle }
export interface QrSvgStyle extends DottedSvgStyle { readonly cornerStyle?: 'square' | 'dot' | 'extra-rounded'; readonly logo?: string | null; readonly logoScale?: number }
export interface AztecSvgStyle extends SvgStyle { readonly moduleStyle?: 'square' | 'dots' | 'rounded' | 'classy' }
export interface QrSvgInput extends MatrixResult { readonly width?: number; readonly height?: number; readonly symbology?: string }
export class QrSvgRenderer {
  static DEFAULT_STYLE: QrSvgStyle;
  constructor(result: QrSvgInput, options?: QrSvgStyle);
  render(): string;
  getOutputDimensions(): Readonly<{ width: number; height: number }>;
}
export class MicroQrSvgRenderer {
  static DEFAULT_STYLE: DottedSvgStyle;
  constructor(result: MatrixResult, options?: DottedSvgStyle);
  render(): string;
}
export class DmSvgRenderer {
  static DEFAULT_STYLE: DottedSvgStyle;
  constructor(result: MatrixResult & Readonly<{ rows: number; cols: number }>, options?: DottedSvgStyle);
  render(): string;
}
export class AztecSvgRenderer {
  static DEFAULT_STYLE: AztecSvgStyle;
  constructor(result: MatrixResult & Readonly<{ size: number }>, options?: AztecSvgStyle);
  render(): string;
}
export class MaxiCodeSvgRenderer {
  static DEFAULT_STYLE: SvgStyle;
  constructor(result: MatrixResult, options?: SvgStyle);
  render(): string;
}
