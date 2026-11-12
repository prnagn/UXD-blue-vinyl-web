import React from 'react';
import { useMedia } from './ui';

// Fixed slots keep old grooves and their pins still as the LP fills inward.
export const grooveRadius = (index) => 47 - Math.min(79, Math.max(0, index)) * 25 / 79;

export function engravedPhotos(album) {
  const grooves = (album?.grooves || []).slice(0, 80);
  const photos = new Map((album?.entries || []).filter((entry) => entry.kind === 'photo').map((photo) => [photo.id, photo]));
  return grooves.flatMap((groove, grooveIndex) => {
    const selected = [...new Set(groove.entryIds || [])].map((id) => photos.get(id)).filter(Boolean);
    const radius = grooveRadius(grooveIndex);
    return selected.map((photo, index) => {
      const angle = (selected.length === 1 ? -55 + grooveIndex % 3 * 22 : -70 + index / (selected.length - 1) * 105) * Math.PI / 180;
      return { photo, grooveIndex, radius, x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle), order: index };
    });
  });
}

function PhotoPin({ pin, fresh }) {
  const image = useMedia(pin.photo);
  if (!image) return null;
  return <figure className={'draft-photo-pin' + (fresh ? ' new-photo-pin' : '')}
    style={{ left: pin.x + '%', top: pin.y + '%', '--pin-delay': (.7 + pin.order * .08) + 's' }}>
    <span className="draft-pin-head"><img src={image} alt={pin.photo.name || '기록 사진'} draggable={false} /></span>
    <span className="draft-pin-stem" /><span className="draft-pin-foot" />
  </figure>;
}

export function DraftPhotoPins({ album, engraving }) {
  const lastGroove = Math.min(album?.grooves?.length || 0, 80) - 1;
  return <div className="draft-photo-pins" aria-label="소리골에 저장된 사진">
    {engravedPhotos(album).map((pin) => <PhotoPin key={pin.grooveIndex + ':' + pin.photo.id} pin={pin} fresh={engraving && pin.grooveIndex === lastGroove} />)}
  </div>;
}
