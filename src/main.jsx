import React, { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { addDelivery, albumArt, albumFile, completeWelcomePreview, deliverySchedule, ensureWelcomeDelivery, importAlbum, loadAlbums, loadInbox, localDay, localTime, resetArchive, resolveDelivery, saveAlbum, trackArt, visibleShelfAlbums, welcomePreviewRequired } from './archive';
import { AlbumPlayer } from './album-player';
import { ArtPicker } from './art-picker';
import { BlankRecord, TripDetails } from './trip-details';
import { NewAlbum } from './new-album';
import { HomeScene } from './home-scene';
import Boot from './boot';
import { availableOnTurntable, parcelState } from './parcel-state';
import { JourneyConfirm, PressCompleted, PressRecord } from './press-record';
import { LazyScreen } from './lazy-screen';
import { TripMoment } from './trip-moment';
import { LiveCapture } from './live-capture';
import { useSpotify } from './spotify';
import { SpotifyPlaybackContext } from './spotify-context';
import { reorderMoments } from './moment-groups';
import { Inbox } from './inbox';
import { Arm, Icon, Plane, Top, Vinyl, albumTitle, entryIcons, useMedia } from './ui';
import { Recorder, TrackMedia } from './recorder';
import './style.css';
import './home.css';
import './boot.css';

const TravelMap = lazy(() => import('./map').then((module) => ({ default: module.TravelMap })));
const ShippingScreen = lazy(() => import('./shipping').then((module) => ({ default: module.ShippingScreen })));
const ReturnMail = lazy(() => import('./shipping').then((module) => ({ default: module.ReturnMail })));

const newTrip = () => ({ name: '', city: '', country: '', start: localDay(), end: '' });
const kindName = { photo: '사진', audio: '소리', video: '영상', memo: '메모' };
const colors = ['#9da5b6', '#b99086', '#86a198', '#ae9cae'];
const incoming = (album) => ({ id: crypto.randomUUID(), album, receivedAt: Date.now() });

function App() {
  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState('home');
  const [id, setId] = useState('');
  const [sheet, setSheet] = useState('');
  const [form, setForm] = useState(newTrip);
  const [editingDetails, setEditingDetails] = useState(false);
  const [engraving, setEngraving] = useState(false);
  const [draftEntering, setDraftEntering] = useState(false);
  const [reviewFrom, setReviewFrom] = useState('trip');
  const [pressFrom, setPressFrom] = useState('review');
  const [preview, setPreview] = useState('');
  const [inbox, setInbox] = useState([]);
  const [inboxIndex, setInboxIndex] = useState(0);
  const [welcomeRequired, setWelcomeRequired] = useState(false);
  const [previewDelivery, setPreviewDelivery] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [reviewDay, setReviewDay] = useState(localDay);
  const [today, setToday] = useState(localDay);
  const [momentNote, setMomentNote] = useState('');
  const [trackId, setTrackId] = useState('');
  const [playing, setPlaying] = useState(false);
  const [memo, setMemo] = useState('');
  const [editId, setEditId] = useState('');
  const [artTrackId, setArtTrackId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const main = useRef(null);
  const resumedSpotify = useRef('');
  const spotify = useSpotify(page === 'trip' || page === 'moment-summary');

  useEffect(() => {
    let active = true;
    loadAlbums().then((albums) => { if (active) setRecords(albums); })
      .catch(() => { if (active) setNotice('브라우저의 저장 공간을 열 수 없어요.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    let active = true;
    const receiving = new Set();
    async function refreshInbox() {
      try {
        await ensureWelcomeDelivery();
        const [items, required] = await Promise.all([loadInbox(), welcomePreviewRequired()]);
        if (active) { setInbox(items); setWelcomeRequired(required); }
      } catch {
        if (active) setNotice('받은 LP를 불러오지 못했어요.');
      }
    }
    async function receiveLink() {
      const hash = window.location.hash;
      if (!hash.startsWith('#lp=') || receiving.has(hash)) return;
      receiving.add(hash);
      try {
        if (hash.length > 12000) throw new Error('링크가 너무 길어요.');
        const item = await importAlbum(new Blob([decodeURIComponent(hash.slice(4))]));
        const delivery = incoming(item);
        await addDelivery(delivery);
        if (!active) return;
        setInbox((items) => [delivery, ...items]);
        setInboxIndex(0);
        setPreviewDelivery(null);
        setPlaying(false);
        setPage('home');
        setSheet('');
        if (window.location.hash === hash) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = '';
          window.history.replaceState(null, '', cleanUrl);
        }
      } catch {
        if (active) setNotice('공유 링크에서 LP를 열 수 없어요.');
      } finally {
        receiving.delete(hash);
      }
    }
    refreshInbox().then(receiveLink);
    window.addEventListener('hashchange', receiveLink);
    return () => { active = false; window.removeEventListener('hashchange', receiveLink); };
  }, [loaded]);
  useEffect(() => { main.current?.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    let timer;
    function syncToday() {
      setToday(localDay());
      const next = new Date();
      next.setHours(24, 0, 0, 50);
      clearTimeout(timer);
      timer = setTimeout(syncToday, next.getTime() - Date.now());
    }
    syncToday();
    window.addEventListener('focus', syncToday);
    return () => { window.removeEventListener('focus', syncToday); clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5500);
    return () => clearTimeout(timer);
  }, [notice]);

  const albums = visibleShelfAlbums(records);
  const shelfAlbums = albums;
  const album = previewDelivery?.album || albums.find((item) => item.id === id);
  const cover = useMedia(albumArt(album));
  const latestPhoto = album?.entries.findLast((entry) => entry.kind === 'photo');
  const pressArt = album?.art || (latestPhoto ? { trackId: latestPhoto.id } : undefined);
  const pressPhoto = useMedia(pressArt ? albumArt({ ...album, art: pressArt }) : undefined);
  const orderedEntries = (album?.entries || []).slice().sort((a, b) => a.day.localeCompare(b.day));
  const days = [...new Set([today, reviewDay, ...orderedEntries.map((entry) => entry.day)])].filter(Boolean).sort();
  const tracks = page === 'review' ? orderedEntries.filter((entry) => entry.day === reviewDay) : orderedEntries;
  const track = tracks.find((item) => item.id === trackId) || tracks[0];
  const trackIndex = tracks.indexOf(track);
  const chosenArt = useMedia(trackArt(album, track));
  const artTrack = album?.entries.find((entry) => entry.id === artTrackId);

  const go = useCallback((next) => {
    setSheet('');
    setPlaying(false);
    setEngraving(false);
    setDraftEntering(false);
    setPage(next);
  }, []);
  const showShipping = useCallback(() => go('shipping'), [go]);
  useEffect(() => {
    if (!loaded || !spotify.resumeAlbumId || resumedSpotify.current === spotify.resumeAlbumId) return;
    resumedSpotify.current = spotify.resumeAlbumId;
    if (!records.some((item) => item.id === spotify.resumeAlbumId && item.phase === 'trip')) return;
    setId(spotify.resumeAlbumId);
    go('trip');
  }, [loaded, spotify.resumeAlbumId, records, go]);

  function openAlbum(item) {
    if (!availableOnTurntable(item, today)) {
      go('home'); setPreview(item.id);
      return;
    }
    setPreviewDelivery(null);
    setShareLink('');
    setId(item.id);
    setMomentNote('');
    setTrackId('');
    const next = item.phase === 'pressed' ? 'play' : (item.grooves?.length || !item.entries.length) ? 'draft-disc' : 'trip';
    go(next);
    setDraftEntering(next === 'draft-disc');
  }

  async function persist(value, next) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      await saveAlbum(value);
      setRecords((current) => [value, ...current.filter((item) => item.id !== value.id)]);
      setId(value.id);
      if (next) go(next);
      return true;
    } catch {
      setNotice('저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.');
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function createTrip(event, navigate = true) {
    event.preventDefault();
    if (!form.name.trim() || (form.end && form.end < form.start)) {
      setNotice('LP 이름과 일정을 확인해 주세요.');
      return;
    }
    const details = {
      ...form, name: form.name.trim(), city: form.city.trim(), country: form.country.trim(),
    };
    if (editingDetails) {
      await persist({ ...album, ...details }, 'draft-disc');
      return;
    }
    setMomentNote('');
    return persist({
      ...details, id: crypto.randomUUID(), entries: [], phase: 'trip', shelfAddedAt: Date.now(),
      color: colors[records.length % colors.length],
    }, navigate ? 'draft-disc' : undefined);
  }

  async function addEntry(entry) {
    const now = new Date();
    const next = { id: crypto.randomUUID(), ...entry, day: localDay(now), time: entry.time || localTime(now) };
    if (await persist({ ...album, entries: [...album.entries, next] }, 'moment-summary')) setTrackId(next.id);
  }

  async function saveLiveCapture(capture) {
    const sequence = album.entries.some((entry) => Number.isFinite(entry.sequence))
      ? album.entries.reduce((max, entry, index) => Math.max(max, entry.sequence ?? index), -1) + 1 : undefined;
    const stamp = { day: localDay(capture.at), time: localTime(capture.at), captureId: crypto.randomUUID(), spotify: capture.spotify || undefined, sequence };
    const photoId = capture.photo ? crypto.randomUUID() : undefined;
    const entries = [];
    if (capture.photo) entries.push({ ...stamp, id: photoId, kind: 'photo', name: '여행의 순간', blob: capture.photo });
    if (capture.audio) entries.push({
      ...stamp, id: crypto.randomUUID(), kind: 'audio', name: '현장의 소리', fieldRecording: true,
      blob: capture.audio, durationMs: capture.durationMs, waveform: capture.waveform,
      art: photoId ? { trackId: photoId } : undefined,
    });
    if (!entries.length) return true;
    return persist({ ...album, entries: [...album.entries, ...entries] });
  }

  async function pressMoment() {
    const now = new Date();
    const day = localDay(now);
    const grooves = album.grooves || [];
    const engravedIds = new Set(grooves.flatMap((groove) => groove.entryIds));
    const note = momentNote.trim();
    const entries = note ? [...album.entries, {
      id: crypto.randomUUID(), day, time: localTime(now), kind: 'memo', name: '여행 메모', note,
    }] : album.entries;
    const pending = new Map();
    for (const entry of entries) {
      if (engravedIds.has(entry.id)) continue;
      const date = entry.day || day;
      if (!pending.has(date)) pending.set(date, []);
      pending.get(date).push(entry.id);
    }
    if (!pending.size) { go('draft-disc'); return; }
    const newGrooves = [...pending].sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entryIds]) => ({ day: date, entryIds }));
    if (await persist({ ...album, entries, grooves: [...grooves, ...newGrooves] }, 'draft-disc')) {
      setMomentNote('');
      setEngraving(true);
    }
  }

  async function saveMomentPlace(place, ids) {
    const engraved = new Set((album.grooves || []).flatMap((groove) => groove.entryIds));
    const selected = ids ? new Set(ids) : null;
    return persist({ ...album, entries: album.entries.map((entry) => entry.day === today && !engraved.has(entry.id) && (!selected || selected.has(entry.id)) ? { ...entry, place } : entry) });
  }

  function attach(event, fieldRecording = false) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const kind = { image: 'photo', audio: 'audio', video: 'video' }[file.type.split('/')[0]];
    if (!kind) { setNotice('사진, 오디오 또는 영상 파일을 선택해 주세요.'); return; }
    if (file.size > 35 * 1024 * 1024) { setNotice('35MB 이하 파일을 선택해 주세요.'); return; }
    addEntry({ kind, name: file.name.replace(/\.[^.]+$/, ''), blob: file, fieldRecording });
  }

  function review() {
    setReviewFrom(page);
    const hasToday = orderedEntries.some((entry) => entry.day === today);
    setReviewDay(page === 'draft-disc' && !hasToday ? album.grooves?.at(-1)?.day || today : today);
    setTrackId('');
    go('review');
  }

  function finishAlbum() {
    setSheet('finish-journey');
  }

  function confirmJourney() {
    setPressFrom(page);
    go('press');
  }

  function pressAlbum() {
    return persist({
      ...album, phase: 'pressed', completedAt: new Date().toISOString(), art: pressArt,
      end: album.end || (today < album.start ? album.start : today), delivery: deliverySchedule(),
    }, 'complete');
  }

  async function saveDelivery(delivery) {
    if (await persist({ ...album, delivery })) goHome();
  }

  async function unpackAlbum(item) {
    if (parcelState(item, today).status !== 'arrived') return false;
    const saved = await persist({ ...item, delivery: { ...item.delivery, unpackedAt: new Date().toISOString() } });
    if (saved) setPreview(item.id);
    return saved;
  }

  function editDraftDetails() {
    setForm({ name: album.name || albumTitle(album), city: album.city, country: album.country, start: album.start, end: album.end });
    setEditingDetails(true);
    go('create');
  }

  function playTrack(entry) {
    setPlaying(false);
    setTrackId(entry.id);
  }

  async function moveTrack(entry, delta) {
    const entries = [...album.entries];
    const sameDay = entries.filter((item) => item.day === entry.day);
    const swap = sameDay[sameDay.indexOf(entry) + delta];
    if (!swap) return;
    const a = entries.indexOf(entry);
    const b = entries.indexOf(swap);
    [entries[a], entries[b]] = [entries[b], entries[a]];
    await persist({ ...album, entries });
  }

  function openMemo(entry) {
    setEditId(entry?.id || '');
    setMemo(entry?.note || '');
    setSheet('memo');
  }

  async function saveMemo(event) {
    event.preventDefault();
    if (!memo.trim()) return;
    if (!editId) { await addEntry({ kind: 'memo', name: '여행 메모', note: memo.trim() }); return; }
    const entries = album.entries.map((entry) => entry.id === editId ? { ...entry, note: memo.trim() } : entry);
    if (await persist({ ...album, entries })) setSheet('');
  }

  function chooseArt(entry) {
    setArtTrackId(entry?.id || '');
    setSheet('art');
  }

  async function saveArt(art) {
    const updated = artTrack
      ? { ...album, entries: album.entries.map((entry) => entry.id === artTrack.id ? { ...entry, art } : entry) }
      : { ...album, art };
    if (await persist(updated)) setSheet('');
  }

  function uploadArt(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 35 * 1024 * 1024) {
      setNotice('35MB 이하의 사진 파일을 선택해 주세요.');
      return;
    }
    saveArt({ blob: file });
  }

  async function downloadAlbum() {
    setBusy(true);
    try {
      const file = await albumFile(album);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice('앨범 파일을 내보냈어요.');
    } catch {
      setNotice('앨범 파일을 저장하지 못했어요.');
    } finally { setBusy(false); }
  }

  function playDelivery(delivery) {
    setPreviewDelivery(delivery);
    setTrackId(delivery.album.entries.find(({ kind }) => kind === 'audio' || kind === 'video')?.id || '');
    go('play');
  }

  async function finishDelivery(delivery, keep) {
    if (welcomeRequired && delivery.id === 'welcome-paris') return;
    if (saving.current || busy) return;
    saving.current = true;
    setBusy(true);
    try {
      const saved = await resolveDelivery(delivery, keep);
      if (keep) {
        const item = saved;
        setRecords((items) => [item, ...items.filter((record) => record.id !== item.id)]);
        setPreview('');
      }
      setInbox((items) => items.filter((item) => item.id !== delivery.id));
      setInboxIndex(0);
      if (sheet === 'inbox' && (keep || inbox.length === 1)) setSheet('');
      if (keep && previewDelivery) {
        setId(delivery.album.id);
        setPreviewDelivery(null);
      }
      if (keep) setNotice('받은 LP를 내 선반에 담았어요.');
    } catch {
      setNotice('받은 LP를 처리하지 못했어요. 다시 시도해 주세요.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function makeShareLink() {
    setBusy(true);
    try {
      const file = await albumFile(album);
      if (file.size > 11996) throw new Error();
      const hash = 'lp=' + encodeURIComponent(await file.text());
      if (hash.length >= 12000) throw new Error();
      const url = new URL(window.location.href);
      url.hash = hash;
      setShareLink(url.href);
    } catch {
      setNotice('이 LP는 공유 링크로 만들기에는 커요.');
    } finally {
      setBusy(false);
    }
  }

  const goHome = () => { setPreview(''); setPreviewDelivery(null); go('home'); };
  const latest = shelfAlbums.find((item) => item.phase === 'pressed' && availableOnTurntable(item, today));
  const homeDelivery = (welcomeRequired && inbox.find(item => item.id === 'welcome-paris')) || inbox[0];
  const returnFromPlayer = () => {
    if (previewDelivery) {
      const returnedId = previewDelivery.id;
      if (welcomeRequired && returnedId === 'welcome-paris') {
        setWelcomeRequired(false);
        completeWelcomePreview().catch(() => setNotice('첫 재생 안내를 완료한 상태를 저장하지 못했어요.'));
      }
      setPreviewDelivery(null);
      go('home');
      const index = inbox.findIndex(item => item.id === returnedId);
      if (index >= 0) { setInboxIndex(index); setSheet('inbox'); }
    } else go(page === 'review' ? reviewFrom : 'home');
  };

  async function formatArchive() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await resetArchive(() => setNotice('다른 Blue Vinyl 창을 닫으면 초기화를 완료합니다.'));
      await ensureWelcomeDelivery();
      const freshInbox = await loadInbox();
      setWelcomeRequired(await welcomePreviewRequired());
      setRecords([]); setInbox(freshInbox); setId(''); setMomentNote(''); setTrackId('');
      setPreview(''); setPreviewDelivery(null); setShareLink('');
      go('home');
      setNotice('기록을 초기화했어요.');
    } catch (failure) { setNotice(failure.message || '기록을 초기화하지 못했어요.'); }
    finally { saving.current = false; setBusy(false); }
  }

  return <SpotifyPlaybackContext.Provider value={{ ...spotify, openSettings: () => setSheet('settings') }}><div className="desk">
    <aside className="desk-brand" aria-hidden="true"><Icon name="disc" size={26} /><span>BLUE VINYL</span><small>TRAVEL RECORDS</small></aside>
    <div className={'app ' + (page === 'home' ? 'home-app' : '')}>
      <Boot>
      <main className={'screen ' + page} ref={main}>
        {page === 'home' && <HomeScene albums={shelfAlbums} latest={latest} openAlbum={openAlbum}
          delivery={homeDelivery} guided={welcomeRequired} inboxOpen={sheet === 'inbox'} openInbox={() => { setInboxIndex(Math.max(0, inbox.indexOf(homeDelivery))); setSheet('inbox'); }}
          preview={preview} setPreview={setPreview} today={today} unpack={unpackAlbum} busy={busy} loaded={loaded}
          create={() => { setForm(newTrip()); setEditingDetails(false); go('blank'); }}
          settings={() => { setNotice(''); setSheet('settings'); }} error={spotify.error} />}

        {page === 'blank' && <NewAlbum form={form} update={(patch) => setForm((value) => ({ ...value, ...patch }))}
          save={createTrip} busy={busy} back={goHome} complete={() => go('draft-disc')} />}
        {page === 'draft-disc' && album && <BlankRecord album={album} enter={editDraftDetails} finish={finishAlbum}
          home={goHome} record={() => go('trip')} grooveCount={album.grooves?.length || 0} engraving={engraving}
          entering={draftEntering} entered={() => setDraftEntering(false)} />}
        {page === 'create' && <TripDetails form={form} update={(patch) => setForm((value) => ({ ...value, ...patch }))}
          save={createTrip} busy={busy} back={() => go(editingDetails ? 'draft-disc' : 'blank')} />}

        {page === 'trip' && album && <LiveCapture album={album} entries={orderedEntries.filter((entry) => entry.day === today)}
          save={saveLiveCapture} next={() => go('moment-summary')} home={goHome}
          spotify={spotify.track} prepareRecording={spotify.prepareRecording} busy={busy} />}
        {page === 'moment-summary' && album && <TripMoment album={album} entries={orderedEntries.filter((entry) => entry.day === today)}
          day={today}
          note={momentNote} setNote={setMomentNote} home={goHome}
          capture={() => go('trip')} press={pressMoment} savePlace={saveMomentPlace} reorder={(ids) => persist(reorderMoments(album, ids))} busy={busy} />}

        {page === 'record' && album && <>
          <Top title="FIELD RECORDING" back={() => go('trip')} />
          <div className="record-title"><p className="eyebrow">CAPTURE A SOUND</p><h1>{albumTitle(album)}</h1><p className="muted">{today}</p></div>
          <div className="record-stage"><Vinyl color={album.color} image={cover} /><Arm /></div>
          <Recorder onSave={(blob) => addEntry({ kind: 'audio', name: '현장의 소리', blob, fieldRecording: true })}
            onFile={(event) => attach(event, true)} />
        </>}

        {page === 'play' && album && <AlbumPlayer key={album.id} album={album}
          tracks={tracks} track={track} selectedId={trackId} onTrack={playTrack} back={returnFromPlayer} busy={busy} autoStart={Boolean(previewDelivery)}
          send={previewDelivery ? undefined : () => { setNotice(''); go('send-lp'); }}
          save={previewDelivery && !(welcomeRequired && previewDelivery.id === 'welcome-paris') ? () => finishDelivery(previewDelivery, true) : undefined} />}
        {page === 'send-lp' && album && <LazyScreen back={() => go('play')}><ReturnMail album={album} back={() => go('play')}
          createLink={['http:', 'https:'].includes(window.location.protocol) ? makeShareLink : undefined}
          shareLink={shareLink} download={downloadAlbum} busy={busy} /></LazyScreen>}

        {page === 'review' && album && <>
          <Top title="TODAY’S TRACK" back={returnFromPlayer} action={() => setSheet('edit')} actionIcon="edit" actionLabel="트랙 편집" />
          <div className="player-art"><Vinyl color={album.color} image={chosenArt} playing={playing} /><Arm /></div>
          <section className="content player-content">
            <p className="eyebrow">DAILY REPLAY</p>
            <h1>오늘의 트랙 감상</h1>
            <label className="day-label"><Icon name="calendar" size={16} /> 날짜<select value={reviewDay} onChange={(event) => { setReviewDay(event.target.value); setTrackId(''); setPlaying(false); }}>
              {days.map((value) => <option key={value}>{value}</option>)}
            </select></label>
            <div className="media-card">
              <div className="track-meta"><span>{track ? String(trackIndex + 1).padStart(2, '0') + ' / ' + String(tracks.length).padStart(2, '0') : '00 / 00'}</span><span>{track ? track.day : reviewDay}</span></div>
              {track && <h2>{track.name}</h2>}
              <TrackMedia key={track?.id} entry={track} onPlay={setPlaying} />
              {tracks.length > 1 && <div className="transport">
                <button className="icon-button" aria-label="이전 트랙" disabled={trackIndex <= 0} onClick={() => playTrack(tracks[trackIndex - 1])}><Icon name="back" /></button>
                <button className="icon-button" aria-label="다음 트랙" disabled={trackIndex >= tracks.length - 1} onClick={() => playTrack(tracks[trackIndex + 1])}><Icon name="next" /></button>
              </div>}
            </div>
            <TrackList entries={tracks} current={track?.id} onSelect={playTrack} hideEmpty />
            <div className="bottom-actions">
              <button className="secondary" onClick={() => go('trip')}>여행 계속</button>
              <button className="primary" onClick={finishAlbum}>여행 끝 <Icon name="next" size={16} /></button>
            </div>
          </section>
        </>}

        {page === 'press' && album && <PressRecord photo={pressPhoto} busy={busy} back={() => go(pressFrom)}
          choose={() => chooseArt()} complete={pressAlbum} />}
        {page === 'complete' && album && <PressCompleted album={album} photo={cover} next={showShipping} />}
        {page === 'shipping' && album?.delivery && <LazyScreen back={goHome}><ShippingScreen album={album} busy={busy} save={saveDelivery} /></LazyScreen>}
        {page === 'map' && <LazyScreen back={goHome}><TravelMap albums={shelfAlbums.filter((item) => item.phase === 'pressed')} back={goHome} open={openAlbum} /></LazyScreen>}
      </main>
      </Boot>

      {(sheet === 'inbox' || previewDelivery) && inbox.length > 0 && <Inbox items={inbox} index={inboxIndex} onIndex={setInboxIndex}
        active={sheet === 'inbox'} guided={welcomeRequired} close={() => setSheet('')}
        play={playDelivery} save={(delivery) => finishDelivery(delivery, true)}
        discard={(delivery) => finishDelivery(delivery, false)} busy={busy} notice={notice} />}
      {sheet === 'finish-journey' && <JourneyConfirm confirm={confirmJourney} close={() => setSheet('')} />}
      {sheet && sheet !== 'inbox' && sheet !== 'finish-journey' && <Sheet key={sheet} busy={busy} close={() => { if (!busy) setSheet(''); }} title={{
        settings: '설정', format: '기록 초기화',
        add: '트랙 추가', memo: editId ? '메모 편집' : '여행 메모',
        edit: '트랙 편집', art: artTrack ? '트랙 사진 선택' : 'LP 커버 선택',
      }[sheet]}>
        {sheet === 'settings' && <>
          <button className="sheet-row" disabled={spotify.connecting} onClick={() => spotify.connected && !spotify.needsReconnect ? spotify.disconnect() : spotify.connect(album?.phase === 'trip' ? album.id : '')}>
            <Icon name="audio" />{spotify.needsReconnect ? 'Spotify 다시 연결' : spotify.connected ? 'Spotify 연결 해제' : 'Spotify 연결'}
          </button>
          <button className="sheet-row" onClick={() => { setNotice(''); setSheet('format'); }}><Icon name="reset" />기록 초기화</button>
          {spotify.error && <p className="error" role="status">{spotify.error}</p>}
        </>}
        {sheet === 'format' && <div className="format-confirm">
          <h3>Do you want format?</h3>
          <div><button className="primary" disabled={busy} onClick={formatArchive}>yes</button><button className="secondary" disabled={busy} onClick={() => setSheet('settings')}>no</button></div>
        </div>}
        {sheet === 'art' && album && <ArtPicker album={album} track={artTrack} choose={saveArt} upload={uploadArt} busy={busy} />}
        {sheet === 'add' && <>
          <label className="sheet-row file-label"><Icon name="camera" /> 사진 추가<input type="file" accept="image/*" onChange={attach} /></label>
          <label className="sheet-row file-label"><Icon name="video" /> 영상 추가<input type="file" accept="video/*" onChange={attach} /></label>
          <button className="sheet-row" onClick={() => openMemo()}><Icon name="memo" /> 메모 추가</button>
        </>}
        {sheet === 'memo' && <form className="memo-form" onSubmit={saveMemo}>
          <label>기억하고 싶은 순간<textarea required maxLength={3000} rows={5} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="지금 보고 듣고 느낀 것을 적어보세요." /></label>
          <button type="submit" className="primary" disabled={busy || !memo.trim()}>메모 저장</button>
        </form>}
        {sheet === 'edit' && <>
          <p className="muted">트랙 사진을 고르고, 메모와 재생 순서를 편집할 수 있어요.</p>
          {tracks.length === 0 && <p className="muted">편집할 트랙이 없어요.</p>}
          {tracks.map((entry, index) => <div className="edit-row" key={entry.id}>
            <Icon name={entryIcons[entry.kind]} /><span>{entry.name}</span>
            <button className="icon-button" onClick={() => chooseArt(entry)} aria-label={entry.name + ' 사진 선택'}><Icon name="camera" size={16} /></button>
            {entry.kind === 'memo' && <button className="icon-button" onClick={() => openMemo(entry)} aria-label="메모 수정"><Icon name="edit" size={16} /></button>}
            <button className="icon-button" disabled={busy || index === 0} onClick={() => moveTrack(entry, -1)} aria-label="위로 이동"><Icon name="up" size={16} /></button>
            <button className="icon-button" disabled={busy || index === tracks.length - 1} onClick={() => moveTrack(entry, 1)} aria-label="아래로 이동"><Icon name="down" size={16} /></button>
          </div>)}
        </>}
        {notice && <p className="error" role="status">{notice}</p>}
      </Sheet>}
      {notice && !sheet && <div className="toast" role="status">{notice}</div>}
    </div>
  </div></SpotifyPlaybackContext.Provider>;
}

function Sheet({ title, close, children, busy }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog className="sheet-dialog" ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby="sheet-title">
    <section className="sheet">
      <header><h2 id="sheet-title">{title}</h2><button className="icon-button" aria-label="닫기" disabled={busy} onClick={close}><Icon name="close" /></button></header>
      {children}
    </section>
  </dialog>;
}

function TrackList({ entries, current, onSelect, hideEmpty }) {
  if (!entries.length) return hideEmpty ? null : <p className="empty-track">이 날의 첫 트랙을 추가해 보세요.</p>;
  return <ol className="track-list">{entries.map((entry, index) => <li key={entry.id}>
    <button onClick={() => onSelect(entry)} aria-current={current === entry.id ? 'true' : undefined}>
      <span className="track-no">{String(index + 1).padStart(2, '0')}</span><Icon name={entryIcons[entry.kind]} size={17} />
      <span className="track-name">{entry.name}</span><small>{kindName[entry.kind]}</small><Icon name="next" size={15} />
    </button>
  </li>)}</ol>;
}

createRoot(document.getElementById('root')).render(<App />);
