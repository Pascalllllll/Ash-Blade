import { W, H, ctx, P, BAYER, makeCanvas, rect, px, line, ring, drawSprite, glow, text, textO, logoCanvas } from './gfx.js';
import { SPR, icon } from './sprites.js';
import { input, keyHit, TOUCH_BTNS } from './input.js';
import { A } from './audio.js';
import { settings, best, OPTIONS } from './store.js';
import { G, fx, RANKS, floor, decal, AW, AH, isBossWave, buzz, canVibrate } from './world.js';
import { CHARS } from './chars.js';
import { BOSSES, bossFor } from './bosses.js';
import { MAPS } from './maps.js';
import { rollUpgrades, UPGRADES } from './upgrades.js';
const UPG_EVO = Object.fromEntries(UPGRADES.filter((u) => u.req).map((u) => [u.req, u.id]));

const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const back = (k) => { k = Math.min(1, Math.max(0, k)); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const inBox = (x, y, w, h) => input.mouse.x >= x && input.mouse.x < x + w && input.mouse.y >= y && input.mouse.y < y + h;
const C = (k) => P[k] || k;
function dim(a) { ctx.globalAlpha = a; ctx.fillStyle = P.void; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

// ---------- overlays ----------
function dithered(fn, col) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = col;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fn(x, y) > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) g.fillRect(x, y, 1, 1);
  return c;
}
const edge = (x, y) => Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
const VIG = dithered((x, y) => Math.max(0, (edge(x, y) - 0.86) * 2.2), '#07060b');
const RED = dithered((x, y) => Math.max(0, (edge(x, y) - 0.5) * 1.8), '#e0223f');
let LOGO = null;
export function refreshArt() { LOGO = logoCanvas('ASHBLADE', 4, [P.paper, P.paper, P.ember3, P.ember3, P.ember2, P.ember, P.ember], P.ink0); }

export function vignette() { ctx.drawImage(VIG, 0, 0); }
export function screenFlash() {
  if (fx.flashT <= 0) return;
  const k = fx.flashT / fx.flashMax, max = settings.flash ? (fx.flashStrong ? 0.8 : 0.4) : 0.12;
  ctx.globalAlpha = Math.min(1, k * max); ctx.fillStyle = fx.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
}
export function cursor() {
  if (input.device !== 'mouse') return;
  const x = Math.round(input.mouse.x), y = Math.round(input.mouse.y);
  const c = G && G.p && G.p.state === 'attack' ? P.ember2 : P.paper;
  for (const [dx, dy] of [[-4, 0], [-3, 0], [3, 0], [4, 0], [0, -4], [0, -3], [0, 3], [0, 4]]) { px(x + dx + 1, y + dy + 1, P.ink0); px(x + dx, y + dy, c); }
  px(x, y, P.ember);
}

// ---------- a reusable list menu ----------
// items: { label, value?: () => string, adjust?: (dir) => void, act?: () => any, hint? }
export function runMenu(m, items, x, y, w, rowH = 11) {
  if (m.sel >= items.length) m.sel = items.length - 1;
  if (keyHit('ArrowUp', 'KeyW')) { m.sel = (m.sel + items.length - 1) % items.length; A.ui(); }
  if (keyHit('ArrowDown', 'KeyS')) { m.sel = (m.sel + 1) % items.length; A.ui(); }
  const it = items[m.sel];
  if (it.adjust && keyHit('ArrowLeft', 'KeyA')) { it.adjust(-1); A.ui(); }
  if (it.adjust && keyHit('ArrowRight', 'KeyD')) { it.adjust(1); A.ui(); }
  for (let i = 0; i < items.length; i++) {
    if (!inBox(x, y + i * rowH - 3, w, rowH)) continue;
    if (input.mouse.moved && m.sel !== i) { m.sel = i; A.ui(); }
    if (input.mouse.pressed) {
      m.sel = i;
      if (items[i].adjust) { items[i].adjust(input.mouse.x > x + w / 2 ? 1 : -1); A.ui(); }
      else if (items[i].act) { A.select(); return items[i].act(); }
    }
  }
  if (keyHit('Enter', 'Space')) {
    if (it.act) { A.select(); return it.act(); }
    if (it.adjust) { it.adjust(1); A.ui(); }
  }
  return null;
}
export function drawMenu(m, items, x, y, w, rowH = 11) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i], yy = y + i * rowH, sel = m.sel === i;
    if (sel) { rect(x, yy - 3, w, rowH - 1, P.ink3); rect(x, yy - 3, 2, rowH - 1, P.ember); }
    text(it.label, x + 8, yy, sel ? P.paper : it.dimmed ? P.stone2 : P.dust);
    if (it.value) { const v = it.value(); text((sel && it.adjust ? '< ' : '') + v + (sel && it.adjust ? ' >' : ''), x + w - 8, yy, sel ? P.ember2 : P.bone, 1, 'r'); }
  }
}

// ---------- HUD ----------
function abilityBox(x, y, key, ready, frac, deny, ic, col) {
  x += deny > 0 ? (Math.floor(deny * 40) % 2 ? 1 : -1) : 0;
  rect(x - 1, y - 1, 18, 18, P.ink0);
  rect(x, y, 16, 16, ready ? P.ink3 : P.ink1);
  if (!ready) rect(x, y + 16 - Math.round(16 * Math.min(1, frac)), 16, Math.round(16 * Math.min(1, frac)), P.ink2);
  drawSprite(icon(ic, ready ? col : P.stone2), x + 3, y + 2, false);
  rect(x, y, 16, 1, ready ? P.stone2 : P.ink2);
  textO(key, x + 13, y + 12, ready ? P.paper : P.dust);
  if (deny > 0) { rect(x - 1, y - 1, 18, 1, P.blood); rect(x - 1, y + 16, 18, 1, P.blood); }
}

export function drawHUD(menu) {
  const p = G.p, kit = G.kit;
  const lb = G.boss && BOSSES[G.boss.boss].bars(G.boss);
  for (let i = 0; i < p.maxHp; i++) drawSprite(i < p.hp ? SPR.heart : SPR.heartE, 5 + (i % 12) * 8, 5 + Math.floor(i / 12) * 8 + (i < p.hp && p.hp <= 2 && Math.floor(G.time * 6) % 2 ? -1 : 0), false);
  const oy = p.maxHp > 12 ? 8 : 0;
  const ex = 6, ey = 15 + oy, ew = 64;
  rect(ex - 1, ey - 1, ew + 2, 6, P.ink0); rect(ex, ey, ew, 4, P.ink2);
  const ef = Math.round((ew * p.energy) / 100);
  rect(ex, ey, ef, 4, P.volt2); rect(ex, ey, ef, 1, P.volt);
  for (let i = 1; i < 10; i++) rect(ex + Math.round((ew * i) / 10), ey, 1, 4, P.ink0);
  rect(ex + Math.round((ew * kit.q.cost) / 100), ey + 4, 1, 2, P.bone);
  rect(ex + Math.round((ew * kit.e.cost) / 100), ey + 4, 1, 2, P.bone);
  const uy = ey + 8, full = p.ult >= 100, blink = Math.floor(G.time * 6) % 2;
  rect(ex - 1, uy - 1, ew + 2, 4, P.ink0); rect(ex, uy, ew, 2, P.ink2);
  rect(ex, uy, Math.round((ew * p.ult) / 100), 2, full ? (blink ? P.gold : P.paper) : P.gold2);
  if (full) { textO('R  ' + kit.r.name, ex, uy + 5, blink ? P.gold : P.ember3); glow(ex + ew, uy + 1, P.gold, 8, 0.5); }
  if (p.dashMax > 1) for (let i = 0; i < p.dashMax; i++) rect(ex + ew + 4, ey + i * 4, 3, 3, i < p.charges ? kit.color() : P.ink3);
  kit.hud?.(p, ex, uy + (full ? 12 : 5));

  const by = H - 21;
  if (input.touch) { drawTouch(p, kit, full); }
  else {
  abilityBox(6, by, 'Q', p.energy >= kit.q.cost && p.cdQ <= 0, Math.min(p.energy / kit.q.cost, 1 - Math.max(0, p.cdQ) / kit.q.cd), G.deny.q, kit.q.icon, kit.color());
  abilityBox(26, by, 'E', p.energy >= kit.e.cost && p.cdE <= 0, Math.min(p.energy / kit.e.cost, 1 - Math.max(0, p.cdE) / kit.e.cd), G.deny.e, kit.e.icon, kit.color());
  abilityBox(46, by, 'R', full, p.ult / 100, G.deny.r, kit.r.icon, P.gold);
  }

  // score and high score, top right
  const hi = Math.max(best.score, G.startBest ?? best.score), beat = G.score > hi && hi > 0;
  textO('WAVE ' + G.wave, W - 6, 4, P.bone, 1, 'r');
  textO('SCORE ' + String(G.score).padStart(7, '0'), W - 6, 12, P.paper, 1, 'r');
  textO((beat ? 'NEW BEST ' : 'BEST ') + String(Math.max(hi, G.score)).padStart(7, '0'), W - 6, 20, beat && Math.floor(G.time * 4) % 2 ? P.paper : P.gold, 1, 'r');

  if (G.combo >= 2) {
    const rk = RANKS[G.rank], rc = C(rk.c), pop = G.rankPop > 0.5 ? 1 : 0;
    textO(String(G.combo), W - 7, 32, P.paper, 3, 'r');
    textO('HITS', W - 7, 49, P.dust, 1, 'r');
    rect(W - 39, 56, 32, 1, P.ink0);
    const cw = Math.round((32 * Math.max(0, G.comboT)) / 3);
    rect(W - 7 - cw, 56, cw, 1, rc);
    textO(rk.l, W - 7 + pop, 62 - pop * 2, rc, 4 + pop, 'r');
    textO(rk.w, W - 7, 85 + pop * 3, rc, 1, 'r');
    if (G.rank >= 4) glow(W - 20, 72, rc, 18, 0.18);
  }

  const b = G.boss;
  if (b && !b.dead && !lb) {
    const bd = BOSSES[b.boss], w = 180, x = (W - w) / 2, y = H - 12;
    textO(bd.name + (b.phase > 1 ? '  ' + 'I'.repeat(b.phase) : ''), W / 2, y - 8, b.phase > 1 ? bd.col : P.bone, 1, 'c');
    rect(x - 1, y - 1, w + 2, 5, P.ink0); rect(x, y, w, 3, P.ink2);
    b.chip = b.chip === undefined ? b.hp : Math.max(b.hp, b.chip - (b.maxHp * 0.25) / 60);
    rect(x, y, Math.round((w * Math.max(0, b.chip)) / b.maxHp), 3, P.paper);
    rect(x, y, Math.round((w * Math.max(0, b.hp)) / b.maxHp), 3, bd.col);
    if (b.shieldUp) rect(x, y - 1, Math.round((w * Math.max(0, b.hp)) / b.maxHp), 1, '#62efff');
    if (bd.final) { rect(x + w * 0.66, y - 1, 1, 5, P.ink0); rect(x + w * 0.33, y - 1, 1, 5, P.ink0); } else rect(x + w / 2, y - 1, 1, 5, P.ink0);
  }

  // a fighter was just unlocked
  const un = G.unlocks[0];
  if (un) {
    un.t += 1 / 60;
    if (un.t > 4) G.unlocks.shift();
    else {
      const ch = CHARS[un.id], k2 = ease(un.t / 0.3), y = 118 + Math.round((1 - k2) * 30);
      rect(60, y - 4, 200, 26, P.ink0); rect(60, y - 4, 200, 1, P.gold); rect(60, y + 21, 200, 1, P.gold);
      drawSprite(SPR.chars[un.id].idle, 66, y - 1, false);
      textO('NEW FIGHTER UNLOCKED', 160, y, Math.floor(un.t * 6) % 2 ? P.gold : P.paper, 1, 'c');
      textO(ch.hero + '  THE ' + ch.name.replace('THE ', ''), 160, y + 10, ch.color(), 1, 'c');
    }
  }
  // arrow on the screen edge pointing at an off-screen boss
  if (b && !b.dead && !lb) {
    const bx = b.x - fx.cam.x, by = b.y - 16 - fx.cam.y;
    if (bx < 4 || bx > W - 4 || by < 4 || by > H - 4) {
      const cx = W / 2, cy = H / 2, a = Math.atan2(by - cy, bx - cx);
      const m = Math.min((W / 2 - 14) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 14) / Math.abs(Math.sin(a) || 1e-6));
      const ax = cx + Math.cos(a) * m, ay = cy + Math.sin(a) * m, col = BOSSES[b.boss].col, pulse = Math.sin(G.time * 8) * 2;
      for (let i = 0; i < 7; i++) { const w = 7 - i; line(ax + Math.cos(a) * (i + pulse) - Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) + Math.cos(a) * w, ax + Math.cos(a) * (i + pulse) + Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) - Math.cos(a) * w, col); }
      glow(ax, ay, col, 10, 0.5);
      textO(Math.round(Math.hypot(b.x - G.p.x, b.y - G.p.y) / 8) + 'M', ax - Math.cos(a) * 12, ay - Math.sin(a) * 12 - 2, col, 1, 'c');
    }
  }
  // letterbox while a boss makes its entrance
  if (lb) {
    const k = ease(Math.min(1, (b.introMax ??= b.t, (b.introMax - b.t) / 0.4)));
    rect(0, 0, W, Math.round(22 * k), '#000'); rect(0, H - Math.round(22 * k), W, Math.round(22 * k), '#000');
    const bd = BOSSES[b.boss];
    if (k > 0.9) { textO(bd.name, W / 2, H - 16, bd.col, 1, 'c'); text(bd.sub, W / 2, H - 8, P.dust, 1, 'c'); }
  }

  const bn = menu || lb ? null : G.banner;
  if (bn) {
    const k = bn.t / bn.life, inK = ease(bn.t / 0.25), outK = k > 0.8 ? (k - 0.8) / 0.2 : 0, y = 52;
    const barW = Math.round(W * inK * (1 - outK));
    rect((W - barW) / 2, y - 6, barW, 1, bn.c); rect((W - barW) / 2, y + 22, barW, 1, bn.c);
    if (outK < 0.6) {
      const dx = Math.round((1 - inK) * 40);
      textO(bn.text, W / 2 + dx, y, bn.c, bn.text.length > 13 ? 2 : 3, 'c');
      if (bn.sub) textO(bn.sub, W / 2 - dx, y + 26, P.bone, 1, 'c');
    }
  }
  const low = p.hp <= 2 && p.hp > 0 ? 0.35 + Math.sin(G.time * 6) * 0.15 : 0, a = Math.max(fx.hurtVig * 0.8, low);
  if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(RED, 0, 0); ctx.globalAlpha = 1; }
}

// ---------- title ----------
const embers = [];
export function drawBackdrop(t, darken = 0.6) {
  const cx = Math.round(AW / 2 - W / 2 + Math.sin(t * 0.12) * 70), cy = Math.round(AH / 2 - H / 2 + Math.cos(t * 0.09) * 40);
  ctx.fillStyle = P.void; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(floor, -cx, -cy);
  ctx.drawImage(decal, -cx, -cy);
  dim(darken);
  if (embers.length < 60 && Math.random() < 0.5) embers.push({ x: Math.random() * W, y: H + 2, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 22, c: Math.random() < 0.5 ? P.ember : P.ember2, life: 4 + Math.random() * 4, t: 0 });
  for (const e of embers) { e.t += 1 / 60; e.x += (e.vx + Math.sin(e.t * 2 + e.y * 0.05) * 6) / 60; e.y += e.vy / 60; px(e.x, e.y, e.c); glow(e.x, e.y, e.c, 3, 0.4); }
  for (let i = embers.length - 1; i >= 0; i--) if (embers[i].t > embers[i].life || embers[i].y < -4) embers.splice(i, 1);
  vignette();
}

export const titleMenu = { sel: 0 };
export function titleItems(save, go) {
  const items = [];
  if (save) items.push({ label: 'CONTINUE', value: () => CHARS[save.char].name + '  WAVE ' + save.wave, act: () => go('continue') });
  items.push({ label: 'NEW RUN', act: () => go('select') });
  items.push({ label: 'SETTINGS', act: () => go('settings') });
  return items;
}
export function drawTitle(t, items) {
  drawBackdrop(t);
  const lx = Math.round((W - LOGO.width) / 2), ly = 22, mid = 16;
  const cyc = t % 3.2, cutK = cyc < 0.7 ? cyc / 0.7 : 0;
  glow(W / 2, ly + 16, P.ember, 60, 0.12);
  if (cutK > 0) {
    const off = Math.round(Math.sin(cutK * Math.PI) * 4);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, ly + mid); ctx.clip(); ctx.drawImage(LOGO, lx + off, ly - Math.round(off / 2)); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, ly + mid, W, H); ctx.clip(); ctx.drawImage(LOGO, lx - off, ly); ctx.restore();
    if (cutK < 0.5) { const lw = Math.round(W * Math.min(1, cutK * 4)); rect(0, ly + mid, lw, 1, P.paper); glow(lw, ly + mid, P.paper, 14, 0.6); }
  } else ctx.drawImage(LOGO, lx, ly);
  textO('THE KING SWALLOWED THE SUN. HOLD THE PIT.', W / 2, ly + 40, P.bone, 1, 'c');
  // the seven fighters parade under the logo
  const ids = roster();
  ids.forEach((id, i) => {
    const s = SPR.chars[id].run[Math.floor(t * 8 + i) % 4], x = W / 2 - (ids.length * 22) / 2 + i * 22 + 11 - s.w / 2;
    drawSprite(s, x, 92 - s.h - (Math.floor(t * 8 + i) % 2), false);
  });
  const mw = 150, mx = (W - mw) / 2, my = 104;
  rect(mx - 2, my - 6, mw + 4, items.length * 12 + 6, P.ink1);
  drawMenu(titleMenu, items, mx, my, mw, 12);
  const bline = best.score > 0 ? 'BEST ' + best.score + '   WAVE ' + best.wave + (best.won ? '   KING SLAIN' : '') : input.touch ? 'LEFT THUMB MOVES, RIGHT THUMB FIGHTS' : 'WASD MOVE   MOUSE AIM   CLICK ATTACK   SPACE DASH';
  textO(bline, W / 2, 158, best.score > 0 ? P.gold : P.dust, 1, 'c');
  text(input.touch ? 'TAP TO PICK' : 'ARROWS OR MOUSE, ENTER TO PICK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- character select ----------
export const sel = { i: 0, row: 0, t: 0 };
const NCH = OPTIONS.char.length, PW = 36, PG = 2, PX0 = Math.round((W - (NCH * PW + (NCH - 1) * PG)) / 2), PY = 12;
export const roster = () => OPTIONS.char.filter((id) => best.unlocked.includes(id));
const locked = (id) => !best.unlocked.includes(id);
const cycle = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
export function updateSelect(dt) {
  sel.t += dt;
  const ids = OPTIONS.char;
  const rows = 4;
  if (keyHit('ArrowUp', 'KeyW')) { sel.row = (sel.row + rows - 1) % rows; A.ui(); }
  if (keyHit('ArrowDown', 'KeyS')) { sel.row = (sel.row + 1) % rows; A.ui(); }
  const lr = keyHit('ArrowLeft', 'KeyA') ? -1 : keyHit('ArrowRight', 'KeyD') ? 1 : 0;
  if (lr) {
    A.ui();
    if (sel.row === 0) sel.i = (sel.i + lr + ids.length) % ids.length;
    else if (sel.row === 1) return { map: cycle(OPTIONS.map, settings.map, lr) };
    else if (sel.row === 2) return { diff: cycle(OPTIONS.diff, settings.diff, lr) };
  }
  for (let i = 0; i < ids.length; i++) {
    if (!inBox(PX0 + i * (PW + PG), PY, PW, 36)) continue;
    if (input.mouse.moved && sel.i !== i) { sel.i = i; sel.row = 0; A.ui(); }
    if (input.mouse.pressed) {
      sel.i = i; sel.row = 0; A.ui();
    }
  }
  for (const [row, y, key] of [[1, 126, 'map'], [2, 137, 'diff']]) {
    if (!inBox(12, y - 3, 296, 11)) continue;
    if (input.mouse.moved) sel.row = row;
    if (input.mouse.pressed) { A.ui(); return { [key]: cycle(OPTIONS[key], settings[key], input.mouse.x > W / 2 ? 1 : -1) }; }
  }
  const go = () => { if (locked(ids[sel.i])) { A.deny(); return null; } return { start: ids[sel.i] }; };
  if (inBox(W / 2 - 50, 151, 100, 12)) { if (input.mouse.moved) sel.row = 3; if (input.mouse.pressed) return go(); }
  if (keyHit('Enter', 'Space') && sel.t > 0.2) return go();
  if (keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 44 && input.mouse.y < 12)) return { back: true };
  return null;
}
export function drawSelect(t) {
  drawBackdrop(t, 0.75);
  const ids = OPTIONS.char, k = CHARS[ids[sel.i]], col = locked(ids[sel.i]) ? P.dust : k.color();
  text('CHOOSE YOUR FIGHTER', W / 2, 3, P.dust, 1, 'c');
  ids.forEach((id, i) => {
    const x = PX0 + i * (PW + PG), on = i === sel.i, ch = CHARS[id];
    rect(x - 1, PY - 1, PW + 2, 38, on ? ch.color() : P.ink0);
    rect(x, PY, PW, 36, on ? P.ink2 : P.ink1);
    if (on) glow(x + PW / 2, PY + 18, ch.color(), 16, 0.18);
    const lk = locked(id), s = on && !lk ? SPR.chars[id].run[Math.floor(t * 9) % 4] : SPR.chars[id].idle;
    ctx.save(); ctx.beginPath(); ctx.rect(x, PY, PW, 36); ctx.clip(); ctx.translate(x + PW / 2 - s.w, PY + 36 - s.h * 2 + Math.max(0, s.h * 2 - 36) / 2 - (on && !lk ? Math.floor(t * 9) % 2 : 0)); ctx.scale(2, 2); drawSprite(s, 0, 0, false, lk ? '#0a0810' : null); ctx.restore();
    if (lk) {
      // a small padlock over the silhouette
      const lx2 = x + PW / 2 - 4, ly2 = PY + 13;
      ring(lx2 + 4, ly2, 3, 1, P.dust); rect(lx2, ly2, 9, 7, P.stone2); rect(lx2 + 4, ly2 + 2, 1, 3, P.ink0);
    }
    const rec = best.chars[id];
    if (rec && rec.won) px(x + PW - 4, PY + 3, P.gold);
  });
  if (locked(ids[sel.i])) {
    const secret = ids[sel.i] === 'DEV';
    textO(secret ? '???' : k.hero, 12, 54, P.dust, 2);
    text(secret ? 'A SECRET FIGHTER' : k.name, 12 + (secret ? 3 : k.hero.length) * 8 + 4, 59, P.stone2);
    textO('LOCKED', 12, 70, P.blood);
    text('TO UNLOCK: ' + k.mission[0], 12, 82, P.gold);
    text(k.mission[1](), 12, 92, P.bone);
  } else {
  textO(k.hero, 12, 54, col, 2);
  if (k.hero !== k.name) text(k.name, 12 + k.hero.length * 8 + 4, 59, P.dust);
  text(k.lore[0], 12, 68, P.bone); text(k.lore[1], 12, 75, P.bone);
  const bars = [['POWER', k.bars.power], ['SPEED', k.bars.speed], ['RANGE', k.bars.range], ['TOUGH', k.bars.tough]];
  bars.forEach(([n, v], i) => { text(n, 206, 54 + i * 7, P.dust); for (let j = 0; j < 5; j++) rect(238 + j * 14, 55 + i * 7, 12, 3, j < v ? col : P.ink3); });
  const ab = [['CLICK', k.primaryName, ''], ['Q', k.q.name + ' ' + k.q.cost, k.q.desc], ['E', k.e.name + ' ' + k.e.cost, k.e.desc], ['R', k.r.name, k.r.desc]];
  ab.forEach(([key, name, d], i) => { const y = 86 + i * 8; text(key, 34, y, P.ember2, 1, 'r'); text(name, 40, y, P.paper); text(d, 308, y, P.dust, 1, 'r'); });
  const rec = best.chars[ids[sel.i]];
  if (rec) text('BEST WAVE ' + rec.wave + (rec.won ? '  KING SLAIN' : ''), 308, 75, P.gold, 1, 'r');
  }
  const rowsY = [[1, 126, 'ARENA', MAPS[settings.map].name, MAPS[settings.map].desc], [2, 137, 'DIFFICULTY', settings.diff, { EASY: 'MORE HEALTH, SOFTER FOES', NORMAL: 'THE INTENDED FIGHT', HARD: 'TOUGHER, FASTER, MORE', NIGHTMARE: 'EVERY HIT HURTS MORE' }[settings.diff]]];
  for (const [row, y, label, val, d] of rowsY) {
    const on = sel.row === row;
    if (on) { rect(12, y - 3, 296, 10, P.ink3); rect(12, y - 3, 2, 10, P.ember); }
    text(label, 20, y, on ? P.paper : P.dust);
    text((on ? '< ' : '') + val + (on ? ' >' : ''), 140, y, on ? P.ember2 : P.bone, 1, 'c');
    text(d, 304, y, P.stone2, 1, 'r');
  }
  const on = sel.row === 3, pulse = Math.floor(t * 3) % 2;
  rect(W / 2 - 50, 151, 100, 12, on ? col : P.ink3);
  textO('START', W / 2, 155, on && pulse ? P.ink0 : P.paper, 1, 'c', on ? col : P.ink0);
  if (input.touch) text('< BACK', 6, 3, P.dust); else text('ENTER START   ESC BACK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- settings ----------
export const setm = { tab: 0, sel: 0 };
const TABS = ['AUDIO', 'VIDEO', 'GAME'];
const pct = (v) => Math.round(v * 100) + '%';
const stepNum = (k, d, lo, hi) => (dir) => { settings[k] = Math.round(Math.min(hi, Math.max(lo, settings[k] + dir * d)) * 100) / 100; };
const stepList = (k) => (dir) => { settings[k] = cycle(OPTIONS[k], settings[k], dir); };
const toggle = (k) => () => { settings[k] = !settings[k]; };
export function settingsItems(ctxInfo) {
  if (setm.tab === 0) return [
    { label: 'MASTER VOLUME', value: () => pct(settings.master), adjust: stepNum('master', 0.1, 0, 1) },
    { label: 'MUSIC', value: () => pct(settings.music), adjust: stepNum('music', 0.1, 0, 1) },
    { label: 'SOUND EFFECTS', value: () => pct(settings.sfx), adjust: stepNum('sfx', 0.1, 0, 1) },
    { label: 'SOUNDTRACK', value: () => (settings.track === 'AUTO' ? 'AUTO (FOLLOWS THE FIGHT)' : settings.track), adjust: stepList('track') },
    { label: 'BATTLE MUSIC', value: () => settings.combat, adjust: stepList('combat') },
    { label: 'BACK', act: () => 'back' },
  ];
  if (setm.tab === 1) return [
    { label: 'COLOR THEME', value: () => settings.theme, adjust: stepList('theme') },
    { label: 'VIBRANCY', value: () => pct(settings.vibrancy), adjust: stepNum('vibrancy', 0.1, 0, 2) },
    { label: 'BRIGHTNESS', value: () => pct(settings.bright), adjust: stepNum('bright', 0.05, 0.6, 1.4) },
    { label: 'CONTRAST', value: () => pct(settings.contrast), adjust: stepNum('contrast', 0.05, 0.6, 1.6) },
    { label: 'HUE SHIFT', value: () => settings.hue + ' DEG', adjust: (d) => { settings.hue = (settings.hue + d * 15 + 360) % 360; } },
    { label: 'SCANLINES', value: () => (settings.crt ? 'ON' : 'OFF'), adjust: toggle('crt') },
    { label: 'SCREEN SHAKE', value: () => pct(settings.shake), adjust: stepNum('shake', 0.25, 0, 1) },
    { label: 'FLASHES', value: () => (settings.flash ? 'ON' : 'REDUCED'), adjust: toggle('flash') },
    { label: 'DAMAGE NUMBERS', value: () => (settings.numbers ? 'ON' : 'OFF'), adjust: toggle('numbers') },
    { label: 'PARTICLES', value: () => settings.particles, adjust: stepList('particles') },
    { label: 'BACK', act: () => 'back' },
  ];
  return [
    { label: 'ARENA', value: () => MAPS[settings.map].name, adjust: stepList('map') },
    { label: 'DIFFICULTY', value: () => settings.diff, adjust: stepList('diff') },
    { label: 'BLOOD STAINS', value: () => settings.blood, adjust: stepList('blood') },
    { label: 'VIBRATION', value: () => (canVibrate ? settings.vibe : settings.vibe + ' (NOT ON THIS DEVICE)'), adjust: (d) => { stepList('vibe')(d); buzz('heavy'); } },
    { label: 'RESET ALL SETTINGS', act: () => 'reset' },
    { label: 'ERASE SAVED RUN', act: () => 'erase', dimmed: !ctxInfo.hasSave },
    { label: 'BACK', act: () => 'back' },
  ];
}
export function updateSettings(items) {
  const tabKey = keyHit('KeyQ', 'PageUp') ? -1 : keyHit('KeyE', 'PageDown', 'Tab') ? 1 : 0;
  if (tabKey) { setm.tab = (setm.tab + tabKey + 3) % 3; setm.sel = 0; A.ui(); return 'changed'; }
  for (let i = 0; i < 3; i++) if (inBox(40 + i * 82, 14, 76, 11) && input.mouse.pressed) { setm.tab = i; setm.sel = 0; A.ui(); return 'changed'; }
  if (keyHit('Escape')) return 'back';
  const before = JSON.stringify(settings);
  const r = runMenu(setm, items, 40, 36, 240, 11);
  if (r) return r;
  return JSON.stringify(settings) !== before ? 'changed' : null;
}
export function drawSettings(t, items, inRun) {
  if (inRun) dim(0.82); else drawBackdrop(t, 0.7);
  textO('SETTINGS', W / 2, 3, P.paper, 1, 'c');
  TABS.forEach((n, i) => {
    const x = 40 + i * 82, on = setm.tab === i;
    rect(x, 14, 76, 11, on ? P.ember : P.ink2);
    text(n, x + 38, 17, on ? P.ink0 : P.dust, 1, 'c');
  });
  drawMenu(setm, items, 40, 36, 240, 11);
  if (setm.tab === 1) roster().forEach((id, i) => drawSprite(SPR.chars[id].run[Math.floor(t * 8 + i) % 4], 290, 36 + i * 18, false));
  if (setm.tab === 2 && inRun) text('ARENA AND DIFFICULTY APPLY TO YOUR NEXT RUN', W / 2, 106, P.stone2, 1, 'c');
  text(input.touch ? 'TAP A TAB, TAP LEFT OR RIGHT SIDE OF A ROW TO CHANGE IT' : 'Q / E SWITCH TABS   ARROWS CHANGE   ESC BACK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- upgrade pick ----------
export const upg = { opts: [], sel: 0, t: 0 };
export function openUpgrade() { upg.opts = rollUpgrades(G.taken, G.char); upg.sel = 0; upg.t = 0; }
const CW = 94, CH = 92, CG = 8, CY = 52;
const cardX = (i) => Math.round((W - (CW * 3 + CG * 2)) / 2 + i * (CW + CG));
export function updateUpgrade(rdt) {
  upg.t += rdt;
  if (upg.t < 0.6) return -1;
  for (let i = 0; i < 3; i++) if (keyHit('Digit' + (i + 1), 'Numpad' + (i + 1))) return i;
  if (keyHit('ArrowLeft', 'KeyA')) { upg.sel = (upg.sel + 2) % 3; A.ui(); }
  if (keyHit('ArrowRight', 'KeyD')) { upg.sel = (upg.sel + 1) % 3; A.ui(); }
  for (let i = 0; i < 3; i++) if (inBox(cardX(i), CY, CW, CH)) { if (input.mouse.moved && upg.sel !== i) { upg.sel = i; A.ui(); } if (input.mouse.pressed) return i; }
  if (keyHit('Enter', 'Space')) return upg.sel;
  return -1;
}
export function drawUpgrade() {
  dim(0.78);
  const k0 = ease(upg.t / 0.3), next = G.wave + 1;
  textO('WAVE ' + G.wave + ' CLEARED', W / 2, 14 - Math.round((1 - k0) * 10), P.ember3, 2, 'c');
  textO(isBossWave(next) ? 'NEXT: ' + BOSSES[bossFor(next)].name : 'TAKE ONE', W / 2, 32, isBossWave(next) ? P.blood : P.dust, 1, 'c');
  for (let i = 0; i < 3; i++) {
    const o = upg.opts[i], oc = C(o.c), k = back((upg.t - 0.08 - i * 0.07) / 0.35), on = upg.sel === i && upg.t > 0.3;
    const x = cardX(i), y = Math.round(CY + (1 - k) * -120) - (on ? 3 : 0);
    rect(x - 1, y - 1, CW + 2, CH + 2, on ? oc : P.ink0); rect(x, y, CW, CH, P.ink1);
    rect(x, y, CW, 1, on ? P.paper : P.ink3);
    const nm = typeof o.name === 'function' ? o.name(G.kit) : o.name;
    if (o.req) { rect(x, y, CW, CH, '#1d1608'); const gl = Math.floor(G.time * 8) % 2; rect(x - 1, y - 1, CW + 2, 1, gl ? P.gold : P.ember3); rect(x - 1, y + CH, CW + 2, 1, gl ? P.ember3 : P.gold); rect(x + 2, y + 3, CW - 4, 7, P.gold); text('EVOLUTION', x + CW / 2, y + 4, P.ink0, 1, 'c'); }
    else if (o.only && o.only.length === 1) { rect(x + CW - 30, y + 3, 27, 7, P.ink3); text('UNIQUE', x + CW - 16, y + 4, P.gold, 1, 'c'); }
    ctx.save(); ctx.translate(x + CW / 2 - 9, y + 10); ctx.scale(2, 2); drawSprite(icon(o.icon, oc), 0, 0, false); ctx.restore();
    if (on) glow(x + CW / 2, y + 19, oc, 16, 0.3);
    text(nm, x + CW / 2, y + 36, oc, 1, 'c');
    rect(x + 10, y + 44, CW - 20, 1, P.ink3);
    text(o.d[0], x + CW / 2, y + 50, P.bone, 1, 'c'); text(o.d[1], x + CW / 2, y + 58, P.bone, 1, 'c');
    const lv = G.taken[o.id] || 0;
    if (o.max > 1 && o.max < 99) text('LV ' + (lv + 1) + '/' + o.max + (lv + 1 === o.max && UPG_EVO[o.id] ? '  EVOLVES' : ''), x + CW / 2, y + 70, lv + 1 === o.max && UPG_EVO[o.id] ? P.gold : P.dust, 1, 'c');
    textO(String(i + 1), x + CW / 2, y + CH - 9, on ? P.paper : P.stone2, 1, 'c');
  }
  if (upg.t > 0.6) textO('1 2 3 / ARROWS + ENTER / CLICK', W / 2, H - 18, P.dust, 1, 'c');
}

// ---------- pause ----------
export const pauseMenu = { sel: 0 };
export function pauseItems(go) {
  return [
    { label: 'RESUME', act: () => go('resume') },
    { label: 'SETTINGS', act: () => go('settings') },
    { label: 'RESTART FROM WAVE ' + G.wave, act: () => go('restart') },
    { label: 'SAVE AND EXIT TO MENU', act: () => go('exit') },
  ];
}
export function drawPause(items) {
  dim(0.8);
  textO('PAUSED', W / 2, 22, P.paper, 3, 'c');
  text(G.kit.name + '   WAVE ' + G.wave + '   ' + MAPS[G.mapKey].name + '   ' + G.diffKey, W / 2, 46, P.dust, 1, 'c');
  drawMenu(pauseMenu, items, 70, 64, 180, 13);
  text('YOUR RUN SAVES AT THE START OF EVERY WAVE', W / 2, 150, P.stone2, 1, 'c');
  if (!input.touch) text('ESC TO RESUME', W / 2, 162, P.stone2, 1, 'c');
}

// ---------- game over & victory ----------
function stats(y0, t) {
  const rows = [['SCORE', String(G.score)], ['KILLS', String(G.kills)], ['LONGEST COMBO', String(G.maxCombo)], ['TOP RANK', RANKS[G.bestRank].l + '  ' + RANKS[G.bestRank].w]];
  rows.forEach((r, i) => {
    if (t < 0.4 + i * 0.12) return;
    const y = y0 + i * 11;
    text(r[0], 96, y, P.dust);
    text(r[1], 224, y, i === 3 ? C(RANKS[G.bestRank].c) : P.paper, 1, 'r');
  });
}
export function drawOver(t, isBest) {
  const k = ease(t / 0.6);
  dim(0.75 * k);
  textO('YOU FELL', W / 2, 26 - Math.round((1 - k) * 12), P.blood, 4, 'c');
  textO(G.kit.name + ' ON WAVE ' + G.wave, W / 2, 52, P.bone, 1, 'c');
  stats(72, t);
  if (isBest && t > 1 && Math.floor(t * 3) % 2) textO('NEW BEST', W / 2, 122, P.gold, 2, 'c');
  if (t > 1) textO(input.touch ? 'TAP LEFT  AGAIN       TAP RIGHT  MENU' : 'ENTER  SAME FIGHTER AGAIN     ESC  MENU', W / 2, 150, P.paper, 1, 'c');
}
export function drawVictory(t) {
  const k = ease(t / 0.8);
  dim(0.7 * k);
  for (let i = 0; i < 3; i++) glow(W / 2 + Math.sin(t + i * 2) * 80, 30 + Math.cos(t * 1.3 + i) * 10, P.gold, 30, 0.15);
  textO('VICTORY', W / 2, 18 - Math.round((1 - k) * 14), P.gold, 4, 'c');
  textO('THE ASHEN KING HAS FALLEN', W / 2, 44, P.ember3, 1, 'c');
  text(G.kit.name + '  ' + MAPS[G.mapKey].name + '  ' + G.diffKey, W / 2, 54, P.dust, 1, 'c');
  stats(70, t);
  if (t > 1.2) { textO((input.touch ? 'TAP LEFT' : 'ENTER') + '  KEEP GOING (ENDLESS)', W / 2, 128, P.paper, 1, 'c'); textO((input.touch ? 'TAP RIGHT' : 'ESC') + '  BACK TO MENU', W / 2, 140, P.dust, 1, 'c'); }
}

// ---------- opening: a press-to-begin gate (browsers need a gesture for sound), then the intro cinematic ----------
export const INTRO_LEN = 3.1;
const LETTER = (i) => 0.62 + i * 0.09;
const paradeX = (i, s) => W / 2 - (roster().length * 22) / 2 + i * 22 + 11 - s.w / 2;
export const INTRO_CUES = [
  [0, 'rift'], [0.35, 'riftCut'],
  ...Array.from({ length: 8 }, (_, i) => [LETTER(i) + 0.14, 'wall']),
  ...Array.from({ length: 7 }, (_, i) => [1.55 + i * 0.07, 'dash']),
  [2.3, 'ultRelease'],
];
export function drawSplash(t, touch) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const w = Math.round(60 + Math.sin(t * 2) * 10);
  rect(W / 2 - w / 2, H / 2 - 12, w, 1, P.ember);
  glow(W / 2, H / 2 - 12, P.ember, 20, 0.25 + Math.sin(t * 3) * 0.1);
  if (Math.floor(t * 1.6) % 2 === 0) text(touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', W / 2, H / 2, P.bone, 1, 'c');
  text('SOUND ON', W / 2, H / 2 + 14, P.stone2, 1, 'c');
}
export function drawIntro(t) {
  const lx = Math.round((W - LOGO.width) / 2), ly = 22;
  // shake from the most recent impact
  let sh = 0;
  for (const [ct, kind] of INTRO_CUES) if (t >= ct && t - ct < 0.15 && kind !== 'rift' && kind !== 'dash') sh = Math.max(sh, (kind === 'ultRelease' ? 5 : kind === 'riftCut' ? 4 : 2) * (1 - (t - ct) / 0.15));
  const ox = Math.round((Math.random() - 0.5) * sh * 2), oy = Math.round((Math.random() - 0.5) * sh * 2);
  ctx.save(); ctx.translate(ox, oy);
  if (t < 0.35) {
    ctx.fillStyle = '#000'; ctx.fillRect(-8, -8, W + 16, H + 16);
    const k = t / 0.35, x = Math.round(W * k);
    rect(0, H / 2, x, 1, P.paper); rect(0, H / 2 + 1, x, 1, P.ember);
    glow(x, H / 2, P.paper, 18, 0.8);
    ctx.restore();
    return;
  }
  drawBackdrop(t, 0.6);
  // logo letters slam down one at a time
  for (let i = 0; i < 8; i++) {
    const k = (t - LETTER(i)) / 0.14;
    if (k <= 0) continue;
    const y = k >= 1 ? 0 : -60 * (1 - k * k);
    ctx.save(); ctx.beginPath(); ctx.rect(lx + i * 24, 0, 24, H); ctx.clip();
    ctx.drawImage(LOGO, lx, ly + Math.round(y));
    ctx.restore();
    if (k >= 1 && k < 2.2) glow(lx + i * 24 + 12, ly + 28, P.ember, 14, 0.5 * (1 - (k - 1) / 1.2));
  }
  // the seven fighters dash in from both sides with trails
  roster().forEach((id, i) => {
    const k = Math.min(1, (t - (1.55 + i * 0.07)) / 0.28);
    if (k <= 0) return;
    const s = k < 1 ? SPR.chars[id].run[Math.floor(t * 16) % 4] : SPR.chars[id].idle, from = i % 2 ? W + 20 : -30;
    const tx = paradeX(i, s), y = 92 - s.h, e = 1 - Math.pow(1 - k, 3), x = from + (tx - from) * e;
    if (k < 1) for (let g = 1; g <= 3; g++) { ctx.globalAlpha = 0.25 / g; drawSprite(s, x - (tx - from) * 0.08 * g, y, from > tx, CHARS[id].color()); }
    ctx.globalAlpha = 1;
    drawSprite(s, x, y, from > tx && k < 1);
  });
  if (t > 2.3) {
    const k = (t - 2.3) / 0.8;
    ring(W / 2, ly + 16, 20 + k * 220, Math.max(1, Math.round(4 * (1 - k))), P.paper);
    ring(W / 2, ly + 16, 10 + k * 160, 1, P.ember);
    textO('THE KING SWALLOWED THE SUN. HOLD THE PIT.'.slice(0, Math.floor(k * 70)), W / 2, ly + 40, P.bone, 1, 'c');
  }
  ctx.restore();
  // the black halves split along the cut
  if (t < 0.8) {
    const k = Math.min(1, (t - 0.35) / 0.45), e = k * k, half = Math.round((H / 2) * (1 - e));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, -Math.round((H / 2) * e), W, H / 2); ctx.fillRect(0, H / 2 + Math.round((H / 2) * e), W, H / 2);
    if (half > 0) { rect(0, H / 2 - Math.round((H / 2) * e), W, 1, P.ember); rect(0, H / 2 + Math.round((H / 2) * e), W, 1, P.ember); }
  }
  if (t >= 0.35 && t < 0.55) { ctx.globalAlpha = (0.55 - t) / 0.2 * (settings.flash ? 0.8 : 0.15); ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (t >= 2.3 && t < 2.5) { ctx.globalAlpha = (2.5 - t) / 0.2 * (settings.flash ? 0.6 : 0.12); ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------- phone controls: a floating stick on the left, buttons on the right ----------
const PRIMARY_ICON = { BLADE: 'blade', GUNNER: 'gun', WIZARD: 'star', NINJA: 'cross', MECHANIC: 'gear', TANK: 'fist', ROBOT: 'bolt', DEV: 'eye' };
function drawTouch(p, kit, full) {
  const st = input.stick;
  if (st.id !== null) {
    ctx.globalAlpha = 0.35; ring(st.ox, st.oy, 22, 1, P.paper); ctx.globalAlpha = 0.6;
    ring(st.ox + st.dx * 22, st.oy + st.dy * 22, 8, 8, P.paper); ctx.globalAlpha = 1;
  } else if (G.time < 6) { ctx.globalAlpha = 0.3; ring(50, 135, 22, 1, P.paper); text('MOVE', 50, 133, P.paper, 1, 'c'); ctx.globalAlpha = 1; }
  const state = {
    attack: [true, 1, PRIMARY_ICON[G.char], kit.color()],
    dash: [p.charges > 0, p.charges > 0 ? 1 : 1 - p.dashCd / kit.dash.cd, 'dash', P.paper],
    q: [p.energy >= kit.q.cost && p.cdQ <= 0, Math.min(p.energy / kit.q.cost, 1 - Math.max(0, p.cdQ) / kit.q.cd), kit.q.icon, kit.color()],
    e: [p.energy >= kit.e.cost && p.cdE <= 0, Math.min(p.energy / kit.e.cost, 1 - Math.max(0, p.cdE) / kit.e.cd), kit.e.icon, kit.color()],
    r: [full, p.ult / 100, kit.r.icon, P.gold],
  };
  for (const b of TOUCH_BTNS) {
    if (b.id === 'pause') {
      ctx.globalAlpha = 0.5; ring(b.x, b.y, b.r, 1, P.paper); rect(b.x - 3, b.y - 3, 2, 6, P.paper); rect(b.x + 1, b.y - 3, 2, 6, P.paper); ctx.globalAlpha = 1;
      continue;
    }
    const [ready, frac, ic, col] = state[b.id], held = input.tb[b.id];
    ctx.globalAlpha = held ? 0.75 : 0.45;
    ring(b.x, b.y, b.r, b.r, held ? P.ink3 : P.ink1);
    ctx.globalAlpha = 1;
    if (!ready) { ctx.globalAlpha = 0.6; ring(b.x, b.y, Math.max(1, b.r * Math.min(1, frac)), Math.max(1, b.r * Math.min(1, frac)), P.ink3); ctx.globalAlpha = 1; }
    ring(b.x, b.y, b.r, 1, ready ? col : P.stone2);
    const s = icon(ic, ready ? col : P.stone2);
    if (b.id === 'attack') { ctx.save(); ctx.translate(b.x - 9, b.y - 9); ctx.scale(2, 2); drawSprite(s, 0, 0, false); ctx.restore(); }
    else drawSprite(s, b.x - 4, b.y - 4, false);
    if (b.id === 'r' && full) glow(b.x, b.y, P.gold, b.r + 6, 0.4);
    if (G.deny[b.id] > 0) ring(b.x, b.y, b.r + 1, 1, P.blood);
  }
}
export function touchBack(t) {
  if (!input.touch) return false;
  text('< BACK', 6, 3, P.dust);
  return input.mouse.pressed && input.mouse.x < 44 && input.mouse.y < 12;
}
