// A reusable oscilloscope. It knows nothing about circuits: a lab pushes samples
// (plain objects with a time `t` in seconds), fires triggers, and describes
// channels as { label, color, unit, scale (units/div), zero (divs from bottom), get(sample) }.
//
// Behaviour mirrors a real bench scope in "normal" trigger mode:
//   RUN     each trigger starts a new sweep once the previous one has finished
//   STOP    the screen freezes so it can be interrogated
//   SINGLE  arm, capture exactly one sweep, then stop
// The previous sweep stays on screen as a faint ghost, and REF pins one for comparison.

const SCR = {
  bg: "#0A111B", major: "rgba(150,180,220,.16)", axis: "rgba(150,180,220,.34)",
  text: "rgba(210,222,240,.82)", dim: "rgba(210,222,240,.42)", cursor: "#EAF0F8",
  run: "#4ADE80", stop: "#F87171", wait: "#FBBF24",
};
export const SCREEN = SCR;

/** Linear interpolation of `key` at time t. At a vertical edge (two samples at the same t) the later one wins. */
export function interp(samples, key, t) {
  const f = typeof key === "function" ? key : s => s[key];
  const n = samples.length;
  if (!n || t < samples[0].t || t > samples[n - 1].t) return null;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (samples[m].t <= t) lo = m; else hi = m; }
  const a = samples[lo], b = samples[hi];
  if (t >= b.t) return f(b);
  if (b.t === a.t) return f(b);
  return f(a) + (f(b) - f(a)) * (t - a.t) / (b.t - a.t);
}

/** First time (t >= 0) at which f(sample) reaches `level`, interpolated. */
export function crossTime(samples, f, level) {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (b.t < 0) continue;
    const fa = f(a), fb = f(b);
    if (fb >= level) {
      if (fa >= level || b.t === a.t) return Math.max(0, b.t);
      return Math.max(0, a.t + (level - fa) / (fb - fa) * (b.t - a.t));
    }
  }
  return null;
}

export class Scope {
  constructor(canvas, { channels, divsX = 10, divsY = 8, preDivs = 1, tdiv = 1 }) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    Object.assign(this, { channels, divsX, divsY, preDivs, tdiv });
    this.mode = "run";
    this.capture = null; this.prev = null; this.ref = null;
    this.pre = [];
    this.showPrev = true;
    this.cursors = { on: false, a: 0, b: 0, active: "a" };
    this.overlays = [];
    this.hint = "";
    this.ls = {};
    this.fit = this.fit.bind(this);
    new ResizeObserver(this.fit).observe(canvas);
    this.fit();
    this._pointer();
  }

  on(e, f) { (this.ls[e] || (this.ls[e] = [])).push(f); }
  emit(e, d) { (this.ls[e] || []).forEach(f => f(d)); }
  get span() { return (this.divsX - this.preDivs) * this.tdiv; }
  get busy() { return !!(this.capture && !this.capture.done); }

  fit() {
    const r = this.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    this.cv.width = Math.max(1, Math.round(r.width * d));
    this.cv.height = Math.max(1, Math.round(r.height * d));
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  clear() { this.capture = null; this.prev = null; this.pre = []; }

  setMode(m) {
    if (m === "run" && this.mode === "stop" && this.capture && !this.capture.done) this.capture.done = true;
    this.mode = m;
    this.emit("mode", m);
  }

  /** Feed one sample. `force` keeps it even if it is closer than the display resolution (edges). */
  push(s, force = false) {
    const P = this.pre, lp = P[P.length - 1], res = this.tdiv / 100;
    if (force || !lp || s.t - lp.t >= res) {
      P.push(s);
      const keep = this.preDivs * this.tdiv * 1.2;
      let k = 0;
      while (k < P.length - 2 && P[k].t < s.t - keep) k++;
      if (k) P.splice(0, k);
    }
    const c = this.capture;
    if (!c || c.done || this.mode === "stop") return;
    const tr = s.t - c.t0, ls = c.samples[c.samples.length - 1];
    if (force || !ls || tr - ls.t >= res || tr >= this.span) c.samples.push({ ...s, t: tr });
    if (tr >= this.span) {
      c.done = true;
      if (this.mode === "single") this.mode = "stop";
      this.emit("complete", c);
      this.emit("mode", this.mode);
    }
  }

  /** Start a sweep at absolute time t. `force` restarts a sweep in progress (a deliberate user action). */
  trigger(t, meta, { force = false } = {}) {
    if (this.mode === "stop") return false;
    if (this.mode === "single" && this.busy) return false;
    if (this.busy && !force) return false;
    if (this.mode === "armed") this.mode = "single";
    if (this.capture && this.capture.samples.length > 3) this.prev = this.capture;
    const from = t - this.preDivs * this.tdiv;
    this.capture = { t0: t, samples: this.pre.filter(s => s.t >= from).map(s => ({ ...s, t: s.t - t })), done: false, meta };
    this.emit("trigger", this.capture);
    this.emit("mode", this.mode);
    return true;
  }

  geometry() {
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    const dx = w / this.divsX, dy = h / this.divsY;
    const X = t => (t / this.tdiv + this.preDivs) * dx;
    const Y = (v, ch) => (this.divsY - ch.zero - v / ch.scale) * dy;
    return { ctx: this.ctx, w, h, dx, dy, X, Y, scope: this };
  }

  draw() {
    const g = this.geometry(), { ctx, w, h, dx, dy, X } = g;
    if (!w || !h) return;
    ctx.fillStyle = SCR.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = SCR.major;
    ctx.beginPath();
    for (let i = 1; i < this.divsX; i++) { const x = Math.round(i * dx) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let j = 1; j < this.divsY; j++) { const y = Math.round(j * dy) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.strokeStyle = SCR.axis;
    ctx.beginPath();
    for (let i = 0; i < this.divsX * 5; i++) { const x = Math.round(i * dx / 5) + 0.5; ctx.moveTo(x, h / 2 - 3); ctx.lineTo(x, h / 2 + 3); }
    for (let j = 0; j < this.divsY * 5; j++) { const y = Math.round(j * dy / 5) + 0.5; ctx.moveTo(w / 2 - 3, y); ctx.lineTo(w / 2 + 3, y); }
    ctx.stroke();

    // channel ground markers on the left edge
    const seen = new Set();
    ctx.font = '600 10px "JetBrains Mono",monospace';
    for (const ch of this.channels) {
      if (!ch.visible || seen.has(ch.zero)) continue;
      seen.add(ch.zero);
      const y = (this.divsY - ch.zero) * dy;
      ctx.fillStyle = ch.color;
      ctx.beginPath(); ctx.moveTo(0, y - 5); ctx.lineTo(7, y); ctx.lineTo(0, y + 5); ctx.fill();
    }
    // trigger point marker
    const xt = X(0);
    ctx.fillStyle = SCR.wait;
    ctx.beginPath(); ctx.moveTo(xt - 5, 0); ctx.lineTo(xt + 5, 0); ctx.lineTo(xt, 7); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    const main = this.channels[0];
    if (this.ref) this._trace(this.ref, main, g, { alpha: 0.7, dash: [5, 5], width: 1.5, color: "#C8D3E2" });
    if (this.prev && this.showPrev && this.prev !== this.ref) this._trace(this.prev, main, g, { alpha: 0.22, width: 1.6 });
    if (this.capture) for (const ch of this.channels) if (ch.visible) this._trace(this.capture, ch, g, { alpha: 1, width: ch.width || 2.2, dash: ch.dash, glow: true });
    for (const f of this.overlays) { ctx.save(); f(g); ctx.restore(); }
    if (this.cursors.on) this._drawCursors(g);
    ctx.restore();

    // status + scale readouts, drawn like an instrument's on-screen text
    ctx.font = '600 11px "JetBrains Mono",monospace';
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const st = this.mode === "stop" ? ["STOP", SCR.stop]
      : this.mode === "armed" ? ["SINGLE · ARMED", SCR.wait]
      : this.mode === "single" ? ["SINGLE", SCR.wait]
      : this.busy ? ["RUN · TRIG'D", SCR.run] : ["RUN · READY", SCR.run];
    ctx.fillStyle = st[1];
    ctx.fillText(st[0], 10, 8);
    if (this.ref) { ctx.fillStyle = "#C8D3E2"; ctx.fillText("- - REF", 10, 24); }
    ctx.textBaseline = "bottom";
    let x = 10;
    for (const ch of this.channels) {
      if (!ch.visible || ch.linked) continue;          // linked channels share another channel's scale
      const s = `${ch.label} ${fmtScale(ch.scale, ch.unit)}/div`;
      ctx.fillStyle = ch.color;
      ctx.fillText(s, x, h - 7);
      x += ctx.measureText(s).width + 16;
    }
    ctx.textAlign = "right";
    ctx.fillStyle = SCR.text;
    ctx.fillText(`${fmtScale(this.tdiv, "s")}/div`, w - 10, h - 7);
    if (!this.capture && this.hint) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = SCR.dim;
      ctx.font = '13px "Atkinson Hyperlegible",sans-serif';
      ctx.fillText(this.hint, w / 2, h / 2 - 16);
    }
  }

  _trace(c, ch, { ctx, X, Y }, o) {
    const s = c.samples;
    if (s.length < 2) return;
    ctx.save();
    ctx.globalAlpha = o.alpha;
    ctx.strokeStyle = o.color || ch.color;
    ctx.lineWidth = o.width;
    ctx.setLineDash(o.dash || []);
    ctx.lineJoin = "round";
    if (o.glow) { ctx.shadowColor = ch.color; ctx.shadowBlur = 5; }
    ctx.beginPath();
    const tmin = -this.preDivs * this.tdiv, tmax = this.span * 1.001;
    let first = true;
    for (const p of s) {
      if (p.t < tmin || p.t > tmax) continue;
      const x = X(p.t), y = Y(ch.get(p), ch);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawCursors({ ctx, X, Y, h }) {
    const c = this.capture;
    for (const k of ["a", "b"]) {
      const t = this.cursors[k], x = Math.round(X(t)) + 0.5, act = this.cursors.active === k;
      ctx.strokeStyle = SCR.cursor;
      ctx.globalAlpha = act ? 0.95 : 0.55;
      ctx.setLineDash(k === "a" ? [] : [6, 4]);
      ctx.lineWidth = act ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = act ? SCR.cursor : "rgba(234,240,248,.6)";
      ctx.fillRect(x - 9, 0, 18, 17);
      ctx.fillStyle = SCR.bg;
      ctx.font = '700 11px "JetBrains Mono",monospace';
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(k.toUpperCase(), x, 9);
      ctx.globalAlpha = 1;
      if (!c) continue;
      for (const ch of this.channels) {
        if (!ch.visible) continue;
        const v = interp(c.samples, ch.get, t);
        if (v == null) continue;
        ctx.fillStyle = ch.color;
        ctx.beginPath(); ctx.arc(X(t), Y(v, ch), 4, 0, 7); ctx.fill();
      }
    }
  }

  _pointer() {
    const cv = this.cv;
    let drag = null;
    const clampT = t => Math.max(-this.preDivs * this.tdiv, Math.min(this.span, t));
    const tAt = e => {
      const r = cv.getBoundingClientRect();
      return clampT(((e.clientX - r.left) / (r.width / this.divsX) - this.preDivs) * this.tdiv);
    };
    cv.addEventListener("pointerdown", e => {
      if (!this.cursors.on) return;
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left;
      const at = t => (t / this.tdiv + this.preDivs) * r.width / this.divsX;
      drag = Math.abs(at(this.cursors.a) - px) <= Math.abs(at(this.cursors.b) - px) ? "a" : "b";
      this.cursors.active = drag;
      this.cursors[drag] = tAt(e);
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
      this.emit("cursor", drag);
      e.preventDefault();
    });
    cv.addEventListener("pointermove", e => {
      if (!drag) return;
      this.cursors[drag] = tAt(e);
      this.emit("cursor", drag);
    });
    const end = () => { drag = null; };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("keydown", e => {
      if (!this.cursors.on) return;
      const k = this.cursors.active;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const d = this.tdiv / (e.shiftKey ? 5 : 50);
        this.cursors[k] = clampT(this.cursors[k] + (e.key === "ArrowRight" ? d : -d));
        this.emit("cursor", k);
        e.preventDefault();
      } else if (/^[abAB]$/.test(e.key)) {
        this.cursors.active = e.key.toLowerCase();
        this.emit("cursor", this.cursors.active);
      }
    });
  }
}

export function fmtScale(x, unit) {
  const P = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"]];
  for (const [m, p] of P) if (Math.abs(x) >= m * 0.9995) return +(x / m).toPrecision(3) + " " + p + unit;
  return +(x / 1e-12).toPrecision(3) + " p" + unit;
}
