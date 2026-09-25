// The RC lab's content: stages, guided steps and WHY? explanations.
// Everything here is data for core/mission.js and core/why.js. All numbers shown to
// the learner come from the simulation's measurements (ev.meas, lab.reading), never from here.

import { fmt, isStandard } from "../core/ui.js";

export const STAGES = [
  { id: "explore", label: "Explore" },
  { id: "discover", label: "Discover" },
  { id: "explain", label: "Explain" },
  { id: "measure", label: "Measure" },
  { id: "engineer", label: "Engineer" },
  { id: "design", label: "Design" },
];

const T90 = Math.log(10);                       // baseline: 10 kΩ × 100 µF = 1 s, so 90 % at 2.30 s
const same = (a, b) => Math.abs(a / b - 1) < 1e-3;
const p1 = x => (100 * x).toFixed(1) + " %";

const isCharge = (ev, lab) => ev.type === "complete" && ev.capture.meta.sw === "A" && Math.abs(ev.capture.meta.vpre) < 0.05 * lab.P.V;
const needEmpty = (ev, lab) => ev.type === "complete" && ev.capture.meta.sw === "A" && !isCharge(ev, lab)
  ? { msg: "That charge started from a partly charged capacitor. Press <b>Reset capacitor</b>, then flip to A." } : undefined;
const chargeOnScreen = lab => { const c = lab.scope.capture; return c && c.meta.sw === "A" && Math.abs(c.meta.vpre) < 0.05 * lab.P.V ? c : null; };

function discover(target, what) {
  return (ev, lab) => {
    if (ev.type !== "complete") return;
    if (!isCharge(ev, lab)) return needEmpty(ev, lab);
    const want = { R: 10e3, C: 100e-6, V: 5, ...target };
    if (Object.keys(want).some(k => !same(lab.P[k], want[k])))
      return { msg: `Change one thing only: ${what}. Keep everything else as it was (R = 10 kΩ, C = 100 µF, V = 5 V).` };
    const t = ev.meas.t90;
    if (t == null) return { msg: "It didn't reach 90 % on screen. Press TIME + to see more, then try again." };
    return { done: true, data: { t, ratio: t / T90 } };
  };
}

const TIMING_OPTIONS = [
  { id: "half", label: "Twice as fast" },
  { id: "same", label: "No change" },
  { id: "double", label: "Twice as slow" },
  { id: "quad", label: "Four times as slow" },
];

export const STEPS = [
  // ───────────── EXPLORE ─────────────
  {
    id: "first-flip", stage: "explore", title: "Flip the switch", actPhase: "play",
    setup: lab => lab.reset(),
    prompt: `<p>A battery, a resistor, and an <b>empty capacitor</b>. The scope is watching the capacitor's voltage <span class="k-vc">(blue)</span> and the current <span class="k-i">(orange, dashed)</span>.</p>`,
    act: `Click the switch in the circuit, or press <b>A · Charge</b>. Watch both traces.`,
    check: (ev, lab) => (isCharge(ev, lab) ? { done: true } : needEmpty(ev, lab)),
    ask: {
      q: "What did the current do?",
      options: [
        { id: "fade", label: "Started big, then faded to zero", fb: "Right: it rushes in while the capacitor is empty, and stops once it is full." },
        { id: "const", label: "Stayed the same the whole time", fb: "Look at the orange trace again: it starts high on the left and falls away." },
        { id: "grow", label: "Grew as the capacitor filled", fb: "Look again: the orange trace is highest at the very start." },
      ], answer: "fade",
    },
    reveal: `<p>The capacitor filled fast at first, then slower and slower, and levelled off at the battery's 5 V. The current did the opposite: biggest at the start, fading to nothing.</p><p class="m-muse">Why would it slow down? Hold that thought.</p>`,
    note: () => "Charging starts fast and slows down. The current starts high and fades to zero.",
    why: ["shape"],
  },
  {
    id: "faster", stage: "explore", title: "Make it charge faster", actPhase: "play", donePhase: "notice",
    setup: lab => { lab.reset(); lab.setRef(lab.baseline()); },
    prompt: `<p>The dashed trace is the charge you just watched. The scope marks where it reached <b>90 %</b>: at about 2.3 s.</p>`,
    act: `Can you make it charge <b>at least twice as fast</b>? Use any control. Press <b>Reset capacitor</b> and flip to A to try again.`,
    check: (ev, lab, ctx) => {
      if (ev.type !== "complete") return;
      if (!isCharge(ev, lab)) return needEmpty(ev, lab);
      const t = ev.meas.t90;
      if (t == null) return { msg: "It never reached 90 % on screen. That's slower, not faster!" };
      if (t > T90 / 2 * 1.02) return { msg: `90 % at ${fmt(t, "s")}. You need ${fmt(T90 / 2, "s")} or less. Keep experimenting.` };
      const ch = [];
      if (lab.P.R < 10e3 * 0.999) ch.push("R");
      if (lab.P.C < 100e-6 * 0.999) ch.push("C");
      return { done: true, data: { t, what: ch.join(" and ") || "the circuit" } };
    },
    reveal: ctx => `<p>90 % in ${fmt(ctx.data.t, "s")}: ${(T90 / ctx.data.t).toFixed(1)}× as fast. You made <b>${ctx.data.what}</b> smaller.</p><p class="m-muse">Did the battery voltage help? Try it if you haven't.</p>`,
    note: ctx => `Making ${ctx.data.what} smaller made it charge faster (${(T90 / ctx.data.t).toFixed(1)}× as fast).`,
  },
  {
    id: "discharge", stage: "explore", title: "Now let it go", actPhase: "play",
    setup: lab => lab.reset({ V0: 5, sw: "A" }),
    prompt: `<p>This capacitor starts charged to 5 V, still connected to the battery. At <b>B</b> the battery drops out of the loop and the capacitor is connected straight across the resistor.</p>`,
    act: `Flip the switch to <b>B</b>.`,
    check: (ev, lab) => ev.type === "complete" && ev.capture.meta.sw === "B" && ev.capture.meta.vpre > 0.8 * lab.P.V ? { done: true } : undefined,
    ask: {
      q: "Compared with charging, the discharge curve is…",
      options: [
        { id: "flip", label: "The same shape, upside down", fb: "Yes: fast at first, then slower and slower." },
        { id: "line", label: "A straight line down", fb: "Look at the blue trace: it drops steeply at first, then flattens out." },
        { id: "fast", label: "Much faster than charging", fb: "Compare with a charge on the same R and C: the timing is the same." },
      ], answer: "flip",
    },
    reveal: `<p>Same shape, flipped. And the current went <b>negative</b>: it flows the other way round the loop now, out of the capacitor.</p>`,
    note: () => "Discharging is the charging curve upside down. The current reverses direction.",
    why: ["shape"],
  },

  // ───────────── DISCOVER ─────────────
  {
    id: "double-r", stage: "discover", title: "Double the resistance",
    setup: lab => { lab.reset({ tdiv: 1 }); lab.setRef(lab.baseline()); },
    prompt: `<p>Dashed: the original circuit with R = 10 kΩ. You're about to make R <b>twice as big</b>.</p>`,
    predict: { q: "What will happen to the charging time?", options: TIMING_OPTIONS, answer: "double" },
    act: `Press <b>×2</b> next to R, then flip to A.`,
    check: discover({ R: 20e3 }, "set R to 20 kΩ"),
    observed: ctx => `${ctx.data.ratio.toFixed(2)}× as long`,
    reveal: ctx => `<p>90 % at ${fmt(ctx.data.t, "s")} instead of 2.30 s. Twice the resistance lets through half the current, so delivering the same charge takes twice as long.</p>`,
    note: ctx => `Doubling R doubled the charging time (measured ${ctx.data.ratio.toFixed(2)}×).`,
  },
  {
    id: "double-c", stage: "discover", title: "Double the capacitance",
    setup: lab => { lab.reset({ tdiv: 1 }); lab.setRef(lab.baseline()); },
    prompt: `<p>Back to R = 10 kΩ. This time you'll make the capacitor <b>twice as big</b>.</p>`,
    predict: { q: "What will happen to the charging time?", options: TIMING_OPTIONS, answer: "double" },
    act: `Press <b>×2</b> next to C, then flip to A.`,
    check: discover({ C: 200e-6 }, "set C to 200 µF"),
    observed: ctx => `${ctx.data.ratio.toFixed(2)}× as long`,
    reveal: ctx => `<p>90 % at ${fmt(ctx.data.t, "s")}. The current starts exactly the same (look at the orange trace), but there's twice as much charge to deliver before the capacitor reaches the same voltage.</p>`,
    note: ctx => `Doubling C doubled the charging time (measured ${ctx.data.ratio.toFixed(2)}×), with the same starting current.`,
  },
  {
    id: "double-v", stage: "discover", title: "Double the battery",
    setup: lab => { lab.reset({ tdiv: 1, vdiv: 2 }); lab.setRef(lab.baseline()); },
    prompt: `<p>R and C are back to 10 kΩ and 100 µF. Now you'll <b>double the battery</b> from 5 V to 10 V.</p>`,
    predict: {
      q: "What will happen to the charging time?",
      options: [{ id: "half", label: "Twice as fast" }, { id: "same", label: "No change" }, { id: "double", label: "Twice as slow" }],
      answer: "same",
    },
    act: `Set the battery to <b>10 V</b>, then flip to A.`,
    check: discover({ V: 10 }, "set the battery to 10 V"),
    observed: ctx => `${ctx.data.ratio.toFixed(2)}×, no change`,
    reveal: `<p>The curve went twice as high but reached 90 % at the same moment. Twice the push drives twice the current, but the capacitor also needs twice the charge to reach twice the voltage. The two cancel exactly.</p>`,
    note: () => "Doubling V made the curve taller, not slower: the timing didn't change at all.",
    why: ["voltage"],
  },

  // ───────────── EXPLAIN ─────────────
  {
    id: "tau", stage: "explain", title: "The circuit's own clock", actPhase: "play", unlockStart: ["tau"],
    setup: lab => { lab.reset(); lab.setRef(lab.baseline()); },
    prompt: `<p>You found that R and C both stretch time by exactly the factor you change them by, and V doesn't matter. So only their <b>product</b> can matter:</p>
      <div class="eq">τ = R × C</div><p class="m-small">10 kΩ × 100 µF = 1 s. Ohms × farads really does come out in seconds. The scope now marks 1τ, 2τ, 3τ…</p>`,
    act: `Test it. Find a <b>different</b> R and C that land exactly on the dashed curve.`,
    check: (ev, lab) => {
      if (ev.type !== "complete") return;
      if (!isCharge(ev, lab)) return needEmpty(ev, lab);
      const { R, C, V } = lab.P, tau = R * C;
      if (same(R, 10e3) && same(C, 100e-6)) return { msg: "That's the original pair. Find another one." };
      if (!same(V, 5)) return { msg: "Keep the battery at 5 V so the curves can overlap." };
      if (Math.abs(tau - 1) > 0.01) return { msg: `τ = ${fmt(R, "Ω")} × ${fmt(C, "F")} = ${fmt(tau, "s")}. Not 1 s yet.` };
      return { done: true, data: { R, C } };
    },
    reveal: ctx => `<p>${fmt(ctx.data.R, "Ω")} × ${fmt(ctx.data.C, "F")} = 1 s, and the new curve sits exactly on the old one. The circuit cannot tell the two pairs apart.</p>`,
    note: ctx => `${fmt(ctx.data.R, "Ω")} with ${fmt(ctx.data.C, "F")} gives the same curve as 10 kΩ with 100 µF: only τ = RC matters.`,
    why: ["tau"],
  },
  {
    id: "slope", stage: "explain", title: "Why that shape?", unlockStart: ["tangent"],
    setup: lab => lab.reset(),
    prompt: `<p>The <b>white line</b> on the scope shows the curve's slope at this instant: where it would go if it kept its current speed.</p>`,
    predict: {
      q: "If the capacitor kept charging at its current speed, when would it reach the full 5 V?",
      options: [
        { id: "sooner", label: "Sooner and sooner as it charges" },
        { id: "tau", label: "Always exactly 1τ later" },
        { id: "later", label: "Later and later" },
      ], answer: "tau",
    },
    act: `Flip to A and watch where the slope line meets 5 V, compared with the τ markers.`,
    check: (ev, lab) => (isCharge(ev, lab) ? { done: true } : needEmpty(ev, lab)),
    observed: () => "Always exactly 1τ ahead",
    reveal: `<p>Whatever moment you pick, the slope line reaches 5 V exactly one τ later. The speed is always proportional to the gap that's left:</p>
      <div class="eq">speed = (V − V<sub>C</sub>) / RC</div>
      <p>Half the gap left means half the speed. A curve that slows down in proportion to the distance remaining is an exponential. That is the equation you've been watching:</p>
      <div class="eq">V<sub>C</sub>(t) = V (1 − e<sup>−t/RC</sup>)</div>`,
    note: () => "The slope always points at the final value one τ ahead: speed ∝ remaining gap, so the curve is an exponential.",
    why: ["shape"],
  },

  // ───────────── MEASURE ─────────────
  {
    id: "cursor-tau", stage: "measure", title: "Measure one τ", unlockStart: ["cursors"],
    setup: lab => { lab.reset(); lab.cursorsOn(true); },
    prompt: `<p>The scope is now an instrument. Drag cursors <b>A</b> and <b>B</b> on the screen to read exact values. You can also click the screen and use ← → to nudge (Shift for bigger steps).</p>`,
    predict: {
      q: "At exactly t = 1τ, how far has the capacitor charged?",
      options: [{ id: "50", label: "Half way (50 %)" }, { id: "63", label: "About two-thirds" }, { id: "75", label: "Three quarters (75 %)" }, { id: "90", label: "90 %" }],
      answer: "63",
    },
    act: `Flip to A, then put cursor <b>A</b> on the 1τ line and read its <b>% of step</b>.`,
    check: (ev, lab) => {
      const c = chargeOnScreen(lab);
      if (!c) return ev.type === "cursor" ? { msg: "Flip to A first so there's a charge to measure." } : undefined;
      const r = lab.reading("a");
      if (!r || r.pct == null) return;
      if (Math.abs(r.n - 1) <= 0.02) return { done: true, data: r };
      if (ev.type === "cursor") return { msg: `Cursor A is at ${r.n.toFixed(2)}τ, reading ${p1(r.pct)}.` };
    },
    observed: ctx => p1(ctx.data.pct),
    reveal: ctx => `<p>At 1τ the scope reads <b>${p1(ctx.data.pct)}</b>. The exact value is 1 − e<sup>−1</sup> = 63.2 %. In every τ, the capacitor closes 63.2 % of whatever gap is left:</p>
      <table class="mini"><tr><th>t</th><td>1τ</td><td>2τ</td><td>3τ</td><td>4τ</td><td>5τ</td></tr><tr><th>charged</th><td>63.2 %</td><td>86.5 %</td><td>95.0 %</td><td>98.2 %</td><td>99.3 %</td></tr></table>`,
    note: ctx => `At t = 1τ the capacitor is ${p1(ctx.data.pct)} charged (measured; exact value 63.2 %).`,
    why: ["632"], unlock: ["guide632"],
  },
  {
    id: "cursor-99", stage: "measure", title: "When is it “full”?", actPhase: "measure",
    setup: lab => { lab.reset({ tdiv: 1 }); lab.cursorsOn(true); },
    prompt: `<p>Mathematically the curve never quite arrives. So when do engineers call a capacitor charged?</p>`,
    act: `Charge it, then move a cursor to where it <b>first reaches 99 %</b>.`,
    check: (ev, lab) => {
      const c = chargeOnScreen(lab);
      if (!c) return ev.type === "cursor" ? { msg: "Flip to A first so there's a charge to measure." } : undefined;
      const r = lab.reading(lab.scope.cursors.active);
      if (!r || r.pct == null) return;
      if (r.pct >= 0.99 && r.pct <= 0.9935) return { done: true, data: r };
      if (ev.type === "cursor") return { msg: `${(100 * r.pct).toFixed(2)} % at ${r.n.toFixed(2)}τ.` };
    },
    reveal: ctx => `<p>99 % at about <b>${ctx.data.n.toFixed(1)}τ</b> (exactly ln 100 = 4.6τ). Engineers round this to <b>5τ</b>, which is 99.3 %.</p>`,
    note: ctx => `99 % takes about ${ctx.data.n.toFixed(1)}τ. Engineers treat 5τ (99.3 %) as fully charged.`,
    why: ["5tau"],
  },
  {
    id: "rise", stage: "measure", title: "Measure the rise time", actPhase: "measure",
    setup: lab => { lab.reset(); lab.cursorsOn(true); },
    prompt: `<p>Datasheets describe how fast a signal switches with its <b>rise time</b>: the time from 10 % to 90 %.</p>`,
    act: `Charge it, then put one cursor at <b>10 %</b> and the other at <b>90 %</b>. Read Δt.`,
    check: (ev, lab) => {
      const c = chargeOnScreen(lab);
      if (!c) return ev.type === "cursor" ? { msg: "Flip to A first so there's a charge to measure." } : undefined;
      const a = lab.reading("a"), b = lab.reading("b");
      if (!a || !b || a.pct == null || b.pct == null) return;
      const [lo, hi] = a.pct <= b.pct ? [a, b] : [b, a];
      if (Math.abs(lo.pct - 0.1) <= 0.01 && Math.abs(hi.pct - 0.9) <= 0.01) {
        const dt = hi.t - lo.t;
        return { done: true, data: { dt, n: dt / c.meta.tauRC } };
      }
      if (ev.type === "cursor") return { msg: `A: ${p1(a.pct)} · B: ${p1(b.pct)}` };
    },
    reveal: ctx => `<p>Δt = ${fmt(ctx.data.dt, "s")} = <b>${ctx.data.n.toFixed(2)}τ</b>. For every RC circuit the 10–90 % rise time is ln 9 · τ ≈ 2.2τ.</p><p>From now on the scope measures these for you automatically. See <b>Measurements</b> under the screen.</p>`,
    note: ctx => `10–90 % rise time = ${ctx.data.n.toFixed(2)}τ (measured). Exact: ln 9 · τ ≈ 2.2τ.`,
    why: ["risetime"], unlock: ["measure"],
  },

  // ───────────── ENGINEER ─────────────
  {
    id: "mystery-rs", stage: "engineer", title: "Mystery 1: too slow", actPhase: "observe", askPhase: "explain",
    setup: lab => { lab.reset({ tdiv: 1 }); lab.hide({ Rs: 5e3 }); },
    prompt: `<p><b>Real parts aren't ideal.</b> Something in this circuit has changed, but the labels still say R = 10 kΩ and C = 100 µF, so τ should be 1 s.</p>`,
    act: `Charge it. Compare the curve with the τ markers and with the <b>Measurements</b> table.`,
    check: (ev, lab) => (isCharge(ev, lab) ? { done: true } : needEmpty(ev, lab)),
    ask: {
      q: "What could explain what the scope shows?",
      options: [
        { id: "bigC", label: "C is bigger than its label says", fb: "Good thinking: a bigger C would slow it down too. But an empty capacitor acts like a plain wire, so the starting current would still be V/R = 0.5 mA. Check the starting current in Measurements." },
        { id: "rs", label: "There's extra resistance in the loop", fb: "Yes. It charges slower than RC predicts AND the starting current is lower than V/R. Only extra series resistance does both." },
        { id: "weak", label: "The battery is weaker than 5 V", fb: "A weaker battery would end lower, but this one still reaches 5 V. And you already showed that voltage never changes the timing." },
      ], answer: "rs",
    },
    onDone: lab => lab.reveal("Rs"),
    reveal: `<p>The source had <b>5 kΩ of internal resistance</b> (now shown in the circuit). The total series resistance is 15 kΩ, so τ = 15 kΩ × 100 µF = 1.5 s and the starting current is 5 V ÷ 15 kΩ = 0.33 mA.</p><p class="m-muse">The equation wasn't wrong. The model was missing a part.</p>`,
    note: () => "Slower than RC predicts, with a smaller starting current → extra series resistance (the source's own). τ = (R + Rs)·C.",
    why: ["rs"],
  },
  {
    id: "mystery-leak", stage: "engineer", title: "Mystery 2: never full", actPhase: "observe", askPhase: "explain",
    setup: lab => { lab.reset({ tdiv: 1 }); lab.hide({ Rleak: 40e3 }); },
    prompt: `<p>A new mystery with the same labels: R = 10 kΩ, C = 100 µF, 5 V.</p>`,
    act: `Charge it and look at where it ends up, and how fast it gets there.`,
    check: (ev, lab) => (isCharge(ev, lab) ? { done: true } : needEmpty(ev, lab)),
    ask: {
      q: "It levels off below 5 V. What's going on?",
      options: [
        { id: "weak", label: "The battery is only 4 V", fb: "A 4 V battery would also end at 4 V. But then the timing wouldn't change, and this curve reaches 63 % sooner than 1τ. Check t @ 63 % in Measurements." },
        { id: "rs", label: "Extra series resistance, like last time", fb: "Series resistance slows the charge down but it still ends at 5 V. This one ends lower and is faster." },
        { id: "leak", label: "Some current leaks through the capacitor", fb: "Yes. Charge leaks away as it arrives, so the capacitor can't fill completely, and it settles sooner." },
      ], answer: "leak",
    },
    onDone: lab => lab.reveal("Rleak"),
    reveal: `<p>A <b>40 kΩ leakage path</b> runs straight through the capacitor. It forms a divider with R: final = 5 V × 40/(10 + 40) = 4 V. And C now charges through R ∥ R<sub>leak</sub> = 8 kΩ, so τ = 0.8 s.</p>`,
    note: () => "Ends below V and faster than RC → a leakage path across C. Final = V·RL/(R+RL), τ = (R ∥ RL)·C.",
    why: ["leak"],
  },
  {
    id: "mystery-esr", stage: "engineer", title: "Mystery 3: a jump", actPhase: "observe", askPhase: "explain",
    setup: lab => { lab.reset({ R: 100, C: 1000e-6, tdiv: 0.1 }); lab.hide({ ESR: 20 }); },
    prompt: `<p>A low-resistance circuit: R = 100 Ω, C = 1000 µF, so τ = 0.1 s.</p>`,
    act: `Charge it and look very closely at the first instant. <b>TIME −</b> zooms in.`,
    check: (ev, lab) => (isCharge(ev, lab) ? { done: true } : needEmpty(ev, lab)),
    ask: {
      q: "The voltage jumps up instantly at the edge. A capacitor's charge can't change instantly. So what can?",
      options: [
        { id: "glitch", label: "The scope is glitching", fb: "The simulation is exact: this is the circuit. Hint: the size of the jump is proportional to the current." },
        { id: "small", label: "The capacitor is too small", fb: "A smaller C charges faster, but still smoothly from 0 V. A jump needs something that responds instantly to current." },
        { id: "esr", label: "A resistance hidden inside the capacitor", fb: "Yes: the moment current flows, that resistance shows a voltage, before any charge has moved." },
      ], answer: "esr",
    },
    onDone: lab => lab.reveal("ESR"),
    reveal: `<p>The capacitor has <b>20 Ω of ESR</b> (equivalent series resistance). At the first instant the current is 5 V ÷ 120 Ω = 42 mA, and 42 mA × 20 Ω = 0.83 V appears across the ESR at once. After that, the ideal capacitor inside charges normally.</p>`,
    note: () => "An instant step at the edge = voltage across a resistance inside the capacitor. ESR = jump ÷ current.",
    why: ["esr"],
  },
  {
    id: "mystery-probe", stage: "engineer", title: "Mystery 4: the measurement", actPhase: "observe", askPhase: "explain", unlockStart: ["probe"],
    setup: lab => { lab.reset({ R: 1e6, C: 1e-6, Rprobe: 1e6 }); },
    prompt: `<p>High impedance now: R = 1 MΩ and C = 1 µF, so τ = 1 s. Look at the <b>whole</b> circuit, including the scope itself.</p>`,
    act: ctx => ctx.one ? `Now switch the <b>Scope probe</b> to <b>10×</b> and charge again.` : `Charge it with the <b>1×</b> probe and look where it ends.`,
    check: (ev, lab, ctx) => {
      if (ev.type !== "complete") return;
      if (!isCharge(ev, lab)) return needEmpty(ev, lab);
      const rp = lab.P.Rprobe, fin = ev.meas.final;
      if (rp === 1e6) ctx.one = fin;
      if (rp === 1e7) ctx.ten = fin;
      if (ctx.one != null && ctx.ten != null) return { done: true };
      if (ctx.one != null) return { msg: `With the 1× probe it ended at ${fmt(ctx.one, "V")}, only ${Math.round(100 * ctx.one / lab.P.V)} % of the battery. Now try the <b>10×</b> probe setting.` };
      return { msg: `Ended at ${fmt(fin, "V")}. Now compare with the <b>1×</b> setting.` };
    },
    ask: {
      q: "Only the probe setting changed. Why did the reading change?",
      options: [
        { id: "leak", label: "The capacitor leaks", fb: "A leak wouldn't care which probe you use. Only the measurement changed, yet the result changed." },
        { id: "cal", label: "The 1× setting is badly calibrated", fb: "Calibration would scale the reading, not change the timing. Compare t @ 63 % for the two settings." },
        { id: "load", label: "The scope became part of the circuit", fb: "Exactly. The scope's input resistance sits across the capacitor, so measuring changed what was measured." },
      ], answer: "load",
    },
    reveal: ctx => `<p>The scope's 1 MΩ input sits across the capacitor. With R = 1 MΩ that's a 50/50 divider: it ended at ${fmt(ctx.one, "V")} with τ halved. The 10× probe (10 MΩ) loads it ten times less: ${fmt(ctx.ten, "V")}.</p><p class="m-muse">The act of measuring changed what you measured. Every real measurement has this problem; good engineers check for it.</p>`,
    note: () => "Measurement loading: a 1 MΩ scope input halved the reading on a 1 MΩ circuit. Keep R_source ≪ R_probe.",
    why: ["probe"], unlock: ["nonideal"],
  },
  {
    id: "energy", stage: "engineer", title: "Where does the energy go?", unlockStart: ["energy"],
    setup: lab => lab.reset({ tdiv: 1 }),
    prompt: `<p>One more look at real behaviour. The readout under the circuit now tracks energy for each charge.</p>`,
    predict: {
      q: "Charging from empty to full: what fraction of the energy the battery supplies ends up stored in the capacitor?",
      options: [{ id: "100", label: "All of it (100 %)" }, { id: "90", label: "Most of it (~90 %)" }, { id: "50", label: "Half (50 %)" }, { id: "r", label: "It depends on R" }],
      answer: "50",
    },
    act: `Charge it fully and read <b>Energy</b> under the circuit. Then try a very different R and charge again.`,
    check: (ev, lab) => {
      if (ev.type !== "complete") return;
      if (!isCharge(ev, lab)) return needEmpty(ev, lab);
      const m = ev.meas;
      if (!(m.supplied > 0)) return;
      return { done: true, data: { ratio: m.stored / m.supplied, R: lab.P.R } };
    },
    observed: ctx => p1(ctx.data.ratio),
    reveal: `<p>Half, and it stays half whatever R you choose. The battery supplies QV = CV², the capacitor keeps ½CV², and the other half turns into heat in the resistor (watch it glow). A smaller R just burns that energy faster, at higher power.</p>`,
    note: ctx => `Charging a capacitor from a battery stores only ${p1(ctx.data.ratio)} of the energy, whatever R is. The rest heats the resistor.`,
    why: ["energy"],
  },

  // ───────────── DESIGN ─────────────
  {
    id: "challenge", stage: "design", title: "Challenge: 90 % in 2 seconds", actPhase: "challenge", donePhase: "challenge",
    setup: lab => lab.reset(),
    prompt: `<p>No more explanations. Make the capacitor reach <b>90 % of its final voltage in 2.0 s</b>, within ±3 %.</p>`,
    act: `Use any R and C, and charge from empty to test your design.`,
    check: (ev, lab, ctx) => {
      if (ev.type !== "complete") return;
      if (!isCharge(ev, lab)) return needEmpty(ev, lab);
      const t = ev.meas.t90;
      ctx.attempts++;
      const hint = ctx.attempts >= 5 ? " Hint: t₉₀ = τ · ln 10 ≈ 2.30τ, so you need τ ≈ 0.87 s."
        : ctx.attempts >= 3 ? " Hint: reaching 90 % always takes the same number of τ. Measure it on any curve." : "";
      if (t == null) return { msg: `Attempt ${ctx.attempts}: it never reached 90 % on screen, so it's far too slow.${hint}` };
      const err = t / 2 - 1;
      if (Math.abs(err) > 0.03) return { msg: `Attempt ${ctx.attempts}: 90 % at ${fmt(t, "s")} (${err > 0 ? "+" : ""}${(100 * err).toFixed(0)} %).${hint}` };
      return { done: true, data: { t, R: lab.P.R, C: lab.P.C, n: ctx.attempts } };
    },
    reveal: ctx => `<p>90 % at <b>${fmt(ctx.data.t, "s")}</b> with R = ${fmt(ctx.data.R, "Ω")} and C = ${fmt(ctx.data.C, "F")} (τ = ${fmt(ctx.data.R * ctx.data.C, "s")}), in ${ctx.data.n} attempt${ctx.data.n > 1 ? "s" : ""}.</p><p>The shortcut, for next time: 90 % always takes ln 10 ≈ 2.30τ, so τ = 2 s ÷ 2.30 = 0.87 s.</p>`,
    note: ctx => `Challenge solved: R = ${fmt(ctx.data.R, "Ω")}, C = ${fmt(ctx.data.C, "F")} → 90 % in ${fmt(ctx.data.t, "s")}.`,
  },
  {
    id: "design-lpf", stage: "design", title: "Design: a 1 kHz low-pass filter", actPhase: "design", donePhase: "design",
    setup: lab => lab.reset({ R: 10e3, C: 100e-9, tdiv: 0.5e-3 }),
    prompt: `<p>An RC circuit is also a <b>low-pass filter</b>: slow signals pass through, fast ones get smoothed away. The corner where it starts cutting (−3 dB) is set by τ.</p>
      <p class="spec"><b>Spec</b> · cutoff 1 kHz ± 5 % · standard (E24) values · R between 1 kΩ and 100 kΩ</p>`,
    act: `Choose R and C, then submit your design. <button type="button" class="why" data-why="fc">WHY?</button> explains how τ sets the cutoff.`,
    actions: [{ id: "submit", label: "Submit design" }],
    check: (ev, lab) => {
      if (ev.type !== "submit") return;
      const { R, C } = lab.P, fc = 1 / (2 * Math.PI * R * C), err = fc / 1000 - 1;
      const head = `f<sub>c</sub> = ${fmt(fc, "Hz")} (${err > 0 ? "+" : ""}${(100 * err).toFixed(1)} %). `;
      if (!isStandard(R) || !isStandard(C)) return { msg: head + "One of those isn't a part you can buy (×2 doesn't always land on a standard value). Pick values with the sliders." };
      if (Math.abs(err) > 0.05) return { msg: head + "Out of spec." };
      if (R < 1e3) return { msg: head + `The frequency is right, but R = ${fmt(R, "Ω")} is too low: whatever drives it must supply V/R = ${fmt(1 / R, "A")} per volt on every edge.` };
      if (R > 100e3) return { msg: head + `The frequency is right, but R = ${fmt(R, "Ω")} is too high: the next stage's input (or a 1 MΩ scope) would load it. You saw that in Mystery 4.` };
      return { done: true, data: { R, C, fc, err } };
    },
    onDone: lab => lab.square(1e-3),
    reveal: ctx => `<p>R = ${fmt(ctx.data.R, "Ω")}, C = ${fmt(ctx.data.C, "F")} → f<sub>c</sub> = <b>${fmt(ctx.data.fc, "Hz")}</b> (${(100 * ctx.data.err).toFixed(1)} %). In spec.</p><p>A 1 kHz square wave is going into your filter now. The grey trace is the input and the blue trace is what gets through: the sharp edges are gone.</p>`,
    note: ctx => `Designed a 1 kHz low-pass filter: R = ${fmt(ctx.data.R, "Ω")}, C = ${fmt(ctx.data.C, "F")} → f_c = ${fmt(ctx.data.fc, "Hz")}.`,
    why: ["fc"],
  },
  {
    id: "finale", stage: "design", title: "You built the model yourself", donePhase: "design",
    setup: lab => lab.reset(),
    prompt: (ctx, lab) => `<p>You didn't memorise τ = RC. You watched it happen, predicted it, measured it, broke it and designed with it.</p><p>Your notebook has <b>${lab.notebookCount()}</b> discoveries in it.</p>`,
    reveal: `<p><b>Free lab</b> unlocks everything: non-ideal parts, square-wave input, initial charge. Some things to try:</p>
      <ul class="m-ideas"><li>Square wave with a period much shorter than τ. What does V<sub>C</sub> do?</li><li>Start the capacitor at 10 V with a 5 V battery.</li><li>R = 100 Ω with 50 Ω of ESR. Is it still a capacitor?</li><li>Can you make the 1× probe error smaller without changing the probe?</li></ul>`,
    buttons: [{ id: "free", label: "Open the free lab", primary: true }, { id: "restart", label: "Start the missions again" }],
  },
];

export const WHY = {
  shape: {
    title: "Why does charging slow down?",
    simple: `<p>At first the capacitor is empty, so the <b>whole battery voltage</b> pushes current through R. As charge builds up, the capacitor pushes back. The push that's left over gets smaller, so the current gets smaller, and the capacitor fills more slowly.</p><p>It's like filling a balloon from a pump that gets weaker the fuller the balloon is.</p>`,
    math: `<p>Kirchhoff's voltage law around the loop, with I = C·dV<sub>C</sub>/dt:</p><div class="eq">V = I R + V<sub>C</sub> &nbsp;⇒&nbsp; dV<sub>C</sub>/dt = (V − V<sub>C</sub>) / RC</div><p>The rate of change is proportional to the remaining gap. The only function whose slope is proportional to its distance from a target is an exponential:</p><div class="eq">V<sub>C</sub>(t) = V (1 − e<sup>−t/RC</sup>)</div>`,
    eng: `<p>This is a <b>first-order linear system</b> with one real pole at s = −1/RC. Its step response is 1 − e<sup>−t/τ</sup>; its transfer function is</p><div class="eq">H(s) = 1 / (1 + sτ)</div><p>Any first-order circuit (RC, RL, a thermal mass, a tank draining through a pipe) has exactly this shape, and you can write the whole waveform from three numbers: the initial value, the final value and τ.</p>`,
  },
  tau: {
    title: "Why only R × C matters",
    simple: `<p>Bigger R: a narrower pipe, so charge flows more slowly. Bigger C: a bigger tank, so there's more to fill. Both stretch time in exactly the same way, so only their product matters.</p>`,
    math: `<p>In dV<sub>C</sub>/dt = (V − V<sub>C</sub>)/RC, R and C only ever appear together, as RC. Measure time in units of τ = RC (t′ = t/RC) and the equation has no R or C left in it at all.</p><div class="eq">Ω · F = (V/A) · (A·s/V) = s</div>`,
    eng: `<p>τ is the only time scale in the circuit. But the <b>impedance level</b> still matters: 1 kΩ with 1 mF and 1 MΩ with 1 µF give the same τ, yet they differ in drive current, noise (∝ √R), leakage sensitivity and how much a probe loads them. Designers pick R for impedance first, then C for timing.</p>`,
  },
  voltage: {
    title: "Why voltage doesn't change the timing",
    simple: `<p>Double the battery and the capacitor has to end up twice as full. But twice the push also drives twice the current, so it fills twice as fast. The two effects cancel exactly.</p>`,
    math: `<div class="eq">V<sub>C</sub>(t) / V = 1 − e<sup>−t/RC</sup></div><p>V only scales the height of the curve; it never appears in the exponent. The time to reach any given <i>percentage</i> is independent of V.</p>`,
    eng: `<p>This is <b>linearity</b>: scaling the input scales the output by the same amount. Time constants belong to the network, not the signal. (Real capacitors break this slightly: class-2 ceramics lose capacitance under DC bias, so τ drifts with voltage.)</p>`,
  },
  "632": {
    title: "Why 63.2 % at one τ?",
    simple: `<p>In each τ, the capacitor closes about two-thirds of the gap that's left. Then two-thirds of what's left after that, and so on. It always gets closer but never quite arrives.</p>`,
    math: `<div class="eq">V<sub>C</sub>(τ)/V = 1 − e<sup>−1</sup> = 0.632</div><p>After nτ the remaining gap is e<sup>−n</sup>: 36.8 %, 13.5 %, 5.0 %, 1.8 %, 0.7 %.</p>`,
    eng: `<p>Timing the 63.2 % point of a step response is a direct way to measure τ, and so to find C when R is known. Many capacitance meters work exactly this way.</p>`,
  },
  "5tau": {
    title: "Why 5τ counts as “full”",
    simple: `<p>The curve keeps creeping closer forever. After 5τ it's within 1 % of the end, which is close enough for almost anything.</p>`,
    math: `<p>Remaining gap e<sup>−t/τ</sup> = ε gives t = τ ln(1/ε):</p><div class="eq">1 % → 4.6τ &nbsp;&nbsp; 0.1 % → 6.9τ &nbsp;&nbsp; 1 ppm → 13.8τ</div>`,
    eng: `<p>To settle to within half an LSB of an N-bit converter you need t = τ (N+1) ln 2: 9τ for 12 bits, 12τ for 16 bits. This rule sizes the acquisition time of every sampling ADC input.</p>`,
  },
  risetime: {
    title: "Why the rise time is 2.2τ",
    simple: `<p>Rise time ignores the slow creep at the very end and measures the main, fast part of the edge: from 10 % to 90 %.</p>`,
    math: `<div class="eq">t<sub>10</sub> = τ ln(10/9), &nbsp; t<sub>90</sub> = τ ln 10 &nbsp;⇒&nbsp; t<sub>r</sub> = τ ln 9 ≈ 2.197τ</div>`,
    eng: `<p>For a single-pole system t<sub>r</sub> ≈ 0.35 / f<sub>−3dB</sub>. This links edge speed to bandwidth, and it's why a scope's own bandwidth limits the fastest edge it can show you.</p>`,
  },
  rs: {
    title: "Source resistance",
    simple: `<p>The source itself resists the current, so less current flows at the start and filling takes longer. The circuit behaves as if R were bigger.</p>`,
    math: `<div class="eq">τ = (R + R<sub>s</sub>) C, &nbsp;&nbsp; I(0) = V / (R + R<sub>s</sub>)</div><p>Series resistances simply add.</p>`,
    eng: `<p>Every source has an output impedance: 50 Ω for a function generator, tens of ohms for a logic gate, more for a tired battery. Either choose R ≫ R<sub>s</sub>, or include R<sub>s</sub> in your timing budget.</p>`,
  },
  leak: {
    title: "Leakage",
    simple: `<p>Some charge escapes through the capacitor as fast as it arrives. The capacitor can't fill completely, and it settles sooner because it's also draining.</p>`,
    math: `<p>Thevenin equivalent seen by C:</p><div class="eq">V<sub>th</sub> = V · R<sub>L</sub>/(R + R<sub>L</sub>), &nbsp; R<sub>th</sub> = R ∥ R<sub>L</sub>, &nbsp; τ = R<sub>th</sub> C</div>`,
    eng: `<p>Electrolytic capacitors leak microamps, more when hot or near rated voltage. With megohm timing resistors that's significant, which is why long RC timers use film capacitors or a digital counter instead.</p>`,
  },
  esr: {
    title: "ESR: resistance inside the capacitor",
    simple: `<p>Real capacitors have a small resistance inside them. The instant current starts flowing, that resistance shows a voltage, before any charge has built up.</p>`,
    math: `<div class="eq">v<sub>terminal</sub> = v<sub>C</sub> + i · ESR, &nbsp;&nbsp; jump = V · ESR / (R + ESR)</div>`,
    eng: `<p>ESR sets output ripple in power supplies (ΔV = ΔI · ESR), heats capacitors (I²·ESR) and limits decoupling at high frequency. Low-ESR ceramics and polymers exist for exactly this reason.</p>`,
  },
  probe: {
    title: "Measurement loading",
    simple: `<p>To measure a voltage the scope has to take a tiny bit of current. If the circuit is weak (high R), that tiny bit is enough to change it.</p>`,
    math: `<p>The probe's input resistance R<sub>p</sub> sits across C:</p><div class="eq">final = V · R<sub>p</sub>/(R + R<sub>p</sub>), &nbsp; τ = (R ∥ R<sub>p</sub>) C</div><p>With R = R<sub>p</sub>: half the voltage, half the τ.</p>`,
    eng: `<p>Keep the source impedance at least 10×, ideally 100×, below the probe's. A 10× passive probe gives 10 MΩ and less capacitance, and active FET probes go higher. At high frequency the probe's capacitance loads the circuit too.</p>`,
  },
  energy: {
    title: "Why exactly half the energy is lost",
    simple: `<p>Charging a capacitor straight from a battery always wastes exactly as much energy as it stores, as heat in the resistor. A smaller resistor doesn't help: it just gets hotter for a shorter time.</p>`,
    math: `<div class="eq">E<sub>battery</sub> = QV = CV², &nbsp; E<sub>stored</sub> = ½CV², &nbsp; ∫ i²R dt = ½CV²</div><p>The heat integral comes out to ½CV² whatever the value of R.</p>`,
    eng: `<p>This 50 % limit comes from a fixed-voltage source across a changing voltage. It's the root of switched-capacitor losses (½CV² per switch) and of CMOS dynamic power, CV²f. Adiabatic and stepwise charging beat it by keeping the voltage across R small.</p>`,
  },
  fc: {
    title: "How τ sets the cutoff frequency",
    simple: `<p>The capacitor takes about τ to respond. Signals that change much more slowly than that get through. Signals that wiggle faster get smoothed away before the capacitor can follow.</p>`,
    math: `<div class="eq">H(jω) = 1 / (1 + jωRC), &nbsp; |H| = 1/√2 (−3 dB) at ω = 1/RC</div><div class="eq">f<sub>c</sub> = 1 / (2πRC)</div>`,
    eng: `<p>Choose R first for the impedance level (what can drive it, what loads it, noise), then pick C from standard values. Check tolerances: ±1 % resistors and ±5–10 % capacitors move f<sub>c</sub> by the same percentages.</p>`,
  },
};
