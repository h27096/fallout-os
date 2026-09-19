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
    await page.locator('#desktopIcons').getByText('TASKS', { exact: true }).click();
    await page.locator('#taskTitle').fill('Check the vault');
    await page.locator('#taskDue').fill('2026-12-01');
    await page.locator('#taskPriority').selectOption('High');
    await page.getByText('SAVE TASK', { exact: true }).click();
    await page.locator('#taskList').getByText('COMPLETE', { exact: true }).click();
    await page.locator('#taskFilter').selectOption('Active');
    assert.equal(await page.locator('#taskList li').count(), 0);
    await page.locator('#taskFilter').selectOption('Completed');
    assert.match(await page.locator('#taskList').innerText(), /Check the vault/);
    await page.evaluate(() => localStorage.setItem('desktop-smoke', 'saved'));
    await page.reload();
    assert.equal(await page.evaluate(() => localStorage.getItem('desktop-smoke')), 'saved');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('robco.tasks.v1'))[0].done), true);
    await page.evaluate(() => tasks.open());
    await page.locator('#taskList').getByText('EDIT', { exact: true }).click();
    await page.locator('#taskTitle').fill('Updated task');
    await page.getByText('SAVE TASK', { exact: true }).click();
    assert.match(await page.locator('#taskList').innerText(), /Updated task/);
    await page.evaluate(() => localStorage.setItem('robco.tasks.v1', 'damaged'));
    await page.reload();
    await page.evaluate(() => tasks.open());
    await page.locator('#taskTitle').fill('Must not overwrite');
    await page.getByText('SAVE TASK', { exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('robco.tasks.v1')), 'damaged');
    await page.locator('#taskNew').click();
    assert.deepEqual(errors, []);
    console.log('Electron smoke passed: boot, app launchers, sandbox, bridge rejection, asset boundaries and storage.');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
