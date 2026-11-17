# ASHBLADE Option A — Unified Front-Facing Sprite Animation Patch

This patch is a **working first-pass reconstruction**, produced from the actual code and encoded reference sprites supplied by the owner. It is NOT a manually finished, pixel-perfect redrawing of every animation.

## Changes

- **8 heroes**, front-facing chibi gameplay rendering (`set.frontFacing` disables horizontal sprite mirroring while aim/hitbox direction still works).
- All rendered frames share a **128 x 96 transparent RGBA source canvas** and bottom-center pivot **(64, 95)**, drawn at pixel density 3 in the existing engine. This deliberately replaces the incompatible nominal 64 x 64 source standard: original artist frames include content wider than 64 and were already clipped when forced smaller.
- Hero **visual height ~54 source px** for seven characters; **Grom ~60 px**.
- Original source sprites are preserved as fallback while assets load. Sprite animation data and layout are explicit, not discovered with computer vision at runtime.
- Per-hero sequences (base and evolved): entrance 8, idle 8, walk 8, run 8, attack1 8, attack2 8, attack3 8, skill1/Q 8, skill2/E 8, ultimate/R 10, dash 6, hit 4, death 8. **100 frames/skin, 2 skins/hero = 1600 frame cells**. Not all 1600 source poses are independently hand drawn: some are derived variants of supplied poses.
- Entrance sprites integrated with each hero's pre-existing unique opening scene. Q, E and R trigger their own sprite action sequences; for long-lived ultimates the central frames loop. Three authored cinematic R moves (Kael, Rin and The Dev) display the new ultimate art.
- Deaths preserve the eight distinct original death scenes; extra pixel fragments reinforce impact at the original landing cue. Death animations have eight pose frames.
- Normal gameplay no longer includes `jump`. The game uses `dash`, **not dodge roll**.
- Uses `Image.onload` so a missing PNG falls back to the original encoded art and prints a console error. A small delay before all atlases load is expected on first visit.

## Install on Debian / Linux (Fish shell compatible)

Download the ZIP and from your **ASHBLADE repository root** run:

```bash
unzip -o ~/Downloads/ASHBLADE_FrontFacing_Animations_v1.zip
bash ASHBLADE_FrontFacing_Animations_v1/install.sh
```

The installer first saves the original changed files into `.ashblade-backups/front-facing-<timestamp>/` and copies only the modified files. It does not edit character stats, hitboxes, saves, or combat mechanics.

View the preview at `http://localhost:8000/preview-animations.html` after serving the project root:

```bash
python3 -m http.server 8000
```

For the integrated game, hard-refresh after installation (`Ctrl+Shift+R`) or clear the browser site cache.

## Important limitations / art-direction review

1. This patch can **prevent new clipping at atlas boundaries**, but it cannot infer authentic pixels that were already missing or distorted in the original hand-extracted artwork. Retouch bad source pixels in `src/*-art.js` or provide an accurate source sprite for a professional final result.
2. All frames use the original character art as the source. Some supplied motion poses have a mild three-quarter stance; the code does not claim to artistically redraw those into perfect front views. It **preserves the facing of source pixels** (no automatic mirroring) and provides front-oriented hero framing.
3. Entrances, third attacks, Q/E distinctions and ultimate frames are **programmatically posed from existing art** with individual small, crisp pixel effects; the existing game's separately rendered large effects (laser, mech, portal, turret, storm, etc.) remain authoritative.
4. The new `128x96` frames mean the visual body still renders ~18 game units high (not giant); the larger transparent bounds merely give hair, weapon, scarf, wings and effects room.
5. Static JS syntax checks and all 16 PNGs' dimensions/alpha/frame positions passed. **Full interactive gameplay browser QA did not complete in this environment**, so verify frame transitions, cinematic overlays and imports locally before merging into `main`.

## Sprite metadata

`art/sprites/manifest.json` gives hero, skin files, source frame dimensions, 13 action rows, counts, per-frame durations and pivot. Each image is **1280 x 1248 px** (10 columns x 13 rows, unused cells fully transparent).

## Restore

Look in `.ashblade-backups/` after installing, and copy the previous versions of the modified files back to the project root, or use Git to revert only the listed files. Do not delete your original project files before you verify gameplay.
