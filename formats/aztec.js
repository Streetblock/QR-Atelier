import { AztecCore } from '../libs/AztecCore.js'
import { AztecSvgRenderer } from '../libs/AztecSvg.js'

export const aztecFormat = {
  id: 'aztec',
  label: 'Aztec Code',
  filePrefix: 'aztec-code',
  defaults: { aztecStyle: 'square' },
  fields: [{
    key: 'aztecStyle',
    label: 'Aztec Style',
    type: 'select',
    options: [['square', 'Square'], ['rounded', 'Rounded'], ['dots', 'Dots'], ['classy', 'Classy']],
  }],
  createRenderer({ payload, size, options }) {
    const aztec = new AztecCore(payload).generate()
    return new AztecSvgRenderer(aztec, {
      size,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
      moduleStyle: options.aztecStyle,
    })
  },
}
