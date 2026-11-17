# ASHBLADE Kael — Hair + Sword Source Repair v2

## Diagnosis
The source art had an abrupt flat hair crown in idle, plus dark horizontal extraction bars above some attack/dash frames. This is in the **encoded sprite pixels**, not a CSS clipping mask. Original idle hair first appeared at y=13 with an almost perfectly horizontal top; the new hair crown has genuine visible pixels above it, with sharp individual spikes.

## Contents
- `src/kael-art.js` — corrected data, directly replacing the game's Kael asset.
- `install.sh` — backs up your current file, installs the corrected data, and bumps the Kael JS cache version without changing any other hero.
- `validate.mjs` — verifies 80 frames, dimensions, alpha boundaries, sword, and hair shape.
- `preview/kael-hair-before-after.png` — side-by-side: each animation row displays BEFORE above AFTER.
- `preview/kael-hair-fixed-idle-8x.png` — enlarged, nearest-neighbor idle frame.
- `preview/kael-fixed-transparent-atlas.png` — transparent, label-free 74×64 frame atlas for inspection only.
- `build.py` — deterministic pixel-data repair script (references previous baseline in this working environment; shipped as documentation of the transformation).

## Install (from repo root)

1. Download and extract this ZIP into your ASHBLADE project directory.
2. Run `bash ASHBLADE_Kael_Hair_Fix_v2/install.sh`.
3. Restart the dev server / redeploy and hard-refresh with **Ctrl+Shift+R**.
4. Optionally validate with `node ASHBLADE_Kael_Hair_Fix_v2/validate.mjs`.

Or manually: copy `ASHBLADE_Kael_Hair_Fix_v2/src/kael-art.js` to `src/kael-art.js` and update the `?v=...` query for `./kael-art.js` in `src/sprites.js`.

## What this DOES and DOES NOT change
- Rebuilds the flattened upper hair into sharp violet pixel clusters in idle, run, and several attack frames. Removes some erroneous dark horizontal artifacts.
- **Keeps the repaired sword, face, body, lower-body pixels, weapon poses, animations, color/evolve palettes, and collision/rendering logic as-is.**
- Maintains **74×64** because that is what the uploaded game code actually consumes; switching to 64×64 without coordinated changes could cut off attack effects.
- The preview atlas is transparent; the *production asset* is the pixel data in `src/kael-art.js`.
- This is a surgical art reconstruction, not a perfect reproduction of the source illustration's missing hair strands. Check in-game at each animation scale.
