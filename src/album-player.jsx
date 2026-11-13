import React, { useContext, useEffect, useRef, useState } from 'react';
import { MomentMap } from './moment-map';
import { albumArt, albumPlaybackTracks, trackArt } from './archive';
import { SpotifyPlayer } from './spotify-player';
import { SpotifyPlaybackContext } from './spotify-context';
import { ReplayArm } from './replay-arm';
import { trackRadius } from './replay-geometry';
import { ScatteredPhotos } from './album-photos';
import { playbackDays } from './playback-days';
import { DayTimeline } from './day-timeline';
import { usePhotoTone } from './photo-tone';
import { albumTitle, Icon, Top, useMedia, Vinyl } from './ui';

export function AlbumPlayer({ album, tracks: allTracks, track: selectedTrack, selectedId, onTrack, back, send, autoStart, save, busy }) {
  const spotifyService = useContext(SpotifyPlaybackContext);
  const tracks = albumPlaybackTracks(allTracks);
  const track = tracks.find((entry) => entry.id === (selectedId || selectedTrack?.id)) || tracks[0];
  const [playing, setPlaying] = useState(false);
  const [entering, setEntering] = useState(true);
  const [loadingId, setLoadingId] = useState(autoStart ? track?.id || '' : '');
  const [reveal, setReveal] = useState(track?.kind === 'spotify');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState('record');
  const [showList, setShowList] = useState(false);
  const [position, setPosition] = useState({ id: '', fraction: 0 });
  const player = useRef(null);
  const spotifyController = useRef(null);
  const pausePending = useRef(Promise.resolve());
  const playbackEpoch = useRef(0);
  const spotifyIntent = useRef(autoStart && track?.kind === 'spotify' ? track.id : '');
  const activeTrack = useRef(track?.id);
  activeTrack.current = track?.id;
  const wantsPlayback = useRef(Boolean(autoStart));
  const stage = useRef(null);
  const startDistance = useRef(0);
  const zoomTimer = useRef(null);
  const index = tracks.indexOf(track);
  const source = useMedia(track);
  const currentPhoto = trackArt(album, track) || (!track ? albumArt(album) : undefined);
  const art = useMedia(currentPhoto);
  const photoTone = usePhotoTone(currentPhoto, art);
  const isMedia = track?.kind === 'audio' || track?.kind === 'video';
  const isSpotify = track?.kind === 'spotify';
  const days = playbackDays(tracks, album.start);
  const day = days.find((entry) => entry.indices.includes(index));
  const progress = position.id === track?.id ? position.fraction : 0;
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 1400);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => () => {
    playbackEpoch.current++;
    clearTimeout(zoomTimer.current);
    player.current?.pause();
    spotifyController.current?.pause();
  }, []);

  useEffect(() => {
    const media = player.current;
    setPlaying(false);
    setError('');
    if (wantsPlayback.current && isMedia && source) start(media);
    return () => media?.pause();
  }, [isMedia, source, track?.id]);

  async function start(media) {
    if (!media) return;
    const epoch = playbackEpoch.current;
    try {
      await pausePending.current;
      if (epoch !== playbackEpoch.current || media !== player.current || !wantsPlayback.current) return;
      await media.play();
    }
    catch (err) {
      if (media !== player.current || !wantsPlayback.current || err.name === 'AbortError') return;
      wantsPlayback.current = false;
      setPlaying(false);
      setLoadingId('');
      setError('이 트랙을 재생할 수 없어요.');
    }
  }

  function stop() {
    playbackEpoch.current++;
    wantsPlayback.current = false;
    spotifyIntent.current = '';
    player.current?.pause();
    const controller = spotifyController.current;
    if (controller) pausePending.current = pausePending.current.then(() => controller.pause()).catch(() => false);
    setPlaying(false);
    setLoadingId('');
  }

  async function resumeSpotify(controller, id) {
    const epoch = playbackEpoch.current;
    await pausePending.current;
    if (epoch !== playbackEpoch.current || activeTrack.current !== id) return;
    const success = await controller.resume();
    if (epoch === playbackEpoch.current && success === false && activeTrack.current === id) setLoadingId('');
  }

  function select(entry, autoplay = false) {
    if (!entry) return;
    if (autoplay && entry.kind === 'spotify') spotifyService?.activatePlayback?.();
    stop();
    setLoadingId(autoplay ? entry.id : '');
    wantsPlayback.current = autoplay && entry.kind !== 'spotify';
    spotifyIntent.current = autoplay && entry.kind === 'spotify' ? entry.id : '';
    setReveal(entry.kind === 'spotify');
    if (entry.id === track?.id && autoplay) {
      if (entry.kind === 'spotify' && spotifyController.current) resumeSpotify(spotifyController.current, entry.id);
      else start(player.current);
    }
    else onTrack(entry);
  }

  async function play() {
    if (isSpotify) {
      spotifyService?.activatePlayback?.();
      setReveal(true);
      if (playing || loadingId === track.id) { stop(); return; }
      setLoadingId(track.id);
      if (spotifyController.current) resumeSpotify(spotifyController.current, track.id);
      else spotifyIntent.current = track.id;
      return;
    }
    if (track?.kind !== 'audio') setReveal(true);
    const media = player.current;
    if (!media) return;
    if (wantsPlayback.current) stop();
    else { wantsPlayback.current = true; setLoadingId(track.id); setError(''); start(media); }
  }

  function move(direction) {
    select(tracks[index + direction], playing);
  }

  function openMoments() {
    if (zoomTimer.current !== null) return;
    stop();
    setReveal(false);
    setZoom('transition');
    zoomTimer.current = setTimeout(() => {
      zoomTimer.current = null;
      setZoom('moments');
    }, 650);
  }

  function closeMoments() {
    if (zoomTimer.current !== null) return;
    setZoom('returning');
    zoomTimer.current = setTimeout(() => {
      zoomTimer.current = null;
      setZoom('record');
      setReveal(isSpotify);
    }, 650);
  }

  function pinchDistance(touches) {
    return touches.length === 2
      ? Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
      : 0;
  }

  const events = {
    ref: player,
    src: source,
    onPlay: (event) => {
      if (event.currentTarget !== player.current) return;
      if (wantsPlayback.current) { setPlaying(true); setLoadingId(''); }
      else event.currentTarget.pause();
    },
    onPause: (event) => { if (event.currentTarget === player.current) setPlaying(false); },
    onTimeUpdate: (event) => {
      const media = event.currentTarget;
      setPosition({ id: track.id, fraction: media.duration > 0 ? media.currentTime / media.duration : 0 });
    },
    onEnded: (event) => { if (event.currentTarget === player.current) { stop(); setPosition({ id: track.id, fraction: 1 }); } },
    onError: (event) => { if (event.currentTarget === player.current) { stop(); setError('이 트랙을 열 수 없어요.'); } },
  };
  const showVideo = track?.kind === 'video' && (reveal || playing);

  const momentLayer = ['transition', 'moments', 'returning'].includes(zoom);
  const zoomingIn = zoom === 'transition' || zoom === 'moments';

  return <div className={'album-replay-scene' + (entering ? ' replay-entering' : '')} style={{ '--replay-bg': photoTone }} aria-busy={entering}
    onAnimationEnd={event => { if (event.animationName === 'replay-arm-enter') setEntering(false); }}>
    <div className={'album-focus' + (zoomingIn ? ' focus-zooming' : '') + (zoom === 'spread' ? ' focus-spread' : '')}
    inert={momentLayer} aria-hidden={momentLayer}>
    <Top title={autoStart ? 'RECEIVED RECORD' : 'BLUE VINYL'} back={back} action={send} actionIcon="plane" actionLabel="여행지로 LP 보내기" />
    <div className="focus-stage zoom-gesture" ref={stage} inert={entering}
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
        <Vinyl image={art} color={album.color} playing={playing} rotatable />
        <svg className="focus-rings" viewBox="0 0 100 100" aria-hidden="true">
          {tracks.map((entry, i) => <circle key={entry.id} cx="50" cy="50" r={trackRadius(i, tracks.length, { radius: 50 })}
            fill="none" stroke={entry.id === track?.id && playing ? '#f1dfae' : '#c4c2bd'} strokeWidth=".12" opacity={entry.id === track?.id && playing ? '.45' : '.16'} />)}
        </svg>
      </button>
      <ReplayArm playing={playing} loading={loadingId === track?.id} tracks={tracks} track={track} choose={select} toggle={play} stop={stop} stage={stage} view={zoom} />
      <div className="focus-view-controls">
        <button className="focus-zoom" onClick={() => setZoom(zoom === 'spread' ? 'record' : 'spread')} disabled={zoom === 'transition'} aria-pressed={zoom === 'spread'}>
          <Icon name={zoom === 'spread' ? 'zoom' : 'zoom-out'} size={16} />{zoom === 'spread' ? 'LP 보기' : 'LP 축소'}
        </button>
        <button className="focus-zoom" onClick={openMoments} disabled={zoom === 'transition'}>
          <Icon name="zoom" size={16} /> LP 확대
        </button>
      </div>
    </div>
    <div className="focus-bottom" inert={entering}>
      <div className="focus-day-meta">
        <h1>{[album.city, album.country].filter(Boolean).join(', ') || albumTitle(album)}</h1>
        {day?.date && <span>{day.date.replaceAll('-', '.')}</span>}
        {day && <span>Day {day.number}</span>}
      </div>
      {track && <>
        <DayTimeline days={days} tracks={tracks} index={index} progress={progress} select={(entry) => select(entry, playing)} />
        <div className="day-player-controls">
          <button className="icon-button" aria-label="이전 트랙" disabled={index <= 0} onClick={() => move(-1)}><Icon name="skip-back" size={24} /></button>
          <button className="icon-button day-play" onClick={play} aria-label={playing ? '일시정지' : '재생'} aria-pressed={playing}><Icon name={playing ? 'pause' : 'play'} size={30} /></button>
          <button className="icon-button" aria-label="다음 트랙" disabled={index >= tracks.length - 1} onClick={() => move(1)}><Icon name="skip-next" size={24} /></button>
          <button className="icon-button" aria-label="날짜별 트랙 목록" aria-expanded={showList} aria-controls="day-track-list" onClick={() => setShowList((value) => !value)}><Icon name="list" size={24} /></button>
        </div>
        <p className="day-song-name">{track.name}</p>
        {showList && <section id="day-track-list" className="day-track-list" aria-label="날짜별 트랙 목록">
          {days.map((entry, i) => <div key={i}>
            <button className="day-track-heading" onClick={() => select(tracks[entry.indices[0]], playing)}>Day {entry.number}<span>{entry.date.replaceAll('-', '.')}</span></button>
            {entry.indices.map((at) => <button key={tracks[at].id} className="day-track-item" aria-current={at === index ? 'true' : undefined} onClick={() => select(tracks[at], playing)}>
              <Icon name={tracks[at].kind === 'spotify' ? 'audio' : 'mic'} size={15} /><span>{tracks[at].name}</span>
              {at === index && <Icon name={playing ? 'pause' : 'play'} size={14} />}
            </button>)}
          </div>)}
        </section>}
      </>}
      {isSpotify && reveal && <div className="focus-spotify" aria-label="기록한 Spotify 곡">
        <SpotifyPlayer key={track.id} song={track.spotify} controllerRef={spotifyController}
          onProgress={(fraction) => { if (activeTrack.current === track.id) setPosition({ id: track.id, fraction }); }}
          onPlaying={(value) => { if (activeTrack.current === track.id) { setPlaying(value); if (value) setLoadingId(''); } }}
          onReady={(controller) => {
            if (activeTrack.current === track.id && spotifyIntent.current === track.id) {
              spotifyIntent.current = '';
              resumeSpotify(controller, track.id);
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
  </div>
    {momentLayer && <div className={'moment-zoom-layer' + (zoom === 'transition' ? ' entering' : zoom === 'returning' ? ' leaving' : '')}>
      <MomentMap album={album} tracks={allTracks} back={closeMoments} active={zoom === 'moments'} />
    </div>}
  </div>;
}
