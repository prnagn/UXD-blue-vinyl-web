import React, { useEffect, useRef, useState } from 'react';
import { HomeTurntable } from './home-turntable';
import { FlyingAirmail } from './flying-airmail';
import { ParcelShelf } from './parcel-shelf';
import { availableOnTurntable } from './parcel-state';
import { homeLayout } from './home-layout';
import { albumTitle, dateLabel, Icon, PullSleeve, SharedTag, SleeveFace } from './ui';

export function HomeScene({ albums, latest, openAlbum, delivery, inboxOpen, openInbox, preview, setPreview,
  today, unpack, busy, loaded, create, settings, error }) {
  const root = useRef(null);
  const shelf = useRef(null);
  const swipe = useRef(null);
  const switched = useRef(-Infinity);
  const suppress = useRef(false);
  const suppressTimer = useRef(null);
  const [mode, setMode] = useState('home');
  const [size, setSize] = useState({ width: 368, height: 799 });
  const selected = albums.findIndex(item => item.id === preview) + 1;
  const view = preview && selected ? 'cover' : mode;
  const slots = [null, ...albums];
  const positions = homeLayout(slots.length, size.height, view, selected, size.width);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); clearTimeout(suppressTimer.current); };
  }, []);

  function switchView(next) {
    if (performance.now() - switched.current < 650) return false;
    switched.current = performance.now();
    setPreview('');
    setMode(next);
    shelf.current?.scrollTo(0, 0);
    return true;
  }
  function wheel(event) {
    if (Math.abs(event.deltaY) < 4 || event.target.closest('.pull,.parcel-box,.home-spotify-player')) return;
    if (event.deltaY > 0 && view === 'home') switchView('stack');
    else if (event.deltaY < 0 && (shelf.current?.scrollTop || 0) === 0 && view !== 'home') switchView('home');
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.target.closest('.pull,.home-arm,.airmail-flight,.home-settings,.parcel-box')) return;
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY };
  }
  function pointerMove(event) {
    const start = swipe.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (view === 'stack' && Math.abs(dy) > Math.abs(dx) && shelf.current && (dy < 0 || shelf.current.scrollTop > 0)) {
      shelf.current.scrollTop += start.lastY - event.clientY;
      start.lastY = event.clientY;
      return;
    }
    if (Math.abs(dy) < 36 * size.width / 368 || Math.abs(dx) > Math.abs(dy) * .6) return;
    const toStack = view === 'home' && dy < 0;
    const toHome = view !== 'home' && dy > 0 && (shelf.current?.scrollTop || 0) === 0;
    if ((toStack || toHome) && switchView(toStack ? 'stack' : 'home')) {
      swipe.current = null;
      suppress.current = true;
      clearTimeout(suppressTimer.current);
      suppressTimer.current = setTimeout(() => { suppress.current = false; }, 500);
    }
  }
  function tap(item) {
    if (suppress.current) return;
    if (view === 'home') { switchView('stack'); return; }
    setPreview(preview === item.id ? '' : item.id);
  }

  return <div ref={root} className={'home-scene home-view-' + view} onWheel={wheel}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { swipe.current = null; }}
    onPointerCancel={() => { swipe.current = null; }}>
    <div className="home-turntable-scene" inert={view !== 'home'}>
      <HomeTurntable key={latest?.id || 'empty'} album={latest} active={view === 'home'} open={() => latest && openAlbum(latest)} />
    </div>
    <FlyingAirmail delivery={delivery} paused={inboxOpen || view !== 'home'} open={openInbox} />
    <section ref={shelf} className="home-shelf" aria-label="LP 리스트" style={{ '--phone-scale': size.width / 368 }}>
      <div className="home-shelf-content" style={{ height: Math.max(size.height - 70, positions.at(-1).top + positions.at(-1).height + 55) }}>
        {slots.map((item, index) => {
          const position = positions[index];
          const expanded = item && preview === item.id;
          return <div key={item?.id || 'add'} className={'home-slab' + (position.up ? ' slab-up' : '') + (expanded ? ' slab-selected' : '')}
            style={{ top: position.top, '--slab-height': position.height + 'px', '--stagger': (view === 'home' ? slots.length - 1 - index : index) * 38 + 'ms' }}>
            {!item ? <button className="empty-sleeve" disabled={!loaded} onClick={() => { if (!suppress.current) create(); }}>
              <span className="spine">+ Add New Album</span><span className="empty-face"><Icon name="plus" size={25} /></span>
            </button> : !availableOnTurntable(item, today) ? <ParcelShelf album={item} today={today} expanded={expanded}
              toggle={() => tap(item)} unpack={unpack} busy={busy} /> : <>
              <button className="sleeve" aria-expanded={expanded} onClick={() => tap(item)}>
                <span className="spine"><strong>{albumTitle(item)}</strong><span>{dateLabel(item.start)}</span>{item.phase === 'trip' && <i />}</span>
                <SleeveFace album={item} />{item.shared && <SharedTag />}
              </button>
              {expanded && <PullSleeve album={item} open={() => openAlbum(item)} />}
            </>}
          </div>;
        })}
      </div>
    </section>
    <footer className="home-foot">
      <button className="home-settings" aria-label="설정" disabled={!loaded} onClick={settings}><Icon name="settings" size={19} /></button>
    </footer>
    {error && <p className="home-spotify-error error" role="status">{error}</p>}
  </div>;
}
