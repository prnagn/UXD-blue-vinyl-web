export const parkedAngle = -35;
const radians = (angle) => angle * Math.PI / 180;

export function replayArmAngle({ drag, playing, loading, index, count, layout }) {
  if (drag !== null && drag !== undefined) return drag;
  if (!(playing || loading) || !count) return parkedAngle;
  return layout ? trackAngle(index, count, layout) : -10 + index / Math.max(1, count - 1) * 28;
}

export function needlePosition(angle, layout) {
  const a = radians(angle);
  const x = -71 * layout.scale;
  const y = 167 * layout.scale;
  return { x: layout.x + x * Math.cos(a) - y * Math.sin(a), y: layout.y + x * Math.sin(a) + y * Math.cos(a) };
}

export function needleRadius(angle, layout) {
  const tip = needlePosition(angle, layout);
  return Math.hypot(tip.x - layout.cx, tip.y - layout.cy);
}

export function trackRadius(index, count, layout) {
  return layout.radius * (count < 2 ? .72 : .87 - index / (count - 1) * .34);
}

export function trackAngle(index, count, layout) {
  const target = trackRadius(index, count, layout);
  let low = -17;
  let high = 24;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (needleRadius(mid, layout) > target) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
