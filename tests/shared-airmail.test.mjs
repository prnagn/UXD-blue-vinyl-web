import assert from 'node:assert/strict';

// Exercise the archive lifecycle without touching a real browser's IndexedDB.
function memoryIndexedDB() {
  const stores = { albums: new Map(), inbox: new Map() };
  const db = { close() {}, transaction() {
    let pending = 0;
    let complete = false;
    const tx = { objectStore(name) {
      const store = stores[name];
      function finish() {
        queueMicrotask(() => { if (!pending && !complete) { complete = true; tx.oncomplete?.(); } });
      }
      function read(value) {
        const request = {};
        pending++;
        queueMicrotask(() => {
          request.result = structuredClone(value());
          request.onsuccess?.();
          pending--; finish();
        });
        return request;
      }
      return {
        get: key => read(() => store.get(key)), getAll: () => read(() => [...store.values()]),
        put(value) { store.set(value.id, structuredClone(value)); finish(); },
        delete(key) { store.delete(key); finish(); },
      };
    } };
    return tx;
  } };
  return {
    open() { const request = { result: db }; queueMicrotask(() => request.onsuccess()); return request; },
    deleteDatabase() { Object.values(stores).forEach(store => store.clear()); const request = {}; queueMicrotask(() => request.onsuccess()); return request; },
  };
}

export async function testSharedAirmail(archive) {
  const previous = globalThis.indexedDB;
  globalThis.indexedDB = memoryIndexedDB();
  try {
    await archive.ensureWelcomeDelivery();
    await archive.ensureWelcomeDelivery();
    const arrivals = await archive.loadInbox();
    assert.equal(arrivals.length, 1, 'Jeju must arrive as exactly one paper airplane');
    assert.equal(arrivals[0].album.city, 'Jeju');
    assert.equal(await archive.welcomePreviewRequired(), true, 'the first Jeju delivery must guide the user to preview it');
    await archive.completeWelcomePreview();
    assert.equal(await archive.welcomePreviewRequired(), false, 'returning from preview unlocks normal choices');
    await archive.ensureWelcomeDelivery();
    assert.equal(await archive.welcomePreviewRequired(), false, 'completed guidance must stay completed when the app reloads');
    assert.equal((await archive.loadInbox()).length, 1, 'completing guidance must not save or discard the Jeju delivery');
    assert.equal((await archive.loadAlbums()).length, 0, 'initial shared Jeju must not be on the shelf');
    await archive.saveAlbum({ id: 'own', start: '2026-11-12', entries: [], phase: 'trip' });
    await archive.saveAlbum(archive.demos[0]);
    const kept = await archive.resolveDelivery(arrivals[0], true);
    assert(kept.shared && !kept.demo, 'kept incoming LPs must persist the shared tag');
    await archive.ensureWelcomeDelivery();
    assert.equal((await archive.loadInbox()).length, 0, 'saving Jeju must remove its airplane across reloads');
    const saved = await archive.loadAlbums();
    const shelf = archive.visibleShelfAlbums(saved);
    assert.equal(saved.length, 3, 'hiding demo records must not delete any stored album');
    assert.deepEqual(shelf.map(album => album.id), [kept.id, 'own'], 'a received album must appear first, above user records, while old demos stay hidden');
    const arrivalsByDay = archive.visibleShelfAlbums([
      { id: 'older-delivery', start: '2026-11-12', shelfAddedAt: Date.parse('2026-11-12'), delivery: { arrivesOn: '2026-11-13', unpackedAt: '2026-11-20' } },
      { id: 'latest-delivery', start: '2025-01-01', shelfAddedAt: 1, delivery: { arrivesOn: '2026-11-15' } },
      { id: 'shared', shared: true, start: '2024-09-01', shelfAddedAt: new Date(2026, 10, 14, 12).getTime() },
      { id: 'hidden-demo', demo: true, delivery: { arrivesOn: '2027-01-01' } },
    ]);
    assert.deepEqual(arrivalsByDay.map(album => album.id), ['latest-delivery', 'shared', 'older-delivery'], 'sort by delivery date, not travel date, creation date or late unwrapping; shared albums use their local shelf receipt date');
    await archive.resetArchive();
    await archive.ensureWelcomeDelivery();
    const again = await archive.loadInbox();
    assert.equal(await archive.welcomePreviewRequired(), true, 'formatting should reset the first-delivery guidance with the welcome offer');
    await archive.resolveDelivery(again[0], false);
    await archive.ensureWelcomeDelivery();
    assert.equal((await archive.loadInbox()).length, 0, 'discarded shared Jeju must not reappear');
    assert.equal((await archive.loadAlbums()).length, 0, 'discarding must not add a shelf item');
    assert.equal(await archive.welcomePreviewRequired(), false, 'an absent delivery must never trigger a phantom highlighted plane');
    const oldParis = { ...archive.demos[3], id: 'shared-paris', demo: false, shared: true };
    await archive.saveAlbum(oldParis);
    await archive.addDelivery({ id: 'welcome-paris', receivedAt: 123, album: oldParis });
    await archive.ensureWelcomeDelivery();
    const migrated = await archive.loadInbox();
    assert.equal(migrated.length, 1, 'upgrading the welcome LP must not create a second incoming plane');
    assert.equal(migrated[0].album.city, 'Jeju');
    assert.equal(migrated[0].receivedAt, 123);
    assert.equal((await archive.loadAlbums()).find(item => item.id === 'shared-paris').city, 'Paris', 'changing the incoming example must preserve the Paris LP already saved by the user');
  } finally {
    await archive.resetArchive();
    if (previous === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous;
  }
  console.log('PASS: one-time Jeju airmail, persistent save/discard, shared labels, hidden demos and first shelf position');
}
