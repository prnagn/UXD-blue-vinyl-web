import React, { useEffect, useRef, useState } from 'react';
import { parkedAngle as parked, needleRadius as distance, trackRadius as radius, replayArmAngle } from './replay-geometry';

export function ReplayArm({ playing, loading = false, tracks, track, choose, toggle, stop, stage, view }) {
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
    const matrix = element.querySelector('svg')?.getScreenCTM();
    const translation = node => {
      const [x = 0, y = 0] = (getComputedStyle(node).translate || 'none').split(' ').map(value => parseFloat(value) || 0);
      return { x, y };
    };
    const recordEntry = translation(record);
    const armEntry = translation(element.closest('.focus-arm-mount'));
    return {
      x: matrix ? matrix.a * 107 + matrix.c * 36 + matrix.e - armEntry.x : area.x + element.offsetLeft + element.offsetWidth * 107 / 138,
      y: matrix ? matrix.b * 107 + matrix.d * 36 + matrix.f - armEntry.y : area.y + element.offsetTop - element.offsetHeight * .57 + element.offsetHeight * 36 / 236,
      scale: matrix ? Math.hypot(matrix.a, matrix.b) : element.offsetWidth / 138,
      cx: disc.x + disc.width / 2 - recordEntry.x, cy: disc.y + disc.height / 2 - recordEntry.y, radius: disc.width / 2,
    };
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => setLayout(measure()));
    if (stage.current) observer.observe(stage.current);
    const record = stage.current?.querySelector('.focus-record');
    if (record) observer.observe(record);
    if (arm.current) observer.observe(arm.current);
    setLayout(measure());
    const element = stage.current;
    const settled = event => {
      if (event.propertyName === 'transform' && event.target.matches('.focus-record,.focus-arm-mount')) setLayout(measure());
    };
    const entered = event => {
      if (event.animationName === 'replay-record-enter' || event.animationName === 'replay-arm-enter') setLayout(measure());
    };
    element?.addEventListener('transitionend', settled);
    element?.addEventListener('animationend', entered);
    return () => { observer.disconnect(); element?.removeEventListener('transitionend', settled); element?.removeEventListener('animationend', entered); };
  }, [stage, view]);

  // The same physical needle position selects the ring and positions the arm.
  const angle = replayArmAngle({ drag, playing, loading, index, count: tracks.length, layout });
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

  return <div className="focus-arm-mount"><button className={'focus-arm' + (drag !== null ? ' dragging' : '')} ref={arm}
    style={{ '--focus-arm-angle': angle + 'deg' }} aria-label="톤암 · 재생 및 트랙 선택" aria-pressed={playing}
    aria-description="판 위에 놓으면 재생합니다. 안쪽은 나중 트랙, 바깥쪽은 이전 트랙입니다. 판 밖으로 빼면 정지합니다."
    onPointerDown={(event) => {
      if (event.button !== 0 || pointer.current) return;
      const next = measure();
      if (!next) return;
      setLayout(next);
      const matrix = new DOMMatrixReadOnly(getComputedStyle(arm.current).transform);
      const visibleAngle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      pointer.current = { id: event.pointerId, layout: next, angle: visibleAngle, start: Math.atan2(event.clientY - next.y, event.clientX - next.x) };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag(visibleAngle);
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
      <g transform={'rotate(' + -angle + ' 107 36)'}>
        <rect x="79" y="8" width="56" height="82" rx="28" fill="#d9d9d9" />
        <circle cx="107" cy="36" r="28" fill="#ececec" stroke="#d9d9d9" strokeWidth="1" />
        <rect x="91" y="28" width="33" height="23" rx="5" fill="#d9d9d9" transform="rotate(25 107 36)" />
      </g>
      <path d="M111 39 43 184" fill="none" stroke="#959595" strokeWidth="7" />
      <path d="m43 181-7 17" fill="none" stroke="#d9d9d9" strokeWidth="10" />
      <rect x="18" y="194" width="35" height="15" rx="5" fill="#d9d9d9" transform="rotate(-35 36 203)" />
    </svg>
  </button></div>;
}
