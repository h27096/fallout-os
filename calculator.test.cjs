const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
(async () => {
    const server = http.createServer((req,res) => {
        const path = __dirname + (req.url === '/' ? '/index.html' : req.url);
        if (!fs.existsSync(path)) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html'); res.end(fs.readFileSync(path));
    }).listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    const browser = await chromium.launch({headless:true,channel:'msedge'});
    try {
        const page = await browser.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:'+server.address().port); await page.clock.install();
        await page.getByText('START SYSTEM',{exact:true}).click(); await page.clock.runFor(7100);
        const launch=()=>page.locator('#desktopIcons').getByText('CALCULATOR',{exact:true}).click();
        await launch(); const input=page.locator('#calcExpression'), result=page.locator('#calcResult');
        await input.fill('(12+3)*4'); await input.press('Enter'); assert.equal(await result.innerText(),'60');
        await input.fill('1/0'); await input.press('='); assert.match(await page.locator('#calcStatus').innerText(),/divide by zero/);
        assert.equal(await page.locator('#calcHistory li').count(),1);
        await page.locator('#calcHistory button').click(); assert.equal(await input.inputValue(),'(12+3)*4');
        await page.getByRole('button',{name:'Clear expression',exact:true}).click();
        for (const key of ['7','×','8']) await page.locator('#calcKeys').getByText(key,{exact:true}).click();
        await input.press('Enter'); assert.equal(await result.innerText(),'56');
        await input.press('Backspace'); assert.equal(await input.inputValue(),'7×');
        await page.getByRole('button',{name:'Backspace',exact:true}).click(); assert.equal(await input.inputValue(),'7');
        await page.locator('#calcMode').click(); await input.fill('sin(pi/2)'); await page.locator('#calcAngle').selectOption('rad');
        await input.press('Enter'); assert.equal(await result.innerText(),'1');
        await page.locator('#desktopIcons').getByText('HOLOTAPES',{exact:true}).click(); await launch(); assert.equal(await input.inputValue(),'sin(pi/2)');
        await input.press('Escape'); assert.equal(await page.locator('#calculatorWindow').isVisible(),false);
        assert.equal(await page.locator('#desktopIcons button').last().evaluate(el=>el===document.activeElement),true);
        await page.reload(); await page.evaluate(()=>calculator.open());
        assert.equal(await page.locator('#calcHistory li').count(),3); assert.equal(await page.locator('#calcAngle').inputValue(),'rad');
        assert.equal(await page.locator('#calcScientific').isVisible(),true);
        await page.evaluate(()=>{document.getElementById('startupScreen').style.display='none';document.getElementById('desktopScreen').style.display='block';});
        for (const size of [{width:1280,height:720},{width:390,height:400},{width:320,height:568},{width:650,height:600}]) {
            await page.setViewportSize(size); await launch();
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            assert.equal(await page.locator('#calculatorWindow').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
            const dock=await page.locator('#desktopIcons').boundingBox(), panel=await page.locator('#calculatorWindow').boundingBox(); assert.ok(dock.y+dock.height<=panel.y, JSON.stringify({size,dock,panel}));
            await page.locator('#calcClose').click();
        }
        await launch(); await page.locator('#calcClearHistory').click(); assert.equal(await page.locator('#calcHistory li').count(),0);
        await page.evaluate(()=>localStorage.setItem('robco.calculator.v1','damaged')); await page.reload(); await page.evaluate(()=>calculator.open());
        await input.fill('2+2'); await input.press('Enter'); assert.equal(await result.innerText(),'4');
        assert.equal(await page.evaluate(()=>localStorage.getItem('robco.calculator.v1')),'damaged');
        assert.match(await page.locator('#calcStatus').innerText(),/preserved/);
        assert.deepEqual(errors,[]);
        console.log('PASS: calculator input, keypad, history, persistence, invalid storage, focus, mode and responsive geometry.');
    } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exit(1);});

