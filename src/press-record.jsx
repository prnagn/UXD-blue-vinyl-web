import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { albumTitle, Icon, Top, Vinyl } from './ui';
import { createPressHold } from './press-hold';

export function JourneyConfirm({ confirm, close }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog className="journey-confirm" ref={dialog} aria-labelledby="journey-confirm-title"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <h2 id="journey-confirm-title">Did you finish your journey?</h2>
    <button onClick={confirm}>Yes!</button>
    <button onClick={close}>No...</button>
  </dialog>;
}

export function PressRecord({ photo, busy, back, choose, complete }) {
  const [phase, setPhase] = useState('idle');
  const room = useRef(null);
  const visual = useRef(null);
  const controller = useRef(null);
  const completeRef = useRef(complete);
  completeRef.current = complete;
  useLayoutEffect(() => {
    let height = visual.current.clientHeight;
    let progress = 0;
    function paint(value) {
      progress = value;
      room.current.style.setProperty('--press-inlay-offset', height * .47 * value + 'px');
      room.current.style.setProperty('--press-dim', value * .83);
      room.current.style.setProperty('--press-glow', value * 60 + 'px');
      room.current.style.setProperty('--press-glow-spread', value * 12 + 'px');
    }
    const hold = createPressHold({ paint, phase: setPhase, complete: () => completeRef.current() });
    controller.current = hold;
    const resize = new ResizeObserver(() => { height = visual.current.clientHeight; paint(progress); });
    resize.observe(visual.current);
    paint(0);
    const visibility = () => { if (document.hidden) hold.cancel(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { hold.destroy(); controller.current = null; resize.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  return <div className="press-room" ref={room}>
    <Top title="" back={() => { if (!busy && phase !== 'saving') { controller.current?.cancel(); back(); } }} />
    <button className="press-hold" aria-label="길게 눌러 LP 프레싱" aria-pressed={phase === 'pressing'} aria-busy={phase === 'saving'} disabled={busy || phase === 'saving'}
      onPointerDown={(event) => {
        if (event.button !== 0 || busy || !controller.current?.start(event.pointerId)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => controller.current?.cancel(event.pointerId)}
      onPointerCancel={(event) => controller.current?.cancel(event.pointerId)}
      onLostPointerCapture={(event) => controller.current?.cancel(event.pointerId)}
      onBlur={() => controller.current?.cancel('keyboard')}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat && !busy) controller.current?.start('keyboard'); }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); controller.current?.cancel('keyboard'); }
      }}>
      <span className="press-heading">Press!</span>
      <span className="press-visual" ref={visual} aria-hidden="true">
        <span className="press-disc"><Vinyl color="#373738" /></span>
        <span className="press-inlay">{photo && <img src={photo} alt="" draggable={false} />}</span>
      </span>
      <span className="press-instruction">{phase === 'saving' ? '프레싱 마무리 중…' : '완성될 때까지 길게 누르세요'}</span>
    </button>
    <button className="press-cover" onClick={choose} disabled={busy || phase !== 'idle'}><Icon name="camera" size={16} /> LP 커버 선택</button>
  </div>;
}

export function PressCompleted({ album, photo, next }) {
  useEffect(() => {
    const timer = setTimeout(next, 3000);
    return () => clearTimeout(timer);
  }, [next]);

  return <div className="press-completed" role="status">
    <p>Completed</p>
    <Vinyl color="#bd8582" image={photo} />
    <h1>{albumTitle(album)}</h1>
  </div>;
}
