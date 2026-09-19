'use strict';
const { app, BrowserWindow, protocol, net, session, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const root = path.join(__dirname, '..');
const entry = 'robco://app/index.html';
protocol.registerSchemesAsPrivileged([{ scheme: 'robco', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.enableSandbox();
let mainWindow;
app.whenReady().then(async () => {
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
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false } });
    const wc = mainWindow.webContents;
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
