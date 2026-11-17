# ASHBLADE — Kael Option D · Soul Knight 3-Facing

This is an incremental **Kael-base-only** gameplay patch for the ASHBLADE repository that was uploaded in this conversation. It preserves the approved detailed Kael visual master instead of drawing a new geometric character.

## What it actually changes

- **Center**: use the approved front/down atlas when Kael moves or aims primarily vertically, or is idle.
- **Right**: use the approved three-quarter-right atlas when motion/aim is primarily horizontal to the right.
- **Left**: mirror Right in the game (no separately authored left art).
- When still, Kael returns to Center after a brief 180ms settle instead of snapping immediately.
- A small directional threshold/hysteresis keeps diagonal movement from rapidly flickering between Center and side poses.
- Keep mouse/controller attack aim, movement physics, projectile direction, damage and knockback **fully 360-degree**. Only the **visual-facing sprite** is quantized.
- Death cutscenes, entrance and Kael's Thousand Cuts (R) renderer use the same 3-facing selection. Q/E and the attack state preserve their gameplay logic.
- Existing large combat VFX remain engine-driven (to prevent duplicated effects in the sprite sheet).
- Only base Kael is changed. Evolved Kael and all other heroes are left alone.

## Install

From the ASHBLADE project root (where `src/world.js` exists), after saving this ZIP to `~/Downloads`:

```sh
unzip -o ~/Downloads/ASHBLADE_OptionD_Kael_3Facing_v1.zip
bash ASHBLADE_OptionD_Kael_3Facing_v1/install.sh
python3 -m http.server 8000
```

Open http://localhost:8000/ and hard-refresh with Ctrl+Shift+R.

If your project did not have the previous Kael v3 integration, this installer adds the **bundled v3 prerequisite** first. Both stages back up files in `.ashblade-backups/`.

To open the self-contained art preview, use
`http://localhost:8000/ASHBLADE_OptionD_Kael_3Facing_v1/preview.html`.

## Included files

- `src/kael-facing.mjs` — tested pure facing rules, plus the state-aware selector.
- `src/kael-visual-runtime.js` — maps Kael center + right atlas into the existing rendering adapter.
- `assets/kael-center.png` and `assets/kael-right.png` — full RGBA atlases (128×96 source cells; same Kael height and ground pivot).
- `assets/kael-manifest.json` — asset layout and animation counts.
- `tools/install.py`, `install.sh` — defensive installation, backups, and compatibility with pre-v3 state.
- `tests/test-facing.mjs` — Node tests for the three visual-facing directions.
- `preview.html` and `preview/kael-option-d-three-facings.png` — inspect actual art without launching the game.
- `prerequisite_v3` — previous Kael runtime if not installed yet.

Run tests from the extracted patch folder: `node tests/test-facing.mjs`.

## Frame contract

Source cells remain **128×96 PNG RGBA** with ground pivot (64,95); the visual Kael height is approximately 54 source pixels. Left is flipped at render time. This is **not** 128×96 screen-space gameplay scale: ASHBLADE draws at sprite density SS=3.

Animation states remain: entrance, idle, walk, run, attack1–3, skill1 (Rift/Q), skill2 (Tempest/E), ultimate (Thousand Cuts/R), dash, hit, death. There is no jump.

## Limitations and truthful QA status

This patch fixes the **direction-selection architecture** but cannot by itself turn v3's algorithmically interpolated poses into hand-animated professional artwork. Some walk/run poses may still look stiff: those frames should be redrawn individually after the Center and Right keyframes are approved. This package has been tested for deterministic direction behavior, JS syntax and installation against both uploaded base files and v3 patched files. It has **not** been tested end-to-end on your computer or in a live browser gameplay session.

If the installation fails because your local project has diverged from the uploaded copy, the installer aborts on unknown patch points rather than blindly overwriting code. Send the error and updated source files.

## Rollback

The installer prints the path to `.ashblade-backups/kael-option-d-*` (and potentially `kael-master-code-*` if v3 was missing). Restore the backed-up `src/` files to their original locations, then restart the game and hard-refresh. No previously existing assets are deleted.
