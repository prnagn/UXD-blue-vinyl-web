export const captureMotion = Object.freeze({ enter: 1200, grow: 850, collapse: 450, review: 500 });

export function captureLensMorph(source, width, height) {
  const size = Math.min(width * .82, 350);
  return {
    x: width / 2 - size / 2 - source.x,
    y: height / 2 - size / 2 - source.y,
    scale: size / source.size,
  };
}
