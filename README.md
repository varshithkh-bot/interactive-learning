# Interactive Learning

Virtual laboratories for engineering concepts. **Don't memorise the equation. Make the equation happen.**

Each lab runs the same loop: play → notice → predict → observe → explain → measure → challenge → design.

**Live site:** https://varshithkh-bot.github.io/interactive-learning/

| Lab | Path |
| --- | --- |
| RC Lab | [rc/](rc/) |
| Classic RC explorer (original single-file version) | [rc-circuit-explorer.html](rc-circuit-explorer.html) |

## How it's built

Static files served by GitHub Pages: no build step and no dependencies. The labs use native ES modules, so preview them through a local web server rather than by opening the file directly:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/rc/.

```
core/               reusable pieces for every lab
  scope.js          oscilloscope: channels, 1-2-5 scales, trigger, run/stop/single, ref trace, cursors, overlays
  mission.js        guided step runner: setup → predict (locks controls) → act → check → ask → reveal → notebook
  notebook.js       lab notebook of discoveries (stored in the browser)
  why.js            WHY? dialog with three depths: simply / mathematically / as an engineer
  ui.js             formatting, E24 values, slider and segmented controls
  lab.css           shared instrument styling, light and dark
rc/                 the RC laboratory
  model.js          deterministic physics (exact exponential solver, source R, ESR, leakage, probe loading)
  circuit.js        animated schematic
  lesson.js         stages, steps, mysteries, challenges, WHY? content
  main.js           wiring: sim loop, triggers, measurements, controls
```

**The physics is the source of truth.** Every number the learner sees comes from `model.js` or from measurements of captured waveforms. Lesson text never hard-codes an observed value. `window.rcLab.snapshot()` returns the live experiment state, ready for a future AI tutor that explains the simulation rather than inventing values.

### Adding a lab

Write a `model.js` for the phenomenon, pick the scope channels, and describe the lesson as a list of steps in `lesson.js` (see the schema at the top of `core/mission.js`). The scope, missions, notebook and WHY? come for free.

Pushing to `main` redeploys the site, usually within a minute.
