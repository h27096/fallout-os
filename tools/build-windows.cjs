'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'dist');
// Only this checkout's generated dist directory may be cleaned; never user profiles.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe output path');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Refusing to clean a linked dist directory');
fs.rmSync(output, { recursive: true, force: true });
const args = [require.resolve('electron-builder/cli.js'), '--win',
  ...(process.argv.includes('--dir') ? ['--dir'] : ['nsis', 'zip']), '--x64', '--publish', 'never'];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
