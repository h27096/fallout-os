'use strict';
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { ExtensionStore, validatePackage, MAX_PACKAGE } = require('./extension-store.cjs');
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts";
function installExtensions({ app, BrowserWindow, session, ipcMain, dialog, getWindow, entry }) {
  const store = new ExtensionStore(app.getPath('userData')), windows = new Map();
  let busy = false;
  const close = id => { const win = windows.get(id); if (win && !win.isDestroyed()) win.destroy(); windows.delete(id); };
  async function launch(id) {
    const row = store.get(id);
    if (!row.enabled) throw Error('App is disabled.');
    const existing = windows.get(id);
    if (existing && !existing.isDestroyed()) { existing.show(); existing.focus(); return; }
    const isolated = session.fromPartition('robco-extension-' + randomUUID(), { cache: false });
    isolated.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    isolated.setPermissionCheckHandler(() => false);
    isolated.setDevicePermissionHandler(() => false);
    await isolated.setProxy({ mode: 'fixed_servers', proxyRules: '127.0.0.1:9', proxyBypassRules: '<-loopback>' });
    isolated.on('will-download', event => event.preventDefault());
    const base = 'robco-extension://app/';
    const types = { 'index.html': 'text/html', 'style.css': 'text/css', 'app.js': 'text/javascript' };
    isolated.webRequest.onBeforeRequest((details, callback) => {
      const name = details.url.startsWith(base) ? details.url.slice(base.length) : '';
      const allowed = Object.hasOwn(row.package.files, name) && details.method === 'GET' &&
        ((name === 'index.html' && details.resourceType === 'mainFrame') || (name === 'app.js' && details.resourceType === 'script') || (name === 'style.css' && details.resourceType === 'stylesheet'));
      callback({ cancel: !allowed });
    });
    isolated.protocol.handle('robco-extension', request => {
      const name = request.url.slice(base.length);
      if (!request.url.startsWith(base) || !Object.hasOwn(row.package.files, name)) return new Response('Not found', { status: 404 });
      return new Response(row.package.files[name], { headers: { 'Content-Type': types[name] + '; charset=utf-8', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), clipboard-read=(), clipboard-write=()' } });
    });
    const win = new BrowserWindow({ parent: getWindow(), width: 720, height: 560, autoHideMenuBar: true, backgroundColor: '#04170e',
      title: 'UNTRUSTED EXTENSION — ' + row.package.manifest.name,
      webPreferences: { session: isolated, sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false, webSecurity: true, webviewTag: false, devTools: false, safeDialogs: true, navigateOnDragDrop: false } });
    windows.set(id, win);
    const wc = win.webContents;
    wc.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-navigate', event => event.preventDefault());
    wc.on('will-frame-navigate', event => event.preventDefault());
    wc.on('will-redirect', event => event.preventDefault());
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.on('page-title-updated', event => event.preventDefault());
    win.on('closed', () => { windows.delete(id); isolated.protocol.unhandle('robco-extension'); void isolated.clearStorageData(); });
    let timer;
    try {
      await Promise.race([
        win.loadURL(base + 'index.html'),
        new Promise((_resolve, reject) => { timer = setTimeout(() => reject(Error('App startup timed out.')), 5000); })
      ]);
    } catch (error) { close(id); throw Error('Extension could not launch: ' + error.message); }
    finally { clearTimeout(timer); }
  }
  ipcMain.handle('extensions', async (event, action, id, value) => {
    const main = getWindow();
    if (!main || event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame || event.senderFrame.url !== entry) throw Error('Untrusted sender.');
    if (action === 'list') return store.list();
    if (busy) throw Error('Another extension operation is in progress.');
    busy = true;
    try {
      if (action === 'install') {
        if (store.warning) throw Error(store.warning);
        const selection = await dialog.showOpenDialog(main, { title: 'Install RobCo app package', properties: ['openFile'], filters: [{ name: 'RobCo app', extensions: ['robcoapp'] }] });
        if (selection.canceled || !selection.filePaths.length) return store.list();
        const handle = fs.openSync(selection.filePaths[0], 'r');
        let raw;
        try {
          const stat = fs.fstatSync(handle);
          if (!stat.isFile() || stat.size > MAX_PACKAGE) throw Error('Select a regular package file no larger than 512 KiB.');
          const buffer = Buffer.alloc(MAX_PACKAGE + 1), count = fs.readSync(handle, buffer, 0, buffer.length, 0);
          if (count > MAX_PACKAGE) throw Error('Package exceeds 512 KiB.');
          raw = buffer.subarray(0, count).toString('utf8');
        } finally { fs.closeSync(handle); }
        const pkg = validatePackage(raw), m = pkg.manifest;
        const confirmation = await dialog.showMessageBox(main, { type: 'question', title: 'Confirm untrusted app installation', message: `Install ${m.name} (${m.version})?`, detail: `${m.id}\n${m.description}\n\nPublisher is unverified. This offline app can run JavaScript in its own sandboxed window. No desktop data, files, network or system permissions are granted. Install only if you trust its content.`, buttons: ['Cancel', 'Install app'], defaultId: 0, cancelId: 0, noLink: true });
        if (confirmation.response === 1) store.install(pkg);
      } else if (action === 'enable') { store.enable(id, value); if (!value) close(id); }
      else if (action === 'uninstall') {
        const row = store.get(id);
        const answer = await dialog.showMessageBox(main, { type: 'question', message: `Uninstall ${row.package.manifest.name}?`, detail: 'The package will be removed and its window closed.', buttons: ['Cancel', 'Uninstall'], defaultId: 0, cancelId: 0, noLink: true });
        if (answer.response === 1) { store.uninstall(id); close(id); }
      } else if (action === 'launch') await launch(id);
      else throw Error('Unknown extension action.');
      return store.list();
    } finally { busy = false; }
  });
  app.on('before-quit', () => { for (const id of windows.keys()) close(id); });
}
module.exports = { installExtensions, CSP };
