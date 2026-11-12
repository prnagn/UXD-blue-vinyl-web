import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, useMedia } from './ui';
import { centeredScroll, reorderPosition, reorderSpacing } from './carousel-layout';

function Picture({ group }) {
  const photo = useMedia(group?.photo);
  return photo ? <img src={photo} alt="" draggable={false} /> : <Icon name="audio" size={23} />;
}

export function MomentCarousel({ groups, selectedId, select, previewOrder, commitOrder, capture, play, playing, busy, onEditing }) {
  const index = selectedId === 'new' ? groups.length : Math.max(0, groups.findIndex((group) => group.id === selectedId));
  const selected = groups[index];
  const viewport = useRef(null);
  const pointer = useRef(null);
  const suppressClick = useRef(false);
  const settled = useRef(null);
  const ready = useRef(false);
  const latest = useRef(null);
  latest.current = { groups, selectedId, select, index };
  const [editing, setEditing] = useState(null);

  function scrollTo(at, behavior = 'smooth') {
    const element = viewport.current;
    const slide = element?.querySelectorAll('.carousel-slide')[at];
    if (slide) element.scrollTo({ left: centeredScroll(slide.offsetLeft, slide.offsetWidth, element.clientWidth), behavior });
  }

  function scheduleSettle() {
    clearTimeout(settled.current);
    if (pointer.current) return;
    settled.current = setTimeout(() => {
      const element = viewport.current;
      if (pointer.current || !element) return;
      const current = latest.current;
      const slides = [...element.querySelectorAll('.carousel-slide')];
      let next = 0;
      let closest = Infinity;
      slides.forEach((slide, at) => {
        const distance = Math.abs(centeredScroll(slide.offsetLeft, slide.offsetWidth, element.clientWidth) - element.scrollLeft);
        if (distance < closest) { closest = distance; next = at; }
      });
      element.style.scrollSnapType = '';
      const id = current.groups[next]?.id || 'new';
      if (id !== current.selectedId) current.select(id);
    }, 140);
  }

  useLayoutEffect(() => {
    if (editing || pointer.current) return;
    scrollTo(index, ready.current ? 'smooth' : 'auto');
    ready.current = true;
  }, [index, groups.length, Boolean(editing)]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!pointer.current) scrollTo(latest.current.index, 'auto');
    });
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      clearTimeout(settled.current);
      clearTimeout(pointer.current?.timer);
    };
  }, []);

  function finish(event, commit = false) {
    const active = pointer.current;
    if (active?.pointerId !== event.pointerId) return;
    pointer.current = null;
    clearTimeout(active.timer);
    setEditing(null); onEditing(false);
    suppressClick.current = active.editing || Math.hypot(event.clientX - active.x, event.clientY - active.y) > 12;
    if (active.editing) {
      select(active.id);
      if (commit) commitOrder(active.ids, active.original);
      else previewOrder(active.original);
      scrollTo((commit ? active.ids : active.original).indexOf(active.id), 'auto');
      viewport.current.style.scrollSnapType = '';
    } else {
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      const swiped = commit && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2;
      const next = Math.max(0, Math.min(groups.length, active.start + (swiped ? (dx < 0 ? 1 : -1) : 0)));
      if (next !== index) select(groups[next]?.id || 'new');
      scrollTo(next);
      scheduleSettle();
    }
  }

  function keyDown(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = index + (event.key === 'ArrowRight' ? 1 : -1);
    if (event.altKey && selected && groups[next]) {
      const ids = groups.map((group) => group.id);
      ids.splice(index, 1); ids.splice(next, 0, selected.id);
      previewOrder(ids); commitOrder(ids, groups.map((group) => group.id));
    } else if (next >= 0 && next <= groups.length) select(groups[next]?.id || 'new');
  }

  function movePointer(event) {
    const active = pointer.current;
    if (active?.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (active.editing) {
      const to = Math.max(0, Math.min(active.ids.length - 1, active.start + Math.round(dx / active.step)));
      const from = active.ids.indexOf(active.id);
      if (from !== to) {
        active.ids.splice(from, 1); active.ids.splice(to, 0, active.id);
        previewOrder([...active.ids]);
      }
      setEditing({ id: active.id, start: active.start, dx, step: active.step });
    } else {
      if (Math.hypot(dx, dy) > 10) clearTimeout(active.timer);
      if (Math.abs(dx) > Math.abs(dy) * 1.2) viewport.current.scrollLeft = active.scroll - dx;
    }
  }

  return <div className={'moment-carousel' + (editing ? ' editing-order' : '')}>
    <div className="carousel-viewport" ref={viewport} role="region" aria-label="순간 사진 넘기기" onKeyDown={keyDown} onScroll={scheduleSettle}
      onPointerMove={movePointer} onPointerUp={(event) => finish(event, true)} onPointerCancel={finish}
      onLostPointerCapture={(event) => { if (event.target === event.currentTarget) finish(event); }}>
      <div className="carousel-track">
        {[...groups, null].map((group, at) => <div className="carousel-slide" key={group?.id || 'new'}>
          <button className={'capture-photo' + (group ? ' captured' : ' capture-new')}
            aria-label={group ? (at === index ? '현재 순간 · 사진과 소리' : (at + 1) + '번째 순간') : '새로운 기록 녹화하기'}
            aria-current={at === index ? 'true' : undefined}
            aria-description="좌우로 넘기거나, 사진을 길게 누른 뒤 좌우로 움직여 순서를 바꿀 수 있어요."
            disabled={busy} tabIndex={at === index ? 0 : -1}
            onPointerDown={(event) => {
              suppressClick.current = false;
              if (event.button !== 0 || pointer.current || busy || at !== index) return;
              clearTimeout(settled.current);
              const active = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, id: group?.id, start: index,
                step: reorderSpacing(viewport.current.clientWidth, groups.length),
                scroll: viewport.current.scrollLeft, ids: groups.map((item) => item.id), original: groups.map((item) => item.id), editing: false };
              pointer.current = active;
              event.currentTarget.setPointerCapture(event.pointerId);
              viewport.current.style.scrollSnapType = 'none';
              if (group) active.timer = setTimeout(() => {
                if (pointer.current !== active) return;
                active.editing = true;
                // Capture on the stable viewport before reordering moves photo nodes.
                viewport.current.setPointerCapture(active.pointerId);
                setEditing({ id: active.id, start: index, dx: 0, step: active.step });
                onEditing(true);
              }, 420);
            }}
            onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return; }
              if (at !== index) select(group?.id || 'new');
              else if (group) play(); else capture();
            }}>
            {group ? <><Picture group={group} />{(group.audio || group.spotify) && <span className="capture-trigger"><Icon name={at === index && playing ? 'pause' : 'play'} size={23} /></span>}</>
              : <><span className="capture-trigger"><Icon name="plus" size={25} /></span><span>새로운 기록 녹화하기</span></>}
          </button>
        </div>)}
      </div>
    </div>
    {editing && <div className="carousel-reorder" aria-label="순간 순서 편집">
      <div className="reorder-strip">
        {groups.map((group, i) => {
          const dragged = group.id === editing.id;
          const position = reorderPosition(i, groups.length, editing.start, editing.dx, editing.step, dragged);
          return <div key={group.id} className={'reorder-thumb' + (dragged ? ' dragged' : '')}
            style={{ '--card-x': position.x + 'px', '--card-y': position.y + 'px', '--card-z': position.z + 'px', zIndex: dragged ? groups.length + 1 : groups.length - i }}>
            <div className="reorder-disc"><Picture group={group} /></div>
          </div>;
        })}
      </div>
    </div>}
    <div className="moment-photo-count" aria-live="polite">{index < groups.length ? (index + 1) + ' / ' + groups.length : '+'}</div>
  </div>;
}
