// Animated schematic. Pure view: it draws whatever state it is given.

import { fmt } from "../core/ui.js";

const NS = "http://www.w3.org/2000/svg";
const zigH = (x0, y, x1, n = 8, a = 10) => { const w = (x1 - x0) / n; let d = `M${x0} ${y}`; for (let i = 0; i < n; i++) d += ` L${(x0 + w * (i + 0.5)).toFixed(1)} ${y + (i % 2 ? a : -a)}`; return d + ` L${x1} ${y}`; };
const zigV = (x, y0, y1, n = 6, a = 8) => { const w = (y1 - y0) / n; let d = ""; for (let i = 0; i < n; i++) d += ` L${x + (i % 2 ? a : -a)} ${(y0 + w * (i + 0.5)).toFixed(1)}`; return d + ` L${x} ${y1}`; };

const PATH_A = "M60 122 V50 H150 L210 50 H430 V122 M430 136 V210 H60 V136";
const PATH_B = "M430 122 V50 H210 L166 91 V210 H430 V136";

export class Circuit {
  constructor(mount, { onToggle }) {
    mount.innerHTML = `
<svg viewBox="0 0 660 236" class="circuit" role="group" aria-label="Circuit: battery, two-way switch, resistor R and capacitor C, watched by a scope probe">
  <defs><filter id="glow" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="4"/></filter></defs>
  <rect id="boxSrc" class="realbox hide" x="24" y="56" width="74" height="100" rx="8"/>
  <text id="boxSrcT" class="tiny hide" x="61" y="170" text-anchor="middle">real source</text>
  <rect id="boxCap" class="realbox hide" x="396" y="64" width="112" height="100" rx="8"/>
  <text id="boxCapT" class="tiny hide" x="452" y="178" text-anchor="middle">real capacitor</text>
  <g class="wire">
    <path d="M60 50 H150"/>
    <path id="wBat" d="M60 50 V122"/>
    <path id="wRs" class="hide" d="M60 50 V62${zigV(60, 62, 102)} V122"/>
    <path d="M60 136 V210 H610"/>
    <path d="M166 91 V210"/>
    <path d="M210 50 H260"/>
    <path id="rZig" d="${zigH(260, 50, 340)}"/>
    <path d="M340 50 H610 V76"/>
    <path id="wCap" d="M430 50 V122"/>
    <path id="wEsr" class="hide" d="M430 50 V76${zigV(430, 76, 104)} V122"/>
    <path d="M430 136 V210"/>
    <path id="wLeak" class="hide" d="M430 112 H484 V116${zigV(484, 116, 144)} V150 H430"/>
    <path id="wProbe" class="hide" d="M610 112 V124${zigV(610, 124, 168)} V210"/>
  </g>
  <path id="heat" d="${zigH(260, 50, 340)}" fill="none" stroke="var(--heat)" stroke-width="9" stroke-linejoin="round" filter="url(#glow)" opacity="0"/>
  <line x1="40" y1="122" x2="80" y2="122" class="plate" stroke-width="3"/>
  <line x1="50" y1="136" x2="70" y2="136" class="plate" stroke-width="6"/>
  <text class="lbl" x="86" y="118">+</text>
  <text class="val" x="86" y="146" id="tV"></text>
  <text class="tiny" x="36" y="84" id="tRs" text-anchor="end"></text>
  <rect id="capFill" x="408" y="123" width="44" height="12" fill="var(--vc)" opacity="0"/>
  <line x1="404" y1="122" x2="456" y2="122" class="plate" stroke-width="3.5"/>
  <line x1="404" y1="136" x2="456" y2="136" class="plate" stroke-width="3.5"/>
  <g id="plus"></g><g id="minus"></g>
  <text class="lbl" x="392" y="134" text-anchor="end">C <tspan class="val" id="tC"></tspan></text>
  <text class="tiny" x="444" y="94" id="tEsr"></text>
  <text class="tiny" x="498" y="136" id="tLeak"></text>
  <text class="lbl" x="300" y="24" text-anchor="middle">R <tspan class="val" id="tR"></tspan></text>
  <circle class="node" cx="430" cy="50" r="3.5"/>
  <rect class="probe" x="600" y="76" width="20" height="36" rx="5"/>
  <text class="tiny" x="610" y="70" text-anchor="middle">CH1</text>
  <text class="tiny" x="600" y="198" id="tProbe" text-anchor="end"></text>
  <text class="tiny" x="610" y="130" id="tProbeIdeal" text-anchor="middle">scope</text>
  <path class="wire" d="M318 210 V220 M306 220 H330 M311 225 H325 M316 230 H320"/>
  <circle class="contact" cx="150" cy="50" r="5"/>
  <circle class="contact" cx="166" cy="91" r="5"/>
  <text class="lbl sw-l" x="140" y="40">A</text>
  <text class="lbl sw-l" x="148" y="100">B</text>
  <path id="pA" d="${PATH_A}" fill="none" stroke="none"/>
  <path id="pB" d="${PATH_B}" fill="none" stroke="none"/>
  <g id="dotsA"></g><g id="dotsB"></g>
  <rect id="swHit" x="132" y="28" width="96" height="80" rx="10" fill="transparent" tabindex="0" role="button" aria-label="Toggle switch between A (charge) and B (discharge)"/>
  <g pointer-events="none">
    <line id="blade" x1="210" y1="50" x2="150" y2="50" stroke="var(--wire)" stroke-width="4" stroke-linecap="round"/>
    <circle class="node" cx="210" cy="50" r="5"/>
  </g>
</svg>`;
    const q = s => mount.querySelector(s);
    this.q = q;
    this.el = { blade: q("#blade"), heat: q("#heat"), capFill: q("#capFill"), dotsA: q("#dotsA"), dotsB: q("#dotsB") };
    this.pA = q("#pA"); this.pB = q("#pB");
    this.LA = this.pA.getTotalLength(); this.LB = this.pB.getTotalLength();
    const mk = (g, L) => Array.from({ length: Math.floor(L / 28) }, () => { const c = document.createElementNS(NS, "circle"); c.setAttribute("r", "3.6"); g.appendChild(c); return c; });
    this.dA = mk(this.el.dotsA, this.LA); this.dB = mk(this.el.dotsB, this.LB);
    this.offA = 0; this.offB = 0;
    this.plus = []; this.minus = [];
    for (let j = 0; j < 6; j++) {
      const p = document.createElementNS(NS, "text"); p.setAttribute("x", 407 + j * 8); p.setAttribute("y", 117); p.setAttribute("class", "q q-p"); p.textContent = "+"; q("#plus").appendChild(p); this.plus.push(p);
      const m = document.createElementNS(NS, "text"); m.setAttribute("x", 408 + j * 8); m.setAttribute("y", 151); m.setAttribute("class", "q q-m"); m.textContent = "−"; q("#minus").appendChild(m); this.minus.push(m);
    }
    const hit = q("#swHit");
    hit.addEventListener("click", onToggle);
    hit.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } });
    this.last = {};
  }

  _text(id, s) { if (this.last[id] !== s) { this.q(id).textContent = s; this.last[id] = s; } }
  _show(id, on) { this.q(id).classList.toggle("hide", !on); }

  /** st: { sw, i, iRef, vc, vRef, labels:{R,C,V}, show:{Rs,ESR,Rleak,Rprobe}, dt, locked } */
  update(st) {
    const onA = st.sw === "A";
    this.el.blade.style.transform = onA ? "rotate(0deg)" : "rotate(-43deg)";
    this.el.dotsA.style.display = onA ? "" : "none";
    this.el.dotsB.style.display = onA ? "none" : "";
    const frac = Math.min(1, Math.abs(st.i) / Math.max(1e-15, st.iRef));
    const dir = onA ? Math.sign(st.i) : -Math.sign(st.i);
    const v = 120 * frac * dir * st.dt;
    if (onA) this.offA += v; else this.offB += v;
    const [dots, path, L, off] = onA ? [this.dA, this.pA, this.LA, this.offA] : [this.dB, this.pB, this.LB, this.offB];
    const sp = L / dots.length;
    for (let j = 0; j < dots.length; j++) {
      const pt = path.getPointAtLength((((off + j * sp) % L) + L) % L);
      dots[j].setAttribute("cx", pt.x.toFixed(1)); dots[j].setAttribute("cy", pt.y.toFixed(1));
    }
    (onA ? this.el.dotsA : this.el.dotsB).setAttribute("opacity", frac < 0.004 ? 0.2 : 0.95);
    const q = Math.max(0, st.vc / Math.max(1e-9, st.vRef)) * 6;
    for (let j = 0; j < 6; j++) { const o = Math.max(0, Math.min(1, q - j)).toFixed(2); this.plus[j].setAttribute("opacity", o); this.minus[j].setAttribute("opacity", o); }
    this.el.capFill.setAttribute("opacity", (0.35 * Math.max(0, Math.min(1, st.vc / Math.max(1e-9, st.vRef)))).toFixed(3));
    this.el.heat.setAttribute("opacity", (0.9 * frac * frac).toFixed(3));

    this._text("#tR", fmt(st.labels.R, "Ω", 3));
    this._text("#tC", fmt(st.labels.C, "F", 3));
    this._text("#tV", fmt(st.labels.V, "V", 3));
    const sh = st.show;
    this._show("#wRs", sh.Rs != null); this._show("#wBat", sh.Rs == null);
    this._show("#boxSrc", sh.Rs != null); this._show("#boxSrcT", sh.Rs != null);
    this._text("#tRs", sh.Rs != null ? "Rs " + fmt(sh.Rs, "Ω") : "");
    this._show("#wEsr", sh.ESR != null); this._show("#wCap", sh.ESR == null);
    this._text("#tEsr", sh.ESR != null ? "ESR " + fmt(sh.ESR, "Ω") : "");
    this._show("#wLeak", sh.Rleak != null);
    this._text("#tLeak", sh.Rleak != null ? "leak " + fmt(sh.Rleak, "Ω") : "");
    const real = sh.ESR != null || sh.Rleak != null;
    this._show("#boxCap", real); this._show("#boxCapT", real);
    this._show("#wProbe", sh.Rprobe != null);
    this._show("#tProbeIdeal", sh.Rprobe == null);
    this._text("#tProbe", sh.Rprobe != null ? "input " + fmt(sh.Rprobe, "Ω") : "");
    this.q("#swHit").setAttribute("aria-disabled", String(!!st.locked));
  }
}
