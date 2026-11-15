import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join, sep, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireTool } from '../scripts/package-tooling.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmCli = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const npm = (args, cwd, consumer) => execFileSync(process.execPath, [npmCli, ...args, '--cache', join(consumer, '.npm-cache')], {
  cwd, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 2_000_000
});

test('the actual packed artifact has bounded payload, typed family imports and no unused browser families', { timeout: 120000 }, async () => {
  const configured = process.env.QR_ATELIER_TEST_TMP_ROOT;
  if (configured && !isAbsolute(configured)) throw new Error('QR_ATELIER_TEST_TMP_ROOT must be absolute.');
  const temporaryRoot = resolve(configured || join(root, 'output'));
  await mkdir(temporaryRoot, { recursive: true });
  const consumer = await mkdtemp(join(temporaryRoot, 'qa-package-'));
  try {
    const [packed] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--offline', '--pack-destination', consumer], root, consumer));
    assert.equal(packed.name, 'qr-atelier');
    assert.ok(packed.files.length > 20);
    for (const item of packed.files) {
      assert.ok(/^(?:libs\/|formats\/|licenses\/|docs\/unified-cores\.md$|package\.json$|README(?:_de)?\.md$|LICENSE(?:\.md|-MIT|-APACHE)$|NOTICE$|THIRD_PARTY_NOTICES\.md$)/u.test(item.path), item.path);
      assert.doesNotMatch(item.path, /(?:^|\/)(?:node_modules|tests|examples|reference-tests|output|\.reference-deps)(?:\/|$)/u);
    }
    for (const path of ['libs/cores.js', 'libs/index.d.ts', 'libs/QRcore.d.ts', 'libs/DMcore.d.ts', 'libs/internal/public-types.d.ts',
      'libs/renderers.js', 'LICENSE.md', 'LICENSE-MIT', 'LICENSE-APACHE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
      assert.ok(packed.files.some(item => item.path === path), path);
    }
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'qa-private-packed-consumer', private: true, type: 'module',
      dependencies: { 'qr-atelier': `file:./${packed.filename}` } }, null, 2));
    npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock'], consumer, consumer);
    const metadata = JSON.parse(await readFile(join(consumer, 'node_modules/qr-atelier/package.json'), 'utf8'));
    assert.equal(metadata.private, true);
    assert.equal(Object.keys(metadata.dependencies || {}).length, 0);
    assert.equal(Object.hasOwn(metadata, 'sideEffects'), false, 'Do not make an unaudited global purity assertion.');
    assert.equal(metadata.exports['./libs/internal/*'], null);
    const installed = await readFile(join(consumer, 'node_modules/qr-atelier/LICENSE.md'), 'utf8');
    assert.equal(installed, await readFile(join(root, 'LICENSE.md'), 'utf8'), 'Scoped license bytes must be preserved.');
    await writeFile(join(consumer, 'consumer.mjs'), `
import assert from 'node:assert/strict';
import * as root from 'qr-atelier';
import * as cores from 'qr-atelier/cores';
import * as qr from 'qr-atelier/qr';
import * as micro from 'qr-atelier/microqr';
import * as rmqr from 'qr-atelier/rmqr';
import * as dm from 'qr-atelier/data-matrix';
import * as legacy from 'qr-atelier/legacy-data-matrix';
import * as aztec from 'qr-atelier/aztec';
import * as rune from 'qr-atelier/aztec-rune';
import * as maxi from 'qr-atelier/maxicode';
import * as pdf from 'qr-atelier/pdf417';
import * as renderers from 'qr-atelier/renderers';
import { QrSvgRenderer } from 'qr-atelier/renderers/qr';
import { MicroQrSvgRenderer } from 'qr-atelier/renderers/microqr';
import { DmSvgRenderer } from 'qr-atelier/renderers/data-matrix';
import { AztecSvgRenderer } from 'qr-atelier/renderers/aztec';
import { MaxiCodeSvgRenderer } from 'qr-atelier/renderers/maxicode';
import { DmCore as LegacyDm } from 'qr-atelier/libs/DMcore.js';
import { formatRegistry } from 'qr-atelier/formats';
assert.equal(root.QrCore, qr.QrCore); assert.equal(cores.QrCore, qr.QrCore); assert.equal(root.DmCore, dm.DmCore);
assert.equal(LegacyDm, dm.DmCore); assert.equal(root.DmSvgRenderer, DmSvgRenderer);
assert.ok(!Object.keys(cores).some(key => key.endsWith('SvgRenderer')));
assert.equal(renderers.QrSvgRenderer, QrSvgRenderer);
assert.deepEqual(maxi.MaxiCodeCore.measureCarrierSecondary('A'.repeat(85)), { codewords: 85, capacity: 84, fits: false });
assert.deepEqual(cores.MaxiCodeCore.measureCarrierSecondary('123456789'), { codewords: 6, capacity: 84, fits: true });
assert.equal(pdf.PDF417Core, pdf.Pdf417Core); assert.equal(pdf.MicroPDF417Core, pdf.MicroPdf417Core);
const symbols = [new qr.QrCore('ABC').generate(), new micro.MicroQrCore('123').generate(), new rmqr.RMqrCore('ABC').generate(),
  new dm.DmCore('ABC').generate(), legacy.generateLegacyDataMatrix('A'), new aztec.AztecCore('ABC').generate(),
  new rune.AztecRuneCore(42).generate(), new maxi.MaxiCodeCore('ABC').generate(), new pdf.Pdf417Core('ABC').generate(),
  new pdf.MicroPdf417Core('ABC').generate()];
for (const result of symbols) { assert.ok(result.modules.length); assert.ok(result.modules.every(row => row.length && row.every(value => typeof value === 'boolean'))); }
assert.equal(new micro.MicroQrCore('漢字', { preferredMode: 'kanji', minVersion: 'M4', maxVersion: 'M4' }).generate().mode, 'kanji');
const dmre = new dm.DmCore('ABC', { shape: 'dmre', symbolSize: '8x48' }).generate(); assert.equal(dmre.rows, 8); assert.equal(dmre.cols, 48);
assert.ok(symbols[7].codewords instanceof Uint8Array); assert.ok(symbols[8].bytes instanceof Uint8Array);
assert.equal(new rmqr.RMqrCore('ABC', { aimApplicationIndicator: 'A' }).generate().segments.find(segment => segment.mode === 'fnc1Second').applicationIndicator, 'A');
for (const renderer of [new QrSvgRenderer(symbols[0]), new MicroQrSvgRenderer(symbols[1]), new DmSvgRenderer(symbols[3]),
  new AztecSvgRenderer(symbols[5]), new MaxiCodeSvgRenderer(symbols[7])]) assert.match(renderer.render(), /^<svg\\b/u);
assert.ok(formatRegistry.has('qr'));
await assert.rejects(import('qr-atelier/libs/internal/BinaryReedSolomon.js'), error => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
await assert.rejects(import('qr-atelier/libs/internal/public-types.js'), error => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED');
`);
    execFileSync(process.execPath, ['consumer.mjs'], { cwd: consumer, stdio: 'pipe', windowsHide: true, timeout: 30000 });
    await writeFile(join(consumer, 'public-api.ts'), await readFile(new URL('./types/public-api.ts', import.meta.url)));
    const config = JSON.parse(await readFile(new URL('./types/tsconfig.json', import.meta.url), 'utf8'));
    await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify(config));
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/check-types.mjs', import.meta.url)), join(consumer, 'tsconfig.json')],
      { stdio: 'pipe', windowsHide: true, timeout: 30000 });
    const { module: esbuild } = requireTool('esbuild');
    for (const [subpath, forbidden] of [['qr', /DMcore|MaxiCode|PDF417|MicroQR|RMQR|Aztec|svg|formats/iu], ['cores', /svg|formats/iu]]) {
      const bundle = await esbuild.build({ absWorkingDir: consumer, stdin: {
        contents: `export { QrCore } from 'qr-atelier/${subpath}';`, resolveDir: consumer },
        platform: 'browser', format: 'esm', bundle: true, write: false, metafile: true, logLevel: 'silent' });
      assert.ok(bundle.outputFiles[0].contents.length > 0);
      assert.ok(!Object.keys(bundle.metafile.inputs).some(file => forbidden.test(file)), JSON.stringify(bundle.metafile.inputs));
    }
  } finally {
    const target = resolve(consumer);
    if (!target.startsWith(temporaryRoot + sep) || !basename(target).startsWith('qa-package-')) throw new Error('Refusing cleanup outside bounded test consumer.');
    await rm(target, { recursive: true, force: true });
  }
});
