import React, { useContext, useEffect, useRef, useState } from 'react';
import { SpotifyPlaybackContext } from './spotify-context';

// Custom controls share one Spotify Web Playback SDK device in this browser.
export function SpotifyPlayer({ song, onPlaying, controllerRef, onReady, onProgress }) {
  const service = useContext(SpotifyPlaybackContext);
  const current = useRef({ service, onPlaying, onReady, onProgress });
  current.current = { service, onPlaying, onReady, onProgress };
  const [error, setError] = useState('');
  useEffect(() => {
    if (!song || !/^[a-zA-Z0-9]{22}$/.test(song.id || '')) return;
    let active = true;
    let timer;
    let checking = false;
    function report(state) {
      if (active) current.current.onPlaying?.(Boolean(state?.is_playing && state.item?.id === song.id));
      if (active && state?.item?.id === song.id && state.item.duration_ms > 0) {
        current.current.onProgress?.(Math.max(0, Math.min(1, state.progress_ms / state.item.duration_ms)));
      }
    }
    async function refresh() {
      if (!active || checking || document.hidden) return;
      if (!current.current.service?.connected || current.current.service.needsReconnect) { report(null); return; }
      checking = true;
      try { report(await current.current.service.getPlayback()); }
      catch { report(null); }
      finally { checking = false; }
    }
    async function control(operation, activate = false) {
      if (activate) current.current.service?.activatePlayback?.();
      try {
        if (!current.current.service) throw new Error('설정에서 Spotify를 연결해 주세요.');
        if (active) setError('');
        const result = await operation(current.current.service);
        await refresh();
        return result !== false;
      } catch (failure) {
        if (active) { setError(failure.message); report(null); }
        return false;
      }
    }
    const controller = {
      resume: () => control((client) => client.playSong(song.id), true),
      pause: () => control((client) => client.pauseSong(song.id)),
      togglePlay: () => control(async (client) => {
        const state = await client.getPlayback();
        if (state?.is_playing && state.item?.id === song.id) await client.pauseSong(song.id);
        else await client.playSong(song.id);
      }, true),
    };
    if (controllerRef) controllerRef.current = controller;
    const unsubscribe = current.current.service?.subscribePlayback?.(report);
    current.current.onReady?.(controller);
    function poll() { refresh(); timer = setTimeout(poll, 2000); }
    poll();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe?.();
      document.removeEventListener('visibilitychange', refresh);
      if (controllerRef?.current === controller) controllerRef.current = null;
      current.current.onPlaying?.(false);
    };
  }, [song?.id, service?.connected, service?.needsReconnect, service?.browserReady, controllerRef]);
  if (!song || !/^[a-zA-Z0-9]{22}$/.test(song.id || '')) return null;
  return <div className="spotify-source">
    <a href={'https://open.spotify.com/track/' + song.id} target="_blank" rel="noreferrer">Spotify에서 열기</a>
    {service && (!service.connected || service.needsReconnect) && <button onClick={() => service.openSettings?.()}>
      {service.needsReconnect ? 'Spotify 다시 연결' : 'Spotify 연결'}
    </button>}
    {(error || service?.playbackError) && <p className="error" role="status">{error || service.playbackError}</p>}
  </div>;
}
