// Layout and stagger timings from Yuna's stackLayout, in responsive phone coordinates.
const heights = [71, 67, 44, 15, 15, 44, 67, 71, 69, 58];
export const shelfCoverRatio = .69;
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
  const coverHeight = width * (302 / 368) * shelfCoverRatio;
  const captionHeight = 44 * scale;
  const gap = 32 * scale;
  const chosen = items[selected];
  const blockHeight = coverHeight + captionHeight;
  // Center the opened cover and caption in the viewport, regardless of shelf index.
  const top = Math.max(48 * scale, Math.min(height - blockHeight - 84 * scale, (height - blockHeight) / 2));
  items[selected] = { ...chosen, top, height: coverHeight + captionHeight, up: false };
  let above = top - 24 * scale;
  for (let index = selected - 1; index >= 0; index--) {
    items[index].top = above - items[index].height - 12;
    above = items[index].top - 10 * scale;
  }
  let below = top + coverHeight + captionHeight + gap;
  for (let index = selected + 1; index < items.length; index++) {
    items[index].top = below;
    below += items[index].height + 12 + 10 * scale;
  }
  return items;
}
