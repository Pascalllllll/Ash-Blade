// The Dev, in his futuristic wheelchair. The pixels are data/dev.js; this file animates them: the neon
// on his chair, rings and holo screens shimmers, a scanline sweeps each screen, pixel bits drift up
// around him, and he breathes.
(function () {
  'use strict';
  const neon = (c) => { const [h, s, v] = Pixel.hsv(c); return h > 172 && h < 238 && s > 0.45 && v > 0.55; };
  const SCREENS = [[172, 62, 240, 128], [28, 105, 110, 165]];
  Pixel.models.dev = Pixel.animated({
    name: 'The Dev', data: 'dev',
    shimmer: [{ test: neon, size: 1, speed: 2, kx: 0.09, ky: 0.05 }],
    breathe: (c, x, y) => x > 100 && x < 200 && y > 40 && y < 190 && !neon(c),
    particles: [{ kind: 'rise', n: 16, square: true, color: [96, 204, 255], area: [10, 0, 250, 384], seed: 8 }],
    extra(f, img, t, ph, bob) {
      // a bright scanline sweeping down each holo screen
      const s = img.s;
      for (const [x0, y0, x1, y1] of SCREENS) {
        const gy = y0 + ((t * 2) % 1) * (y1 - y0);
        for (let y = Math.round(gy * s); y < Math.round((gy + 1) * s); y++)
          for (let x = Math.round(x0 * s); x <= x1 * s; x++) { const v = img.idx[y * img.w + x]; if (v && neon(img.pal[v])) f.rgb(x, y + bob, [220, 250, 255], 0.55); }
      }
    },
  });
})();
