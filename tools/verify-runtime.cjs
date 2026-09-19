'use strict';
const fs = require('node:fs');
const path = require('node:path');
function verifyRuntime(directory) {
  const required = ['Fallout OS.exe', 'icudtl.dat', 'resources.pak',
    'chrome_100_percent.pak', 'chrome_200_percent.pak',
    'v8_context_snapshot.bin', 'ffmpeg.dll', 'locales/en-US.pak', 'resources/app.asar'];
  for (const name of required) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0)
      throw new Error(`Incomplete Windows distribution: missing or empty ${name}`);
  }
  const asar = require('@electron/asar');
  const archive = path.join(directory, 'resources/app.asar');
  for (const name of ['package.json', 'index.html', 'electron/main.cjs', 'electron/preload.cjs', 'electron/vaultnet.cjs', 'vaultnet-desktop.js'])
    if (!asar.extractFile(archive, name).length) throw new Error(`Empty app asset: ${name}`);
  console.log('Verified complete Electron runtime and VaultNet v2 app archive.');
}
module.exports = async context => { if (context.electronPlatformName === 'win32') verifyRuntime(context.appOutDir); };
module.exports.verifyRuntime = verifyRuntime;
if (require.main === module) verifyRuntime(path.resolve(process.argv[2] || 'dist/win-unpacked'));
