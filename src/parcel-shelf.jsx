import React, { useEffect, useRef, useState } from 'react';
import { parcelState } from './parcel-state';
import { albumTitle, Cover, dateLabel, Icon, useMedia, Vinyl } from './ui';
import { albumArt } from './archive';

const unwrapDuration = 1500;

export function ParcelShelf({ album, today, expanded, toggle, unpack, busy }) {
  const { status, days } = parcelState(album, today);
  const arrived = status === 'arrived';
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const unpackRef = useRef(unpack);
  unpackRef.current = unpack;
  const art = useMedia(albumArt(album));
  const origin = [album.city, album.country].filter(Boolean).join(', ') || albumTitle(album);
  const stamp = album.delivery.arrivesOn?.replaceAll('-', '.') || '';
  const countdown = arrived ? 'D-DAY' : days === null ? '' : 'D-' + days;

  useEffect(() => {
    if (!opening) return;
    let active = true;
    const timer = setTimeout(async () => {
      const saved = await unpackRef.current(album);
      if (active && saved === false) { setOpening(false); setError('포장을 열지 못했어요. 다시 눌러 주세요.'); }
    }, unwrapDuration);
    return () => { active = false; clearTimeout(timer); };
  }, [opening, album.id]);

  function open() {
    if (!arrived || busy || opening) return;
    setError('');
    if (!expanded) toggle();
    setOpening(true);
  }

  return <div className={'parcel-shelf' + (arrived ? ' parcel-arrived' : '') + (opening ? ' parcel-opening' : '')}>
    <button className="sleeve parcel-sleeve" disabled={busy || opening} aria-expanded={expanded || opening}
      aria-label={albumTitle(album) + ' · ' + (arrived ? '배송 완료 · 포장 열기' : '배송 중 · ' + countdown)}
      onClick={arrived ? open : toggle}>
      <span className="spine"><Icon name="plane" size={10} /><strong>{albumTitle(album)}</strong><span>{dateLabel(album.start)}</span></span>
      <span className="parcel-shelf-face" />
    </button>
    {(expanded || opening) && <div className="parcel-preview">
      <div className="parcel-preview-stage">
        <button className="parcel-box" disabled={!arrived || busy || opening} onClick={open}
          aria-label={arrived ? '배송된 LP 포장 열기' : '배송 중인 LP'} style={{ '--unwrap-duration': unwrapDuration + 'ms' }}>
          <span className="parcel-inner" aria-hidden="true"><Cover album={album} /><Vinyl image={art} color={album.color} /></span>
          <span className="parcel-paper parcel-paper-left" /><span className="parcel-paper parcel-paper-right" />
          <span className="parcel-details" aria-hidden="true">
            <span className="parcel-tape vertical" /><span className="parcel-tape horizontal" />
            <span className="parcel-stamp" /><span className="parcel-postmark">{album.city || 'BLUE VINYL'}<b>{dateLabel(album.start)}</b>{album.delivery.destination || 'HOME'}</span>
            <span className="parcel-address">to. {album.delivery.destination || 'me'}<br />from. {origin}</span>
          </span>
        </button>
        <div className="parcel-status" role="status"><span>{arrived ? 'DELIVERED' : 'IN TRANSIT'}</span><strong>{countdown}</strong></div>
      </div>
      <div className="parcel-caption"><strong>{albumTitle(album)}</strong><span>{dateLabel(album.start)}</span></div>
      <p className="parcel-arrival"><Icon name="plane" size={12} />{arrived ? 'DELIVERED' : 'ARRIVES'} {stamp}</p>
      {error && <p className="error" role="status">{error}</p>}
    </div>}
  </div>;
}
