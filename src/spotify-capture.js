export function playingTrack(value) {
  const item = value?.item;
  return value?.is_playing && item?.type === 'track' && /^[a-zA-Z0-9]{22}$/.test(item.id || '') ? Object.freeze({
    id: item.id, name: item.name, artist: (item.artists || []).map((artist) => artist.name).join(', '),
    image: item.album?.images?.at(-1)?.url || '', url: 'https://open.spotify.com/track/' + item.id,
  }) : null;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pause before requesting microphone access. Keep the song and device only in this transaction.
export async function prepareSpotifyCapture(request, { cancelled = () => false, sleep = wait } = {}) {
  let state;
  try { state = await request('/me/player'); }
  catch {
    let track = null;
    try { track = playingTrack(await request('/me/player/currently-playing')); } catch { /* Recording still works offline. */ }
    return { track, restore: async () => 'Spotify를 다시 연결하면 녹음 전후 재생도 제어할 수 있어요.' };
  }
  const track = playingTrack(state);
  if (!track) return { track: null, restore: async () => '' };
  const device = state.device;
  if (!device?.id || device.is_restricted) {
    return { track, restore: async () => '이 Spotify 기기는 재생 제어를 지원하지 않아요.' };
  }
  const target = '?device_id=' + encodeURIComponent(device.id);
  const volume = device.volume_percent;
  let canFade = device.supports_volume === true && Number.isFinite(volume);
  let changedVolume = false;
  let lastVolume = volume;
  let paused = false;
  let controlFailed = false;
  let restored;

  async function setVolume(value) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    await request('/me/player/volume' + target + '&volume_percent=' + next, { method: 'PUT' });
    changedVolume = true;
    lastVolume = next;
  }

  function restore() {
    if (restored) return restored;
    restored = (async () => {
      if (!paused && !changedVolume) return controlFailed ? 'Spotify 재생 제어 권한과 Premium 계정을 확인해 주세요.' : '';
      try {
        const now = await request('/me/player');
        // Do not take over a different device or a song the user selected during recording.
        if (now?.device?.id && now.device.id !== device.id) return '';
        const sameSong = !now?.item || now.item.id === track.id;
        const untouchedVolume = !now?.device || now.device.volume_percent === lastVolume;
        if (paused && sameSong && !now?.is_playing) await request('/me/player/play' + target, { method: 'PUT' });
        if (changedVolume && untouchedVolume) {
          if (canFade && sameSong) {
            const fromVolume = lastVolume;
            for (let step = 1; step <= 3; step++) {
              await setVolume(fromVolume + (volume - fromVolume) * step / 3);
              if (step < 3) await sleep(180);
            }
          } else await setVolume(volume);
        }
        return controlFailed ? '음량 페이드 없이 Spotify 재생을 재개했어요.' : '';
      } catch {
        // Best effort: never leave a device muted just because resuming failed.
        if (changedVolume) { try { await setVolume(volume); } catch { /* Show the recovery action. */ } }
        return 'Spotify에서 재생 버튼을 한 번 눌러 주세요.';
      }
    })();
    return restored;
  }

  if (cancelled()) return { track, restore };
  if (canFade && volume > 0) {
    try {
      for (let step = 2; step >= 0; step--) {
        if (cancelled()) break;
        await setVolume(volume * step / 3);
        if (step > 0) await sleep(180);
      }
    } catch { canFade = false; }
  }
  if (!cancelled()) {
    try { await request('/me/player/pause' + target, { method: 'PUT' }); paused = true; }
    catch { controlFailed = true; }
  }
  return { track, restore };
}
