import { useEffect, useRef, useState } from 'react';
import { playingTrack, prepareSpotifyCapture } from './spotify-capture';

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '54cf66c4350b4a30a25b3baa9ead4244';
const tokenKey = 'blue-vinyl-spotify';
const loginKey = 'blue-vinyl-spotify-login';
const scopes = ['user-read-currently-playing', 'user-read-playback-state', 'user-modify-playback-state'];
const encode = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

function storedToken() {
  try { return JSON.parse(sessionStorage.getItem(tokenKey)); }
  catch { return null; }
}

async function exchange(body) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ client_id: clientId, ...body }),
  });
  if (!response.ok) throw new Error('Spotify 로그인을 다시 연결해 주세요.');
  return response.json();
}

export function useSpotify(enabled) {
  const [token, setToken] = useState(storedToken);
  const [track, setTrack] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [resumeAlbumId, setResumeAlbumId] = useState('');
  const handled = useRef(false);
  const refresh = useRef(null);
  const tokenRef = useRef(token);
  const commands = useRef(Promise.resolve());
  function serial(operation) {
    const next = commands.current.catch(() => {}).then(operation);
    commands.current = next.catch(() => {});
    return next;
  }

  function remember(value) {
    sessionStorage.setItem(tokenKey, JSON.stringify(value));
    tokenRef.current = value;
    setToken(value);
    return value;
  }

  function disconnect() {
    sessionStorage.removeItem(tokenKey);
    tokenRef.current = null;
    setToken(null);
    setTrack(null);
    setError('');
  }

  async function accessToken(force = false) {
    const before = tokenRef.current;
    if (!before) throw new Error('Spotify를 연결해 주세요.');
    if (!force && before.expires > Date.now() + 30000) return before.access;
    if (!refresh.current) {
      refresh.current = exchange({ grant_type: 'refresh_token', refresh_token: before.refresh })
        .then((value) => {
          if (tokenRef.current !== before) throw new Error('Spotify 연결이 해제됐어요.');
          return remember({ access: value.access_token, refresh: value.refresh_token || before.refresh, expires: Date.now() + value.expires_in * 1000, scope: value.scope || before.scope });
        })
        .finally(() => { refresh.current = null; });
    }
    return (await refresh.current).access;
  }

  async function request(path, options = {}) {
    const send = (access) => fetch('https://api.spotify.com/v1' + path, {
      ...options, signal: options.signal || AbortSignal.timeout(5000),
      headers: { Authorization: 'Bearer ' + access, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let response = await send(await accessToken());
    if (response.status === 401) response = await send(await accessToken(true));
    if (!response.ok) {
      const failure = new Error(response.status === 403 ? 'Spotify 재생 제어 권한과 Premium 계정을 확인해 주세요.' : response.status === 404 ? '휴대폰의 Spotify 앱에서 먼저 재생해 주세요.' : 'Spotify에 연결하지 못했어요.');
      failure.status = response.status;
      throw failure;
    }
    return response.status === 204 ? null : response.json();
  }

  function requireControl() {
    const granted = new Set((tokenRef.current?.scope || '').split(' '));
    if (!scopes.every((scope) => granted.has(scope))) throw new Error('설정에서 Spotify를 다시 연결해 주세요.');
  }

  function playSong(id) { return serial(async () => {
    requireControl();
    const state = await request('/me/player');
    if (!state?.device?.id || state.device.is_restricted) throw new Error('휴대폰의 Spotify 앱에서 먼저 재생해 주세요.');
    const sameSong = state.item?.id === id;
    if (sameSong && state.is_playing) return;
    return request('/me/player/play?device_id=' + encodeURIComponent(state.device.id), {
      method: 'PUT', body: sameSong ? undefined : { uris: ['spotify:track:' + id] },
    });
  }); }

  function pauseSong(id) { return serial(async () => {
    requireControl();
    const state = await request('/me/player');
    if (state?.is_playing && state.item?.id !== id) return false;
    if (state?.is_playing && state.item?.id === id && state.device?.id) {
      await request('/me/player/pause?device_id=' + encodeURIComponent(state.device.id), { method: 'PUT' });
    }
    return true;
  }); }

  async function prepareRecording(options) {
    if (!tokenRef.current) return { track: null, restore: async () => '' };
    const prepared = await serial(() => prepareSpotifyCapture(request, options));
    return { ...prepared, restore: () => serial(prepared.restore) };
  }

  async function captureTrack() {
    if (!tokenRef.current) return null;
    try {
      const request = (access) => fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: 'Bearer ' + access }, signal: AbortSignal.timeout(4000),
      });
      let response = await request(await accessToken());
      if (response.status === 401) response = await request(await accessToken(true));
      if (response.status === 204 || !response.ok || !tokenRef.current) return null;
      return playingTrack(await response.json());
    } catch { return null; }
  }

  async function connect(albumId) {
    setError('');
    if (!['http:', 'https:'].includes(location.protocol) || !crypto.subtle) {
      setError('웹 주소에서 Spotify를 연결해 주세요.');
      return;
    }
    setConnecting(true);
    try {
      const verifier = encode(crypto.getRandomValues(new Uint8Array(48)));
      const state = encode(crypto.getRandomValues(new Uint8Array(24)));
      const redirect = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || location.origin + location.pathname;
      const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      sessionStorage.setItem(loginKey, JSON.stringify({ verifier, state, redirect, albumId }));
      const url = new URL('https://accounts.spotify.com/authorize');
      url.search = new URLSearchParams({
        client_id: clientId, response_type: 'code', redirect_uri: redirect, state,
        code_challenge_method: 'S256', code_challenge: challenge,
        scope: scopes.join(' '),
      }).toString();
      location.assign(url.href);
    } catch { setError('Spotify 연결을 시작하지 못했어요.'); }
    finally { setConnecting(false); }
  }

  useEffect(() => {
    const url = new URL(location.href);
    if (handled.current || (!url.searchParams.has('code') && !url.searchParams.has('error'))) return;
    let login;
    try { login = JSON.parse(sessionStorage.getItem(loginKey)); } catch { return; }
    if (!login) return;
    handled.current = true;
    const code = url.searchParams.get('code');
    const matches = login.state === url.searchParams.get('state');
    const denied = url.searchParams.has('error');
    ['code', 'state', 'error'].forEach((key) => url.searchParams.delete(key));
    history.replaceState(null, '', url);
    sessionStorage.removeItem(loginKey);
    if (!matches || denied || !code) { setError('Spotify 연결이 취소됐어요.'); return; }
    setConnecting(true);
    exchange({ grant_type: 'authorization_code', code, redirect_uri: login.redirect, code_verifier: login.verifier })
      .then((value) => {
        remember({ access: value.access_token, refresh: value.refresh_token, expires: Date.now() + value.expires_in * 1000, scope: value.scope || scopes.join(' ') });
        setResumeAlbumId(login.albumId);
      })
      .catch((err) => setError(err.message))
      .finally(() => setConnecting(false));
  }, []);

  useEffect(() => {
    if (!enabled || !token) { setTrack(null); return; }
    let active = true;
    let timer;
    let inFlight = false;
    const controller = new AbortController();

    async function poll() {
      if (inFlight || !active || document.hidden) return;
      inFlight = true;
      let delay = 7000;
      try {
        const request = (access) => fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: 'Bearer ' + access }, signal: controller.signal,
        });
        let response = await request(await accessToken());
        if (response.status === 401) response = await request(await accessToken(true));
        if (!active) return;
        if (response.status === 429) { delay = Math.max(10000, Number(response.headers.get('Retry-After') || 30) * 1000); return; }
        if (response.status === 204) { setTrack(null); return; }
        if (!response.ok) throw new Error('Spotify 계정의 앱 접근 권한을 확인해 주세요.');
        const value = await response.json();
        if (!active) return;
        setTrack(playingTrack(value));
        setError('');
      } catch (err) {
        if (active && err.name !== 'AbortError') { setTrack(null); setError(err.message); }
      } finally {
        inFlight = false;
        if (active) timer = setTimeout(poll, delay);
      }
    }

    function wake() { clearTimeout(timer); if (!document.hidden) poll(); }
    poll();
    document.addEventListener('visibilitychange', wake);
    return () => { active = false; clearTimeout(timer); controller.abort(); document.removeEventListener('visibilitychange', wake); };
  }, [enabled, token]);

  const granted = new Set((token?.scope || '').split(' '));
  return { track, connected: Boolean(token), needsReconnect: Boolean(token) && !scopes.every((scope) => granted.has(scope)),
    connecting, error, connect, disconnect, resumeAlbumId, captureTrack, prepareRecording,
    getPlayback: () => request('/me/player'), playSong, pauseSong };
}
