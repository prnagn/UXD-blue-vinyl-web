const calendarDay = (day) => /^\d{4}-\d{2}-\d{2}$/.test(day || '') ? Date.parse(day + 'T00:00:00Z') : NaN;

export function parcelState(album, today) {
  if (!album.delivery) return { status: 'none', days: 0 };
  if (album.delivery.unpackedAt) return { status: 'opened', days: 0 };
  const remaining = (calendarDay(album.delivery.arrivesOn) - calendarDay(today)) / 86400000;
  if (!Number.isFinite(remaining)) return { status: 'transit', days: null };
  return { status: remaining > 0 ? 'transit' : 'arrived', days: Math.max(0, Math.ceil(remaining)) };
}

export const availableOnTurntable = (album, today) => ['none', 'opened'].includes(parcelState(album, today).status);
