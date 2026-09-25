// Deterministic RC physics. This is the only place voltages and currents are computed;
// the UI, the lesson and any future AI tutor read from it and never invent values.
//
// Circuit (switch at A):
//   emf V ── Rs (source) ── switch ── R ──┬── node X (what the scope probe sees)
//                                         ├── ESR ── Y ──┬── C (ideal)
//                                         │              └── R_leak
//                                         └── R_probe (scope input)
// At B the source is replaced by a short, so C discharges through R.
//
// Seen from the ideal capacitor, everything else is a Thevenin source (Vth, Rth).
// For a constant input the solution over a step h is exact:
//   v(t+h) = Vth + (v(t) − Vth)·e^(−h/RthC)
// so the integrator is unconditionally stable and exact at any step size. The energy
// drawn from the source is integrated in closed form too.

const par = (a, b) => (a === Infinity ? b : b === Infinity ? a : (a * b) / (a + b));
const divider = (Rbottom, Rtop) => (Rbottom === Infinity ? 1 : Rbottom / (Rtop + Rbottom));

export const IDEAL = { Rs: 0, ESR: 0, Rleak: Infinity, Rprobe: Infinity };

export function createRC() {
  const p = { V: 5, R: 10e3, C: 100e-6, V0: 0, ...IDEAL, input: "step", period: 1 };
  const s = { t: 0, vc: 0, sw: "B", eSrc: 0, sqT0: 0 };

  function th(sw = s.sw) {
    const Rtop = sw === "A" ? p.R + p.Rs : p.R, E = sw === "A" ? p.V : 0;
    const Vth1 = E * divider(p.Rprobe, Rtop), Rth1 = par(Rtop, p.Rprobe);
    const Rth2 = Rth1 + p.ESR;
    const Vth = Vth1 * divider(p.Rleak, Rth2), Rth = par(Rth2, p.Rleak);
    return { Rtop, E, Vth1, Rth2, Vth, Rth, tau: Rth * p.C };
  }

  /** Every observable quantity for a given capacitor voltage. */
  function out(vc = s.vc, sw = s.sw) {
    const T = th(sw);
    const ib = (T.Vth1 - vc) / T.Rth2;           // current into the capacitor branch
    const vx = vc + ib * p.ESR;                   // terminal voltage, what a probe reads
    const i = (T.E - vx) / T.Rtop;                // current through R
    return { t: s.t, vc, vx, i, vr: i * p.R, vin: sw === "A" ? p.V - i * p.Rs : 0, sw };
  }

  function step(h) {
    const T = th(), v0 = s.vc, e = Math.exp(-h / T.tau);
    if (s.sw === "A") {
      const intV = T.Vth * h + (v0 - T.Vth) * T.tau * (1 - e);   // ∫vc dt, exact
      const k = p.ESR / T.Rth2;
      const intVx = (1 - k) * intV + k * T.Vth1 * h;
      s.eSrc += p.V * (T.E * h - intVx) / T.Rtop;                 // ∫V·i dt
    }
    s.vc = T.Vth + (v0 - T.Vth) * e;
    s.t += h;
  }

  /** Advance dt seconds in steps of at most hmax, landing exactly on square-wave edges. */
  function advance(dt, hmax, onSample, onEdge) {
    let rem = dt, guard = 0;
    while (rem > 1e-15 && guard++ < 20000) {
      let h = Math.min(rem, hmax), next = null;
      if (p.input === "square") {
        const half = p.period / 2;
        const k = Math.floor((s.t - s.sqT0) / half + 1e-9) + 1;
        const te = s.sqT0 + k * half;
        if (te - s.t <= h) { h = Math.max(0, te - s.t); next = k % 2 === 0 ? "A" : "B"; }
      }
      if (h > 0) { step(h); rem -= h; onSample(out()); }
      if (next && next !== s.sw) {
        const o0 = out(); s.sw = next; const o1 = out();
        onEdge(o0, o1);
      }
    }
  }

  /** Steady-state terminal voltage for a switch position. */
  function finalVx(sw = s.sw) { return out(th(sw).Vth, sw).vx; }

  return { p, s, th, out, step, advance, finalVx, tau: sw => th(sw).tau };
}

/**
 * Compute a whole capture offline (used for reference traces): the capacitor starts at v0
 * with the switch at `from`, and flips to `to` at t = 0.
 */
export function simulateCapture(params, { from = "B", to = "A", v0 = 0, tdiv, preDivs = 1, divsX = 10 }) {
  const m = createRC();
  Object.assign(m.p, params, { input: "step" });
  m.s.vc = v0; m.s.sw = from;
  const span = (divsX - preDivs) * tdiv, N = 900, h = span / N;
  const o0 = m.out();
  const samples = [{ ...o0, t: -preDivs * tdiv }, { ...o0, t: 0 }];
  m.s.sw = to;
  samples.push({ ...m.out(), t: 0 });
  for (let k = 1; k <= N; k++) { m.step(h); samples.push({ ...m.out(), t: k * h }); }
  return {
    t0: 0, samples, done: true,
    meta: { sw: to, vpre: o0.vx, vc0: v0, vfinal: m.finalVx(to), P: { ...m.p }, vis: { ...m.p }, tauRC: m.p.R * m.p.C, eSrc0: 0 },
  };
}
