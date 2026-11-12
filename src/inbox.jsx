import React, { useEffect, useRef } from 'react';
import { albumTitle, Icon, useMedia, Vinyl } from './ui';
import { albumArt } from './archive';

export function Inbox({ items, index, onIndex, close, play, save, discard, busy, notice }) {
  const dialog = useRef(null);
  const delivery = items[index] || items[0];
  const album = delivery.album;
  const photo = useMedia(albumArt(album));

  useEffect(() => { dialog.current.showModal(); }, []);

  return <dialog className="inbox-dialog" ref={dialog} aria-label="받은 LP"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <button className="icon-button delivery-close" aria-label="닫기" onClick={close}><Icon name="close" /></button>
    <div className="delivery-stage" key={delivery.id}>
      <div className="delivery-envelope">
        <Vinyl image={photo} color={album.color || '#d9d9d7'} />
      </div>
    </div>
    <div className="delivery-caption"><h2>{albumTitle(album)}</h2></div>
    {items.length > 1 && <nav className="delivery-nav" aria-label="받은 LP 넘기기">
      <button className="icon-button" aria-label="이전 받은 LP" disabled={index === 0} onClick={() => onIndex(index - 1)}><Icon name="back" size={17} /></button>
      <span>{index + 1} / {items.length}</span>
      <button className="icon-button" aria-label="다음 받은 LP" disabled={index === items.length - 1} onClick={() => onIndex(index + 1)}><Icon name="next" size={17} /></button>
    </nav>}
    <div className="delivery-actions">
      <button className="primary" disabled={busy} onClick={() => play(delivery)}><Icon name="play" size={15} /> 지금 재생</button>
      <button className="secondary delivery-save" disabled={busy} onClick={() => save(delivery)}>선반에 추가</button>
      <button className="secondary delivery-discard" disabled={busy} onClick={() => discard(delivery)}>버리기</button>
    </div>
    {notice && <p className="inbox-notice" role="status">{notice}</p>}
  </dialog>;
}
