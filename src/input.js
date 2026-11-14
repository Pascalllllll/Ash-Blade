import { canvas, W, H } from './gfx.js?v=42';

// the movement stick sits in a fixed spot; any touch on the left side drives it from there
export const STICK_X = 50, STICK_Y = 135, STICK_R = 22;
const AIM_DEAD = 6;
export const input = {
  down: new Set(),
  hit: new Set(),
  mouse: { x: W / 2, y: H / 2, down: false, rdown: false, pressed: false, rpressed: false, moved: false },
  device: 'mouse',
  any: false,
  touch: false,
  touchPlay: false,
  stick: { id: null, ox: STICK_X, oy: STICK_Y, x: STICK_X, y: STICK_Y, dx: 0, dy: 0 },
  // dragging from the attack button aims; a short tap keeps auto-aim
  aim: { id: null, ox: 0, oy: 0, dx: 0, dy: 0, active: false, a: 0 },
  // aimed skills: hold the button, drag to aim (further = farther), lift to cast; drag back onto the button to cancel
  skill: { id: null, key: null, ox: 0, oy: 0, dx: 0, dy: 0, a: 0, k: 1, active: false, was: false, cancel: false },
  aimable: { q: false, e: false, r: false },
  cast: null,
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
const SKILL_GO = 12, SKILL_BACK = 9;
function resetSkill() { Object.assign(input.skill, { id: null, key: null, dx: 0, dy: 0, active: false, was: false, cancel: false }); }
function startAim(id, x, y) { Object.assign(input.aim, { id, ox: x, oy: y, dx: 0, dy: 0, active: false }); }
function moveStick(x, y) {
  const s = input.stick;
  let vx = x - STICK_X, vy = y - STICK_Y;
  const l = Math.hypot(vx, vy);
  if (l > STICK_R) { vx = (vx / l) * STICK_R; vy = (vy / l) * STICK_R; }
  s.x = STICK_X + vx; s.y = STICK_Y + vy;
  const k = l < STICK_R * 0.18 ? 0 : 1 / STICK_R;
  s.dx = vx * k; s.dy = vy * k;
}
addEventListener('touchstart', (e) => {
  e.preventDefault();
  becomeTouch();
  input.any = true;
  for (const t of e.changedTouches) {
    const { x, y } = touchPt(t);
    if (input.touchPlay) {
      const b = TOUCH_BTNS.find((b) => Math.hypot(x - b.x, y - b.y) < b.r + 6);
      if (b && !(input.aimable[b.id] && input.skill.id === null)) {
        roles.set(t.identifier, b.id); input.tb[b.id] = true; input.thit.add(b.id);
        if (b.id === 'attack') startAim(t.identifier, b.x, b.y);
      } else if (b && input.aimable[b.id] && input.skill.id === null) {
        roles.set(t.identifier, b.id); input.tb[b.id] = true;
        Object.assign(input.skill, { id: t.identifier, key: b.id, ox: b.x, oy: b.y, dx: 0, dy: 0, active: false, was: false, cancel: false });
      } else if (x < W * 0.55 && input.stick.id === null) {
        input.stick.id = t.identifier;
        roles.set(t.identifier, 'stick');
        moveStick(x, y);
      } else { roles.set(t.identifier, 'attack'); input.tb.attack = true; input.thit.add('attack'); startAim(t.identifier, x, y); }
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
    if (role === 'stick') moveStick(x, y);
    else if (input.skill.id === t.identifier) {
      const k = input.skill;
      k.dx = x - k.ox; k.dy = y - k.oy;
      const d = Math.hypot(k.dx, k.dy);
      if (d > SKILL_GO) { k.active = k.was = true; k.cancel = false; k.a = Math.atan2(k.dy, k.dx); k.k = Math.max(0.25, Math.min(1, (d - SKILL_GO) / 30 + 0.25)); }
      else if (k.was && d < SKILL_BACK) { k.active = false; k.cancel = true; }
    } else if (input.aim.id === t.identifier) {
      const m = input.aim;
      m.dx = x - m.ox; m.dy = y - m.oy;
      if (Math.hypot(m.dx, m.dy) > AIM_DEAD) { m.active = true; m.a = Math.atan2(m.dy, m.dx); }
    } else if (role === 'menu') { input.mouse.x = x; input.mouse.y = y; input.mouse.moved = true; }
  }
}, { passive: false });
function touchEnd(e) {
  goFull();
  for (const t of e.changedTouches) {
    const role = roles.get(t.identifier);
    roles.delete(t.identifier);
    if (role === 'stick') { const s = input.stick; s.id = null; s.dx = s.dy = 0; s.x = STICK_X; s.y = STICK_Y; }
    if (input.aim.id === t.identifier) Object.assign(input.aim, { id: null, active: false, dx: 0, dy: 0 });
    if (input.skill.id === t.identifier) {
      const k = input.skill;
      // a tap casts with auto-aim, a drag casts where it points, a drag back onto the button cancels
      if (!k.cancel && input.touchPlay) { input.thit.add(k.key); if (k.active) input.cast = { key: k.key, a: k.a, k: k.k }; }
      resetSkill();
    }
    // release the button unless another finger still holds it (the attack button used to stay held forever)
    if (role && role !== 'menu' && role !== 'stick' && ![...roles.values()].includes(role)) input.tb[role] = false;
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
  input.cast = null;
  input.any = false;
}
