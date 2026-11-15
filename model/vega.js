// Vega Hale, the Gunner. The pixels are data/vega.js; this file animates them: her long coat tails and
// red scarf ripple in the wind, smoke curls up out of the revolver's barrel, and she breathes.
(function () {
  'use strict';
  const H = (c) => Pixel.hsv(c), clamp = (v) => Math.max(0, Math.min(1, v));
  const red = (c) => { const [h, s, v] = H(c); return (h < 15 || h > 340) && s > 0.5 && v > 0.2; };
  const brown = (c) => { const [h, s, v] = H(c); return h >= 12 && h < 48 && s > 0.3 && v > 0.12; };
  const COAT = [[0, 195], [118, 195], [110, 250], [96, 300], [112, 375], [0, 375]];
  Pixel.models.vega = Pixel.animated({
    name: 'Vega', data: 'vega',
    cloth: [
      { test: (c, x, y) => red(c) && x < 120 && y > 95 && y < 215, amp: (x, y) => (y > 95 && y < 215 ? clamp((115 - x) / 100) * 3.2 : 0) },
      { test: (c, x, y) => brown(c) && Pixel.inPoly(COAT, x, y), amp: (x, y) => (Pixel.inPoly(COAT, x, y) ? clamp((112 - x) / 100) * 2.4 + clamp((y - 250) / 120) * 1.2 : 0), freq: 0.05 },
      { test: (c, x, y) => brown(c) && x > 205 && y > 220 && y < 345, amp: (x, y) => (y > 220 && y < 345 ? clamp((x - 205) / 40) * 1.8 : 0), freq: 0.05 },
    ],
    breathe: (c, x, y) => y < 200 && x >= 60,
    particles: [{ kind: 'smoke', n: 9, from: [62, 26], color: [226, 214, 194], front: true, seed: 4 }],
  });
})();
