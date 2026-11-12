export function pendingMoments(album, entries = album.entries) {
  const engraved = new Set((album.grooves || []).flatMap((groove) => groove.entryIds));
  const pending = entries.filter((entry) => !engraved.has(entry.id));
  const photos = pending.filter((entry) => entry.kind === 'photo');
  const groups = new Map();
  for (const entry of pending) {
    if (!['photo', 'audio', 'video'].includes(entry.kind)) continue;
    let photo = entry.kind === 'photo' ? entry : photos.find((item) => entry.captureId ? item.captureId === entry.captureId : item.id === entry.art?.trackId);
    if (!photo && !entry.captureId) {
      photo = photos.filter((item) => item.day === entry.day && item.time && item.time === entry.time)
        .sort((a, b) => Math.abs(pending.indexOf(a) - pending.indexOf(entry)) - Math.abs(pending.indexOf(b) - pending.indexOf(entry)))[0];
    }
    const id = photo?.id || entry.captureId || entry.id;
    if (!groups.has(id)) groups.set(id, { id, entries: [], photo });
    const group = groups.get(id);
    group.entries.push(entry);
    group.photo ||= photo;
    group.audio ||= entry.kind === 'audio' ? entry : undefined;
    group.spotify ||= entry.spotify;
    group.place ||= entry.place;
  }
  return [...groups.values()];
}

export function reorderMoments(album, ids) {
  const groups = pendingMoments(album);
  const selected = ids.map((id) => groups.find((group) => group.id === id));
  if (!ids.length || new Set(ids).size !== ids.length || selected.some((group) => !group)) return album;
  const moving = new Set(selected.flatMap((group) => group.entries.map((entry) => entry.id)));
  const ordered = selected.flatMap((group) => group.entries);
  const entries = [];
  let inserted = false;
  for (const entry of album.entries) {
    if (moving.has(entry.id)) {
      if (!inserted) { entries.push(...ordered); inserted = true; }
    } else entries.push(entry);
  }
  return { ...album, entries: entries.map((entry, sequence) => ({ ...entry, sequence })) };
}
