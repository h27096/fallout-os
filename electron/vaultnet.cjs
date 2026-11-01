'use strict';
const { WebContentsView, session, ipcMain, dialog, shell } = require('electron');
const HOME = 'vaultnet://home';

function webURL(value) {
  if (typeof value !== 'string' || !value || value.length > 8192 || /[\s\x00-\x1f]/.test(value)) throw new Error('Invalid address');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Only HTTP and HTTPS addresses are supported');
  return url.href;
}

function installVaultNet(win, entry) {
  // This partition has no app protocol handler, app storage or preload scripts.
  const remoteSession = session.fromPartition('persist:vaultnet-v2');
  remoteSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  remoteSession.setPermissionCheckHandler(() => false);
  remoteSession.setDevicePermissionHandler(() => false);
  remoteSession.webRequest.onBeforeRequest((details, callback) => {
    const protocol = new URL(details.url).protocol;
    callback({ cancel: !['http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:', 'about:'].includes(protocol) });
  });
  let view = null, layout = null, home = true, currentURL = HOME, message = '', promptOpen = false, searchOpen = false;
  const trusted = event => !win.isDestroyed() && event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame && event.senderFrame.url === entry;
  function state() {
    const wc = view?.webContents;
    return { home, url: home ? HOME : currentURL, loading: !!wc?.isLoading(),
      back: !!wc?.navigationHistory.canGoBack(), forward: !!wc?.navigationHistory.canGoForward(), message };
  }
  function emit() {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send('vaultnet:state', state());
  }
  function position() {
    if (!view) return;
    const [width, height] = win.getContentSize();
    const scale = win.webContents.getZoomFactor();
    const x = Math.max(0, Math.ceil((layout?.x || 0) * scale));
    const y = Math.max(0, Math.ceil((layout?.y || 0) * scale));
    const w = Math.max(0, Math.min(width - x, Math.floor((layout?.width || 0) * scale)));
    const h = Math.max(0, Math.min(height - y, Math.floor((layout?.height || 0) * scale)));
    const visible = !searchOpen && !!layout?.visible && !home && !win.isMinimized() && win.isVisible() && w > 0 && h > 0;
    view.setVisible(visible);
    view.webContents.setAudioMuted(!visible);
    if (visible) view.setBounds({ x, y, width: w, height: h });
  }
  function dispose() {
    if (view) {
      const oldView = view;
      view = null;
      win.contentView.removeChildView(oldView);
      oldView.webContents.close({ waitForBeforeUnload: false });
    }
    home = true; currentURL = HOME; message = ''; layout = null;
  }
  async function external(value) {
    let url;
    try { url = new URL(value); } catch { return; }
    if (!['mailto:', 'tel:'].includes(url.protocol) || value.length > 2048 || /[\x00-\x1f]/.test(value)) {
      message = 'Blocked unsupported navigation protocol.'; emit(); return;
    }
    if (promptOpen) return;
    promptOpen = true;
    try {
      const result = await dialog.showMessageBox(win, { type: 'question', buttons: ['Cancel', 'Open external app'],
        defaultId: 0, cancelId: 0, message: 'Open this link in another application?', detail: url.href });
      if (result.response === 1 && !win.isDestroyed()) await shell.openExternal(url.href);
    } catch { message = 'Unable to open external application.'; emit(); }
    finally { promptOpen = false; }
  }
  function ensureView() {
    if (view) return view.webContents;
    view = new WebContentsView({ webPreferences: { session: remoteSession,
      nodeIntegration: false, nodeIntegrationInSubFrames: false, nodeIntegrationInWorker: false,
      contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false,
      allowRunningInsecureContent: false, navigateOnDragDrop: false, safeDialogs: true } });
    view.setVisible(false);
    win.contentView.addChildView(view);
    const wc = view.webContents;
    const active = () => view?.webContents === wc && !wc.isDestroyed() && !win.isDestroyed();
    const guard = event => {
      if (!event.isMainFrame && /^(about:(blank|srcdoc)$|blob:|data:)/i.test(event.url)) return;
      try { webURL(event.url); }
      catch { event.preventDefault(); if (event.isMainFrame) void external(event.url); }
    };
    wc.on('will-frame-navigate', guard);
    wc.on('will-redirect', guard);
    wc.on('will-attach-webview', event => event.preventDefault());
    wc.setWindowOpenHandler(({ url }) => {
      try { const address = webURL(url); void load(address); }
      catch { void external(url); }
      return { action: 'deny' }; // Single-tab browser: safe links open in this view.
    });
    for (const name of ['did-navigate', 'did-navigate-in-page']) wc.on(name, () => {
      if (!active()) return;
      currentURL = wc.getURL(); home = currentURL === 'about:blank'; position(); emit();
    });
    wc.on('did-stop-loading', () => { if (active()) { position(); emit(); } });
    wc.on('did-start-loading', () => { if (active()) { message = ''; emit(); } });
    wc.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
      if (!active()) return;
      if (isMainFrame && code !== -3) { try { currentURL = webURL(url); } catch { /* Keep the last validated address. */ } }
      if (isMainFrame && code !== -3) { message = `Page unavailable: ${description}. Try the default browser.`; emit(); }
    });
    wc.on('render-process-gone', () => { if (active()) { message = 'Page stopped unexpectedly. Press Reload or Home.'; emit(); } });
    wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.control && !input.alt && !input.meta && !input.shift && (input.code === 'Space' || input.key === ' ')) {
        event.preventDefault();
        if (!input.isAutoRepeat) {
          searchOpen = true; position(); win.webContents.focus(); win.webContents.send('system-search:open');
        }
        return;
      }
      // Keep Escape available to web applications; Ctrl+L returns to trusted chrome.
      if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'l') {
        event.preventDefault(); win.webContents.focus(); win.webContents.send('vaultnet:address');
      }
    });
    return wc;
  }
  async function load(url) {
    const wc = ensureView();
    home = url === 'about:blank'; currentURL = url; message = ''; position(); emit();
    try { await wc.loadURL(url); }
    catch (error) { if (view?.webContents === wc && !wc.isDestroyed() && error.code !== 'ERR_ABORTED') { message = 'Unable to load this page. Check the address or try the default browser.'; emit(); } }
  }
  const download = (event, _item, wc) => {
    if (wc !== view?.webContents) return;
    event.preventDefault(); message = 'For downloads, use OPEN IN DEFAULT BROWSER.'; emit();
  };
  remoteSession.on('will-download', download);
  ipcMain.handle('vaultnet:control', (event, action, value) => {
    if (!trusted(event)) throw new Error('Untrusted sender');
    if (action === 'navigate') { const url = webURL(value); void load(url); }
    else if (action === 'home') void load('about:blank');
    else if (action === 'back' || action === 'forward') {
      const history = view?.webContents.navigationHistory;
      if (action === 'back' && history?.canGoBack()) history.goBack();
      if (action === 'forward' && history?.canGoForward()) history.goForward();
    } else if (action === 'reload') { message = ''; view?.webContents.reload(); }
    else if (action === 'close') { dispose(); emit(); }
    else if (action === 'search-overlay') {
      if (typeof value !== 'boolean') throw new Error('Invalid overlay state');
      searchOpen = value; position();
    }
    else if (action === 'focus') { if (!searchOpen && layout?.visible && !home) view?.webContents.focus(); }
    else if (action === 'state') return state();
    else if (action === 'layout') {
      if (!value || typeof value.visible !== 'boolean' || !['x', 'y', 'width', 'height'].every(key =>
        Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 32768)) throw new Error('Invalid bounds');
      layout = value; position();
    } else throw new Error('Unsupported browser control');
    return state();
  });
  for (const event of ['minimize', 'restore', 'show', 'hide']) win.on(event, position);
  win.on('resize', () => { if (view) view.setVisible(false); });
  win.webContents.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => { if (mainFrame) { searchOpen = false; dispose(); } });
  win.on('closed', () => {
    if (view && !view.webContents.isDestroyed()) view.webContents.close({ waitForBeforeUnload: false });
    view = null;
    ipcMain.removeHandler('vaultnet:control'); remoteSession.removeListener('will-download', download);
  });
}
module.exports = { installVaultNet, webURL };
