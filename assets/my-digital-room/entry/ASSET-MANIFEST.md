# Entry sequence asset manifest

## Final assets

- `base/space-flight-background.png` — 16:9 starfield, amber planet, cyan moon, and a clear central flight corridor.
- `sprites/personal-ship.png` — alpha PNG foreground ship; verified with transparent background.

## Motion plan (build later)

Keep the intro under three seconds:

1. 0.0–0.8s — space background drifts subtly; ship enters at lower left.
2. 0.8–2.0s — ship crosses toward the right; camera scale increases along its direction.
3. 2.0–2.7s — dissolve/zoom through the bedroom window into `../bedroom/base/bedroom-master.png`.

The `ENTER ROOM` control and the audio start action are HTML/UI, not painted into these images. Start music only after the visitor presses that control.

## Source retention

- `sprites/personal-ship-source.png` is the chroma-key source retained for future refinements. Use `personal-ship.png` in the site.
