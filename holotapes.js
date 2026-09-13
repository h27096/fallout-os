'use strict';
recordApps.holotapes = createRecordApp({ id: 'holotapes', name: 'Holotapes', version: 'v0.5', directory: '/VAULT/HOLOTAPES', extension: '.DAT' });
const tapes = recordApps.holotapes;
tapes.addAction('import', 'COPY FROM FILE', () => {
    const raw = prompt('Copy a text file into a new tape. Enter a vault path:', '/VAULT/');
    if (raw === null) return;
    const path = vaultFiles.resolve(raw);
    const file = vaultFiles.get(path); // Applies the existing Overseer clearance rules.
    if (file.type !== 'file') throw Error('Select a file, not a folder.');
    if (tapes.draft(path.split('/').pop().replace(/\.(DAT|LOG)$/, ''), file.content))
        tapes.status('IMPORTED DRAFT. SAVE creates an independent holotape; the source stays intact.');
});
// Explicit app shortcuts preserve the general-purpose Files editor and its drafts.
function openHolotapeFromFiles() {
    fileAction(() => {
        if (!discardFileChanges()) return;
        const app = tapes;
        const directory = '/VAULT/HOLOTAPES/';
        if (explorerFile && explorerFile.startsWith(directory)) {
            if (!app.openFile(explorerFile)) return;
        } else app.open();
        fileElement('fileContent').value = explorerOriginal;
        fileElement('explorerWindow').hidden = true;
        explorerFile = null;
    });
}
