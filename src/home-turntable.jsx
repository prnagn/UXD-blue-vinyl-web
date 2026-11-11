import React, { useEffect, useRef, useState } from 'react';
import { albumArt } from './archive';
import { albumTitle, Arm, useMedia, Vinyl } from './ui';

const parked = -25;
const overRecord = 0;
const playBoundary = -12;

export function HomeTurntable({ album, open, children }) {
  const tracks = album.entries.filter((entry) => entry.kind === 'audio' && (entry.src || entry.blob))
    .sort((a, b) => a.day.localeCompare(b.day));
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragAngle, setDragAngle] = useState(null);
  const [notice, setNotice] = useState('');
  const audio = useRef(null);
  const wantsPlayback = useRef(false);
  const pointer = useRef(null);
  const track = tracks[trackIndex];
  const source = useMedia(track);
  const art = useMedia(albumArt(album));
  const angle = dragAngle ?? (playing ? overRecord : parked);
  const title = albumTitle(album);

  async function play(media) {
    if (!media) return;
    try { await media.play(); }
    catch (error) {
      if (!wantsPlayback.current || media !== audio.current || error.name === 'AbortError') return;
      wantsPlayback.current = false;
      setPlaying(false);
      setNotice('이 LP의 오디오를 재생할 수 없어요.');
    }
  }

  useEffect(() => {
    const media = audio.current;
    if (wantsPlayback.current && source) play(media);
    return () => media?.pause();
  }, [source, track?.id]);

  function startPlayback() {
    if (wantsPlayback.current) return;
    if (!track) {
      setNotice('이 LP에는 재생할 오디오가 없어요.');
      return;
    }
    setNotice('');
    wantsPlayback.current = true;
    play(audio.current);
  }

  function stopPlayback() {
    wantsPlayback.current = false;
    audio.current?.pause();
    if (audio.current?.readyState) audio.current.currentTime = 0;
    setTrackIndex(0);
    setPlaying(false);
  }

  function nextTrack() {
    if (!wantsPlayback.current || trackIndex + 1 >= tracks.length) { stopPlayback(); return; }
    setTrackIndex(trackIndex + 1);
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

  return <section className="turntable" aria-label="Blue Vinyl">
    <button className="latest-disc" onClick={open} aria-label={'최근 LP · ' + title}>
      <Vinyl color="#d9d9d7" image={art} playing />
    </button>
    <button className={'home-arm' + (dragAngle !== null ? ' dragging' : '')}
      style={{ '--arm-angle': angle + 'deg' }}
      aria-label="톤암 · LP 재생 또는 정지" aria-pressed={playing}
      aria-description="톤암을 판 위로 끌어 재생하고, 오른쪽으로 빼서 정지하세요."
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event, true)}
      onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
      onClick={(event) => {
        if (event.detail === 0) { if (wantsPlayback.current) stopPlayback(); else startPlayback(); }
      }}>
      <Arm />
    </button>
    <div className="turntable-label">
      <strong>{title}</strong>
      {(notice || playing) && <small role="status">{notice || track.name}</small>}
    </div>
    {source && <audio key={track.id} ref={audio} src={source} preload="auto"
      onPlay={(event) => { if (wantsPlayback.current) setPlaying(true); else event.currentTarget.pause(); }}
      onPause={() => setPlaying(false)} onEnded={nextTrack}
      onError={() => { if (wantsPlayback.current) { stopPlayback(); setNotice('이 LP의 오디오를 열 수 없어요.'); } }} />}
    {children}
  </section>;
}
