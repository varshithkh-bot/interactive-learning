// Lab notebook: a running record of what the learner discovered, written by the
// lab as experiments succeed and by the learner in their own words.
// Stored in this browser only (localStorage), keyed per lab.

import { store } from "./ui.js";

export class Notebook {
  constructor({ key, toggle, title = "Lab notebook" }) {
    this.key = key;
    this.items = store.get(key, []);
    this.toggle = toggle;
    this.badge = toggle.querySelector(".badge");
    const d = (this.drawer = document.createElement("aside"));
    d.className = "drawer";
    d.id = "notebook";
    d.setAttribute("aria-label", title);
    d.hidden = true;
    d.innerHTML = `
      <header><div><h2>${title}</h2><p>What I discovered, in the order I found it.</p></div>
        <button type="button" class="icon-btn" data-nb="close" aria-label="Close notebook">✕</button></header>
      <ol class="nb-list"></ol>
      <form class="nb-form"><label for="nbText">Add your own observation</label>
        <textarea id="nbText" rows="3" placeholder="e.g. With R = 1 MΩ the reading changed when I switched probes…"></textarea>
        <button class="btn" type="submit">Add to notebook</button></form>
      <footer><button type="button" class="btn ghost" data-nb="copy">Copy as text</button>
        <button type="button" class="btn ghost" data-nb="clear">Clear notebook</button></footer>`;
    document.body.appendChild(d);
    this.list = d.querySelector(".nb-list");
    toggle.setAttribute("aria-controls", d.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => (d.hidden ? this.open() : this.close()));
    d.addEventListener("click", e => {
      const a = e.target.closest("[data-nb]")?.dataset.nb;
      if (a === "close") this.close();
      if (a === "copy") this.copy(e.target);
      if (a === "clear" && confirm("Clear every entry in your lab notebook?")) { this.items = []; this.save(); }
    });
    d.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const ta = d.querySelector("textarea"), t = ta.value.trim();
      if (!t) return;
      this.add(t, { kind: "user" });
      ta.value = "";
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !d.hidden) this.close(); });
    this.render();
  }

  add(text, { tag = null, kind = "auto" } = {}) {
    const i = tag ? this.items.findIndex(x => x.tag === tag) : -1;
    if (i >= 0) this.items[i].text = text;
    else this.items.push({ text, tag, kind, at: Date.now() });
    this.save();
    this.badge?.classList.remove("pulse");
    void this.badge?.offsetWidth;
    this.badge?.classList.add("pulse");
  }

  save() { store.set(this.key, this.items); this.render(); }

  render() {
    if (this.badge) this.badge.textContent = this.items.length;
    this.list.innerHTML = this.items.length ? "" : `<li class="nb-empty">Nothing yet. Run an experiment and your discoveries will appear here.</li>`;
    for (const it of this.items) {
      const li = document.createElement("li");
      li.className = it.kind;
      li.innerHTML = `<span class="nb-mark" aria-hidden="true">${it.kind === "user" ? "✎" : "✓"}</span><span></span>`;
      li.lastChild.textContent = it.text;
      this.list.appendChild(li);
    }
  }

  open() { this.drawer.hidden = false; this.toggle.setAttribute("aria-expanded", "true"); this.drawer.querySelector("[data-nb=close]").focus(); }
  close() { this.drawer.hidden = true; this.toggle.setAttribute("aria-expanded", "false"); this.toggle.focus(); }

  async copy(btn) {
    const txt = this.items.map(x => (x.kind === "user" ? "✎ " : "✓ ") + x.text).join("\n");
    try { await navigator.clipboard.writeText(txt); btn.textContent = "Copied"; } catch { btn.textContent = "Copy failed"; }
    setTimeout(() => (btn.textContent = "Copy as text"), 1500);
  }
}
