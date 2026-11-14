export interface SvgOutput { render(): string }
export type FormatOptions = Readonly<Record<string, unknown>>;
export interface FormatContext { readonly payload: string; readonly size: number; readonly options: FormatOptions }
export interface FormatCapabilities { readonly dotStyle?: boolean; readonly cornerStyle?: boolean; readonly logo?: boolean }
export interface FormatField {
  readonly key: string; readonly label?: string; readonly type: 'select' | 'text' | 'number' | 'checkbox';
  readonly options?: readonly (readonly [string | number, string])[];
  readonly hint?: string; readonly placeholder?: string; readonly min?: number; readonly max?: number; readonly step?: number;
  readonly visible?: (options: FormatOptions) => boolean;
  readonly update?: (value: string, options: FormatOptions) => Record<string, unknown>;
}
export interface FormatAdapter {
  readonly id: string; readonly label: string; readonly filePrefix: string;
  readonly defaults?: FormatOptions; readonly capabilities?: FormatCapabilities; readonly fields?: readonly FormatField[];
  readonly preserveWhitespace?: (options: FormatOptions) => boolean;
  readonly preparePayload?: (payload: string, options: FormatOptions) => string;
  readonly createRenderer: (context: FormatContext) => SvgOutput;
}
export interface RegisteredFormat extends FormatAdapter {
  readonly defaults: FormatOptions; readonly capabilities: Readonly<Required<FormatCapabilities>>; readonly fields: readonly FormatField[];
}
export class FormatRegistry {
  constructor(formats: readonly FormatAdapter[]);
  readonly formats: ReadonlyMap<string, RegisteredFormat>;
  register(format: FormatAdapter): this;
  list(): readonly RegisteredFormat[];
  has(id: string): boolean;
  get(id: string): RegisteredFormat;
  defaults(): Record<string, unknown>;
  preparePayload(id: string, payload: string, options: FormatOptions): string;
  createRenderer(id: string, context: FormatContext): SvgOutput;
}
