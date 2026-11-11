import assert from 'node:assert/strict';
import { prepareSpotifyCapture } from '../src/spotify-capture.js';
import { openCaptureMicrophone } from '../src/capture-audio.js';

const id = '1234567890123456789012';
const original = () => ({ is_playing: true, item: { id, type: 'track', name: 'Before recording', artists: [{ name: 'Artist' }] },
  device: { id: 'phone', supports_volume: true, volume_percent: 90 } });

function client(initial = original()) {
  const state = structuredClone(initial);
  const calls = [];
  return { state, calls, request: async (path, options = {}) => {
    calls.push({ path, options });
    if (!options.method) return structuredClone(state);
    if (path.includes('/volume')) state.device.volume_percent = Number(new URL('https://test' + path).searchParams.get('volume_percent'));
    if (path.includes('/pause')) state.is_playing = false;
    if (path.includes('/play?')) state.is_playing = true;
    return null;
  } };
}

{
  const api = client();
  const active = { released: false, cancelled: false, before: prepareSpotifyCapture(api.request, { sleep: async () => {} }) };
  let opened = 0;
  await openCaptureMicrophone(active, { alive: () => true, getUserMedia: async () => {
    opened++;
    assert.equal(api.state.is_playing, false, 'Spotify must be paused before microphone acquisition');
    assert.equal(api.state.device.volume_percent, 0);
    return { getTracks: () => [] };
  } });
  assert.equal(opened, 1);
  api.state.item.name = 'Changed after microphone interruption';
  assert.equal(active.spotify.name, 'Before recording', 'capture metadata must remain the pre-recording snapshot');
  const prepared = await active.before;
  await Promise.all([prepared.restore(), prepared.restore()]);
  assert.equal(api.state.is_playing, true);
  assert.equal(api.state.device.volume_percent, 90);
  assert.equal(api.calls.filter(call => call.path.includes('/play?')).length, 1, 'resume must be idempotent');
  assert.deepEqual(api.calls.filter(call => call.path.includes('/volume')).map(call => Number(new URL('https://test' + call.path).searchParams.get('volume_percent'))), [60, 30, 0, 30, 60, 90]);
}
{
  const state = original(); state.device.supports_volume = false;
  const api = client(state);
  const capture = await prepareSpotifyCapture(api.request, { sleep: async () => {} });
  await capture.restore();
  assert(!api.calls.some(call => call.path.includes('/volume')), 'unsupported mobile volume must not be faked');
  assert(api.calls.some(call => call.path.includes('/pause')) && api.calls.some(call => call.path.includes('/play?')));
}
{
  const state = original(); state.is_playing = false;
  const api = client(state);
  const capture = await prepareSpotifyCapture(api.request);
  await capture.restore();
  assert.equal(capture.track, null);
  assert(!api.calls.some(call => call.options.method), 'a song paused before recording must not be resumed');
}
{
  const api = client(); let cancelled = false;
  const capture = await prepareSpotifyCapture(api.request, { cancelled: () => cancelled, sleep: async () => { cancelled = true; } });
  await capture.restore();
  assert(!api.calls.some(call => call.path.includes('/pause') || call.path.includes('/play?')), 'a released preparation must not pause/resume music');
  assert.equal(api.state.device.volume_percent, 90, 'cancelled fade must restore the original volume');
}
{
  const api = client();
  const capture = await prepareSpotifyCapture(api.request, { sleep: async () => {} });
  api.state.item.id = 'a-different-song'; api.state.is_playing = true; api.state.device.volume_percent = 75;
  await capture.restore();
  assert(!api.calls.some(call => call.path.includes('/play?')));
  assert.equal(api.state.device.volume_percent, 75, 'respect a song/volume manually changed during capture');
  assert.equal(capture.track.id, id);
}
{
  let resolvePreparation; let opened = 0;
  const active = { released: false, cancelled: false, before: new Promise(resolve => { resolvePreparation = resolve; }) };
  const opening = openCaptureMicrophone(active, { alive: () => true, getUserMedia: async () => { opened++; return {}; } });
  await Promise.resolve(); assert.equal(opened, 0);
  active.released = true;
  resolvePreparation({ track: { id }, restore: async () => '' });
  assert.equal(await opening, null);
  assert.equal(opened, 0, 'quick release must not open a delayed microphone');
  assert.equal(active.spotify.id, id);
}
{
  let resolveStream; let stopped = 0;
  const active = { released: false, before: Promise.resolve({ track: { id } }) };
  const opening = openCaptureMicrophone(active, { alive: () => true, getUserMedia: () => new Promise(resolve => { resolveStream = resolve; }) });
  await Promise.resolve(); await Promise.resolve();
  active.released = true;
  resolveStream({ getTracks: () => [{ stop: () => stopped++ }] });
  assert.equal(await opening, null);
  assert.equal(stopped, 1, 'late microphone permission must release the physical microphone');
}
console.log('PASS: pre-microphone Spotify snapshot, fades, unsupported volume, cancellation, resume ownership, late media cleanup');
