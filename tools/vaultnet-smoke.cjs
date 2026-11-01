'use strict';
const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');

(async () => {
  let visits = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/second' }); return res.end(); }
    if (req.url === '/unsafe-redirect') { res.writeHead(302, { Location: 'robco://app/index.html' }); return res.end(); }
    if (req.url === '/download') { res.setHeader('Content-Disposition', 'attachment; filename=test.txt'); return res.end('test'); }
    visits++;
    // This page cannot load in any iframe. It must be a native top-level page.
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Type', 'text/html');
    res.end(`<h1>VaultNet fixture ${req.url}</h1><a id="next" href="/redirect">Next</a><a id="popup" href="/popup" target="_blank">New window</a><a id="file" href="file:///C:/Windows/win.ini">Local</a>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultnet-smoke-'));
  const packaged = process.argv.includes('--packaged');
  let app;
  try {
    app = await _electron.launch({
      ...(packaged ? { executablePath: process.env.FALLOUT_TEST_EXE || path.join(__dirname, '../dist/win-unpacked/Fallout OS.exe') } : {}),
      args: [...(packaged ? [] : [path.join(__dirname, '..')]), '--user-data-dir=' + profile]
    });
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForLoadState();
    const remote = expression => app.evaluate(({ BrowserWindow }, script) => {
      const view = BrowserWindow.getAllWindows()[0].contentView.children.find(v => v.webContents && v.webContents !== BrowserWindow.getAllWindows()[0].webContents);
      return view.webContents.executeJavaScript(script, true);
    }, expression);
    const snapshot = () => app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const view = win.contentView.children.find(v => v.webContents && v.webContents !== win.webContents);
      return view ? { url: view.webContents.getURL(), visible: view.getVisible(), bounds: view.getBounds(), prefs: view.webContents.getLastWebPreferences() } : null;
    });
    async function until(check, label, timeout = 10000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await check()) return; await delay(80); }
      throw new Error('Timed out: ' + label);
    }
    const at = suffix => until(async () => (await snapshot())?.url === base + suffix, suffix);
    await page.getByText('START SYSTEM', { exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('command').disabled);
    await page.evaluate(() => openBrowser());
    assert.equal(await page.locator('#browserFrame').count(), 0);
    await page.locator('#browserAddress').fill(base + '/first');
    await page.locator('#browserAddress').press('Enter');
    await at('/first');
    await until(async () => (await snapshot()).visible, 'native view visible');
    assert.deepEqual(await remote('({topLevel: window === top, node: typeof require, bridge: typeof robcoDesktop, process: typeof process, text: document.querySelector("h1").textContent})'),
      { topLevel: true, node: 'undefined', bridge: 'undefined', process: 'undefined', text: 'VaultNet fixture /first' });
    await page.evaluate(async () => { await settings.ready; settings.open(); });
    await until(async () => !(await snapshot()).visible, 'settings hides native view');
    await page.locator('[data-wallpaper="blue"]').click();
    await page.waitForFunction(() => document.getElementById('settingsStatus').textContent === 'WALLPAPER SAVED.');
    await page.locator('#settingsClose').click();
    await page.evaluate(() => openBrowser());
    await until(async () => (await snapshot()).visible, 'browser restored after settings');
    await page.evaluate(() => calendar.open());
    await until(async () => !(await snapshot()).visible, 'calendar hides native view');
    await page.locator('#calendarClose').click();
    await page.evaluate(() => openBrowser());
    await until(async () => (await snapshot()).visible, 'browser restored after calendar');
    await page.locator('#browserAddress').blur();
    const prefs = (await snapshot()).prefs;
    for (const key of ['sandbox', 'contextIsolation', 'webSecurity']) assert.equal(prefs[key], true, key);
    for (const key of ['nodeIntegration', 'nodeIntegrationInSubFrames', 'nodeIntegrationInWorker', 'webviewTag', 'allowRunningInsecureContent']) assert.equal(prefs[key], false, key);
    assert.ok(!prefs.preload);
    assert.equal(await remote("fetch('robco://app/index.html').then(() => false, () => true)"), true);
    assert.equal(await remote("navigator.geolocation ? new Promise(resolve => navigator.geolocation.getCurrentPosition(() => resolve(false), () => resolve(true))) : true"), true);
    for (const value of ['file:///C:/Windows', 'robco://app/index.html', 'javascript:alert(1)', 'data:text/html,unsafe', 'https://user:pass@example.com', 'https://example.com/\n']) {
      assert.equal(await page.evaluate(async url => { try { await robcoDesktop.browser.navigate(url); return false; } catch { return true; } }, value), true, value);
    }
    assert.equal(await page.evaluate(async () => { try { await robcoDesktop.browser.layout({ visible: true, x: NaN, y: 0, width: 100, height: 100 }); return false; } catch { return true; } }), true);
    await remote('document.getElementById("next").click()'); await at('/second');
    await page.waitForFunction(url => document.getElementById('browserAddress').value === url, base + '/second');
    await page.locator('#backButton').click(); await at('/first');
    await page.locator('#forwardButton').click(); await at('/second');
    const previous = visits;
    await page.evaluate(() => browserReload());
    await until(() => visits > previous, 'reload');
    await remote('document.getElementById("popup").click()'); await at('/popup');
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    await remote('history.pushState({}, "", "/spa")'); await at('/spa');
    await page.waitForFunction(url => document.getElementById('browserAddress').value === url, base + '/spa');
    await remote('document.getElementById("file").click()');
    assert.equal((await snapshot()).url, base + '/spa');
    // Stub OS dispatch only in this test so external-protocol tests cannot launch apps.
    await app.evaluate(({ dialog, shell }) => {
      global.vaultnetTestExternal = { prompts: [], opened: [], answer: 0, dialog: dialog.showMessageBox, open: shell.openExternal };
      dialog.showMessageBox = async (_win, options) => { global.vaultnetTestExternal.prompts.push(options.detail); return { response: global.vaultnetTestExternal.answer }; };
      shell.openExternal = async url => { global.vaultnetTestExternal.opened.push(url); };
    });
    await remote('window.open("mailto:test@example.com", "_blank")');
    await until(async () => app.evaluate(() => global.vaultnetTestExternal.prompts.length === 1), 'external confirmation');
    assert.equal(await app.evaluate(() => global.vaultnetTestExternal.opened.length), 0);
    await app.evaluate(() => { global.vaultnetTestExternal.answer = 1; });
    await remote('window.open("tel:+15550100", "_blank")');
    await until(async () => app.evaluate(() => global.vaultnetTestExternal.opened.length === 1), 'confirmed external link');
    await remote('window.open("ms-settings:display", "_blank")');
    assert.deepEqual(await app.evaluate(() => global.vaultnetTestExternal.opened), ['tel:+15550100']);
    await app.evaluate(({ dialog, shell }) => { dialog.showMessageBox = global.vaultnetTestExternal.dialog; shell.openExternal = global.vaultnetTestExternal.open; delete global.vaultnetTestExternal; });
    await page.evaluate(() => browserHome());
    await until(async () => !(await snapshot()).visible, 'home hidden');
    await page.waitForFunction(() => !document.getElementById('browserHome').hidden);
    await until(async () => (await snapshot()).url === 'about:blank', 'home committed');
    await page.evaluate(() => browserBack()); await at('/spa');
    for (const open of ['openTerminal()', 'tasks.open()', 'calculator.open()', "openExplorer('/')", 'radio.open()', 'recordApps.holotapes.open()']) {
      await page.evaluate(code => (0, eval)(code), open);
      await until(async () => !(await snapshot()).visible, 'app hides native view: ' + open);
      await page.evaluate(() => openBrowser());
      await until(async () => (await snapshot()).visible, 'return to browser');
    }
    for (const size of [[900, 640], [600, 400], [600, 500], [1280, 800]]) {
      await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setSize(...value), size);
      await until(async () => {
        const actual = await snapshot();
        const expected = await page.locator('#browserViewport').evaluate(el => { const r = el.getBoundingClientRect(); return { x: Math.ceil(r.left + el.clientLeft), y: Math.ceil(r.top + el.clientTop), width: Math.floor(r.width - el.clientLeft * 2), height: Math.floor(r.height - el.clientTop * 2) }; });
        return actual.visible && Object.keys(expected).every(key => Math.abs(actual.bounds[key] - expected[key]) <= 1);
      }, 'view matches viewport: ' + size).catch(async error => {
        console.error((await snapshot())?.bounds, await page.locator('#browserWindow').evaluate(el => Array.from(el.children).map(child => ({ id: child.id, height: child.getBoundingClientRect().height }))));
        throw error;
      });
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await until(async () => !(await snapshot()).visible, 'minimized view hidden');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    await until(async () => (await snapshot()).visible, 'restored view visible');
    await page.evaluate(url => browserNavigate(url), base + '/download');
    await page.waitForFunction(() => document.getElementById('browserStatus').textContent.includes('downloads'));
    await page.evaluate(url => browserNavigate(url), base + '/unsafe-redirect');
    await page.waitForFunction(() => /unsupported|unavailable|Unable/.test(document.getElementById('browserStatus').textContent));
    assert.ok(!(await snapshot()).url.startsWith('robco:'));
    if (process.argv.includes('--youtube')) {
      await page.evaluate(() => browserNavigate('https://www.youtube.com/'));
      await until(async () => /youtube\.com/.test((await snapshot()).url), 'YouTube navigation', 30000);
      await until(async () => await remote('!!document.querySelector("ytd-app, ytm-app")'), 'YouTube application content', 30000);
      await until(async () => (await snapshot()).visible, 'YouTube view visible');
      assert.equal(await remote('window === top && typeof robcoDesktop === "undefined" && typeof require === "undefined"'), true);
      console.log('YouTube loaded as isolated top-level native content. Playback/login/DRM not asserted.');
    }
    if (process.argv.includes('--capture')) {
      const image = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].capturePage()).toDataURL());
      const output = path.resolve(__dirname, '../../../work');
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, 'vaultnet-native.png'), Buffer.from(image.split(',')[1], 'base64'));
      const remoteImage = await app.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const view = win.contentView.children.find(v => v.webContents && v.webContents !== win.webContents);
        return (await view.webContents.capturePage()).toDataURL();
      });
      fs.writeFileSync(path.join(output, 'vaultnet-remote.png'), Buffer.from(remoteImage.split(',')[1], 'base64'));
    }
    await page.evaluate(() => closeBrowser());
    await until(async () => !(await snapshot()), 'close destroys remote content');
    await page.evaluate(() => openBrowser());
    assert.equal(await page.locator('#browserHome').isVisible(), true);
    await page.evaluate(url => browserNavigate(url), base + '/first'); await at('/first');
    await page.reload();
    await until(async () => !(await snapshot()), 'host reload destroys native view');
    assert.deepEqual(errors, []);
    console.log('VaultNet passed: anti-iframe page, isolation, navigation, redirects, popup routing, SPA history, Home, reload, app stacking, resize, minimize, downloads, close and host reload.');
  } finally { if (app) await app.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
