import { useEffect, useRef, useState } from 'react';

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function snapshot(video) {
  if (!video?.videoWidth || !video.videoHeight) return Promise.resolve(null);
  const side = Math.min(video.videoWidth, video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(1200, side);
  try {
    canvas.getContext('2d').drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  } catch { return Promise.resolve(null); }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}

export function useCaptureSession(save, spotify) {
  const video = useRef(null);
  const camera = useRef(null);
  const cameraRequest = useRef(0);
  const session = useRef(null);
  const alive = useRef(false);
  const saveRef = useRef(save);
  const songRef = useRef(spotify);
  const timers = useRef(new Set());
  const [cameraState, setCameraState] = useState('off');
  const [phase, setPhase] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const pending = useRef(null);
  const [shot, setShot] = useState(null);
  const [error, setError] = useState('');
  saveRef.current = save;
  songRef.current = spotify;

  function later(action, ms) {
    const timer = setTimeout(() => { timers.current.delete(timer); if (alive.current) action(); }, ms);
    timers.current.add(timer);
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cameraRequest.current++;
      stopStream(camera.current);
      const active = session.current;
      if (active) {
        active.cancelled = true;
        clearTimeout(active.limit);
        if (active.recorder?.state === 'recording') active.recorder.stop();
        stopStream(active.stream);
        active.context?.close().catch(() => {});
      }
      timers.current.forEach(clearTimeout);
    };
  }, []);

  async function toggleCamera() {
    if (session.current || saving) return;
    const request = ++cameraRequest.current;
    if (camera.current || cameraState === 'requesting') {
      stopStream(camera.current);
      camera.current = null;
      if (video.current) video.current.srcObject = null;
      setCameraState('off');
      return;
    }
    setCameraState('requesting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!alive.current || request !== cameraRequest.current) { stopStream(stream); return; }
      camera.current = stream;
      stream.getVideoTracks()[0].onended = () => {
        if (alive.current && camera.current === stream) {
          camera.current = null;
          setCameraState('off');
        }
      };
      video.current.srcObject = stream;
      await video.current.play();
      if (alive.current && request === cameraRequest.current) setCameraState('on');
    } catch {
      if (request !== cameraRequest.current || !alive.current) return;
      stopStream(camera.current);
      camera.current = null;
      setCameraState('off');
      setError('카메라를 켤 수 없어요. 카메라 권한을 확인해 주세요.');
    }
  }

  async function recordAudio(active) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || active.cancelled || active.released) {
        stopStream(stream);
        active.context?.close().catch(() => {});
        return null;
      }
      active.stream = stream;
      if (active.context) {
        try {
          active.analyser = active.context.createAnalyser();
          active.analyser.fftSize = 256;
          active.context.createMediaStreamSource(stream).connect(active.analyser);
          active.context.resume().catch(() => {});
        } catch { active.analyser = null; }
      }
      if (!alive.current || active.cancelled || active.released) {
        stopStream(stream);
        active.context?.close().catch(() => {});
        return null;
      }
      const recorder = new MediaRecorder(stream);
      active.recorder = recorder;
      const chunks = [];
      return await new Promise((resolve) => {
        let finished = false;
        function done(blob) {
          if (finished) return;
          finished = true;
          stopStream(stream);
          active.context?.close().catch(() => {});
          active.analyser = null;
          resolve(blob);
        }
        recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          done(blob.size ? blob : null);
        };
        recorder.onerror = () => {
          if (alive.current) setError('녹음이 중단됐어요. 다시 눌러 기록해 주세요.');
          done(null);
        };
        recorder.start(200);
      });
    } catch {
      stopStream(stream);
      active.context?.close().catch(() => {});
      if (alive.current && !active.cancelled) setError('마이크를 열 수 없어요. 마이크 권한을 확인해 주세요.');
      return null;
    }
  }

  function begin() {
    if (session.current || saving || unsaved || phase !== 'idle') return false;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('이 브라우저에서는 녹음할 수 없어요. HTTPS 주소에서 열어 주세요.');
      return false;
    }
    setError('');
    const active = { at: new Date(), started: performance.now(), levels: [], released: false, cancelled: false };
    const Context = window.AudioContext || window.webkitAudioContext;
    if (Context) {
      try { active.context = new Context(); active.context.resume().catch(() => {}); }
      catch { active.context = null; }
    }
    session.current = active;
    setPhase('holding');
    active.audio = recordAudio(active);
    active.limit = setTimeout(() => finish(true), 300000);
    return true;
  }

  async function finish(withPhoto = true) {
    const active = session.current;
    if (!active || active.released) return;
    active.released = true;
    active.finished = performance.now();
    clearTimeout(active.limit);
    setSaving(true);
    const durationMs = Math.round(active.finished - active.started);
    const photoPromise = withPhoto && camera.current ? snapshot(video.current) : Promise.resolve(null);
    const photographing = withPhoto && Boolean(camera.current);
    setPhase(photographing ? 'exposing' : 'settling');
    later(() => setPhase('idle'), photographing ? 850 : 260);
    if (active.recorder?.state === 'recording') active.recorder.stop();
    const [photo, audio] = await Promise.all([photoPromise, active.audio]);
    if (!alive.current || active.cancelled) return;
    if (photo) setShot({ blob: photo });
    if (photographing && !photo) setError('사진을 찍지 못했어요. 다시 촬영해 주세요.');
    const waveform = [];
    const stride = Math.max(1, Math.ceil(active.levels.length / 360));
    for (let i = 0; i < active.levels.length; i += stride) {
      waveform.push(Math.round(active.levels.slice(i, i + stride).reduce((sum, value) => sum + value, 0) / Math.min(stride, active.levels.length - i) * 1000) / 1000);
    }
    const captured = { photo, audio, waveform, durationMs, at: active.at, spotify: songRef.current };
    try {
      if ((photo || audio) && await saveRef.current(captured) === false) throw new Error('save');
      active.saved = true;
    } catch {
      pending.current = captured;
      if (alive.current) { setUnsaved(true); setError('기록을 저장하지 못했어요. 다시 저장해 주세요.'); }
    }
    finally {
      if (session.current === active) session.current = null;
      if (alive.current) setSaving(false);
    }
  }

  async function retrySave() {
    if (!pending.current || saving) return;
    setSaving(true);
    try {
      if (await saveRef.current(pending.current) === false) return;
      pending.current = null;
      setUnsaved(false);
      setError('');
    } catch { setError('기록을 저장하지 못했어요. 다시 저장해 주세요.'); }
    finally { if (alive.current) setSaving(false); }
  }

  useEffect(() => {
    function leave() { if (document.hidden) finish(false); }
    document.addEventListener('visibilitychange', leave);
    return () => document.removeEventListener('visibilitychange', leave);
  }, []);

  return { video, session, cameraState, phase, saving, unsaved, shot, error, begin, finish, retrySave, toggleCamera };
}
