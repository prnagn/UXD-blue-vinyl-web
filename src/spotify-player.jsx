import React from 'react';

export function SpotifyPlayer({ song }) {
  if (!song || !/^[a-zA-Z0-9]{22}$/.test(song.id || '')) return null;
  return <div className="moment-spotify">
    <iframe key={song.id} title={'Spotify · ' + song.name} src={'https://open.spotify.com/embed/track/' + song.id + '?theme=0'}
      width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
    <a href={'https://open.spotify.com/track/' + song.id} target="_blank" rel="noreferrer">Spotify에서 열기</a>
  </div>;
}
