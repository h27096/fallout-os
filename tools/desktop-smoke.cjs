'use strict';
const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-smoke-'));
  const app = await _electron.launch({ args: [path.join(__dirname, '..'), '--user-data-dir=' + profile] });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForLoadState();
    assert.equal(await page.evaluate(() => typeof require), 'undefined');
    const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    assert.equal(prefs.nodeIntegration, false);
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.sandbox, true);
    await page.getByText('START SYSTEM', { exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('command').disabled);
    for (const label of ['FILES', 'HOLOTAPES', 'MUSIC / RADIO', 'CALCULATOR', 'VAULTNET']) {
      await page.locator('#desktopIcons').getByText(label, { exact: true }).click();
    }
    assert.equal(await page.locator('#openExternal').innerText(), 'OPEN IN DEFAULT BROWSER');
    assert.equal(await page.evaluate(async () => { try { await robcoDesktop.openExternal('file:///C:/Windows'); return false; } catch { return true; } }), true);
    assert.equal(await page.evaluate(async () => (await fetch('robco://app/package.json')).status), 404);
    await page.evaluate(() => localStorage.setItem('desktop-smoke', 'saved'));
    await page.reload();
    assert.equal(await page.evaluate(() => localStorage.getItem('desktop-smoke')), 'saved');
    assert.deepEqual(errors, []);
    console.log('Electron smoke passed: boot, app launchers, sandbox, bridge rejection, asset boundaries and storage.');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
