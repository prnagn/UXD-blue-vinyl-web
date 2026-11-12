let sdkLoading;

export function loadSpotifySdk() {
  if (window.Spotify?.Player) return Promise.resolve(window.Spotify);
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise((resolve, reject) => {
    let settled = false;
    const previous = window.onSpotifyWebPlaybackSDKReady;
    let script = document.getElementById('blue-vinyl-spotify-sdk');
    const timer = setTimeout(() => finish(new Error('Spotify 재생기를 불러오지 못했어요. 다시 시도해 주세요.')), 15000);
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.onSpotifyWebPlaybackSDKReady = previous;
      script?.removeEventListener('error', failed);
      if (error) { script?.remove(); reject(error); }
      else resolve(window.Spotify);
    }
    function failed() { finish(new Error('Spotify 재생기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); }
    window.onSpotifyWebPlaybackSDKReady = () => { try { previous?.(); } finally { finish(); } };
    if (!script) {
      script = document.createElement('script');
      script.id = 'blue-vinyl-spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.addEventListener('error', failed, { once: true });
      document.head.appendChild(script);
    } else script.addEventListener('error', failed, { once: true });
  }).catch((error) => { sdkLoading = undefined; throw error; });
  return sdkLoading;
}

// One browser device shared by all Blue Vinyl screens. Connecting never starts audio.
export function createBrowserPlayback({ getAccessToken, request, onError = () => {}, onReady = () => {}, loadSdk = loadSpotifySdk, readyTimeout = 15000 }) {
  let player;
  let initialization;
  let deviceId = '';
  let disposed = false;
  let failure = '';
  let wantedSong = '';
  let acceptedSong = false;
  let latestState = null;
  const subscribers = new Set();
  const waiting = new Set();

  function playback(state) {
    const item = state?.track_window?.current_track;
    if (!state || !item || !deviceId) return null;
    return {
      is_playing: !state.paused && (!wantedSong || item.id === wantedSong),
      progress_ms: state.position, item: { ...item, type: 'track', duration_ms: state.duration || item.duration_ms },
      device: { id: deviceId, name: 'Blue Vinyl', type: 'Computer', is_restricted: false },
    };
  }
  function publish(state) {
    latestState = state;
    for (const listener of subscribers) listener(playback(state));
  }
  function fail(message, fatal = false) {
    if (disposed) return;
    if (fatal) { failure = message; deviceId = ''; onReady(false); }
    publish(null);
    onError(message);
    for (const pending of waiting) pending.reject(new Error(message));
    waiting.clear();
  }
  async function connect() {
    if (disposed) throw new Error('Spotify 연결이 해제됐어요.');
    if (!initialization) initialization = (async () => {
      const sdk = await loadSdk();
      if (disposed) throw new Error('Spotify 연결이 해제됐어요.');
      player = new sdk.Player({ name: 'Blue Vinyl', volume: .75,
        getOAuthToken: (callback) => {
          Promise.resolve().then(getAccessToken).then((token) => { if (!disposed) callback(token); })
            .catch(() => fail('설정에서 Spotify를 다시 연결해 주세요.', true));
        },
      });
      player.addListener('ready', ({ device_id }) => {
        if (disposed) return;
        deviceId = device_id; failure = ''; onReady(true);
        for (const pending of waiting) pending.resolve(deviceId);
        waiting.clear();
      });
      player.addListener('not_ready', () => {
        if (disposed) return;
        deviceId = ''; onReady(false); publish(null);
      });
      player.addListener('player_state_changed', (state) => {
        if (disposed) return;
        const id = state?.track_window?.current_track?.id;
        if (wantedSong && id === wantedSong && !state.paused) acceptedSong = true;
        // Spotify's queue must never advance this app to a different saved moment.
        if (acceptedSong && wantedSong && id && id !== wantedSong && !state.paused) {
          player.pause().catch(() => fail('Spotify 재생을 멈추지 못했어요.'));
        }
        publish(state);
      });
      player.addListener('autoplay_failed', () => { publish(null); fail('브라우저의 재생 버튼을 한 번 더 눌러 주세요.'); });
      player.addListener('initialization_error', () => fail('이 브라우저는 Spotify 재생을 지원하지 않아요. 최신 Chrome 또는 Safari에서 열어 주세요.', true));
      player.addListener('authentication_error', () => fail('설정에서 Spotify를 다시 연결해 주세요.', true));
      player.addListener('account_error', () => fail('브라우저에서 Spotify 곡을 재생하려면 Premium 계정이 필요해요.', true));
      player.addListener('playback_error', () => fail('이 Spotify 곡을 재생하지 못했어요. 다시 시도해 주세요.'));
      if (await player.connect() === false) throw new Error('Spotify 브라우저 재생기에 연결하지 못했어요. 다시 연결해 주세요.');
    })();
    try { await initialization; }
    catch (error) { if (!disposed) onError(error.message); throw error; }
    if (disposed) throw new Error('Spotify 연결이 해제됐어요.');
    if (deviceId) return deviceId;
    if (failure) throw new Error(failure);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => pending.reject(new Error('Spotify 브라우저 재생기를 준비 중이에요. 잠시 후 재생을 눌러 주세요.')), readyTimeout);
      const pending = {
        resolve: (id) => { clearTimeout(timer); waiting.delete(pending); resolve(id); },
        reject: (error) => { clearTimeout(timer); waiting.delete(pending); reject(error); },
      };
      waiting.add(pending);
    });
  }
  function activate() {
    // Invoke directly in the pointer/click handler, before token or network awaits.
    try { return Promise.resolve(player?.activateElement()).catch(() => false); }
    catch { return Promise.resolve(false); }
  }
  async function getPlayback() {
    if (!player || !deviceId || disposed) return null;
    const state = await player.getCurrentState();
    return disposed ? null : playback(state);
  }
  async function play(id) {
    activate();
    const device = await connect();
    if (failure) throw new Error(failure);
    const state = await player.getCurrentState();
    if (disposed || deviceId !== device) throw new Error('Spotify 연결이 해제됐어요.');
    const same = state?.track_window?.current_track?.id === id;
    if (wantedSong !== id) acceptedSong = false;
    wantedSong = id;
    if (same && !state.paused) return;
    if (same && state.position > 0 && state.position < state.duration - 500) await player.resume();
    else await request('/me/player/play?device_id=' + encodeURIComponent(device), {
      method: 'PUT', body: { uris: ['spotify:track:' + id] },
    });
  }
  async function pause(id) {
    if (!player || !deviceId || disposed) return true;
    const state = await player.getCurrentState();
    if (disposed) return true;
    if (state?.track_window?.current_track?.id && state.track_window.current_track.id !== id) return false;
    await player.pause();
    if (state) publish({ ...state, paused: true });
    return true;
  }
  return {
    connect, activate, play, pause, getPlayback,
    subscribe(listener) { subscribers.add(listener); listener(playback(latestState)); return () => subscribers.delete(listener); },
    disconnect() {
      if (disposed) return;
      disposed = true; deviceId = ''; subscribers.clear();
      for (const pending of waiting) pending.reject(new Error('Spotify 연결이 해제됐어요.'));
      waiting.clear();
      player?.disconnect();
    },
  };
}
