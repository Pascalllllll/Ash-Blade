# ASHBLADE — v4 Manual Sprite Polish

This update is tailored to the ASHBLADE codebase and fixes inconsistent sprite size during attacks. It keeps **Soul Knight-inspired 2-facing soft-angle art**, **360-degree movement/aim**, hero abilities, and the user's original visual identity. All eight heroes receive scale/pivot stabilization for **both Base and Evolved skins**. Grom and Rin receive a targeted 8-frame leg-animation rebuild.

## Files

- `src/soft-angle-atlases.js`: the only async player sprite loader, version 4.
- `art/sprites/soft-facing/*-right.png`: 16 transparent PNG atlases (8 base + 8 evolved).
- `art/sprites/soft-facing/v4-frame-audit.json`: per-frame before/after body-height report.
- `tools/polish_sprites.py`: source for the deterministic, pixel-level art correction pass (requires the v3 source atlas directory as `--input`).
- `tools/validate_atlases.py`: comprehensive atlas structure + alpha + body height and two-foot-presence checks.
- `preview.html`: preview and play 13 animations, base/evolved, right/left mirror.
- `install.py`, `install.sh`, `rollback.py`: safe project patching, timestamped backups and restore.

## Changes

**Scale and anchors:** Before v4, some attacks were significantly shorter than the hero's idle sprite. The art pass normalizes visible character dimensions to approximately **54 source px** for seven heroes and **60 px** for Grom. The full cell stays **120 × 96**. Every non-death frame remains on the same baseline. Crouched dash frames are approximately one pixel shorter. Death collapse and disappearance intentionally break the height rule.

**Rin:** Rebuilt left and right mini-boots/socks in alternating walk and run poses. She retains her teal/pink hair, purple eyes, white-red costume, short skirt, and katana.

**Grom:** Rebuilt two independent boot tracks with distinct foot lift, stride and touchdown in 8 walk and 8 run frames. The helmet, gold-trimmed blue-grey armor, crimson cape and hammer identity remain unchanged. Grom stays slightly larger than the other heroes.

**Unit-7 & The Dev:** Locomotion polish uses tread and wheelchair accents, **not invented legs**. Morrow retains float-like motion rather than walking legs. Other heroes retain their existing motion cycles but now have a more stable body scale.

**Gameplay:** Attack combos, Q/E/R, entrance, dash, hit, and death remain mapped to the existing combat code and `desc/moves-sprite-brief.md`. No jump animation was added. No hitbox or damage formulas are changed.

## Installation (run in ASHBLADE repository root)

Download and place `ASHBLADE_v4_Manual_Polish.zip` in Downloads.

```bash
unzip -o ~/Downloads/ASHBLADE_v4_Manual_Polish.zip
bash ASHBLADE_v4_Manual_Polish/install.sh
```

This installer accepts the original **current runtime ZIP** supplied by the user as well as the project with v2 or v3 patches. It changes the loader import and rendering dispatch only, then replaces the atlases. It does **not** overwrite your entire project. Backups are stored under `.ashblade-backups/manual-v4-*`.

Start the game server:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` and hard refresh (`Ctrl+Shift+R`). On the browser console you should see:

```text
[ASHBLADE] 2-Facing Soft-Angle V4: eight heroes and evolved skins ready
```

For interactive frame review, open `http://localhost:8000/ASHBLADE_v4_Manual_Polish/preview.html` (the extracted patch folder must remain in the project). The preview loads assets from inside the patch folder. You can also open it using a local server started inside that folder.

## Verify assets

```bash
python3 ASHBLADE_v4_Manual_Polish/tools/validate_atlases.py
```

The validator checks all **1,600 nonempty frame cells**, including alpha transparency, canvas dimensions, clipping at boundaries, non-death body-height tolerances, and the presence of both legs in Grom/Rin movement frames.

## Rollback

```bash
python3 ASHBLADE_v4_Manual_Polish/rollback.py
```

This restores the most recent v4 backup. You can pass an explicit `.ashblade-backups/manual-v4-*` folder as the script's first argument. **Any later modifications to those files will be overwritten by rollback**, so take another backup first if you edit them.

## Limitations / art status

This is a **source-preserving, pixel-level polish pass**, not a hand-illustrated redraw of all 1,600 animation frames. Grom and Rin have specifically constructed new leg phases, while other heroes mostly receive body-scale/pivot correction and selected mechanical motion accents. It was statically validated and installer-tested, but not fully play-tested in an interactive browser. Some action-specific FX and rough animation transitions may still require artist review.
