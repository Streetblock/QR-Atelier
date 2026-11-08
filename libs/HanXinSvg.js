import { HanXinMatrixSvgRenderer } from './HanXinMatrixSvgRenderer.js';

export class HanXinSvgRenderer extends HanXinMatrixSvgRenderer {
  constructor(result, options = {}) {
    super(result, { ariaLabel: 'Han Xin code', ...options });
  }
}

export default HanXinSvgRenderer;
