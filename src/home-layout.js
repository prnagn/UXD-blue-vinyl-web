// Layout and stagger timings from Yuna's stackLayout, in responsive phone coordinates.
const heights = [71, 67, 44, 15, 15, 44, 67, 71, 69, 58];
export function homeLayout(count, height, mode, selected = -1, width = 368) {
  const factor = Math.max(width / 368 * 560, Math.min(width / 368 * 1000, height)) / 799;
  let cursor = 6;
  const items = Array.from({ length: count }, (_, index) => {
    const h = heights[Math.min(index, heights.length - 1)];
    const item = { top: (cursor + (mode === 'home' ? 440 : 43)) * factor, height: Math.max(8, Math.round(h * factor)), up: index >= 4 };
    cursor += h + 22;
    return item;
  });
  if (mode !== 'cover' || !items[selected]) return items;
  const scale = width / 368;
  const coverHeight = 250 * scale;
  const chosen = items[selected];
  const top = Math.max(70 * scale, Math.min(height - coverHeight - 84 * scale, chosen.top + (chosen.height + 12) / 2 - coverHeight / 2));
  const up = Math.max(0, chosen.top - top) + 10 * scale;
  const down = Math.max(0, top + coverHeight + 70 * scale - chosen.top - chosen.height - 12) + 10 * scale;
  return items.map((item, index) => index === selected
    ? { ...item, top, height: coverHeight, up: false }
    : { ...item, top: item.top + (index < selected ? -up : down) });
}
