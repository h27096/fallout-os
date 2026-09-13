const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
(async () => {
 const server = http.createServer((req,res) => {
  const path = __dirname + '/' + (req.url === '/' ? 'index.html' : req.url.slice(1));
  if (!fs.existsSync(path)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(fs.readFileSync(path));
 }).listen(0, '127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const browser = await chromium.launch({headless:true, channel:'msedge'});
 try {
  const page = await browser.newPage(); const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  async function boot() {
   await page.getByText('START SYSTEM',{exact:true}).click();
   await page.waitForFunction(()=>!document.getElementById('command').disabled);
  }
  async function command(text) { await page.locator('#command').fill(text); await page.locator('#command').press('Enter'); }
  async function dialog(button, value) { page.once('dialog', d=>value === false ? d.dismiss() : d.accept(value)); await page.locator(button).click(); }
  await boot(); await command('DIR'); assert.match(await page.locator('#output').innerText(), /CLASSIFIED \[LOCKED\]/);
  await command('OPEN CLASSIFIED.DAT'); assert.match(await page.locator('#output').innerText(), /ACCESS DENIED/);
  await page.getByText('FILES',{exact:true}).click();
  await page.getByText('[DIR] CLASSIFIED [LOCKED]',{exact:true}).click();
  assert.match(await page.locator('#fileStatus').innerText(), /ACCESS DENIED/);
  await page.getByText('[DIR] VAULT',{exact:true}).click();
  await dialog('#folderNew', 'MY RECORDS');
  await dialog('#fileNew', 'TEST.DAT');
  await page.locator('#fileContent').fill('Mixed Case\n<img src=x onerror=alert(1)>');
  await page.locator('#fileSave').click(); assert.match(await page.locator('#fileStatus').innerText(), /SAVED/);
  await dialog('#fileRename', 'RENAMED.LOG');
  await page.locator('#fileContent').fill('unsaved');
  await dialog('#fileClose', false); assert.equal(await page.locator('#explorerWindow').isVisible(),true);
  await dialog('#fileClose');
  await command('CD VAULT/MY RECORDS'); await command('OPEN RENAMED.LOG');
  assert.equal(await page.locator('#fileContent').inputValue(),'Mixed Case\n<img src=x onerror=alert(1)>');
  await page.locator('#fileClose').click();
  await page.reload(); await boot(); await command('OPEN /VAULT/MY RECORDS/RENAMED.LOG');
  assert.match(await page.locator('#fileContent').inputValue(), /Mixed Case/);
  await dialog('#fileDelete'); assert.equal(await page.locator('#fileEditor').isVisible(),false);
  await dialog('#fileDelete'); assert.equal(await page.locator('#filePath').innerText(),'C:/ROBCO/VAULT');
  await page.locator('#fileClose').click();
  await command('OVERSEER'); await command('PASSWORD'); await command('WRITELOG'); await command('TEST LOG <B>SAFE</B>');
  await command('OPEN OVERSEER.LOG'); assert.match(await page.locator('#fileContent').inputValue(),/TEST LOG <B>SAFE<\/B>/);
  assert.equal(await page.locator('#fileSave').isDisabled(),true);
  await page.locator('#fileClose').click(); await command('OPEN CLASSIFIED.DAT');
  await page.locator('#fileContent').fill('OVERSEER UPDATED'); await page.locator('#fileSave').click();
  await page.evaluate(()=>vaultFiles.write('/CLASSIFIED/CLASSIFIED.DAT','Changed elsewhere')); await page.locator('#fileContent').fill('Old draft'); await page.locator('#fileSave').click(); assert.match(await page.locator('#fileStatus').innerText(),/changed in another app/); page.once('dialog',d=>d.accept()); await page.locator('#fileRoot').click();
  await page.screenshot({path:require('node:os').tmpdir()+'/fallout-explorer-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:require('node:os').tmpdir()+'/fallout-explorer-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  const ids = await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id)); assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(errors,[]);
  console.log('PASS: explorer UI CRUD, unsaved changes, terminal paths, reload persistence, locked records, live logs, mobile layout and no page errors.');
 } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
