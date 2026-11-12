import React, { useRef, useState } from 'react';
import { dayPosition, trackAtPosition } from './playback-days';

export function DayTimeline({ days, tracks, index, progress, select }) {
  const pointer = useRef(null);
  const [scrub, setScrub] = useState(null);
  const position = scrub ?? dayPosition(days, index, progress);
  const selected = days.find((day) => day.indices.includes(index));
  function at(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  }
  function finish(event, commit) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (commit) select(tracks[trackAtPosition(days, at(event))]);
    setScrub(null);
  }
  return <div className="day-timeline" role="slider" tabIndex={0}
    aria-label="날짜별 재생 위치" aria-valuemin={1} aria-valuemax={tracks.length} aria-valuenow={index + 1}
    aria-valuetext={'Day ' + selected?.number + ' · ' + (tracks[index]?.name || '')}
    onPointerDown={(event) => {
      if (event.button !== 0 || pointer.current !== null) return;
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setScrub(at(event));
    }}
    onPointerMove={(event) => { if (pointer.current === event.pointerId) setScrub(at(event)); }}
    onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)} onLostPointerCapture={(event) => finish(event, false)}
    onKeyDown={(event) => {
      const next = { ArrowLeft: index - 1, ArrowDown: index - 1, ArrowRight: index + 1, ArrowUp: index + 1, Home: 0, End: tracks.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(tracks[Math.max(0, Math.min(tracks.length - 1, next))]);
    }}>
    <span className="day-line" aria-hidden="true" />
    <span className="day-line day-line-done" style={{ width: position * 100 + '%' }} aria-hidden="true" />
    {days.map((day, i) => <span key={i} className={'day-stop' + (index >= day.indices[0] ? ' seen' : '')}
      style={{ left: i / days.length * 100 + '%' }} title={'Day ' + day.number + (day.date ? ' · ' + day.date : '')} aria-hidden="true" />)}
    {tracks.map((track, i) => <span key={track.id} className="moment-stop" style={{ left: dayPosition(days, i) * 100 + '%' }} aria-hidden="true" />)}
    <span className="day-end" aria-hidden="true" />
    <span className="day-plane" style={{ left: position * 100 + '%' }} aria-hidden="true">
      <svg viewBox="0 0 22 16"><path d="M21 1 1 7l7 2.5L10.5 15 13 10.5 21 1Z" fill="#fff" /><path d="M8 9.5 21 1" stroke="#8c9dde" fill="none" /></svg>
    </span>
  </div>;
}
