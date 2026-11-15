// Rin, the Samurai, standing on her broken pillar. The pixels are data/rin.js; this file animates them:
// her torn red jacket ripples in the wind, more toward its free edge; her upper body rises and falls as
// she breathes; she blinks once per loop; cherry petals fall past her, some behind and some in front.
(function () {
  'use strict';
  const { clamp, inPoly, hsv, isSkin } = Pixel;
  // the jacket's area: left of her body, plus the part that shows between her legs
  const JACKET = [[0, 85], [128, 85], [112, 118], [100, 128], [96, 205], [108, 214], [140, 222], [206, 212], [206, 305], [0, 305]];
  const red = ([r, g, b]) => r >= 60 && r > g * 1.9 && r > b * 1.15;
  const hair = (c) => { const [h, s, v] = hsv(c); return s > 0.4 && v > 0.45 && ((h > 295 && h < 350) || (h > 165 && h < 236)); };
  const PETAL = [[255, 156, 200], [255, 196, 222], [232, 106, 168]];
  Pixel.models.rin = Pixel.animated({
    name: 'Rin', data: 'rin',
    cloth: [{
      test: (c, x, y) => red(c) && inPoly(JACKET, x, y),
      amp: (x, y) => (inPoly(JACKET, x, y) ? Math.max(clamp((112 - x) / 100), clamp((y - 215) / 90) * 0.6) * 3.6 : 0),
    }],
    breathe: (c, x, y) => y < 165 && x >= 92,
    blink: { at: [0.62, 0.7], eyes: [[133, 63, 152, 78], [166, 68, 180, 83]], skinBox: [130, 60, 185, 92], test: (c) => !hair(c) && !isSkin(c), line: 3, lash: [26, 10, 46] },
    particles: [
      { kind: 'petal', n: 9, colors: PETAL, seed: 5 },
      { kind: 'petal', n: 5, colors: PETAL, front: true, seed: 15 },
    ],
  });
})();
