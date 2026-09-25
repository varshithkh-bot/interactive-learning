// WHY? explanations for RC lessons, shared by every RC lesson. Each topic has three depths.

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
