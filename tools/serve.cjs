'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const assets = new Set(fs.readdirSync(root).filter(name => /\.(html|css|js)$/.test(name)));
http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!assets.has(name)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[path.extname(name)]);
  fs.createReadStream(path.join(root, name)).pipe(res);
}).listen(8080, '127.0.0.1', () => console.log('Fallout OS: http://127.0.0.1:8080'));
