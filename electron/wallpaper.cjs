'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const DEFAULT = { wallpaper: 'default', position: 'fill', image: null };
const choices = ['default', 'blue', 'green', 'wasteland', 'black', 'custom'];
const positions = ['fill', 'fit', 'center'];
const LIMIT = 12 * 1024 * 1024;
function valid(value) {
  return value && choices.includes(value.wallpaper) && positions.includes(value.position) &&
    (value.image === null || (typeof value.image === 'string' && value.image.length <= LIMIT * 1.4 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.image))) &&
    (value.wallpaper !== 'custom' || !!value.image);
}
function createStore(directory) {
  const file = path.join(directory, 'wallpaper.json');
  return {
    async read() {
      try {
        if ((await fs.stat(file)).size > LIMIT * 1.5) throw new Error('Oversized settings');
        const value = JSON.parse(await fs.readFile(file, 'utf8'));
        if (!valid(value)) throw new Error('Invalid settings');
        return value;
      } catch (error) {
        if (error.code === 'ENOENT') return { ...DEFAULT };
        return { ...DEFAULT, warning: 'Saved wallpaper could not be read. Choose a wallpaper or Restore Default to repair it.' };
      }
    },
    async write(value) {
      if (!valid(value)) throw new Error('Invalid wallpaper settings');
      await fs.mkdir(directory, { recursive: true });
      const temporary = file + '.tmp';
      await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
      await fs.rename(temporary, file);
      return value;
    }
  };
}
function installWallpaper({ app, ipcMain, dialog, nativeImage, getWindow, entry }) {
  const store = createStore(path.join(app.getPath('userData'), 'personalization'));
  let busy = false;
  ipcMain.handle('wallpaper', async (event, action, value) => {
    const win = getWindow();
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== entry) throw new Error('Untrusted sender');
    if (busy) throw new Error('Wallpaper operation in progress. Please try again.');
    busy = true;
    try {
      if (action === 'read') return await store.read();
      if (action === 'restore') return await store.write({ ...DEFAULT });
      const previous = await store.read();
      if (action === 'save') {
        if (!value || !choices.includes(value.wallpaper) || !positions.includes(value.position)) throw new Error('Invalid wallpaper selection');
        return await store.write({ wallpaper: value.wallpaper, position: value.position, image: previous.image });
      }
      if (action !== 'choose') throw new Error('Unknown wallpaper operation');
      const result = await dialog.showOpenDialog(win, { title: 'Choose desktop wallpaper', properties: ['openFile'], filters: [{ name: 'Images (PNG, JPEG, WebP)', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
      if (result.canceled || !result.filePaths.length) return null;
      const selected = result.filePaths[0];
      if (!/\.(png|jpe?g|webp)$/i.test(selected)) throw new Error('Choose a PNG, JPEG or WebP image.');
      const handle = await fs.open(selected, 'r');
      let bytes;
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > LIMIT) throw new Error('Choose an image smaller than 12 MB.');
        bytes = Buffer.alloc(stat.size);
        const read = await handle.read(bytes, 0, bytes.length, 0);
        bytes = bytes.subarray(0, read.bytesRead);
      } finally { await handle.close(); }
      const decoded = nativeImage.createFromBuffer(bytes);
      if (decoded.isEmpty()) throw new Error('This image could not be opened. Try another PNG, JPEG or WebP.');
      const size = decoded.getSize();
      if (size.width * size.height > 24000000) throw new Error('Choose an image with no more than 24 million pixels.');
      const png = decoded.toPNG();
      if (png.length > LIMIT) throw new Error('Image is too large after decoding. Choose a smaller image.');
      return await store.write({ wallpaper: 'custom', position: previous.position, image: 'data:image/png;base64,' + png.toString('base64') });
    } finally { busy = false; }
  });
}
module.exports = { createStore, installWallpaper, DEFAULT, valid };
