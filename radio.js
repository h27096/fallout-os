'use strict';
const radio = (() => {
    const store = RobcoRadioStore.create({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
    const panel = document.getElementById('radioWindow');
    const el = id => document.getElementById('radio' + id);
    const audio = el('Audio'), files = new Map();
    let loadedId = null, generation = 0;
    const state = () => store.state;
    const station = () => state().stations.find(item => item.id === state().stationId);
    const current = () => station().tracks.find(item => item.id === state().trackId);
    const status = text => { el('Status').textContent = text; };
    const action = fn => { try { fn(); } catch (error) { render(); status(error.message); } };
    const update = change => { store.update(change); render(); };
    const uid = () => crypto.randomUUID();
    const fileKey = file => JSON.stringify([file.name, file.size, file.lastModified]);
    function importPlaylist(path) {
        const node = vaultFiles.get(path);
        if (node.type !== 'file') throw Error('Select a playlist .DAT file.');
        const data = JSON.parse(node.content);
        if (data?.format !== 'robco.playlist' || data.version !== 1 || !data.station || !Array.isArray(data.station.tracks)) throw Error('Not a RobCo playlist file.');
        const imported = { id: uid(), name: data.station.name, tracks: data.station.tracks.map(track => ({ ...track, id: uid() })) };
        // The store validates every source and limit before committing any change.
        update(next => { next.stations.push(imported); next.stationId = imported.id; next.trackId = imported.tracks[0]?.id || null; });
        stop(); status('PLAYLIST COPIED. Press PLAY; reselect local audio files if needed.');
    }
    el('SavePlaylist').onclick = () => action(() => {
        const name = prompt('New playlist file name (.DAT):', 'PLAYLIST.DAT');
        if (name === null) return;
        if (!vaultFiles.list('/VAULT').some(item => item.path === '/VAULT/MUSIC')) vaultFiles.create('/VAULT', 'MUSIC', 'folder');
        const content = JSON.stringify({ format: 'robco.playlist', version: 1, station: station() }, null, 2);
        const path = vaultFiles.create('/VAULT/MUSIC', name, 'file', content);
        status('PLAYLIST SAVED: ' + path + '. Audio files remain on your device.');
    });
    el('ImportPlaylist').onclick = () => action(() => {
        const path = prompt('Vault playlist path:', '/VAULT/MUSIC/PLAYLIST.DAT');
        if (path !== null) importPlaylist(vaultFiles.resolve(path));
    });
    function releaseUnusedFiles() {
        const used = new Set(state().stations.flatMap(item => item.tracks.filter(track => track.kind === 'local').map(track => track.fileKey)));
        for (const [key, url] of files) if (!used.has(key)) { URL.revokeObjectURL(url); files.delete(key); }
    }
    function stop() { generation++; audio.pause(); audio.removeAttribute('src'); audio.load(); loadedId = null; progress(); }
    function render() {
        const data = state(), selected = station(), track = current();
        el('Station').replaceChildren(...data.stations.map(item => new Option(item.name, item.id, false, item.id === data.stationId)));
        const list = el('Tracks'), focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.trackId : null; list.replaceChildren();
        for (const item of selected.tracks) {
            const button = document.createElement('button'); button.textContent = item.title + (item.kind === 'local' && !files.has(item.fileKey) ? ' [RESELECT FILE]' : '');
            button.dataset.trackId = item.id;
            button.setAttribute('aria-pressed', String(item.id === data.trackId));
            button.onclick = () => action(() => { update(next => { next.trackId = item.id; }); stop(); void play(); });
            list.append(button);
            if (item.id === focusedId) button.focus({ preventScroll: true });
        }
        if (!selected.tracks.length) list.textContent = 'NO SIGNAL SOURCES. Add an audio URL or choose local audio files.';
        el('Now').textContent = track ? track.title : 'STANDING BY';
        el('Source').textContent = track ? (track.kind === 'local' ? 'LOCAL MEDIA // reselect files after a reload' : 'NETWORK AUDIO // direct media or stream') : 'ROBCO BROADCAST RECEIVER';
        audio.volume = data.volume; audio.muted = data.muted;
        el('Volume').value = data.volume; el('Mute').textContent = data.muted ? 'UNMUTE' : 'MUTE'; el('Mute').setAttribute('aria-pressed', String(data.muted));
        el('Shuffle').setAttribute('aria-pressed', String(data.shuffle)); el('Repeat').value = data.repeat;
        for (const name of ['Play', 'Remove']) el(name).disabled = !track;
        const index = selected.tracks.findIndex(item => item.id === data.trackId);
        el('Up').disabled = index <= 0; el('Down').disabled = index < 0 || index >= selected.tracks.length - 1;
        el('Previous').disabled = el('Next').disabled = !selected.tracks.length;
        el('DeleteStation').disabled = data.stations.length === 1;
        el('Play').textContent = audio.paused ? 'PLAY' : 'PAUSE';
    }
    async function play() {
        const track = current(); if (!track) return;
        if (!audio.paused) { audio.pause(); status('PAUSED.'); return; }
        if (loadedId !== track.id || audio.error) {
            const source = track.kind === 'url' ? RobcoRadioStore.mediaURL(track.url) : files.get(track.fileKey);
            if (!source) { status('RESELECT THIS LOCAL FILE using ADD MUSIC, then click the track or press PLAY.'); return; }
            stop(); audio.src = source; loadedId = track.id;
        }
        const token = generation;
        status('TUNING...');
        try { await audio.play(); if (token === generation) status('PLAYING.'); }
        catch { if (token === generation) status('PLAYBACK UNAVAILABLE. Check the direct audio URL, network, or supported file format; press PLAY to retry.'); }
        render();
    }
    function move(direction, ended = false) {
        const data = state(), tracks = station().tracks;
        if (!tracks.length) return;
        const index = tracks.findIndex(item => item.id === data.trackId);
        let next = index + direction;
        if (ended && data.repeat === 'one') next = index;
        else if (data.shuffle && tracks.length > 1) {
            const candidates = tracks.map((_, i) => i).filter(i => i !== index);
            next = candidates[Math.floor(Math.random() * candidates.length)];
        } else if (ended && next >= tracks.length && data.repeat === 'off') { status('PLAYLIST COMPLETE.'); render(); return; }
        next = (next + tracks.length) % tracks.length;
        const resume = ended || !audio.paused;
        update(value => { value.trackId = tracks[next].id; }); stop();
        if (resume) void play(); else status('SELECTED. Press PLAY.');
    }
    function progress() {
        const finite = Number.isFinite(audio.duration) && audio.duration > 0;
        el('Seek').disabled = !finite; el('Seek').max = finite ? audio.duration : 1; el('Seek').value = finite ? audio.currentTime : 0;
        const time = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
        el('Time').textContent = time(audio.currentTime || 0) + ' / ' + (finite ? time(audio.duration) : '--:-- / STREAM');
    }
    el('Close').onclick = () => { generation++; audio.pause(); status('PAUSED.'); RobcoWindows.close(panel); };
    el('Play').onclick = () => void play();
    el('Previous').onclick = () => action(() => move(-1)); el('Next').onclick = () => action(() => move(1));
    el('Station').onchange = () => action(() => { const id = el('Station').value; update(next => { next.stationId = id; next.trackId = next.stations.find(item => item.id === id).tracks[0]?.id || null; }); stop(); status('STATION SELECTED.'); });
    el('NewStation').onclick = () => action(() => {
        const name = prompt('Station / playlist name:'); if (name === null) return;
        const id = uid(); update(next => { next.stations.push({ id, name: name.trim(), tracks: [] }); next.stationId = id; next.trackId = null; }); stop(); status('STATION CREATED.');
    });
    el('RenameStation').onclick = () => action(() => { const name = prompt('Station / playlist name:', station().name); if (name !== null) update(next => { next.stations.find(item => item.id === next.stationId).name = name.trim(); }); });
    el('DeleteStation').onclick = () => action(() => {
        if (!confirm('Delete this playlist and its entries? Original media files are not deleted.')) return;
        update(next => { next.stations = next.stations.filter(item => item.id !== next.stationId); next.stationId = next.stations[0].id; next.trackId = next.stations[0].tracks[0]?.id || null; }); stop(); releaseUnusedFiles(); status('STATION DELETED.');
    });
    el('AddURL').onsubmit = event => { event.preventDefault(); action(() => {
        const url = RobcoRadioStore.mediaURL(el('URL').value.trim()), title = el('Title').value.trim() || new URL(url).pathname.split('/').pop() || 'RADIO STREAM';
        const id = uid(); update(next => { next.stations.find(item => item.id === next.stationId).tracks.push({ id, title, kind: 'url', url }); next.trackId ||= id; });
        el('URL').value = ''; el('Title').value = ''; status('AUDIO SOURCE SAVED. Press PLAY to connect.');
    }); };
    el('AddMusic').onclick = () => el('Files').click();
    el('Files').onchange = () => action(() => {
        const selectedFiles = Array.from(el('Files').files);
        // Reset even on validation/storage failure so the same selection can be retried.
        el('Files').value = '';
        if (!selectedFiles.length) return;
        const accepted = selectedFiles.filter(file => file.size > 0 && (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)));
        const skipped = selectedFiles.length - accepted.length;
        if (!accepted.length) throw Error('NO AUDIO ADDED. Empty or unsupported files; choose MP3, WAV, M4A or other browser-compatible audio.');
        const entries = accepted.map(file => ({ id: uid(), title: file.name.slice(0, 200), kind: 'local', fileKey: fileKey(file) }));
        store.update(next => { const target = next.stations.find(item => item.id === next.stationId); for (const item of entries) if (!target.tracks.some(track => track.kind === 'local' && track.fileKey === item.fileKey)) target.tracks.push(item); next.trackId ||= target.tracks[0]?.id || null; });
        for (const file of accepted) {
            const key = fileKey(file); if (!files.has(key)) files.set(key, URL.createObjectURL(file));
        }
        render(); status('LOCAL MEDIA READY. Click a track or press PLAY. Reselect files after a reload.' + (skipped ? ' SKIPPED ' + skipped + ' empty or unsupported file(s).' : ''));
    });
    el('Remove').onclick = () => action(() => {
        if (!confirm('Remove the selected track from this playlist?')) return;
        const removed = current(); update(next => { const target = next.stations.find(item => item.id === next.stationId); target.tracks = target.tracks.filter(item => item.id !== next.trackId); next.trackId = target.tracks[0]?.id || null; }); stop();
        if (removed.kind === 'local' && !state().stations.some(item => item.tracks.some(track => track.fileKey === removed.fileKey))) { URL.revokeObjectURL(files.get(removed.fileKey)); files.delete(removed.fileKey); }
        status('TRACK REMOVED.');
    });
    for (const [name, offset] of [['Up', -1], ['Down', 1]]) el(name).onclick = () => action(() => update(next => {
        const tracks = next.stations.find(item => item.id === next.stationId).tracks, index = tracks.findIndex(item => item.id === next.trackId), target = index + offset;
        if (target >= 0 && target < tracks.length) [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
    }));
    el('Volume').oninput = () => { audio.volume = Number(el('Volume').value); };
    el('Volume').onchange = () => action(() => update(next => { next.volume = Number(el('Volume').value); }));
    el('Mute').onclick = () => action(() => update(next => { next.muted = !next.muted; }));
    el('Shuffle').onclick = () => action(() => update(next => { next.shuffle = !next.shuffle; }));
    el('Repeat').onchange = () => action(() => update(next => { next.repeat = el('Repeat').value; }));
    el('Seek').oninput = () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(el('Seek').value); };
    audio.addEventListener('ended', () => action(() => move(1, true)));
    audio.addEventListener('error', () => { if (audio.hasAttribute('src')) status('SIGNAL LOST / UNSUPPORTED MEDIA. Check the source or select another track.'); });
    audio.addEventListener('waiting', () => status('BUFFERING SIGNAL...'));
    audio.addEventListener('playing', () => status('PLAYING.'));
    for (const event of ['play', 'pause']) audio.addEventListener(event, () => { el('Play').textContent = audio.paused ? 'PLAY' : 'PAUSE'; });
    for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'emptied']) audio.addEventListener(event, progress);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') el('Close').click(); });
    render(); progress();
    return { open() { RobcoWindows.show(panel); render(); status(store.warning || (!audio.paused ? 'PLAYING.' : current()?.kind === 'local' && !files.has(current().fileKey) ? 'RESELECT LOCAL FILES using ADD MUSIC. Playlist entries are saved; audio access lasts for this session.' : 'READY. Press PLAY to resume or choose a track.')); el('Station').focus({ preventScroll: true }); }, importPlaylist, panel };
})();
recordApps.radio = radio;

function openRadioFromFiles() {
    fileAction(() => {
        if (!discardFileChanges()) return;
        const path = explorerFile;
        if (path && path.startsWith('/VAULT/MUSIC/')) radio.importPlaylist(path);
        radio.open();
        fileElement('fileContent').value = explorerOriginal;
        fileElement('explorerWindow').hidden = true;
        explorerFile = null;
    });
}
