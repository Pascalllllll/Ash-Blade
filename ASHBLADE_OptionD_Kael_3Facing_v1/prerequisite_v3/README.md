# ASHBLADE — Kael Visual Master Code v3

This package is a **working code integration + regenerable sprite atlas prototype** for **Kael (base skin only)**. It uses the exact three 64×64 character visual masters approved in the chat, rather than the rejected hand-coded geometric rendition. The small animation frames are programmatically composited with simple pose, foot, and localized energy accents. **They are not a pixel-for-pixel reproduction of every pose in the latest illustrated animation sheet** and have not passed hands-on gameplay review yet.

## Install in your existing ASHBLADE game

1. Download `ASHBLADE_Kael_Full_Code_v3.zip` into `~/Downloads/`.
2. Open a terminal in the ASHBLADE repository root.
3. Run:

```bash
unzip -o ~/Downloads/ASHBLADE_Kael_Full_Code_v3.zip
bash ASHBLADE_Kael_Full_Code_v3/install.sh
```

4. Restart your HTTP development server. For a standalone static checkout, run `python3 -m http.server 8000` and open `http://localhost:8000/`.
5. Check the browser console: `Kael visual master loaded: right/up/down + mirrored left` should appear.
6. Hard-refresh (`Ctrl+Shift+R`).

To **preview animation** without the game, while serving from the repository root open:

`http://localhost:8000/ASHBLADE_Kael_Full_Code_v3/preview.html`

The package ships a self-contained `preview.html` that reads from its `assets/` folder; the game reads assets from `art/sprites/kael-master/` after installation.

## Compatibility and scope

- Tested installer against the uploaded **base project**, the previous **Option A** test project, and the previous **Option C** test project. The installer uses exact matchpoints and aborts without writing files when those differ.
- Only **Kael's base skin** is replaced. Other seven heroes and their evolved skins are untouched.
- If the previous `src/animation-atlases.js` module is installed, the installer removes `BLADE` from its loader list, so it won't overwrite these new Kael assets asynchronously. All other heroes keep using that loader.
- `src/kael-visual-runtime.js` is the production adapter. It loads source PNG atlases once and decodes them into the renderer's expected `.n/.f/.w/.h/.k/.tint()` sprite format.
- Rendered artwork: Right, Up, Down; Left = mirrored Right.
- Uses the existing game engine for damage, collisions, cooldown, hitstop, slash effects, bullets, and ult cut cinematics; no large effects are double-drawn.
- New `Q / E / R` animation frame selection is wired to the existing ability use events when the base project does not already have the separate skill clocks. If Option A does, its existing clocks are retained.
- Entrance and Death use Kael's unique existing gameplay effects with new Kael pose frames.
- A few death frames intentionally become empty as Kael dissolves into ash.

## Frame contract

- **Source cell:** 128 × 96 transparent RGBA pixels, fixed for every Kael frame.
- **Visual hero height:** approximately 54 source pixels (matches the approved 64px master character).
- **Fixed ground pivot:** `(64,95)` per cell.
- **Game renderer:** built-in `SS=3`. The 128px source width is transparent padding, not a change to Kael's physical size.
- **3 atlases:** `kael-right.png`, `kael-up.png`, `kael-down.png` each 1280 × 1248 pixels.
- **100 animation frames per direction**. Left is mirrored at draw time (not stored again).

| Animation | Frames | Meaning |
|---|---:|---|
| entrance | 8 | Descends from a rift |
| idle | 8 | Ready stance |
| walk | 8 | Alternating short steps |
| run | 8 | Faster alternating step cycle |
| attack1 | 8 | Horizontal slash |
| attack2 | 8 | X-cut |
| attack3 | 8 | Thrust / rotating slash finisher |
| skill1 | 8 | Rift (Q), short dash/blink |
| skill2 | 8 | Tempest (E), barehand lightning |
| ultimate | 10 | Thousand Cuts (R) |
| dash | 6 | Standard dash, no dodge roll |
| hit | 4 | Flinch |
| death | 8 | Falling then turning to ash |

## Files

- `src/kael-visual-runtime.js`: game module to install (copied by installer).
- `assets/kael-{right,up,down}.png`: actual transparent RGBA atlases.
- `assets/kael-manifest.json`: frame rows, frame counts, fps, pivot and directional conventions.
- `sources/kael-*-master-64.png`: approved visual masters kept for future retouching.
- `tools/build_atlases.py`: source-code art builder; requires Python 3 and Pillow **only for regeneration**.
- `tools/install.py`, `install.sh`: defensive installer; **Python only**, backs up affected files.
- `tools/validate.py`: verifies dimensions, slots, transparency and boundaries (requires Pillow).
- `preview.html`: interactive frame and direction QA viewer.
- `preview/kael-actions-transparent.png`: source right atlas sample without a baked background.
- `preview/kael-animation-preview.jpg`: checkered reviewer preview (do not import into game).

## Validate / regenerate

```bash
python3 -m pip install --user pillow  # only if Pillow is not installed
python3 ASHBLADE_Kael_Full_Code_v3/tools/build_atlases.py
python3 ASHBLADE_Kael_Full_Code_v3/tools/validate.py
```

When changing the visual source, edit the `sources/` PNGs or replace specific transparent source atlas frames (128×96) while preserving frame alignment; then re-run validation and reinstall.

## Rollback

Each install creates `.ashblade-backups/kael-master-code-YYYYMMDD-HHMMSS/` in your repository. To roll back, copy the backed-up `src/` files back to the original `src/` paths and, if it was patched, restore `src/animation-atlases.js` as well. The added Kael PNG assets can remain unused in the `art/sprites/kael-master/` directory.

## QA status / limitations

The ZIP package has passed static alpha/bounds checks, JS syntax checking, and safe installation on three separate test checkouts. **No interactive end-to-end browser game QA was completed**. All animation slots are present but most non-attack motion is composed using small deterministic pixel movements on the approved keyframe; more manually authored in-between character poses are still necessary for a production-grade Soul Knight-inspired animation. The authentic larger combat effects remain handled by the game.
