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
        await page.getByRole('button', { name: 'START SYSTEM', exact: true }).click();
        await page.locator('#desktopScreen').waitFor({state:'visible'});
        for (const size of [{width:1280,height:720}, {width:390,height:400}]) {
            await page.setViewportSize(size);
            for (const [label, panel, close] of [['HOLOTAPES','holotapesWindow','CLOSE HOLOTAPES'], ['MUSIC / RADIO','radioWindow','CLOSE RADIO']]) {
                await page.locator('#desktopIcons').getByRole('button',{name:label,exact:true}).click();
                assert.equal(await page.locator('#'+panel).isVisible(),true);
                await page.getByRole('button',{name:close,exact:true}).click();
            }
        }
        await page.setViewportSize({width:1280,height:720});
        await page.evaluate(() => { recordApps.holotapes.draft('Integration tape','Saved tape text'); recordApps.holotapes.button('save').click(); recordApps.holotapes.button('files').click(); });
        await page.locator('#explorerWindow').getByRole('button',{name:'HOLOTAPES',exact:true}).click();
        assert.equal(await page.locator('.holotapeReader').innerText(),'Saved tape text');
        await page.getByRole('button',{name:'CLOSE HOLOTAPES',exact:true}).click();
        await page.locator('#desktopIcons').getByRole('button',{name:'MUSIC / RADIO',exact:true}).click();
        await page.locator('#radioTitle').fill('User source');
        await page.locator('#radioURL').fill('https://example.com/user.mp3');
        await page.locator('#radioAddURL button').click();
        page.once('dialog', d => d.accept('TEST MIX.DAT'));
        await page.locator('#radioSavePlaylist').click();
        assert.match(await page.locator('#radioStatus').innerText(),/PLAYLIST SAVED/);
        await page.locator('#radioClose').click();
        await page.evaluate(() => openExplorer('/VAULT/MUSIC/TEST MIX.DAT'));
        await page.locator('#explorerWindow').getByRole('button',{name:'MUSIC / RADIO',exact:true}).click();
        assert.equal(await page.locator('#radioStation option').count(),2);
        assert.match(await page.locator('#radioTracks').innerText(),/User source/);
        await page.reload();
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('robco.radio.v1')).stations.length),2);
        await page.evaluate(() => { vaultFiles.write('/VAULT/MUSIC/TEST MIX.DAT','{"format":"bad"}'); openExplorer('/VAULT/MUSIC/TEST MIX.DAT'); });
        await page.locator('#explorerWindow').getByRole('button',{name:'MUSIC / RADIO',exact:true}).click();
        assert.match(await page.locator('#fileStatus').innerText(),/Not a RobCo playlist/);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('robco.radio.v1')).stations.length),2);
        assert.deepEqual(errors,[]);
        console.log('PASS: desktop launch clicks at desktop/short mobile sizes, Files tape reader, playlist export/import, reload and malformed-file rollback.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
