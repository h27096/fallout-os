'use strict';
const { _electron } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = path.resolve(__dirname, '..'), id = 'user.supply-planner';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-extensions-smoke-'));
let app;
async function start() {
  const packaged = process.argv.includes('--packaged');
  app = await _electron.launch({ ...(packaged ? { executablePath: path.join(root, 'dist/win-unpacked/Fallout OS.exe') } : {}), args: [...(packaged ? [] : [root]), '--user-data-dir=' + profile] });
  app.on('window', window => { window.on('console', message => { if (message.type() === 'error') console.log('Renderer:', message.text()); }); });
  const page = await app.firstWindow();
  await page.getByText('START SYSTEM', { exact: true }).click();
  await page.waitForFunction(() => !document.getElementById('command').disabled);
  await page.locator('#extensionsLauncher').click(); return page;
}
async function mockDialog(file, answer) {
  // Test-only interception in the main process; production never accepts package text over IPC.
  await app.evaluate(({ dialog }, { file, answer }) => {
    dialog.showOpenDialog = async () => ({ canceled: !file, filePaths: file ? [file] : [] });
    dialog.showMessageBox = async () => ({ response: answer });
  }, { file, answer });
}
(async () => {
  try {
    let page = await start();
    const file = path.join(root, 'samples/supply-planner.robcoapp');
    await page.evaluate(() => localStorage.setItem('extension-preserve-marker', 'keep'));
    await mockDialog(file, 0); await page.locator('#extensionsInstall').click();
    await page.waitForFunction(() => !document.getElementById('extensionsInstall').disabled);
    assert.equal(await page.locator('.extensionRow').count(), 0);
    const invalid = path.join(profile, 'invalid.robcoapp'); fs.writeFileSync(invalid, '{bad');
    await mockDialog(invalid, 1); await page.locator('#extensionsInstall').click();
    await page.waitForFunction(() => document.getElementById('extensionStatus').textContent.includes('valid JSON'));
    await mockDialog(file, 1); await page.locator('#extensionsInstall').click();
    await page.locator('.extensionRow').waitFor();
    assert.equal(await page.locator('#extensionLaunchers button').count(), 1);
    if (process.env.EXTENSIONS_SCREENSHOT) await page.screenshot({ path: process.env.EXTENSIONS_SCREENSHOT });
    await page.evaluate(() => RobcoSearch.open()); await page.locator('#systemSearchInput').fill('supply');
    assert.equal(await page.locator('#searchResults [role=option]').count(), 1);
    const opened = app.waitForEvent('window'); await page.locator('#systemSearchInput').press('Enter');
    const plugin = await opened; await plugin.waitForLoadState();
    await plugin.getByRole('button', { name: 'CALCULATE SUPPLIES' }).click();
    assert.match(await plugin.locator('#result').innerText(), /12 water units.*18 meal packs/);
    assert.deepEqual(await plugin.evaluate(() => [typeof require, typeof process, typeof robcoDesktop, typeof window.opener]), ['undefined', 'undefined', 'undefined', 'object']);
    assert.equal(await plugin.evaluate(() => window.opener), null);
    assert.equal(await plugin.evaluate(async () => { try { await fetch('https://example.com'); return false; } catch { return true; } }), true);
    assert.equal(await plugin.evaluate(async () => { try { await fetch('robco://app/index.html'); return false; } catch { return true; } }), true);
    assert.equal(await plugin.evaluate(() => { try { localStorage.setItem('attack', 'x'); return false; } catch { return true; } }), true);
    assert.equal(await plugin.evaluate(() => window.open('https://example.com') === null), true);
    await plugin.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.inlineRan = true'; document.body.append(s); });
    assert.equal(await plugin.evaluate(() => window.inlineRan), undefined);
    await plugin.evaluate(() => { location.href = 'https://example.com'; });
    await page.waitForTimeout(150);
    assert.equal(plugin.url(), 'robco-extension://app/index.html');
    if (process.env.EXTENSIONS_SCREENSHOT) await plugin.screenshot({ path: process.env.EXTENSIONS_SCREENSHOT.replace('.png', '-sample.png') });
    const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().startsWith('robco-extension:')).webContents.getLastWebPreferences());
    assert.equal(prefs.sandbox, true); assert.equal(prefs.nodeIntegration, false); assert.equal(prefs.contextIsolation, true); assert.ok(!prefs.preload);
    await page.locator('.extensionRow').getByText('DISABLE', { exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#extensionLaunchers button'));
    assert.equal(plugin.isClosed(), true);
    assert.equal(await page.evaluate(async id => { try { await robcoDesktop.extensions.launch(id); return false; } catch { return true; } }, id), true);
    await app.close(); app = null;
    page = await start();
    assert.equal(await page.evaluate(() => localStorage.getItem('extension-preserve-marker')), 'keep');
    assert.equal(await page.locator('#extensionLaunchers button').count(), 0);
    await page.evaluate(() => RobcoSearch.open()); await page.locator('#systemSearchInput').fill('supply');
    assert.equal(await page.locator('#searchResults [role=option]').count(), 0); await page.keyboard.press('Escape');
    await page.locator('.extensionRow').getByText('ENABLE', { exact: true }).click();
    await page.locator('#extensionLaunchers button').waitFor();
    await app.close(); app = null; page = await start();
    await page.locator('#extensionLaunchers button').waitFor();
    const reopened = app.waitForEvent('window'); await page.locator('.extensionRow').getByText('LAUNCH', { exact: true }).click(); await reopened;
    await mockDialog(null, 1); await page.locator('.extensionRow').getByText('UNINSTALL', { exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.extensionRow'));
    assert.equal(await page.locator('#extensionLaunchers button').count(), 0);
    assert.equal(await page.evaluate(async id => { try { await robcoDesktop.extensions.launch(id); return false; } catch { return true; } }, id), true);
    await app.close(); app = null; page = await start();
    assert.equal(await page.locator('.extensionRow').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('extension-preserve-marker')), 'keep');
    const stalled = JSON.parse(fs.readFileSync(file, 'utf8'));
    stalled.manifest.id = 'user.stalled-app'; stalled.files['app.js'] = 'while (true) {}';
    const stalledFile = path.join(profile, 'stalled.robcoapp'); fs.writeFileSync(stalledFile, JSON.stringify(stalled));
    await mockDialog(stalledFile, 1); await page.locator('#extensionsInstall').click();
    await page.locator('.extensionRow').waitFor();
    await page.locator('.extensionRow').getByText('LAUNCH', { exact: true }).click();
    await page.waitForFunction(() => document.getElementById('extensionStatus').textContent.includes('timed out'), null, { timeout: 15000 });
    await page.locator('.extensionRow').getByText('DISABLE', { exact: true }).click();
    await page.locator('.extensionRow').getByText('ENABLE', { exact: true }).waitFor();
    await app.close(); app = null;
    const registry = path.join(profile, 'extensions/registry-v1.json'); fs.writeFileSync(registry, 'damaged-registry');
    page = await start();
    await page.waitForFunction(() => document.getElementById('extensionStatus').textContent.includes('corrupt'));
    await mockDialog(file, 1); await page.locator('#extensionsInstall').click();
    await page.waitForFunction(() => !document.getElementById('extensionsInstall').disabled);
    assert.equal(fs.readFileSync(registry, 'utf8'), 'damaged-registry');
    console.log('PASS extension install cancellation, invalid package, install, search launch, working sample, isolation, disable, restart, enable, uninstall, stalled-app recovery, corrupt registry and saved-data preservation.');
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
