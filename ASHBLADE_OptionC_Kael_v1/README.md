# ASHBLADE — Kael Option C / Hybrid 4+Mirror (prototype art v1)

## What this patch **actually** does

- Replaces **only Kael's** gameplay sprite art with newly constructed, pixel-authored **right / up / down** directions. **Left is mirrored right at render time.** This is not an AI visual-segmentation or CSS-cropping fix.
- Retains the existing weapon inside every Kael frame except **E / Tempest**, when Kael casts lightning barehanded. The engine is told not to draw a second sword.
- Adds 13 Kael animation sequences per source direction and skin. **600 transparent sprite cells:** 100 frames × 3 directions × 2 skins (base/evolved), on six 1280×1248 PNG atlases.
- Distinct gait frames for walk and run, same foot-anchor across normal frames. Retains Kael's actual moves from `desc/moves-sprite-brief.md`: horizontal slash, X-cut, thrust/whirlwind combo, Q Rift dash, E Tempest lightning, R Thousand Cuts, entrance and an ash-collapse death.
- Patches only the necessary runtime branches: `src/animation-atlases.js`, `src/world.js`, `src/deaths.js`, `src/chars.js`, and the cache-busting import in `src/sprites.js`. **Other seven heroes and combat mechanics are unchanged.**
- The existing ultimate cinematic and special visual effects still run from the game code; no duplicated full-size projectiles/shockwaves are painted into the Kael sprites.

## Why 128×96 rather than 64×64?

The current installed **Option A patch** already uses a common 128×96 transparent SOURCE cell (drawn by the engine with pixel density `SS=3`), and the 64×64 reconstruction was clipping Kael's hair, legs and sword. To avoid breaking the whole project this patch retains **128×96 source cells**. Kael's visible height is **about 54 source pixels**, with a grounded pivot **(64,95)**. Grom, already ~60 source pixels in Option A, stays slightly taller. We do **not** change the atlas format for other heroes here.

## Prerequisite

The **ASHBLADE FrontFacing Animations v1 (Option A) patch** must already be installed, because it supplies `src/animation-atlases.js` and separates Q/E/R/entrance frames. This Kael-only Option C patch builds on that runtime, replacing its BLADE loader and enabling directional selection without rewriting unrelated heroes.

## Install (Debian / Fish)

From the *ASHBLADE project root*:

```bash
unzip -o ~/Downloads/ASHBLADE_OptionC_Kael_v1.zip
bash ASHBLADE_OptionC_Kael_v1/install.sh
python3 -m http.server 8000
```

Open `http://localhost:8000/preview-option-c.html` and verify directions, attacks and weapon. Restart your game and hard-refresh (`Ctrl+Shift+R`).

**Installer protections:** validates known integration points before editing, backs up every modified code file into `.ashblade-backups/kael-option-c-<timestamp>/`, and refuses to patch unknown source versions instead of damaging them. It copies only Kael's directional art, not other heroes.

## Revert

1. Find the latest folder under `.ashblade-backups/kael-option-c-*`.
2. Restore its `src/` files to your project's `src/` directory. Your previously installed Option A sprite assets continue to work.
3. Hard-refresh your browser.

Option C art files can remain on disk unused; you can delete `art/sprites/blade-*-{right,up,down}.png` if you want.

## Action and direction contract

| Gameplay | Directional sprite |
| --- | --- |
| Movement predominantly right | `right` |
| Movement predominantly left | `right` with `flipX` |
| Movement predominantly upward | `up` — back of Kael |
| Movement predominantly downward | `down` — front of Kael |
| Attack, Q, E, R | Aim-based visual direction unless moving-only |
| Entrance | `down` (front-facing dramatic arrival) |
| Death | Last aim-derived direction, retaining the unique existing ash effects |

Action rows in atlas: `entrance` (8), `idle` (8), `walk` (8), `run` (8), `attack1` (8), `attack2` (8), `attack3` (8), `skill1` (8), `skill2` (8), `ultimate` (10), `dash` (6), `hit` (4), `death` (8). **No jump or dodge roll.**

## Art honesty / quality level

These are clean **programmatically authored pixel-art drawings** built from hand-specified shape layers and action-angle values, *not manually polished individually drawn production frames* and *not pixel-perfect copies of the user's existing Kael sheet*. Distinct up/back and down/front artwork is genuinely painted, and left is a runtime mirror, but the silhouettes, cloth physics and attack anticipation may still warrant professional pixel-art polishing. The motion preview and transparent exported assets are suitable for a first gameplay test. A full interactive browser QA on the owner's running game was not performed.

## Validation

`python3 ASHBLADE_OptionC_Kael_v1/tools/validate_atlases.py`

The PNG validator checks dimensions, transparent unused cells, nonempty action frames, identical bottom anchor, and clipping at the top/left/right edges. It is independent of your runtime.
