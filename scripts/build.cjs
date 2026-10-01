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
for (const asset of ['MammouthAi.node.json', '__schema__']) {
	cpSync(resolve(root, asset), resolve(dist, asset), { recursive: true });
}
// n8n's icon route requires a subdirectory between the package and filename.
mkdirSync(resolve(dist, 'icons'), { recursive: true });
for (const icon of ['mammouth.svg', 'mammouth.dark.svg']) {
	cpSync(resolve(root, icon), resolve(dist, 'icons', icon));
}