// Rivet, the Mechanic. The pixels are data/rivet.js; this file animates them: the jumpsuit top tied at
// her waist flaps in the wind, sparks jump off the wrench head, she breathes and blinks.
(function () {
  'use strict';
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const orange = (c) => { const [h, s, v] = Pixel.hsv(c); return h >= 8 && h < 36 && s > 0.55 && v > 0.3; };
  const FLAP = [[0, 150], [100, 150], [100, 215], [70, 300], [0, 300]];
  Pixel.models.rivet = Pixel.animated({
    name: 'Rivet', data: 'rivet',
    cloth: [{ test: (c, x, y) => orange(c) && Pixel.inPoly(FLAP, x, y), amp: (x, y) => (Pixel.inPoly(FLAP, x, y) ? clamp((100 - x) / 90) * 3 : 0) }],
    breathe: (c, x, y) => y < 175 && x >= 30,
    blink: { at: [0.55, 0.63], eyes: [[131, 62, 145, 72], [158, 67, 166, 73]], skinBox: [125, 72, 160, 92], test: (c) => { const [, s, v] = Pixel.hsv(c); return v < 0.5 || (s < 0.15 && v > 0.8); } },
    particles: [{ kind: 'spark', n: 10, from: [34, 66], color: [255, 150, 50], front: true, seed: 6 }],
  });
})();
