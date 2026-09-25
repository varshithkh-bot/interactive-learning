# Interactive Learning

Interactive lessons for engineering concepts. **Don't memorise the equation. Make the equation happen.**

Each lesson teaches one idea: change something, watch what happens, predict, test, and only then name the pattern.

**Live site:** https://varshithkh-bot.github.io/interactive-learning/

| Lesson | Path |
| --- | --- |
| RC 1 · How fast does a capacitor charge? | [rc/](rc/) |
| RC engineering bench (advanced preview of later RC lessons) | [rc/bench/](rc/bench/) |
| Classic RC explorer (original single-file version) | [rc-circuit-explorer.html](rc-circuit-explorer.html) |

Design notes for lesson 1 are in [docs/rc-lesson-1-audit.md](docs/rc-lesson-1-audit.md).

## How it's built

Static files served by GitHub Pages: no build step and no dependencies. The lessons use native ES modules, so preview them through a local web server rather than by opening the file directly:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/.

```
core/               reusable pieces for every lesson
  scope.js          waveform display: "plain" graph for beginners, "instrument" scope for the bench
  mission.js        guided step runner: setup → predict (locks controls) → act → check → ask → reveal → notes
  notebook.js       "What I discovered" notes (stored in the browser)
  why.js            WHY? dialog with three depths: simply / mathematically / as an engineer
  ui.js             formatting, E24 values, slider and segmented controls
  lab.css           shared styling, light and dark
rc/                 RC circuits
  model.js          deterministic physics (exact exponential solver, source R, ESR, leakage, probe loading)
  circuit.js        animated schematic (simple mode for lessons, full mode for the bench)
  why-content.js    WHY? explanations shared by every RC lesson
  index.html, main.js, lesson.js         lesson 1: one circuit, one graph, one button, R and C
  bench/            the engineering bench: oscilloscope, mysteries, design challenges
```

**The physics is the source of truth.** Every number a learner sees comes from `model.js` or from measurements of a simulated waveform; lesson text never hard-codes an observed value. `window.rcLab.snapshot()` returns the live experiment state for a future AI tutor.

### Adding a lesson

A lesson is a page, a small `main.js` that exposes only the controls it needs, and a list of steps in `lesson.js` (the step schema is at the top of `core/mission.js`). Reuse the model, schematic and WHY? content of its topic. Start from the smallest set of controls that lets the learner discover the one idea; lesson 1 is the reference.

Pushing to `main` redeploys the site, usually within a minute. The home page footer shows the date and time (IST) of the latest commit, read from GitHub, so it never needs editing by hand.
