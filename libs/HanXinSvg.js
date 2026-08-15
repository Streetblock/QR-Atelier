import { BarcodeMatrixSvgRenderer } from './BarcodeMatrixSvg.js';

export class HanXinSvgRenderer extends BarcodeMatrixSvgRenderer {
  constructor(result, options = {}) {
    super(result, { ariaLabel: 'Han Xin code', ...options });
  }
}

export default HanXinSvgRenderer;
