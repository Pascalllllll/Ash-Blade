# ASHBLADE — Soul Knight-inspired 2-Facing Soft-Angle (Prototype v1)

This patch switches **all 8 playable heroes** (base and evolved) to the final simplified visual direction system. It keeps their existing source pixel art and original costume identities instead of programmatically drawing generic substitute heroes.

## Visual / gameplay contract

- **Two visual facings only:** `right` (front-dominant with a very slight right bias) and `left` (exact horizontal mirror). No rear-facing image. This affects **visuals only**: movement, aiming, projectiles and melee hit detection remain 360°.
- **All heroes share the same 120 × 96 native-pixel transparent canvas** (40 × 32 logical game pixels at `SS=3`). The visual height is about **54 source pixels**, except **Grom 60**. The feet/ground-contact position is native `(60, 92)`; combat effects have margin.
- Walk and run cycle separately based on movement speed; original animation poses are retained. Skill Q, E and R get independent visual timers; gameplay mechanics and engine-drawn large VFX are unchanged.
- **Rivet keeps her goggles and wrench, Morrow his hood and beard, Rin her cyan-pink hair, Unit-7 his tank treads and cross visor, and The Dev his chair/laptop**. Evolved uses the original evolved palette.
- **No jump** animation is required for gameplay. Entrance and death effects already implemented in the game remain active.

## Install (from repository root on Linux/fish/bash)

Download `ASHBLADE_SoulKnight_2Facing_AllHeroes_v1.zip` into `~/Downloads`, then:

```sh
unzip -o ~/Downloads/ASHBLADE_SoulKnight_2Facing_AllHeroes_v1.zip
bash ASHBLADE_SoulKnight_2Facing_AllHeroes_v1/install.sh
```

`install.py` supports both the original source from the uploaded full project and the earlier Kael Option D patch. It retires the Kael-only async atlas override to prevent conflicting visuals. Unknown or already-patched source is rejected before modifications. **It never edits your source art files** (`src/*-art.js`), making rollback straightforward.

Backups are written to `.ashblade-soft-facing-backup-YYYYMMDD-HHMMSS/`. To undo:

```sh
cp .ashblade-soft-facing-backup-YYYYMMDD-HHMMSS/sprites.js src/sprites.js
cp .ashblade-soft-facing-backup-YYYYMMDD-HHMMSS/world.js src/world.js
rm src/soft-facing.js
```

Replace `YYYYMMDD-HHMMSS` with the actual name printed by the installer, then restart your local server and hard-refresh the browser. Leaving the extra atlas PNGs in `assets/soft-facing` is harmless.

## Asset export and QA

- `assets/{hero}-{base|evolved}-right.png`: 16 exported RGBA atlas sheets; visual Left is obtained via horizontal mirror.
- `atlas-metadata.json`: frame dimensions, pivot, original frame sources, animation mapping and **provisional** flag for reused poses.
- `previews/eight-heroes-two-facing.png`: all eight characters side by side, including left mirror.
- `tools/validate.py`: validates dimensions, alpha, nonempty cells, and safe margins.

### IMPORTANT: visual art status

This patch **reframes, aligns, scales and mirrors the existing authored sprites**, but it **does not magically paint new bespoke 3/4 views or distinct missing animations**. For some heroes the original sprite art lacks third attacks, separate Q/E skills and ultimate poses; the export atlas uses explicit, metadata-marked placeholder poses for those actions. The current game's character-specific cinematic entrance and death effects remain unchanged. Professional art polish will require hand-painting those missing poses; this patch is intended to provide a stable shared engine pipeline without repeating the previous geometric-sprite redesign mistakes.

### Validation scope

The exported PNGs, JS syntax and installer were checked on both original and previously Option D-patched source trees. Full interactive gameplay could not be verified in this environment; test in the actual running game before replacing your production branch.
