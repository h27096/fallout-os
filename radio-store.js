/* Versioned metadata store; local media handles stay in the player adapter. */
(function (global) {
    'use strict';
    const key = 'robco.radio.v1';
    function mediaURL(value) {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Use a direct HTTP(S) audio URL without credentials.');
        return url.href;
    }
    function validate(data) {
        if (data?.version !== 1 || !Array.isArray(data.stations) || !data.stations.length || data.stations.length > 100 ||
            !Number.isFinite(data.volume) || data.volume < 0 || data.volume > 1 || typeof data.muted !== 'boolean' ||
            typeof data.shuffle !== 'boolean' || !['off', 'all', 'one'].includes(data.repeat)) throw Error('Invalid radio settings.');
        const ids = new Set();
        for (const station of data.stations) {
            if (typeof station.id !== 'string' || ids.has(station.id) || typeof station.name !== 'string' || !station.name.trim() || station.name.length > 80 || !Array.isArray(station.tracks) || station.tracks.length > 1000) throw Error('Invalid station.');
            ids.add(station.id);
            const tracks = new Set();
            for (const track of station.tracks) {
                if (typeof track.id !== 'string' || tracks.has(track.id) || typeof track.title !== 'string' || !track.title.trim() || track.title.length > 200) throw Error('Invalid track.');
                tracks.add(track.id);
                if (track.kind === 'url') mediaURL(track.url);
                else if (track.kind !== 'local' || typeof track.fileKey !== 'string') throw Error('Invalid media source.');
            }
        }
        const station = data.stations.find(item => item.id === data.stationId);
        if (!station || (data.trackId !== null && !station.tracks.some(item => item.id === data.trackId))) throw Error('Invalid selection.');
        return data;
    }
    function create(storage) {
        let state = { version: 1, volume: 0.65, muted: false, shuffle: false, repeat: 'off', stationId: 'vault-radio', trackId: null,
            stations: [{ id: 'vault-radio', name: 'VAULT RADIO', tracks: [] }] };
        let snapshot = null, warning = '';
        try { snapshot = storage.getItem(key); if (snapshot !== null) state = validate(JSON.parse(snapshot)); }
        catch { warning = 'Radio storage unavailable or damaged. Saved data preserved; reload after recovery.'; }
        return {
            get state() { return structuredClone(state); }, get warning() { return warning; },
            update(change) {
                if (warning) throw Error(warning);
                const next = structuredClone(state); change(next); validate(next);
                try {
                    if (storage.getItem(key) !== snapshot) throw Error('Radio changed in another tab. Reload before saving.');
                    const value = JSON.stringify(next); storage.setItem(key, value); snapshot = value; state = next;
                } catch (error) { throw Error('NOT SAVED. ' + error.message); }
                return this.state;
            }
        };
    }
    global.RobcoRadioStore = { create, key, mediaURL };
})(globalThis);
