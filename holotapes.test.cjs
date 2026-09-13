const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
(async () => {
 const server = http.createServer((req,res) => { const path=__dirname+'/'+(req.url==='/'?'index.html':req.url.slice(1)); if(!fs.existsSync(path)){res.writeHead(404);return res.end();} res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path)); }).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r)); const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  const app=page.locator('#holotapesWindow'), field=n=>app.locator(`[data-field="${n}"]`), click=n=>app.locator(`[data-action="${n}"]`).click();
  await page.evaluate(()=>{recordApps.notes.draft('Expedition','Day 1\n<script>literal</script>');recordApps.notes.button('save').click();recordApps.notes.button('tape').click();});
  assert.equal(await app.isVisible(),true); await click('save');assert.equal(await app.locator('.holotapeReader').innerText(),'Day 1\n<script>literal</script>');assert.equal(await field('body').isVisible(),false);
  await click('edit');await field('body').fill('Day 2');await click('read');assert.equal(await app.locator('.holotapeReader').innerText(),'Day 2');await click('save');
  await page.reload();await page.evaluate(()=>recordApps.holotapes.open());await field('list').getByText('EXPEDITION',{exact:true}).click();assert.equal(await app.locator('.holotapeReader').innerText(),'Day 2');
  assert.equal(await page.evaluate(()=>vaultFiles.get('/VAULT/NOTES/EXPEDITION.LOG').content),'Day 1\n<script>literal</script>');
  page.once('dialog',d=>d.accept('/CLASSIFIED/CLASSIFIED.DAT'));await click('import');assert.match(await app.locator('[role=status]').innerText(),/ACCESS DENIED/);
  page.once('dialog',d=>d.accept('/VAULT/REACTOR.DAT'));await click('import');assert.match(await field('body').inputValue(),/REACTOR DATABASE/);await click('save');
  await click('note');assert.equal(await page.locator('#notesWindow').isVisible(),true);await page.locator('#notesWindow [data-action=save]').click();
  await page.evaluate(()=>recordApps.holotapes.open());await click('files');assert.match(await page.locator('#fileContent').inputValue(),/REACTOR DATABASE/);await page.locator('#fileClose').click();await page.evaluate(()=>recordApps.holotapes.open());
  page.once('dialog',d=>d.accept('Reactor tape'));await click('rename');assert.equal(await field('title').inputValue(),'REACTOR TAPE');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:require('node:os').tmpdir()+'/fallout-holotapes-mobile.png'});
  page.once('dialog',d=>d.accept());await click('delete');assert.equal(await field('list').getByText('REACTOR TAPE',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: tape library, reader/editor, reload, rename/delete, independent Notes copies, Files import/export, clearance, literal text and mobile.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
