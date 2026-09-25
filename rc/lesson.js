// RC Lesson 1: "How fast does a capacitor charge?"
// One idea: R and C decide how quickly the capacitor fills, and only their product matters (τ = RC).
// Steps are data for core/mission.js. Observed numbers always come from the simulation (ev.meas).

import { fmt } from "../core/ui.js";
export { WHY } from "./why-content.js";

export const STAGES = [{ id: "lesson", label: "Lesson" }];

const BASE = { R: 10e3, C: 100e-6 };            // τ = 1 s, so 90 % full at 2.30 s
const T90 = Math.log(10);
const same = (a, b) => Math.abs(a / b - 1) < 1e-3;
// Times in plain seconds for students: 0.58 s rather than 576 ms.
export const secs = t => (t < 10 ? t.toFixed(2) : t.toFixed(1)) + " s";
const isCharge = ev => ev.type === "complete" && ev.capture.meta.sw === "A";

function compare(target, how) {
  return (ev, lab) => {
    if (!isCharge(ev)) return;
    const want = { ...BASE, ...target };
    if (!same(lab.P.R, want.R) || !same(lab.P.C, want.C)) return { msg: how };
    const t = ev.meas.t90;
    if (t == null) return { msg: "It didn't get 90 % full on the graph. Press Charge and wait a little longer." };
    return { done: true, data: { t, ratio: t / T90 } };
  };
}

const TEXT = { lock: "Make prediction", lockNote: "", correct: "✓ You predicted correctly.", surprise: "Not quite. Let's see why.", predictedPrefix: "Your prediction:", noted: "✓ Added to My notes" };
export const VIEW = { stages: false, loop: false, progress: "dots", text: TEXT };

export const STEPS = [
  {
    id: "watch", stage: "lesson", title: "What happens when the switch closes?", actPhase: "play", askPhase: "notice",
    setup: lab => { lab.reset(); lab.show([]); },
    prompt: `<p>A battery, a resistor <b>R</b> and a <b>capacitor C</b>: a part that stores electric charge.</p><p>The graph shows the capacitor's voltage, which tells you how full of charge it is.</p>`,
    act: `Press <b>Charge</b> and watch the graph.`,
    check: ev => (isCharge(ev) ? { done: true } : undefined),
    ask: {
      q: "How did the capacitor fill up?",
      options: [
        { id: "fastslow", label: "Fast at first, then slower and slower", fb: "Yes. It rushes in at first, then slows down as it gets full." },
        { id: "steady", label: "At a steady speed", fb: "Look at the curve: it's steep at the start and flattens out." },
        { id: "slowfast", label: "Slowly at first, then faster", fb: "Look at the very start of the curve: that's the steepest part." },
      ], answer: "fastslow",
    },
    reveal: `<p>The graph marks when it was <b>90 % full</b>: about 2.3 seconds.</p><p class="m-muse">Is there anything you can change to make it faster?</p>`,
    note: () => "A capacitor charges fast at first, then slows down as it fills.",
    why: ["shape"],
  },
  {
    id: "faster", stage: "lesson", title: "Can you make it charge faster?", actPhase: "play", donePhase: "notice",
    setup: lab => { lab.reset(); lab.show(["R", "C"]); lab.setRef(lab.baseline(), "your first charge"); },
    prompt: `<p>You can change the resistor <b>R</b> and the capacitor <b>C</b>.</p>`,
    act: `Change R or C, then press <b>Charge</b>. Can you get it 90 % full in <b>half the time</b>, about 1.2 s?`,
    check: (ev, lab) => {
      if (!isCharge(ev)) return;
      const t = ev.meas.t90;
      if (t == null) return { msg: "It didn't even get 90 % full on the graph. That's slower, not faster!" };
      if (t > (T90 / 2) * 1.02)
        return { msg: `90 % full at ${secs(t)}. ${t < T90 * 0.98 ? "Faster than before. Keep going!" : t > T90 * 1.02 ? "That's slower than your first charge." : "About the same as before."}` };
      const d = [];
      if (lab.P.R < BASE.R * 0.999) d.push("a smaller R");
      if (lab.P.R > BASE.R * 1.001) d.push("a bigger R");
      if (lab.P.C < BASE.C * 0.999) d.push("a smaller C");
      if (lab.P.C > BASE.C * 1.001) d.push("a bigger C");
      return { done: true, data: { t, what: d.join(" and ") } };
    },
    reveal: ctx => `<p>90 % full in <b>${secs(ctx.data.t)}</b>, using ${ctx.data.what}.</p><p class="m-muse">Which one made the difference, R or C? Next you'll test them one at a time.</p>`,
    note: ctx => `Using ${ctx.data.what} made the capacitor charge faster.`,
  },
  {
    id: "double-r", stage: "lesson", title: "What if R is twice as big?",
    setup: lab => { lab.reset(); lab.show(["R"]); lab.setRef(lab.baseline(), "R = 10 kΩ"); },
    prompt: `<p>The dashed curve is the capacitor charging with R = 10 kΩ.</p>`,
    predict: {
      q: "If you double R, the capacitor will charge…",
      options: [{ id: "faster", label: "Faster" }, { id: "slower", label: "Slower" }, { id: "same", label: "At the same speed" }],
      answer: "slower",
    },
    act: `Now try it: press <b>×2</b> next to R, then <b>Charge</b>.`,
    check: compare({ R: 20e3 }, "Set R to exactly 20 kΩ: press ×2 once, then Charge."),
    observed: ctx => `Slower: ${ctx.data.ratio.toFixed(2)}× as long`,
    reveal: `<p>It took <b>twice as long</b> to fill. A bigger resistor lets less charge through each second, so filling up takes longer.</p>`,
    note: ctx => `Doubling R made charging take ${ctx.data.ratio.toFixed(1)}× as long.`,
  },
  {
    id: "double-c", stage: "lesson", title: "What if C is twice as big?",
    setup: lab => { lab.reset(); lab.show(["C"]); lab.setRef(lab.baseline(), "C = 100 µF"); },
    prompt: `<p>R is back to 10 kΩ. The dashed curve is the capacitor charging with C = 100 µF.</p>`,
    predict: {
      q: "If you double C, the capacitor will charge…",
      options: [{ id: "faster", label: "Faster" }, { id: "slower", label: "Slower" }, { id: "same", label: "At the same speed" }],
      answer: "slower",
    },
    act: `Now try it: press <b>×2</b> next to C, then <b>Charge</b>.`,
    check: compare({ C: 200e-6 }, "Set C to exactly 200 µF: press ×2 once, then Charge."),
    observed: ctx => `Slower: ${ctx.data.ratio.toFixed(2)}× as long`,
    reveal: `<p>Also <b>twice as long</b>. A bigger capacitor holds more charge, so there's more to fill through the same resistor.</p>`,
    note: ctx => `Doubling C also made charging take ${ctx.data.ratio.toFixed(1)}× as long.`,
  },
  {
    id: "together", stage: "lesson", title: "What do R and C have in common?", donePhase: "explain",
    setup: lab => { lab.reset(); lab.show(["R", "C"]); lab.setRef(lab.baseline(), "R = 10 kΩ, C = 100 µF"); },
    prompt: `<p>Doubling R made it twice as slow. Doubling C also made it twice as slow.</p>`,
    predict: {
      q: "What if you double R and halve C, both at once?",
      options: [
        { id: "four", label: "Four times as slow" },
        { id: "two", label: "Twice as slow" },
        { id: "same", label: "Exactly the same as before" },
        { id: "fast", label: "Twice as fast" },
      ], answer: "same",
    },
    act: `Try it: press <b>×2</b> on R and <b>÷2</b> on C, then <b>Charge</b>.`,
    check: compare({ R: 20e3, C: 50e-6 }, "Set R to 20 kΩ (×2) and C to 50 µF (÷2), then Charge."),
    observed: () => "Exactly the same curve",
    reveal: `<p>Your curve lands exactly on the old one. R and C only matter <b>multiplied together</b>. That product is the circuit's <b>time constant</b>, written τ (tau):</p>
      <div class="eq">τ = R × C</div>
      <p>10 kΩ × 100 µF = 1 second, and 20 kΩ × 50 µF is also 1 second. Same τ, same curve.</p>`,
    note: () => "Only R × C matters. That product is the time constant: τ = R × C.",
    why: ["tau"], unlock: ["tau"],
  },
  {
    id: "one-tau", stage: "lesson", title: "What does one τ look like?", unlockStart: ["tauDot"],
    setup: lab => { lab.reset(); lab.show(["R", "C"]); },
    prompt: `<p>The graph now marks <b>1τ</b>: one time constant after the switch closes. Here τ = 1 s.</p>`,
    predict: {
      q: "After exactly one τ, how full will the capacitor be?",
      options: [{ id: "third", label: "About a third" }, { id: "half", label: "About half" }, { id: "twothirds", label: "About two-thirds" }, { id: "almost", label: "Almost full" }],
      answer: "twothirds",
    },
    act: `Press <b>Charge</b> and watch where the curve crosses the <b>1τ</b> line.`,
    check: (ev, lab) => (isCharge(ev) ? { done: true, data: { pct: lab.fullAt(ev.capture, lab.P.R * lab.P.C) } } : undefined),
    observed: ctx => `${Math.round(100 * ctx.data.pct)} % full`,
    reveal: `<p>About <b>63 %</b> full after one τ. In every τ the capacitor fills about two-thirds of the room it has left: 86 % after 2τ, 95 % after 3τ, and practically full after about 5τ.</p>
      <p>So τ tells you how long charging takes. Bigger τ, slower charge.</p>`,
    note: () => "After one τ the capacitor is about 63 % full. After about 5τ it's practically full.",
    why: ["632"],
  },
  {
    id: "match", stage: "lesson", title: "Challenge: match the curve", actPhase: "challenge", donePhase: "challenge",
    setup: lab => { lab.reset(); lab.show(["R", "C"]); lab.setRef(lab.baseline({ R: 22e3, C: 100e-6 }), "target"); },
    prompt: `<p>The dashed curve is a <b>target</b>. Choose R and C so your charge lands right on top of it.</p>`,
    act: `Change R and C, then press <b>Charge</b>.`,
    check: (ev, lab, ctx) => {
      if (!isCharge(ev)) return;
      const tau = lab.P.R * lab.P.C, err = tau / 2.2 - 1;
      ctx.attempts++;
      if (Math.abs(err) <= 0.03) return { done: true, data: { tau, R: lab.P.R, C: lab.P.C } };
      const hint = ctx.attempts >= 3 ? " Hint: find where the target is 63 % full. That time is its τ." : "";
      return { msg: (err > 0 ? "Too slow: your curve is below the target." : "Too fast: your curve is above the target.") + hint };
    },
    reveal: ctx => `<p>Matched! ${fmt(ctx.data.R, "Ω")} × ${fmt(ctx.data.C, "F")} = ${secs(ctx.data.tau)}, the same τ as the target.</p>`,
    note: ctx => `Matched a target curve: R = ${fmt(ctx.data.R, "Ω")}, C = ${fmt(ctx.data.C, "F")}, τ = ${secs(ctx.data.tau)}.`,
  },
  {
    id: "summary", stage: "lesson", title: "What you discovered",
    setup: lab => { lab.reset(); lab.show(["R", "C"]); },
    prompt: (ctx, lab) => {
      const items = lab.discoveries();
      return items.length ? `<ul class="m-found">${items.map(t => `<li>${t}</li>`).join("")}</ul>` : `<p>Work through the lesson and your discoveries will collect here.</p>`;
    },
    reveal: `<p class="m-muse">You didn't memorise τ = RC. You found it.</p>
      <p><b>Next in RC circuits</b></p>
      <ul class="m-next"><li>Charging <i>and</i> discharging</li><li>Why the current fades away</li><li>Measuring τ like an engineer</li><li>RC circuits as filters</li><li>Real, imperfect parts</li></ul>
      <p class="m-small">These lessons are on their way. For a preview of all of them in one advanced lab, open the <a href="bench/">engineering bench</a>.</p>`,
    buttons: [{ id: "restart", label: "Start the lesson again" }],
  },
];
