export function fitBootFrame(width, height) {
  return Math.max(0, Math.min(width / 393, height / 852));
}

export function snapBootLp(x, y) {
  return { x: x + 40 < 393 / 2 ? -40 : 353, y: Math.max(54, Math.min(732, y)) };
}
