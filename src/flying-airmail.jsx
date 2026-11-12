import React, { useEffect, useRef, useState } from 'react';
import { albumTitle } from './ui';
import { airmailFrames } from './airmail-flight';

export function FlyingAirmail({ delivery, open, paused = false }) {
  const zone = useRef(null);
  const plane = useRef(null);
  const flight = useRef(null);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    if (!delivery) return;
    let timer;
    let animation;
    let disposed = false;
    const stops = new Set();
    if (paused) stops.add('dialog');
    if (document.hidden) stops.add('hidden');
    function schedule(delay) {
      clearTimeout(timer);
      timer = null;
      if (!disposed && !stops.size) timer = setTimeout(fly, delay);
    }
    function fly() {
      timer = null;
      if (disposed || stops.size || !plane.current || !zone.current) return;
      setFlying(true);
      animation = plane.current.animate(airmailFrames(zone.current.clientWidth), { duration: 7200, easing: 'linear' });
      animation.onfinish = () => {
        animation = null;
        setFlying(false);
        schedule(9000 + Math.random() * 7000);
      };
    }
    function stop(reason, value) {
      if (value) {
        stops.add(reason);
        clearTimeout(timer);
        timer = null;
        animation?.pause();
      } else {
        stops.delete(reason);
        if (!stops.size) {
          if (animation) animation.play();
          else schedule(1500);
        }
      }
    }
    flight.current = stop;
    const visibility = () => stop('hidden', document.hidden);
    document.addEventListener('visibilitychange', visibility);
    schedule(1500);
    return () => {
      disposed = true;
      clearTimeout(timer);
      if (animation) { animation.onfinish = null; animation.cancel(); }
      flight.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [delivery?.id]);
  useEffect(() => { flight.current?.('dialog', paused); }, [paused]);
  if (!delivery) return null;
  return <div className="airmail-flight-zone" ref={zone}>
    <button type="button" ref={plane} className={'airmail-flight' + (flying ? ' is-flying' : '')}
      aria-label={albumTitle(delivery.album) + ' · 받은 LP 열기'} onClick={open}
      onPointerEnter={() => flight.current?.('hover', true)} onPointerLeave={() => flight.current?.('hover', false)}
      onFocus={() => flight.current?.('focus', true)} onBlur={() => flight.current?.('focus', false)}>
      <img src={import.meta.env.BASE_URL + 'art/yuna-plane.png'} alt="" draggable={false} />
    </button>
  </div>;
}
