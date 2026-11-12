import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TripDetails } from './trip-details';
import { Icon, Vinyl } from './ui';

const stages = {
  // 1 + 1.5 + .5 + 2 = 5 seconds before the form.
  intro: { duration: 1000, next: 'arriving' },
  arriving: { duration: 1500, next: 'sleeved-intro' },
  'sleeved-intro': { duration: 500, next: 'opening' },
  opening: { duration: 2000, next: 'form' },
  // .9 + .3 + .8 + 1 = 3 seconds after saving.
  closing: { duration: 900, next: 'sleeved' },
  sleeved: { duration: 300, next: 'extracting' },
  extracting: { duration: 800, next: 'growing' },
  growing: { duration: 1000 },
};

export function NewAlbum({ form, update, save, busy, back, complete }) {
  const [phase, setPhase] = useState('intro');
  const onComplete = useRef(complete);
  onComplete.current = complete;
  useEffect(() => {
    const stage = stages[phase];
    if (!stage) return;
    const timer = setTimeout(() => {
      if (stage.next) setPhase(stage.next);
      else onComplete.current();
    }, stage.duration);
    return () => clearTimeout(timer);
  }, [phase]);

  async function submit(event) {
    if (await save(event, false)) {
      // Form scrolling must not shift the sleeve/LP during the return animation.
      container.current?.scrollTo(0, 0);
      setPhase('closing');
    }
  }
  const container = useRef(null);
  useLayoutEffect(() => {
    const element = container.current;
    const measure = () => {
      // Resolve the container-relative midpoint once; transforms use element-relative percentages.
      element.style.setProperty('--pair-top', (element.clientHeight - element.clientWidth * .44) / 2 + 'px');
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const finishing = ['closing', 'sleeved', 'extracting', 'growing'].includes(phase);
  return <div ref={container} className={'new-album new-album-' + phase} style={{ '--stage-duration': (stages[phase]?.duration || 0) + 'ms' }}>
    <div className="new-album-disc" aria-hidden="true"><Vinyl color="#36363a" /></div>
    <div className="new-album-cover" aria-hidden="true">
      <div className="new-album-title"><b>{form.name || 'New Journey'}</b><small>BLANK LP · SIDE A</small></div>
    </div>
    <header className="new-album-header">
      <button className="icon-button" disabled={busy || finishing} onClick={back} aria-label="선반으로 돌아가기"><Icon name="back" /></button>
      {phase === 'form' && <button className="details-save" form="trip-details-form" type="submit" disabled={busy}>Save</button>}
    </header>
    {phase === 'form' && <div className="new-album-information">
      <TripDetails form={form} update={update} save={submit} busy={busy} embedded />
    </div>}
  </div>;
}
