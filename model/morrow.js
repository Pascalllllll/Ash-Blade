// Morrow, the Wizard. The pixels are data/morrow.js; this file animates them: he floats up and down,
// his magic swirls and orbs shimmer, the hem of his robe ripples, and stars twinkle around him.
(function () {
  'use strict';
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const magic = (c) => { const [h, s, v] = Pixel.hsv(c); return h > 188 && h < 300 && s > 0.45 && v > 0.62; };
  const robe = (c) => { const [h, s, v] = Pixel.hsv(c); return h > 240 && h < 310 && s > 0.25 && v < 0.62; };
  Pixel.models.morrow = Pixel.animated({
    name: 'Morrow', data: 'morrow',
    float: 2,
    shimmer: [{ test: magic, size: 1.5, speed: 2, kx: 0.07, ky: 0.09 }],
    cloth: [{ test: (c, x, y) => robe(c) && y > 285, amp: (x, y) => clamp((y - 285) / 80) * 2, freq: 0.09 }],
    particles: [
      { kind: 'twinkle', n: 14, color: [196, 160, 255], seed: 2 },
      { kind: 'rise', n: 8, color: [170, 120, 255], core: [230, 210, 255], glow: true, front: true, seed: 12 },
    ],
  });
})();
