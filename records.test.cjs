const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
(async () => {
 const server = http.createServer((req,res) => {
  const path = __dirname + '/' + (req.url === '/' ? 'index.html' : req.url.slice(1));
  if (!fs.existsSync(path)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html'); res.end(fs.readFileSync(path));
 }).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page = await browser.newPage(), errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const app = page.locator('#holotapesWindow'), field = n=>app.locator(`[data-field="${n}"]`), click = n=>app.locator(`[data-action="${n}"]`).click();
  await page.evaluate(()=>recordApps.holotapes.open());
  await click('new'); await field('title').fill('Field journal'); await field('body').fill('Mixed Case\n<img src=x onerror=alert(1)>'); await click('save');
  assert.match(await app.locator('[role=status]').innerText(),/SAVED/);
  await click('edit'); await field('body').fill('Revised log'); await field('body').press('Control+s');
  await page.reload(); await page.evaluate(()=>recordApps.holotapes.open()); await field('list').getByText('FIELD JOURNAL',{exact:true}).click(); assert.equal(await field('body').inputValue(),'Revised log');
  await click('edit'); await field('body').fill('Draft'); page.once('dialog',d=>d.dismiss()); await click('new'); assert.equal(await field('body').inputValue(),'Draft');
  page.once('dialog',d=>d.accept()); await click('close'); await page.evaluate(()=>recordApps.holotapes.open()); assert.equal(await field('body').inputValue(),'Revised log');
  page.once('dialog',d=>d.accept('Renamed')); await click('rename'); assert.equal(await field('title').inputValue(),'RENAMED');
  await page.evaluate(()=>vaultFiles.write('/VAULT/HOLOTAPES/RENAMED.DAT','External edit')); await click('edit'); await field('body').fill('Concurrent edit'); await click('save'); assert.match(await app.locator('[role=status]').innerText(),/changed in Files/);
  page.once('dialog',d=>d.accept()); await field('list').getByText('RENAMED',{exact:true}).click(); assert.equal(await field('body').inputValue(),'External edit');
  await click('files'); assert.equal(await page.locator('#fileContent').inputValue(),'External edit'); await page.locator('#fileClose').click(); await page.evaluate(()=>recordApps.holotapes.open());
  await field('search').fill('missing'); assert.match(await field('list').innerText(),/NO MATCH/); await field('search').fill('');
  await page.setViewportSize({width:390,height:844}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:require('node:os').tmpdir()+'/fallout-records-mobile.png'});
  page.once('dialog',d=>d.accept()); await click('delete'); assert.match(await field('list').innerText(),/LIBRARY EMPTY/);
  await click('new'); await field('title').fill('Quota'); await field('body').fill('Keep draft');
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('quota')};}); await click('save'); assert.match(await app.locator('[role=status]').innerText(),/NOT SAVED/); assert.equal(await field('body').inputValue(),'Keep draft');
  assert.deepEqual(errors,[]); console.log('PASS: Holotape editor CRUD, reload, search, unsaved guards, rename, Files integration, edit conflicts, quota draft retention, mobile and page errors.');
 } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
