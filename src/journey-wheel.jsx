import React, { useId, useRef, useState } from 'react';

const optionSpacing = 110;

export function JourneyWheel({ enter, finish, finishDisabled = false }) {
  const arcId = useId();
  const pointer = useRef(null);
  const dragged = useRef(false);
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const restingAngle = -active * optionSpacing;
  const options = [
    { label: 'Enter information', select: enter },
    { label: 'Finish my journey', select: finish, disabled: finishDisabled },
  ];

  function angleAt(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
  }

  function delta(event) {
    return (angleAt(event) - pointer.current.angle + 540) % 360 - 180;
  }

  function start(event) {
    if (event.button !== 0 || pointer.current) return;
    pointer.current = { id: event.pointerId, angle: angleAt(event) };
    dragged.current = false;
  }

  function move(event) {
    if (pointer.current?.id !== event.pointerId) return;
    const degrees = delta(event);
    if (!dragged.current && Math.abs(degrees) < 6) return;
    if (!dragged.current) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragged.current = true;
    }
    const angle = Math.min(8, Math.max(-optionSpacing - 8, restingAngle + degrees));
    setOffset(angle - restingAngle);
  }

  function end(event, released) {
    if (pointer.current?.id !== event.pointerId) return;
    const degrees = delta(event);
    pointer.current = null;
    setOffset(0);
    if (released && (active ? degrees : -degrees) >= 22) setActive(1 - active);
  }

  return <div className={'blank-wheel journey-wheel' + (offset ? ' wheel-dragging' : '')} id="blank-wheel"
    onPointerDown={start} onPointerMove={move} onPointerUp={(event) => end(event, true)}
    onPointerCancel={(event) => end(event, false)} onLostPointerCapture={(event) => end(event, false)}
    onKeyDown={(event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        setActive(1 - active);
        requestAnimationFrame(() => document.getElementById(arcId + '-' + (1 - active))?.focus());
      }
    }}>
    <svg className="journey-arc-def" viewBox="0 0 180 180" aria-hidden="true">
      <defs>
        <path id={arcId} d="M104 21 A71 71 0 0 1 151 126" />
        <path id={arcId + '-reverse'} d="M151 126 A71 71 0 0 0 104 21" />
      </defs>
    </svg>
    <div className="journey-wheel-ring" style={{ '--wheel-angle': (restingAngle + offset) + 'deg' }}>
      {options.map((option, index) => <button key={option.label} id={arcId + '-' + index} type="button"
        className="wheel-item journey-wheel-action"
        disabled={option.disabled || !option.select}
        style={{ '--option-angle': index * optionSpacing + 'deg' }}
        aria-label={option.label} aria-description="휠을 끌거나 방향키를 눌러 옵션을 바꿀 수 있어요."
        aria-current={active === index ? 'true' : undefined}
        aria-hidden={active === 1 && index === 0 ? 'true' : undefined} tabIndex={active === 1 && index === 0 ? -1 : 0}
        onClick={(event) => { if (!dragged.current || event.detail === 0) option.select(); }}>
        <svg viewBox="0 0 180 180" aria-hidden="true"><text>
          {index === 1 && active === 0
            ? <textPath href={'#' + arcId + '-reverse'} startOffset="96%" textAnchor="end">{option.label}</textPath>
            : <textPath href={'#' + arcId} startOffset="4%">{option.label}</textPath>}
        </text></svg>
      </button>)}
    </div>
  </div>;
}
