// Expressions: little pixel bubbles over a head, the way a fighter or a monster shows how it feels without words.
//   alert '!'   a boss arrives, something dangerous starts      ask '?'     lost, or looking for something
//   dots '...'  waiting, unimpressed                             sweat       low on health, nervous
//   angry       hit hard, a boss's second phase (the cross-shaped vein)
//   note        happy: a wave cleared, by the campfire           heart       a kind word, a friend
//   sleep 'z'   standing still too long                          star        a big win, a new best
//   dizzy       stunned: stars circling the head
// drawEmote(kind, x, y, t, k): x, y is the top of the head; t is how long it has shown (it pops in); k fades it.
import { ctx, P, rect, px, textO } from './gfx.js?v=213';

const INK = '#1a0e16';
// a speech bubble with a tail pointing down at the head, w x h inside
function bubble(x, y, w, h, fill = P.paper) {
  rect(x - 1, y, w + 2, h, INK); rect(x, y - 1, w, h + 2, INK);
  rect(x, y, w, h, fill);
  const tx = Math.round(x + w / 2);
  rect(tx - 1, y + h + 1, 3, 1, INK); rect(tx - 1, y + h, 3, 1, fill); px(tx, y + h + 1, fill); px(tx, y + h + 2, INK);
}
const ART = {
  alert(x, y, t) { bubble(x - 3, y - 11, 7, 9, '#ffd447'); rect(x - 1, y - 10, 2, 5, INK); rect(x - 1, y - 4, 2, 1, INK); },
  ask(x, y) { bubble(x - 3, y - 11, 7, 9); rect(x - 1, y - 10, 3, 1, INK); px(x + 2, y - 9, INK); px(x + 1, y - 8, INK); px(x, y - 7, INK); px(x, y - 5, INK); },
  dots(x, y, t) { bubble(x - 6, y - 9, 12, 6); const n = 1 + (Math.floor(t * 3) % 3); for (let i = 0; i < n; i++) rect(x - 4 + i * 3, y - 7, 2, 2, INK); },
  sweat(x, y, t) {
    const d = (t * 14) % 6, sx = x + 6, sy = Math.round(y - 4 + d);
    ctx.globalAlpha *= 1 - d / 7;
    px(sx, sy - 2, '#bfe8ff'); rect(sx - 1, sy - 1, 3, 2, '#62c8ff'); rect(sx, sy + 1, 1, 1, '#2a7ac0');
  },
  angry(x, y, t) {
    const s = Math.floor(t * 8) % 2, c = '#ff3b3b', ax = x + 5, ay = y - 6 - s;
    for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { px(ax + dx, ay + dy, c); px(ax + dx * 0.5, ay + dy * 1.5, c); px(ax + dx * 1.5, ay + dy * 0.5, c); }
  },
  note(x, y, t) {
    const b = Math.sin(t * 6) * 1.5, c = '#ffd447';
    for (const [dx, dd] of [[-3, 0], [3, 1.2]]) { const nx = x + dx, ny = Math.round(y - 6 - Math.sin(t * 6 + dd) * 1.5 + b * 0); rect(nx, ny, 2, 2, c); rect(nx + 1, ny - 4, 1, 4, c); px(nx + 2, ny - 4, c); }
  },
  heart(x, y, t) {
    const c = '#ff5a8a', yy = Math.round(y - 8 - (t * 6) % 3);
    rect(x - 2, yy, 2, 2, c); rect(x + 1, yy, 2, 2, c); rect(x - 2, yy + 1, 5, 2, c); rect(x - 1, yy + 3, 3, 1, c); px(x, yy + 4, c); px(x - 2, yy, '#ffc0d0');
  },
  sleep(x, y, t) {
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.7 + i / 3) % 1, zx = Math.round(x + 3 + u * 8), zy = Math.round(y - 4 - u * 12), a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.sin(u * Math.PI);
      rect(zx, zy, 3, 1, P.paper); px(zx + 1, zy + 1, P.paper); rect(zx, zy + 2, 3, 1, P.paper);
      ctx.globalAlpha = a;
    }
  },
  star(x, y, t) {
    const c = '#ffd447', s = Math.floor(t * 6) % 2;
    rect(x - 1, y - 9, 3, 3, c); px(x, y - 11 - s, c); px(x, y - 5 + s, c); px(x - 3 - s, y - 8, c); px(x + 3 + s, y - 8, c); px(x, y - 8, P.paper);
  },
  dizzy(x, y, t) {
    for (let i = 0; i < 3; i++) { const a = t * 6 + (i * Math.PI * 2) / 3, sx = Math.round(x + Math.cos(a) * 6), sy = Math.round(y - 2 + Math.sin(a) * 2); px(sx, sy, '#ffd447'); px(sx - 1, sy, '#ffd447'); px(sx + 1, sy, '#ffd447'); px(sx, sy - 1, '#ffd447'); px(sx, sy + 1, '#ffd447'); }
  },
};
export const EMOTES = Object.keys(ART);
export function drawEmote(kind, x, y, t = 1, k = 1) {
  const f = ART[kind];
  if (!f || k <= 0) return;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * Math.min(1, k);
  // it pops in: up from the head with a small overshoot
  const pop = t < 0.18 ? Math.round((1 - t / 0.18) * 3) : 0;
  f(Math.round(x), Math.round(y) + pop, t);
  ctx.globalAlpha = a;
}
// a speech bubble with words in it, centred over x, its tail touching y
export function sayBubble(s, x, y, t = 1, col = INK) {
  const w = s.length * 4 + 3, bx = Math.round(x - w / 2), by = Math.round(y - 12 + (t < 0.15 ? Math.round((1 - t / 0.15) * 3) : 0));
  bubble(bx, by, w, 9);
  textO(s, bx + 2, by + 2, col, 1, 'l', P.paper);
}
