import React, { useRef, useState } from 'react';
import { albumArt, albumPlaybackTracks } from './archive';
import { albumTitle, Arm, useMedia, Vinyl } from './ui';
import { SpotifyPlayer } from './spotify-player';

const parked = -25;
const overRecord = 0;
const playBoundary = -12;

export function HomeTurntable({ album, open, children }) {
  const track = albumPlaybackTracks(album.entries).find((entry) => entry.kind === 'spotify');
  const [playing, setPlaying] = useState(false);
  const [dragAngle, setDragAngle] = useState(null);
  const [notice, setNotice] = useState('');
  const controller = useRef(null);
  const wantsPlayback = useRef(false);
  const pointer = useRef(null);
  const art = useMedia(albumArt(album));
  const angle = dragAngle ?? (playing ? overRecord : parked);
  const title = albumTitle(album);

  function startPlayback() {
    if (wantsPlayback.current) return;
    if (!track) {
      setNotice('이 LP에는 저장된 Spotify 곡이 없어요.');
      return;
    }
    setNotice('');
    wantsPlayback.current = true;
    controller.current?.resume();
  }

  function stopPlayback() {
    wantsPlayback.current = false;
    controller.current?.pause();
    setPlaying(false);
  }

  function pointerAngle(event, active) {
    const offset = (active.x - event.clientX) * 70 / active.width;
    return Math.min(overRecord + 4, Math.max(parked - 2, active.angle + offset));
  }

  function startDrag(event) {
    if (event.button !== 0 || pointer.current) return;
    const arm = event.currentTarget;
    pointer.current = { id: event.pointerId, x: event.clientX, angle, width: arm.offsetWidth };
    arm.setPointerCapture(event.pointerId);
    setDragAngle(angle);
  }

  function moveDrag(event) {
    if (pointer.current?.id === event.pointerId) setDragAngle(pointerAngle(event, pointer.current));
  }

  function finishDrag(event, release = false) {
    const active = pointer.current;
    if (active?.id !== event.pointerId) return;
    pointer.current = null;
    setDragAngle(null);
    if (!release) return;
    if (pointerAngle(event, active) >= playBoundary) startPlayback();
    else stopPlayback();
  }

  return <><section className="turntable" aria-label="Blue Vinyl">
    <button className="latest-disc" onClick={open} aria-label={'최근 LP · ' + title}>
      <Vinyl color="#d9d9d7" image={art} playing />
    </button>
    <button className={'home-arm' + (dragAngle !== null ? ' dragging' : '')}
      style={{ '--arm-angle': angle + 'deg' }}
      aria-label="톤암 · LP 재생 또는 정지" aria-pressed={playing}
      aria-description="톤암을 판 위로 끌어 Spotify 곡을 재생하고, 오른쪽으로 빼서 정지하세요."
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event, true)}
      onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
      onClick={(event) => {
        if (event.detail === 0) { if (wantsPlayback.current) stopPlayback(); else startPlayback(); }
      }}>
      <Arm />
    </button>
    <div className="turntable-label">
      <strong>{title}</strong>
      {(notice || track) && <small role="status">{notice || track.name}</small>}
    </div>
    {children}
  </section>
    {track && <div className="home-spotify-player" aria-label="LP에 기록된 Spotify 곡">
      <SpotifyPlayer key={track.id} song={track.spotify} controllerRef={controller}
        onPlaying={(value) => { wantsPlayback.current = value; setPlaying(value); }}
        onReady={(player) => { if (wantsPlayback.current) player.resume(); }} />
    </div>}
  </>;
}
