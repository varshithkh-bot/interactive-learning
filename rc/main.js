// RC Lesson 1 page. Deliberately small: one circuit, one graph, one button, and only the
// controls the current step needs. The engineering bench (bench/) reuses the same model and core.

import { $, fmt, seriesValues, paramControl } from "../core/ui.js";
import { Scope, interp, crossTime } from "../core/scope.js";
import { Notebook } from "../core/notebook.js";
import { Why } from "../core/why.js";
import { Mission } from "../core/mission.js";
import { createRC, simulateCapture } from "./model.js";
import { Circuit } from "./circuit.js";
import { STAGES, STEPS, WHY, VIEW, secs } from "./lesson.js";

const V = 5, WINDOW_DIVS = 6, TDIV = 1;         // graph: 0–6 s, 0–6 V, played in real time
const model = createRC();
const P = { R: 10e3, C: 100e-6 };
let unlocked = new Set(), locked = false, charged = false;
const sync = () => Object.assign(model.p, { V, R: P.R, C: P.C });
sync();

// ───────── graph ─────────
const ch = { label: "V", color: "#2A5BD7", unit: "V", zero: 0, scale: 1, visible: true, get: s => s.vx };
const scope = new Scope($("#scope"), { channels: [ch], divsX: WINDOW_DIVS, divsY: 6, preDivs: 0, tdiv: TDIV, style: "plain" });
function readPalette() {
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  scope.palette = { bg: v("--panel"), grid: v("--line2"), axis: v("--line"), text: v("--muted"), ghost: v("--ghost"), ref: v("--muted") };
  ch.color = v("--vc");
}
readPalette();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readPalette);

const pctOf = (c, v) => (v - c.meta.vpre) / (c.meta.vfinal - c.meta.vpre);
const label = (ctx, text, x, y, color, align = "left") => {
  ctx.font = '600 12.5px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = align; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width, bx = align === "left" ? x : x - w;
  ctx.fillStyle = scope.palette.bg; ctx.fillRect(bx - 4, y - 10, w + 8, 20);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
};

scope.overlays.push(({ ctx, X, Y, pad, w }) => {                  // "full" line at the battery voltage
  const y = Math.round(Y(V, ch)) + 0.5;
  ctx.strokeStyle = scope.palette.axis; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = scope.palette.text; ctx.font = '12px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("full (battery voltage)", w - pad.r - 4, y - 4);
});
scope.overlays.push(({ ctx, X, pad, h }) => {                     // τ markers, once τ has been discovered
  if (!unlocked.has("tau")) return;
  const tau = scope.capture?.meta.tau ?? P.R * P.C;
  ctx.strokeStyle = scope.palette.text; ctx.globalAlpha = 0.55; ctx.setLineDash([2, 4]);
  ctx.font = '600 12px "JetBrains Mono",monospace'; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let n = 1; n <= 5 && n * tau <= scope.span; n++) {
    const x = Math.round(X(n * tau)) + 0.5;
    if (n > 1 && X(n * tau) - X((n - 1) * tau) < 26) break;
    ctx.beginPath(); ctx.moveTo(x, pad.t + 18); ctx.lineTo(x, h - pad.b); ctx.stroke();
    ctx.fillStyle = scope.palette.text; ctx.fillText(n + "τ", x, pad.t + 2);
  }
});
scope.topOverlays = [({ ctx, X, Y }) => {                         // one marker: "90 % full at …" (or 63 % at 1τ)
  const c = scope.capture;
  if (!c) return;
  if (unlocked.has("tauDot")) {
    const tau = c.meta.tau, v = interp(c.samples, "vx", tau);
    if (v == null) return;
    const x = X(tau), y = Y(v, ch);
    ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill();
    label(ctx, `${Math.round(100 * pctOf(c, v))} % full at 1τ`, x + 10, y + 16, ch.color);
    return;
  }
  const t = crossTime(c.samples, s => pctOf(c, s.vx), 0.9);
  if (t == null) return;
  const x = X(t), y = Y(0.9 * V, ch);
  ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill();
  label(ctx, `90 % full · ${secs(t)}`, Math.min(x + 10, ctx.canvas.clientWidth - 150), y + 18, ch.color);
}];

// ───────── circuit ─────────
const circuit = new Circuit($("#circuit"), { simple: true, onToggle: () => charge() });

// ───────── the one action: charge from empty ─────────
function charge() {
  if (locked) return;
  model.s.vc = 0; model.s.sw = "B";
  const o0 = model.out();
  model.s.sw = "A";
  const o1 = model.out();
  scope.push(o0, true); scope.push(o1, true);
  scope.trigger(o1.t, { sw: "A", vpre: 0, vc0: 0, vfinal: V, tau: P.R * P.C, R: P.R, C: P.C }, { force: true });
  charged = true;
  $("#chargeBtn").textContent = "Charge again";
}
$("#chargeBtn").addEventListener("click", charge);

function measure(c) {
  const f = s => pctOf(c, s.vx);
  return { t63: crossTime(c.samples, f, 1 - Math.exp(-1)), t90: crossTime(c.samples, f, 0.9), final: c.samples[c.samples.length - 1].vx };
}

// ───────── controls: only R and C, shown when the lesson needs them ─────────
const ctl = {
  R: paramControl({ mount: $("#params"), label: "Resistor R", list: seriesValues(1e3, 100e3), value: P.R, format: v => fmt(v, "Ω"), mult: true, onInput: v => setP("R", v) }),
  C: paramControl({ mount: $("#params"), label: "Capacitor C", list: seriesValues(10e-6, 1000e-6), value: P.C, format: v => fmt(v, "F"), mult: true, onInput: v => setP("C", v) }),
};
function setP(k, v) {
  P[k] = v; sync();
  const el = ctl[k].el;
  el.classList.remove("changed"); void el.offsetWidth; el.classList.add("changed");
  renderTau();
}
function renderTau() {
  const on = unlocked.has("tau");
  $("#tauRead").classList.toggle("hide", !on);
  if (on) $("#tauRead").innerHTML = `τ = R × C = <b>${secs(P.R * P.C)}</b>`;
}

// ───────── legend: which curve is which, and what was different ─────────
let legendKey = "";
function renderLegend() {
  const c = scope.capture, p = scope.prev, r = scope.ref;
  const key = [c?.t0, p?.t0, r?.label].join("|");
  if (key === legendKey) return;
  legendKey = key;
  const desc = m => `R ${fmt(m.R, "Ω")} · C ${fmt(m.C, "F")}`;
  const items = [];
  if (c) items.push(`<span><i class="sw now"></i>This charge <small>${desc(c.meta)}</small></span>`);
  if (p && scope.showPrev) items.push(`<span><i class="sw last"></i>Last charge <small>${desc(p.meta)}</small></span>`);
  if (r) items.push(`<span><i class="sw ref"></i>${r.label[0].toUpperCase() + r.label.slice(1)}</span>`);
  $("#legend").innerHTML = items.join("");
}

// ───────── lab API used by the lesson ─────────
const lab = {
  get P() { return P; }, model, scope,
  reset(o = {}) {
    Object.assign(P, { R: 10e3, C: 100e-6 }, o); sync();
    model.s.vc = 0; model.s.sw = "B";
    scope.clear(); scope.ref = null;
    charged = false;
    $("#chargeBtn").textContent = "Charge";
    ctl.R.set(P.R); ctl.C.set(P.C);
    legendKey = ""; renderTau();
  },
  show(keys) {
    for (const k of ["R", "C"]) ctl[k].show(keys.includes(k));
    $("#params").classList.toggle("hide", !keys.length);
  },
  lock(b) {
    locked = b;
    $("#chargeBtn").disabled = b;
    ctl.R.setDisabled(b); ctl.C.setDisabled(b);
    document.body.classList.toggle("locked", b);
  },
  setUnlocks(s) { unlocked = new Set(s); renderTau(); },
  addUnlock(k) { unlocked.add(k); renderTau(); },
  setRef(c, text) { c.label = text; scope.ref = c; },
  baseline(o = {}) {
    const c = simulateCapture({ V, R: 10e3, C: 100e-6, Rs: 0, ESR: 0, Rleak: Infinity, Rprobe: Infinity, ...o }, { from: "B", to: "A", v0: 0, tdiv: TDIV, preDivs: 0, divsX: WINDOW_DIVS });
    c.samples = c.samples.filter(s => s.t >= 0);
    return c;
  },
  fullAt: (c, t) => { const v = interp(c.samples, "vx", t); return v == null ? null : pctOf(c, v); },
  discoveries: () => notebook.items.map(x => x.text),
};

const notebook = new Notebook({ key: "rc1:notebook", toggle: $("#nbBtn"), title: "What I discovered" });
new Why(WHY, { depth: () => "simple" });
const mission = new Mission({
  mount: $("#mission"), steps: STEPS, stages: STAGES, lab, notebook, key: "rc1:progress", view: VIEW,
  onCustom: id => { if (id === "restart") mission.start(0); },
});

// For a future AI tutor: the live experiment, straight from the model.
window.rcLab = {
  snapshot: () => ({ lesson: "rc-1", step: mission.step.id, R: P.R, C: P.C, V, tau: P.R * P.C, vC: model.s.vc, t: model.s.t, lastMeasurements: scope.capture?.meas ?? null, discoveries: lab.discoveries() }),
};

// ───────── loop: real time, so one second on the graph is one second on your watch ─────────
let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.5, Math.max(0, (ts - last) / 1000));   // the solver is exact at any step, so slow frames stay in real time
  last = ts;
  if (dt > 0) model.advance(dt, TDIV / 80, o => scope.push(o), () => {});
  const c = scope.capture;
  if (c && !c.fired) {
    const lastS = c.samples[c.samples.length - 1];
    const settled = pctOf(c, lastS.vx) >= 0.995;
    if (settled || c.done) {                        // report as soon as the result is readable
      c.fired = true; c.hold = settled;
      c.meas = measure(c);
      mission.event({ type: "complete", capture: c, meas: c.meas });
    }
  }
  const o = model.out();
  circuit.update({
    sw: model.s.sw, i: o.i, iRef: V / P.R, vc: model.s.vc, vRef: V, labels: { R: P.R, C: P.C, V },
    show: { Rs: null, ESR: null, Rleak: null, Rprobe: null }, dt, locked,
  });
  const vr = charged ? model.s.vc.toFixed(2) + " V" : "empty";
  if ($("#vRead").textContent !== vr) $("#vRead").textContent = vr;
  scope.draw();
  renderLegend();
  schedule();
}
// Animation frames stop when the page isn't being drawn; a slow timer keeps real time running anyway.
let tick = 0;
function schedule() {
  const my = ++tick;
  requestAnimationFrame(ts => { if (my === tick) frame(ts); });
  setTimeout(() => { if (my === tick) frame(performance.now()); }, 250);
}

mission.start(mission.i, { focus: false });
schedule();
