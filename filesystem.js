/* Storage adapter is the only persistence boundary. Replace it for Electron. */
(function (global) {
    'use strict';
    const KEY = 'robco.files.v1';
    const folders = ['SYSTEM', 'VAULT', 'PERSONNEL', 'SECURITY', 'LOGS', 'CLASSIFIED'];
    const seed = {};
    folders.forEach(name => { seed['/' + name] = { type: 'folder', system: true }; });
    function file(path, content, readonly = false) { seed[path] = { type: 'file', content, system: true, readonly }; }
    file('/SYSTEM/README.DAT', 'ROBCO FILE EXPLORER v0.3\nUse DIR, CD <folder>, OPEN <path>, or FILES.\nUser files are stored in this browser.\nSYSTEM records are read-only.', true);
    file('/SECURITY/SECURITY.DAT', 'SECURITY DATABASE:\nDOOR CONTROL: ONLINE\nCAMERAS: ACTIVE', true);
    file('/VAULT/REACTOR.DAT', 'REACTOR DATABASE:\nPOWER OUTPUT: 98%\nCOOLANT: NORMAL\nCORE TEMP: STABLE', true);
    file('/PERSONNEL/PERSONNEL.DAT', 'VAULT PERSONNEL DATABASE\nID 001: NATE — UNKNOWN\nID 002: NORA — DECEASED\nID 003: SHAUN — CLASSIFIED\nID 004: SECURITY CHIEF — ACTIVE');
    file('/CLASSIFIED/CLASSIFIED.DAT', '*** CLASSIFIED FILE ***\nPROJECT: FROST WATCH\nSTATUS: ACTIVE\nCLEARANCE: OVERSEER');
    file('/CLASSIFIED/EXPERIMENTS.DAT', 'EXPERIMENT DATABASE\nSUBJECT COUNT: 124\nACTIVE TESTS: 3\nSTATUS: CONFIDENTIAL');
    file('/LOGS/OVERSEER.LOG', '', true);
    const aliases = Object.fromEntries(Object.keys(seed).filter(p => seed[p].type === 'file').map(p => [p.split('/').pop(), p]));
    function normalize(path, cwd = '/') {
        path = String(path).trim().replace(/\\/g, '/').replace(/^C:\/ROBCO(?=\/|$)/i, '/');
        const parts = path.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
        for (const part of path.toUpperCase().split('/')) {
            if (!part || part === '.') continue;
            if (part === '..') parts.pop();
            else parts.push(part);
        }
        return '/' + parts.join('/');
    }
    const parent = path => path.slice(0, path.lastIndexOf('/')) || '/';
    const restricted = path => /^\/(CLASSIFIED|PERSONNEL|LOGS)(\/|$)/.test(path);
    function create(storage, isOverseer, readLogs) {
        let nodes = structuredClone(seed), snapshot = null, warning = '';
        try {
            snapshot = storage.getItem(KEY);
            if (snapshot !== null) {
                const data = JSON.parse(snapshot);
                if (data.version !== 1 || !data.nodes || typeof data.nodes !== 'object' || Array.isArray(data.nodes)) throw Error();
                const loaded = data.nodes;
                for (const [path, node] of Object.entries(loaded)) {
                    if (normalize(path) !== path || path === '/' || !['file', 'folder'].includes(node.type) ||
                        (node.type === 'file' && typeof node.content !== 'string') ||
                        (parent(path) !== '/' && loaded[parent(path)]?.type !== 'folder')) throw Error();
                }
                for (const [path, node] of Object.entries(seed)) {
                    if (!loaded[path] || loaded[path].type !== node.type) throw Error();
                    loaded[path] = { ...loaded[path], system: true, readonly: !!node.readonly };
                    if (node.readonly) loaded[path].content = node.content;
                }
                nodes = loaded;
            }
        } catch { warning = 'Stored filesystem is unavailable or damaged. Read-only recovery view; existing storage was preserved.'; }
        function check(path) {
            if (restricted(path) && !isOverseer()) throw Error('ACCESS DENIED. OVERSEER clearance required.');
        }
        function get(path) {
            check(path);
            if (path === '/') return { type: 'folder', system: true };
            if (!nodes[path]) throw Error('FILE OR FOLDER NOT FOUND.');
            const node = { ...nodes[path] };
            if (path === '/LOGS/OVERSEER.LOG') node.content = readLogs();
            return node;
        }
        function commit(next) {
            if (warning) throw Error(warning);
            try {
                if (storage.getItem(KEY) !== snapshot) throw Error('Files changed in another window. Reload before saving.');
                const value = JSON.stringify({ version: 1, nodes: next });
                storage.setItem(KEY, value);
                snapshot = value;
                nodes = next;
            } catch (error) { throw Error('NOT SAVED. ' + error.message); }
        }
        function writable(path) {
            const node = get(path);
            if (node.readonly || path === '/SYSTEM' || path.startsWith('/SYSTEM/')) throw Error('READ-ONLY SYSTEM RECORD.');
            return node;
        }
        function validName(name, type) {
            name = String(name).trim().toUpperCase();
            if (!/^[A-Z0-9][A-Z0-9 _.-]{0,63}$/.test(name) || /[. ]$/.test(name)) throw Error('Use 1–64 letters, numbers, spaces, dots, hyphens or underscores.');
            if (type === 'file' && !/\.(DAT|LOG)$/.test(name)) throw Error('Files must end in .DAT or .LOG.');
            return name;
        }
        return {
            get warning() { return warning; }, normalize, parent,
            resolve(path, cwd = '/') {
                const full = normalize(path, cwd);
                return nodes[full] || full === '/' ? full : aliases[String(path).toUpperCase()] || full;
            },
            get,
            list(path) {
                if (get(path).type !== 'folder') throw Error('NOT A FOLDER.');
                return Object.keys(nodes).filter(p => parent(p) === path).sort((a, b) =>
                    (nodes[a].type === nodes[b].type ? a.localeCompare(b) : nodes[a].type === 'folder' ? -1 : 1)
                ).map(p => ({ path: p, name: p.split('/').pop(), type: nodes[p].type, locked: restricted(p) && !isOverseer() }));
            },
            create(path, name, type) {
                if (!['folder', 'file'].includes(type)) throw Error('INVALID TYPE.');
                if (writable(path).type !== 'folder') throw Error('NOT A FOLDER.');
                const target = normalize(validName(name, type), path);
                if (nodes[target]) throw Error('NAME ALREADY EXISTS.');
                check(target);
                commit({ ...nodes, [target]: { type, ...(type === 'file' ? { content: '' } : {}) } });
                return target;
            },
            write(path, content) {
                if (writable(path).type !== 'file') throw Error('NOT A FILE.');
                if (typeof content !== 'string' || content.length > 200000) throw Error('File limit: 200,000 characters.');
                commit({ ...nodes, [path]: { ...nodes[path], content } });
            },
            rename(path, name) {
                const node = writable(path);
                if (node.system) throw Error('Built-in records cannot be renamed or deleted.');
                const target = normalize(validName(name, node.type), parent(path));
                if (nodes[target]) throw Error('NAME ALREADY EXISTS.');
                check(target);
                const next = { ...nodes };
                for (const p of Object.keys(nodes)) if (p === path || p.startsWith(path + '/')) {
                    next[target + p.slice(path.length)] = nodes[p]; delete next[p];
                }
                commit(next); return target;
            },
            remove(path) {
                const node = writable(path);
                if (node.system) throw Error('Built-in records cannot be renamed or deleted.');
                if (Object.keys(nodes).some(p => p.startsWith(path + '/'))) throw Error('Folder must be empty before deleting.');
                const next = { ...nodes }; delete next[path]; commit(next);
            }
        };
    }
    global.RobcoFilesystem = { create, normalize, key: KEY };
})(globalThis);
