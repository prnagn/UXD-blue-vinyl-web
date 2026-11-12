import React, { useRef, useState } from 'react';
import { Icon, useMedia } from './ui';

function Picture({ group }) {
  const photo = useMedia(group?.photo);
  return photo ? <img src={photo} alt="" draggable={false} /> : <Icon name="audio" size={23} />;
}

export function MomentCarousel({ groups, selectedId, select, previewOrder, commitOrder, capture, play, playing, busy, onEditing }) {
  const index = selectedId === 'new' ? groups.length : Math.max(0, groups.findIndex((group) => group.id === selectedId));
  const selected = groups[index];
  const pointer = useRef(null);
  const suppressClick = useRef(false);
  const latest = useRef({ groups, selectedId });
  latest.current = { groups, selectedId };
  const [drag, setDrag] = useState(0);
  const [editing, setEditing] = useState(null);

  function finish(event, commit = false) {
    const active = pointer.current;
    if (active?.pointerId !== event.pointerId) return;
    pointer.current = null;
    clearTimeout(active.timer);
    setDrag(0); setEditing(null); onEditing(false);
    suppressClick.current = active.editing || Math.abs(event.clientX - active.x) > 12;
    if (active.editing) {
      select(active.id);
      if (commit) commitOrder(active.ids, active.original);
      else previewOrder(active.original);
    } else if (commit) {
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        const next = Math.max(0, Math.min(groups.length, index + (dx < 0 ? 1 : -1)));
        select(groups[next]?.id || 'new');
      }
    }
  }

  return <div className={'moment-carousel' + (editing ? ' editing-order' : '')}>
    <button className={'capture-photo' + (selected ? ' captured' : ' capture-new')} style={{ transform: 'translateX(' + drag + 'px)' }}
      aria-label={selected ? '현재 순간 · 사진과 소리' : '새로운 기록 녹화하기'}
      aria-description="좌우로 넘기거나, 사진을 길게 누른 뒤 좌우로 움직여 순서를 바꿀 수 있어요."
      disabled={busy}
      onPointerDown={(event) => {
        if (event.button !== 0 || pointer.current || busy) return;
        const active = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, id: selected?.id, start: index,
          ids: groups.map((group) => group.id), original: groups.map((group) => group.id), editing: false };
        pointer.current = active;
        event.currentTarget.setPointerCapture(event.pointerId);
        suppressClick.current = false;
        if (selected) active.timer = setTimeout(() => {
          if (pointer.current !== active) return;
          active.editing = true;
          setEditing({ id: active.id, start: index, dx: 0 });
          onEditing(true);
        }, 420);
      }}
      onPointerMove={(event) => {
        const active = pointer.current;
        if (active?.pointerId !== event.pointerId) return;
        const dx = event.clientX - active.x;
        if (active.editing) {
          const to = Math.max(0, Math.min(active.ids.length - 1, active.start + Math.round(dx / 78)));
          const from = active.ids.indexOf(active.id);
          if (from !== to) {
            active.ids.splice(from, 1); active.ids.splice(to, 0, active.id);
            previewOrder([...active.ids]);
          }
          setEditing({ id: active.id, start: active.start, dx });
        } else {
          if (Math.hypot(dx, event.clientY - active.y) > 10) clearTimeout(active.timer);
          setDrag(Math.max(-55, Math.min(55, dx * .4)));
        }
      }}
      onPointerUp={(event) => finish(event, true)} onPointerCancel={finish} onLostPointerCapture={finish}
      onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const next = index + (event.key === 'ArrowRight' ? 1 : -1);
        if (event.altKey && selected && groups[next]) {
          const ids = groups.map((group) => group.id);
          ids.splice(index, 1); ids.splice(next, 0, selected.id);
          previewOrder(ids); commitOrder(ids, groups.map((group) => group.id));
        } else if (next >= 0 && next <= groups.length) select(groups[next]?.id || 'new');
      }}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        if (selected) play(); else capture();
      }}>
      {selected ? <><Picture group={selected} />{(selected.audio || selected.spotify) && <span className="capture-trigger"><Icon name={playing ? 'pause' : 'play'} size={23} /></span>}</>
        : <><span className="capture-trigger"><Icon name="plus" size={25} /></span><span>새로운 기록 녹화하기</span></>}
    </button>
    {!editing && index > 0 && <button className="carousel-neighbor previous" aria-label="이전 순간" onClick={() => select(groups[index - 1].id)}><Picture group={groups[index - 1]} /></button>}
    {!editing && index < groups.length && <button className="carousel-neighbor next" aria-label={groups[index + 1] ? '다음 순간' : '새로운 기록'} onClick={() => select(groups[index + 1]?.id || 'new')}>
      {groups[index + 1] ? <Picture group={groups[index + 1]} /> : <Icon name="plus" size={23} />}
    </button>}
    {editing && <div className="carousel-reorder" aria-label="순간 순서 편집">
      <div className={'reorder-strip' + (Math.abs(editing.dx) > 8 ? ' moving' : '')} style={{ '--strip-x': -(editing.start + .5) * 78 + 'px', '--strip-origin': (editing.start + .5) * 78 + 'px' }}>
        {groups.map((group, i) => <div key={group.id} className={'reorder-thumb' + (group.id === editing.id ? ' dragged' : '')}
          style={group.id === editing.id ? { transform: 'translateX(' + (editing.dx - (i - editing.start) * 78) + 'px) scale(1.15)' } : undefined}>
          <Picture group={group} />
        </div>)}
      </div>
    </div>}
    <div className="moment-photo-count" aria-live="polite">{index < groups.length ? (index + 1) + ' / ' + groups.length : '+'}</div>
  </div>;
}
