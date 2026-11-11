export async function openCaptureMicrophone(active, { alive, getUserMedia, prepared }) {
  const music = await active.before;
  active.spotify = music.track;
  if (alive()) prepared?.(music.track);
  if (!alive() || active.released || active.cancelled) return null;
  const stream = await getUserMedia({ audio: true });
  if (!alive() || active.released || active.cancelled) {
    stream.getTracks().forEach((track) => track.stop());
    return null;
  }
  active.stream = stream;
  return stream;
}
