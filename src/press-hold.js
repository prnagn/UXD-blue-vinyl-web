export const pressHoldMs = 2600;

export function createPressHold({ paint, phase, complete, now = () => performance.now(), requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let active = null;
  let frame = null;
  let saving = false;
  let disposed = false;

  function reset() {
    if (disposed) return;
    saving = false;
    paint(0);
    phase('idle');
  }
  function tick(time) {
    frame = null;
    if (disposed || !active) return;
    const progress = Math.max(0, Math.min(1, (time - active.at) / pressHoldMs));
    paint(progress);
    if (progress < 1) { frame = requestFrame(tick); return; }
    active = null;
    saving = true;
    phase('saving');
    Promise.resolve().then(() => disposed ? false : complete()).then(saved => { if (!saved) reset(); }).catch(reset);
  }
  return {
    start(id) {
      if (disposed || active || saving) return false;
      active = { id, at: now() };
      paint(0);
      phase('pressing');
      frame = requestFrame(tick);
      return true;
    },
    cancel(id = active?.id) {
      if (!active || active.id !== id) return;
      active = null;
      if (frame !== null) cancelFrame(frame);
      frame = null;
      reset();
    },
    destroy() {
      disposed = true;
      active = null;
      if (frame !== null) cancelFrame(frame);
      frame = null;
    },
  };
}
