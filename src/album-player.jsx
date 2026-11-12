import React, { useEffect, useRef, useState } from 'react';
import { MomentMap } from './moment-map';
import { albumPlaybackTracks, trackArt } from './archive';
import { SpotifyPlayer } from './spotify-player';
import { ReplayArm } from './replay-arm';
import { trackRadius } from './replay-geometry';
import { ScatteredPhotos } from './album-photos';
import { albumTitle, Icon, Top, useMedia, Vinyl } from './ui';

export function AlbumPlayer({ album, tracks: allTracks, track: selectedTrack, selectedId, onTrack, back, send, autoStart, save, busy }) {
  const tracks = albumPlaybackTracks(allTracks);
  const track = tracks.find((entry) => entry.id === (selectedId || selectedTrack?.id)) || tracks[0];
  const [playing, setPlaying] = useState(false);
  const [reveal, setReveal] = useState(track?.kind === 'spotify');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState('record');
  const player = useRef(null);
  const spotifyController = useRef(null);
  const spotifyIntent = useRef('');
  const activeTrack = useRef(track?.id);
  activeTrack.current = track?.id;
  const wantsPlayback = useRef(Boolean(autoStart));
  const stage = useRef(null);
  const startDistance = useRef(0);
  const zoomTimer = useRef(null);
  const index = tracks.indexOf(track);
  const source = useMedia(track);
  const currentPhoto = trackArt(album, track);
  const art = useMedia(currentPhoto);
  const isMedia = track?.kind === 'audio' || track?.kind === 'video';
  const isSpotify = track?.kind === 'spotify';
  useEffect(() => () => clearTimeout(zoomTimer.current), []);

  useEffect(() => {
    const media = player.current;
    setPlaying(false);
    setError('');
    if (wantsPlayback.current && isMedia && source) start(media);
    return () => media?.pause();
  }, [isMedia, source, track?.id]);

  async function start(media) {
    if (!media) return;
    try { await media.play(); }
    catch (err) {
      if (media !== player.current || !wantsPlayback.current || err.name === 'AbortError') return;
      wantsPlayback.current = false;
      setPlaying(false);
      setError('이 트랙을 재생할 수 없어요.');
    }
  }

  function stop() {
    wantsPlayback.current = false;
    spotifyIntent.current = '';
    player.current?.pause();
    spotifyController.current?.pause();
    setPlaying(false);
  }

  function select(entry, autoplay = false) {
    if (!entry) return;
    stop();
    wantsPlayback.current = autoplay && entry.kind !== 'spotify';
    spotifyIntent.current = autoplay && entry.kind === 'spotify' ? entry.id : '';
    setReveal(entry.kind === 'spotify');
    if (entry.id === track?.id && autoplay) {
      if (entry.kind === 'spotify') spotifyController.current?.resume();
      else start(player.current);
    }
    else onTrack(entry);
  }

  async function play() {
    if (isSpotify) {
      setReveal(true);
      if (spotifyController.current) spotifyController.current.togglePlay();
      else spotifyIntent.current = track.id;
      return;
    }
    if (track?.kind !== 'audio') setReveal(true);
    const media = player.current;
    if (!media) return;
    if (wantsPlayback.current) stop();
    else { wantsPlayback.current = true; setError(''); start(media); }
  }

  function move(direction) {
    select(tracks[index + direction], playing);
  }

  function openMoments() {
    if (zoomTimer.current !== null) return;
    stop();
    setReveal(false);
    setZoom('transition');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    zoomTimer.current = setTimeout(() => {
      zoomTimer.current = null;
      setZoom('moments');
    }, reduceMotion ? 0 : 290);
  }

  function pinchDistance(touches) {
    return touches.length === 2
      ? Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
      : 0;
  }

  const events = {
    ref: player,
    src: source,
    onPlay: (event) => { if (wantsPlayback.current) setPlaying(true); else event.currentTarget.pause(); },
    onPause: () => setPlaying(false),
    onEnded: stop,
    onError: () => { stop(); setError('이 트랙을 열 수 없어요.'); },
  };
  const showVideo = track?.kind === 'video' && (reveal || playing);

  if (zoom === 'moments') return <MomentMap album={album} tracks={allTracks} back={() => { setZoom('record'); setReveal(isSpotify); }} />;

  return <div className={'album-focus' + (zoom === 'transition' ? ' focus-zooming' : '') + (zoom === 'spread' ? ' focus-spread' : '')}>
    <Top title={autoStart ? 'RECEIVED RECORD' : 'BLUE VINYL'} back={back} action={send} actionIcon="plane" actionLabel="여행지로 LP 보내기" />
    <div className="focus-stage zoom-gesture" ref={stage}
      onTouchStart={(event) => { startDistance.current = pinchDistance(event.touches); }}
      onTouchMove={(event) => {
        const distance = pinchDistance(event.touches);
        if (startDistance.current && distance > startDistance.current * 1.22) {
          startDistance.current = 0;
          if (zoom === 'spread') setZoom('record');
          else openMoments();
        } else if (startDistance.current && distance && distance < startDistance.current * .8) {
          startDistance.current = 0;
          setZoom('spread');
        }
      }}
      onTouchEnd={() => { startDistance.current = 0; }}
      onTouchCancel={() => { startDistance.current = 0; }}>
      {zoom === 'spread' && <ScatteredPhotos entries={album.entries} currentPhoto={currentPhoto} />}
      <button className="focus-record" onClick={play} disabled={!track} aria-label={isMedia ? (playing ? '일시정지' : '트랙 재생') : '트랙 열기'}>
        <Vinyl image={art} color={album.color} playing={playing} />
        <svg className="focus-rings" viewBox="0 0 100 100" aria-hidden="true">
          {tracks.map((entry, i) => <circle key={entry.id} cx="50" cy="50" r={trackRadius(i, tracks.length, { radius: 50 })}
            fill="none" stroke={entry.id === track?.id && playing ? '#f1dfae' : '#c4c2bd'} strokeWidth=".12" opacity={entry.id === track?.id && playing ? '.45' : '.16'} />)}
        </svg>
      </button>
      <ReplayArm playing={playing} tracks={tracks} track={track} choose={select} toggle={play} stop={stop} stage={stage} view={zoom} />
      <div className="focus-view-controls">
        <button className="focus-zoom" onClick={() => setZoom(zoom === 'spread' ? 'record' : 'spread')} disabled={zoom === 'transition'} aria-pressed={zoom === 'spread'}>
          <Icon name={zoom === 'spread' ? 'zoom' : 'zoom-out'} size={16} />{zoom === 'spread' ? 'LP 보기' : 'LP 축소'}
        </button>
        <button className="focus-zoom" onClick={openMoments} disabled={zoom === 'transition'}>
          <Icon name="zoom" size={16} /> LP 확대
        </button>
      </div>
    </div>
    <div className="focus-bottom">
      <h1>{albumTitle(album)}</h1>
      {track && <div className="focus-track">
        <button className="icon-button" aria-label="이전 트랙" disabled={index <= 0} onClick={() => move(-1)}><Icon name="back" size={16} /></button>
        <button className="focus-track-name" onClick={play} aria-label={isSpotify ? track.name + (playing ? ' · 일시정지' : ' · Spotify 재생') : undefined}><Icon name={playing ? 'pause' : isMedia || isSpotify ? 'play' : 'list'} size={15} /><span>{track.name}</span></button>
        <button className="icon-button" aria-label="다음 트랙" disabled={index >= tracks.length - 1} onClick={() => move(1)}><Icon name="next" size={16} /></button>
      </div>}
      {track && <div className="focus-progress" aria-label={String(index + 1) + ' / ' + tracks.length + ' 트랙'}>
        {tracks.length <= 12 ? tracks.map((entry, i) => <button type="button" key={entry.id} className={i === index ? 'active' : ''} aria-label={(i + 1) + '번 트랙'} aria-current={i === index ? 'true' : undefined}
          onClick={() => select(entry, playing)} />) : <span>{index + 1} / {tracks.length}</span>}
      </div>}
      {isSpotify && reveal && <div className="focus-spotify" aria-label="기록한 Spotify 곡">
        <SpotifyPlayer key={track.id} song={track.spotify} controllerRef={spotifyController}
          onPlaying={(value) => { if (activeTrack.current === track.id) setPlaying(value); }}
          onReady={(controller) => {
            if (activeTrack.current === track.id && spotifyIntent.current === track.id) {
              spotifyIntent.current = '';
              controller.resume();
            }
          }} />
      </div>}
      {!track && <p className="muted">아직 트랙이 없어요.</p>}
      {save && <button className="focus-save" disabled={busy} onClick={save}>내 선반에 저장</button>}
      {error && <p className="error" role="status">{error}</p>}
    </div>
    {track?.kind === 'audio' && source && <audio key={track.id} {...events} preload="auto" />}
    {track?.kind === 'video' && source && <div className="focus-media" hidden={!showVideo}>
      <button className="icon-button" aria-label="트랙 닫기" onClick={() => { player.current?.pause(); setReveal(false); }}><Icon name="close" /></button>
      <video key={track.id} {...events} controls playsInline preload="metadata" />
    </div>}
    {reveal && !isMedia && !isSpotify && <section className="focus-media" aria-label="트랙 내용">
      <header><h2>{track.name}</h2><button className="icon-button" aria-label="트랙 닫기" onClick={() => setReveal(false)}><Icon name="close" /></button></header>
      {track.kind === 'photo' && source && <img className="media-photo" src={source} alt={track.name} />}
      {track.kind === 'memo' && <blockquote className="memo-view">{track.note}</blockquote>}
    </section>}
  </div>;
}
