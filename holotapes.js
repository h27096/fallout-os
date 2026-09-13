'use strict';
recordApps.holotapes = createRecordApp({ id: 'holotapes', name: 'Holotapes', version: 'v0.5', directory: '/VAULT/HOLOTAPES', extension: '.DAT', reader: true });
const tapes = recordApps.holotapes;
tapes.addAction('import', 'COPY FROM FILE', () => {
    const raw = prompt('Copy a text file into a new tape. Enter a vault path:', '/VAULT/NOTES/');
    if (raw === null) return;
    const path = vaultFiles.resolve(raw);
    const file = vaultFiles.get(path); // Applies the existing Overseer clearance rules.
    if (file.type !== 'file') throw Error('Select a file, not a folder.');
    if (tapes.draft(path.split('/').pop().replace(/\.(DAT|LOG)$/, ''), file.content))
        tapes.status('IMPORTED DRAFT. SAVE creates an independent holotape; the source stays intact.');
});
tapes.addAction('note', 'COPY TO NOTES', () => {
    recordApps.notes.draft(tapes.field('title').value, tapes.field('body').value);
});
recordApps.notes.addAction('tape', 'COPY TO HOLOTAPE', () => {
    tapes.draft(recordApps.notes.field('title').value, recordApps.notes.field('body').value);
});
