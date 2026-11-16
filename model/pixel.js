// Runtime for the model portraits. Each model is a 512 x 768 pixel image stored as data (a palette
// plus a run-length pixel string, in data/), and an animation written in code that moves parts of
// it every frame: cloth ripples in the wind, fire and neon flicker, the character breathes and
// blinks, and particles drift past. Animations describe positions on a 256 x 384 grid; the runtime
// scales them to the data's real size, so the data can change resolution without touching them.
// Plain script so index.html opens straight from disk. Exposes window.Pixel.
(function (root) {
  'use strict';
  const P = root.Pixel || {};
  P.models = P.models || {};
  P.data = P.data || {};
  const GRID = 256;

  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const decoded = {};
  // data -> { w, h, s (pixels per grid unit), pal: [[r, g, b]] (index 0 is transparent), idx }
  P.load = (name) => {
    if (decoded[name]) return decoded[name];
    const d = P.data[name], code = new Map([...d.alphabet].map((c, i) => [c, i]));
    const idx = new Uint8Array(d.w * d.h), s = d.pixels;
    let o = 0;
    for (let i = 0; i < s.length;) {
      const v = code.get(s[i++]);
      let n = 0;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') n = n * 10 + (s.charCodeAt(i++) - 48);
      idx.fill(v, o, o + (n || 1)); o += n || 1;
    }
    return (decoded[name] = { w: d.w, h: d.h, s: d.w / GRID, pal: [null, ...d.palette.map(hex)], idx });
  };

  // ---------- helpers ----------
  P.hsv = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
  };
  P.inPoly = (pts, x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  P.segDist = (x, y, [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  P.clamp = (v) => Math.max(0, Math.min(1, v));
  P.isSkin = (c) => { const [hu, s, v] = P.hsv(c); return (hu < 40 || hu > 345) && s < 0.32 && v > 0.78; };
  // a mask of pixels that pass test(rgb, gx, gy), with gx, gy on the 256 x 384 grid
  P.mask = (img, test) => {
    const m = new Uint8Array(img.w * img.h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x, v = img.idx[i];
      if (v && test(img.pal[v], x / img.s, y / img.s)) m[i] = 1;
    }
    return m;
  };
  // the most common color in a grid box among pixels that pass test (skin next to the eyes)
  P.pick = (img, x0, y0, x1, y1, test) => {
    const n = new Map(), s = img.s;
    for (let y = Math.round(y0 * s); y <= y1 * s; y++) for (let x = Math.round(x0 * s); x <= x1 * s; x++) { const v = img.idx[y * img.w + x]; if (v && test(img.pal[v])) n.set(v, (n.get(v) || 0) + 1); }
    let best = 0, bv = 0;
    for (const [v, c] of n) if (c > best) { best = c; bv = v; }
    return img.pal[bv];
  };
  // seeded random, so particles land in the same place every time the loop comes round
  P.rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // a frame being built. rgb/idx take image pixels; dot/glow take grid units (a dot is one grid
  // cell, so particles keep the same chunky size at any resolution)
  P.frame = (img) => {
    const out = new Uint8ClampedArray(img.w * img.h * 4), s = img.s;
    const f = {
      out,
      idx(x, y, v) { if (v) f.rgb(x, y, img.pal[v]); },
      rgb(x, y, c, a = 1) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
        const i = (y * img.w + x) * 4, A = out[i + 3] / 255, na = a + A * (1 - a);
        for (let k = 0; k < 3; k++) out[i + k] = (c[k] * a + out[i + k] * A * (1 - a)) / na;
        out[i + 3] = na * 255;
      },
      dot(gx, gy, c, a = 1) { const x0 = Math.floor(gx) * s, y0 = Math.floor(gy) * s; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) f.rgb(x0 + x, y0 + y, c, a); },
      // a soft glow, snapped to a few alpha steps with ordered dithering so it stays pixel art
      glow(gx, gy, r, c, a = 0.5) {
        for (let y = Math.floor(gy - r); y <= gy + r; y++) for (let x = Math.floor(gx - r); x <= gx + r; x++) {
          const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy) / r;
          if (d >= 1) continue;
          const v = Math.floor((1 - d) * (1 - d) * a * 4 + BAYER[(y & 3) * 4 + (x & 3)]) / 4;
          if (v > 0) f.dot(x, y, c, v);
        }
      },
    };
    return f;
  };

  // ---------- a model from a description ----------
  // Every position here is on the 256 x 384 grid.
  //   cloth:   [{ test(c, x, y), amp(x, y) grid px, freq, rise, lift(x, y) }]  regions that ripple
  //            in the wind; lift adds an upward flicker (flames)
  //   shimmer: [{ test(c, x, y), size, speed, kx, ky }]   glowing parts brighten and dim in a smooth
  //            wave that runs across them (size sets how strong, speed how many pulses per loop)
  //   breathe: test(c, x, y)   lifts by one grid px on the in-breath;   float: grid px the figure bobs
  //   blink:   { at: [t0, t1], eyes: [[x0, y0, x1, y1]], skinBox: [x0, y0, x1, y1], test(c), line }
  //   particles: [{ kind: rise | twinkle | smoke | spark | petal, n, area, color, front, from }]
  //   extra(f, img, t, ph, bob)   anything else, drawn before the front particles
  P.animated = (cfg) => ({
    name: cfg.name, data: cfg.data, frames: cfg.frames || 48, fps: cfg.fps || 24,
    prepare(img) {
      const n = img.w * img.h;
      const cloth = (cfg.cloth || []).map((c) => ({ ...c, m: P.mask(img, c.test) }));
      const shimmer = (cfg.shimmer || []).map((c) => ({ ...c, m: P.mask(img, c.test) }));
      const anyCloth = new Uint8Array(n); cloth.forEach((c) => { for (let i = 0; i < n; i++) if (c.m[i]) anyCloth[i] = 1; });
      const breathe = cfg.breathe ? P.mask(img, cfg.breathe) : new Uint8Array(n);
      const skin = cfg.blink ? P.pick(img, ...cfg.blink.skinBox, P.isSkin) : null;
      // each cloth region's per-pixel wave strength, worked out once
      for (const c of cloth) {
        c.a = new Float32Array(n);
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) c.a[y * img.w + x] = Math.max(0, c.amp(x / img.s, y / img.s));
      }
      return { cloth, shimmer, anyCloth, breathe, skin };
    },
    frame(img, st, t, f) {
      const { w, h, idx, s } = img, ph = t * Math.PI * 2;
      const bob = cfg.float ? Math.round(Math.sin(ph) * cfg.float * s) : 0;
      // the breath eases in and out over a few pixels instead of jumping a whole step
      const lift = cfg.breathe ? Math.round(s * 0.5 * (1 - Math.cos(ph))) : 0;
      // the color a source pixel shows this frame: shimmering parts brighten toward white and dim
      // smoothly, so the pixel keeps its own hue instead of jumping to another palette color
      const color = (i, gx, gy) => {
        const v = idx[i];
        if (!v) return null;
        let c = img.pal[v];
        for (const r of st.shimmer) if (r.m[i]) {
          const k = 0.22 * (r.size ?? 1) * Math.sin(ph * (r.speed ?? 2) + gx * (r.kx ?? 0.08) + gy * (r.ky ?? 0.06));
          c = k > 0 ? [c[0] + (255 - c[0]) * k * 0.8, c[1] + (255 - c[1]) * k * 0.8, c[2] + (255 - c[2]) * k * 0.8] : [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)];
        }
        return c;
      };
      const put = (x, y, c) => { if (c) f.rgb(x, y, c); };
      for (const p of cfg.particles || []) if (!p.front) particles(f, p, t, ph, bob / s);
      // rippling cloth behind everything else; a pixel with nothing upwind keeps its own color
      for (const c of st.cloth) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x, a = c.a[i];
          if (a <= 0 && !c.m[i]) continue;
          const gx = x / s, gy = y / s;
          const dx = a * Math.sin(ph + gy * (c.freq ?? 0.07) + gx * 0.025);
          let dy = a * (c.rise ?? 0.5) * Math.sin(ph + gx * 0.05 + 1.3);
          if (c.lift) dy += c.lift(gx, gy) * Math.sin(ph * 2 + gx * 0.11 + gy * 0.05);
          let sx = Math.round(x - dx * s), sy = Math.round(y - dy * s);
          if (sx < 0 || sy < 0 || sx >= w || sy >= h || !c.m[sy * w + sx]) { if (!c.m[i]) continue; sx = x; sy = y; }
          put(x, y + bob, color(sy * w + sx, sx / s, sy / s));
        }
      }
      // everything still, including the breathing part in its resting place (so lifting it never
      // opens a gap underneath), then the breathing part again on top, lifted
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!idx[i] || st.anyCloth[i]) continue;
        put(x, y + bob, color(i, x / s, y / s));
      }
      if (lift) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!st.breathe[i] || st.anyCloth[i]) continue;
        put(x, y + bob - lift, color(i, x / s, y / s));
      }
      const b = cfg.blink;
      if (b && t >= b.at[0] && t < b.at[1]) for (const [x0, y0, x1, y1] of b.eyes) {
        for (let y = Math.round(y0 * s); y <= y1 * s; y++) for (let x = Math.round(x0 * s); x <= x1 * s; x++) {
          const v = idx[y * w + x]; if (v && b.test(img.pal[v])) f.rgb(x, y + bob - lift, st.skin);
        }
        // the closed lid: a lash line that dips in the middle
        const ly = (y0 + y1) / 2 + (b.line ?? 2);
        for (let gx = x0 + 0.5; gx < x1; gx += 0.5) {
          const gy = ly + Math.sin(((gx - x0) / (x1 - x0)) * Math.PI) - 1;
          for (let k = 0; k < Math.max(1, s * 0.75); k++) f.rgb(gx * s, gy * s + k + bob - lift, b.lash || [24, 10, 30]);
        }
      }
      if (cfg.extra) cfg.extra(f, img, t, ph, bob);
      for (const p of cfg.particles || []) if (p.front) particles(f, p, t, ph, bob / s);
    },
  });
  // looping particles, in grid units; each one is back where it started when the loop ends
  function particles(f, p, t, ph, bob) {
    const rnd = P.rng(p.seed ?? 3), [x0, y0, x1, y1] = p.area || [0, 0, 256, 384], c = p.color || [255, 255, 255];
    for (let i = 0; i < p.n; i++) {
      const bx = x0 + rnd() * (x1 - x0), by = y0 + rnd() * (y1 - y0), turns = 1 + Math.floor(rnd() * 2), start = rnd(), wob = rnd() * Math.PI * 2;
      const k = (t * turns + start) % 1, span = y1 - y0;
      if (p.kind === 'rise') { // embers or bits drifting up
        const x = bx + Math.sin(ph * turns + wob) * 4, y = y0 + (((by - y0 - k * span) % span) + span) % span + bob;
        if (p.glow) f.glow(x, y, 3.5, c, 0.4);
        if (p.square) { f.dot(x, y, c, 0.9); f.dot(x + 1, y, c, 0.9); f.dot(x, y + 1, c, 0.9); f.dot(x + 1, y + 1, c, 0.6); }
        else { f.dot(x, y, p.core || c); if (i % 3 === 0) f.dot(x, y + 1, c); }
      } else if (p.kind === 'petal') { // cherry petals falling left and tumbling
        const x = ((bx - k * 120) % 280 + 280) % 280 - 12 + Math.sin(ph * turns + wob) * 6, y = y0 + (((by - y0 + k * span) % span) + span) % span;
        const flip = Math.cos(ph * 2 * turns + wob) > 0, [a, b2, d] = p.colors;
        f.dot(x, y, a); f.dot(x + 1, y, b2); f.dot(x + 2, y + (flip ? 1 : 0), a);
        f.dot(x + 1, y + 1, d); if (flip) f.dot(x + 3, y + 1, d); else f.dot(x, y + 1, b2);
      } else if (p.kind === 'twinkle') { // stars that flare and fade in place
        const a = Math.max(0, Math.sin(ph * turns + wob)); if (a < 0.2) continue;
        const y = by + bob;
        f.dot(bx, y, [255, 255, 255], a);
        if (a > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) f.dot(bx + dx, y + dy, c, a * 0.8);
        if (a > 0.85) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) f.dot(bx + dx, y + dy, c, 0.5);
      } else if (p.kind === 'smoke') { // puffs rising from a point, growing and fading
        const [ox, oy] = p.from, x = ox + Math.sin(k * 6 + wob) * 4 * k + (rnd() - 0.5) * 2 - k * 10, y = oy - k * 70 + bob;
        const r = 1 + k * 4, a = (1 - k) * 0.55;
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) f.dot(x + xx, y + yy, c, a);
      } else if (p.kind === 'spark') { // short bright streaks flying out of a point and falling
        const [ox, oy] = p.from, ang = rnd() * Math.PI * 2, sp = 20 + rnd() * 30;
        if (k > 0.7) continue;
        const x = ox + Math.cos(ang) * sp * k, y = oy + Math.sin(ang) * sp * k + 40 * k * k + bob;
        f.dot(x, y, p.core || [255, 255, 220]); f.dot(x - Math.cos(ang) * 1.5, y - Math.sin(ang) * 1.5, c, 0.8);
      }
    }
  }

  // render frame i of a model (prepare() runs once, then frame() paints each frame)
  const prepared = {};
  P.render = (name, i) => {
    const m = P.models[name], img = P.load(m.data);
    const st = prepared[name] || (prepared[name] = m.prepare(img));
    const f = P.frame(img);
    m.frame(img, st, i / m.frames, f);
    return f.out;
  };
  P.toCanvas = (px, w, h, scale = 1, canvas) => {
    const c = canvas || document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
    g.drawImage(tmp, 0, 0, c.width, c.height);
    return c;
  };
  root.Pixel = P;
})(typeof window !== 'undefined' ? window : globalThis);
