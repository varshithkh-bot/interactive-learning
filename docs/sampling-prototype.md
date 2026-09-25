# "Can a camera lie?": sampling and aliasing prototype

A two-minute, single-page experiment at `sampling/index.html`. It's self-contained (no modules, no dependencies), so it also opens by double-click.

## Concepts considered

| Concept | Why not / why |
| --- | --- |
| Spoked wagon wheel under a strobe | Classic, but 8 identical spokes give a second, confusing reason for the illusion ("which spoke is which?"). |
| Sine wave with sample dots | Clear to engineers, abstract to beginners. It produces "huh, a different curve", not "that's impossible". |
| Fan lit only by a strobe | Strong effect, but reality is never shown, so there's nothing to compare the observation against. |
| **One dot on a disc: "real disc" beside "what the camera sees"** (chosen) | A single dot means only one possible explanation. Reality and observation sit side by side, one slider drives everything, and the surprise is unmistakable: left clockwise, right backwards, at the same moment. |

Two ideas were added to the chosen concept. **Slowing time down** shows the journey the camera never sees, and a **second, slower backwards spin** lands on the real dot at every flash.

## Learning hypothesis

Students will first expect "faster and faster" or "a blur". When the camera shows the disc going backwards while the real one still turns clockwise, they'll feel the contradiction. Slow motion lets them see the answer themselves: between two photos the dot goes almost all the way round, so the nearest-looking move is a small step back. The impostor spin shows that different motions can leave identical snapshots. Only then is it named aliasing, and the maths is optional.

## Journey

1. **See:** two discs and one question: "What will the camera show if you spin faster?"
2. **Predict:** three choices. The slider stays locked until they pick one.
3. **Interact:** they drag the slider and watch the camera.
4. **Discover:** at about 5 turns per second the camera drifts backwards. "Wait. Look at the camera." Then: what do you think is going on?
5. **Understand:** time slows 16× and arrows show the real journey against what the camera infers. The "other spin" appears, aliasing gets its name, they can try to freeze it, and it ends with a one-sentence summary.

## Questions to ask students afterwards

1. Before any explanation appeared, what did you think was making the camera show it backwards?
2. At which moment did it click: the slow motion, the second dot, or the text? What exactly made it click?
3. In your own words, why could the camera not tell which way the disc was spinning?
4. The camera takes 6 photos a second. At what spin speed do you think the disc would look frozen, and why?
5. Where else might something measured in snapshots give a misleading picture? Give one example of your own.
