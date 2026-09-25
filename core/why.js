// WHY? — a contextual explanation at three depths. Only one depth shows at a time;
// the lab picks the default from where the learner is, and they can go deeper.
// topics: { id: { title, simple, math, eng } } with HTML strings.

const DEPTHS = [["simple", "Simply"], ["math", "Mathematically"], ["eng", "As an engineer"]];

export class Why {
  constructor(topics, { depth = () => "simple" } = {}) {
    this.topics = topics;
    this.depth = depth;
    const d = (this.dlg = document.createElement("dialog"));
    d.className = "why-dlg";
    d.setAttribute("aria-labelledby", "whyTitle");
    d.innerHTML = `<header><span class="why-tag">WHY?</span><h2 id="whyTitle"></h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">✕</button></header>
      <div class="seg why-tabs" role="tablist">${DEPTHS.map(([k, l]) => `<button type="button" role="tab" data-d="${k}">${l}</button>`).join("")}</div>
      <div class="why-body" role="tabpanel"></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", e => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
      const b = e.target.closest("[data-d]");
      if (b) this.show(b.dataset.d);
    });
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-why]");
      if (b) { e.preventDefault(); this.open(b.dataset.why); }
    });
  }

  open(id) {
    const t = this.topics[id];
    if (!t) return;
    this.cur = t;
    this.dlg.querySelector("h2").textContent = t.title;
    this.show(this.depth());
    this.dlg.showModal();
  }

  show(k) {
    this.dlg.querySelector(".why-body").innerHTML = this.cur[k];
    this.dlg.querySelectorAll("[data-d]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.d === k));
      b.setAttribute("aria-selected", String(b.dataset.d === k));
    });
  }
}
