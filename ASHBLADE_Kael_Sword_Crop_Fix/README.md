# ASHBLADE — Kael's cropped sword: actual source-data fix

The game imports `src/kael-art.js` through `src/sprites.js`. The original source data placed the blade's tip below the 64-pixel frame; therefore the runtime rendered a truncated silver stub even though the sprite renderer was working properly.

## Installation

1. Back up the existing `src/kael-art.js` in your ASHBLADE repository.
2. Copy the enclosed **`src/kael-art.js`** into your repository's `src/` folder, overwriting only that file.
3. Reload the game with **Ctrl+Shift+R** to invalidate the cached `?v=165` JavaScript module. If the deployed version stays cached, increment the version query for Kael's module import in `src/sprites.js` and redeploy.
4. Test Kael at idle, walking, running, dashing, attacking, and while evolved.

No changes to `src/gfx.js`, `src/world.js` or gameplay combat code are needed.

## What changed

- 43 animation frames have been edited at the pixel-data level, using the existing Kael weapon-panel sword design.
- Corrected the rest/transition sword angle so its full tip fits inside the frame (rather than crossing below y=63).
- Kept Kael's face, costume, outline style, front-facing art, animation sequence, and the game's existing color/evolved palettes.
- Preserved the Attack 1/2/3 primary swing frames and the hand-only lightning Skill 2.
- Continued to bake the weapon into the sprite frame, avoiding accidentally drawing a second sword during combat.
- All pixel edges remain nearest-neighbor; empty sprite pixels stay transparent.

### Actual project source dimensions

The attached source in your repo was `w: 74, h: 64, k: 3` (not 64×64 as the earlier poster had stated). The fix **preserves 74×64** to avoid cutting off existing sword swings or changing character sizes. This is not a resampling operation.

## Validation

- `node --experimental-default-type=module validate_kael.mjs` (run from the extracted patch folder) checks RLE decoding and complete silver blade inside Idle, Walk and Run.
- `before-after-preview.png` shows the rendered difference.
- `kael-fixed-transparent-atlas.png` is a pixel-perfect, label-free visual extraction of the edited source frames, using a transparent RGBA background. It is 8 columns × 12 rows of **74×64** cells, so please do not treat it as a 64×64 atlas.

The checked-in `src/kael-art.js` is the authoritative game asset; the PNG is only provided for inspection.
