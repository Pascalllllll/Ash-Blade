// Grom, the Tank: a knight in dark plate with gold trim, a glowing visor, a red cape and a giant
// hammer on his shoulder. The pixels are data/grom.js; this file animates them: the cape ripples on
// both sides, the visor glows and flickers, a glint runs along the gold trim, he breathes, and embers
// drift up around him.
(function () {
  'use strict';
  const { clamp, hsv } = Pixel;
  const red = (c) => { const [h, s, v] = hsv(c); return (h < 16 || h > 340) && s > 0.5 && v > 0.18; };
  const visor = (c, x, y) => { const [h, s, v] = hsv(c); return x > 118 && x < 182 && y > 92 && y < 140 && h > 8 && h < 50 && s > 0.55 && v > 0.75; };
  const gold = (c) => { const [h, s, v] = hsv(c); return h > 28 && h < 52 && s > 0.35 && v > 0.62; };
  // the cape: on his left it hangs below the arm, on his right it sweeps out behind him
  const capeAmp = (x, y) => (x < 112 && y > 188 ? clamp((112 - x) / 90) * 3 : x > 196 && y > 125 ? clamp((x - 196) / 50) * 2.6 : 0);
  Pixel.models.grom = Pixel.animated({
    name: 'Grom', data: 'grom',
    cloth: [{ test: (c, x, y) => red(c) && capeAmp(x, y) > 0, amp: capeAmp, freq: 0.06 }],
    shimmer: [
      { test: visor, size: 1, speed: 3, kx: 0.2, ky: 0 },
      { test: gold, size: 1, speed: 1, kx: 0.05, ky: 0.04 },
    ],
    breathe: (c, x, y) => y < 230 && x > 60,
    particles: [{ kind: 'rise', n: 10, color: [255, 120, 40], core: [255, 210, 120], glow: true, area: [0, 120, 256, 384], seed: 21 }],
  });
})();
