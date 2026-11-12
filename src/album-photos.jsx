import React, { useEffect, useRef, useState } from 'react';
import { Icon, useMedia } from './ui';

const places = [
  [72, 17, 12], [83, 51, -11], [64, 79, 8], [34, 14, -14],
  [92, 28, 17], [88, 79, -7], [38, 83, -12], [65, 42, 9],
];

function PhotoPrint({ entry, index, open }) {
  const photo = useMedia(entry);
  const [x, y, rotation] = places[index];
  return <button className="scattered-photo" style={{ '--photo-x': x + '%', '--photo-y': y + '%', '--photo-angle': rotation + 'deg', '--photo-order': index }}
    aria-label={(entry.name || '여행') + ' · 사진 크게 보기'} onClick={() => open(entry)}>
    {photo && <img src={photo} alt="" draggable={false} />}
  </button>;
}

function PhotoPreview({ entry, close }) {
  const dialog = useRef(null);
  const photo = useMedia(entry);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="album-photo-preview" aria-label="여행 사진" onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <button className="icon-button" aria-label="사진 닫기" onClick={close}><Icon name="close" /></button>
    {photo && <img src={photo} alt={entry.name || '여행 사진'} />}
  </dialog>;
}

export function ScatteredPhotos({ entries, currentPhoto }) {
  const [selected, setSelected] = useState(null);
  const photos = entries.filter((entry) => entry.kind === 'photo' && (entry.blob || entry.src) && entry.id !== currentPhoto?.id).slice(0, places.length);
  return <>
    <div className="scattered-photos" aria-label="앨범 속 다른 사진">
      {photos.map((entry, index) => <PhotoPrint key={entry.id} entry={entry} index={index} open={setSelected} />)}
    </div>
    {selected && <PhotoPreview entry={selected} close={() => setSelected(null)} />}
  </>;
}
