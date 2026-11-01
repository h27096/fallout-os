'use strict';
const { _electron, chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-settings-'));
let png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=', 'base64');
const imagePath = path.join(profile, 'chosen.png');
fs.writeFileSync(imagePath, png);
const packaged = process.argv.includes('--packaged');
const launch = () => _electron.launch({ ...(packaged ? { executablePath: process.env.FALLOUT_TEST_EXE || path.join(root, 'dist/win-unpacked/Fallout OS.exe') } : {}), args: [...(packaged ? [] : [root]), '--user-data-dir=' + profile] });
async function ready(page) {
    await page.waitForLoadState();
    await page.evaluate(async () => { await settings.ready; settings.open(); });
}
async function settled(page, expected) {
    await page.waitForFunction(() => !document.getElementById('wallpaperRestore').disabled);
    if (expected) assert.match(await page.locator('#settingsStatus').innerText(), expected);
}
async function exercise(page) {
    for (const id of ['blue', 'green', 'wasteland', 'black']) {
        await page.locator(`[data-wallpaper="${id}"]`).click(); await settled(page, /SAVED/);
        assert.equal(await page.locator(`[data-wallpaper="${id}"]`).getAttribute('aria-pressed'), 'true');
    }
    for (const [mode, size] of [['fit', 'contain'], ['center', 'auto'], ['fill', 'cover']]) {
        await page.locator('#wallpaperPosition').selectOption(mode); await settled(page, /SAVED/);
        assert.equal(await page.locator('#desktopScreen').evaluate(el => el.style.backgroundSize), size);
    }
}
(async () => {
    let app = await launch();
    try {
        png = Buffer.from(await app.evaluate(({ nativeImage }) => nativeImage.createFromBitmap(Buffer.from([50, 150, 40, 255]), { width: 1, height: 1 }).toPNG().toString('base64')), 'base64');
        fs.writeFileSync(imagePath, png);
        let page = await app.firstWindow(); await ready(page);
        await exercise(page);
        await page.evaluate(() => localStorage.setItem('settings-unrelated', 'keep'));
        // Mock only the OS picker; real IPC, decoder and storage run unchanged.
        await app.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, imagePath);
        await page.locator('#wallpaperChoose').click(); await settled(page, /CUSTOM WALLPAPER SAVED/);
        await page.locator('#wallpaperPosition').selectOption('fit'); await settled(page, /SAVED/);
        const saved = await page.evaluate(() => robcoDesktop.wallpaper.read());
        assert.equal(saved.wallpaper, 'custom'); assert.ok(saved.image.startsWith('data:image/png;base64,'));
        fs.unlinkSync(imagePath);
        await app.close(); app = await launch(); page = await app.firstWindow(); await ready(page);
        assert.deepEqual(await page.evaluate(() => robcoDesktop.wallpaper.read()), saved);
        assert.equal(await page.locator('[data-wallpaper="custom"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => localStorage.getItem('settings-unrelated')), 'keep');
        await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }); });
        await page.locator('#wallpaperChoose').click(); await settled(page, /canceled/);
        assert.deepEqual(await page.evaluate(() => robcoDesktop.wallpaper.read()), saved);
        fs.writeFileSync(imagePath, 'not an image');
        await app.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, imagePath);
        await page.locator('#wallpaperChoose').click(); await settled(page, /could not/);
        assert.deepEqual(await page.evaluate(() => robcoDesktop.wallpaper.read()), saved);
        assert.equal(await page.evaluate(async () => { try { await robcoDesktop.wallpaper.save({ wallpaper: '../bad', position: 'fill' }); return false; } catch { return true; } }), true);
        await page.locator('#wallpaperRestore').click(); await settled(page, /RESTORED/);
        assert.deepEqual(await page.evaluate(() => robcoDesktop.wallpaper.read()), { wallpaper: 'default', position: 'fill', image: null });
        assert.equal(await page.locator('#desktopScreen').evaluate(el => el.style.backgroundImage), 'none');
        const userData = await app.evaluate(({ app }) => app.getPath('userData'));
        await app.close(); app = null;
        fs.writeFileSync(path.join(userData, 'personalization/wallpaper.json'), '{broken');
        app = await launch(); page = await app.firstWindow(); await ready(page);
        assert.match(await page.locator('#settingsStatus').innerText(), /could not be read/);
        await page.locator('#wallpaperRestore').click(); await settled(page, /RESTORED/);
        console.log('Settings Electron passed: choices, positioning, real restart, copied image, cancellation, invalid image, invalid IPC, corruption recovery, restore, unrelated data.');
    } finally { if (app) await app.close(); }
    const server = http.createServer((req, res) => {
        const name = req.url === '/' ? 'index.html' : req.url.slice(1);
        if (!/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(root, name))) { res.writeHead(404); return res.end(); }
        res.end(fs.readFileSync(path.join(root, name)));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:' + server.address().port); await ready(page); await exercise(page);
        await page.locator('#wallpaperFile').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: png }); await settled(page, /CUSTOM WALLPAPER SAVED/);
        await page.reload(); await ready(page);
        assert.equal(await page.locator('[data-wallpaper="custom"]').getAttribute('aria-pressed'), 'true');
        await page.locator('#wallpaperRestore').click(); await settled(page, /RESTORED/);
        await page.reload(); await ready(page);
        assert.equal(await page.locator('[data-wallpaper="default"]').getAttribute('aria-pressed'), 'true');
        assert.deepEqual(errors, []);
        console.log('Settings web passed: IndexedDB persistence, image import, positions, reload and restore.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
