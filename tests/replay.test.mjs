import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { startAmbient } from '../src/ambient-audio.js';
import { parkedAngle, needleRadius, trackRadius, trackAngle } from '../src/replay-geometry.js';

globalThis.FileReader = class {
  async readAsDataURL(blob) {
    this.result = 'data:' + blob.type + ';base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64');
    this.onload();
  }
};

for (const width of [280, 390, 432]) {
  const scale = width * .57 / 138;
  const layout = { x: width * .987 - width * .57 + width * .57 * 107 / 138, y: 300 - 236 * scale * .57 + 36 * scale, scale, cx: width * .25, cy: 300, radius: width * .63 };
  assert(needleRadius(parkedAngle, layout) > layout.radius, 'parked needle must be outside the LP');
  for (const count of [1, 3, 12]) {
    let previous = Infinity;
    for (let i = 0; i < count; i++) {
      const r = needleRadius(trackAngle(i, count, layout), layout);
      assert(Math.abs(r - trackRadius(i, count, layout)) < .001, 'needle must land on its own track ring');
      assert(r < previous, 'later tracks must be further inward');
      previous = r;
    }
  }
}

for (const length of [.2, 1, 9, 300]) {
  const calls = [];
  const events = [];
  let ended = 0;
  const engine = {
    currentTime: 10, destination: {},
    createGain() { return { gain: { setValueAtTime: (...args) => events.push(['set', ...args]), linearRampToValueAtTime: (...args) => events.push(['ramp', ...args]) }, connect() {}, disconnect() {} }; },
    createBufferSource() { return { connect(gain) { return gain; }, disconnect() {}, start: (...args) => calls.push(args) }; },
  };
  const front = startAmbient(engine, { duration: length }, 'intro', () => ended++);
  assert.deepEqual(calls[0], [10, 0, length / 2]);
  assert.deepEqual(events.at(-1), ['ramp', 0, 10 + length / 2]);
  front.onended();
  assert.equal(calls.length, 1, 'ending a segment must never auto-advance');
  assert.equal(ended, 1);
  events.length = 0;
  startAmbient(engine, { duration: length }, 'outro', () => ended++);
  assert.deepEqual(calls[1], [10, length / 2, length / 2]);
  assert.deepEqual(events[0], ['set', 0, 10]);
  assert.deepEqual(events.at(-1), ['ramp', 1, 10 + Math.min(2, length / 2)]);
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { replayTracks, albumPlaybackTracks, trackArt, albumFile, importAlbum } = await server.ssrLoadModule('/src/archive.js');
  const song = { id: '1234567890123456789012', name: 'Saved Song', artist: 'Artist', url: 'https://open.spotify.com/track/1234567890123456789012' };
  const p1 = { id: 'p1', kind: 'photo', src: '/one.jpg', day: '2026-11-11', time: '09:01', captureId: 'one', spotify: song };
  const a1 = { id: 'a1', kind: 'audio', fieldRecording: true, blob: new Blob(['audio'], { type: 'audio/webm' }), day: p1.day, time: p1.time, captureId: 'one', spotify: song, waveform: [.2, .5], durationMs: 1000 };
  const p2 = { id: 'p2', kind: 'photo', src: '/two.jpg', day: p1.day, time: '10:02', captureId: 'two' };
  const a2 = { ...a1, id: 'a2', time: p2.time, captureId: 'two', spotify: undefined };
  const standalone = { ...p2, id: 'p3', captureId: 'three', time: '11:02', spotify: song };
  const album = { id: 'qa', name: 'QA', color: '#b99086', entries: [a2, p2, { id: 'memo', kind: 'memo' }, p1, a1, standalone], grooves: [] };
  assert.deepEqual(replayTracks(album.entries).map(t => t.id), ['a1', 'a2', 'p3']);
  const playlist = albumPlaybackTracks(album.entries);
  assert.deepEqual(playlist.map(t => t.id), ['a1', 'a1:spotify', 'a2', 'p3']);
  assert.equal(playlist[1].kind, 'spotify');
  assert.equal(playlist[1].blob, undefined, 'Spotify track must not play the ambient blob');
  assert.equal(trackArt(album, playlist[1]).id, 'p1', 'song must retain its captured moment photo');
  assert.equal(trackArt(album, playlist.at(-1)).id, 'p3');
  assert.deepEqual(albumPlaybackTracks([{ ...a2, spotify: { id: 'invalid' } }]).map(t => t.id), ['a2']);
  assert.equal(trackArt(album, a1).id, 'p1');
  assert.equal(trackArt(album, a2).id, 'p2');
  assert.equal(trackArt(album, { ...a2, captureId: undefined }).id, 'p2');
  assert.equal(trackArt(album, { ...a2, captureId: 'audio-only' }), undefined);

  const { TripMoment } = await server.ssrLoadModule('/src/trip-moment.jsx');
  const summary = renderToStaticMarkup(React.createElement(TripMoment, { album, entries: [p2, a2], note: '', day: p1.day }));
  assert(!summary.includes('capture-songs') && !summary.includes('노래 추가'), 'no empty song card or manual add action');
  const withSong = renderToStaticMarkup(React.createElement(TripMoment, { album, entries: [p1, a1], note: '', day: p1.day }));
  assert(withSong.includes('Saved Song') && !withSong.includes('노래 추가'));
  const { AlbumPlayer } = await server.ssrLoadModule('/src/album-player.jsx');
  const first = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a1 }));
  const second = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a2 }));
  assert(first.includes('/one.jpg') && second.includes('/two.jpg'), 'selected audio must change the center photo');
  assert(first.includes('--focus-arm-angle:-35deg'), 'paused arm must be parked');
  const spotifyView = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a2, selectedId: 'a1:spotify' }));
  assert(spotifyView.includes('Spotify · Saved Song') && spotifyView.includes('open.spotify.com/embed/track/' + song.id), 'song selection must open its Spotify player');
  assert(spotifyView.includes('/one.jpg') && !spotifyView.includes('<audio'), 'Spotify selection must use its own photo and stop ambient audio');
  const { MomentMap } = await server.ssrLoadModule('/src/moment-map.jsx');
  const map = renderToStaticMarkup(React.createElement(MomentMap, { album, tracks: album.entries }));
  assert.equal((map.match(/class="moment-pin"/g) || []).length, 3, 'field recordings and song-only moments must get pins');
  const shared = { ...album, entries: [p1, a1].map(t => t.kind === 'photo' ? { ...t, src: undefined, blob: new Blob(['photo'], { type: 'image/jpeg' }) } : t) };
  const restored = await importAlbum(await albumFile(shared));
  const restoredAudio = restored.entries.find(t => t.kind === 'audio');
  assert.equal(restoredAudio.captureId, 'one');
  assert.equal(trackArt(restored, restoredAudio).captureId, 'one');
  assert.equal(restoredAudio.spotify.id, song.id);
} finally { await server.close(); }
console.log('PASS: tonearm rings (3 widths), ambient halves/fades/manual transitions, replay order/photos/pins, song UI, archive round-trip');
