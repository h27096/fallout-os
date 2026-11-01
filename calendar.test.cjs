'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const server = http.createServer((req,res) => { const file = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.slice(1)); if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); } res.end(fs.readFileSync(file)); });
 await new Promise(r => server.listen(0,'127.0.0.1',r));
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage({timezoneId:'America/Chicago',locale:'en-US'}), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-19T17:30:00Z')});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{localStorage.setItem('unrelated-data','preserve');calendar.open();});
  assert.equal(await page.locator('#calendarClock').innerText(),'12:30:00');
  assert.equal(await page.locator('#desktopClock').textContent(),'12:30');
  await page.evaluate(()=>{document.getElementById('command').disabled=false;document.getElementById('command').value='TIME';runCommand();});
  assert.match(await page.locator('#output').textContent(),/CURRENT SYSTEM TIME: 12:30:00/);
  await page.locator('#calendarTime').fill('24:00');
  assert.equal(await page.locator('#calendarTime').evaluate(el=>el.checkValidity()),false);
  await page.locator('#calendarTime').fill('2:35 PM');
  assert.equal(await page.locator('#calendarTime').evaluate(el=>el.checkValidity()),false);
  assert.equal(await page.locator('[aria-current="date"]').getAttribute('data-date'),'2026-09-19');
  await page.locator('#calendarPrev').click(); assert.match(await page.locator('#calendarMonth').innerText(),/August/);
  await page.locator('#calendarNext').click();
  await page.locator('#calendarTitle').fill('<b>Vault meeting</b>'); await page.locator('#calendarTime').fill('12:31'); await page.locator('#calendarNotes').fill('Bring supplies');
  await page.getByText('SAVE EVENT',{exact:true}).click(); assert.equal(await page.locator('#calendarAgenda b').count(),0);
  const savedBeforeReload = await page.evaluate(()=>localStorage.getItem('robco.calendar.v1'));
  await page.reload(); await page.evaluate(()=>calendar.open());
  assert.equal(await page.evaluate(()=>localStorage.getItem('robco.calendar.v1')),savedBeforeReload); assert.match(await page.locator('#calendarAgenda').innerText(),/Vault meeting/);
  await page.locator('#calendarAgenda').getByText('EDIT',{exact:true}).click(); assert.equal(await page.locator('#calendarTime').inputValue(),'12:31'); await page.locator('#calendarTitle').fill('Updated meeting'); await page.getByText('SAVE EVENT',{exact:true}).click();
  await page.locator('#calendarClose').click(); await page.clock.fastForward(61000);
  assert.equal(await page.locator('#calendarWindow').isVisible(),true); assert.match(await page.locator('#calendarAlerts').innerText(),/Updated meeting.*12:31/);
  await page.clock.fastForward(3000); assert.equal(await page.locator('#calendarAlerts > div').count(),1);
  await page.reload(); await page.evaluate(()=>calendar.open()); assert.equal(await page.locator('#calendarAlerts > div').count(),0);
  page.once('dialog',d=>d.accept()); await page.locator('#calendarDayEvents').getByText('DELETE',{exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('robco.calendar.v1'))),[]);
  await page.locator('#calendarTitle').fill('Invalid DST time'); await page.locator('#calendarEventDate').fill('2027-03-14'); await page.locator('#calendarTime').fill('02:30'); await page.getByText('SAVE EVENT',{exact:true}).click();
  assert.match(await page.locator('#calendarStatus').innerText(),/valid local date/);
  await page.locator('#calendarNew').click();
  await page.evaluate(()=>localStorage.setItem('robco.calendar.v1','damaged')); await page.reload(); await page.evaluate(()=>calendar.open());
  await page.locator('#calendarTitle').fill('Must not overwrite'); await page.locator('#calendarTime').fill('14:00'); await page.getByText('SAVE EVENT',{exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('robco.calendar.v1')),'damaged'); assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-data')),'preserve');
  await page.locator('#calendarNew').click(); assert.deepEqual(errors,[]);
  for (const [zone,instant,expected] of [
   ['America/Chicago','2026-11-01T20:35:42Z','14:35:42'],
   ['Asia/Kolkata','2026-11-01T20:35:42Z','02:05:42'],
   ['America/Chicago','2026-11-02T05:59:59Z','23:59:59']
  ]) {
   const check = await browser.newPage({timezoneId:zone,locale:'en-US'});
   await check.clock.install({time:new Date(instant)});
   await check.goto('http://127.0.0.1:'+server.address().port);
   assert.equal(await check.locator('#calendarClock').textContent(),expected);
   assert.equal(await check.locator('#desktopClock').textContent(),expected.slice(0,5));
   if (expected === '23:59:59') {
    await check.clock.fastForward(1000);
    assert.equal(await check.locator('#calendarClock').textContent(),'00:00:00');
    assert.equal(await check.locator('#desktopClock').textContent(),'00:00');
   }
   await check.close();
  }
  console.log('Calendar passed: local dates, navigation, CRUD, literal text, persistence, due reminders, deduplication, DST validation and data preservation.');
 } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
