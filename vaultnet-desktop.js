/* Desktop adapter only: the web build retains its existing iframe browser. */
'use strict';
(() => {
    const api = window.robcoDesktop?.browser;
    if (!api) return;
    const panel = document.getElementById('browserWindow');
    const viewport = document.getElementById('browserViewport');
    const address = document.getElementById('browserAddress');
    const status = document.getElementById('browserStatus');
    document.getElementById('browserFrame').remove();
    panel.classList.add('nativeBrowser');
    document.querySelector('#browserTitleBar small').textContent = 'BROWSER v2 // DESKTOP INFORMATION ACCESS TERMINAL';
    document.querySelector('#browserHome p:last-child').textContent = 'Browse websites directly. Back and Forward follow page history. New-window links open here. Ctrl+L selects the address.';
    document.querySelector('#browserFallback span').textContent = 'Site requires another browser or a download?';
    let home = true, queued = false;
    function layout() {
        queued = false;
        const rect = viewport.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const shown = !panel.hidden && panel.getClientRects().length > 0;
        // Native views sit above HTML. Hide the entire view whenever another app
        // is foremost, even if the HTML panels only partially overlap.
        const above = Array.from(document.querySelectorAll('section[id]')).some(other =>
            other !== panel && !other.hidden && other.getClientRects().length > 0 &&
            Number(getComputedStyle(other).zIndex) > Number(getComputedStyle(panel).zIndex));
        const x = Math.max(0, rect.left + viewport.clientLeft);
        const y = Math.max(0, rect.top + viewport.clientTop);
        const right = Math.min(innerWidth, rect.right - viewport.clientLeft, panelRect.right);
        const bottom = Math.min(innerHeight, rect.bottom - viewport.clientTop, panelRect.bottom);
        api.layout({ visible: !document.querySelector('#systemSearch[open]') && shown && !above && !home && !document.hidden,
            x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }).catch(error => { status.textContent = error.message; });
    }
    function schedule() { if (!queued) { queued = true; requestAnimationFrame(layout); } }
    function render(state) {
        home = state.home;
        if (document.activeElement !== address) address.value = state.url;
        document.getElementById('backButton').disabled = !state.back;
        document.getElementById('forwardButton').disabled = !state.forward;
        document.getElementById('browserHome').hidden = !home;
        document.getElementById('browserFallback').hidden = home;
        const external = document.getElementById('openExternal');
        if (/^https?:\/\//.test(state.url)) external.href = state.url;
        else external.removeAttribute('href');
        status.textContent = state.message || (home ? 'VAULTNET READY. ENTER A WEB ADDRESS.' : state.loading ? 'CONNECTING…' : state.url);
        schedule();
    }
    async function command(action, value) {
        // Submit commits the edit; future redirects must update the address bar.
        if (action === 'navigate' || action === 'home') address.blur();
        try { render(await api[action](value)); }
        catch (error) { status.textContent = error.message; }
        schedule();
    }
    window.VaultNetDesktop = Object.freeze({ command });
    api.onState(render);
    api.onAddress(() => { address.focus(); address.select(); });
    new ResizeObserver(schedule).observe(viewport);
    new MutationObserver(schedule).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l' && !panel.hidden && panel.getClientRects().length) {
            event.preventDefault(); RobcoWindows.show(panel); address.focus(); address.select();
        }
    });
    command('state');
})();
