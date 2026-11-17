# Kael Entrance V2 — ASHBLADE VS Code integration

Installs the **existing approved 24-frame entrance artwork**, **not an unrelated visual redesign**. Kael's introductory cinematic uses this new sprite sequence; the ordinary 13-row character atlas and the other seven entrances remain unchanged.

## Install into your CURRENT VS Code ASHBLADE repository

1. Download `ASHBLADE_Kael_Entrance_V2_Game_Patch.zip` into Downloads.
2. Open a terminal in the repository root (the one with `src/chars.js`).
3. Run:

```bash
unzip -o ~/Downloads/ASHBLADE_Kael_Entrance_V2_Game_Patch.zip
bash ASHBLADE_Kael_Entrance_V2_Game_Patch/install.sh
python3 ASHBLADE_Kael_Entrance_V2_Game_Patch/tools/validate.py
python3 -m http.server 8000
```

4. Open `http://localhost:8000/`, hard refresh with Ctrl+Shift+R, and **start a new run with Kael** (rather than continue an existing save).
5. Look in browser DevTools console for `[ASHBLADE] Kael Entrance V2 loaded: 24 frames`.

This patch is additive: edits `src/chars.js`, cache-busts one URL in `index.html`, creates `src/kael-entrance-v2.js`, and adds `art/sprites/entrance/kael-v2-24.png`. Other skills and sprites are untouched.

Duration = 24 × 70ms = **1.68 seconds**. The existing arrival shockwave and audiovisual land impact remain, but the redundant full-body falling motion and duplicate giant slash arc are suppressed while the new artwork is active. If PNG loading fails, the existing entrance drawings are used rather than showing a blank hero. This does not change the game mechanics.

The V2 assets feature a visually stylized smoke-to-landing animation. Some late poses are very similar; the output is a working sequence, not 24 independent finely animated poses.

## Rollback

From the root of the repository:

```bash
python3 ASHBLADE_Kael_Entrance_V2_Game_Patch/rollback.py
```

The installer saves the original files under `.ashblade-backups/kael-entrance-v2-*`.

## Compatibility

Tested against the known V6 complete game and V4/V5 source layouts. If your current VS Code source has diverged from these layouts, the installer stops safely rather than guessing or overwriting unrelated code.
