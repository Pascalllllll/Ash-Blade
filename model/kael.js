// Kael, the Blade, with his burning scarf and glowing katana. The pixels are data/kael.js; this file
// animates them: the burning scarf ripples while its flames rise and flicker through the fire colors,
// the blade's glow pulses, he breathes and blinks, and embers drift up around him.
(function () {
  'use strict';
  const { clamp, inPoly, hsv, segDist } = Pixel;
  // his body: everything here stays still, even the orange parts (scarf at the neck, sash)
  const BODY = [[118, 30], [214, 30], [214, 332], [118, 332]];
  const BLADE = [[130, 196], [10, 328]];
  const warm = (c) => { const [h, s, v] = hsv(c); return (h < 52 || h > 340) && s > 0.5 && v > 0.28; };
  // only clean, saturated fire colors flicker: stepping onto muddy browns would dull the flames
  const fiery = (c) => { const [h, s, v] = hsv(c); return (h < 42 || h > 345) && s > 0.62 && v > 0.3; };
  const onBlade = (x, y) => segDist(x, y, ...BLADE) < 6.5;
  const fire = (c, x, y) => warm(c) && !inPoly(BODY, x, y) && !onBlade(x, y);
  // the fire moves less toward his body, so moving flames never tear away from the still cloth;
  // the loose wisps on his right only flicker a little
  const reach = (x, y) => (inPoly(BODY, x, y) ? 0 : x > 214 ? 0.35 : clamp((118 - x) / 50));
  Pixel.models.kael = Pixel.animated({
    name: 'Kael', data: 'kael',
    cloth: [{ test: fire, amp: (x, y) => reach(x, y) * 3.4, freq: 0.08, rise: 0.4, lift: (x, y) => reach(x, y) * 1.4 }],
    shimmer: [
      { test: (c, x, y) => fire(c, x, y) && fiery(c), size: 1, speed: 2, kx: 0.09, ky: -0.16 },
      { test: (c, x, y) => warm(c) && onBlade(x, y), size: 1.2, speed: 2, kx: 0, ky: 0 },
    ],
    breathe: (c, x, y) => y < 196 && inPoly(BODY, x, y),
    blink: { at: [0.4, 0.48], eyes: [[167, 68, 179, 74], [191, 75, 202, 79]], skinBox: [160, 64, 206, 82], line: 2,
      test: (c) => { const [h, s, v] = hsv(c); return v < 0.3 || (h > 240 && h < 320 && s > 0.25 && v < 0.75) || (s < 0.15 && v > 0.8); } },
    particles: [
      { kind: 'rise', n: 14, color: [255, 110, 30], core: [255, 214, 110], glow: true, seed: 9 },
      { kind: 'rise', n: 8, color: [255, 110, 30], core: [255, 214, 110], glow: true, front: true, seed: 19 },
    ],
    // a warm haze along the blade when it flares
    extra(f, img, t, ph) { if (Math.sin(ph * 2) > 0.4) for (let k = 0; k <= 1; k += 0.125) f.glow(130 - k * 120, 196 + k * 132, 9, [255, 120, 40], 0.18); },
  });
})();
