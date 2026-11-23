export const ACTIONS = {
  up: ['MOVE UP', 'KeyW', 'ArrowUp'], left: ['MOVE LEFT', 'KeyA', 'ArrowLeft'],
  down: ['MOVE DOWN', 'KeyS', 'ArrowDown'], right: ['MOVE RIGHT', 'KeyD', 'ArrowRight'],
  attack: ['ATTACK', 'KeyJ', 'KeyZ'], dash: ['DASH', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX'],
  q: ['FIRST SKILL', 'KeyQ', 'KeyU'], e: ['SECOND SKILL', 'KeyE', 'KeyI'], r: ['ULTIMATE', 'KeyR', 'KeyO'], pause: ['PAUSE', 'KeyP'],
};
const key = 'ashblade.controls.v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
export const keys = {}, layout = {};
const validCode = code => typeof code === 'string' && /^[a-zA-Z][a-zA-Z0-9]{0,24}$/.test(code) && !['Escape','Tab','Enter','Unidentified'].includes(code);
for (const [id, spec] of Object.entries(ACTIONS)) {
  const list = saved.keys?.[id];
  keys[id] = Array.isArray(list) ? list.filter(validCode).slice(0,5) : spec.slice(1);
}
for (const id of ['stick','attack','dash','q','e','r','pause']) {
  const pos = saved.layout?.[id];
  if (Array.isArray(pos) && pos.length === 2 && pos.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) layout[id] = pos;
}
export function persistControls() { try { localStorage.setItem(key, JSON.stringify({keys,layout})); } catch {} }
export function bindKey(id, code) {
  if (!ACTIONS[id] || !validCode(code)) return false;
  for (const other of Object.keys(keys)) if (other !== id && keys[other].includes(code)) keys[other] = [];
  keys[id] = [code]; persistControls(); return true;
}
export function resetKeys() { for (const id in ACTIONS) keys[id] = ACTIONS[id].slice(1); persistControls(); }
export function resetLayout() { for (const id in layout) delete layout[id]; persistControls(); }
const KEY_NAMES = {
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Slash: '/', Backslash: '\\', Semicolon: ';',
  Comma: ',', Period: '.', Quote: "'", Backquote: 'GRAVE', PageUp: 'PG UP', PageDown: 'PG DN',
  Backspace: 'BKSP', CapsLock: 'CAPS', Delete: 'DEL', Insert: 'INS', Control: 'CTRL',
};
export function keyLabel(id) {
  const code = keys[id]?.[0];
  if (!code) return '--';
  const mod = /^(Shift|Control|Alt|Meta)(Left|Right)$/.exec(code);
  if (mod) return (mod[2] === 'Left' ? 'L ' : 'R ') + (KEY_NAMES[mod[1]] || mod[1].toUpperCase());
  return KEY_NAMES[code] || code.replace(/^(Key|Digit|Arrow)/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}
