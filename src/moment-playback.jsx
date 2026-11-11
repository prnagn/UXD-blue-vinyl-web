import React, { useEffect, useRef, useState } from 'react';
import { Icon, useMedia } from './ui';
import { startAmbient } from './ambient-audio';

function useAmbient(source, onPlaying) {
  const context = useRef(null);
  const current = useRef(null);
  const generation = useRef(0);
  const decoded = useRef(null);
  const request = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const notify = useRef(onPlaying);
  notify.current = onPlaying;

  function stop() {
    generation.current++;
    if (current.current) {
      current.current.onended = null;
      current.current.stop();
      current.current.disconnect();
      current.current.outputGain.disconnect();
      current.current = null;
    }
    setPlaying(false);
    setLoading(false);
    notify.current(false);
  }

  useEffect(() => {
    decoded.current = null;
    setError('');
    return () => {
      stop();
      request.current?.abort();
      decoded.current = null;
      context.current?.close().catch(() => {});
      context.current = null;
    };
  }, [source]);

  async function play(part) {
    stop();
    if (!source) return;
    const call = generation.current;
    setLoading(true);
    setError('');
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('unsupported');
      if (!context.current) context.current = new Context();
      const engine = context.current;
      // Resume synchronously from the button gesture, including on mobile Safari.
      const ready = engine.resume();
      if (!decoded.current) {
        const controller = new AbortController();
        request.current = controller;
        decoded.current = fetch(source, { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error('media');
          return response.arrayBuffer();
        }).then((bytes) => engine.decodeAudioData(bytes));
      }
      const [buffer] = await Promise.all([decoded.current, ready]);
      if (call !== generation.current || engine !== context.current) return;
      const node = startAmbient(engine, buffer, part, (finished) => {
        if (current.current !== finished) return;
        current.current = null;
        finished.disconnect();
        finished.outputGain.disconnect();
        setPlaying(false);
        notify.current(false);
      });
      current.current = node;
      setPlaying(true);
      notify.current(true);
    } catch (err) {
      if (call !== generation.current || err.name === 'AbortError') return;
      decoded.current = null;
      setError('현장음을 재생할 수 없어요.');
    } finally {
      if (call === generation.current) setLoading(false);
    }
  }
  return { play, stop, playing, loading, error };
}

export function MomentPlayback({ entry, onPlaying }) {
  const source = useMedia(entry?.kind === 'audio' ? entry : null);
  const ambient = useAmbient(source, onPlaying);
  const song = entry?.spotify && /^[a-zA-Z0-9]{22}$/.test(entry.spotify.id) ? entry.spotify : null;
  const segments = source ? (entry.fieldRecording ? [
    { id: 'intro', label: '현장음 앞부분' },
    ...(song ? [{ id: 'spotify', label: song.name }] : []),
    { id: 'outro', label: '현장음 뒷부분' },
  ] : [{ id: 'full', label: entry.name }]) : song ? [{ id: 'spotify', label: song.name }] : [];
  const [selected, setSelected] = useState('');
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const index = Math.max(0, segments.findIndex((segment) => segment.id === selected));
  const segment = segments[index];

  function choose(next) {
    ambient.stop();
    setSpotifyOpen(false); // Removing the widget stops Spotify before ambient playback.
    setSelected(next.id);
    if (next.id === 'spotify') setSpotifyOpen(true);
    else ambient.play(next.id);
  }

  if (!segment) return null;
  return <section className="moment-playback" aria-label="순간 트랙 재생">
    <div className="moment-segment-tabs" role="group" aria-label="회고 트랙">
      {segments.map((item, i) => <button key={item.id} aria-pressed={i === index} onClick={() => choose(item)}>
        <small>{i + 1}</small><span>{item.label}</span>
      </button>)}
    </div>
    <div className="moment-transport">
      <button className="icon-button" aria-label="이전 트랙" disabled={index === 0} onClick={() => choose(segments[index - 1])}><Icon name="skip-back" /></button>
      <button className="moment-segment-play" aria-label={segment.id === 'spotify' ? 'Spotify 플레이어 열기' : ambient.playing ? '현장음 정지' : segment.label + ' 재생'}
        disabled={ambient.loading} onClick={() => ambient.playing ? ambient.stop() : choose(segment)}>
        <Icon name={ambient.playing ? 'pause' : 'play'} size={17} /><span>{ambient.loading ? '불러오는 중' : segment.id === 'spotify' ? 'Spotify' : segment.label}</span>
      </button>
      <button className="icon-button" aria-label="다음 트랙" disabled={index >= segments.length - 1} onClick={() => choose(segments[index + 1])}><Icon name="skip-next" /></button>
    </div>
    <p className="moment-segment-count" aria-live="polite">{index + 1} / {segments.length}</p>
    {segment.id === 'spotify' && spotifyOpen && <div className="moment-spotify">
      <iframe key={song.id} title={'Spotify · ' + song.name} src={'https://open.spotify.com/embed/track/' + song.id + '?theme=0'}
        width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      <a href={'https://open.spotify.com/track/' + song.id} target="_blank" rel="noreferrer">Spotify에서 열기</a>
    </div>}
    {ambient.error && <p className="error" role="status">{ambient.error}</p>}
  </section>;
}
