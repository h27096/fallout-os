/* Shared text-record UI. The filesystem service remains the persistence boundary. */
'use strict';
const recordApps = {};
function createRecordApp({ id, name, version, directory, extension, reader = false }) {
    const panel = document.createElement('section');
    panel.className = 'recordWindow'; panel.id = id + 'Window'; panel.hidden = true;
    panel.setAttribute('aria-label', 'RobCo ' + name);
    panel.innerHTML = `<header class="fileTitle"><div><strong>ROBCO ${name.toUpperCase()}</strong><small>${version} // PERSONAL RECORDS</small></div><button data-action="close">CLOSE ${name.toUpperCase()}</button></header>
      <nav class="fileToolbar" aria-label="Record actions"><button data-action="new">NEW</button><button data-action="save">SAVE</button><button data-action="rename">RENAME</button><button data-action="delete">DELETE</button><button data-action="files">VIEW IN FILES</button></nav>
      <div class="recordWorkspace"><aside><label>SEARCH<input data-field="search" type="search" placeholder="Find a record"></label><nav data-field="list" aria-label="Record library"></nav></aside>
      <main><label>RECORD TITLE<input data-field="title" maxlength="55" placeholder="UNTITLED"></label><small data-field="meta"></small><label data-field="bodyLabel">RECORD TEXT<textarea data-field="body" maxlength="200000" spellcheck="false" placeholder="Begin your vault record..."></textarea></label></main></div>
      <p class="recordStatus" role="status"></p>`;
    document.body.append(panel);
    const field = key => panel.querySelector(`[data-field="${key}"]`);
    const button = key => panel.querySelector(`[data-action="${key}"]`);
    const reading = document.createElement('pre'); reading.className = 'holotapeReader'; reading.hidden = true;
    if (reader) { panel.querySelector('main').append(reading); }
    function mode(read) {
        if (!reader) return;
        reading.textContent = field('body').value || '[BLANK HOLOTAPE]';
        reading.hidden = !read; field('bodyLabel').hidden = read;
    }
    function addAction(key, label, fn) {
        const control = document.createElement('button'); control.dataset.action = key; control.textContent = label;
        control.onclick = () => action(fn); panel.querySelector('.fileToolbar').append(control); return control;
    }
    let selected = null, original = '', originalTitle = '';
    const status = text => { panel.querySelector('[role="status"]').textContent = text; };
    const dirty = () => field('body').value !== original || field('title').value !== originalTitle;
    const discard = () => !dirty() || confirm('Discard unsaved ' + name.toLowerCase() + ' changes?');
    const action = fn => { try { fn(); } catch (error) { status(error.message); } };
    const titleOf = path => path.split('/').pop().replace(/\.(LOG|DAT)$/, '');
    function list() {
        const target = field('list'); target.replaceChildren();
        const folder = vaultFiles.list('/VAULT').find(item => item.path === directory);
        const items = folder ? vaultFiles.list(directory).filter(item => item.type === 'file') : [];
        const matches = items.filter(item => item.name.toLowerCase().includes(field('search').value.toLowerCase()));
        for (const item of matches) {
            const entry = document.createElement('button'); entry.textContent = titleOf(item.path);
            entry.setAttribute('aria-pressed', String(item.path === selected));
            entry.onclick = () => action(() => { if (discard()) load(item.path); }); target.append(entry);
        }
        if (!matches.length) target.textContent = items.length ? 'NO MATCHING RECORDS.' : 'LIBRARY EMPTY. Select NEW to begin.';
        button('rename').disabled = button('delete').disabled = button('files').disabled = !selected;
    }
    function reset(title = '', body = '') {
        selected = null; original = ''; originalTitle = '';
        field('title').value = title; field('body').value = body;
        field('title').readOnly = false; mode(false);
        field('meta').textContent = directory + ' // NEW RECORD';
        list(); status('DRAFT — select SAVE to preserve this record.'); field('title').focus();
    }
    function load(path) {
        const record = vaultFiles.get(path);
        if (record.type !== 'file') throw Error('Select a text file.');
        selected = path; original = record.content; originalTitle = titleOf(path);
        field('title').value = originalTitle; field('body').value = original;
        field('title').readOnly = true; mode(true);
        field('meta').textContent = path; list(); status('RECORD LOADED.');
    }
    function save() {
        const title = field('title').value.trim();
        if (!title) throw Error('Enter a record title before saving.');
        // Renaming is an explicit action, so failed writes never leave half-renamed records.
        if (selected && title !== originalTitle) throw Error('Use RENAME to change a saved record title.');
        if (selected && vaultFiles.get(selected).content !== original) throw Error('Record changed in Files. Reopen it before saving; copy your draft first.');
        if (!selected) {
            if (!vaultFiles.list('/VAULT').some(item => item.path === directory)) vaultFiles.create('/VAULT', directory.split('/').pop(), 'folder');
            selected = vaultFiles.create(directory, title + extension, 'file', field('body').value);
        } else vaultFiles.write(selected, field('body').value);
        load(selected); status('SAVED TO VAULT FILESYSTEM.');
    }
    button('new').onclick = () => action(() => { if (discard()) reset(); });
    button('save').onclick = () => action(save);
    button('close').onclick = () => { if (discard()) { field('body').value = original; field('title').value = originalTitle; mode(true); RobcoWindows.close(panel); } };
    button('rename').onclick = () => action(() => {
        if (!discard()) return;
        const title = prompt('New record title:', originalTitle); if (title === null) return;
        load(vaultFiles.rename(selected, title + extension)); status('RECORD RENAMED.');
    });
    button('delete').onclick = () => action(() => {
        if (!confirm('Delete this record and any unsaved changes?')) return;
        vaultFiles.remove(selected); reset(); status('RECORD DELETED.');
    });
    button('files').onclick = () => action(() => { if (discard()) { openExplorer(selected); if (!document.getElementById('explorerWindow').hidden && explorerFile === selected) { field('body').value = original; field('title').value = originalTitle; mode(true); panel.hidden = true; } } });
    field('search').oninput = () => action(list);
    for (const key of ['title', 'body']) field(key).addEventListener('input', () => status(dirty() ? 'UNSAVED CHANGES.' : 'SAVED RECORD.'));
    panel.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); action(save); }
        if (event.key === 'Escape') button('close').click();
    });
    window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
    if (reader) { addAction('read', 'READ TAPE', () => mode(true)); addAction('edit', 'EDIT TAPE', () => { mode(false); field('body').focus(); }); }
    return { panel, field, button, status, action, dirty, discard, reset, addAction,
        get selected() { return selected; },
        open() { RobcoWindows.show(panel); action(list); status(vaultFiles.warning || (dirty() ? 'UNSAVED DRAFT.' : 'READY. Create or select a record.')); field('search').focus({ preventScroll: true }); },
        openFile(path) { if (!discard()) return false; load(path); this.open(); return true; },
        draft(title, body) { if (!discard()) return false; this.open(); action(() => reset(title, body)); return true; }
    };
}
recordApps.notes = createRecordApp({ id: 'notes', name: 'Notes', version: 'v0.4', directory: '/VAULT/NOTES', extension: '.LOG' });
function recordTerminal(command) {
    const name = command.trim().toLowerCase();
    const key = name === 'music' ? 'radio' : name;
    const app = Object.hasOwn(recordApps, key) ? recordApps[key] : null;
    if (!app) return false;
    app.open(); return true;
}
