import { canvas, W, H, FW, SX, onWidth, rotatedTouch } from './gfx.js?v=213';

import { keys, layout, persistControls } from './bindings.js?v=213';
// the movement stick sits near the screen's left edge (the stage can be narrower than the screen, see gfx.js)
export let STICK_X = 50;
export let STICK_Y = 135;
export const STICK_R = 22;
const AIM_DEAD = 6;
export const input = {
  down: new Set(),
  hit: new Set(),
  mouse: { x: W / 2, y: H / 2, down: false, rdown: false, pressed: false, rpressed: false, moved: false, wheel: 0 },
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

// on-screen buttons in game pixels on the 320x180 stage. They hug the screen's right edge (on a wider screen they move
// out with it, see gfx.js). A touch counts for the nearest button within reach, so neighbors never steal each other's
// presses.
export const TOUCH_BTNS = [
  { id: 'attack', bx: 284, y: 138, r: 23 },
  { id: 'dash', bx: 243, y: 160, r: 13 },
  { id: 'q', bx: 245, y: 120, r: 12 },
  { id: 'e', bx: 262, y: 97, r: 12 },
  { id: 'r', bx: 291, y: 93, r: 12 },
  // the menu button (pause, settings, restart, back to the menu) in the top right corner
  { id: 'pause', bx: 302, y: 12, r: 11 },
];
const REACH = 9;
for (const b of TOUCH_BTNS) b.by = b.y;
const bound = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
function position(id, x, y, r) {
  const xy = layout[id];
  return xy ? [bound(xy[0]*FW-SX,r-SX,W+SX-r), bound(xy[1]*H,r,H-r)] : [x,y];
}
export function placeButtons() {
  for (const b of TOUCH_BTNS) [b.x,b.y] = position(b.id,b.bx+SX,b.by,b.r);
  [STICK_X,STICK_Y] = position('stick',50-SX,135,STICK_R);
  const s = input.stick;
  if (s.id === null) { s.ox = s.x = STICK_X; s.oy = s.y = STICK_Y; }
}
const nearestBtn = (x, y) => { let best = null, bd = 1e9; for (const b of TOUCH_BTNS) { const d = Math.hypot(x - b.x, y - b.y); if (d < b.r + REACH && d - b.r < bd) { bd = d - b.r; best = b; } } return best; };
const roles = new Map();
let wentFull = false;
export const editor = { active:false, drag:null };
function dragStart(x,y) {
  if (y <= 15 && x >= 67 && x <= 214) return false;
  const b = nearestBtn(x,y);
  editor.drag = b?.id || (Math.hypot(x-STICK_X,y-STICK_Y)<STICK_R+5 ? 'stick' : null);
  return !!editor.drag;
}
function dragTo(x,y) {
  if (!editor.drag) return;
  layout[editor.drag] = [bound((x+SX)/FW,0,1),bound(y/H,0,1)];
  placeButtons();
}
function dragEnd() { if (editor.drag) persistControls(); editor.drag = null; }
function touchPt(t) {
  const r = canvas.getBoundingClientRect();
  if (rotatedTouch()) return { x: (t.clientY-r.top)/r.height*FW-SX, y: (r.right-t.clientX)/r.width*H };
  return { x: ((t.clientX - r.left) / r.width) * FW - SX, y: ((t.clientY - r.top) / r.height) * H };
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
    screen.orientation?.lock?.('landscape')?.catch(() => {});
  }).catch(() => {});
}
// the page's corner buttons (sound and screen shake are wired in main.js): their own clicks and taps never reach the game
for (const b of document.querySelectorAll('#corner button')) for (const ev of ['mousedown', 'mouseup', 'touchstart', 'touchend']) b.addEventListener(ev, (e) => e.stopPropagation());
const fsBtn = document.getElementById('fs');
if (fsBtn) {
  fsBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFull(); fsBtn.blur(); });
  document.addEventListener('fullscreenchange', () => { fsBtn.classList.toggle('on', isFull()); if (!isFull()) navigator.keyboard?.unlock?.(); });
}
function goFull() {
  if (wentFull || !document.documentElement.requestFullscreen) return;
  if (isFull()) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { wentFull = true; screen.orientation?.lock?.('landscape')?.catch(() => {}); }).catch(() => {});
}
const SKILL_GO = 12, SKILL_BACK = 9;
function resetSkill() { Object.assign(input.skill, { id: null, key: null, dx: 0, dy: 0, active: false, was: false, cancel: false }); }
export function releaseTouches() {
  roles.clear();
  for (const id in input.tb) input.tb[id] = false;
  input.thit.clear();
  input.cast = null;
  Object.assign(input.stick, { id: null, dx: 0, dy: 0, x: STICK_X, y: STICK_Y });
  Object.assign(input.aim, { id: null, dx: 0, dy: 0, active: false });
  resetSkill();
  if (editor.drag) dragEnd();
}
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
    if (editor.active && editor.drag === null && dragStart(x,y)) { roles.set(t.identifier,'layout'); continue; }
    if (input.touchPlay) {
      const b = nearestBtn(x, y);
      if (b && !input.aimable[b.id]) {
        roles.set(t.identifier, b.id); input.tb[b.id] = true; input.thit.add(b.id);
        if (b.id === 'attack') startAim(t.identifier, b.x, b.y);
      } else if (b) {
        if (input.skill.id !== null) continue;
        roles.set(t.identifier, b.id); input.tb[b.id] = true;
        Object.assign(input.skill, { id: t.identifier, key: b.id, ox: b.x, oy: b.y, dx: 0, dy: 0, active: false, was: false, cancel: false });
      } else if ((Math.hypot(x-STICK_X,y-STICK_Y)<STICK_R*2.8 || (!layout.stick && x < FW*0.55-SX)) && input.stick.id === null) {
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
    if (role === 'layout') dragTo(x,y);
    else if (role === 'stick') moveStick(x, y);
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
  if (e.type === 'touchend') goFull();
  for (const t of e.changedTouches) {
    const role = roles.get(t.identifier);
    roles.delete(t.identifier);
    if (role === 'layout') { if (e.type === 'touchend') { const {x,y}=touchPt(t); dragTo(x,y); } dragEnd(); continue; }
    if (role === 'stick') { const s = input.stick; s.id = null; s.dx = s.dy = 0; s.x = STICK_X; s.y = STICK_Y; }
    if (input.aim.id === t.identifier) Object.assign(input.aim, { id: null, active: false, dx: 0, dy: 0 });
    if (input.skill.id === t.identifier) {
      const k = input.skill;
      // a tap casts with auto-aim, a drag casts where it points, a drag back onto the button cancels
      if (e.type === 'touchend' && !k.cancel && input.touchPlay) {
        input.thit.add(k.key);
        input.cast = { key: k.key, a: k.active ? k.a : null, k: k.active ? k.k : 1 };
      }
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
  releaseTouches();
});

function toCanvas(e) {
  const {x,y} = touchPt(e); input.mouse.x = bound(x,-SX,W+SX-1); input.mouse.y = bound(y,0,H-1);
}
addEventListener('mousemove', (e) => {
  toCanvas(e);
  if (editor.active && editor.drag) dragTo(input.mouse.x,input.mouse.y);
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { if (!input.touch) { input.device = 'mouse'; input.mouseUsed = true; } input.mouse.moved = true; }
});
addEventListener('mousedown', (e) => {
  toCanvas(e);
  input.device = 'mouse';
  if (e.button === 0 && editor.active && dragStart(input.mouse.x,input.mouse.y)) return;
  input.any = true;
  if (e.button === 0) { input.mouse.down = true; input.mouse.pressed = true; }
  if (e.button === 2) { input.mouse.rdown = true; input.mouse.rpressed = true; }
});
addEventListener('mouseup', (e) => {
  if (editor.drag && e.button === 0) { toCanvas(e); dragTo(input.mouse.x,input.mouse.y); dragEnd(); }
  if (e.button === 0) input.mouse.down = false;
  if (e.button === 2) input.mouse.rdown = false;
});
addEventListener('contextmenu', (e) => e.preventDefault());
// the mouse wheel, in whole steps (it scrolls the long lists, like the Peddler's)
addEventListener('wheel', (e) => { if (e.deltaY) input.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });

export const keyDown = (...codes) => codes.some((c) => input.down.has(c));
export const keyHit = (...codes) => codes.some((c) => input.hit.has(c));

export const actionHit = id => keys[id].some(c => input.hit.has(c));
export const actionDown = id => keys[id].some(c => input.down.has(c));
export function endFrame() {
  input.hit.clear();
  input.mouse.pressed = input.mouse.rpressed = input.mouse.moved = false;
  input.mouse.wheel = 0;
  input.thit.clear();
  input.cast = null;
  input.any = false;
}

// the buttons and the stick follow the screen edges when the stage widens
placeButtons();
onWidth(placeButtons);
