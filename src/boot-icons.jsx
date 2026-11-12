import { jsx, jsxs } from "react/jsx-runtime";
const W = "rgba(255,255,255,0.96)";
function Base({ id, a, b, children }) {
  return /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 60 60", width: "100%", height: "100%", "aria-hidden": true, children: [
    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `g-${id}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0", stopColor: a }),
      /* @__PURE__ */ jsx("stop", { offset: "1", stopColor: b })
    ] }) }),
    /* @__PURE__ */ jsx("rect", { width: "60", height: "60", fill: `url(#g-${id})` }),
    children
  ] });
}
const WEEK = ["\uC77C", "\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0"];
export function AppIcon({ kind }) {
  switch (kind) {
    case "messages":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#6ee07e", b: "#2fb34a", children: /* @__PURE__ */ jsx("path", { d: "M30 13c-11 0-19 6.6-19 15 0 4.6 2.4 8.6 6.3 11.3-.3 2.6-1.5 5-3.3 6.9 4-.3 7.6-1.7 10.2-3.7 1.9.4 3.8.6 5.8.6 11 0 19-6.6 19-15.1S41 13 30 13Z", fill: W }) });
    case "calendar": {
      const d = /* @__PURE__ */ new Date();
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#ffffff", b: "#f1f1f3", children: [
        /* @__PURE__ */ jsx("text", { x: "30", y: "16.5", textAnchor: "middle", fontSize: "9", fontWeight: "600", fill: "#ee4b43", fontFamily: "Inter, 'Noto Sans KR', sans-serif", children: WEEK[d.getDay()] }),
        /* @__PURE__ */ jsx("text", { x: "30", y: "46", textAnchor: "middle", fontSize: "29", fontWeight: "300", fill: "#1c1c1e", fontFamily: "Inter, sans-serif", children: d.getDate() })
      ] });
    }
    case "photos": {
      const petals = [["#f6c445", 0], ["#f39a3b", 45], ["#ee5a5a", 90], ["#c764c9", 135], ["#6d6ee0", 180], ["#4fa8ee", 225], ["#5cc986", 270], ["#b7d953", 315]];
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#ffffff", b: "#f3f3f5", children: /* @__PURE__ */ jsx("g", { transform: "translate(30 30)", style: { mixBlendMode: "multiply" }, children: petals.map(([c, r]) => /* @__PURE__ */ jsx("ellipse", { cx: "0", cy: "-9", rx: "6.2", ry: "9.5", fill: c, opacity: "0.85", transform: `rotate(${r})` }, r)) }) });
    }
    case "camera":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#b9bdc4", b: "#8a8f98", children: [
        /* @__PURE__ */ jsx("path", { d: "M14 21h8l3-4h10l3 4h8a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V24a3 3 0 0 1 3-3Z", fill: "#2a2c30" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "33", r: "9.5", fill: "#fff", opacity: "0.95" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "33", r: "6.3", fill: "#3b4150" }),
        /* @__PURE__ */ jsx("circle", { cx: "27.8", cy: "30.8", r: "1.6", fill: "#fff", opacity: "0.7" })
      ] });
    case "maps":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#bfe5b6", b: "#9fd3a0", children: [
        /* @__PURE__ */ jsx("path", { d: "M-4 40 22 28l14 10 28-14v12L36 50 22 40-4 52Z", fill: "#fff", opacity: "0.9" }),
        /* @__PURE__ */ jsx("path", { d: "M10 14c8 6 10 14 24 16s14 12 26 14", fill: "none", stroke: "#4a8df0", strokeWidth: "4.5", strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M42 11c-5 0-8.5 3.6-8.5 8 0 6 8.5 14 8.5 14s8.5-8 8.5-14c0-4.4-3.5-8-8.5-8Z", fill: "#ef5a4f" }),
        /* @__PURE__ */ jsx("circle", { cx: "42", cy: "19", r: "3", fill: "#fff" })
      ] });
    case "weather":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#4d9df0", b: "#8bc4f5", children: [
        /* @__PURE__ */ jsx("circle", { cx: "24", cy: "25", r: "9.5", fill: "#ffd54a" }),
        /* @__PURE__ */ jsx("path", { d: "M22 44a8 8 0 0 1 1.5-15.8 11 11 0 0 1 21 2.8A6.5 6.5 0 0 1 44 44Z", fill: W })
      ] });
    case "clock":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#2c2c30", b: "#0f0f12", children: [
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "22", fill: "#fff" }),
        Array.from({ length: 12 }, (_, i) => /* @__PURE__ */ jsx("line", { x1: "30", y1: "10", x2: "30", y2: i % 3 === 0 ? 14 : 12.5, stroke: "#222", strokeWidth: i % 3 === 0 ? 2 : 1, transform: `rotate(${i * 30} 30 30)` }, i)),
        /* @__PURE__ */ jsx("line", { x1: "30", y1: "30", x2: "30", y2: "17", stroke: "#222", strokeWidth: "2.6", strokeLinecap: "round", transform: "rotate(-20 30 30)" }),
        /* @__PURE__ */ jsx("line", { x1: "30", y1: "30", x2: "30", y2: "14", stroke: "#222", strokeWidth: "2", strokeLinecap: "round", transform: "rotate(122 30 30)" }),
        /* @__PURE__ */ jsx("line", { x1: "30", y1: "34", x2: "30", y2: "12", stroke: "#f08a24", strokeWidth: "1.2", transform: "rotate(200 30 30)" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "2", fill: "#f08a24" })
      ] });
    case "tv":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#2a2a2e", b: "#0a0a0c", children: /* @__PURE__ */ jsx("text", { x: "30", y: "37", textAnchor: "middle", fontSize: "17", fontWeight: "600", fill: "#fff", fontFamily: "Inter, sans-serif", children: "tv" }) });
    case "stocks":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#26262a", b: "#0a0a0c", children: [
        /* @__PURE__ */ jsx("path", { d: "M6 36l8-6 7 4 8-12 8 10 7-8 8 5", fill: "none", stroke: "#fff", strokeWidth: "1.6", strokeLinejoin: "round" }),
        [16, 26, 36, 46].map((y) => /* @__PURE__ */ jsx("line", { x1: "6", x2: "54", y1: y, y2: y, stroke: "#555", strokeWidth: ".6" }, y)),
        /* @__PURE__ */ jsx("line", { x1: "29", y1: "8", x2: "29", y2: "52", stroke: "#4aa3ff", strokeWidth: "1" })
      ] });
    case "appstore":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#5ac8fa", b: "#1a74f0", children: /* @__PURE__ */ jsx("g", { stroke: "#fff", strokeWidth: "4.6", strokeLinecap: "round", children: /* @__PURE__ */ jsx("path", { d: "M30 14 19 43M30 14l11 29M17 36h26", fill: "none" }) }) });
    case "health":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#ffffff", b: "#f4f4f6", children: /* @__PURE__ */ jsx("path", { d: "M30 47C14 36 12 27 12 23a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 4-2 13-18 24Z", fill: "#fb4b6a" }) });
    case "home":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#ffffff", b: "#f4f4f6", children: [
        /* @__PURE__ */ jsx("path", { d: "M10 31 30 12l20 19h-5v16H15V31Z", fill: "#f6a928" }),
        /* @__PURE__ */ jsx("rect", { x: "26", y: "36", width: "8", height: "11", rx: "1", fill: "#fff" })
      ] });
    case "news":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#ffffff", b: "#f4f4f6", children: /* @__PURE__ */ jsx("path", { d: "M12 46V14l12 0 12 20V14h12v32H36L24 26v20Z", fill: "#f43f5e" }) });
    case "notes":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#fff", b: "#f7f7f2", children: [
        /* @__PURE__ */ jsx("rect", { width: "60", height: "16", fill: "#f7cf45" }),
        [27, 35, 43, 51].map((y) => /* @__PURE__ */ jsx("line", { x1: "9", y1: y, x2: "51", y2: y, stroke: "#d9d9d6", strokeWidth: "1" }, y))
      ] });
    case "music":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#fb7185", b: "#e11d48", children: /* @__PURE__ */ jsx("path", { d: "M40 15 25 19v20.5a5 5 0 1 0 3 4.5V26.5l9-2.5v12.5a5 5 0 1 0 3 4.5Z", fill: W }) });
    case "books":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#ffb066", b: "#f08a24", children: [
        /* @__PURE__ */ jsx("path", { d: "M30 20c-4-3-10-4-17-3v26c7-1 13 0 17 3 4-3 10-4 17-3V17c-7-1-13 0-17 3Z", fill: W }),
        /* @__PURE__ */ jsx("path", { d: "M30 20v26", stroke: "#f08a24", strokeWidth: "1.5" })
      ] });
    case "settings": {
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#b8bcc4", b: "#8c9099", children: [
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "15.5", fill: "none", stroke: "#3a3d44", strokeWidth: "7", strokeDasharray: "5.1 5.1" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "12", fill: "#3a3d44" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "5.5", fill: "#b0b4bb" })
      ] });
    }
    case "files":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#5aa9f6", b: "#2f7ee0", children: /* @__PURE__ */ jsx("path", { d: "M13 19a3 3 0 0 1 3-3h9l4 4h15a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3Z", fill: W }) });
    case "phone":
      return /* @__PURE__ */ jsx(Base, { id: kind, a: "#6ee07e", b: "#2fb34a", children: /* @__PURE__ */ jsx("path", { d: "M20.5 14c-1.2.4-6.6 2.6-6.5 7.5C14.4 34 26 46 38.5 46.5c4.9.2 7.2-5.2 7.6-6.4.2-.7 0-1.4-.6-1.8l-6.6-4.3c-.7-.5-1.6-.4-2.2.2l-2.6 2.6c-4.2-1.7-8.1-5.6-9.8-9.8l2.6-2.6c.6-.6.7-1.5.2-2.2l-4.3-6.600c-.4-.6-1.100-.8-1.7-.6Z", fill: W }) });
    case "browser":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#5ab4f8", b: "#2b7fe0", children: [
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "21", fill: "#fff" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "17.5", fill: "none", stroke: "#9ccbf5", strokeWidth: "1.2", strokeDasharray: "1 3.1" }),
        /* @__PURE__ */ jsx("path", { d: "M20 40 26 26l14-6-6 14Z", fill: "#ef5a4f" }),
        /* @__PURE__ */ jsx("path", { d: "M20 40l6-14 8 8Z", fill: "#c9d6e8" }),
        /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r: "1.7", fill: "#fff" })
      ] });
    case "mail":
      return /* @__PURE__ */ jsxs(Base, { id: kind, a: "#5ab4f8", b: "#2b7fe0", children: [
        /* @__PURE__ */ jsx("rect", { x: "11", y: "17", width: "38", height: "26", rx: "4", fill: W }),
        /* @__PURE__ */ jsx("path", { d: "M12 20l18 13 18-13", fill: "none", stroke: "#3b86e6", strokeWidth: "2.2", strokeLinejoin: "round" })
      ] });
  }
}
