const places = [
  ['Jeju', 'Korea', '2025-09-12', '2025-09-15', '#6f8e85'],
  ['Lisbon', 'Portugal', '2025-06-03', '2025-06-09', '#ae8173'],
  ['Kyoto', 'Japan', '2025-04-04', '2025-04-10', '#a68b8e'],
  ['Paris', 'France', '2024-09-07', '2024-09-13', '#8294ab'],
  ['Bangkok', 'Thailand', '2024-07-12', '2024-07-17', '#ac8a68'],
  ['Reykjavík', 'Iceland', '2024-02-02', '2024-02-08', '#7e8caa'],
  ['New York', 'USA', '2023-11-03', '2023-11-09', '#7a8490'],
];

export const demos = places.map(([city, country, start, end, color], i) => ({
  id: 'demo-' + i, city, country, start, end, color, demo: true, phase: 'pressed',
  entries: [{
    id: 'intro-' + i, day: start, kind: 'memo', name: '첫 장면',
    note: ['바닷길을 따라 걷다 잠깐 멈춰 파도 소리를 들었다.', '전차가 지나간 골목에 오후 햇살이 남아 있었다.', '문을 여는 가게들 사이로 천천히 걸었던 아침.', '센 강 옆을 걷던 오후. 도시는 하루의 끝에서 가장 조용했다.', '시장 안쪽에서 맞이한 낯선 아침.', '찬 바람 사이로 바다 냄새가 났다.', '유리창에 불이 켜지는 저녁.'][i],
  }],
}));
demos[0].entries.unshift({ id: 'jeju-sound', day: demos[0].start, kind: 'audio', fieldRecording: true, name: '파도 소리 · 샘플', src: import.meta.env.BASE_URL + 'art/jeju-waves.wav' });
demos[3].entries.unshift({ id: 'paris-photo', day: demos[3].start, kind: 'photo', name: '센 강의 오후 · 샘플', src: import.meta.env.BASE_URL + 'art/paris.jpg' });
demos[3].art = { trackId: 'paris-photo' };
demos[3].entries.push(...[
  ['09:42', 'Morning by the Seine', import.meta.env.BASE_URL + 'art/paris-moment-1.wav'],
  ['15:18', 'A Walk Through Paris', import.meta.env.BASE_URL + 'art/paris-moment-2.wav'],
  ['19:56', 'After the Blue Hour', import.meta.env.BASE_URL + 'art/paris-moment-3.wav'],
].map(([time, name, src], index) => ({
  id: 'paris-moment-' + index, day: demos[3].start, kind: 'audio', name, time, src, art: { trackId: 'paris-photo' },
})));

let database;
function openArchive() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('blue-vinyl-archive', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('albums')) db.createObjectStore('albums', { keyPath: 'id' });
      db.createObjectStore('inbox', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 Blue Vinyl 탭을 닫아 주세요.'));
  });
  return database;
}

async function readStore(store) {
  const db = await openArchive();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const loadAlbums = () => readStore('albums');
export async function resetArchive(onBlocked = () => {}) {
  const previous = database;
  database = undefined;
  if (previous) { try { (await previous).close(); } catch { /* A failed connection does not prevent deletion. */ } }
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('blue-vinyl-archive');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => onBlocked();
  });
}
export async function loadInbox() {
  const items = await readStore('inbox');
  return items.filter((item) => item.album).sort((a, b) => b.receivedAt - a.receivedAt);
}

async function writeStores(stores, write) {
  const db = await openArchive();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    write(tx);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export const saveAlbum = (album) => writeStores(['albums'], (tx) => tx.objectStore('albums').put(album));
export const addDelivery = (delivery) => writeStores(['inbox'], (tx) => tx.objectStore('inbox').put(delivery));

export function resolveDelivery(delivery, keep) {
  return writeStores(keep ? ['albums', 'inbox'] : ['inbox'], (tx) => {
    if (keep) tx.objectStore('albums').put(delivery.album);
    tx.objectStore('inbox').delete(delivery.id);
  });
}

export function localDay(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function deliverySchedule() {
  const dispatchedOn = localDay();
  return { dispatchedOn, arrivesOn: dateAfter(dispatchedOn, 3), destination: '' };
}

export function dateAfter(day, days) {
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return localDay(date);
}

export function localTime(now = new Date()) {
  return [now.getHours(), now.getMinutes()].map((number) => String(number).padStart(2, '0')).join(':');
}

function selectedArt(album, art) {
  return art?.trackId ? album.entries.find((entry) => entry.id === art.trackId && entry.kind === 'photo') : art;
}

export const albumArt = (album) => selectedArt(album, album?.art);
export function trackArt(album, track) {
  if (!track) return undefined;
  const explicit = selectedArt(album, track.art);
  if (explicit || track.kind === 'photo') return explicit || track;
  const photos = album.entries.filter((entry) => entry.kind === 'photo');
  if (track.captureId) return photos.find((entry) => entry.captureId === track.captureId);
  // Older captures paired adjacent entries before captureId was introduced.
  const at = album.entries.indexOf(track);
  return photos.filter((entry) => entry.day === track.day && entry.time && entry.time === track.time)
    .sort((a, b) => Math.abs(album.entries.indexOf(a) - at) - Math.abs(album.entries.indexOf(b) - at))[0];
}

export function replayTracks(entries) {
  const audio = entries.filter((entry) => ['audio', 'video'].includes(entry.kind));
  const sequenced = entries.some((entry) => Number.isFinite(entry.sequence));
  return entries.filter((entry) => audio.includes(entry) || (entry.kind === 'photo' && entry.spotify &&
    !audio.some((sound) => entry.captureId ? sound.captureId === entry.captureId : sound.day === entry.day && sound.time === entry.time)))
    .sort((a, b) => sequenced
      ? (a.sequence ?? entries.indexOf(a)) - (b.sequence ?? entries.indexOf(b))
      : ((a.day || '') + (a.time || '')).localeCompare((b.day || '') + (b.time || '')));
}

// Keep the saved moment intact; its Spotify song is a separate player track.
export function albumPlaybackTracks(entries) {
  return replayTracks(entries).flatMap((entry) => {
    const song = entry.spotify;
    if (!song || !/^[a-zA-Z0-9]{22}$/.test(song.id || '')) return [entry];
    const spotify = {
      ...entry, id: entry.kind === 'photo' ? entry.id : entry.id + ':spotify',
      kind: 'spotify', name: song.name, artist: song.artist, blob: undefined, src: undefined,
      art: entry.kind === 'photo' ? { trackId: entry.id } : entry.art,
    };
    return entry.kind === 'photo' ? [spotify] : [entry, spotify];
  });
}

async function encodeMedia({ blob, src }) {
  const response = src && !blob ? await fetch(src) : null;
  if (response && !response.ok) throw new Error('미디어를 열지 못했어요.');
  const media = blob || (response ? await response.blob() : null);
  if (!media) return undefined;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(media);
  });
}

export async function albumFile(album) {
  const { delivery, ...sharedAlbum } = album;
  async function encodeArt(art) {
    if (art?.trackId) return { trackIndex: album.entries.findIndex((entry) => entry.id === art.trackId) };
    if (art) return { data: await encodeMedia(art) };
  }
  const entries = await Promise.all(album.entries.map(async ({ blob, src, art, ...entry }) => ({
    ...entry, data: await encodeMedia({ blob, src }), art: await encodeArt(art),
  })));
  const art = await encodeArt(album.art);
  const filename = (album.name || album.city).replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'Blue Vinyl';
  return new File([JSON.stringify({ format: 'blue-vinyl/1', album: { ...sharedAlbum, entries, art } })], filename + '.bluevinyl.json', { type: 'application/json' });
}

export async function importAlbum(file) {
  if (file.size > 150 * 1024 * 1024) throw new Error('이 파일은 너무 커요.');
  const { format, album } = JSON.parse(await file.text());
  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (format !== 'blue-vinyl/1' || !(clean(album?.city, 80) || clean(album?.name, 50)) || !Array.isArray(album.entries)) {
    throw new Error('Blue Vinyl에서 내보낸 앨범 파일을 선택해 주세요.');
  }
  const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  function spotifyTrack(value) {
    if (!value || !/^[a-zA-Z0-9]{22}$/.test(value.id || '')) return undefined;
    return {
      id: value.id, name: clean(value.name, 120), artist: clean(value.artist, 200),
      url: 'https://open.spotify.com/track/' + value.id,
      image: typeof value.image === 'string' && /^https:\/\/i\.scdn\.co\/image\/[a-zA-Z0-9]+$/.test(value.image) ? value.image : '',
    };
  }
  const entries = await Promise.all(album.entries.map(async (entry) => {
    const { kind, data } = entry;
    if (!['memo', 'photo', 'audio', 'video'].includes(kind)) throw new Error('읽을 수 없는 트랙이 있어요.');
    const type = { photo: 'image', audio: 'audio', video: 'video' }[kind];
    if (type && !(typeof data === 'string' && data.startsWith('data:' + type + '/'))) throw new Error('미디어가 빠진 트랙이 있어요.');
    return {
      id: crypto.randomUUID(), kind, day: date(entry.day), name: clean(entry.name, 120),
      time: typeof entry.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry.time) ? entry.time : '',
      note: clean(entry.note, 3000), artist: clean(entry.artist, 120), fieldRecording: entry.fieldRecording === true,
      captureId: typeof entry.captureId === 'string' ? clean(entry.captureId, 80) : undefined,
      place: clean(entry.place, 180),
      sequence: Number.isFinite(entry.sequence) && entry.sequence >= 0 ? Math.min(100000, Math.floor(entry.sequence)) : undefined,
      durationMs: Number.isFinite(entry.durationMs) ? Math.max(0, Math.min(300000, entry.durationMs)) : undefined,
      waveform: Array.isArray(entry.waveform) ? entry.waveform.slice(0, 360).map((value) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0) : undefined,
      spotify: spotifyTrack(entry.spotify),
      blob: type ? await (await fetch(data)).blob() : undefined,
    };
  }));
  async function decodeArt(art) {
    const photo = Number.isInteger(art?.trackIndex) ? entries[art.trackIndex] : undefined;
    if (photo?.kind === 'photo') return { trackId: photo.id };
    if (typeof art?.data === 'string' && art.data.startsWith('data:image/')) {
      return { blob: await (await fetch(art.data)).blob() };
    }
  }
  const art = await decodeArt(album.art);
  await Promise.all(entries.map(async (entry, index) => { entry.art = await decodeArt(album.entries[index].art); }));
  const completed = typeof album.completedAt === 'string' ? Date.parse(album.completedAt) : NaN;
  return {
    id: crypto.randomUUID(), name: clean(album.name, 50), city: clean(album.city, 80), country: clean(album.country, 80),
    start: date(album.start) || localDay(), end: date(album.end), note: clean(album.note, 3000),
    completedAt: Number.isFinite(completed) ? new Date(completed).toISOString() : undefined,
    color: /^#[0-9a-f]{6}$/i.test(album.color) ? album.color : '#8495ad', phase: 'pressed', entries, art,
  };
}
