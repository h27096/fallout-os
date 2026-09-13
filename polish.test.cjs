const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
(async () => {
    const server = http.createServer((req, res) => {
        const path = __dirname + (req.url === '/' ? '/index.html' : req.url);
        if (!fs.existsSync(path)) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(fs.readFileSync(path));
    }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    try {
        const page = await browser.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.clock.install();
        await page.getByRole('button', { name: 'START SYSTEM', exact: true }).click();
        await page.evaluate(() => boot()); // A second invocation must not schedule a second boot.
        await page.clock.runFor(7100);
        assert.equal((await page.locator('#bootOutput').innerText()).match(/ROBCO TERMINAL READY/g).length, 1);
        const launch = name => page.locator('#desktopIcons').getByRole('button', { name, exact: true }).click();
        await launch('NOTES');
        await page.locator('#notesWindow [data-field=title]').fill('Draft');
        await page.locator('#notesWindow [data-field=body]').fill('Keep this text');
        await launch('HOLOTAPES'); await launch('MUSIC / RADIO'); await launch('VAULTNET');
        assert.equal(await page.locator('#notesWindow').isVisible(), true);
        await launch('NOTES');
        assert.equal(await page.locator('#notesWindow [data-field=body]').inputValue(), 'Keep this text');
        assert.equal(await page.evaluate(() => {
            const p = document.getElementById('notesWindow');
            return document.elementFromPoint(50, p.getBoundingClientRect().top + 20).closest('section') === p;
        }), true);
        page.once('dialog', dialog => dialog.dismiss());
        await page.locator('#notesWindow [data-field=search]').press('Escape');
        assert.equal(await page.locator('#notesWindow').isVisible(), true);
        await page.locator('#notesWindow [data-action=save]').click();
        await page.locator('#notesWindow [data-action=files]').click();
        await page.locator('#fileContent').fill('Saved from Files');
        assert.match(await page.locator('#fileStatus').innerText(), /UNSAVED/);
        await page.locator('#fileContent').press('Control+s');
        assert.match(await page.locator('#fileStatus').innerText(), /FILE SAVED/);
        await page.locator('#fileClose').click();
        assert.equal(await page.evaluate(() => document.activeElement.getClientRects().length > 0), true);
        await launch('TERMINAL');
        await page.getByRole('button', { name: 'SECURITY', exact: true }).click();
        assert.match(await page.locator('#output').innerText(), /ACCESS DENIED/);
        async function command(value) { await page.locator('#command').fill(value); await page.locator('#command').press('Enter'); }
        await command('OVERSEER'); await command('PASSWORD'); await command('WRITELOG');
        await page.evaluate(() => localStorage.setItem('vaultLogs', JSON.stringify(['Other tab log'])));
        await command('Keep my log draft');
        assert.match(await page.locator('#output').innerText(), /changed in another tab/);
        assert.equal(await page.locator('#command').inputValue(), 'Keep my log draft');
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('vaultLogs'))), ['Other tab log']);
        assert.equal(await page.evaluate(() => vaultFiles.get('/VAULT/NOTES/DRAFT.LOG').content), 'Saved from Files');
        // Every close control and launcher stays inside short, narrow viewports.
        for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 400 }, { width: 320, height: 568 }]) {
            await page.setViewportSize(size);
            for (const [name, id] of [['TERMINAL', 'terminalWindow'], ['VAULTNET', 'browserWindow'], ['FILES', 'explorerWindow'], ['NOTES', 'notesWindow'], ['HOLOTAPES', 'holotapesWindow'], ['MUSIC / RADIO', 'radioWindow']]) {
                await launch(name);
                assert.equal(await page.evaluate(id => {
                    const panel = document.getElementById(id), rect = panel.getBoundingClientRect();
                    const close = panel.querySelector('header button').getBoundingClientRect();
                    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && close.top >= 0 && close.bottom <= innerHeight && panel.scrollWidth <= panel.clientWidth + 1;
                }, id), true, name + ' geometry at ' + size.width);
            }
        }
        await page.screenshot({ path: require('node:os').tmpdir() + '/fallout-polish-mobile.png' });
        await page.reload();
        await page.evaluate(() => localStorage.setItem('vaultLogs', '{broken'));
        await page.reload();
        await page.evaluate(() => { boot(); }); await page.clock.runFor(7100);
        await command('OVERSEER'); await command('PASSWORD'); await command('WRITELOG'); await command('Recovery draft');
        assert.match(await page.locator('#output').innerText(), /damaged/);
        assert.equal(await page.evaluate(() => localStorage.getItem('vaultLogs')), '{broken');
        assert.deepEqual(errors, []);
        console.log('PASS: single boot, app stacking, retained drafts, close cancellation/focus, Files save shortcut, working terminal launchers, stale/corrupt log protection and window geometry at three viewport sizes.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
