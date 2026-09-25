// Guided mission runner. A lab supplies an ordered list of steps; each step is plain data
// plus a few functions, so a new lab is assembled rather than re-coded:
//
// {
//   id, stage, title,
//   setup(lab, ctx)                 put the bench in a known state
//   prompt                          what the learner is looking at (HTML or fn(ctx, lab))
//   predict: { q, options:[{id,label}], answer }   commit before the controls unlock
//   act                             the instruction (HTML or fn)
//   actions: [{id,label}]           extra buttons that send {type:id} events (e.g. "submit")
//   check(ev, lab, ctx)             -> undefined | {msg} | {done:true, data}
//   ask: { q, options:[{id,label,fb}], answer }    a question after observing (notice / diagnose)
//   observed(ctx)                   short text compared against the prediction
//   reveal(ctx, lab)                the explanation, shown only after the observation
//   note(ctx, lab)                  a line written to the lab notebook
//   why: [topicId]                  WHY? buttons
//   unlockStart / unlock            tools that appear at the start / end of the step
//   actPhase / askPhase / donePhase which part of the learning loop is highlighted
// }

import { store } from "./ui.js";

export const LOOP = ["play", "notice", "predict", "observe", "explain", "measure", "challenge", "design"];

export class Mission {
  constructor({ mount, steps, stages, lab, notebook, key, onCustom }) {
    Object.assign(this, { mount, steps, stages, lab, notebook, key, onCustom });
    const s = store.get(key, { i: 0, max: 0 });
    this.i = Math.min(s.i | 0, steps.length - 1);
    this.max = Math.min(s.max | 0, steps.length - 1);
    mount.addEventListener("click", e => this._click(e));
  }

  get step() { return this.steps[this.i]; }
  get stage() { return this.step.stage; }

  unlocksFor(i) {
    const u = new Set();
    this.steps.forEach((st, k) => {
      if (k < i) [...(st.unlockStart || []), ...(st.unlock || [])].forEach(x => u.add(x));
      if (k === i) (st.unlockStart || []).forEach(x => u.add(x));
    });
    return u;
  }

  start(i, { focus = true } = {}) {
    this.i = Math.max(0, Math.min(this.steps.length - 1, i));
    this.max = Math.max(this.max, this.i);
    store.set(this.key, { i: this.i, max: this.max });
    const st = this.step;
    this.ctx = { attempts: 0 };
    this.msg = ""; this.askFb = ""; this.pred = null; this.wrong = new Set(); this.noted = false;
    this.lab.setUnlocks(this.unlocksFor(this.i));
    st.setup?.(this.lab, this.ctx);
    this.phase = st.predict ? "predict" : st.check ? "act" : "done";
    this.lab.lock(this.phase === "predict");
    if (this.phase === "done") this._finish(false);
    this.render();
    if (focus) this.mount.querySelector("h2")?.focus({ preventScroll: true });
  }

  /** Called by the lab for every observable event: capture complete, cursor moved, button pressed… */
  event(ev) {
    if (this.phase !== "act" || !this.step.check) return;
    const r = this.step.check(ev, this.lab, this.ctx);
    if (!r) return;
    if (r.done) {
      if (r.data !== undefined) this.ctx.data = r.data;
      this.msg = "";
      if (this.step.ask) this.phase = "ask"; else return this._finish();
      this.render();
    } else if (r.msg != null && r.msg !== this.msg) {
      this.msg = r.msg;
      const fb = this.mount.querySelector(".m-act-fb"), act = this.mount.querySelector(".m-act");
      if (!fb) return this.render();
      fb.innerHTML = r.msg;
      if (act && typeof this.step.act === "function") act.innerHTML = this.step.act(this.ctx, this.lab);
    }
  }

  _finish(render = true) {
    const st = this.step;
    this.phase = "done";
    this.lab.lock(false);
    const note = st.note?.(this.ctx, this.lab);
    if (note) this.notebook.add(note, { tag: st.id });
    this.noted = !!note;
    (st.unlock || []).forEach(k => this.lab.addUnlock(k));
    st.onDone?.(this.lab, this.ctx);
    this.max = Math.max(this.max, Math.min(this.i + 1, this.steps.length - 1));
    store.set(this.key, { i: this.i, max: this.max });
    if (render) this.render();
  }

  _click(e) {
    const b = e.target.closest("[data-m]");
    if (!b || b.disabled) return;
    const a = b.dataset.m, st = this.step;
    if (a === "pred") { this.pred = b.dataset.id; this.render(); this.mount.querySelector(`[data-m=pred][data-id="${b.dataset.id}"]`)?.focus(); }
    else if (a === "lock") { this.phase = "act"; this.lab.lock(false); this.render(); }
    else if (a === "ans") {
      const o = st.ask.options.find(x => x.id === b.dataset.id);
      this.askFb = o.fb || "";
      if (o.id === st.ask.answer) this._finish(); else { this.wrong.add(o.id); this.render(); }
    }
    else if (a === "act") this.event({ type: b.dataset.id });
    else if (a === "next") this.start(this.i + 1);
    else if (a === "back") this.start(this.i - 1);
    else if (a === "skip") this.start(this.i + 1);
    else if (a === "stage") this.start(+b.dataset.k);
    else if (a === "custom") this.onCustom?.(b.dataset.id);
  }

  loopPhase() {
    const st = this.step;
    return { predict: "predict", act: st.actPhase || "observe", ask: st.askPhase || "notice", done: st.donePhase || "explain" }[this.phase];
  }

  render() {
    const st = this.step, n = this.steps.length, ph = this.phase;
    const v = x => (typeof x === "function" ? x(this.ctx, this.lab) : x || "");
    const cur = this.loopPhase();
    const firstOf = id => this.steps.findIndex(s => s.stage === id);
    const stageIdx = this.stages.findIndex(s => s.id === st.stage);
    let h = `<nav class="m-stages" aria-label="Lab stages">${this.stages.map((s, k) => {
      const f = firstOf(s.id), ok = f >= 0 && f <= this.max;
      return `<button type="button" class="m-stage${k === stageIdx ? " on" : ""}${k < stageIdx ? " past" : ""}" data-m="stage" data-k="${f}" ${ok ? "" : "disabled"} ${k === stageIdx ? 'aria-current="step"' : ""}>${s.label}</button>`;
    }).join("")}</nav>
    <ol class="m-loop" aria-label="Learning loop, current phase: ${cur}">${LOOP.map(p => `<li class="${p === cur ? "on" : ""}">${p}</li>`).join("")}</ol>
    <p class="m-count">Step ${this.i + 1} of ${n}</p>
    <h2 tabindex="-1">${st.title}</h2>
    <div class="m-prompt">${v(st.prompt)}</div>`;

    if (st.predict) {
      const pr = st.predict, lab = pr.options.find(o => o.id === this.pred)?.label;
      if (ph === "predict") {
        h += `<div class="m-q predict"><p class="q"><span class="chip">Predict</span>${pr.q}</p>
          <div class="opts" role="group" aria-label="Your prediction">${pr.options.map(o => `<button type="button" class="opt" data-m="pred" data-id="${o.id}" aria-pressed="${o.id === this.pred}">${o.label}</button>`).join("")}</div>
          <button type="button" class="btn primary" data-m="lock" ${this.pred ? "" : "disabled"}>Lock in my prediction</button>
          <p class="m-sub">The controls unlock once you commit. No peeking.</p></div>`;
      } else h += `<p class="m-locked"><span aria-hidden="true">🔒</span> You predicted: <b>${lab}</b></p>`;
    }

    if (ph === "act") {
      h += `<div class="m-act">${v(st.act)}</div>`;
      if (st.actions) h += `<div class="m-actions">${st.actions.map(a => `<button type="button" class="btn primary" data-m="act" data-id="${a.id}">${a.label}</button>`).join("")}</div>`;
      h += `<p class="m-act-fb" aria-live="polite">${this.msg}</p>`;
    }

    if (ph === "ask") {
      const q = st.ask;
      h += `<div class="m-q"><p class="q"><span class="chip">${st.askPhase === "explain" ? "Diagnose" : "Notice"}</span>${q.q}</p>
        <div class="opts">${q.options.map(o => `<button type="button" class="opt${this.wrong.has(o.id) ? " wrong" : ""}" data-m="ans" data-id="${o.id}" ${this.wrong.has(o.id) ? "disabled" : ""}>${o.label}</button>`).join("")}</div>
        <p class="m-act-fb" aria-live="polite">${this.askFb}</p></div>`;
    }

    if (ph === "done") {
      if (st.predict && this.pred) {
        const pr = st.predict, ok = this.pred === pr.answer;
        h += `<div class="m-pvo"><div><span>You predicted</span><b>${pr.options.find(o => o.id === this.pred).label}</b></div>
          <div><span>You observed</span><b>${v(st.observed) || pr.options.find(o => o.id === pr.answer).label}</b></div></div>
          <p class="m-verdict ${ok ? "ok" : "surprise"}">${ok ? "✓ Your prediction held up." : "✗ Not what you predicted. That gap is exactly where the learning is."}</p>`;
      }
      if (st.ask && this.askFb) h += `<p class="m-verdict ok">✓ ${this.askFb}</p>`;
      h += `<div class="m-reveal">${v(st.reveal)}</div>`;
      if (st.why?.length) h += `<p class="m-why">${st.why.map(w => `<button type="button" class="why" data-why="${w}">WHY?</button>`).join(" ")}</p>`;
      if (this.noted) h += `<p class="m-noted">✓ Written in your lab notebook</p>`;
      if (st.buttons) h += `<div class="m-actions">${st.buttons.map(b => `<button type="button" class="btn ${b.primary ? "primary" : ""}" data-m="custom" data-id="${b.id}">${b.label}</button>`).join("")}</div>`;
    }

    h += `<div class="m-nav"><button type="button" class="btn ghost" data-m="back" ${this.i ? "" : "disabled"}>← Back</button>
      ${ph !== "done" ? `<button type="button" class="btn ghost" data-m="skip" ${this.i < n - 1 ? "" : "disabled"}>Skip</button>` : ""}
      ${ph === "done" && this.i < n - 1 ? `<button type="button" class="btn primary" data-m="next">Next →</button>` : ""}</div>`;
    this.mount.innerHTML = h;
  }
}
