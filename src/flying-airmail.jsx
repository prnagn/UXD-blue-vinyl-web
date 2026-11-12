import React, { useLayoutEffect, useRef, useState } from 'react';
import { albumTitle } from './ui';

function flightPath(width, height) {
  const point = (x, y) => (x * width).toFixed(1) + ' ' + (y * height).toFixed(1);
  return 'M ' + point(.18, .72)
    + ' C ' + point(.11, .87) + ' ' + point(.56, 1.02) + ' ' + point(.87, .75)
    + ' C ' + point(1.118, .534) + ' ' + point(.98, .13) + ' ' + point(.68, .16)
    + ' C ' + point(.38, .19) + ' ' + point(.55, .48) + ' ' + point(.28, .40)
    + ' C ' + point(.01, .32) + ' ' + point(-.02, .02) + ' ' + point(.25, .06)
    + ' C ' + point(.52, .10) + ' ' + point(.86, .48) + ' ' + point(.60, .63)
    + ' C ' + point(.34, .78) + ' ' + point(.25, .57) + ' ' + point(.18, .72);
}

export function FlyingAirmail({ delivery, open, paused = false }) {
  const zone = useRef(null);
  const [path, setPath] = useState('');
  useLayoutEffect(() => {
    const element = zone.current;
    if (!element) return;
    const measure = () => setPath(flightPath(element.clientWidth, element.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [delivery?.id]);
  if (!delivery) return null;
  return <div className="airmail-flight-zone" ref={zone}>
    <button type="button" className={'airmail-flight' + (paused ? ' flight-paused' : '')}
      style={path ? { offsetPath: 'path("' + path + '")' } : undefined}
      aria-label={albumTitle(delivery.album) + ' · 받은 LP 열기'} onClick={open}>
      <svg viewBox="0 0 64 44" aria-hidden="true">
        <path d="M2 24 62 2 26 32Z" fill="#f4f0e6" />
        <path d="M26 32 62 2 32 42Z" fill="#d9d3c4" />
        <path d="m26 32 6 10-4-12Z" fill="#bfb8a8" />
      </svg>
    </button>
  </div>;
}
