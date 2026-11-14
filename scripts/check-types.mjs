import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { requireTool } from './package-tooling.mjs';

const { require } = requireTool('typescript');
const config = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../tests/types/tsconfig.json', import.meta.url));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', config], { stdio: 'inherit', windowsHide: true });
