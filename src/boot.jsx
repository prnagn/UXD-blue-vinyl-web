import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { BlueVinylDisc, BlueVinylIcon, BlueVinylWord } from "./brand-logo";
import { AppIcon } from "./boot-icons";
const DOCK = ["phone", "browser", "messages", "music"];
const ICON = (kind, name, extra = "") => /* @__PURE__ */ jsxs("div", { className: `bt-app ${extra}`, children: [
  /* @__PURE__ */ jsx("div", { className: "bt-ic", children: /* @__PURE__ */ jsx(AppIcon, { kind }) }),
  /* @__PURE__ */ jsx("span", { children: name })
] }, name);
const photo = (n) => `${import.meta.env.BASE_URL}img/${n}`;
export default function Boot({ children, onPip }) {
  const [viaPip, setViaPip] = useState(false);
  const skip = typeof location !== "undefined" && new URLSearchParams(location.search).get("boot") === "0" || typeof location !== "undefined" && (new URLSearchParams(location.search).has("code") || location.hash.startsWith("#lp="));
  const [stage, setStage] = useState(skip ? "done" : "home");
  useEffect(() => {
    if (stage === "opening") {
      const t = setTimeout(() => setStage("splash"), 520);
      return () => clearTimeout(t);
    }
    if (stage === "splash") {
      const t = setTimeout(() => setStage("done"), viaPip ? 1500 : 4300);
      return () => clearTimeout(t);
    }
  }, [stage, viaPip]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    stage === "done" && children,
    stage !== "done" && /* @__PURE__ */ jsx("div", { className: `bt bt-${stage}`, children: stage === "splash" ? /* @__PURE__ */ jsx("div", { className: `bt-splash${viaPip ? " short" : ""}`, children: /* @__PURE__ */ jsxs("div", { className: "bt-lock", children: [
      /* @__PURE__ */ jsx("div", { className: "bt-disc", children: /* @__PURE__ */ jsx(BlueVinylDisc, { size: 76 }) }),
      /* @__PURE__ */ jsx("div", { className: "bt-word", children: /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx(BlueVinylWord, { height: 41 }) }) })
    ] }) }) : /* @__PURE__ */ jsxs("div", { className: "bt-home", children: [
      /* @__PURE__ */ jsx("div", { className: "bt-wall" }),
      /* @__PURE__ */ jsx("div", { className: "bt-island" }),
      /* @__PURE__ */ jsxs("div", { className: "bt-status", children: [
        /* @__PURE__ */ jsx("b", { children: "9:41" }),
        /* @__PURE__ */ jsxs("span", { className: "bt-sig", children: [
          /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 18 12", width: "18", height: "12", "aria-hidden": true, children: [
            /* @__PURE__ */ jsx("rect", { x: "0", y: "8", width: "3", height: "4", rx: "0.8", fill: "#fff" }),
            /* @__PURE__ */ jsx("rect", { x: "5", y: "5.5", width: "3", height: "6.5", rx: "0.8", fill: "#fff" }),
            /* @__PURE__ */ jsx("rect", { x: "10", y: "3", width: "3", height: "9", rx: "0.8", fill: "#fff" }),
            /* @__PURE__ */ jsx("rect", { x: "15", y: "0", width: "3", height: "12", rx: "0.8", fill: "#fff" })
          ] }),
          /* @__PURE__ */ jsx("svg", { viewBox: "0 0 17 12", width: "17", height: "12", "aria-hidden": true, children: /* @__PURE__ */ jsx("path", { d: "M8.5 11.2 6 8.6a3.6 3.6 0 0 1 5 0Zm-5-5a7.100 7.100 0 0 1 10 0l-1.400 1.400a5.100 5.100 0 0 0-7.200 0Zm-2.600-2.600a10.800 10.800 0 0 1 15.200 0l-1.400 1.400a8.800 8.800 0 0 0-12.400 0Z", fill: "#fff" }) }),
          /* @__PURE__ */ jsx("em", { children: /* @__PURE__ */ jsx("i", {}) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bt-grid", children: [
        ICON("clock", "\uC2DC\uACC4"),
        ICON("camera", "\uCE74\uBA54\uB77C"),
        /* @__PURE__ */ jsxs("div", { className: "bt-wcell", children: [
          /* @__PURE__ */ jsxs("div", { className: "bt-w bt-act", children: [
            /* @__PURE__ */ jsx("svg", { viewBox: "0 0 60 60", width: "62", height: "62", "aria-hidden": true, children: [["#fa114f", 26, 0.75], ["#a6ff00", 19, 0.63], ["#00e0ff", 12, 0.34]].map(([c, r, f]) => /* @__PURE__ */ jsxs("g", { fill: "none", strokeWidth: "6", strokeLinecap: "round", children: [
              /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r, stroke: String(c), opacity: ".25" }),
              /* @__PURE__ */ jsx("circle", { cx: "30", cy: "30", r, stroke: String(c), strokeDasharray: `${2 * Math.PI * r * f} 999`, transform: "rotate(-90 30 30)" })
            ] }, String(c))) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("b", { style: { color: "#fa114f" }, children: [
                "375/500",
                /* @__PURE__ */ jsx("small", { children: "CAL" })
              ] }),
              /* @__PURE__ */ jsxs("b", { style: { color: "#a6ff00" }, children: [
                "19/30",
                /* @__PURE__ */ jsx("small", { children: "MIN" })
              ] }),
              /* @__PURE__ */ jsxs("b", { style: { color: "#00e0ff" }, children: [
                "4/12",
                /* @__PURE__ */ jsx("small", { children: "HRS" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "bt-wl", children: "\uD65C\uB3D9" })
        ] }),
        ICON("tv", "TV"),
        ICON("stocks", "\uC8FC\uC2DD"),
        /* @__PURE__ */ jsxs("div", { className: "bt-wcell bt-wphoto", children: [
          /* @__PURE__ */ jsxs("div", { className: "bt-w bt-pic", style: { backgroundImage: `url(${photo("reykjavik-1.jpg")})` }, children: [
            /* @__PURE__ */ jsx("b", { children: "REYKJAVIK" }),
            /* @__PURE__ */ jsx("small", { children: "Feb 18, 2024" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "bt-wl", children: "\uC0AC\uC9C4" })
        ] }),
        ICON("mail", "\uBA54\uC77C"),
        ICON("files", "\uD30C\uC77C"),
        /* @__PURE__ */ jsxs("button", { className: "bt-app bt-bv", onClick: () => stage === "home" && setStage("opening"), "aria-label": "Blue Vinyl \uC5F4\uAE30", children: [
          /* @__PURE__ */ jsx("div", { className: "bt-ic bt-ic-bv", children: /* @__PURE__ */ jsx(BlueVinylIcon, { size: 60 }) }),
          /* @__PURE__ */ jsx("span", { children: "Blue Vinyl" })
        ] }),
        ICON("weather", "\uB0A0\uC528"),
        ICON("health", "\uAC74\uAC15"),
        ICON("home", "\uD648"),
        /* @__PURE__ */ jsxs("div", { className: "bt-wcell bt-wmusic", children: [
          /* @__PURE__ */ jsxs("div", { className: "bt-w bt-mus", children: [
            /* @__PURE__ */ jsx("div", { className: "bt-alb", children: /* @__PURE__ */ jsx(BlueVinylDisc, { size: 44 }) }),
            /* @__PURE__ */ jsx("b", { children: "Hopp\xEDpolla" }),
            /* @__PURE__ */ jsx("small", { children: "Sigur R\xF3s" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "bt-wl", children: "\uC74C\uC545" })
        ] }),
        ICON("news", "\uB274\uC2A4"),
        ICON("photos", "\uC0AC\uC9C4")
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "bt-pip",
          "aria-label": "\uAE30\uB85D\uD558\uAE30",
          onClick: () => {
            if (stage !== "home") return;
            setViaPip(true);
            onPip?.();
            setStage("opening");
          },
          children: /* @__PURE__ */ jsx("i", {})
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "bt-dots", children: [
        /* @__PURE__ */ jsx("i", { className: "on" }),
        /* @__PURE__ */ jsx("i", {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bt-dock", children: DOCK.map((a, i) => /* @__PURE__ */ jsx("div", { className: "bt-ic", children: /* @__PURE__ */ jsx(AppIcon, { kind: a }) }, i)) }),
      /* @__PURE__ */ jsx("div", { className: "bt-homebar" }),
      stage === "opening" && /* @__PURE__ */ jsx("div", { className: `bt-zoom${viaPip ? " pip" : ""}`, children: viaPip ? null : /* @__PURE__ */ jsx(BlueVinylIcon, { size: 60 }) })
    ] }) })
  ] });
}
