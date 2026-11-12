import React, { useEffect, useRef, useState } from 'react';
import { albumArt } from './archive';
import { albumTitle, Cover, dateLabel, Icon, useMedia, Vinyl } from './ui';

const unfoldTime = 2000;

export function Inbox({ items, index, onIndex, close, play, save, discard, busy, notice, active = true, guided = false }) {
  const dialog = useRef(null);
  const delivery = items[index] || items[0];
  const album = delivery.album;
  const art = useMedia(albumArt(album));
  const [openedId, setOpenedId] = useState('');
  const opened = openedId === delivery.id;
  const previewFirst = guided && delivery.id === 'welcome-paris';

  useEffect(() => {
    const element = dialog.current;
    if (active && !element.open) element.showModal();
    else if (!active && element.open) element.close();
  }, [active]);
  useEffect(() => {
    const timer = setTimeout(() => setOpenedId(delivery.id), unfoldTime);
    return () => clearTimeout(timer);
  }, [delivery.id]);

  return <dialog className={'inbox-dialog' + (opened ? ' letter-opened' : '')} ref={dialog} aria-label="받은 LP" aria-busy={!opened}
    style={{ '--letter-duration': unfoldTime + 'ms' }}
    onCancel={(event) => { event.preventDefault(); if (!previewFirst) close(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !previewFirst) close(); }}>
    {!previewFirst && <button className="icon-button delivery-close" aria-label="닫기" onClick={close}><Icon name="close" /></button>}
    <div className="delivery-stage" key={delivery.id}>
      <div className="delivery-letter">
        <div className="letter-envelope" aria-hidden="true">
          <span className="letter-envelope-flap" />
          <span className="letter-envelope-half envelope-left" />
          <span className="letter-envelope-half envelope-right" />
        </div>
        <div className="letter-left-half" aria-hidden="true">
          <span className="letter-paper letter-top-quarter" />
          <span className="letter-paper letter-bottom-fold" />
        </div>
        <div className="letter-right-fold" aria-hidden="true">
          <span className="letter-paper letter-top-quarter" />
          <span className="letter-paper letter-bottom-fold" />
        </div>
        <div className="letter-crease" aria-hidden="true" />
        <div className="letter-contents">
          <span className="letter-airmail-mark" aria-hidden="true">PAR AVION</span>
          <span className="letter-postmark" aria-hidden="true">{album.city || albumTitle(album)}<small>{dateLabel(album.start)}</small></span>
          <Cover album={album} />
          <Vinyl image={art} color={album.color || '#d9d9d7'} />
        </div>
      </div>
    </div>
    <div className="delivery-details" key={'details-' + delivery.id}>
    <div className="delivery-caption"><h2>{albumTitle(album)}</h2></div>
    {items.length > 1 && !previewFirst && <nav className="delivery-nav" aria-label="받은 LP 넘기기">
      <button className="icon-button" aria-label="이전 받은 LP" disabled={!opened || busy || index === 0} onClick={() => onIndex(index - 1)}><Icon name="back" size={17} /></button>
      <span>{index + 1} / {items.length}</span>
      <button className="icon-button" aria-label="다음 받은 LP" disabled={!opened || busy || index === items.length - 1} onClick={() => onIndex(index + 1)}><Icon name="next" size={17} /></button>
    </nav>}
    <div className="delivery-actions">
      <button className={'primary' + (previewFirst && opened ? ' guided-play' : '')} disabled={busy || !opened} onClick={() => play(delivery)}><Icon name="play" size={15} /> Play now</button>
      {!previewFirst && <>
        <button className="secondary delivery-save" disabled={busy || !opened} onClick={() => save(delivery)}>add to list</button>
        <button className="secondary delivery-discard" disabled={busy || !opened} onClick={() => discard(delivery)}>discard</button>
      </>}
    </div>
    </div>
    {notice && <p className="inbox-notice" role="status">{notice}</p>}
  </dialog>;
}
