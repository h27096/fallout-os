'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
    const server = http.createServer((req, res) => {
        const name = req.url === '/' ? 'index.html' : req.url.slice(1);
        if (!/^[\w.-]+$/.test(name) || !fs.existsSync(path.join(__dirname, name))) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(fs.readFileSync(path.join(__dirname, name)));
    }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.evaluate(() => tasks.open());
        await page.locator('#taskTitle').fill('<b>Plain task</b>');
        await page.getByText('SAVE TASK', { exact: true }).click();
        assert.equal(await page.locator('#taskList b').count(), 0);
        await page.reload(); await page.evaluate(() => tasks.open());
        assert.match(await page.locator('#taskList').innerText(), /Plain task/);
        await page.locator('#taskList').getByText('COMPLETE', { exact: true }).click();
        await page.locator('#taskFilter').selectOption('Active');
        assert.equal(await page.locator('#taskList li').count(), 0);
        await page.locator('#taskFilter').selectOption('All');
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#taskList').getByText('DELETE', { exact: true }).click();
        assert.equal(await page.locator('#taskList li').count(), 0);
        await page.evaluate(() => localStorage.setItem('robco.tasks.v1', '[] '));
        await page.locator('#taskTitle').fill('Stale write');
        await page.getByText('SAVE TASK', { exact: true }).click();
        assert.match(await page.locator('#taskStatus').innerText(), /NOT SAVED/);
        assert.equal(await page.evaluate(() => localStorage.getItem('robco.tasks.v1')), '[] ');
        console.log('PASS: Tasks persistence, literal titles, completion/filtering, deletion and stale-write protection.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
