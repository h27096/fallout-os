'use strict';
const { app, BrowserWindow, protocol, net, session, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { installVaultNet } = require('./vaultnet.cjs');
const root = path.join(__dirname, '..');
const entry = 'robco://app/index.html';
protocol.registerSchemesAsPrivileged(['robco', 'robco-extension'].map(scheme => ({ scheme, privileges: { standard: true, secure: true, supportFetchAPI: true } })));
app.enableSandbox();
let mainWindow;
ipcMain.handle('open-external', async (event, value) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== entry) throw new Error('Untrusted sender');
  if (typeof value !== 'string' || value.length > 8192) throw new Error('Invalid address');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported address');
  await shell.openExternal(url.href);
});
app.whenReady().then(async () => {
  require('./extensions.cjs').installExtensions({ app, BrowserWindow, session, ipcMain, dialog, getWindow: () => mainWindow, entry });
  require('./wallpaper.cjs').installWallpaper({ app, ipcMain, dialog, nativeImage, getWindow: () => mainWindow, entry });
  // Only renderer assets are reachable. Never expose source, dependencies or arbitrary paths.
  const assets = new Set(fs.readdirSync(root).filter(name => /\.(html|css|js)$/.test(name)));
  protocol.handle('robco', request => {
    const url = new URL(request.url);
    const name = url.pathname.slice(1);
    if (url.host !== 'app' || !assets.has(name) || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(path.join(root, name)).href);
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    if (details.url === entry) headers['Content-Security-Policy'] = ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob: http: https:; frame-src http: https:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"];
    callback({ responseHeaders: headers });
  });
  function createWindow() {
    mainWindow = new BrowserWindow({ width: 1280, height: 800, minWidth: 600, minHeight: 400, backgroundColor: '#001000', autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false } });
    const wc = mainWindow.webContents;
    installVaultNet(mainWindow, entry);
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-navigate', event => event.preventDefault());
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.on('will-frame-navigate', (event) => {
      if (event.isMainFrame || !/^https?:\/\//i.test(event.url)) event.preventDefault();
    });
    wc.on('will-prevent-unload', event => {
      if (dialog.showMessageBoxSync(mainWindow, { type: 'question', buttons: ['Keep editing', 'Discard and close'], defaultId: 0, cancelId: 0, message: 'Discard unsaved changes?' }) === 1) event.preventDefault();
    });
    mainWindow.loadURL(entry).catch(error => { dialog.showErrorBox('Fallout OS failed to load', error.message); app.quit(); });
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
