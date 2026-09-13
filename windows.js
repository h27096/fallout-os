/* Shared, non-modal window focus and stacking. App close handlers own draft guards. */
'use strict';
const RobcoWindows = (() => {
    const panels = [], launchers = new WeakMap();
    const visible = element => !!element && !element.disabled && element.getClientRects().length > 0;
    function raise(panel) {
        const index = panels.indexOf(panel);
        if (index < 0) return;
        panels.splice(index, 1); panels.push(panel);
        panels.forEach((item, i) => { item.style.zIndex = String(i + 10); });
    }
    function register(panel) {
        if (panels.includes(panel)) return;
        panels.push(panel);
        panel.addEventListener('pointerdown', () => raise(panel));
        panel.addEventListener('focusin', () => raise(panel));
    }
    function show(panel) {
        register(panel);
        if (!visible(panel)) launchers.set(panel, document.activeElement);
        panel.hidden = false;
        panel.style.display = 'flex';
        raise(panel);
    }
    function close(panel) {
        panel.hidden = true;
        const launcher = launchers.get(panel);
        if (visible(launcher)) { launcher.focus(); return; }
        const next = [...panels].reverse().find(visible);
        const target = next?.querySelector('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
        if (visible(target)) target.focus();
        else if (visible(document.getElementById('command'))) document.getElementById('command').focus();
    }
    return { register, show, close };
})();
