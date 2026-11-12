import React, { useEffect, useMemo, useRef } from 'react';
import { useCaptureSession } from './capture-session';
import { Icon, useMedia } from './ui';

function CaptureLines({ session, entries, holding, showGrooves }) {
  const canvas = useRef(null);
  const wake = useRef(null);
  const groups = useMemo(() => entries.filter(entry => entry.fieldRecording && entry.waveform?.length)
    .map(entry => ({ values: entry.waveform, duration: entry.durationMs })), [entries]);
  const current = useRef(null);
  current.current = { groups, holding, showGrooves };

  useEffect(() => {
    const element = canvas.current;
    const ctx = element.getContext('2d');
    let frame = null;
    let lastSample = 0;
    let lastPaint = -Infinity;
    const bytes = new Uint8Array(256);
    let width = 0;
    let height = 0;
    let seam = { x: 0, y: 0 };
    let radius = 0;
    let centerY = 0;
    const button = element.parentElement.querySelector('.live-record');
    function schedule() {
      if (frame === null && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function measure() {
      width = element.clientWidth;
      height = element.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = width * ratio;
      element.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const control = button.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      seam = { x: control.x + control.width / 2 - bounds.x, y: control.y + control.height / 2 - bounds.y };
      radius = Math.max(width * 1.05, (height - 45) / 2) - 28;
      centerY = seam.y - radius;
      element.parentElement.style.setProperty('--capture-center-y', centerY + 'px');
      element.parentElement.style.setProperty('--capture-diameter', (radius + 28) * 2 + 'px');
      schedule();
    }
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    resize.observe(button);

    function draw(now) {
      frame = null;
      const active = session.current;
      const running = current.current.holding;
      const animating = Boolean(active?.analyser || running);
      bytes.fill(128);
      active?.analyser?.getByteTimeDomainData(bytes);
      if (running && active && !active.released && now - lastSample > 50) {
        let power = 0;
        for (const value of bytes) power += ((value - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(power / bytes.length) * 4);
        active.levels.push(level);
        lastSample = now;
      }
      // Keep microphone sampling responsive, but paint at most 30 times a second.
      if (animating && now - lastPaint < 1000 / 30) { schedule(); return; }
      lastPaint = animating && Number.isFinite(lastPaint) ? now - (now - lastPaint) % (1000 / 30) : now;
      ctx.clearRect(0, 0, width, height);
      if (current.current.showGrooves) {
        const groups = [...current.current.groups];
        if (active?.levels.length && !active.saved) groups.push({ values: active.levels, duration: (active.released ? active.finished : now) - active.started });
        let cursor = Math.PI / 2;
        ctx.save();
        ctx.translate(seam.x, centerY);
        ctx.strokeStyle = '#f0b94e';
        ctx.lineWidth = 0.85;
        for (const group of groups.reverse()) {
          const length = Math.min(4.8, Math.max(0.14, (group.duration || 1000) / 1000 * 0.15));
          const r = radius;
          ctx.beginPath();
          ctx.arc(0, 0, r, cursor, cursor + length);
          const stride = Math.max(1, Math.ceil(group.values.length / 200));
          for (let i = 0; i < group.values.length; i += stride) {
            const angle = cursor + (1 - i / Math.max(1, group.values.length - 1)) * length;
            const amplitude = 1 + group.values[i] * 16;
            ctx.moveTo(Math.cos(angle) * (r - amplitude), Math.sin(angle) * (r - amplitude));
            ctx.lineTo(Math.cos(angle) * (r + amplitude), Math.sin(angle) * (r + amplitude));
          }
          ctx.stroke();
          cursor += length + 0.19;
        }
        ctx.restore();
      }

      ctx.strokeStyle = '#f5f4ef';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const start = seam.x;
      const end = width * 0.95;
      const baseline = seam.y;
      for (let i = 0; i < bytes.length; i++) {
        const x = start + i / (bytes.length - 1) * (end - start);
        const y = baseline + (bytes[i] - 128) / 128 * 30;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (animating) schedule();
    }
    function visibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = null; }
      else schedule();
    }
    wake.current = schedule;
    document.addEventListener('visibilitychange', visibility);
    measure();
    return () => { wake.current = null; resize.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [session]);
  useEffect(() => { wake.current?.(); }, [groups, holding, showGrooves]);
  return <canvas className="capture-lines" ref={canvas} aria-hidden="true" />;
}

export function LiveCapture({ album, entries, save, next, home, spotify, prepareRecording, busy }) {
  const media = useCaptureSession(save, spotify, prepareRecording, next);
  const pointer = useRef(null);
  const shot = useMedia(media.shot);
  const holding = media.phase === 'holding';
  const pressing = holding || media.phase === 'preparing';
  const song = media.phase !== 'idle' ? media.recordingSong || spotify : spotify;
  const locked = busy || media.saving || media.unsaved || media.phase !== 'idle';
  const engraved = new Set((album.grooves || []).flatMap((groove) => groove.entryIds));
  const hasPhoto = entries.some((entry) => entry.kind === 'photo' && !engraved.has(entry.id));

  function release(event, photo) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    media.finish(photo);
  }

  return <section className={'live-capture phase-' + media.phase + ' camera-' + media.cameraState} aria-label="순간 녹화">
    <div className="capture-disc" aria-hidden="true" />
    <CaptureLines session={media.session} entries={entries} holding={holding} showGrooves={media.phase !== 'idle' && media.phase !== 'preparing'} />
    <div className="live-navigation">
      <button className="icon-button" aria-label="선반으로 돌아가기" onClick={home} disabled={locked}><Icon name="list" size={18} /></button>
      {hasPhoto && <button className="icon-button" aria-label="기록 확인" onClick={next} disabled={locked}><Icon name="next" size={22} /></button>}
    </div>
    {song && <a className="capture-now-playing" href={song.url} target="_blank" rel="noreferrer">
      {song.image && <img src={song.image} alt="" />}<span><strong>{song.name}</strong><small>{song.artist}</small></span>
    </a>}
    <div className="capture-lens" aria-label={media.cameraState === 'on' ? '카메라 미리보기' : '카메라 꺼짐'}>
      <div className="lens-off" />
      <video className="camera-video" ref={media.video} autoPlay muted playsInline />
      {shot && media.phase === 'exposing' && <img className="camera-shot" src={shot} alt="방금 촬영한 사진" />}
      {media.phase === 'exposing' && <div className="camera-flash" aria-hidden="true" />}
    </div>
    {media.phase === 'preparing' && <div className="capture-preparing" role="status">녹음 준비 중</div>}
    {(media.error || media.musicNotice) && <div className="live-capture-error" role="alert">{media.error || media.musicNotice}
      {media.unsaved && <button onClick={media.retrySave} disabled={media.saving}>다시 저장</button>}
    </div>}
    <div className="live-controls">
      <button className="camera-toggle icon-button" aria-label={media.cameraState === 'off' ? '카메라 켜기' : '카메라 끄기'}
        aria-pressed={media.cameraState === 'on'} disabled={locked} onClick={media.toggleCamera}>
        <Icon name={media.cameraState === 'off' ? 'camera-off' : 'camera'} size={23} />
      </button>
      <button className={'live-record' + (pressing ? ' is-holding' : '')} aria-label="길게 눌러 순간 기록" aria-pressed={pressing}
        disabled={busy || media.saving || media.unsaved || (media.phase !== 'idle' && !pressing)}
        onPointerDown={(event) => {
          if (event.button !== 0 || pointer.current !== null || !media.begin()) return;
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => release(event, true)} onPointerCancel={(event) => release(event, false)}
        onLostPointerCapture={(event) => release(event, false)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); media.begin(); }
        }}
        onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); media.finish(true); } }}
        onBlur={() => { if (pressing && pointer.current === null) media.finish(false); }}><span /></button>
    </div>
  </section>;
}
