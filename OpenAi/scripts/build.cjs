const { cpSync, mkdirSync, rmSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
rmSync(dist, { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', root], {
	stdio: 'inherit',
});
mkdirSync(dist, { recursive: true });
for (const asset of ['MammouthAi.node.json', 'mammouth.svg', 'mammouth.dark.svg', '__schema__']) {
	cpSync(resolve(root, asset), resolve(dist, asset), { recursive: true });
}