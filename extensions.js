/* Only the trusted desktop owns this manager. Plugin windows receive no bridge. */
'use strict';
const RobcoExtensions = (() => {
    const native = window.robcoDesktop?.extensions;
    let apps = [], busy = false;
    const panel = document.createElement('section');
    panel.id = 'extensionManager'; panel.className = 'recordWindow'; panel.hidden = true;
    panel.setAttribute('aria-label', 'RobCo App Manager');
    panel.innerHTML = `<header class="fileTitle"><div><strong>ROBCO APP MANAGER</strong><small>APPS & PLUGINS // OFFLINE EDITION v1</small></div><button id="extensionsClose">CLOSE MANAGER</button></header>
      <div class="extensionBody"><p>Expand your desktop with offline apps. Installed apps run in separate sandboxed windows without access to your files, network or desktop data.</p>
      <button id="extensionsInstall">INSTALL .ROBCOAPP PACKAGE</button><h2>INSTALLED EXTENSIONS</h2><div id="extensionList"></div>
      <h2>BUILT-IN APPS</h2><p>Included with Fallout OS. Built-in apps cannot be disabled or uninstalled here.</p><ul id="extensionBuiltins"></ul></div>
      <p id="extensionStatus" class="recordStatus" role="status" aria-live="polite"></p>`;
    document.body.append(panel); RobcoWindows.register(panel);
    const el = id => document.getElementById(id), status = el('extensionStatus');
    const dock = document.createElement('button'); dock.id = 'extensionsLauncher'; dock.textContent = 'APP MANAGER'; dock.onclick = open;
    el('desktopIcons').append(dock);
    const launchers = document.createElement('span'); launchers.id = 'extensionLaunchers'; el('desktopIcons').append(launchers);
    function button(text, action) {
        const node = document.createElement('button'); node.textContent = text; node.disabled = busy;
        node.onclick = () => { void action(); }; return node;
    }
    function render() {
        launchers.replaceChildren(); el('extensionList').replaceChildren();
        el('extensionsInstall').disabled = !native || busy;
        if (!apps.length) el('extensionList').textContent = 'NO USER APPS INSTALLED.';
        apps.forEach(app => {
            if (app.enabled) {
                const launcher = button(app.name, () => launch(app.id)); launcher.dataset.extensionId = app.id;
                launchers.append(launcher);
            }
            const row = document.createElement('article'); row.className = 'extensionRow'; row.dataset.extensionId = app.id;
            const name = document.createElement('strong'), detail = document.createElement('p'), state = document.createElement('small');
            name.textContent = app.name + ' · ' + app.version;
            detail.textContent = app.description;
            state.textContent = app.id + ' // ' + (app.enabled ? 'ENABLED' : 'DISABLED') + ' // UNVERIFIED PUBLISHER';
            row.append(name, detail, state);
            const actions = document.createElement('div');
            const launchButton = button('LAUNCH', () => launch(app.id)); launchButton.disabled ||= !app.enabled;
            actions.append(launchButton, button(app.enabled ? 'DISABLE' : 'ENABLE', () => operate(() => native.enable(app.id, !app.enabled))), button('UNINSTALL', () => operate(() => native.uninstall(app.id))));
            row.append(actions); el('extensionList').append(row);
        });
        window.dispatchEvent(new Event('robco:extensions-changed'));
    }
    async function operate(action) {
        if (!native || busy) return;
        busy = true; render();
        try { const result = await action(); apps = result.apps; status.textContent = result.warning || 'READY. Apps stay installed after restarting Fallout OS.'; }
        catch (error) { status.textContent = error.message; }
        finally { busy = false; render(); }
    }
    async function launch(id) {
        await operate(() => native.launch(id));
        if (/Error|disabled|installed|launch/i.test(status.textContent) && !status.textContent.startsWith('READY')) RobcoWindows.show(panel);
    }
    function open() {
        RobcoWindows.show(panel);
        el('extensionBuiltins').replaceChildren();
        for (const app of RobcoSearch.builtins()) { const li = document.createElement('li'); li.textContent = app.title; el('extensionBuiltins').append(li); }
        if (native) void operate(() => native.list());
        else status.textContent = 'Extension installation and execution require the Electron desktop edition. Built-in web apps remain available.';
    }
    el('extensionsClose').onclick = () => RobcoWindows.close(panel);
    el('extensionsInstall').onclick = () => { void operate(() => native.install()); };
    if (native) void operate(() => native.list()); else render();
    return Object.freeze({ open, entries: () => apps.filter(app => app.enabled).map(app => ({ title: app.name, detail: app.description + ' · installed extension', type: 'APP', activate: () => launch(app.id) })) });
})();
