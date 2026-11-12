// Yuna's PaperPlane trajectory, scaled to the actual phone viewport.
export function airmailFrames(width, random = Math.random) {
  const scale = width / 368;
  const leftToRight = random() < .5;
  const y = (150 + random() * 110) * scale;
  const rise = (60 + random() * 70) * scale;
  const xs = [-90 * scale, width * .25, width * .6, width + 30 * scale];
  const ys = [y, y - rise * .45, y - rise * .55, y - rise];
  const wobble = [3, -3, 2, -2];
  return xs.map((x, index) => {
    const before = Math.max(0, index - 1);
    const after = Math.min(3, index + 1);
    const heading = Math.atan2(ys[after] - ys[before], xs[after] - xs[before]) * 180 / Math.PI;
    return {
      transform: `translate(${leftToRight ? x : width - x}px,${ys[index]}px)${leftToRight ? '' : ' scaleX(-1)'} rotate(${(heading + 41 + wobble[index]).toFixed(1)}deg)`,
      offset: index / 3,
    };
  });
}

// The first plane stays within reach while flying a continuous, slow circuit.
export function guidedAirmailFrames(width, height) {
  const radiusX = width * .26;
  const radiusY = Math.min(height * .1, width * .18);
  let previous = 90;
  return Array.from({ length: 49 }, (_, index) => {
    const phase = index / 48 * Math.PI * 2;
    const x = width * .43 + radiusX * Math.cos(phase);
    const y = height * .27 + radiusY * Math.sin(phase);
    let heading = Math.atan2(radiusY * Math.cos(phase), -radiusX * Math.sin(phase)) * 180 / Math.PI;
    while (heading < previous - 180) heading += 360;
    while (heading > previous + 180) heading -= 360;
    previous = heading;
    return { transform: `translate(${x}px,${y}px) rotate(${heading + 41}deg)`, offset: index / 48 };
  });
}
