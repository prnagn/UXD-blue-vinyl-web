import React, { useEffect, useRef, useState } from 'react';
import { TripDetails } from './trip-details';
import { Icon, Vinyl } from './ui';

export function NewAlbum({ form, update, save, busy, back, complete }) {
  const [phase, setPhase] = useState('intro');
  const onComplete = useRef(complete);
  onComplete.current = complete;
  useEffect(() => {
    if (phase === 'form') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => {
      if (phase === 'intro') setPhase('form');
      else onComplete.current();
    }, reduced ? 0 : phase === 'intro' ? 1800 : 1600);
    return () => clearTimeout(timer);
  }, [phase]);

  async function submit(event) {
    if (await save(event, false)) setPhase('leaving');
  }
  return <div className={'new-album new-album-' + phase}>
    <div className="new-album-disc" aria-hidden="true"><Vinyl color="#36363a" /></div>
    <div className="new-album-cover">
      <div className="new-album-title" aria-hidden={phase === 'form'}><b>{form.name || 'New Journey'}</b><small>BLANK LP · SIDE A</small></div>
      {phase === 'form' && <TripDetails form={form} update={update} save={submit} busy={busy} back={back} sleeve />}
    </div>
    {phase !== 'form' && <button className="icon-button new-album-back" disabled={busy || phase === 'leaving'} onClick={back} aria-label="선반으로 돌아가기"><Icon name="back" /></button>}
  </div>;
}
