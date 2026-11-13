import { canvas, W, H } from './gfx.js';

export const input = {
  down: new Set(),
  hit: new Set(),
  mouse: { x: W / 2, y: H / 2, down: false, rdown: false, pressed: false, rpressed: false, moved: false },
  device: 'mouse',
  any: false,
};

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
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { input.device = 'mouse'; input.mouse.moved = true; }
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
  input.any = false;
}
