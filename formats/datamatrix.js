import { DmCore } from '../libs/DMcore.js'
import { DmSvgRenderer } from '../libs/DMsvg.js'

export const dataMatrixFormat = {
  id: 'datamatrix',
  label: 'Data Matrix',
  filePrefix: 'data-matrix',
  capabilities: { dotStyle: true },
  createRenderer({ payload, size, options }) {
    const matrix = new DmCore(payload, { encoding: 'utf-8' }).generate()
    return new DmSvgRenderer(matrix, {
      size,
      margin: 8,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
      dotStyle: options.dotStyle,
    })
  },
}
