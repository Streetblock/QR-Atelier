import { AztecRuneCore } from '../libs/AztecRuneCore.js'
import { AztecSvgRenderer } from '../libs/AztecSvg.js'

export const aztecRuneFormat = {
  id: 'aztec-rune',
  label: 'Aztec Rune',
  filePrefix: 'aztec-rune',
  defaults: { aztecRuneStyle: 'square' },
  fields: [{
    key: 'aztecRuneStyle',
    label: 'Aztec Rune Style',
    type: 'select',
    options: [['square', 'Square'], ['rounded', 'Rounded'], ['dots', 'Dots'], ['classy', 'Classy']],
  }],
  createRenderer({ payload, size, options }) {
    const rune = new AztecRuneCore(payload).generate()
    return new AztecSvgRenderer(rune, {
      size,
      colorStart: options.colorStart,
      colorEnd: options.colorEnd,
      moduleStyle: options.aztecRuneStyle,
    })
  },
}
