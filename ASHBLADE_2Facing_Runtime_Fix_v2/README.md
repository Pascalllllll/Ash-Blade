# ASHBLADE — Soul Knight 2-Facing Runtime Fix v2

**Made specifically for the `ASHBLADE-CURRENT-RUNTIME.zip` uploaded on 17 November 2026.** This is a compatible installation of the previous 2-Facing Soft-Angle prototype, **not new manually painted animation artwork**.

## Root cause of the failed install

Your latest `src/world.js` has the `Hybrid 4+Mirror` `rootSet.directions` code, and `src/sprites.js` installs two competing asynchronous loaders:

1. `installFrontFacingSprites(SPR)` — Option A atlases for seven heroes; Option C directional atlases for Kael.
2. `installKaelVisuals(SPR)` — later Kael-specific directional atlas override (V3).

The previous v1 installer looked for an *older exact version* of the world-facing code, so it refused to modify the project. The result was no change after `unzip`.

## What this fixed patch does

- Removes both competing loader calls and loads a single **authoritative 2-Facing atlas set** for all eight heroes, base and evolved.
- Uses **original front-dominant chibi art** in exported, fixed-size RGBA atlas PNGs, 120 × 96 source pixels per frame. The left view is an exact mirror of the right view; no back-facing sprite.
- Keeps movement and aiming 360°, with a small hysteresis deadzone to prevent rapid left/right flicker when aiming vertically.
- Preserves your existing game mechanics and hero-specific effects from `src/chars.js`, `src/deaths.js` and `desc/moves-sprite-brief.md`. Q/E/R retain separate animation timelines already present in `src/world.js`.
- Sets equal visual heights (54 source pixels), Grom 60, centered ground point `(60,92)` in each cell. Assets verified to have no nontransparent pixels touching cell edges.
- Includes strict source compatibility checks, **all-or-nothing asset loading**, automatic backups, and rollback.

**Art quality note:** The older exported atlas contains provisional/reused poses for some actions. Installing this patch makes them load reliably, but does not create new hand-drawn frames, change weapon physics, or guarantee every animation feels polished.

## Install on Debian / Fish shell

Place the downloaded ZIP in `~/Downloads`, then from your **ASHBLADE repository root**:

```sh
unzip -o ~/Downloads/ASHBLADE_2Facing_Runtime_Fix_v2.zip
bash ASHBLADE_2Facing_Runtime_Fix_v2/install.sh
```

Expected terminal message:

```
[OK] ASHBLADE_SOFT_2FACING_V2 installed — 8 heroes / base+evolved / 2-facing soft-angle
[BACKUP] .../.ashblade-backups/soft-2facing-v2-YYYYMMDD-...
```

If your source files have changed since the upload, the installer **refuses before writing**. Do not force-copy old version files onto your code; provide the latest `src/world.js`, `src/sprites.js`, and `index.html` for an adapted patch.

Restart the server. For this static project, from its root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/` and use **Ctrl+Shift+R** to hard-refresh. Check Developer Tools > Console for:

```
[ASHBLADE] 2-Facing Soft-Angle: eight heroes and evolved skins ready
```

If this message never appears, inspect 404 errors for `art/sprites/soft-facing/*.png`. If you see `Soft-Angle atlas load failed`, the original sprites remain displayed as a fallback.

## Verify the downloadable patch

```sh
python3 ASHBLADE_2Facing_Runtime_Fix_v2/tools/validate_atlases.py
node --experimental-vm-modules ASHBLADE_2Facing_Runtime_Fix_v2/tools/test_facing.mjs
```

`validate_atlases.py` uses Pillow (`python3 -m pip install Pillow` if missing). Both scripts have passed in the patch environment. These tests are **asset/data validation**, not a substitute for interactive gameplay testing.

## Undo

Find the backup path printed by installer and run, for example:

```sh
python3 ASHBLADE_2Facing_Runtime_Fix_v2/tools/rollback.py \
  .ashblade-backups/soft-2facing-v2-YYYYMMDD-HHMMSS-SSSSSS
```

Use the **actual path**, not the example. The rollback restores original JS/HTML and removes files that did not exist before installation.

## File structure

- `src/soft-angle-atlases.js` — single lazy-decoded atlas loader and facing helper.
- `art/sprites/soft-facing/*.png` — 16 atlases (8 heroes × base/evolved).
- `art/sprites/soft-facing/atlas-metadata.json` — source sprite frame metadata and provisional pose markers.
- `install.py`, `install.sh` — checked, idempotent installer.
- `tools/rollback.py` — backup restoration.
- `tools/test_facing.mjs`, `tools/validate_atlases.py` — automated data-level tests.
- `preview/eight-hero-sprite-preview.jpg` — sample of the actual sprites used by the patch, not AI-generated mockups.

## Scope of edits

Only these existing files change: `src/sprites.js`, `src/world.js`, `index.html`. All original hero art `.js` files, combat logic in `src/chars.js`, VFX, input controls and death effects remain unchanged. The old atlas modules remain in the repository but are no longer invoked by the new `buildSprites()` path.
