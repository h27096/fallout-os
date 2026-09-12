const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const assert = require('assert/strict');
(async () => {
 const root = __dirname + '/';
 const server = http.createServer((req,res) => {
  const file = root + (req.url === '/' ? 'index.html' : req.url.slice(1));
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(fs.readFileSync(file));
 }).listen(0, '127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 const browser = await chromium.launch({headless:true, channel:'msedge'});
 try {
 const page = await browser.newPage();
 const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 await page.route('https://embed.test/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Embedded page works</h1>'}));
 await page.route('https://blocked.test/**',r=>r.fulfill({headers:{'content-security-policy':"frame-ancestors 'none'"},contentType:'text/html',body:'Blocked'}));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByText('START SYSTEM',{exact:true}).click();
 await page.locator('#command').waitFor({state:'visible',timeout:10000});
 await page.waitForFunction(()=>!document.getElementById('command').disabled);
 assert.match(await page.locator('#bootOutput').innerText(),/ALL SYSTEMS ONLINE/);
 async function command(text) { await page.locator('#command').fill(text); await page.locator('#command').press('Enter'); }
 await command('HELP'); assert.match(await page.locator('#output').innerText(),/AVAILABLE COMMANDS/);
 await command('OVERSEER'); await command('PASSWORD');
 await command('WRITELOG'); await command('BROWSER TEST LOG'); await command('LOGS');
 assert.match(await page.locator('#output').innerText(),/BROWSER TEST LOG/);
 await command('LOCKDOWN'); await command('STATUS');
 assert.match(await page.locator('#output').innerText(),/LOCKDOWN ACTIVE/);
 await command('BROWSER');
 assert.equal(await page.locator('#browserWindow').isVisible(),true);
 async function go(text) { await page.locator('#browserAddress').fill(text); await page.locator('#browserAddress').press('Enter'); }
 await go('embed.test/CaseSensitive');
 await page.frameLocator('#browserFrame').getByText('Embedded page works').waitFor();
 assert.equal(await page.locator('#browserAddress').inputValue(),'https://embed.test/CaseSensitive');
 await go('https://blocked.test/');
 assert.equal(await page.locator('#browserFallback').isVisible(),true);
 assert.equal(await page.locator('#openExternal').getAttribute('href'),'https://blocked.test/');
 await page.locator('#backButton').click();
 assert.equal(await page.locator('#browserAddress').inputValue(),'https://embed.test/CaseSensitive');
 await page.locator('#forwardButton').click();
 assert.equal(await page.locator('#browserAddress').inputValue(),'https://blocked.test/');
 await page.getByText('↻ RELOAD',{exact:true}).click();
 await page.getByText('⌂ HOME',{exact:true}).click();
 assert.equal(await page.locator('#browserHome').isVisible(),true);
 await page.locator('#backButton').click();
 await go('https://embed.test/new');
 assert.equal(await page.locator('#forwardButton').isDisabled(),true);
 await go('javascript:alert(1)');
 assert.match(await page.locator('#browserStatus').innerText(),/INVALID ADDRESS/);
 await page.getByText('CLOSE',{exact:true}).click();
 assert.equal(await page.locator('#browserWindow').isVisible(),false);
 await command('STATUS');
 await page.getByText('VAULTNET',{exact:true}).click();
 await page.getByText('⌂ HOME',{exact:true}).click();
 await page.screenshot({path:require('node:os').tmpdir()+'/fallout-browser-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:require('node:os').tmpdir()+'/fallout-browser-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
 const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(errors,[]);
 assert.match(await page.evaluate(()=>localStorage.getItem('vaultLogs')),/BROWSER TEST LOG/);
 console.log('PASS: boot, terminal, Overseer, logs, lockdown, desktop launch, iframe, fallback, navigation, reload, home, close, invalid URLs, mobile overflow, unique IDs, no JavaScript errors.');
 } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
