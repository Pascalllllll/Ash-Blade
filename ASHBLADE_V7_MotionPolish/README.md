# ASHBLADE V7 — Smooth Motion / Consistent Scale / Clean Edges

**Target:** your *existing* ASHBLADE VS Code repo. This is not a separate game.

## What is in V7

For **all eight heroes, base and evolved**, 6 authored animation rows in independent overlays:

| Action | Frames | In-game role |
| --- | ---: | --- |
| Idle | 16 | Breathing / scarf, goggles, orb, screen and other subtle secondary detail; blink where applicable |
| Walk | 12 | Alternating left/right feet; floating Morrow and rolling Unit-7 / The Dev have distinct treatments |
| Run | 12 | Stronger alternating strides or tracked/wheeled movement |
| Attack 1 | 12 | Opening strike/recoil/cast animation |
| Attack 2 | 12 | Secondary strike animation |
| Attack 3 | 12 | Heavy/spinning/recovery animation |

These overlays keep existing sprite heights **54 native pixels** (Grom 58), 120×96 RGBA cells, fixed pivot (60,92). The original 13-row atlases are retained as fallbacks for entrance, Q/E/R skills, dash, hit and death. Existing game mechanics, enemies, world maps, controls, upgrades and hitboxes are **unchanged**.

Kael's separately-installed **Entrance V2 24-frame** PNG is also size-corrected: last arrival body height from ~68px to ~53–54px, aligned to the same ground pivot. This adjustment is applied only if the `src/kael-entrance-v2.js` module is already in your project.

### Edge cleanup

- All newly exported sprites have genuine transparent RGBA backgrounds; transparent pixel RGB is (0,0,0,0).
- All visible pixels in the new frames have 255 alpha, with no off-canvas slash/hammer/katana pixels.
- All existing 16 fallback atlases are also sanitized for crisp pixel rendering, while preserving their content (except The Dev's old non-death scale aligned from 51 to 54px).
- The source Kael master had three opaque neutral stray pixels near the left side of the face/scarf; these are selectively removed. Silver blades, white clothes, robot faceplates, and the wizard's beard are preserved.

### Scope / artistic honesty

The motions use fixed pixel-art character masters, custom pixel-frame limb and accessory variations, 12-phase weapon trajectories and keyframe effects. They are **not** 1,216 independent hand-painted images. More painterly per-frame articulation and bespoke skill/death animations would require dedicated additional artwork. The portrait/UI files remain unchanged.

## Installation (existing VS Code project)

**Do not overwrite your entire project with the full game ZIP.** Download the dedicated patch ZIP, then run from the root of the existing ASHBLADE repo:

```bash
unzip -o ~/Downloads/ASHBLADE_V7_MotionPolish.zip
bash ASHBLADE_V7_MotionPolish/install.sh
python3 ASHBLADE_V7_MotionPolish/tools/validate_v7.py
python3 -m http.server 8000
```

The validator requires **Python standard library only**, no Pillow. The generator needs Pillow, but it is **not necessary to install or play**.

Visit `http://localhost:8000`, then `Ctrl+Shift+R`. To inspect all hero animations one frame at a time, visit `http://localhost:8000/motion-v7-preview.html`.

The console should show:

```
[ASHBLADE] Motion V7 ready: 8 heroes × base/evolved, 16 idle / 12 walk / 12 run / 12 combo frames
```

To see the adjusted Kael entrance, start a **new run as Kael**. It runs only at the beginning of a new run.

If your current VS Code repo diverged from the V4/V5/V6 import architecture, the installer stops without changing the source. In that case, share your current `src` files so the migration can target them safely.

## Revert changes

```bash
python3 ASHBLADE_V7_MotionPolish/rollback.py
```

The installer makes a complete timestamped backup of every touched file under `.ashblade-backups/motion-v7-*`. You may also pass an explicit backup folder to rollback.py.

## Asset paths

- `art/sprites/motion-v7/{hero}-{base|evolved}-motion-v7.png`: 16 columns × 6 rows, 120×96 cells.
- `art/sprites/motion-v7/kael-entrance-v7-scaled-54px.png`: 12 columns × 2 rows, 24 frames.
- `art/sprites/soft-facing/`: sanitized V6 fallback atlases (13 rows).
- `motion-v7-preview.html`: interactive preview for all six motion rows and both directions.

## Preview files

- `previews/KAEL_IDLE_V7_16FRAMES_TRANSPARENT.png` — actual isolated alpha frames.
- `previews/ASHBLADE_V7_ALL_HEROES_IDLE.gif` — eight looping idle poses.
- `previews/ASHBLADE_V7_EIGHT_HEROES_IDLE_PREVIEW.jpg` — base idle overview.
- `previews/KAEL_V7_ATTACK_COMBOS_CONTACT.jpg` — Kael attack combinations 1/2/3.
- `previews/KAEL_ENTRANCE_V7_VS_IDLE_HEIGHT.jpg` — comparison at matched scale.

**Recommended review order:** Kael new-run entrance ➝ idle ↔ attack1 transition ➝ Rin attack1/2/3 ➝ Grom walk/run ➝ Unit-7 and Dev locomotion. Use `motion-v7-preview.html` to inspect any frame.
