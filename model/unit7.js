// Unit-7, the Robot. The pixels are data/unit7.js; this file animates them: the cannon, core and energy
// rings pulse, the red cross on its screen and the antenna lights flicker, and sparks fly off the
// cannon's mouth.
(function () {
  'use strict';
  const cyan = (c) => { const [h, s, v] = Pixel.hsv(c); return h > 172 && h < 222 && s > 0.4 && v > 0.55; };
  const red = (c) => { const [h, s, v] = Pixel.hsv(c); return (h < 15 || h > 345) && s > 0.5 && v > 0.5; };
  Pixel.models.unit7 = Pixel.animated({
    name: 'Unit-7', data: 'unit7',
    shimmer: [
      { test: cyan, size: 1.5, speed: 3, kx: 0.1, ky: 0.04 },
      { test: red, size: 1, speed: 4, kx: 0, ky: 0.2 },
    ],
    particles: [
      { kind: 'spark', n: 12, from: [50, 84], color: [98, 220, 255], core: [230, 255, 255], front: true, seed: 5 },
      { kind: 'rise', n: 8, square: true, color: [98, 220, 255], area: [0, 40, 256, 384], seed: 9 },
    ],
  });
})();
