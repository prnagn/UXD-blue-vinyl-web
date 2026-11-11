import React, { useRef, useState } from 'react';
import { albumTitle, Icon, useMedia } from './ui';
import { MomentLocation } from './moment-location';
import { MomentCarousel } from './moment-carousel';
import { pendingMoments } from './moment-groups';
import { SpotifyPlayer } from './spotify-player';

export function TripMoment({ album, entries, day, note, setNote, home, capture, press, savePlace, reorder, busy }) {
  const base = pendingMoments(album, entries);
  const [order, setOrder] = useState([]);
  const ids = [...order.filter(id => base.some(group => group.id === id)), ...base.filter(group => !order.includes(group.id)).map(group => group.id)];
  const groups = ids.map(id => base.find(group => group.id === id));
  const initial = useRef(base.at(-1)?.id || 'new');
  const [selectedId, setSelectedId] = useState(initial.current);
  const selected = groups.find(group => group.id === selectedId);
  const [editing, setEditing] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef(null);
  const source = useMedia(selected?.audio);
  const spotify = selected?.spotify;
  const spotifyController = useRef(null);
  const spotifyIntent = useRef(false);
  const activeId = useRef(selectedId);
  activeId.current = selectedId;

  function select(id) {
    audio.current?.pause();
    spotifyIntent.current = false;
    setAmbientPlaying(false); setSpotifyPlaying(false); setError('');
    setSelectedId(id);
  }

  function playSpotify() {
    audio.current?.pause();
    if (spotifyController.current) spotifyController.current.togglePlay();
    else spotifyIntent.current = true;
  }

  async function playPhoto() {
    if (!source) { if (spotify) playSpotify(); return; }
    const media = audio.current;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    try {
      if (await spotifyController.current?.pause() === false) return;
      if (audio.current === media) await media.play();
    } catch { setError('현장음을 재생할 수 없어요.'); }
  }

  async function commitOrder(next, previous) {
    if (next.join('|') === previous.join('|')) return;
    const result = await reorder?.(next);
    if (result === false) setOrder(previous);
  }

  return <div className={'trip-moment' + (editing ? ' moment-ordering' : '')}>
    <header className="moment-capture-header">
      <h1>{albumTitle(album)}</h1>
      <span>MOMENT {(album.grooves || []).length + 1}</span>
      <button className="icon-button" onClick={home} disabled={busy} aria-label="선반으로 돌아가기"><Icon name="list" size={17} /></button>
    </header>
    {selected && <MomentLocation key={selected.id} initialPlace={selected.place} busy={busy} autoLocate={selected.id === initial.current}
      save={(place) => savePlace?.(place, selected.entries.map(entry => entry.id))} />}
    <div className="capture-body">
      <MomentCarousel groups={groups} selectedId={selectedId} select={select} previewOrder={setOrder} commitOrder={commitOrder}
        capture={capture} play={playPhoto} playing={source ? ambientPlaying : spotifyPlaying} busy={busy}
        onEditing={(value) => { setEditing(value); if (value) audio.current?.pause(); }} />
      {spotify && <div className="capture-songs">
        <div className="day-song spotify-song">
          <span className="day-song-disc" aria-hidden="true" /><span className="day-song-info"><strong>{spotify.name}</strong><small>{spotify.artist}</small></span>
          <button className="icon-button" aria-label={spotifyPlaying ? 'Spotify 일시정지' : 'Spotify 재생'} onClick={playSpotify}><Icon name={spotifyPlaying ? 'pause' : 'play'} size={16} /></button>
        </div>
        <SpotifyPlayer key={selected.id} song={spotify} controllerRef={spotifyController}
          onPlaying={(value) => { if (activeId.current === selected.id) setSpotifyPlaying(value); }}
          onReady={(controller) => { if (spotifyIntent.current) { spotifyIntent.current = false; controller.resume(); } }} />
      </div>}
      <label className="capture-note">NOTE
        <textarea rows={2} maxLength={3000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write this moment briefly..." />
      </label>
      <div className="capture-dates"><div className="day-label"><Icon name="calendar" size={15} /> 기록 날짜<time className="capture-date" dateTime={day}>{day}</time></div></div>
      {error && <p className="error" role="status">{error}</p>}
    </div>
    <footer className="capture-footer"><button className="primary" disabled={busy || !groups.length} onClick={press}>PRESS INTO LP</button></footer>
    {source && <audio key={selected.id} ref={audio} src={source} preload="metadata" onPlay={() => setAmbientPlaying(true)} onPause={() => setAmbientPlaying(false)} onEnded={() => setAmbientPlaying(false)} />}
  </div>;
}
