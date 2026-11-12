import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

const consentKey = 'blue-vinyl-place-consent';
const cache = new Map();
const endpoint = import.meta.env.VITE_REVERSE_GEOCODE_URL || 'https://photon.komoot.io/reverse';

export function placeLabel(feature) {
  const place = feature?.properties || {};
  return (place.name || [place.street, place.housenumber].filter(Boolean).join(' ') || place.district || place.city || '').slice(0, 180);
}

function allowed() {
  try { return localStorage.getItem(consentKey) === 'photon'; } catch { return false; }
}

export function MomentLocation({ recordId = '', initialPlace = '', save, busy, autoLocate = true }) {
  const [location, setLocation] = useState({ id: recordId, value: initialPlace });
  const place = location.id === recordId ? location.value : initialPlace;
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const request = useRef(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const activeRecord = useRef(recordId);
  activeRecord.current = recordId;

  async function locate() {
    if (busy || loading) return;
    if (!navigator.geolocation) { setError('위치를 사용할 수 없는 브라우저예요.'); return; }
    const call = ++generation.current;
    const targetId = recordId;
    const savePlace = saveRef.current;
    const current = () => generation.current === call && activeRecord.current === targetId;
    setAsking(false); setLoading(true); setError('');
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }));
      if (!current()) return;
      const { latitude, longitude } = position.coords;
      const key = latitude.toFixed(4) + ',' + longitude.toFixed(4);
      let label = cache.get(key);
      if (!label) {
        const controller = new AbortController();
        request.current = controller;
        const timeout = setTimeout(() => controller.abort(), 7000);
        try {
          const uri = new URL(endpoint);
          uri.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), radius: '0.25', limit: '1' });
          const response = await fetch(uri, { signal: controller.signal });
          if (!response.ok) throw new Error('lookup');
          const result = await response.json();
          label = placeLabel(result.features?.[0]);
          if (!label) throw new Error('empty');
          if (cache.size >= 40) cache.delete(cache.keys().next().value);
          cache.set(key, label);
        } finally { clearTimeout(timeout); }
      }
      if (!current()) return;
      setLocation({ id: targetId, value: label });
      if (await savePlace?.(label) === false && current()) setError('위치명을 저장하지 못했어요. 다시 눌러 주세요.');
    } catch (failure) {
      if (current()) setError(failure.code === 1 ? '위치 권한을 허용해 주세요.' : '현재 위치를 확인하지 못했어요. 다시 눌러 주세요.');
    } finally { if (current()) setLoading(false); }
  }

  useEffect(() => {
    setLocation({ id: recordId, value: initialPlace });
    setAsking(false); setLoading(false); setError('');
    if (!initialPlace && autoLocate && allowed()) locate();
    return () => { generation.current++; request.current?.abort(); };
  }, [recordId, initialPlace, autoLocate]);

  return <div className="moment-location">
    <button className="moment-place" disabled={busy || loading} onClick={() => allowed() ? locate() : setAsking(true)}>
      <Icon name="pin" size={15} /><span>{loading ? '현재 위치 확인 중' : place || '현재 위치 표시'}</span>
    </button>
    {asking && <div className="location-consent">
      <p>주소 확인을 위해 GPS 좌표를 komoot Photon에 보냅니다.</p>
      <button onClick={() => { try { localStorage.setItem(consentKey, 'photon'); } catch { /* Consent applies to this request. */ } locate(); }}>위치 사용</button>
      <button onClick={() => setAsking(false)}>취소</button>
    </div>}
    {place && <a className="location-source" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>}
    {error && <p className="error" role="status">{error}</p>}
  </div>;
}
