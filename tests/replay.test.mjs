import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { startAmbient } from '../src/ambient-audio.js';
import { parkedAngle, needleRadius, trackRadius, trackAngle, replayArmAngle } from '../src/replay-geometry.js';
import './capture.test.mjs';
import './press-hold.test.mjs';
import './spotify-browser.test.mjs';
import { testSharedAirmail } from './shared-airmail.test.mjs';
import { playbackDays, dayPosition, trackAtPosition } from '../src/playback-days.js';
import { centeredScroll, reorderPosition, reorderSpacing } from '../src/carousel-layout.js';
import { availableOnTurntable, parcelState } from '../src/parcel-state.js';
import { homeLayout } from '../src/home-layout.js';
import { airmailFrames, guidedAirmailFrames } from '../src/airmail-flight.js';
import { fitBootFrame, snapBootLp } from '../src/boot-layout.js';
import { tonedPhotoAverage } from '../src/photo-tone.js';
import { captureLensMorph, captureMotion } from '../src/capture-motion.js';

for (const [width, height] of [[280, 600], [390, 844], [432, 932], [600, 800]]) {
  const source = { x: -50, y: 300, size: 230 };
  const morph = captureLensMorph(source, width, height);
  const diameter = source.size * morph.scale;
  assert(Math.abs(source.x + morph.x + diameter / 2 - width / 2) < .001, 'a partly clipped LP label must morph to the horizontal center of the camera');
  assert(Math.abs(source.y + morph.y + diameter / 2 - height / 2) < .001, 'the camera lens must finish vertically centered');
  assert(diameter <= 350 + .001 && diameter <= width * .82 + .001, 'the transition must match the responsive camera lens size');
}
assert(captureMotion.collapse < captureMotion.review, 'the black disc must finish collapsing before the automatic review navigation');

assert.equal(tonedPhotoAverage(new Uint8ClampedArray([255, 255, 255, 0])), '#535d81', 'transparent photos need a valid fallback');
const blueTone = tonedPhotoAverage(new Uint8ClampedArray([60, 140, 220, 255]));
const blueRgb = blueTone.match(/\d+/g).map(Number);
assert(blueRgb[2] > blueRgb[1] && blueRgb[1] > blueRgb[0], 'tone-down must retain the photo hue');
assert(blueRgb.every(channel => channel >= 28 && channel <= 108), 'photo-derived backgrounds must remain dark enough for white controls');
assert.equal(tonedPhotoAverage(new Uint8ClampedArray([60, 140, 220, 255, 255, 0, 0, 0])), blueTone, 'invisible image pixels must not tint the background');
assert.equal(tonedPhotoAverage(new Uint8ClampedArray([255, 255, 255, 255])), 'rgb(80, 80, 80)', 'bright photos must be toned down instead of washing out white controls');

for (const [width, height] of [[280, 600], [320, 568], [390, 844], [432, 932], [800, 360]]) {
  const scale = fitBootFrame(width, height);
  assert(393 * scale <= width + .001 && 852 * scale <= height + .001, 'the complete launcher, widgets and dock must fit every phone frame');
  const orbit = guidedAirmailFrames(width, height).map(frame => frame.transform.match(/translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\)/).slice(1).map(Number));
  assert(orbit.every(([x, y]) => x >= 0 && x + width * .19 <= width && y >= 0 && y + width * .19 <= height), 'the highlighted plane must keep flying within reach');
  assert(Math.max(...orbit.map(([x]) => x)) - Math.min(...orbit.map(([x]) => x)) > width * .5, 'the first plane must travel, rather than only twinkle in place');
  assert(Math.abs(orbit[0][0] - orbit.at(-1)[0]) < .001 && Math.abs(orbit[0][1] - orbit.at(-1)[1]) < .001 && Math.abs(orbit.at(-1)[2] - orbit[0][2] - 360) < .001, 'the flight loop must join without a position or heading jump');
}
assert.deepEqual(snapBootLp(10, 240), { x: -40, y: 240 });
assert.deepEqual(snapBootLp(200, 340), { x: 353, y: 340 });
assert.equal(snapBootLp(20, -800).y, 54, 'dragging above the viewport must leave the floating LP reachable');
assert.equal(snapBootLp(350, 9000).y, 732, 'dragging below the viewport must leave the floating LP reachable');

for (const [width, height] of [[280, 600], [390, 844], [432, 932]]) {
  const home = homeLayout(16, height, 'home', -1, width);
  const stack = homeLayout(16, height, 'stack', -1, width);
  assert(home[0].top > height * .5 && stack[0].top < height * .1, 'scrolling must move the shelf from beneath the LP to the top');
  assert(stack.every((slot, index) => !index || slot.top > stack[index - 1].top + stack[index - 1].height + 12), 'a long user collection must retain distinct shelf slots');
  assert(stack.some(slot => slot.up) && stack.some(slot => !slot.up), 'shelf faces must change perspective around eye level');
  for (const selected of [1, 2, 8, 14]) {
    const cover = homeLayout(16, height, 'cover', selected, width);
    assert(Math.abs(cover[selected].top + cover[selected].height / 2 - height / 2) < .001, 'opened covers and captions must center in the viewport at every shelf position');
    const gap = cover[selected + 1].top - cover[selected].top - cover[selected].height;
    assert(gap >= 24 * width / 368 && gap <= 40 * width / 368, 'opening an album must keep the next shelf close to its caption');
    assert(cover[selected - 1].top + cover[selected - 1].height + 12 < cover[selected].top, 'the previous album must not overlap the opened cover');
  }
  for (const direction of [0, .9]) {
    const frames = airmailFrames(width, () => direction);
    const x = frame => Number(frame.transform.match(/translate\(([-\d.]+)px/)[1]);
    assert(direction === 0 ? x(frames[0]) < 0 && x(frames.at(-1)) > width : x(frames[0]) > width && x(frames.at(-1)) < 0, 'planes must cross the entire responsive viewport in either direction');
  }
}

const parcelAlbum = { id: 'parcel', name: 'Journey', city: 'Daejeon', country: 'Korea', start: '2026-11-12', entries: [], phase: 'pressed',
  delivery: { dispatchedOn: '2026-11-12', arrivesOn: '2026-11-15', destination: 'Seoul' } };
assert.deepEqual(parcelState(parcelAlbum, '2026-11-12'), { status: 'transit', days: 3 });
assert.deepEqual(parcelState(parcelAlbum, '2026-11-15'), { status: 'arrived', days: 0 });
assert.deepEqual(parcelState(parcelAlbum, '2026-11-16'), { status: 'arrived', days: 0 }, 'an unopened delivery must stay ready to unwrap after D-day');
assert.equal(availableOnTurntable(parcelAlbum, '2026-11-15'), false, 'the turntable must wait until the parcel is opened');
const openedParcel = { ...parcelAlbum, delivery: { ...parcelAlbum.delivery, unpackedAt: '2026-11-15T03:00:00.000Z' } };
assert.equal(availableOnTurntable(openedParcel, '2026-11-16'), true, 'persisted opened parcels must remain available on later visits');
assert.equal(availableOnTurntable({ entries: [] }, '2026-11-12'), true);

for (const width of [280, 390, 432]) {
  for (const count of [1, 3, 8]) {
    const slideWidth = width * .8;
    const contentWidth = width * .2 + count * slideWidth;
    for (let index = 0; index < count; index++) {
      const left = width * .1 + index * slideWidth;
      const target = centeredScroll(left, slideWidth, width);
      assert(Math.abs(left - target + slideWidth / 2 - width / 2) < .00001, 'every photo, including the final new-recording circle, must center in the viewport');
      assert(target <= contentWidth - width + .00001, 'end spacing must allow the final circle to reach the center');
    }
    const step = reorderSpacing(width, count);
    const cards = Array.from({ length: count }, (_, at) => reorderPosition(at, count, count - 1, 0, step, false));
    assert(Math.abs(cards[0].x + cards.at(-1).x) < .00001, 'the overlapping discs must stay centered as a group');
    assert(cards.at(-1).x - cards[0].x <= width * .65 + .00001, 'the row must fit on narrow screens');
    const before = reorderPosition(count - 1, count, count - 1, -step, step, true);
    const after = reorderPosition(0, count, count - 1, -step, step, true);
    assert.deepEqual(before, after, 'the held disc must not jump when neighboring discs swap slots');
  }
}

const dated = [{ day: '2026-11-10' }, { day: '2026-11-10' }, { day: '2026-11-12' }];
const days = playbackDays(dated, '2026-11-10');
assert.deepEqual(days.map(day => [day.number, day.indices]), [[1, [0, 1]], [3, [2]]], 'skipped calendar days must retain their travel day number');
assert.equal(dayPosition(days, 1, .5), .375);
assert.equal(dayPosition(days, 2, 1), 1);
assert.equal(trackAtPosition(days, 0), 0);
assert.equal(trackAtPosition(days, .3), 1);
assert.equal(trackAtPosition(days, .5), 2);
assert.equal(trackAtPosition(days, 1), 2);
assert.equal(trackAtPosition([], .5), -1);
assert.equal(dayPosition([], 0), 0);
assert.equal(dayPosition(playbackDays([dated[0]]), 0, .5), .5);
assert.deepEqual(playbackDays([dated[0], dated[2], dated[1]]).map(day => day.indices), [[0], [1], [2]], 'timeline must not silently reorder saved tracks');

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
      const loadingAngle = replayArmAngle({ playing: false, loading: true, index: i, count, layout });
      const playingAngle = replayArmAngle({ playing: true, loading: false, index: i, count, layout });
      assert.equal(loadingAngle, playingAngle, 'waiting for a selected track to start must not send the arm to its parked position');
      assert.notEqual(loadingAngle, parkedAngle);
      assert.equal(replayArmAngle({ drag: 7, playing: true, loading: false, index: i, count, layout }), 7, 'grabbing the arm must preserve the visible angle');
      assert.equal(replayArmAngle({ playing: false, loading: false, index: i, count, layout }), parkedAngle, 'an explicit stop must still park the arm');
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
  const { replayTracks, albumPlaybackTracks, trackArt, albumFile, importAlbum, resetArchive } = await server.ssrLoadModule('/src/archive.js');
  const { pendingMoments, reorderMoments } = await server.ssrLoadModule('/src/moment-groups.js');
  const { ParcelShelf } = await server.ssrLoadModule('/src/parcel-shelf.jsx');
  const inTransit = renderToStaticMarkup(React.createElement(ParcelShelf, { album: parcelAlbum, today: '2026-11-12', expanded: true }));
  assert(inTransit.includes('D-3') && inTransit.includes('IN TRANSIT') && inTransit.includes('Seoul'), 'the shelf must show the parcel, countdown and destination while shipping');
  assert(/class="parcel-box" disabled=""/.test(inTransit), 'parcels must not be opened before their arrival day');
  const delivered = renderToStaticMarkup(React.createElement(ParcelShelf, { album: parcelAlbum, today: '2026-11-15', expanded: true }));
  assert(delivered.includes('parcel-arrived') && delivered.includes('D-DAY') && !/class="parcel-box" disabled=""/.test(delivered), 'the arrived parcel must shake and allow unwrapping');
  const song = { id: '1234567890123456789012', name: 'Saved Song', artist: 'Artist', url: 'https://open.spotify.com/track/1234567890123456789012' };
  const p1 = { id: 'p1', kind: 'photo', src: '/one.jpg', day: '2026-11-11', time: '09:01', captureId: 'one', spotify: song };
  const a1 = { id: 'a1', kind: 'audio', fieldRecording: true, blob: new Blob(['audio'], { type: 'audio/webm' }), day: p1.day, time: p1.time, captureId: 'one', spotify: song, waveform: [.2, .5], durationMs: 1000 };
  const p2 = { id: 'p2', kind: 'photo', src: '/two.jpg', day: p1.day, time: '10:02', captureId: 'two' };
  const a2 = { ...a1, id: 'a2', time: p2.time, captureId: 'two', spotify: undefined };
  const standalone = { ...p2, id: 'p3', captureId: 'three', time: '11:02', spotify: song };
  const album = { id: 'qa', name: 'QA', color: '#b99086', entries: [a2, p2, { id: 'memo', kind: 'memo' }, p1, a1, standalone], grooves: [] };
  const reordered = reorderMoments(album, ['p3', 'p1', 'p2']);
  assert.deepEqual(pendingMoments(reordered).map(group => group.id), ['p3', 'p1', 'p2']);
  assert.deepEqual(replayTracks(reordered.entries).map(track => track.id), ['p3', 'a1', 'a2'], 'custom moment order must override original timestamps');
  assert.deepEqual(pendingMoments(reordered)[1].entries.map(entry => entry.id), ['p1', 'a1'], 'photo, recording and song must move as one moment');
  assert.deepEqual(new Set(reordered.entries.map(entry => entry.id)), new Set(album.entries.map(entry => entry.id)));
  const engraved = { ...album, grooves: [{ entryIds: ['p1', 'a1'] }] };
  assert.equal(reorderMoments(engraved, ['p1', 'p2']), engraved, 'already engraved moments must not be reordered');
  const { engravedPhotos, grooveRadius } = await server.ssrLoadModule('/src/draft-photo-pins.jsx');
  const pinnedAlbum = { ...album, grooves: [{ day: p1.day, entryIds: ['p2', 'a2', 'p1', 'a1', 'missing'] }] };
  const photoPins = engravedPhotos(pinnedAlbum);
  assert.deepEqual(photoPins.map(pin => pin.photo.id), ['p2', 'p1'], 'pins must follow the engraved photo order and exclude pending photos');
  for (const pin of photoPins) {
    assert(Math.abs(Math.hypot(pin.x - 50, pin.y - 50) - grooveRadius(pin.grooveIndex)) < .00001, 'each photo pin foot must land on its own engraved ring');
  }
  assert.equal(grooveRadius(0), 47, 'the first groove must start at the outside edge');
  assert(grooveRadius(0) - grooveRadius(1) > .45 && grooveRadius(0) - grooveRadius(1) < .9, 'early recordings need a visibly wider, restrained groove gap');
  assert.equal(grooveRadius(79), 22, 'a full LP must keep its innermost groove outside the label');
  for (let at = 1; at < 80; at++) assert(grooveRadius(at) < grooveRadius(at - 1), 'later grooves must fill inward');
  const filledPins = engravedPhotos({ ...pinnedAlbum, grooves: [...pinnedAlbum.grooves, { entryIds: [standalone.id] }] });
  assert.deepEqual(filledPins.slice(0, photoPins.length), photoPins, 'adding a groove must not move previous grooves or their photo pins');
  assert.deepEqual(engravedPhotos({ ...album, grooves: [] }), [], 'an empty LP must not show photo pins');
  assert.deepEqual(engravedPhotos({ ...album, grooves: [{ entryIds: ['a2', 'memo'] }] }), [], 'audio-only or memo grooves must not invent a photo');
  const { BlankRecord } = await server.ssrLoadModule('/src/trip-details.jsx');
  const emptyDraft = renderToStaticMarkup(React.createElement(BlankRecord, { album: { name: 'Journey', city: 'Daejeon', country: 'Korea', entries: [] }, record: () => {}, enter: () => {}, finish: () => {} }));
  assert(emptyDraft.includes('Daejeon, Korea') && emptyDraft.includes('0 MOMENTS') && emptyDraft.includes('+ Record a moment'), 'the empty LP must offer a visible recording button with location and count');
  assert(emptyDraft.match(/<button[^>]*class="draft-finish"[^>]*>/)[0].includes('disabled'), 'Finish must be disabled when there are no recorded moments');
  const countedDraft = renderToStaticMarkup(React.createElement(BlankRecord, { album, record: () => {}, finish: () => {} }));
  assert(!countedDraft.match(/<button[^>]*class="draft-finish"[^>]*>/)[0].includes('disabled'), 'Finish must become available when moments exist');
  const { JourneyWheel } = await server.ssrLoadModule('/src/journey-wheel.jsx');
  const emptyWheel = renderToStaticMarkup(React.createElement(JourneyWheel, { enter: () => {}, finish: () => {}, finishDisabled: true }));
  assert(emptyWheel.match(/<button[^>]*aria-label="Finish my journey"[^>]*>/)[0].includes('disabled'), 'the center wheel must not bypass the empty-album Finish restriction');
  assert(countedDraft.includes('3 MOMENTS'), 'photos and audio recorded together count as one moment, not two separate files');
  const pinnedDisc = renderToStaticMarkup(React.createElement(BlankRecord, { album: pinnedAlbum, grooveCount: 1, engraving: true }));
  assert(pinnedDisc.includes('src="/one.jpg"') && pinnedDisc.includes('src="/two.jpg"'));
  assert.equal((pinnedDisc.match(/class="draft-photo-pin new-photo-pin"/g) || []).length, 2, 'engraved photos must appear as pins when the groove is cut');
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
  assert(withSong.includes('moment-carousel') && withSong.includes('새로운 기록'), 'the last carousel slot must open a new recording');
  const allSummary = renderToStaticMarkup(React.createElement(TripMoment, {
    album, entries: [{ ...p1, place: 'Old location' }, a1, { ...p2, place: 'Current location' }, a2], note: '', day: p1.day,
  }));
  assert.equal((allSummary.match(/class="carousel-viewport"/g) || []).length, 1, 'photo scrolling must be contained in one viewport');
  assert.equal((allSummary.match(/class="carousel-slide"/g) || []).length, 3, 'both photo records and the final new-recording slot must slide together');
  assert(allSummary.indexOf('class="moment-photo-count"') < allSummary.indexOf('class="capture-note"'), 'the note must remain outside the moving photo rail');
  assert.equal((allSummary.match(/class="moment-location"/g) || []).length, 1, 'changing records must use a single location row');
  assert.equal((allSummary.match(/class="location-source"/g) || []).length, 1, 'location attribution must appear only once');
  assert(allSummary.includes('Current location') && !allSummary.includes('Old location'), 'only the selected record location may be shown');
  const { AlbumPlayer } = await server.ssrLoadModule('/src/album-player.jsx');
  const first = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a1 }));
  const second = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a2 }));
  assert(first.includes('/one.jpg') && second.includes('/two.jpg'), 'selected audio must change the center photo');
  assert(first.includes('--focus-arm-angle:-35deg'), 'paused arm must be parked');
  const spotifyView = renderToStaticMarkup(React.createElement(AlbumPlayer, { album, tracks: album.entries, track: a2, selectedId: 'a1:spotify' }));
  assert(spotifyView.includes('Saved Song') && spotifyView.includes('open.spotify.com/track/' + song.id) && !spotifyView.includes('<iframe'), 'song must use app controls without an embedded player');
  assert(spotifyView.includes('/one.jpg') && !spotifyView.includes('<audio'), 'Spotify selection must use its own photo and stop ambient audio');
  const { HomeTurntable } = await server.ssrLoadModule('/src/home-turntable.jsx');
  const emptyHome = renderToStaticMarkup(React.createElement(HomeTurntable, {}));
  assert(emptyHome.includes('빈 턴테이블') && !emptyHome.includes('turntable-label') && !emptyHome.includes('<audio'), 'hiding all demos must leave a valid empty turntable');
  const { FlyingAirmail } = await server.ssrLoadModule('/src/flying-airmail.jsx');
  const { welcomeDelivery } = await server.ssrLoadModule('/src/archive.js');
  const welcome = welcomeDelivery();
  const { HomeScene } = await server.ssrLoadModule('/src/home-scene.jsx');
  const homeScene = renderToStaticMarkup(React.createElement(HomeScene, { albums: [], loaded: true, delivery: welcome }));
  assert(homeScene.includes('Add New Album') && homeScene.includes('aria-label="설정"') && homeScene.includes('art/yuna-plane.png'));
  assert(!homeScene.includes('여행 지도') && !homeScene.includes('class="sleeve"'), 'the home screen must hide map navigation and dummy shelf albums');
  const { default: Boot } = await server.ssrLoadModule('/src/boot.jsx');
  const boot = renderToStaticMarkup(React.createElement(Boot));
  assert(boot.includes('Blue Vinyl 열기') && boot.includes('img/bv-icon.png'), 'entry must use the copied Yuna app icon and launcher');
  assert.equal(renderToStaticMarkup(React.createElement(FlyingAirmail, {})), '', 'no received LP must mean no plane');
  assert(renderToStaticMarkup(React.createElement(FlyingAirmail, { delivery: welcome })).includes('airmail-flight'));
  const { Inbox } = await server.ssrLoadModule('/src/inbox.jsx');
  const incomingView = renderToStaticMarkup(React.createElement(Inbox, { items: [welcome], index: 0 }));
  assert(incomingView.includes('Jeju, Korea') && incomingView.includes('Play now') && incomingView.includes('add to list') && incomingView.includes('discard'));
  const guidedView = renderToStaticMarkup(React.createElement(Inbox, { items: [welcome], index: 0, guided: true }));
  assert(guidedView.includes('Play now') && !guidedView.includes('add to list') && !guidedView.includes('discard') && !guidedView.includes('aria-label="닫기"'), 'first-time users must preview before saving or discarding');
  const guidedPlane = renderToStaticMarkup(React.createElement(FlyingAirmail, { delivery: welcome, guided: true }));
  assert(guidedPlane.includes('is-guided') && guidedPlane.includes('airmail-sparkles'), 'the first plane must remain discoverable until caught');
  assert(incomingView.includes('--letter-duration:2000ms') && incomingView.includes('letter-corner-right'));
  assert.equal((incomingView.match(/class="letter-corner /g) || []).length, 2, 'the white sheet must unfold only its two upper corners');
  assert(incomingView.includes('letter-paper-base') && incomingView.includes('letter-roof') && !incomingView.includes('letter-bottom-fold'), 'the same white envelope must remain throughout the opening');
  assert(incomingView.includes('aria-busy="true"'), 'actions must wait until the two-second opening finishes');
  assert(!incomingView.includes('근처') && !incomingView.includes('@'), 'the incoming view must not add sender or distance metadata');
  const { SharedTag } = await server.ssrLoadModule('/src/ui.jsx');
  assert(renderToStaticMarkup(React.createElement(SharedTag)).includes('SHARED'));
  const home = renderToStaticMarkup(React.createElement(HomeTurntable, { album: { ...album, art: { trackId: p1.id } } }));
  assert(home.includes('open.spotify.com/track/' + song.id) && home.includes('Saved Song') && !home.includes('<iframe'), 'home playback must select Spotify without an embedded player');
  assert(!home.includes('<audio'), 'home must never fall back to environmental recordings');
  assert(home.includes('class="vinyl ') && home.includes('<img src="/one.jpg"') && !home.includes('rotating'), 'paused home LP and its photo must remain still until playback starts');
  assert(home.includes('spin-ready') && first.includes('spin-ready'), 'home and replay LPs must retain their rotation timeline while paused');
  const { PullSleeve } = await server.ssrLoadModule('/src/ui.jsx');
  assert(!renderToStaticMarkup(React.createElement(PullSleeve, { album })).includes('spin-ready'), 'pulling the LP from its sleeve must remain independent of its playback rotation');
  const noSongHome = renderToStaticMarkup(React.createElement(HomeTurntable, { album: { ...album, entries: [p2, a2] } }));
  assert(noSongHome.includes('<audio') && !noSongHome.includes('<iframe') && noSongHome.includes('현장의 소리'), 'an album without Spotify must fall back to its saved field recording');
  const silentHome = renderToStaticMarkup(React.createElement(HomeTurntable, { album: { ...album, entries: [p2] } }));
  assert(!silentHome.includes('<audio') && !silentHome.includes('open.spotify.com'), 'a photo-only album must not invent audio');
  assert(first.includes('day-timeline') && first.includes('day-plane') && first.includes('Day 1'), 'replay must render a day timeline and paper airplane');
  const { MomentMap } = await server.ssrLoadModule('/src/moment-map.jsx');
  const map = renderToStaticMarkup(React.createElement(MomentMap, { album, tracks: album.entries }));
  assert.equal((map.match(/class="moment-pin"/g) || []).length, 3, 'field recordings and song-only moments must get pins');
  const { ScatteredPhotos } = await server.ssrLoadModule('/src/album-photos.jsx');
  const photos = renderToStaticMarkup(React.createElement(ScatteredPhotos, { entries: album.entries, currentPhoto: p1 }));
  assert(!photos.includes('/one.jpg') && photos.includes('/two.jpg'), 'zoom-out photos must exclude the current LP photo');
  assert.equal((photos.match(/class="scattered-photo"/g) || []).length, 2);
  const shared = { ...album, entries: [p1, a1].map(t => t.kind === 'photo' ? { ...t, src: undefined, blob: new Blob(['photo'], { type: 'image/jpeg' }) } : t) };
  const restored = await importAlbum(await albumFile(shared));
  const restoredAudio = restored.entries.find(t => t.kind === 'audio');
  assert.equal(restoredAudio.captureId, 'one');
  assert.equal(trackArt(restored, restoredAudio).captureId, 'one');
  assert.equal(restoredAudio.spotify.id, song.id);
  const { placeLabel } = await server.ssrLoadModule('/src/moment-location.jsx');
  assert.equal(placeLabel({ properties: { name: 'Louvre Museum', street: 'Rue de Rivoli' } }), 'Louvre Museum');
  assert.equal(placeLabel({ properties: { street: 'Rue de Rivoli', housenumber: '99' } }), 'Rue de Rivoli 99');
  assert.equal(placeLabel(undefined), '');
  let deletions = 0;
  globalThis.indexedDB = { deleteDatabase: name => {
    deletions++;
    assert.equal(name, 'blue-vinyl-archive', 'only this app database may be reset');
    const request = {};
    queueMicrotask(() => request.onsuccess());
    return request;
  } };
  assert.equal(deletions, 0);
  await resetArchive();
  assert.equal(deletions, 1);
  delete globalThis.indexedDB;
  await testSharedAirmail(await server.ssrLoadModule('/src/archive.js'));
} finally { await server.close(); }
console.log('PASS: recording snapshots, carousel group order, photo/song pairing, GPS labels, scoped database reset, tonearm geometry, archive round-trip');
