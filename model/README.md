# Models

Large animated pixel-art portraits of Ashblade's fighters, shown on the fighter select screen. Each portrait is a 512 x 768 pixel image with a 24-frame animation that loops at 12 frames per second.

| Fighter | Animation |
|---|---|
| Kael | His burning scarf ripples while its flames rise and flicker, the blade's glow pulses, he breathes and blinks, and embers drift up |
| Vega | Her long coat tails and red scarf ripple, smoke curls up out of the revolver's barrel, and she breathes |
| Morrow | He floats up and down, his magic swirls and orbs shimmer, the hem of his robe ripples, and stars twinkle around him |
| Rin | Her torn red jacket ripples, she breathes and blinks, and cherry petals fall past her |
| Rivet | The jumpsuit top tied at her waist flaps, sparks jump off the wrench, she breathes and blinks |
| Grom | His red cape ripples on both sides, the visor glows and flickers, a glint runs along the gold trim, he breathes, and embers drift up |
| Unit-7 | The cannon, core and energy rings pulse, the red cross on its screen and the antenna lights flicker, and sparks fly off the cannon |
| The Dev | The neon on his chair, rings and holo screens shimmers, a scanline sweeps each screen, pixel bits drift up, and he breathes |

The game's fighter select screen loads these files when it first opens (`src/models.js`) and plays the selected fighter's animation on the left, drawn on a second canvas at the display's full resolution so every pixel of the portrait shows.

## Viewing

Open `index.html` in a browser. It needs no server. Pause and zoom are in the header.

## Files

- `data/<name>.js` holds the pixels: a palette of up to 219 colors and a run-length string, one character per color followed by how many times it repeats. The pixels were taken from each fighter's poster art, reduced to 512 x 768 (half the poster's size) and 219 colors, so the portraits look exactly like the posters. Animations place things on a 256 x 384 grid and `pixel.js` scales that to the data's real size.
- `<name>.js` is the animation: a short description handed to `Pixel.animated` in `pixel.js`. Each one marks regions of its image (the jacket, the fire, the blade, the eyes, the upper body) by color and position, then moves them every frame: cloth pixels are pulled from upwind with a wave that grows toward the free edge, fire is also pulled upward and stepped through the fire colors so it flickers, the upper body lifts one pixel on each breath, eyelids are painted over the eyes for a blink, and petals or embers are drawn as particles.
- `pixel.js` decodes the data and holds the shared helpers: region masks, rippling cloth, shimmering colors, breathing, floating, blinking, particles, and drawing to a canvas.
- `out/` holds the exports: `<name>.png` (the first frame at 2x, 1024 x 1536, transparent), `<name>-sheet.png` (all 24 frames at half size in an 8 x 3 grid, transparent), `<name>.webp` (animated, 512 x 768, transparent) and `<name>.gif` (animated, 512 x 768, on the game's dark background).
