import { jsx } from "react/jsx-runtime";
const base = import.meta.env.BASE_URL;
export function BlueVinylIcon({ size = 120 }) {
  return /* @__PURE__ */ jsx("img", { src: `${base}img/bv-icon.png`, width: size, height: size, alt: "Blue Vinyl", draggable: false, style: { display: "block" } });
}
export function BlueVinylDisc({ size = 100 }) {
  return /* @__PURE__ */ jsx("img", { src: `${base}img/bv-disc.png`, height: size, alt: "", draggable: false, style: { display: "block", height: size, width: "auto" } });
}
export function BlueVinylWord({ height = 50 }) {
  return /* @__PURE__ */ jsx("img", { src: `${base}img/bv-word.png`, alt: "Blue Vinyl", draggable: false, style: { display: "block", height, width: "auto" } });
}
