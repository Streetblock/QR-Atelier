import { createRequire } from 'node:module';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export function requireTool(name) {
  const configured = process.env.QR_ATELIER_TOOLING_ROOT;
  if (configured && !isAbsolute(configured)) throw new Error('QR_ATELIER_TOOLING_ROOT must be absolute.');
  const require = createRequire(resolve(configured || packageRoot, 'package.json'));
  const expected = { typescript: '5.9.3', esbuild: '0.28.2' }[name];
  if (!expected || require(`${name}/package.json`).version !== expected) {
    throw new Error(`Package checks require the pinned ${name} version ${expected}.`);
  }
  return { require, module: require(name) };
}
