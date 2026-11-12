import React, { useState } from 'react';
import { JourneyWheel } from './journey-wheel';
import { Icon, Top, Vinyl } from './ui';

export function BlankRecord({ back, enter, finish, home, record, grooveCount = 0, engraving = false }) {
  const [wheel, setWheel] = useState(false);
  const visibleGrooves = Math.min(grooveCount, 80);
  return <div className="blank-record">
    <Top title="" back={back} action={home || (() => setWheel((open) => !open))} actionLabel={home ? '선반으로 돌아가기' : 'LP 휠 메뉴'} />
    <div className="blank-stage">
      <Vinyl color="#36363a" />
      {grooveCount > 0 && <svg className="engraved-grooves" viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: visibleGrooves }, (_, index) => {
          const radius = 22 + 26 * (index + 1) / (visibleGrooves + 1);
          const isNew = engraving && index === visibleGrooves - 1;
          return <g key={index} className={isNew ? 'new-groove' : undefined}>
            <circle className="groove-shadow" cx="50" cy="50" r={radius - .22} />
            <circle className="groove-edge" cx="50" cy="50" r={radius} pathLength="100" />
          </g>;
        })}
      </svg>}
      {record && <button className="draft-record-trigger" aria-label="LP판 · 다음 순간 기록" onClick={record} />}
      <button className="blank-center" aria-label="LP 가운데 · 휠 메뉴" aria-expanded={wheel} aria-controls="blank-wheel" onClick={() => setWheel((open) => !open)} />
      {record && wheel && <JourneyWheel enter={enter} finish={finish} />}
      {!record && wheel && <div className="blank-wheel" id="blank-wheel">
        <button className="wheel-item wheel-enter" aria-label="Enter information" onClick={enter}>
          <svg viewBox="0 0 180 180" aria-hidden="true"><path id="enter-arc" d="M108 19 A73 73 0 0 1 156 120" fill="none" /><text><textPath href="#enter-arc" startOffset="8%">Enter information</textPath></text></svg>
        </button>
        <button className="wheel-item wheel-finish" aria-label="Finish my album" disabled>
          <svg viewBox="0 0 180 180" aria-hidden="true"><path id="finish-arc" d="M142 144 A73 73 0 0 1 35 139" fill="none" /><text><textPath href="#finish-arc" startOffset="5%">Finish my album</textPath></text></svg>
        </button>
      </div>}
    </div>
  </div>;
}

export function TripDetails({ form, update, save, busy, back }) {
  const [addingLocation, setAddingLocation] = useState(false);
  const location = [form.city, form.country].filter(Boolean).join(', ');
  return <div className="trip-details">
    <header className="details-header">
      <button className="icon-button" onClick={back} aria-label="뒤로"><Icon name="back" /></button>
      <button className="details-save" form="trip-details-form" type="submit" disabled={busy}>Save</button>
    </header>
    <div className="details-disc"><Vinyl color="#36363a" /></div>
    <form id="trip-details-form" className="details-form" onSubmit={save}>
      <label className="lp-name">
        <span>LP Name <small>{form.name.length}/50</small></span>
        <input required maxLength={50} value={form.name} placeholder="Name your album" onChange={(event) => update({ name: event.target.value })} />
      </label>
      <section className="details-schedule">
        <h2><Icon name="clock" size={17} /> Schedule</h2>
        <div className="date-pair">
          <input aria-label="출발일" required type="date" value={form.start} onInput={(event) => update({ start: event.target.value })} />
          <Icon name="next" size={15} />
          <input aria-label="종료일" type="date" value={form.end} min={form.start} onInput={(event) => update({ end: event.target.value })} />
        </div>
      </section>
      <section className="details-location">
        <button type="button" className="location-open" aria-expanded={addingLocation} onClick={() => setAddingLocation((open) => !open)}>
          <Icon name="pin" size={18} /> <span>add location</span><Icon name="search" size={20} />
        </button>
        {addingLocation && <div className="location-fields">
          <div className="field-pair">
            <label>여행지<input maxLength={80} value={form.city} placeholder="Paris" onChange={(event) => update({ city: event.target.value })} /></label>
            <label>나라<input maxLength={80} value={form.country} placeholder="France" onChange={(event) => update({ country: event.target.value })} /></label>
          </div>
          <button className="secondary" type="button" onClick={() => setAddingLocation(false)}>장소 확인</button>
        </div>}
        {location && !addingLocation && <div className="location-entry">
          <span>{location}</span>
          <button className="icon-button" type="button" aria-label="장소 지우기" onClick={() => update({ city: '', country: '' })}><Icon name="minus" size={16} /></button>
        </div>}
      </section>
    </form>
  </div>;
}
