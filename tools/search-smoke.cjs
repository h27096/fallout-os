'use strict';
const { _electron, chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
async function until(check) {
    for (let i = 0; i < 100; i++) { if (await check()) return; await delay(80); }
    throw Error('Condition did not settle');
}
async function exercise(page) {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.getByText('START SYSTEM', { exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('command').disabled);
    await page.evaluate(() => {
        vaultFiles.create('/VAULT', 'SEARCH NOTE.DAT', 'file', 'Saved body');
        vaultFiles.create('/VAULT', 'HOLOTAPES', 'folder');
        vaultFiles.create('/VAULT/HOLOTAPES', 'WASTELAND JOURNAL.DAT', 'file', 'Tape body');
        vaultFiles.create('/VAULT/HOLOTAPES', 'SECOND TAPE.DAT', 'file', 'Another tape');
    });
    const input = page.locator('#systemSearchInput');
    const search = async query => {
        await page.keyboard.press('Control+Space'); await input.waitFor({ state: 'visible' }); await input.fill(query);
    };
    await page.locator('#searchLauncher').click();
    assert.equal(await page.locator('#searchResults [role="option"]').count(), 10);
    await page.keyboard.press('ArrowDown');
    assert.equal(await input.getAttribute('aria-activedescendant'), 'searchResult1');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
    assert.equal(await input.getAttribute('aria-activedescendant'), 'searchResult9');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.getElementById('systemSearch').contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'searchLauncher');
    await search('zzzz missing'); assert.match(await page.locator('#searchStatus').innerText(), /NO MATCHES/);
    await input.press('Enter'); assert.equal(await page.locator('#systemSearch').isVisible(), true);
    await input.fill('classified'); assert.equal(await page.locator('#searchResults [role="option"]').count(), 0);
    await input.fill('wAsTeLaNd journal');
    assert.match(await page.locator('#searchResults').innerText(), /HOLOTAPE/);
    await input.press('Enter');
    assert.equal(await page.evaluate(() => recordApps.holotapes.selected), '/VAULT/HOLOTAPES/WASTELAND JOURNAL.DAT');
    await page.evaluate(() => { recordApps.holotapes.field('body').value = 'Unsaved tape'; });
    page.once('dialog', dialog => dialog.dismiss());
    await search('second tape'); await input.press('Enter');
    assert.equal(await page.evaluate(() => recordApps.holotapes.field('body').value), 'Unsaved tape');
    await page.evaluate(() => { recordApps.holotapes.field('body').value = 'Tape body'; });
    await search('search note'); await input.press('Enter');
    assert.equal(await page.locator('#fileContent').inputValue(), 'Saved body');
    await page.locator('#fileContent').fill('Unsaved file');
    page.once('dialog', dialog => dialog.dismiss());
    await search('readme.dat'); await input.press('Enter');
    assert.equal(await page.locator('#fileContent').inputValue(), 'Unsaved file');
    await page.locator('#fileContent').fill('Saved body');
    await page.evaluate(() => {
        vaultFiles.rename('/VAULT/SEARCH NOTE.DAT', 'RENAMED NOTE.DAT');
        overseerMode = true;
    });
    await search('classified.dat'); assert.equal(await page.locator('#searchResults [role="option"]').count(), 1);
    await input.fill('renamed note'); assert.equal(await page.locator('#searchResults [role="option"]').count(), 1);
    await input.press('Escape');
    await page.evaluate(() => { overseerMode = false; vaultFiles.remove('/VAULT/RENAMED NOTE.DAT'); });
    await search('renamed note'); assert.equal(await page.locator('#searchResults [role="option"]').count(), 0);
    await input.fill('wallpapers'); await input.press('Enter');
    assert.equal(await page.locator('#settingsWindow').isVisible(), true);
    await search('calculator'); await page.locator('#searchResults [role="option"]').click();
    assert.equal(await page.locator('#calculatorWindow').isVisible(), true);
    assert.deepEqual(errors, []);
}
(async () => {
    const server = http.createServer((req, res) => {
        if (req.url === '/remote') { res.setHeader('Content-Type', 'text/html'); return res.end('<input id="remote" value="Native fixture">'); }
        const name = req.url === '/' ? 'index.html' : req.url.slice(1);
        if (!/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(root, name))) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(fs.readFileSync(path.join(root, name)));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    let app, browser;
    try {
        const packaged = process.argv.includes('--packaged');
        app = await _electron.launch({ ...(packaged ? { executablePath: path.join(root, 'dist/win-unpacked/Fallout OS.exe') } : {}),
            args: [...(packaged ? [] : [root]), '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'robco-search-'))] });
        const page = await app.firstWindow(); await page.waitForLoadState(); await exercise(page);
        await page.evaluate(url => { openBrowser(); browserNavigate(url); }, base + '/remote');
        const snapshot = () => app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0], view = win.contentView.children.find(v => v.webContents && v.webContents !== win.webContents);
            return view && { visible: view.getVisible(), focus: view.webContents.isFocused(), url: view.webContents.getURL() };
        });
        await until(async () => (await snapshot())?.visible && (await snapshot()).url === base + '/remote');
        await app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0], view = win.contentView.children.find(v => v.webContents && v.webContents !== win.webContents);
            view.webContents.focus(); view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space', modifiers: ['control'] });
            view.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space', modifiers: ['control'] });
        });
        await page.locator('#systemSearchInput').waitFor({ state: 'visible' });
        assert.equal((await snapshot()).visible, false);
        // A stale or competing layout update must not reveal native content over search.
        await page.evaluate(() => robcoDesktop.browser.layout({ visible: true, x: 0, y: 0, width: 500, height: 300 }));
        assert.equal((await snapshot()).visible, false);
        await page.keyboard.press('Escape');
        await until(async () => (await snapshot()).visible && (await snapshot()).focus);
        await page.evaluate(() => RobcoSearch.open());
        await page.locator('#systemSearchInput').fill('calculator'); await page.keyboard.press('Enter');
        await delay(200); assert.equal((await snapshot()).visible, false);
        await page.evaluate(() => openBrowser()); await until(async () => (await snapshot()).visible);
        assert.equal(await page.evaluate(async () => { try { await robcoDesktop.search.overlay('bad'); return false; } catch { return true; } }), true);
        await page.evaluate(() => RobcoSearch.open());
        await page.reload();
        await page.getByText('START SYSTEM', { exact: true }).click();
        await page.waitForFunction(() => !document.getElementById('command').disabled);
        await page.evaluate(url => { openBrowser(); browserNavigate(url); }, base + '/remote');
        await until(async () => (await snapshot())?.visible);
        await app.close(); app = null;
        console.log('PASS System Search Electron: native shortcut, visibility arbitration, focus restoration, direct activation, drafts, permissions, keyboard and index refresh.');
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        const web = await browser.newPage(); await web.goto(base); await exercise(web);
        await web.keyboard.press('Control+Space'); await web.locator('#systemSearchInput').fill('journal');
        if (process.env.SEARCH_SCREENSHOT) await web.screenshot({ path: process.env.SEARCH_SCREENSHOT });
        await web.setViewportSize({ width: 600, height: 400 });
        assert.equal(await web.locator('#systemSearch').evaluate(el => el.getBoundingClientRect().right <= innerWidth), true);
        console.log('PASS System Search web fallback and compact layout.');
    } finally { if (app) await app.close(); if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
