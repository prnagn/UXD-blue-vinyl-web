import React, { useEffect, useRef, useState } from 'react';
import { albumArt } from './archive';

const icons = {
  back: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', close: 'M6 6l12 12M18 6 6 18',
  disc: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  'camera-off': 'M3 3l18 18M3 7h4l2-3h6l2 3h4v12M3 10v10h14M10 10a3.5 3.5 0 0 0 4 5',
  audio: 'M9 17V6l11-3v11M9 17c0 2-6 4-6 1s6-4 6-1Zm11-3c0 2-6 4-6 1s6-4 6-1Z',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  memo: 'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 10v1a7 7 0 0 0 14 0v-1m-7 8v4m-4 0h8',
  play: 'M8 4l13 8-13 8z', pause: 'M9 5v14m6-14v14',
  'skip-next': 'M5 4l11 8-11 8zM19 4v16', 'skip-back': 'M19 4l-11 8 11 8zM5 4v16',
  check: 'M4 12l5 5L20 6', edit: 'M4 16l12-12 4 4L8 20H4zM14 6l4 4',
  plane: 'M3 4l18 7-7 3-3 7-8-17Zm10 9-5-5',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  calendar: 'M3 6h18v15H3zM7 3v6m10-6v6M3 11h18',
  pin: 'M12 22s7-6.5 7-13a7 7 0 0 0-14 0c0 6.5 7 13 7 13Zm0-16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  list: 'M5 6h14M5 12h14M5 18h14',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v5l3 2',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5',
  zoom: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5M7.5 10.5h6m-3-3v6',
  'zoom-out': 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5M7.5 10.5h6',
  cycle: 'M3 7h15l-3-3m3 3-3 3m6 7H6l3 3m-3-3 3-3',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  reset: 'M3 11a9 9 0 1 1 2 7M3 4v7h7',
};

export function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>;
}

export function Plane() {
  return <svg viewBox="0 0 136 85" aria-hidden="true" className="planes">
    <g className="plane-a"><path d="M59 11l69 4-20 17 7 18-25-11-13 11z" fill="#d3cfc7"/><path d="M59 11l49 21 7 18-25-11z" fill="#8c8b8a"/><path d="M59 11l69 4-38 24-13 11z" fill="#f5f1e7"/><path d="M59 11l31 28 38-24z" fill="#e6e0d4"/></g>
    <g className="plane-b"><path d="M6 65l57-34-5 23 16 11-19-1 4 15z" fill="#d2cec4"/><path d="M6 65l52-11 16 11-19-1z" fill="#8b8986"/><path d="M6 65l57-34-8 33 4 15z" fill="#f5f0e6"/><path d="M6 65l49-1 8-33z" fill="#e6e0d4"/></g>
  </svg>;
}

export function Vinyl({ className = '', color, image, playing }) {
  return <div className={'vinyl ' + className + (playing ? ' rotating' : '')} aria-hidden="true">
    <div className="vinyl-label" style={{ backgroundColor: color }}>
      {image && <img src={image} alt="" />}
    </div>
  </div>;
}

export function Arm() {
  return <svg className="arm" viewBox="0 0 146 210" aria-hidden="true">
    <rect x="116" y="-25" width="46" height="68" rx="23" fill="#d9d9d9" />
    <circle cx="139" cy="0" r="23" fill="#ececec" />
    <rect x="126" y="-7" width="27" height="19" rx="4" fill="#d9d9d9" transform="rotate(30 139 0)" />
    <path d="M139 0 46 157" fill="none" stroke="#959595" strokeWidth="8"/>
    <path d="m46 153-11 20" fill="none" stroke="#d9d9d9" strokeWidth="13"/>
    <rect x="13" y="169" width="44" height="19" rx="6" fill="#d9d9d9" transform="rotate(-35 35 178)" />
  </svg>;
}

export function useMedia(entry) {
  const [media, setMedia] = useState(null);
  useEffect(() => {
    if (!entry?.blob) { setMedia(null); return; }
    const url = URL.createObjectURL(entry.blob);
    setMedia({ blob: entry.blob, url });
    return () => URL.revokeObjectURL(url);
  }, [entry?.blob]);
  return entry?.src || (media?.blob === entry?.blob ? media?.url : undefined);
}

export function Top({ title, back, action, actionIcon = 'list', actionLabel = '메뉴' }) {
  return <header className="top">
    {back ? <button className="icon-button" onClick={back} aria-label="뒤로"><Icon name="back" /></button> : <span className="top-spacer" />}
    <span className="top-title">{title}</span>
    {action ? <button className="icon-button" onClick={action} aria-label={actionLabel}><Icon name={actionIcon} /></button> : <span className="top-spacer" />}
  </header>;
}

export function Cover({ album }) {
  const photo = useMedia(albumArt(album));
  return <div className="cover" style={{ '--cover-color': album.color }}>
    {photo ? <img src={photo} alt="" /> : <span>{albumTitle(album).slice(0, 2).toUpperCase()}</span>}
  </div>;
}

export function SleeveFace({ album }) {
  const photo = useMedia(albumArt(album));
  return <span className="sleeve-face">
    {photo && <img src={photo} alt="" loading="lazy" draggable={false} />}
  </span>;
}

export function PullSleeve({ album, open }) {
  const pointer = useRef(null);
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  function offset(event, start) {
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    return dx > dy * 0.9 ? Math.min(dx, start.limit) : 0;
  }

  function start(event) {
    if (event.button !== 0 || pointer.current) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      threshold: Math.min(96, width * 0.25),
      limit: width * 0.38,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function move(event) {
    const active = pointer.current;
    if (active?.id !== event.pointerId) return;
    const next = offset(event, active);
    setDistance(next);
    setReady(next >= active.threshold);
  }

  function finish(event, release = false) {
    const active = pointer.current;
    if (active?.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
    setDistance(0);
    setReady(false);
    if (release && offset(event, active) >= active.threshold) open();
  }

  return <div className="pull-wrap">
    <button className={'pull' + (dragging ? ' dragging' : '') + (ready ? ' pull-ready' : '')}
      aria-label={albumTitle(album) + ' LP 열기'}
      aria-description="레코드를 오른쪽으로 당긴 뒤 놓으세요."
      style={{ '--pull-distance': distance + 'px' }}
      onPointerDown={start} onPointerMove={move} onPointerUp={(event) => finish(event, true)}
      onPointerCancel={finish} onLostPointerCapture={finish}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => { if (event.detail === 0) open(); }}>
      <Cover album={album} />
      <Vinyl color={album.color} />
      <span aria-hidden="true">{ready ? 'RELEASE' : 'PULL OUT'}<br />TO OPEN <b>→</b></span>
    </button>
    <div className="pull-caption"><strong>{albumTitle(album)}</strong><small>{dateLabel(album.start)}</small></div>
  </div>;
}

export const entryIcons = { photo: 'camera', audio: 'audio', video: 'video', memo: 'memo' };
export const dateLabel = (date) => date ? date.slice(0, 7).replace('-', '.') : '';
export const albumTitle = (album) => album.name || [album.city, album.country].filter(Boolean).join(', ');
