// RC Lab: wires the deterministic model, the scope, the schematic and the guided missions together.

import { $, $$, fmt, seriesValues, ceil125, step125, paramControl, segControl, store } from "../../core/ui.js";
import { Scope, interp, crossTime, fmtScale } from "../../core/scope.js";
import { Notebook } from "../../core/notebook.js";
import { Why } from "../../core/why.js";
import { Mission } from "../../core/mission.js";
import { createRC, simulateCapture, IDEAL } from "../model.js";
import { Circuit } from "../circuit.js";
import { STAGES, STEPS, WHY } from "./lesson.js";

const DEFAULTS = { V: 5, R: 10e3, C: 100e-6, V0: 0, ...IDEAL, input: "step", period: 1 };
const ALL_TOOLS = ["tau", "tangent", "cursors", "guide632", "measure", "probe", "nonideal", "energy"];

const model = createRC();
const P = { ...DEFAULTS };          // what the learner has set (and can see)
let hidden = {};                    // mystery non-idealities the learner can't see yet
const revealed = new Set();
let unlocked = new Set();
let locked = false, mode = "guided", speed = "normal", trigSlope = "any", lastCapture = null;
const sync = () => Object.assign(model.p, P, hidden);

// ───────── scope ─────────
const ch1 = { id: "vx", label: "CAP", color: "#7EA6FF", unit: "V", zero: 2, scale: 1, visible: true, get: s => s.vx };
const ch2 = { id: "i", label: "I", color: "#FFB547", unit: "A", zero: 4, scale: 0.2e-3, visible: true, dash: [7, 4], width: 1.8, get: s => s.i };
const ch3 = { id: "vin", label: "IN", color: "#A3B0C2", unit: "V", zero: 2, visible: false, width: 1.4, get: s => s.vin };
const ch4 = { id: "vr", label: "V_R", color: "#3FD0BC", unit: "V", zero: 2, visible: false, width: 1.6, get: s => s.vr };
for (const c of [ch3, ch4]) { c.linked = true; Object.defineProperty(c, "scale", { get: () => ch1.scale }); }
const scope = new Scope($("#scope"), { channels: [ch1, ch2, ch3, ch4], tdiv: 0.5 });
scope.hint = "Flip the switch to start a sweep";
let tangentOn = true;

// ───────── schematic ─────────
const circuit = new Circuit($("#circuit"), { onToggle: () => flip(model.s.sw === "A" ? "B" : "A") });

// ───────── switching and triggering ─────────
function flip(sw, { user = true } = {}) {
  if (user && locked) return;
  if (model.s.sw === sw) return;
  if (user && P.input === "square") { P.input = "step"; sync(); ctl.input.set("step"); trigSlope = "any"; }
  const o0 = model.out(); model.s.sw = sw; const o1 = model.out();
  edge(o0, o1, true);
  renderSwitch();
}

function edge(o0, o1, force) {
  scope.push(o0, true); scope.push(o1, true);
  const dir = o1.sw === "A" ? "rise" : "fall";
  if (trigSlope !== "any" && trigSlope !== dir) return;
  scope.trigger(o1.t, {
    sw: o1.sw, vpre: o0.vx, vc0: o0.vc, vfinal: model.finalVx(o1.sw),
    P: { ...model.p }, vis: { ...P }, tauRC: P.R * P.C, eSrc0: model.s.eSrc, square: P.input === "square",
  }, { force });
}

function measure(c) {
  const m = c.meta, s = c.samples, span = m.vfinal - m.vpre, last = s[s.length - 1];
  const out = { final: last.vx, i0: interp(s, "i", 0), supplied: model.s.eSrc - m.eSrc0, stored: 0.5 * m.P.C * (model.s.vc ** 2 - m.vc0 ** 2) };
  if (m.square || Math.abs(span) < 1e-6 * Math.max(1, Math.abs(m.vfinal))) return out;
  const f = x => (x.vx - m.vpre) / span, cr = l => crossTime(s, f, l);
  return { ...out, t10: cr(0.1), t63: cr(1 - Math.exp(-1)), t90: cr(0.9), t99: cr(0.99), rise: cr(0.1) != null && cr(0.9) != null ? cr(0.9) - cr(0.1) : null };
}

scope.on("complete", c => {
  c.meas = measure(c);
  lastCapture = c;
  renderMeas();
  if (mode === "guided") mission.event({ type: "complete", capture: c, meas: c.meas });
});
scope.on("cursor", () => { if (mode === "guided") mission.event({ type: "cursor" }); });
scope.on("mode", renderScopeBar);

// ───────── overlays: tools that appear as the learner earns them ─────────
const pctOf = (c, v) => (v - c.meta.vpre) / (c.meta.vfinal - c.meta.vpre);
const stepLike = c => c && !c.meta.square && Math.abs(c.meta.vfinal - c.meta.vpre) > 1e-9;

scope.overlays.push(({ ctx, X, Y, h, dx }) => {                   // τ markers
  const c = scope.capture;
  if (!unlocked.has("tau") || !stepLike(c)) return;
  const tau = c.meta.tauRC, every = Math.max(1, Math.ceil(22 / (tau / scope.tdiv * dx)));
  ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.fillStyle = "rgba(220,230,245,.75)";
  ctx.setLineDash([2, 4]); ctx.font = '600 10px "JetBrains Mono",monospace'; ctx.textAlign = "center";
  for (let n = every; n * tau <= scope.span; n += every) {
    const x = Math.round(X(n * tau)) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 42); ctx.stroke();
    ctx.fillText(n + "τ", x, h - 30);
  }
});
scope.overlays.push(({ ctx, X, Y, w }) => {                        // 63.2 % guide
  const c = scope.capture;
  if (!unlocked.has("guide632") || !stepLike(c)) return;
  const y = Y(c.meta.vpre + (1 - Math.exp(-1)) * (c.meta.vfinal - c.meta.vpre), ch1);
  ctx.strokeStyle = "rgba(126,166,255,.45)"; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(w, y); ctx.stroke();
  ctx.fillStyle = "#7EA6FF"; ctx.font = '600 10px "JetBrains Mono",monospace'; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("63.2 %", w - 8, y - 3);
});
scope.overlays.push(({ ctx, X, Y }) => {                           // 90 % flag (before the full measurement tools)
  const c = scope.capture;
  if (unlocked.has("measure") || !stepLike(c) || !["explore", "discover"].includes(curStage())) return;
  const t = crossTime(c.samples, x => pctOf(c, x.vx), 0.9);
  if (t == null) return;
  const v = c.meta.vpre + 0.9 * (c.meta.vfinal - c.meta.vpre), x = X(t), y = Y(v, ch1);
  ctx.fillStyle = "#7EA6FF"; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
  ctx.font = '600 11px "JetBrains Mono",monospace'; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const label = `90 % · ${fmt(t, "s")}`, tw = ctx.measureText(label).width;
  const lx = Math.min(x + 9, ctx.canvas.clientWidth - tw - 12);
  const ly = c.meta.sw === "A" ? y + 16 : y - 16;
  ctx.fillStyle = "rgba(10,17,27,.8)"; ctx.fillRect(lx - 4, ly - 9, tw + 8, 18);
  ctx.fillStyle = "#DCE6FF"; ctx.fillText(label, lx, ly);
});
scope.overlays.push(({ ctx, X, Y }) => {                           // slope line: where the curve is heading
  const c = scope.capture;
  if (!unlocked.has("tangent") || !tangentOn || !stepLike(c) || c.samples.length < 4) return;
  const d = scope.tdiv / 100, lastT = c.samples[c.samples.length - 1].t;
  let t = scope.cursors.on ? scope.cursors.a : lastT - d;
  t = Math.min(t, lastT - d);
  if (t < d) return;
  const v0 = interp(c.samples, "vx", t - d), v1 = interp(c.samples, "vx", t + d), v = interp(c.samples, "vx", t);
  if (v0 == null || v1 == null) return;
  const slope = (v1 - v0) / (2 * d), p = pctOf(c, v);
  if (!(p > 0.02 && p < 0.985) || Math.abs(slope) < 1e-12) return;
  const tHit = t + (c.meta.vfinal - v) / slope, yF = Y(c.meta.vfinal, ch1);
  ctx.strokeStyle = "#F4F7FB"; ctx.lineWidth = 1.6; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(X(t), Y(v, ch1)); ctx.lineTo(X(tHit), yF); ctx.stroke();
  ctx.fillStyle = "#F4F7FB"; ctx.beginPath(); ctx.arc(X(t), Y(v, ch1), 3.5, 0, 7); ctx.arc(X(tHit), yF, 3.5, 0, 7); ctx.fill();
  const yb = yF + (c.meta.sw === "A" ? -12 : 12);
  ctx.strokeStyle = "rgba(244,247,251,.6)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X(t), yb); ctx.lineTo(X(tHit), yb); ctx.moveTo(X(t), yb - 4); ctx.lineTo(X(t), yb + 4); ctx.moveTo(X(tHit), yb - 4); ctx.lineTo(X(tHit), yb + 4); ctx.stroke();
  ctx.font = '600 11px "JetBrains Mono",monospace'; ctx.textAlign = "center"; ctx.textBaseline = c.meta.sw === "A" ? "bottom" : "top";
  ctx.fillText(`${((tHit - t) / c.meta.tauRC).toFixed(2)}τ`, (X(t) + X(tHit)) / 2, yb + (c.meta.sw === "A" ? -3 : 3));
});

// ───────── controls ─────────
const Rlist = seriesValues(100, 1e6), Clist = seriesValues(1e-9, 1e-3);
const ctl = {};
function setP(k, v) { P[k] = v; sync(); if (mode === "guided") mission.event({ type: "param", k }); }
ctl.R = paramControl({ mount: $("#params"), label: "Resistance R", list: Rlist, value: P.R, format: v => fmt(v, "Ω"), mult: true, onInput: v => setP("R", v) });
ctl.C = paramControl({ mount: $("#params"), label: "Capacitance C", list: Clist, value: P.C, format: v => fmt(v, "F"), mult: true, onInput: v => setP("C", v) });
ctl.V = paramControl({ mount: $("#params"), label: "Battery V", min: 0.5, max: 24, step: 0.5, value: P.V, format: v => v.toFixed(1) + " V", onInput: v => setP("V", v) });
ctl.probe = segControl({
  mount: $("#params"), label: "Scope probe",
  options: [{ v: Infinity, label: "Ideal" }, { v: 1e7, label: "10× · 10 MΩ" }, { v: 1e6, label: "1× · 1 MΩ" }],
  value: Infinity, onChange: v => setP("Rprobe", v),
});
ctl.V0 = paramControl({ mount: $("#advParams"), label: "Initial V_C (on reset)", min: 0, max: 24, step: 0.5, value: 0, format: v => v.toFixed(1) + " V", onInput: v => setP("V0", v) });
ctl.input = segControl({
  mount: $("#advParams"), label: "Input", options: [{ v: "step", label: "Switch" }, { v: "square", label: "Square wave" }], value: "step",
  onChange: v => { if (v === "square") square(P.period); else { P.input = "step"; trigSlope = "any"; sync(); } renderAdv(); },
});
ctl.period = paramControl({ mount: $("#advParams"), label: "Square period", list: seriesValues(1e-5, 100, [1, 2, 5]), value: 1, format: v => fmt(v, "s"), onInput: v => { setP("period", v); if (P.input === "square") model.s.sqT0 = model.s.t; } });
ctl.Rs = paramControl({ mount: $("#advParams"), label: "Source resistance Rs", list: [0, ...seriesValues(10, 100e3, [1, 2.2, 4.7])], value: 0, format: v => fmt(v, "Ω"), onInput: v => setP("Rs", v) });
ctl.ESR = paramControl({ mount: $("#advParams"), label: "Capacitor ESR", list: [0, ...seriesValues(0.01, 100, [1, 2.2, 4.7])], value: 0, format: v => fmt(v, "Ω"), onInput: v => setP("ESR", v) });
ctl.Rleak = paramControl({ mount: $("#advParams"), label: "Leakage R_leak", list: [Infinity, ...seriesValues(1e3, 10e6, [1, 2.2, 4.7]).reverse()], value: Infinity, format: v => (v === Infinity ? "none" : fmt(v, "Ω")), onInput: v => setP("Rleak", v) });
const PARAM_KEYS = ["R", "C", "V", "V0", "period", "Rs", "ESR", "Rleak"];

function refreshControls() {
  for (const k of PARAM_KEYS) ctl[k].set(P[k]);
  ctl.probe.set(P.Rprobe);
  ctl.input.set(P.input);
  renderAdv();
}
function renderAdv() { ctl.period.show(P.input === "square"); }

$$("#swSeg button").forEach(b => b.addEventListener("click", () => flip(b.dataset.sw)));
function renderSwitch() { $$("#swSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sw === model.s.sw))); }
$("#resetCap").addEventListener("click", () => { if (locked) return; model.s.vc = P.V0; model.s.eSrc = 0; scope.push(model.out(), true); });
$("#speed").addEventListener("change", e => { speed = e.target.value; });

// scope panel buttons
$("#runBtn").addEventListener("click", () => scope.setMode("run"));
$("#stopBtn").addEventListener("click", () => scope.setMode("stop"));
$("#singleBtn").addEventListener("click", () => scope.setMode("armed"));
const knob = (minus, plus, get, set, lo, hi) => {
  $(minus).addEventListener("click", () => { set(Math.max(lo, step125(get(), -1))); renderScopeBar(); });
  $(plus).addEventListener("click", () => { set(Math.min(hi, step125(get(), 1))); renderScopeBar(); });
};
knob("#tMinus", "#tPlus", () => scope.tdiv, v => { scope.tdiv = v; }, 1e-7, 100);
knob("#vMinus", "#vPlus", () => ch1.scale, v => { ch1.scale = v; }, 1e-3, 50);
knob("#iMinus", "#iPlus", () => ch2.scale, v => { ch2.scale = v; }, 1e-9, 10);
$("#autoset").addEventListener("click", autoset);
$("#refBtn").addEventListener("click", () => { scope.ref = scope.ref ? null : scope.capture; renderScopeBar(); });
$("#cursBtn").addEventListener("click", () => cursorsOn(!scope.cursors.on));

const CHIPS = [[ch1, "CAP  V<sub>C</sub>"], [ch2, "I  current"], [ch3, "IN  source"], [ch4, "V<sub>R</sub>  resistor"]];
$("#chChips").innerHTML = CHIPS.map(([c, l], k) => `<button type="button" class="chip-btn" data-ch="${k}" aria-pressed="${c.visible}"><i style="background:${c.color}"></i>${l}</button>`).join("")
  + `<button type="button" class="chip-btn" data-tan aria-pressed="true"><i style="background:#F4F7FB"></i>Slope line</button>`
  + `<button type="button" class="chip-btn" data-ghost aria-pressed="true"><i class="ghost"></i>Previous sweep</button>`;
$("#chChips").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.ch) { const c = CHIPS[+b.dataset.ch][0]; c.visible = !c.visible; b.setAttribute("aria-pressed", String(c.visible)); }
  if (b.hasAttribute("data-tan")) { tangentOn = !tangentOn; b.setAttribute("aria-pressed", String(tangentOn)); }
  if (b.hasAttribute("data-ghost")) { scope.showPrev = !scope.showPrev; b.setAttribute("aria-pressed", String(scope.showPrev)); }
});

function renderScopeBar() {
  $("#tOut").textContent = fmtScale(scope.tdiv, "s");
  $("#vOut").textContent = fmtScale(ch1.scale, "V");
  $("#iOut").textContent = fmtScale(ch2.scale, "A");
  $("#runBtn").setAttribute("aria-pressed", String(scope.mode === "run"));
  $("#stopBtn").setAttribute("aria-pressed", String(scope.mode === "stop"));
  $("#singleBtn").setAttribute("aria-pressed", String(scope.mode === "armed" || scope.mode === "single"));
  $("#refBtn").setAttribute("aria-pressed", String(!!scope.ref));
  $("#cursBtn").setAttribute("aria-pressed", String(scope.cursors.on));
}

function autoset() {
  const vmax = Math.max(Math.abs(model.finalVx("A")), Math.abs(model.s.vc), Math.abs(P.V0), 0.2);
  ch1.scale = ceil125(vmax / 5.5);
  const p = model.p, i0 = Math.max(p.V / (p.R + p.Rs + p.ESR), Math.abs(model.s.vc) / (p.R + p.ESR));
  ch2.scale = ceil125(i0 / 3.5);
  scope.tdiv = Math.min(100, Math.max(1e-7, P.input === "square" ? ceil125(2 * P.period / 9) : ceil125(model.tau("A") * 0.8)));
  renderScopeBar();
}

function cursorsOn(on) {
  scope.cursors.on = on;
  if (on) { scope.cursors.a = 0.5 * scope.tdiv; scope.cursors.b = 3.3 * scope.tdiv; scope.cursors.active = "a"; }
  $("#scope").classList.toggle("cursoring", on);
  $("#cursorBox").classList.toggle("hide", !on);
  renderScopeBar();
}

function square(period) {
  P.input = "square"; P.period = period; sync();
  model.s.sqT0 = model.s.t;
  trigSlope = "rise";
  ch3.visible = true;
  $$('#chChips [data-ch="2"]').forEach(b => b.setAttribute("aria-pressed", "true"));
  if (model.s.sw !== "A") { const o0 = model.out(); model.s.sw = "A"; edge(o0, model.out(), true); renderSwitch(); }
  refreshControls();
  autoset();
}

// ───────── readouts ─────────
const RO = [
  ["vc", "V<sub>C</sub>", () => fmt(model.out().vx, "V")],
  ["i", "Current I", () => fmt(model.out().i, "A")],
  ["pct", "Charged", () => (P.V > 0 ? Math.round(100 * Math.max(0, model.s.vc) / P.V) + " %" : "–"), () => !unlocked.has("tau")],
  ["tau", "τ = RC", () => fmt(P.R * P.C, "s"), () => unlocked.has("tau")],
  ["energy", "Energy stored / supplied", () => {
    const c = scope.capture;
    if (!c || c.meta.sw !== "A" || c.meta.square) return "charge to measure";
    const sup = model.s.eSrc - c.meta.eSrc0, sto = 0.5 * model.p.C * (model.s.vc ** 2 - c.meta.vc0 ** 2);
    return `${fmt(sto, "J")} / ${fmt(sup, "J")}` + (sup > 0 ? ` · ${Math.round(100 * sto / sup)} %` : "");
  }, () => unlocked.has("energy")],
];
$("#readouts").innerHTML = RO.map(([k, l]) => `<div class="ro" data-ro="${k}"><span class="ro-k">${l}</span><b class="ro-v mono"></b></div>`).join("");
const roEls = RO.map(([k, , f, vis]) => [$(`[data-ro="${k}"]`), $(`[data-ro="${k}"] .ro-v`), f, vis]);
function renderReadouts() {
  for (const [box, el, f, vis] of roEls) {
    const on = !vis || vis();
    box.classList.toggle("hide", !on);
    if (on) { const s = f(); if (el.textContent !== s) el.textContent = s; }
  }
}

$("#cursorBox").innerHTML = `<table class="readtab"><thead><tr><th scope="col"><span class="sr">Cursor</span></th><th scope="col">t</th><th scope="col" class="tcol">t / τ</th><th scope="col">V<sub>C</sub></th><th scope="col">% of step</th><th scope="col">I</th></tr></thead>
  <tbody>${["a", "b", "d"].map(k => `<tr data-k="${k}"><th scope="row">${k === "d" ? "Δ" : k.toUpperCase()}</th>${"<td></td>".repeat(5)}</tr>`).join("")}</tbody></table>`;
function reading(k) {
  const c = scope.capture;
  if (!c) return null;
  const t = scope.cursors[k], v = interp(c.samples, "vx", t);
  if (v == null) return null;
  const span = c.meta.vfinal - c.meta.vpre;
  return { t, n: t / c.meta.tauRC, v, pct: !c.meta.square && Math.abs(span) > 1e-9 ? (v - c.meta.vpre) / span : null, i: interp(c.samples, "i", t) };
}
function renderCursorBox() {
  if (!scope.cursors.on) return;
  $("#cursorBox").classList.toggle("no-tau", !unlocked.has("tau"));
  const a = reading("a"), b = reading("b");
  const row = (k, r, d) => {
    const td = $$(`#cursorBox tr[data-k="${k}"] td`);
    const vals = r ? [fmt(r.t, "s", 4), r.n.toFixed(3), fmt(r.v, "V", 4), r.pct == null ? "–" : (100 * r.pct).toFixed(d ? 2 : 2) + " %", fmt(r.i, "A", 3)] : ["–", "–", "–", "–", "–"];
    td.forEach((e, i) => { if (e.textContent !== vals[i]) e.textContent = vals[i]; });
  };
  row("a", a); row("b", b);
  row("d", a && b ? { t: b.t - a.t, n: b.n - a.n, v: b.v - a.v, pct: a.pct != null && b.pct != null ? b.pct - a.pct : null, i: b.i - a.i } : null, true);
}

function renderMeas() {
  const box = $("#measBox");
  const c = lastCapture;
  const rows = [];
  if (c) {
    const m = c.meas, vis = c.meta.vis, tau = c.meta.tauRC, sq = c.meta.square;
    const vIdeal = c.meta.sw === "A" ? vis.V : 0, i0Ideal = (vIdeal - c.meta.vc0) / vis.R;
    const off = (a, b, abs) => a != null && b != null && (abs != null ? Math.abs(a - b) > abs : Math.abs(a / b - 1) > 0.03);
    rows.push(["End of sweep", fmt(m.final, "V"), fmt(vIdeal, "V"), off(m.final, vIdeal, 0.03 * Math.max(vis.V, 1e-9)), ""]);
    rows.push(["Starting current", fmt(m.i0, "A"), fmt(i0Ideal, "A"), Math.abs(i0Ideal) > 1e-15 && off(m.i0, i0Ideal), ""]);
    if (!sq) {
      rows.push(["t @ 63.2 %", fmt(m.t63, "s"), fmt(tau, "s"), off(m.t63, tau), "632"]);
      rows.push(["Rise 10–90 %", fmt(m.rise, "s"), fmt(Math.log(9) * tau, "s"), off(m.rise, Math.log(9) * tau), "risetime"]);
      rows.push(["t @ 99 %", fmt(m.t99, "s"), fmt(Math.log(100) * tau, "s"), off(m.t99, Math.log(100) * tau), "5tau"]);
    }
  }
  box.innerHTML = `<h3>Measurements <span>last complete sweep · RC predicts from the labelled R, C and V</span></h3>` + (c
    ? `<table class="readtab meas"><thead><tr><th scope="col"><span class="sr">Quantity</span></th><th scope="col">Scope</th><th scope="col">RC predicts</th><th scope="col"><span class="sr">Explain</span></th></tr></thead><tbody>${rows.map(([k, a, b, bad, w]) => `<tr class="${bad ? "off" : ""}"><th scope="row">${k}</th><td>${a}${bad ? ' <span class="flag" title="Differs from the ideal RC model by more than 3 %">≠</span>' : ""}</td><td>${b}</td><td>${w ? `<button type="button" class="why sm" data-why="${w}">WHY?</button>` : ""}</td></tr>`).join("")}</tbody></table>`
    : `<p class="m-small">Complete a sweep to measure it.</p>`);
}

// ───────── tool unlocks, locking, mode ─────────
function applyUnlocks() {
  const has = k => unlocked.has(k);
  $("#cursBtn").classList.toggle("hide", !has("cursors"));
  if (!has("cursors") && scope.cursors.on) cursorsOn(false);
  $("#measBox").classList.toggle("hide", !has("measure"));
  $("[data-tan]").classList.toggle("hide", !has("tangent"));
  ctl.probe.show(has("probe") || has("nonideal"));
  $("#adv").classList.toggle("hide", !has("nonideal"));
}

function lock(b) {
  locked = b;
  for (const k of [...PARAM_KEYS, "probe", "input"]) ctl[k].setDisabled(b);
  $$("#swSeg button, #resetCap").forEach(e => (e.disabled = b));
  document.body.classList.toggle("locked", b);
}

function reset(o = {}) {
  hidden = {}; revealed.clear();
  const pick = {};
  for (const k of Object.keys(DEFAULTS)) if (o[k] !== undefined) pick[k] = o[k];
  Object.assign(P, DEFAULTS, pick);
  sync();
  model.s.sw = o.sw || "B"; model.s.vc = P.V0; model.s.eSrc = 0;
  trigSlope = "any";
  ch3.visible = false;
  scope.clear(); scope.ref = null; scope.setMode("run");
  scope.tdiv = o.tdiv ?? 0.5;
  ch1.scale = o.vdiv ?? 1;
  ch2.scale = ceil125((P.V / P.R) / 3.5);
  lastCapture = null;
  cursorsOn(false);
  $$("#chChips [data-ch]").forEach(b => b.setAttribute("aria-pressed", String(CHIPS[+b.dataset.ch][0].visible)));
  refreshControls(); renderSwitch(); renderScopeBar(); renderMeas();
}

const lab = {
  get P() { return P; }, model, scope,
  reset, lock, autoset, square, reading, cursorsOn,
  setUnlocks(s) { unlocked = new Set(s); applyUnlocks(); },
  addUnlock(k) { unlocked.add(k); applyUnlocks(); },
  hide(o) { hidden = { ...o }; sync(); },
  reveal(k) { revealed.add(k); },
  setRef(c) { scope.ref = c; renderScopeBar(); },
  baseline(over = {}) { return simulateCapture({ ...P, ...IDEAL, ...over }, { from: "B", to: "A", v0: 0, tdiv: scope.tdiv }); },
  notebookCount: () => notebook.items.length,
};

const curStage = () => (mode === "free" ? "free" : mission.stage);
const notebook = new Notebook({ key: "rclab:notebook", toggle: $("#nbBtn") });
new Why(WHY, { depth: () => ({ explore: "simple", discover: "simple", explain: "math", measure: "math", engineer: "eng", design: "eng" })[curStage()] || "math" });
const mission = new Mission({ mount: $("#mission"), steps: STEPS, stages: STAGES, lab, notebook, key: "rclab:progress", onCustom: custom });

function custom(id) {
  if (id === "free") setMode("free");
  if (id === "guided") setMode("guided");
  if (id === "restart") { setMode("guided"); mission.restart(); }
}

function setMode(m) {
  mode = m;
  store.set("rclab:mode", m);
  $$("#modeSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  if (m === "free") {
    lab.setUnlocks(ALL_TOOLS);
    lock(false);
    hidden = {}; sync();
    $("#mission").innerHTML = `<p class="m-count">Free lab</p><h2 tabindex="-1">Everything is unlocked</h2>
      <div class="m-prompt"><p>Every part and tool is available. Real components are under <b>Source &amp; real-world parts</b>. Try to break the ideal model, then work out why it broke.</p></div>
      <ul class="m-ideas"><li>Square wave with a period much shorter than τ: what does V<sub>C</sub> do? Much longer?</li>
      <li>Start the capacitor at 10 V with a 5 V battery, then charge.</li>
      <li>R = 100 Ω with 50 Ω of ESR. Is it still acting like a capacitor?</li>
      <li>1 MΩ with a 1× probe: how could you measure it without being fooled?</li>
      <li>Make the energy readout show more than 50 %. Can you?</li></ul>
      <div class="m-nav"><button type="button" class="btn" data-m="custom" data-id="guided">← Back to the missions</button></div>`;
  } else mission.start(mission.i, { focus: false });
}
$$("#modeSeg button").forEach(b => b.addEventListener("click", () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));

// For a future AI tutor: a faithful description of the experiment, read straight from the model.
window.rcLab = {
  snapshot: () => ({
    mode, step: mode === "guided" ? mission.step.id : null,
    params: { ...P }, tau_RC: P.R * P.C, tau_actual: model.tau("A"),
    state: { switch: model.s.sw, vC: model.s.vc, vTerminal: model.out().vx, current: model.out().i, t: model.s.t },
    lastMeasurements: lastCapture?.meas ?? null, notebook: notebook.items.map(x => x.text),
  }),
};

// ───────── main loop ─────────
const SWEEP = { fast: 1.5, normal: 4, slow: 10 };
let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
  last = ts;
  let simDt = speed === "real" ? dt : (dt * scope.span * 10 / 9) / SWEEP[speed];
  let hmax = scope.tdiv / 60;
  if (P.input === "square") hmax = Math.min(hmax, P.period / 40);
  if (simDt / hmax > 1000) simDt = 1000 * hmax;
  if (simDt > 0) model.advance(simDt, hmax, o => scope.push(o), (o0, o1) => edge(o0, o1, false));
  const o = model.out();
  circuit.update({
    sw: model.s.sw, i: o.i, iRef: Math.max(P.V, Math.abs(P.V0), 1e-9) / P.R, vc: model.s.vc, vRef: Math.max(P.V, 1e-9),
    labels: { R: P.R, C: P.C, V: P.V }, dt, locked,
    show: {
      Rs: vis("Rs", v => v > 0), ESR: vis("ESR", v => v > 0), Rleak: vis("Rleak", v => v !== Infinity), Rprobe: vis("Rprobe", v => v !== Infinity),
    },
  });
  scope.draw();
  renderReadouts();
  renderCursorBox();
  requestAnimationFrame(frame);
}
function vis(k, nonIdeal) {
  if (k in hidden) return revealed.has(k) ? hidden[k] : null;
  return nonIdeal(P[k]) ? P[k] : null;
}

$("#scope").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(model.s.sw === "A" ? "B" : "A"); } });
renderScopeBar();
setMode(store.get("rclab:mode", "guided") === "free" ? "free" : "guided");
requestAnimationFrame(frame);
