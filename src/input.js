import { canvas, W, H } from './gfx.js?v=32';

export const input = {
  down: new Set(),
  hit: new Set(),
  mouse: { x: W / 2, y: H / 2, down: false, rdown: false, pressed: false, rpressed: false, moved: false },
  device: 'mouse',
  any: false,
  touch: false,
  touchPlay: false,
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 },
  tb: { attack: false, dash: false, q: false, e: false, r: false, pause: false },
  thit: new Set(),
};

// on-screen buttons in game pixels (the canvas is 320x180)
export const TOUCH_BTNS = [
  { id: 'attack', x: 284, y: 138, r: 22 },
  { id: 'dash', x: 244, y: 160, r: 12 },
  { id: 'q', x: 246, y: 121, r: 11 },
  { id: 'e', x: 262, y: 99, r: 11 },
  { id: 'r', x: 290, y: 95, r: 11 },
  { id: 'pause', x: 160, y: 9, r: 9 },
];
const STICK_R = 22;
const roles = new Map();
let wentFull = false;
function touchPt(t) {
  const r = canvas.getBoundingClientRect();
  return { x: ((t.clientX - r.left) / r.width) * W, y: ((t.clientY - r.top) / r.height) * H };
}
function becomeTouch() {
  if (!input.touch) { input.touch = true; document.documentElement.classList.add('touch'); }
  input.device = 'touch';
}
// best effort: fullscreen and a landscape lock. Browsers only allow it when a finger lifts.
export const isFull = () => !!document.fullscreenElement;
export function toggleFull() {
  if (isFull()) { document.exitFullscreen?.().catch(() => {}); return; }
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(() => {
    // keep Escape for the game (pause): in Chromium browsers fullscreen then needs Escape held down, F11 or the button to leave
    navigator.keyboard?.lock?.(['Escape']).catch(() => {});
    screen.orientation?.lock?.('landscape');
  }).catch(() => {});
}
// the corner button: its own clicks and taps never reach the game
const fsBtn = document.getElementById('fs');
if (fsBtn) {
  for (const ev of ['mousedown', 'mouseup', 'touchstart', 'touchend']) fsBtn.addEventListener(ev, (e) => e.stopPropagation());
  fsBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFull(); fsBtn.blur(); });
  document.addEventListener('fullscreenchange', () => { fsBtn.classList.toggle('on', isFull()); if (!isFull()) navigator.keyboard?.unlock?.(); });
}
function goFull() {
  if (wentFull || !document.documentElement.requestFullscreen) return;
  wentFull = true;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}
addEventListener('touchstart', (e) => {
  e.preventDefault();
  becomeTouch();
  input.any = true;
  for (const t of e.changedTouches) {
    const { x, y } = touchPt(t);
    if (input.touchPlay) {
      const b = TOUCH_BTNS.find((b) => Math.hypot(x - b.x, y - b.y) < b.r + 6);
      if (b) { roles.set(t.identifier, b.id); input.tb[b.id] = true; input.thit.add(b.id); }
      else if (x < W * 0.55 && input.stick.id === null) {
        const s = input.stick;
        s.id = t.identifier; s.ox = s.x = x; s.oy = s.y = y; s.dx = s.dy = 0;
        roles.set(t.identifier, 'stick');
      } else { roles.set(t.identifier, 'attack'); input.tb.attack = true; input.thit.add('attack'); }
    } else {
      input.mouse.x = x; input.mouse.y = y; input.mouse.pressed = true; input.mouse.moved = true;
      roles.set(t.identifier, 'menu');
    }
  }
}, { passive: false });
addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const role = roles.get(t.identifier), { x, y } = touchPt(t);
    if (role === 'stick') {
      const s = input.stick;
      let vx = x - s.ox, vy = y - s.oy, l = Math.hypot(vx, vy);
      if (l > STICK_R) { s.ox = x - (vx / l) * STICK_R; s.oy = y - (vy / l) * STICK_R; vx = x - s.ox; vy = y - s.oy; l = STICK_R; }
      s.x = x; s.y = y;
      const k = l < STICK_R * 0.18 ? 0 : 1 / STICK_R;
      s.dx = vx * k; s.dy = vy * k;
    } else if (role === 'menu') { input.mouse.x = x; input.mouse.y = y; input.mouse.moved = true; }
  }
}, { passive: false });
function touchEnd(e) {
  goFull();
  for (const t of e.changedTouches) {
    const role = roles.get(t.identifier);
    roles.delete(t.identifier);
    if (role === 'stick') { const s = input.stick; s.id = null; s.dx = s.dy = 0; }
    else if (role && role !== 'menu' && ![...roles.values()].includes(role)) input.tb[role] = false;
  }
}
addEventListener('touchend', touchEnd);
addEventListener('touchcancel', touchEnd);
if (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) { input.touch = true; input.device = 'touch'; document.documentElement.classList.add('touch'); }

const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash', 'Quote']);

addEventListener('keydown', (e) => {
  if (BLOCK.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  input.down.add(e.code);
  input.hit.add(e.code);
  input.any = true;
});
addEventListener('keyup', (e) => input.down.delete(e.code));
addEventListener('blur', () => {
  input.down.clear();
  input.mouse.down = input.mouse.rdown = false;
});

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  input.mouse.x = Math.max(0, Math.min(W - 1, ((e.clientX - r.left) / r.width) * W));
  input.mouse.y = Math.max(0, Math.min(H - 1, ((e.clientY - r.top) / r.height) * H));
}
addEventListener('mousemove', (e) => {
  toCanvas(e);
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { if (!input.touch) input.device = 'mouse'; input.mouse.moved = true; }
});
addEventListener('mousedown', (e) => {
  toCanvas(e);
  input.device = 'mouse';
  input.any = true;
  if (e.button === 0) { input.mouse.down = true; input.mouse.pressed = true; }
  if (e.button === 2) { input.mouse.rdown = true; input.mouse.rpressed = true; }
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) input.mouse.down = false;
  if (e.button === 2) input.mouse.rdown = false;
});
addEventListener('contextmenu', (e) => e.preventDefault());

export const keyDown = (...codes) => codes.some((c) => input.down.has(c));
export const keyHit = (...codes) => codes.some((c) => input.hit.has(c));

export function endFrame() {
  input.hit.clear();
  input.mouse.pressed = input.mouse.rpressed = input.mouse.moved = false;
  input.thit.clear();
  input.any = false;
}
