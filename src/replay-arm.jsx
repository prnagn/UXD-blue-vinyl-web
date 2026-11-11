import React, { useEffect, useRef, useState } from 'react';
import { parkedAngle as parked, needleRadius as distance, trackRadius as radius, trackAngle } from './replay-geometry';

export function ReplayArm({ playing, tracks, track, choose, toggle, stop, stage }) {
  const arm = useRef(null);
  const pointer = useRef(null);
  const [drag, setDrag] = useState(null);
  const [layout, setLayout] = useState(null);
  const index = Math.max(0, tracks.indexOf(track));

  function measure() {
    const element = arm.current;
    const record = stage.current?.querySelector('.focus-record');
    if (!element || !record) return null;
    const area = stage.current.getBoundingClientRect();
    const disc = record.getBoundingClientRect();
    return {
      x: area.x + element.offsetLeft + element.offsetWidth * 107 / 138,
      y: area.y + element.offsetTop - element.offsetHeight * .57 + element.offsetHeight * 36 / 236,
      scale: element.offsetWidth / 138,
      cx: disc.x + disc.width / 2, cy: disc.y + disc.height / 2, radius: disc.width / 2,
    };
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => setLayout(measure()));
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, [stage]);

  // The same physical needle position selects the ring and positions the arm.
  const angle = drag ?? (playing ? (layout ? trackAngle(index, tracks.length, layout) : -10 + index / Math.max(1, tracks.length - 1) * 28) : parked);
  function point(event, active) {
    const delta = Math.atan2(event.clientY - active.layout.y, event.clientX - active.layout.x) - active.start;
    const degrees = Math.atan2(Math.sin(delta), Math.cos(delta)) * 180 / Math.PI;
    return Math.min(24, Math.max(parked - 3, active.angle + degrees));
  }

  function finish(event, commit = false) {
    const active = pointer.current;
    if (active?.id !== event.pointerId) return;
    pointer.current = null;
    setDrag(null);
    if (!commit) return;
    const at = point(event, active);
    const r = distance(at, active.layout);
    if (r > active.layout.radius * .98 || at < -21 || !tracks.length) { stop(); return; }
    let closest = 0;
    tracks.forEach((entry, i) => {
      if (Math.abs(radius(i, tracks.length, active.layout) - r) < Math.abs(radius(closest, tracks.length, active.layout) - r)) closest = i;
    });
    choose(tracks[closest], true);
  }

  return <button className={'focus-arm' + (drag !== null ? ' dragging' : '')} ref={arm}
    style={{ '--focus-arm-angle': angle + 'deg' }} aria-label="톤암 · 재생 및 트랙 선택" aria-pressed={playing}
    aria-description="판 위에 놓으면 재생합니다. 안쪽은 나중 트랙, 바깥쪽은 이전 트랙입니다. 판 밖으로 빼면 정지합니다."
    onPointerDown={(event) => {
      if (event.button !== 0 || pointer.current) return;
      const next = measure();
      if (!next) return;
      setLayout(next);
      pointer.current = { id: event.pointerId, layout: next, angle, start: Math.atan2(event.clientY - next.y, event.clientX - next.x) };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag(angle);
    }}
    onPointerMove={(event) => { if (pointer.current?.id === event.pointerId) setDrag(point(event, pointer.current)); }}
    onPointerUp={(event) => finish(event, true)} onPointerCancel={finish} onLostPointerCapture={finish}
    onClick={(event) => { if (event.detail === 0) { setLayout(measure()); toggle(); } }}
    onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      setLayout(measure());
      const next = Math.min(tracks.length - 1, Math.max(0, index + (event.key === 'ArrowLeft' ? 1 : -1)));
      if (tracks[next]) choose(tracks[next], true);
    }}>
    <svg viewBox="0 0 138 236" aria-hidden="true">
      <defs><linearGradient id="focus-metal"><stop stopColor="#7d8089"/><stop offset=".55" stopColor="#e7e5de"/><stop offset="1" stopColor="#9d9d9a"/></linearGradient></defs>
      <circle cx="107" cy="36" r="28" fill="#242831" opacity=".24" transform="translate(2 4)" />
      <circle cx="107" cy="36" r="28" fill="#edece8" /><circle cx="107" cy="36" r="21" fill="#dfded9" />
      <path d="M113 39L36 203" stroke="#222531" opacity=".33" strokeWidth="11" transform="translate(3 3)" />
      <path d="M111 39L36 203" stroke="url(#focus-metal)" strokeWidth="9" strokeLinecap="round" />
      <rect x="96" y="27" width="25" height="27" rx="5" fill="#d4d3cf" transform="rotate(26 108 40)" />
      <rect x="18" y="194" width="35" height="14" rx="5" fill="#d8d7d2" transform="rotate(-29 35 201)" />
      <path d="M31 208l2 7" stroke="#eeece6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </button>;
}
