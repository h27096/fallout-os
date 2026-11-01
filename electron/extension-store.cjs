'use strict';
const fs = require('node:fs');
const path = require('node:path');
const MAX_PACKAGE = 512 * 1024, MAX_FILE = 192 * 1024, MAX_APPS = 32;
const fail = message => { throw new Error(message); };
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('Unexpected package fields.');
}
function label(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f<>]/.test(value);
}
function validatePackage(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_PACKAGE) fail('Package exceeds 512 KiB.');
  let pkg; try { pkg = JSON.parse(raw); } catch { fail('Package is not valid JSON.'); }
  object(pkg, ['manifest', 'files']);
  const m = pkg.manifest;
  object(m, ['formatVersion', 'id', 'name', 'version', 'description', 'entry', 'permissions']);
  if (m.formatVersion !== 1 || !/^user\.[a-z][a-z0-9-]{2,47}$/.test(m.id) || !label(m.name, 60) ||
      typeof m.version !== 'string' || !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(m.version) || !label(m.description, 240) ||
      m.entry !== 'index.html' || !Array.isArray(m.permissions) || m.permissions.length) fail('Invalid or unsupported manifest. Version 1 grants no permissions.');
  // No extraction: the entire package is one JSON record. Only three exact asset names are accepted.
  object(pkg.files, ['index.html', 'style.css', 'app.js']);
  if (typeof pkg.files['index.html'] !== 'string' || !pkg.files['index.html'].trim()) fail('Missing index.html.');
  for (const content of Object.values(pkg.files)) if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_FILE || content.includes('\0')) fail('Invalid asset or asset exceeds 192 KiB.');
  return pkg;
}
class ExtensionStore {
  constructor(userData) { this.file = path.join(userData, 'extensions', 'registry-v1.json'); this.records = []; this.warning = ''; this.load(); }
  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      if (fs.statSync(this.file).size > MAX_PACKAGE * MAX_APPS + 16384) fail('Registry exceeds size limit.');
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      object(data, ['formatVersion', 'apps']);
      if (data.formatVersion !== 1 || !Array.isArray(data.apps) || data.apps.length > MAX_APPS) fail('Invalid registry.');
      const ids = new Set();
      this.records = data.apps.map(row => {
        object(row, ['enabled', 'package']);
        const pkg = validatePackage(JSON.stringify(row.package));
        if (typeof row.enabled !== 'boolean' || ids.has(pkg.manifest.id)) fail('Invalid registry entry.');
        ids.add(pkg.manifest.id); return { enabled: row.enabled, package: pkg };
      });
    } catch { this.records = []; this.warning = 'Extension storage is corrupt or unreadable. No extensions were loaded; the original file is preserved. Restore extensions/registry-v1.json from a backup while Fallout OS is closed.'; }
  }
  list() { return { apps: this.records.map(row => ({ ...row.package.manifest, enabled: row.enabled })), warning: this.warning }; }
  save(next) {
    if (this.warning) fail(this.warning);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = this.file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify({ formatVersion: 1, apps: next }), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temp, this.file); this.records = next;
  }
  install(pkg) {
    pkg = validatePackage(JSON.stringify(pkg));
    if (this.records.some(row => row.package.manifest.id === pkg.manifest.id)) fail('This app ID is already installed. Uninstall it before installing a replacement.');
    if (this.records.length >= MAX_APPS) fail('Maximum of 32 extensions reached.');
    this.save([...this.records, { enabled: true, package: pkg }]);
  }
  get(id) {
    if (typeof id !== 'string') fail('Invalid app ID.');
    const row = this.records.find(row => row.package.manifest.id === id);
    if (!row) fail('App is not installed.'); return row;
  }
  enable(id, enabled) {
    if (typeof enabled !== 'boolean') fail('Invalid enabled value.');
    this.get(id); this.save(this.records.map(row => row.package.manifest.id === id ? { ...row, enabled } : row));
  }
  uninstall(id) { this.get(id); this.save(this.records.filter(row => row.package.manifest.id !== id)); }
}
module.exports = { ExtensionStore, validatePackage, MAX_PACKAGE };
