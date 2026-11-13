import { useEffect, useState } from 'react';

const blobCache = new WeakMap();
const urlCache = new Map();
const fallback = '#535d81';

export function tonedPhotoAverage(pixels) {
  let red = 0, green = 0, blue = 0, weight = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    const alpha = pixels[at + 3] / 255;
    red += pixels[at] * alpha;
    green += pixels[at + 1] * alpha;
    blue += pixels[at + 2] * alpha;
    weight += alpha;
  }
  if (!weight) return fallback;
  const average = [red / weight, green / weight, blue / weight];
  const grey = average[0] * .2126 + average[1] * .7152 + average[2] * .0722;
  const brightness = Math.min(80, Math.max(48, grey * .7)) / Math.max(1, grey);
  const toned = average.map(channel => Math.round(Math.min(108, Math.max(28, (channel * .65 + grey * .35) * brightness))));
  return `rgb(${toned.join(', ')})`;
}

export function usePhotoTone(photo, source) {
  const key = photo?.blob || photo?.src || source;
  const cache = photo?.blob ? blobCache : urlCache;
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!key || !source || cache.has(key)) return;
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, 32, 32);
        const color = tonedPhotoAverage(context.getImageData(0, 0, 32, 32).data);
        if (cache === urlCache && cache.size >= 64) cache.delete(cache.keys().next().value);
        cache.set(key, color);
        setResult({ key, color });
      } catch { /* Keep the default tone when an external image disallows pixel access. */ }
    };
    image.src = source;
    return () => { cancelled = true; image.onload = null; };
  }, [key, source, cache]);
  if (!key) return fallback;
  // Hold the previous photo's tone until the new one is ready, avoiding a blue flash between tracks.
  return cache.get(key) || result?.color || fallback;
}
