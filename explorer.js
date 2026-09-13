'use strict';
const vaultFiles = RobcoFilesystem.create({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value)
}, () => overseerMode, () =>
    'OVERSEER LOG DATABASE\n\nLOG 001: Vault operation began successfully.\nLOG 002: Unknown events detected.\n' +
    personalLogs.map((text, i) => '\nPERSONAL LOG ' + (i + 1) + ': ' + text).join('\n') +
    (lockdownActive ? '\nLOCKDOWN INITIATED BY OVERSEER. SECURITY EVENT RECORDED.' : ''));
let terminalDirectory = '/';
let explorerDirectory = '/', explorerFile = null, explorerOriginal = '', explorerReturnFocus;
const fileElement = id => document.getElementById(id);
function fileStatus(message) { fileElement('fileStatus').textContent = message; }
function fileAction(action) { try { action(); } catch (error) { fileStatus(error.message); } }
function discardFileChanges() {
    return !explorerFile || fileElement('fileContent').value === explorerOriginal || confirm('Discard unsaved file changes?');
}
function openExplorer(path = explorerDirectory) {
    const node = vaultFiles.get(path);
    if (!discardFileChanges()) return;
    if (fileElement('explorerWindow').hidden) explorerReturnFocus = document.activeElement;
    explorerFile = node.type === 'file' ? path : null;
    explorerDirectory = explorerFile ? vaultFiles.parent(path) : path;
    fileElement('explorerWindow').hidden = false;
    renderExplorer();
    fileElement('fileUp').focus();
}
function closeExplorer() {
    if (!discardFileChanges()) return;
    fileElement('explorerWindow').hidden = true;
    explorerFile = null;
    (explorerReturnFocus || fileElement('command')).focus();
}
function renderExplorer() {
    const listing = vaultFiles.list(explorerDirectory);
    fileElement('filePath').textContent = 'C:/ROBCO' + explorerDirectory;
    fileElement('fileClearance').textContent = overseerMode ? 'CLEARANCE: OVERSEER' : 'CLEARANCE: DWELLER';
    fileElement('fileUp').disabled = explorerDirectory === '/';
    const list = fileElement('fileList'); list.replaceChildren();
    listing.forEach(item => {
        const button = document.createElement('button');
        button.textContent = (item.type === 'folder' ? '[DIR] ' : '[FILE] ') + item.name + (item.locked ? ' [LOCKED]' : '');
        button.addEventListener('click', () => fileAction(() => openExplorer(item.path)));
        list.append(button);
    });
    if (!listing.length) list.textContent = 'DIRECTORY EMPTY. Create a file or folder above.';
    const target = explorerFile || explorerDirectory;
    const node = vaultFiles.get(target);
    fileElement('fileEditor').hidden = !explorerFile;
    fileElement('fileName').textContent = explorerFile || 'SELECT A RECORD';
    explorerOriginal = explorerFile ? node.content : '';
    fileElement('fileContent').value = explorerOriginal;
    const readonly = !!node.readonly || !!vaultFiles.warning;
    fileElement('fileContent').readOnly = readonly;
    fileElement('fileSave').disabled = !explorerFile || readonly;
    fileElement('fileRename').disabled = !!node.system || !!vaultFiles.warning;
    fileElement('fileDelete').disabled = !!node.system || !!vaultFiles.warning;
    const noCreate = explorerDirectory === '/SYSTEM' || !!vaultFiles.warning;
    fileElement('fileNew').disabled = noCreate;
    fileElement('folderNew').disabled = noCreate;
    fileStatus(vaultFiles.warning || (readonly ? 'READ-ONLY RECORD' : 'READY. Select a file to edit; rename/delete acts on the open file or current folder.'));
}
function createExplorerEntry(type) {
    if (!discardFileChanges()) return;
    const name = prompt(type === 'file' ? 'File name (.DAT or .LOG):' : 'Folder name:', type === 'file' ? 'UNTITLED.DAT' : 'NEW FOLDER');
    if (name === null) return;
    const path = vaultFiles.create(explorerDirectory, name, type);
    // The user has already accepted discarding changes above.
    explorerFile = null;
    openExplorer(path);
}
fileElement('fileClose').addEventListener('click', closeExplorer);
fileElement('fileUp').addEventListener('click', () => fileAction(() => openExplorer(vaultFiles.parent(explorerDirectory))));
fileElement('fileRoot').addEventListener('click', () => fileAction(() => openExplorer('/')));
fileElement('fileNew').addEventListener('click', () => fileAction(() => createExplorerEntry('file')));
fileElement('folderNew').addEventListener('click', () => fileAction(() => createExplorerEntry('folder')));
fileElement('fileSave').addEventListener('click', () => fileAction(() => {
    if (vaultFiles.get(explorerFile).content !== explorerOriginal) throw Error('Record changed in another app. Reopen it before saving; copy your draft first.');
    vaultFiles.write(explorerFile, fileElement('fileContent').value);
    explorerOriginal = fileElement('fileContent').value; fileStatus('FILE SAVED.');
}));
fileElement('fileRename').addEventListener('click', () => fileAction(() => {
    if (!discardFileChanges()) return;
    const path = explorerFile || explorerDirectory;
    const name = prompt('New name:', path.split('/').pop());
    if (name === null) return;
    const target = vaultFiles.rename(path, name);
    if (terminalDirectory === path || terminalDirectory.startsWith(path + '/')) terminalDirectory = target + terminalDirectory.slice(path.length);
    explorerFile = null; openExplorer(target);
}));
fileElement('fileDelete').addEventListener('click', () => fileAction(() => {
    const path = explorerFile || explorerDirectory;
    if (!confirm('Delete ' + path + '? This cannot be undone.')) return;
    vaultFiles.remove(path);
    if (terminalDirectory === path) terminalDirectory = vaultFiles.parent(path);
    explorerFile = null; openExplorer(vaultFiles.parent(path));
}));
fileElement('explorerWindow').addEventListener('keydown', event => { if (event.key === 'Escape') closeExplorer(); });
window.addEventListener('beforeunload', event => {
    if (explorerFile && fileElement('fileContent').value !== explorerOriginal) { event.preventDefault(); event.returnValue = ''; }
});
function fileTerminal(text) {
    const match = /^(DIR|CD|OPEN|FILES)(?:\s+(.*))?$/.exec(text.trim());
    if (!match) return false;
    function print(message) { fileElement('output').append(document.createTextNode('\n\n' + message)); }
    try {
        const [, command, raw = ''] = match;
        const arg = raw.replace(/^"(.*)"$/, '$1');
        const path = arg ? vaultFiles.resolve(arg, terminalDirectory) : terminalDirectory;
        if (command === 'DIR') print('DIRECTORY C:/ROBCO' + path + '\n' + vaultFiles.list(path).map(item =>
            (item.type === 'folder' ? '[DIR] ' : '      ') + item.name + (item.locked ? ' [LOCKED]' : '')).join('\n'));
        if (command === 'CD') {
            if (vaultFiles.get(path).type !== 'folder') throw Error('NOT A FOLDER.');
            terminalDirectory = path; print('C:/ROBCO' + path);
        }
        if (command === 'OPEN' || command === 'FILES') {
            const node = vaultFiles.get(path);
            openExplorer(path);
            if (node.type === 'file') print(node.content);
        }
    } catch (error) { print(error.message); }
    return true;
}
