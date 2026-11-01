'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStore, DEFAULT } = require('./electron/wallpaper.cjs');
test('wallpaper storage preserves last selection when replacement fails and recovers corrupt settings', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wallpaper-store-'));
    const store = createStore(directory);
    assert.deepEqual(await store.read(), DEFAULT);
    const chosen = { ...DEFAULT, wallpaper: 'blue', position: 'fit' };
    await store.write(chosen);
    assert.deepEqual(await createStore(directory).read(), chosen);
    // A blocked temporary destination simulates a disk write failure portably.
    await fs.mkdir(path.join(directory, 'wallpaper.json.tmp'));
    await assert.rejects(store.write({ ...DEFAULT }));
    assert.deepEqual(await store.read(), chosen);
    await fs.rmdir(path.join(directory, 'wallpaper.json.tmp'));
    await assert.rejects(store.write({ wallpaper: 'custom', position: 'fill', image: null }));
    await fs.writeFile(path.join(directory, 'wallpaper.json'), '{invalid');
    assert.match((await store.read()).warning, /could not be read/);
    await store.write({ ...DEFAULT });
    assert.deepEqual(await store.read(), DEFAULT);
});
