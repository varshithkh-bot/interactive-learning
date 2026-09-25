// Small shared helpers for every lab: DOM lookup, engineering formatting,
// standard component values and the two control widgets labs are built from.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Format a value with an SI prefix: fmt(0.0047, "F") -> "4.7 mF". */
export function fmt(x, unit = "", d = 3) {
  if (x === Infinity) return "∞ " + unit;
  if (x == null || !isFinite(x)) return "–";
  const a = Math.abs(x);
  if (a < 1e-13) return "0 " + unit;
  const P = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  for (const [m, p] of P) if (a >= m * 0.9995) return +(x / m).toPrecision(d) + " " + p + unit;
  return +(x / 1e-12).toPrecision(d) + " p" + unit;
}

export const pct = (x, d = 1) => (x == null || !isFinite(x) ? "–" : (100 * x).toFixed(d) + " %");

/** E24 preferred values: the resistors and capacitors you can actually buy. */
export const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

export function seriesValues(lo, hi, base = E24) {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
    for (const m of base) {
      const v = +(m * 10 ** e).toPrecision(3);
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
    }
  return out;
}

export function isStandard(v) {
  if (!(v > 0) || !isFinite(v)) return false;
  const e = Math.floor(Math.log10(v) + 1e-9);
  const m = +(v / 10 ** e).toPrecision(3);
  return E24.includes(m) || m === 10;
}

export function nearestIndex(list, v) {
  const exact = list.indexOf(v);
  if (exact >= 0) return exact;
  let bi = 0, bd = Infinity;
  list.forEach((x, i) => {
    if (!(x > 0) || !isFinite(x) || !(v > 0) || !isFinite(v)) return;
    const d = Math.abs(Math.log(x / v));
    if (d < bd) { bd = d; bi = i; }
  });
  return bi;
}

/** Smallest 1-2-5 value >= x (oscilloscope scale steps). */
export function ceil125(x) {
  if (!(x > 0)) return 1;
  const e = Math.floor(Math.log10(x));
  for (const ee of [e, e + 1]) for (const m of [1, 2, 5]) {
    const v = +(m * 10 ** ee).toPrecision(3);
    if (v >= x * 0.999) return v;
  }
  return 10 ** (e + 1);
}

/** Next 1-2-5 value up (dir = 1) or down (dir = -1). */
export function step125(x, dir) {
  const e = Math.floor(Math.log10(x) + 1e-9);
  const seq = [1, 2, 5];
  let i = seq.indexOf(Math.round(x / 10 ** e)), ee = e;
  if (i < 0) i = 0;
  i += dir;
  if (i > 2) { i = 0; ee++; }
  if (i < 0) { i = 2; ee--; }
  return +(seq[i] * 10 ** ee).toPrecision(3);
}

let uid = 0;

/**
 * A labelled slider. Pass `list` for stepped values (E24 parts) or min/max/step.
 * `mult` adds ÷2 and ×2 buttons, which set exact values (like adding a part in series).
 */
export function paramControl({ mount, label, list, min, max, step, value, format, onInput, mult = false, hint = "" }) {
  const id = "p" + ++uid;
  const wrap = document.createElement("div");
  wrap.className = "param";
  wrap.innerHTML = `<div class="param-head"><label for="${id}">${label}</label><output class="mono" for="${id}"></output></div>
    <div class="param-row">${mult ? `<button type="button" class="nudge" data-f="0.5" aria-label="Halve ${label}">÷2</button>` : ""}<input type="range" id="${id}">${mult ? `<button type="button" class="nudge" data-f="2" aria-label="Double ${label}">×2</button>` : ""}</div>${hint ? `<p class="param-hint">${hint}</p>` : ""}`;
  const inp = wrap.querySelector("input"), out = wrap.querySelector("output");
  let v = value;
  if (list) { inp.min = 0; inp.max = list.length - 1; inp.step = 1; } else { inp.min = min; inp.max = max; inp.step = step; }
  const lo = list ? list[0] : min, hi = list ? list[list.length - 1] : max;
  const render = () => { out.textContent = format(v); inp.value = list ? nearestIndex(list, v) : v; };
  inp.addEventListener("input", () => { v = list ? list[+inp.value] : +inp.value; render(); onInput(v); });
  wrap.querySelectorAll(".nudge").forEach(b => b.addEventListener("click", () => {
    const nv = +(v * +b.dataset.f).toPrecision(4);
    if (nv < lo * 0.999 || nv > hi * 1.001) return;
    v = nv; render(); onInput(v);
  }));
  render();
  mount.appendChild(wrap);
  return {
    el: wrap,
    get: () => v,
    set(nv) { v = nv; render(); },
    setDisabled(d) { inp.disabled = d; wrap.querySelectorAll("button").forEach(b => (b.disabled = d)); wrap.classList.toggle("disabled", d); },
    show(on) { wrap.classList.toggle("hide", !on); },
  };
}

/** A segmented button group with one active choice. */
export function segControl({ mount, label, options, value, onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "param";
  const lid = "s" + ++uid;
  wrap.innerHTML = `<div class="param-head"><span id="${lid}">${label}</span></div><div class="seg" role="group" aria-labelledby="${lid}">${options.map(o => `<button type="button" data-v="${o.v}">${o.label}</button>`).join("")}</div>`;
  const btns = [...wrap.querySelectorAll("button")];
  let v = value;
  const render = () => btns.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i].v === v)));
  btns.forEach((b, i) => b.addEventListener("click", () => { v = options[i].v; render(); onChange(v); }));
  render();
  mount.appendChild(wrap);
  return {
    el: wrap,
    get: () => v,
    set(nv) { v = nv; render(); },
    setDisabled(d) { btns.forEach(b => (b.disabled = d)); },
    show(on) { wrap.classList.toggle("hide", !on); },
  };
}

export const store = {
  get(k, d) { try { const s = localStorage.getItem(k); return s == null ? d : JSON.parse(s); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
