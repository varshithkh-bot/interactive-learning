# RC lesson 1: student walkthrough and simplification audit

September 2026. This audit covers the RC lab as it stood after the "virtual laboratory" rebuild. The result is lesson 1 at `rc/`; the full lab moved, unchanged, to `rc/bench/`.

## The learning objective

**One idea:** resistance and capacitance decide how quickly a capacitor charges, and only their product matters.

The smallest progression that gets there:

1. A capacitor stores charge. Closing the switch fills it.
2. It fills fast at first, then slower and slower.
3. You can change how fast: R and C both matter.
4. Doubling R doubles the time. Doubling C doubles the time.
5. Double one and halve the other: nothing changes. So only R × C matters.
6. That product is the time constant, τ = RC. After one τ it's about 63 % full.

Discharging, current, energy, square waves, filters, measurement technique and non-ideal parts are all real RC ideas. None of them is needed for this one, so they belong to later lessons.

## A. Student walkthrough of the old version

**First 5 seconds.** The header offers Guided / Free lab and a Notebook with a "0" badge. Below that sit a schematic with switch positions A/B and a "CH1 scope" probe, a column of live numbers (V_C, current, charged %), and a black oscilloscope screen reading "RUN · READY". Then comes a toolbar: RUN, STOP, SINGLE, TIME − +, CH1 − +, CH2 − +, AUTOSET, REF. Under it are four trace chips, a switch selector, Reset capacitor, a playback menu, three sliders with ÷2/×2, six stage chips and an eight-word learning-loop strip. That's 38 controls and 9 live numbers for a step whose whole job is "flip the switch and watch". The page is plainly about RC circuits, but what to do and where to look is not obvious.

**First interaction.** The most tempting things to click are RUN (it's green) and the stage chips, and neither is the right move. The right action (A · Charge) is one of two look-alike options, below the fold on a phone.

**During the experiment.** Two traces animate at once (voltage, and current on its own axis with its own scale), the resistor glows, dots stream round the circuit, and four numbers tick. The phenomenon, the curve bending over, competes with everything else. "CAP 1 V/div" and "200 µA/div" mean nothing to a beginner.

**After the experiment.** The question that follows ("What did the current do?") is about the *second* trace, the one a beginner was told least about. Explanations are good but arrive among stage chips and loop labels that describe the pedagogy, not the physics.

**Friction points, in order of damage:** scope vocabulary before any physics; no single place to look; the right first action looks like one choice among many; two quantities plotted at once; on phones, the button being described is off-screen.

## B. Cognitive-load audit

| Source of load | Why it hurts a beginner |
| --- | --- |
| Oscilloscope toolbar (run/stop/single, time/div, volt/div, autoset, ref) | An instrument to learn before the phenomenon. Pure UI cost. |
| Current trace, second axis and second scale | Two things to read at once; current isn't the idea of this lesson. |
| A/B switch selector and "Reset capacitor" | Two concepts (discharge, initial state) for what should be one action. |
| Playback speed | A choice with no learning value. Real time is the most honest option. |
| Battery voltage, probe selector, square wave, V₀, ESR, leakage | Real physics, but not this lesson. |
| Readout column (V_C, I, % charged, τ, energy) | Numbers competing with the curve. |
| Stage chips, loop strip, "Step 3 of 19" | Describes the course structure rather than helping the student. |
| Guided / Free lab toggle, notebook badge | Extra modes and a counter to track. |
| Dark instrument screen, per-division labels | Looks like test equipment, not like a graph from class. |

## C. Keep / simplify / remove

**Keep** (essential to the one idea)
- The schematic: battery, switch, R, C, with charge building up on the plates.
- One graph of capacitor voltage against time.
- R and C, each with ×2 / ÷2 (doubling is the whole experiment).
- Predict-then-test, lightly.
- The previous curve drawn faintly for comparison: this is what makes cause and effect visible.
- WHY? explanations, opening at the "Simply" depth.
- The notes of what the student discovered.

**Simplify**
- *Switch A/B + Reset capacitor* → one **Charge** button. It always starts from empty, so every try is a fair comparison.
- *Oscilloscope screen* → a plain graph with axes in seconds and volts, fixed at 0–6 s and 0–6 V, playing in real time.
- *Measurements table and cursors* → one marker on the curve: "90 % full · 2.30 s" (later "63 % full at 1τ").
- *Readout column* → one number above the graph: the capacitor voltage.
- *Legend* → says what differed: "This charge R 20 kΩ · C 100 µF / Last charge R 10 kΩ · C 100 µF".
- *Prediction panel* → three plain options, "Make prediction", then "You predicted correctly" or "Not quite. Let's see why."
- *Stage chips + loop strip + step count* → a row of progress dots.
- *Notebook* → "My notes", no badge.
- *Phone layout* → Charge is pinned to the bottom of the screen, so the action is always under the student's thumb.
- *Controls* appear only when the step needs them: none in step 1, R and C in step 2, only R when testing R, only C when testing C.

**Remove from lesson 1 / defer**

| Removed | Why | Still available | Future lesson |
| --- | --- | --- | --- |
| Run / Stop / Single | Instrument skill, not physics | Bench | Measuring τ like an engineer |
| Time/div, volt/div, CH2 scale, Autoset | Scaling is the lesson's job, not the student's | Bench | Measuring τ like an engineer |
| Ref button | The lesson places reference curves itself | Bench (and automatic in the lesson) | Measuring τ |
| Cursors, measurement table | Replaced by one marker | Bench | Measuring τ like an engineer |
| Current trace (and IN, V_R traces) | Second quantity, second axis | Bench | Why the current fades away |
| Discharge (switch position B) | A second behaviour | Bench | Charging and discharging |
| Playback speed | No learning value; real time is honest | Bench | – |
| Battery voltage slider | Timing doesn't depend on V; a different discovery | Bench | Charging and discharging |
| Square wave, period | Repeated charge/discharge, filtering | Bench | RC circuits as filters |
| Initial capacitor voltage | Needs discharge first | Bench | Charging and discharging |
| Source R, ESR, leakage, probe loading | Non-ideal behaviour | Bench (mysteries) | Real, imperfect parts |
| Energy readout | Separate idea | Bench | Real, imperfect parts |
| Resistor heat glow, probe glyph, A/B labels | Decoration unrelated to the idea | Bench schematic | – |
| Guided / Free lab toggle | Two modes to understand | Bench | – |
| Stage chips, loop strip | Course structure, not content | Bench | – |

Step 1 went from **38 controls and 9 live numbers to 4 controls** (Charge, My notes, Back, Skip) **and 1 number**. Even the busiest step has 10 controls, and 6 of them are the two R/C sliders with their ÷2/×2 buttons. That is well past the 30 % target.

## D. Revised learning flow

| # | Question on screen | What the student does | What they discover |
| --- | --- | --- | --- |
| 1 | What happens when the switch closes? | Press Charge, watch. "How did it fill up?" | Fast at first, then slower. |
| 2 | Can you make it charge faster? | R and C appear. Experiment freely. | Smaller R or smaller C → faster. |
| 3 | What if R is twice as big? | Predict, then ×2 on R (only R is shown). | Twice as long. |
| 4 | What if C is twice as big? | Predict, then ×2 on C (only C is shown). | Also twice as long. |
| 5 | What do R and C have in common? | Predict "double R, halve C", try it. | Identical curve → only R × C matters → **τ = RC** is named here. |
| 6 | What does one τ look like? | Predict how full at 1τ, charge. | About 63 %; about 5τ is full. |
| 7 | Challenge: match the curve | Choose R and C to hit a dashed target. | Using τ to design. |
| 8 | What you discovered | Their own findings, then the path ahead. | – |

The equation first appears in step 5, as the answer to a question the student has just been asked.

### The first 60 seconds

- **0–5 s:** title "How fast does a capacitor charge?"; one question; a simple circuit with an open switch; an empty graph.
- **5–15 s:** "Press Charge and watch the graph." The Charge button is the only button on the experiment.
- **15–25 s:** the switch closes, charge builds on the plates and the curve rises, then bends over, in real time.
- **25–35 s:** "How did it fill up?" Three plain answers.
- **35–60 s:** R and C appear with one goal: charge it twice as fast. They change something, press Charge, and see the new curve beside the faint old one, with a legend saying what changed.

## Final self-audit

- **Know what to do within 5 seconds without prior knowledge?** Yes: one question, one button.
- **Start experimenting without reading instructions?** Yes. The Charge button, or the switch in the circuit, is the only thing to press.
- **A single obvious thing to look at?** The curve. Nothing else on the graph moves.
- **Cause and effect clear?** Yes. One control changes at a time in steps 3–4, the old curve stays visible, and the legend names the difference.
- **Asked to predict?** Yes, in four steps, before the controls unlock.
- **Discover before being told?** Yes. τ is named only after the student sees that doubling R while halving C changes nothing.
- **Any controls only an engineer would care about?** None in lesson 1; they're on the bench.
- **Usable by an 11th-grade student?** That's the design target. It hasn't been tested with real students yet, and that is the next step.
