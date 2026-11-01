'use strict';
const settings = (() => {
    const defaults = { wallpaper: 'default', position: 'fill', image: null };
    const labels = { default: 'Original RobCo', blue: 'Vault-Tec blue', green: 'RobCo terminal green', wasteland: 'Wasteland', black: 'Classic black', custom: 'Saved custom image' };
    // Original geometric artwork; no external assets, requests or game imagery.
    const svg = content => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' + content + '</svg>');
    const artwork = {
        blue: svg('<rect width="1920" height="1080" fill="#102b4c"/><path d="M0 840L1920 240V360L0 960Z" fill="#284864"/><circle cx="1500" cy="520" r="220" fill="none" stroke="#ac9455" stroke-width="4"/><circle cx="1500" cy="520" r="180" fill="none" stroke="#ac9455" stroke-width="2"/><path d="M1430 520h140m-70-70v140" stroke="#ac9455" stroke-width="4"/>'),
        green: svg('<defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="#173d29"/></pattern></defs><rect width="1920" height="1080" fill="#04170e"/><rect width="1920" height="1080" fill="url(#grid)"/><path d="M120 800h700l80-80h700M120 840h720l80-80h680" fill="none" stroke="#286c43" stroke-width="3"/><text x="120" y="700" fill="#398258" font-family="monospace" font-size="60">ROBCO // SYSTEM READY</text>'),
        wasteland: svg('<rect width="1920" height="1080" fill="#3e3529"/><circle cx="1450" cy="360" r="130" fill="#9a7c45"/><path d="M0 670L280 480 500 650 800 450 1100 690 1500 510 1920 660V1080H0Z" fill="#302e25"/><path d="M0 850L440 680 820 820 1250 650 1600 840 1920 720V1080H0Z" fill="#1a211b"/><path d="M1520 720v-180m0 60l-60-40m60 90l65-60" fill="none" stroke="#151c17" stroke-width="15"/>')
    };
    const panel = document.createElement('section');
    panel.id = 'settingsWindow'; panel.className = 'recordWindow'; panel.hidden = true;
    panel.setAttribute('aria-label', 'RobCo Settings');
    panel.innerHTML = `<header class="fileTitle"><div><strong>ROBCO SETTINGS</strong><small>PERSONALIZATION // DESKTOP WALLPAPER</small></div><button id="settingsClose">CLOSE SETTINGS</button></header>
      <div class="settingsBody"><div id="wallpaperPreview" role="img" aria-label="Wallpaper preview"></div>
      <fieldset><legend>DESKTOP BACKGROUND</legend><div id="wallpaperChoices"></div></fieldset>
      <div class="settingsActions"><button id="wallpaperChoose">CHOOSE IMAGE FROM PC</button><button id="wallpaperRestore">RESTORE DEFAULT</button></div>
      <input id="wallpaperFile" type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Choose wallpaper image">
      <label for="wallpaperPosition">IMAGE POSITION<select id="wallpaperPosition"><option value="fill">Fill — cover desktop (may crop)</option><option value="fit">Fit — show whole image</option><option value="center">Center — original image size</option></select></label>
      <p>Images stay on this device. PNG, JPEG or WebP, up to 12 MB and 24 million pixels. Changes save automatically. Restore Default removes the saved custom copy and returns to the original RobCo background.</p>
      <p id="wallpaperStorage"></p></div><p id="settingsStatus" class="recordStatus" role="status" aria-live="polite">LOADING SETTINGS…</p>`;
    document.body.append(panel);
    RobcoWindows.register(panel);
    const el = id => document.getElementById(id);
    const native = window.robcoDesktop?.wallpaper;
    let state = { ...defaults }, busy = false;
    const valid = value => value && Object.hasOwn(labels, value.wallpaper) && ['fill', 'fit', 'center'].includes(value.position) &&
        (value.image === null || (typeof value.image === 'string' && value.image.length < 18 * 1024 * 1024 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value.image))) && (value.wallpaper !== 'custom' || !!value.image);
    // IndexedDB avoids localStorage's small image quota. The whole selection commits together.
    async function webStore(value) {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('robco.personalization.v1', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('settings');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('Wallpaper storage is busy in another tab.'));
        });
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction('settings', value ? 'readwrite' : 'readonly');
                const store = tx.objectStore('settings');
                const request = value ? store.put(value, 'wallpaper') : store.get('wallpaper');
                tx.oncomplete = () => resolve(value || request.result || { ...defaults });
                tx.onerror = tx.onabort = () => reject(tx.error || new Error('Unable to save wallpaper.'));
            });
        } finally { db.close(); }
    }
    function paint(target) {
        target.style.backgroundColor = state.wallpaper === 'black' ? '#000000' : '#050505';
        const image = artwork[state.wallpaper] || (state.wallpaper === 'custom' ? state.image : null);
        target.style.backgroundImage = image ? `url("${image}")` : 'none';
        target.style.backgroundSize = { fill: 'cover', fit: 'contain', center: 'auto' }[state.position];
    }
    function render() {
        paint(el('desktopScreen')); paint(el('wallpaperPreview'));
        el('wallpaperPreview').setAttribute('aria-label', `${labels[state.wallpaper]} wallpaper preview, ${state.position}`);
        el('wallpaperPosition').value = state.position;
        panel.querySelectorAll('[data-wallpaper]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.wallpaper === state.wallpaper));
            button.disabled = busy || (button.dataset.wallpaper === 'custom' && !state.image);
        });
    }
    async function verifyImage(data) {
        if (!data) return;
        const image = new Image(); image.src = data;
        await image.decode();
        if (image.naturalWidth * image.naturalHeight > 24000000) throw new Error('Choose an image with no more than 24 million pixels.');
    }
    async function operate(action, message) {
        if (busy) return;
        busy = true;
        panel.querySelectorAll('button:not(#settingsClose), select').forEach(control => control.disabled = true);
        try {
            const next = await action();
            if (next) {
                if (!valid(next)) throw new Error('Saved wallpaper is invalid. Use Restore Default to repair it.');
                await verifyImage(next.image);
                state = next;
                el('settingsStatus').textContent = next.warning || message;
            } else el('settingsStatus').textContent = 'Selection canceled. Wallpaper unchanged.';
        } catch (error) {
            el('settingsStatus').textContent = 'Wallpaper could not be loaded or saved: ' + error.message + ' You can try another image or Restore Default.';
        } finally {
            busy = false;
            panel.querySelectorAll('button, select').forEach(control => control.disabled = false);
            render();
        }
    }
    const save = change => operate(() => {
        const next = { ...state, ...change }; delete next.warning;
        return native ? native.save({ wallpaper: next.wallpaper, position: next.position }) : webStore(next);
    }, 'WALLPAPER SAVED.');
    for (const [id, label] of Object.entries(labels)) {
        const button = document.createElement('button'); button.textContent = label;
        button.dataset.wallpaper = id; button.onclick = () => save({ wallpaper: id });
        el('wallpaperChoices').append(button);
    }
    el('settingsClose').onclick = () => RobcoWindows.close(panel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); RobcoWindows.close(panel); } });
    el('wallpaperPosition').onchange = event => save({ position: event.target.value });
    el('wallpaperRestore').onclick = () => operate(() => native ? native.restore() : webStore({ ...defaults }), 'ORIGINAL ROBCO BACKGROUND RESTORED.');
    el('wallpaperChoose').onclick = () => native ? operate(() => native.choose(), 'CUSTOM WALLPAPER SAVED ON THIS DEVICE.') : el('wallpaperFile').click();
    el('wallpaperFile').onchange = event => {
        const file = event.target.files[0]; event.target.value = '';
        if (!file) return;
        operate(async () => {
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image up to 12 MB.');
            const image = await new Promise((resolve, reject) => {
                const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Image could not be read.')); reader.readAsDataURL(file);
            });
            await verifyImage(image);
            return webStore({ wallpaper: 'custom', position: state.position, image });
        }, 'CUSTOM WALLPAPER SAVED IN THIS BROWSER.');
    };
    el('wallpaperStorage').textContent = native ? 'Desktop storage: your Fallout OS user profile. The original image can be moved or deleted after import.' : 'Web storage: this browser and site only. Clearing site data or using private browsing may remove your wallpaper.';
    const ready = operate(() => native ? native.read() : webStore(), 'SETTINGS READY.');
    return { ready, open() { RobcoWindows.show(panel); el('settingsClose').focus(); } };
})();
