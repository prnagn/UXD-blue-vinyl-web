export function centeredScroll(slideLeft, slideWidth, viewportWidth) {
  return Math.max(0, slideLeft + (slideWidth - viewportWidth) / 2);
}

export function reorderSpacing(width, count) {
  return Math.min(64, width * .65 / Math.max(1, count - 1));
}

export function reorderPosition(index, count, start, dx, step, dragged) {
  const x = ((dragged ? start : index) - (count - 1) / 2) * step + (dragged ? dx : 0);
  return { x, y: -x * .45 - (dragged ? 12 : 0), z: dragged ? 55 : 0 };
}
