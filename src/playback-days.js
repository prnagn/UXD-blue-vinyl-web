// Keep the recorded order, including deliberately reordered moments.
export function playbackDays(tracks, start) {
  const days = [];
  for (const [index, track] of tracks.entries()) {
    const date = track.day || '';
    const previous = days.at(-1);
    if (date && previous?.date === date) previous.indices.push(index);
    else {
      const elapsed = date && start ? (Date.parse(date + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000 : NaN;
      days.push({ date, number: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed + 1 : days.length + 1, indices: [index] });
    }
  }
  return days;
}

export function dayPosition(days, index, fraction = 0) {
  const day = days.findIndex((entry) => entry.indices.includes(index));
  if (day < 0) return 0;
  const indices = days[day].indices;
  return (day + (indices.indexOf(index) + Math.max(0, Math.min(1, fraction || 0))) / indices.length) / days.length;
}

export function trackAtPosition(days, position) {
  if (!days.length) return -1;
  const at = Math.max(0, Math.min(1, position)) * days.length;
  const day = days[Math.min(days.length - 1, Math.floor(at))];
  return day.indices[Math.min(day.indices.length - 1, Math.floor((at - Math.min(days.length - 1, Math.floor(at))) * day.indices.length))];
}
