import assert from 'node:assert/strict';
import { createBrowserPlayback } from '../src/spotify-browser.js';

const songId = '1234567890123456789012';
const otherId = 'abcdefghijklmnopqrstuv';
const state = (id = songId, paused = false, position = 5000) => ({
  paused, position, duration: 180000,
  track_window: { current_track: { id, name: 'Test song', artists: [{ name: 'Artist' }] } },
});

function mock(mode = 'ready') {
  const calls = [];
  const requests = [];
  const errors = [];
  let instance;
  let token = 'initial';
  class Player {
    constructor(options) { this.options = options; this.listeners = new Map(); this.state = null; instance = this; calls.push('create'); }
    addListener(name, listener) { this.listeners.set(name, listener); }
    emit(name, value) { if (name === 'player_state_changed') this.state = value; this.listeners.get(name)?.(value); }
    async connect() {
      calls.push('connect');
      if (mode === 'ready') this.emit('ready', { device_id: 'browser-device' });
      if (mode === 'premium') this.emit('account_error', { message: 'premium required' });
      return true;
    }
    activateElement() { calls.push('activate'); return Promise.resolve(); }
    async getCurrentState() { calls.push('getState'); return this.state; }
    async resume() { calls.push('resume'); this.emit('player_state_changed', { ...this.state, paused: false }); }
    async pause() { calls.push('pause'); if (this.state) this.emit('player_state_changed', { ...this.state, paused: true }); }
    disconnect() { calls.push('disconnect'); }
  }
  const client = createBrowserPlayback({
    getAccessToken: async () => token,
    request: async (path, options) => requests.push({ path, options }),
    onError: (message) => errors.push(message),
    loadSdk: async () => ({ Player }), readyTimeout: 10,
  });
  return { client, calls, requests, errors, get player() { return instance; }, token(value) { token = value; } };
}

{
  const test = mock();
  await Promise.all([test.client.connect(), test.client.connect()]);
  assert.equal(test.calls.filter(call => call === 'create').length, 1, 'all screens must share one local device');
  assert.equal(test.requests.length, 0, 'preparing a browser device must not start or transfer playback');
  test.calls.length = 0;
  test.client.activate();
  assert.equal(test.calls[0], 'activate', 'browser audio must activate synchronously before network awaits');
  await test.client.play(songId);
  assert.equal(test.requests[0].path, '/me/player/play?device_id=browser-device', 'playback must target the browser without requiring an active phone');
  assert.deepEqual(test.requests[0].options.body, { uris: ['spotify:track:' + songId] });
  const notifications = [];
  const unsubscribe = test.client.subscribe(value => notifications.push(value));
  test.player.emit('player_state_changed', state());
  assert.equal(notifications.at(-1).is_playing, true);
  assert.equal((await test.client.getPlayback()).progress_ms, 5000);
  test.player.emit('player_state_changed', state(songId, true, 0));
  assert.equal(notifications.at(-1).is_playing, false);
  assert.equal(test.requests.length, 1, 'ending a song must never start the next saved moment');
  test.player.emit('player_state_changed', state(otherId));
  assert(test.calls.includes('pause'), 'an unexpected Spotify queue continuation must be stopped');
  assert.equal(notifications.at(-1).is_playing, false);
  assert.equal(test.requests.length, 1);
  test.player.emit('player_state_changed', state(songId, true));
  await test.client.play(songId);
  assert(test.calls.includes('resume'), 'a paused song must resume at its existing position');
  assert.equal(test.requests.length, 1);
  assert.equal(await test.client.pause(otherId), false, 'stale controls must not pause a different song');
  assert.equal(await new Promise(resolve => test.player.options.getOAuthToken(resolve)), 'initial');
  test.token('refreshed');
  assert.equal(await new Promise(resolve => test.player.options.getOAuthToken(resolve)), 'refreshed', 'SDK token requests must use the current refreshed token');
  test.player.emit('autoplay_failed');
  assert(test.errors.at(-1).includes('한 번 더'));
  await test.client.play(songId);
  assert.equal(test.requests.length, 1, 'an autoplay failure must allow retry without reconnecting');
  unsubscribe();
  test.client.disconnect();
  test.client.disconnect();
  assert.equal(test.calls.filter(call => call === 'disconnect').length, 1);
  assert.equal(await test.client.getPlayback(), null);
  await assert.rejects(test.client.play(songId), /해제/);
}

{
  const test = mock('premium');
  await assert.rejects(test.client.connect(), /Premium/);
  assert.equal(test.requests.length, 0, 'an ineligible account must never issue a play request');
  test.client.disconnect();
}
{
  const test = mock('offline');
  await assert.rejects(test.client.connect(), /준비 중/);
  test.client.disconnect();
}
{
  let release;
  let constructed = false;
  const client = createBrowserPlayback({ getAccessToken: async () => '', request: async () => {},
    loadSdk: () => new Promise(resolve => { release = resolve; }),
  });
  const pending = client.connect();
  client.disconnect();
  release({ Player: class { constructor() { constructed = true; } } });
  await assert.rejects(pending, /해제/);
  assert.equal(constructed, false, 'logging out while loading the SDK must not create a late player');
}
console.log('PASS: browser Spotify device, gesture activation, local playback, SDK events, no automatic advance, token refresh, Premium errors and cleanup');
