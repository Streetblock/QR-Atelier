// Dependency-free SVG renderer for a native GS1 Composite 2D component matrix.

import { buildPdf417Path } from './PDF417Svg.js'

export class Gs1CompositeSvgRenderer {
  static DEFAULT_STYLE = Object.freeze({
    moduleSize: 1,
    rowHeight: null,
    margin: 0,
    foreground: '#000000',
    background: '#ffffff',
    width: null,
    height: null,
    ariaLabel: 'GS1 Composite 2D component',
  })

  constructor(compositeResult, options = {}) {
    validateCompositeResult(compositeResult)
    this.composite = compositeResult
    this.style = normalizeStyle({ ...Gs1CompositeSvgRenderer.DEFAULT_STYLE, ...options }, compositeResult)
  }

  render() {
    const { modules } = this.composite
    const {
      moduleSize,
      rowHeight,
      margin,
      foreground,
      background,
      ariaLabel,
    } = this.style
    const marginSize = margin * moduleSize
    const viewBoxWidth = modules[0].length * moduleSize + marginSize * 2
    const viewBoxHeight = modules.length * rowHeight * moduleSize + marginSize * 2
    const width = this.style.width ?? viewBoxWidth
    const height = this.style.height ?? viewBoxHeight
    const path = buildGs1CompositePath(modules, { moduleSize, rowHeight, margin })
    const backgroundMarkup = background === null
      ? ''
      : `<rect width="${formatNumber(viewBoxWidth)}" height="${formatNumber(viewBoxHeight)}" fill="${escapeXml(background)}"/>`

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(viewBoxWidth)} ${formatNumber(viewBoxHeight)}" role="img" aria-label="${escapeXml(ariaLabel)}" shape-rendering="crispEdges">`,
      backgroundMarkup,
      `<path d="${path}" fill="${escapeXml(foreground)}"/>`,
      '</svg>',
    ].join('')
  }
}

export const GS1CompositeSvgRenderer = Gs1CompositeSvgRenderer

export function buildGs1CompositePath(modules, options = {}) {
  return buildPdf417Path(modules, options)
}

function normalizeStyle(style, result) {
  const moduleSize = positiveNumber(style.moduleSize, 'moduleSize')
  const rowHeight = positiveNumber(style.rowHeight ?? defaultRowHeight(result), 'rowHeight')
  const margin = nonNegativeNumber(style.margin, 'margin')
  const width = optionalPositiveNumber(style.width, 'width')
  const height = optionalPositiveNumber(style.height, 'height')
  const foreground = normalizeColor(style.foreground, 'foreground')
  const background = style.background === null ? null : normalizeColor(style.background, 'background')
  const ariaLabel = String(style.ariaLabel ?? '').trim()
  if (!ariaLabel) throw new Error('GS1 Composite SVG ariaLabel must not be empty.')
  return { moduleSize, rowHeight, margin, width, height, foreground, background, ariaLabel }
}

function defaultRowHeight(result) {
  return String(result.version).toUpperCase() === 'CC-C' ? 3 : 2
}

function validateCompositeResult(result) {
  if (!result || typeof result !== 'object') {
    throw new TypeError('A GS1 Composite core result is required.')
  }
  validateModules(result.modules)
  if (result.rows !== result.modules.length || result.columns !== result.modules[0].length) {
    throw new Error('GS1 Composite result dimensions do not match its module matrix.')
  }
  if (!['CC-A', 'CC-B', 'CC-C'].includes(String(result.version).toUpperCase())) {
    throw new Error('GS1 Composite result version must be CC-A, CC-B, or CC-C.')
  }
}

function validateModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0 || !Array.isArray(modules[0]) || modules[0].length === 0) {
    throw new TypeError('GS1 Composite modules must be a non-empty boolean matrix.')
  }
  const columns = modules[0].length
  for (const row of modules) {
    if (!Array.isArray(row) || row.length !== columns || row.some((module) => typeof module !== 'boolean')) {
      throw new TypeError('GS1 Composite modules must be a rectangular boolean matrix.')
    }
  }
}

function positiveNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`GS1 Composite SVG ${name} must be a positive number.`)
  }
  return number
}

function nonNegativeNumber(value, name) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`GS1 Composite SVG ${name} must be a non-negative number.`)
  }
  return number
}

function optionalPositiveNumber(value, name) {
  return value === null || value === undefined ? null : positiveNumber(value, name)
}

function normalizeColor(value, name) {
  const color = String(value ?? '').trim()
  if (!color) throw new Error(`GS1 Composite SVG ${name} must not be empty.`)
  return color
}

function formatNumber(value) {
  return String(Number(value.toFixed(6)))
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
