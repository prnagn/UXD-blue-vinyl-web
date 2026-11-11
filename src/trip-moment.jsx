import React from 'react';
import { albumTitle, Icon, useMedia } from './ui';

export function TripMoment({ album, entries, day, note, setNote, home, capture, press, busy }) {
  const grooves = album.grooves || [];
  const engravedIds = new Set(grooves.flatMap((groove) => groove.entryIds));
  const photo = useMedia(entries.findLast((entry) => entry.kind === 'photo' && !engravedIds.has(entry.id)));
  const spotify = entries.findLast((entry) => !engravedIds.has(entry.id) && entry.spotify)?.spotify;
  return <div className="trip-moment">
    <header className="moment-capture-header">
      <h1>{albumTitle(album)}</h1>
      <span>MOMENT {grooves.length + 1}</span>
      <button className="icon-button" onClick={home} disabled={busy} aria-label="선반으로 돌아가기"><Icon name="list" size={17} /></button>
    </header>
    <div className="capture-body">
      <button className={'capture-photo' + (photo ? ' captured' : '')} onClick={capture} aria-label="사진 촬영 화면 열기" disabled={busy}>
        {photo && <img src={photo} alt="현재 순간 사진" />}
        <span className="capture-trigger"><Icon name="camera" size={23} /></span>
        {!photo && <span>사진 찍기</span>}
      </button>
      {spotify && <div className="capture-songs">
        <a className="day-song spotify-song" href={spotify.url} target="_blank" rel="noreferrer">
          <span className="day-song-disc" aria-hidden="true" /><span className="day-song-info"><strong>{spotify.name}</strong><small>{spotify.artist}</small></span><Icon name="play" size={16} />
        </a>
      </div>}
      <label className="capture-note">NOTE
        <textarea rows={2} maxLength={3000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write this moment briefly..." />
      </label>
      <div className="capture-dates">
        <div className="day-label"><Icon name="calendar" size={15} /> 기록 날짜<time className="capture-date" dateTime={day}>{day}</time></div>
      </div>
    </div>
    <footer className="capture-footer"><button className="primary" disabled={busy} onClick={press}>PRESS INTO LP</button></footer>
  </div>;
}
