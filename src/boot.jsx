import React, { useEffect, useRef, useState } from "react";
import { BlueVinylDisc, BlueVinylIcon, BlueVinylWord } from "./brand-logo";
import { AppIcon } from "./boot-icons";
import { fitBootFrame, snapBootLp } from './boot-layout';
const DOCK = ["phone", "browser", "messages", "music"];
const ICON = (kind, name, extra = "") => <div className={`bt-app ${extra}`} key={name}>
    <div className="bt-ic"><AppIcon kind={kind} /></div>
    <span>{name}</span>
  </div>;
const photo = (n) => `${import.meta.env.BASE_URL}img/${n}`;
export default function Boot({ children, onPip }) {
  const frame = useRef(null);
  const canvas = useRef(null);
  const hold = useRef(null);
  const suppressPip = useRef(false);
  const [scale, setScale] = useState(1);
  const [launch, setLaunch] = useState({ x: 0, y: 0, width: 60, height: 60 });
  const launchScale = launchCoverScale(launch);
  const [pip, setPip] = useState({ x: 353, y: 330 });
  const [dragging, setDragging] = useState(false);
  const [reduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [viaPip, setViaPip] = useState(false);
  const skip = typeof location !== "undefined" && new URLSearchParams(location.search).get("boot") === "0" || typeof location !== "undefined" && (new URLSearchParams(location.search).has("code") || location.hash.startsWith("#lp="));
  const [stage, setStage] = useState(skip ? "done" : "home");
  useEffect(() => {
    if (!frame.current) return;
    const measure = () => setScale(fitBootFrame(frame.current.clientWidth, frame.current.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [stage === 'done']);
  useEffect(() => () => {
    clearTimeout(hold.current?.timer);
    cancelAnimationFrame(hold.current?.frame);
  }, []);

  function open(event, fromPip = false) {
    if (stage !== 'home' || (fromPip && event.detail !== 0 && suppressPip.current)) return;
    const icon = (fromPip ? event.currentTarget : event.currentTarget.querySelector('.bt-ic')).getBoundingClientRect();
    const area = canvas.current.getBoundingClientRect();
    const ratio = area.width / 393;
    setLaunch({ x: (icon.left - area.left) / ratio, y: (icon.top - area.top) / ratio, width: icon.width / ratio, height: icon.height / ratio });
    setViaPip(fromPip);
    if (fromPip) onPip?.();
    setStage('opening');
  }
  function startPip(event) {
    if (event.button !== 0 || stage !== 'home') return;
    suppressPip.current = false;
    const active = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: pip, position: pip, scale, moving: false, element: event.currentTarget };
    hold.current = active;
    active.timer = setTimeout(() => {
      if (hold.current !== active) return;
      active.moving = true;
      suppressPip.current = true;
      setDragging(true);
    }, 300);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePip(event) {
    const active = hold.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = (event.clientX - active.x) / active.scale;
    const dy = (event.clientY - active.y) / active.scale;
    if (!active.moving) {
      if (Math.hypot(dx, dy) > 8) { clearTimeout(active.timer); suppressPip.current = true; }
      return;
    }
    active.position = { x: Math.max(-40, Math.min(353, active.origin.x + dx)), y: Math.max(54, Math.min(732, active.origin.y + dy)) };
    if (!active.frame) active.frame = requestAnimationFrame(() => {
      active.frame = null;
      if (hold.current === active) active.element.style.transform = `translate(${active.position.x}px,${active.position.y}px)`;
    });
  }
  function endPip(event) {
    const active = hold.current;
    if (!active || active.id !== event.pointerId) return;
    clearTimeout(active.timer);
    cancelAnimationFrame(active.frame);
    hold.current = null;
    if (active.moving) setPip(snapBootLp(active.position.x, active.position.y));
    if (event.type === 'pointercancel') suppressPip.current = true;
    setDragging(false);
  }
  useEffect(() => {
    if (stage === "opening") {
      const t = setTimeout(() => setStage("splash"), reduceMotion ? 120 : 520);
      return () => clearTimeout(t);
    }
    if (stage === "splash") {
      const t = setTimeout(() => setStage("done"), reduceMotion ? 650 : viaPip ? 1500 : 4300);
      return () => clearTimeout(t);
    }
  }, [stage, viaPip, reduceMotion]);
  return <>
      {stage === "done" && children}
      {stage !== "done" && <div ref={frame} className={`bt bt-stage-${stage}${viaPip ? ' via-pip' : ''}`}>
        {stage !== 'splash' && <div className="bt-wall" aria-hidden="true" />}
        <div ref={canvas} className="bt-canvas" style={{ '--boot-scale': scale, '--launch-x': launch.x + 'px', '--launch-y': launch.y + 'px', '--launch-width': launch.width + 'px', '--launch-height': launch.height + 'px', '--launch-scale': launchScale, '--launch-end-x': (393 - launch.width * launchScale) / 2 + 'px', '--launch-end-y': (852 - launch.height * launchScale) / 2 + 'px' }}>
          {stage === "splash" ? <div className={`bt-splash${viaPip ? " short" : ""}`}>
              <div className="bt-lock">
                <div className="bt-disc">
                  <BlueVinylDisc size={76} />
                </div>
                <div className="bt-word">
                  <span><BlueVinylWord height={41} /></span>
                </div>
              </div>
            </div> : <div className="bt-home">
              <div className="bt-wall" />
              <div className="bt-island" />
              <div className="bt-status">
                <b>9:41</b>
                <span className="bt-sig">
                  <svg viewBox="0 0 18 12" width="18" height="12" aria-hidden>
                    <rect x="0" y="8" width="3" height="4" rx="0.8" fill="#fff" />
                    <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="#fff" />
                    <rect x="10" y="3" width="3" height="9" rx="0.8" fill="#fff" />
                    <rect x="15" y="0" width="3" height="12" rx="0.8" fill="#fff" />
                  </svg>
                  <svg viewBox="0 0 17 12" width="17" height="12" aria-hidden>
                    <path d="M8.5 11.2 6 8.6a3.6 3.6 0 0 1 5 0Zm-5-5a7.100 7.100 0 0 1 10 0l-1.400 1.400a5.100 5.100 0 0 0-7.200 0Zm-2.600-2.600a10.800 10.800 0 0 1 15.200 0l-1.400 1.400a8.800 8.800 0 0 0-12.400 0Z" fill="#fff" />
                  </svg>
                  <em><i /></em>
                </span>
              </div>
              <div className="bt-grid">
                {ICON("clock", "\uC2DC\uACC4")}
                {ICON("camera", "\uCE74\uBA54\uB77C")}
                <div className="bt-wcell">
                  <div className="bt-w bt-act">
                    <svg viewBox="0 0 60 60" width="62" height="62" aria-hidden>
                      {[["#fa114f", 26, 0.75], ["#a6ff00", 19, 0.63], ["#00e0ff", 12, 0.34]].map(([c, r, f]) => <g key={String(c)} fill="none" strokeWidth="6" strokeLinecap="round">
                          <circle cx="30" cy="30" r={r} stroke={String(c)} opacity=".25" />
                          <circle cx="30" cy="30" r={r} stroke={String(c)} strokeDasharray={`${2 * Math.PI * r * f} 999`} transform="rotate(-90 30 30)" />
                        </g>)}
                    </svg>
                    <div><b style={{ color: "#fa114f" }}>375/500<small>CAL</small></b><b style={{ color: "#a6ff00" }}>19/30<small>MIN</small></b><b style={{ color: "#00e0ff" }}>4/12<small>HRS</small></b></div>
                  </div>
                  <span className="bt-wl">활동</span>
                </div>
                {ICON("tv", "TV")}
                {ICON("stocks", "\uC8FC\uC2DD")}
                <div className="bt-wcell bt-wphoto">
                  <div className="bt-w bt-pic" style={{ backgroundImage: `url(${photo("reykjavik-1.jpg")})` }}>
                    <b>REYKJAVIK</b><small>Feb 18, 2024</small>
                  </div>
                  <span className="bt-wl">사진</span>
                </div>
                {ICON("mail", "\uBA54\uC77C")}
                {ICON("files", "\uD30C\uC77C")}
                <button className="bt-app bt-bv" onClick={open} aria-label="Blue Vinyl 열기">
                  <div className="bt-ic bt-ic-bv"><BlueVinylIcon size={60} /></div>
                  <span>Blue Vinyl</span>
                </button>
                {ICON("weather", "\uB0A0\uC528")}
                {ICON("health", "\uAC74\uAC15")}
                {ICON("home", "\uD648")}
                <div className="bt-wcell bt-wmusic">
                  <div className="bt-w bt-mus">
                    <div className="bt-alb"><BlueVinylDisc size={44} /></div>
                    <b>Hoppípolla</b><small>Sigur Rós</small>
                  </div>
                  <span className="bt-wl">음악</span>
                </div>
                {ICON("news", "\uB274\uC2A4")}
                {ICON("photos", "\uC0AC\uC9C4")}
              </div>
              <button
    type="button"
    className={'bt-pip' + (dragging ? ' dragging' : '')}
    style={{ transform: `translate(${pip.x}px,${pip.y}px)` }}
    aria-label="기록하기"
    aria-description="꾹 눌러 이동하고 손을 떼면 가까운 화면 가장자리에 붙습니다."
    onPointerDown={startPip} onPointerMove={movePip} onPointerUp={endPip}
    onPointerCancel={endPip} onLostPointerCapture={endPip}
    onContextMenu={event => event.preventDefault()}
    onClick={event => open(event, true)}
  >
                <i />
              </button>
              <div className="bt-dots"><i className="on" /><i /></div>
              <div className="bt-dock">
                {DOCK.map((a, i) => <div className="bt-ic" key={i}><AppIcon kind={a} /></div>)}
              </div>
              <div className="bt-homebar" />
              {stage === "opening" && <div className={`bt-zoom${viaPip ? " pip" : ""}`}>{viaPip ? null : <BlueVinylIcon size={60} />}</div>}
            </div>}
        </div>
        </div>}
    </>;
}

function launchCoverScale(launch) {
  // Uniform scaling covers the frame without changing layout on every animation frame.
  return Math.hypot(393, 852) / Math.min(launch.width, launch.height);
}
