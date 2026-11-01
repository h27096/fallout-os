/* Installed apps and authorized app-local metadata only. */
'use strict';
const RobcoSearch = (() => {
    const apps = [
        ['RobCo App Manager', 'Install enable disable uninstall apps plugins extensions', () => RobcoExtensions.open()],
        ['Terminal', 'Commands console', openTerminal],
        ['VaultNet', 'Browser web internet', openBrowser],
        ['Files', 'File Explorer folders records', () => openExplorer('/')],
        ['Holotapes', 'Notes tape library', () => recordApps.holotapes.open()],
        ['Music / Radio', 'Audio playlists stations', () => radio.open()],
        ['Calculator', 'Math scientific calc', () => calculator.open()],
        ['Tasks', 'To-do checklist', () => tasks.open()],
        ['Clock & Calendar', 'Time date events reminders alarms', () => calendar.open()],
        ['Settings', 'Wallpapers personalization background', () => settings.open()]
    ].map(([title, detail, activate]) => ({ title, detail, activate, type: 'APP' }));
    const dialog = document.createElement('dialog');
    dialog.id = 'systemSearch'; dialog.setAttribute('aria-labelledby', 'searchHeading');
    dialog.innerHTML = `<header><div><small>ROBCO INDUSTRIES // LOCAL INDEX</small><h2 id="searchHeading">SYSTEM SEARCH</h2></div><button aria-label="Close System Search">ESC / CLOSE</button></header>
      <label for="systemSearchInput">FIND AN APP, FILE OR HOLOTAPE</label>
      <input id="systemSearchInput" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="searchResults" aria-describedby="searchScope" autocomplete="off" spellcheck="false" maxlength="200" placeholder="Start typing a name or title…">
      <p id="searchScope">Installed apps and accessible Fallout OS records only. PC folders are not indexed.</p>
      <p id="searchStatus" role="status" aria-live="polite"></p><div id="searchResults" role="listbox" aria-label="Search results"></div>
      <footer>↑ ↓ SELECT &nbsp; ENTER OPEN &nbsp; ESC RETURN</footer>`;
    document.body.append(dialog);
    const input = dialog.querySelector('input'), list = dialog.querySelector('[role="listbox"]'), status = dialog.querySelector('[role="status"]');
    let index = [], matches = [], selected = 0, previous = null, nativeFocus = false, opening = false, generation = 0;
    const normalize = text => text.normalize('NFKC').toLocaleLowerCase();
    function collect() {
        return apps.concat(RobcoExtensions.entries(), vaultFiles.searchEntries().map(item => {
            const tape = item.type === 'file' && vaultFiles.parent(item.path) === '/VAULT/HOLOTAPES';
            return { title: tape ? item.name.replace(/\.(DAT|LOG)$/, '') : item.name,
                detail: 'C:/ROBCO' + item.path, type: tape ? 'HOLOTAPE' : item.type.toUpperCase(),
                activate: () => { vaultFiles.get(item.path); return tape ? recordApps.holotapes.openFile(item.path) : openExplorer(item.path); } };
        })).map(item => ({ ...item, key: normalize(item.title + ' ' + item.detail + ' ' + item.type) }));
    }
    function select(value) {
        selected = value;
        [...list.children].forEach((row, i) => row.setAttribute('aria-selected', String(i === selected)));
        const row = list.children[selected];
        if (row) { input.setAttribute('aria-activedescendant', row.id); row.scrollIntoView({ block: 'nearest' }); }
        else input.removeAttribute('aria-activedescendant');
    }
    function render() {
        const query = normalize(input.value.trim()), words = query.split(/\s+/).filter(Boolean);
        const found = query ? index.filter(item => words.every(word => item.key.includes(word))) : index.filter(item => item.type === 'APP');
        if (query) found.sort((a, b) => Number(normalize(b.title).startsWith(query)) - Number(normalize(a.title).startsWith(query)));
        matches = found.slice(0, 100); list.replaceChildren();
        matches.forEach((item, i) => {
            const row = document.createElement('div'); row.id = 'searchResult' + i; row.setAttribute('role', 'option');
            const type = document.createElement('small'), title = document.createElement('strong'), detail = document.createElement('span');
            type.textContent = item.type; title.textContent = item.title; detail.textContent = item.detail;
            row.append(type, title, detail); row.addEventListener('click', () => { select(i); activate(); }); list.append(row);
        });
        status.textContent = !query ? 'READY. Choose an app or type to search your records.' : !found.length ? 'NO MATCHES. Try another name or a shorter title.' : `${found.length} RESULTS${found.length > 100 ? ' — showing first 100; refine your search' : ''}.`;
        if (vaultFiles.warning) status.textContent += ' Recovery view: saved files may be unavailable.';
        select(0);
    }
    async function open(fromNative = false) {
        if (dialog.open || opening) { if (dialog.open) input.focus(); return; }
        if (!document.getElementById('desktopScreen').getClientRects().length) {
            await window.robcoDesktop?.search.overlay(false); return;
        }
        opening = true; generation++; previous = document.activeElement; nativeFocus = fromNative;
        try {
            // Suppress native content before showing the modal; layout messages cannot override it.
            await window.robcoDesktop?.search.overlay(true);
            index = collect(); input.value = ''; dialog.showModal(); render(); input.focus();
        } catch (error) {
            await window.robcoDesktop?.search.overlay(false);
            console.error('System Search unavailable:', error);
        } finally { opening = false; }
    }
    async function close(restore = true) {
        const closing = ++generation, restoreNative = nativeFocus;
        dialog.close();
        if (restore && previous?.isConnected && previous.getClientRects().length) previous.focus({ preventScroll: true });
        // Let ordinary app stacking settle before returning the native surface.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (closing !== generation) return;
        await window.robcoDesktop?.search.overlay(false);
        if (restore && restoreNative && closing === generation) await window.robcoDesktop?.search.restoreBrowserFocus();
    }
    function activate() {
        const item = matches[selected]; if (!item) return;
        void close(false);
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        try { item.activate(); }
        catch (error) { void open().then(() => { status.textContent = error.message; }); }
    }
    input.addEventListener('input', render);
    dialog.querySelector('button').addEventListener('click', () => { void close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
    document.addEventListener('keydown', event => {
        if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.code === 'Space') {
            event.preventDefault(); event.stopImmediatePropagation();
            if (!event.repeat) { if (dialog.open) void close(); else void open(); }
        } else if (dialog.open) {
            if (event.key === 'Tab') {
                event.preventDefault(); event.stopImmediatePropagation();
                (document.activeElement === input ? dialog.querySelector('button') : input).focus();
                return;
            }
            if (event.isComposing) return;
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
                event.preventDefault(); event.stopImmediatePropagation();
                if (event.key === 'Escape') void close();
                else if (event.key === 'Enter' && event.target === input) activate();
                else if (event.key === 'Enter') event.target.click();
                else if (matches.length) { input.focus(); select((selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length); }
            }
        }
    }, true);
    window.robcoDesktop?.search.onOpen(() => { void open(true); });
    window.addEventListener('robco:extensions-changed', () => { if (dialog.open) { index = collect(); render(); } });
    return Object.freeze({ open, builtins: () => apps.map(({ title }) => ({ title })) });
})();
