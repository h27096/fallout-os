'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { validatePackage, ExtensionStore, MAX_PACKAGE } = require('./electron/extension-store.cjs');
const raw = fs.readFileSync(path.join(__dirname, 'samples/supply-planner.robcoapp'), 'utf8');
test('package validation rejects malformed, traversal, unsupported and oversized content', () => {
  assert.equal(validatePackage(raw).manifest.id, 'user.supply-planner');
  for (const bad of ['{', 'null', '[]', ' '.repeat(MAX_PACKAGE + 1)]) assert.throws(() => validatePackage(bad));
  for (const name of ['../app.js', '/index.html', 'C:\\app.js', 'a/../../app.js', '__proto__', 'a%2fapp.js', 'app.js:stream']) {
    const pkg = JSON.parse(raw); Object.defineProperty(pkg.files, name, { value: 'attack', enumerable: true });
    assert.throws(() => validatePackage(JSON.stringify(pkg)));
  }
  for (const change of [p => p.manifest.permissions.push('network'), p => p.manifest.formatVersion = 2, p => p.manifest.id = '../escape', p => p.manifest.name = '<script>', p => p.files['app.js'] = 'x'.repeat(192 * 1024 + 1), p => delete p.files['index.html'], p => p.files['app.js'] = {}, p => p.files = null]) {
    const pkg = JSON.parse(raw); change(pkg); assert.throws(() => validatePackage(JSON.stringify(pkg)));
  }
});
test('install, enable, restart and uninstall persist without modifying other data', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-extensions-unit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'existing-data'), 'preserve');
  let store = new ExtensionStore(dir); const pkg = validatePackage(raw), id = pkg.manifest.id;
  store.install(pkg); assert.throws(() => store.install(pkg));
  store.enable(id, false); store = new ExtensionStore(dir); assert.equal(store.get(id).enabled, false);
  store.enable(id, true); store = new ExtensionStore(dir); assert.equal(store.get(id).enabled, true);
  store.uninstall(id); store = new ExtensionStore(dir); assert.equal(store.list().apps.length, 0);
  assert.throws(() => store.get(id)); assert.equal(fs.readFileSync(path.join(dir, 'existing-data'), 'utf8'), 'preserve');
});
test('corrupt registry is preserved and blocks writes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robco-extensions-corrupt-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'extensions')); const file = path.join(dir, 'extensions/registry-v1.json');
  fs.writeFileSync(file, 'damaged'); const store = new ExtensionStore(dir);
  assert.match(store.list().warning, /preserved/); assert.throws(() => store.install(validatePackage(raw)));
  assert.equal(fs.readFileSync(file, 'utf8'), 'damaged');
});
