// Only the user's own recording passes through this graph; Spotify uses its widget.
export function startAmbient(engine, buffer, part, ended) {
  const half = buffer.duration / 2;
  const offset = part === 'outro' ? half : 0;
  const duration = part === 'full' ? buffer.duration : half;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('duration');
  const node = engine.createBufferSource();
  const gain = engine.createGain();
  node.buffer = buffer;
  node.outputGain = gain;
  node.connect(gain).connect(engine.destination);
  const now = engine.currentTime;
  const fade = Math.min(2, duration);
  gain.gain.setValueAtTime(part === 'outro' ? 0 : 1, now);
  if (part === 'intro') {
    gain.gain.setValueAtTime(1, now + duration - fade);
    gain.gain.linearRampToValueAtTime(0, now + duration);
  } else if (part === 'outro') gain.gain.linearRampToValueAtTime(1, now + fade);
  node.onended = () => ended(node);
  node.start(now, offset, duration);
  return node;
}
