import { W, H, ctx, P, BAYER, makeCanvas, rect, px, line, ring, drawSprite, glow, text, textO, logoCanvas, hdBegin, hdActive, hdCtx, target } from './gfx.js?v=60';
import { loadModels, modelsReady, hasModel, modelFrame, modelFlat, modelStill } from './models.js?v=60';
import { SPR, icon } from './sprites.js?v=60';
import { input, keyHit, TOUCH_BTNS, STICK_X, STICK_Y, STICK_R } from './input.js?v=60';
import { A } from './audio.js?v=60';
import { settings, best, OPTIONS, isUnlocked } from './store.js?v=60';
import { TWISTS, multiName, G, fx, RANKS, floor, decal, AW, AH, isBossWave, buzz, canVibrate, bossLock } from './world.js?v=60';
import { CHARS } from './chars.js?v=60';
import { BOSSES, bossFor } from './bosses.js?v=60';
import { MAPS } from './maps.js?v=60';
import { rollUpgrades, UPGRADES } from './upgrades.js?v=60';
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
  // the HD layer covers the screen on the select screen: draw the same cursor on it
  if (hdActive()) {
    const h = hdCtx();
    for (const [dx, dy] of [[-4, 0], [-3, 0], [3, 0], [4, 0], [0, -4], [0, -3], [0, 3], [0, 4]]) { h.fillStyle = P.ink0; h.fillRect(x + dx + 1, y + dy + 1, 1, 1); h.fillStyle = c; h.fillRect(x + dx, y + dy, 1, 1); }
    h.fillStyle = P.ember; h.fillRect(x, y, 1, 1);
  }
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
  // the wave twist, tagged next to the wave number
  if (G.twist) { const tw = TWISTS[G.twist]; textO(tw.name, W - 12 - ('WAVE ' + G.wave).length * 4, 4, Math.floor(G.time * 2) % 2 ? tw.c : P.paper, 1, 'r'); }
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
    // phase marks where the boss changes, an enrage countdown, then the enraged tag
    for (const m of bd.marks || (bd.final ? [0.33, 0.66] : [0.5])) rect(x + Math.round(w * m), y - 1, 1, 5, P.ink0);
    if (b.enraged) textO('ENRAGED', x + w, y - 8, Math.floor(G.time * 6) % 2 ? P.blood : P.paper, 1, 'r');
    else if ((b.fightT || 0) > 45) textO('ENRAGE IN ' + Math.ceil(60 - b.fightT), x + w, y - 8, P.ember3, 1, 'r');
  }
  // multi-kill callout: pops in, colour climbs with the count, the bonus lands when the chain ends
  const mk = G.mkShow;
  if (mk && !lb) {
    const n = mk.n, col = n >= 9 ? '#ff4fa8' : n >= 6 ? P.blood : n >= 4 ? P.ember : n >= 3 ? P.gold : P.paper;
    const pop = mk.t < 0.08 ? 1 : 0, fade = mk.t > 1.2 && Math.floor(G.time * 20) % 2;
    if (!fade) {
      textO(multiName(n), W / 2, 24 - pop, col, 2 + pop, 'c');
      if (n >= 6) glow(W / 2, 29, col, 30, 0.12 + Math.sin(G.time * 12) * 0.04);
      if (mk.bonus) textO('+' + mk.bonus, W / 2, 38, P.gold, 1, 'c'); else if (n > 2) textO('X' + n, W / 2, 38, P.dust, 1, 'c');
    }
  }
  if (bossLock()) textO('GET READY', W / 2, H - 30, Math.floor(G.time * 4) % 2 ? P.paper : P.dust, 1, 'c');

  // a fighter was just unlocked
  const un = G.unlocks[0];
  if (un) {
    un.t += 1 / 60;
    if (un.t > 4) G.unlocks.shift();
    else {
      const ch = CHARS[un.id], k2 = ease(un.t / 0.3), y = 118 + Math.round((1 - k2) * 30);
      rect(60, y - 4, 200, 26, P.ink0); rect(60, y - 4, 200, 1, P.gold); rect(60, y + 21, 200, 1, P.gold);
      bust(SPR.chars[un.id].idle, 66, y - 1, 18);
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
    drawSprite(s, x, 97 - s.h - (Math.floor(t * 8 + i) % 2), false);
  });
  const mw = 150, mx = (W - mw) / 2, my = 104;
  rect(mx - 2, my - 6, mw + 4, items.length * 12 + 6, P.ink1);
  drawMenu(titleMenu, items, mx, my, mw, 12);
  const bline = best.score > 0 ? 'BEST ' + best.score + '   WAVE ' + best.wave + (best.won ? '   KING SLAIN' : '') : input.touch ? 'LEFT THUMB MOVES, RIGHT THUMB FIGHTS' : 'WASD MOVE   MOUSE AIM   CLICK ATTACK   SPACE DASH';
  textO(bline, W / 2, 158, best.score > 0 ? P.gold : P.dust, 1, 'c');
  text(input.touch ? 'TAP TO PICK' : 'ARROWS OR MOUSE, ENTER TO PICK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- character select ----------
// The chosen fighter stands big on the left: an animated portrait from model/, drawn on the HD layer
// so every one of its pixels shows. The roster is a grid of slanted face tiles on the right, with
// lore, stats, attacks, arena, difficulty and START under it.
export const sel = { i: 0, row: 0, t: 0, shown: -1, swap: 0 };
// draws only the top rows of a sprite (head and shoulders), optionally scaled
function bust(s, x, y, rows, scale = 1, tint = null) {
  ctx.drawImage(tint ? s.tint(tint, false) : s.n, 0, 0, s.w, rows, Math.round(x), Math.round(y), s.w * scale, rows * scale);
}
export const roster = () => OPTIONS.char.filter(isUnlocked);
const locked = (id) => !isUnlocked(id);
const cycle = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
// roster tiles: 4 x 2, each a parallelogram leaning right by SLANT pixels
const TW = 38, TH = 26, TG = 3, SLANT = 4, TX0 = 154, TY0 = 10;
const tilePos = (i) => [TX0 + (i % 4) * (TW + TG), TY0 + Math.floor(i / 4) * (TH + TG)];
const ROW_Y = { 1: 139, 2: 148 }, START_Y = 158, PANEL_C = 236;
export function updateSelect(dt) {
  sel.t += dt;
  loadModels();
  const ids = OPTIONS.char;
  const up = keyHit('ArrowUp', 'KeyW'), down = keyHit('ArrowDown', 'KeyS');
  // up and down walk the two tile rows first, then the arena, difficulty and START rows
  if (up || down) {
    A.ui();
    if (sel.row === 0 && down && sel.i < 4) sel.i += 4;
    else if (sel.row === 0 && up && sel.i >= 4) sel.i -= 4;
    else sel.row = (sel.row + (down ? 1 : 3)) % 4;
  }
  const lr = keyHit('ArrowLeft', 'KeyA') ? -1 : keyHit('ArrowRight', 'KeyD') ? 1 : 0;
  if (lr) {
    A.ui();
    if (sel.row === 0) sel.i = (sel.i + lr + ids.length) % ids.length;
    else if (sel.row === 1) return { map: cycle(OPTIONS.map, settings.map, lr) };
    else if (sel.row === 2) return { diff: cycle(OPTIONS.diff, settings.diff, lr) };
  }
  for (let i = 0; i < ids.length; i++) {
    const [x, y] = tilePos(i);
    if (!inBox(x, y, TW + SLANT, TH)) continue;
    if (input.mouse.moved && sel.i !== i) { sel.i = i; sel.row = 0; A.ui(); }
    if (input.mouse.pressed) { sel.i = i; sel.row = 0; A.ui(); }
  }
  for (const row of [1, 2]) {
    const y = ROW_Y[row], key = row === 1 ? 'map' : 'diff';
    if (!inBox(152, y - 2, 164, 9)) continue;
    if (input.mouse.moved) sel.row = row;
    if (input.mouse.pressed) { A.ui(); return { [key]: cycle(OPTIONS[key], settings[key], input.mouse.x > PANEL_C ? 1 : -1) }; }
  }
  const go = () => { if (locked(ids[sel.i])) { A.deny(); return null; } return { start: ids[sel.i] }; };
  if (inBox(PANEL_C - 40, START_Y, 80, 11)) { if (input.mouse.moved) sel.row = 3; if (input.mouse.pressed) return go(); }
  if (keyHit('Enter', 'Space') && sel.t > 0.2) return go();
  if (keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 44 && input.mouse.y < 12)) return { back: true };
  return null;
}
// The Dev's stats are corrupted: bars fill at random, jitter, change color and the labels scramble.
// The noise changes 12 times a second (not every frame) so it reads as a glitch, not a strobe.
const GLITCH_LABELS = { POWER: ['P0W3R', 'PWR??', 'ERR', 'P_WER'], SPEED: ['SP33D', 'S?EED', 'NULL', '0x5P'], RANGE: ['R4NG3', 'RANG#', 'UNDEF', 'R@NGE'], TOUGH: ['T0UGH', 'TOU??', 'NaN', 'T#UGH'] };
// stat bars in two columns; glitch scrambles them for The Dev
function drawBars(bars, col, t, glitch) {
  const tick = Math.floor(t * 12);
  const rnd = (n) => { const x = Math.sin(tick * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cols = ['#39ff6a', '#ff4fa8', P.paper, '#1a6a2a'];
  bars.forEach(([n, v], i) => {
    const lx = 154 + (i % 2) * 82, y = 85 + Math.floor(i / 2) * 7;
    if (!glitch) { text(n, lx, y, P.dust); for (let j = 0; j < 5; j++) rect(lx + 24 + j * 10, y + 1, 8, 3, j < v ? col : P.ink3); return; }
    const r0 = rnd(i), lab = r0 < 0.55 ? n : GLITCH_LABELS[n][Math.floor(rnd(i + 10) * 4)];
    const jx = rnd(i + 20) < 0.25 ? Math.round((rnd(i + 30) - 0.5) * 6) : 0;
    text(lab, lx + jx, y, r0 < 0.55 ? P.dust : cols[Math.floor(rnd(i + 40) * 3)]);
    const fill = Math.floor(rnd(i + 50) * 6);
    for (let j = 0; j < 5; j++) {
      const sx = rnd(i * 5 + j + 60) < 0.18 ? Math.round((rnd(i * 5 + j + 70) - 0.5) * 6) : 0;
      const w = rnd(i * 5 + j + 80) < 0.15 ? 3 + Math.floor(rnd(i * 5 + j + 90) * 10) : 8;
      rect(lx + 24 + j * 10 + jx + sx, y + 1, w, 3, j < fill ? cols[Math.floor(rnd(i * 5 + j + 100) * 4)] : P.ink3);
    }
    if (rnd(i + 110) < 0.2) text('?', lx + 24 + Math.floor(rnd(i + 120) * 48), y, '#ff4fa8');
  });
}
// one parallelogram tile path
function tilePath(x, y, c = ctx) {
  c.beginPath(); c.moveTo(x + SLANT, y); c.lineTo(x + TW + SLANT, y); c.lineTo(x + TW, y + TH); c.lineTo(x, y + TH); c.closePath();
}
const PANEL = [[0, 0], [150, 0], [132, H], [0, H]];
const panelPath = (c) => { c.beginPath(); PANEL.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
// the portrait's box in game units: the full screen height, centered in the left panel
const MW = 120, MH = 180, NAME = makeCanvas(150, 40);
// the big fighter on the left: slides in when picked, flashes white as it lands, then plays its loop
function drawHero(id, t, col, lk, h) {
  const e0 = (t - sel.swap) / 0.28, e = ease(e0), x0 = 12 - (1 - e) * 46;
  ctx.save(); panelPath(ctx); ctx.clip();
  rect(0, 0, 150, H, P.ink1);
  ctx.globalAlpha = 0.14 + (1 - e) * 0.25;
  for (let s = -H; s < 160; s += 9) { ctx.beginPath(); ctx.moveTo(s, H); ctx.lineTo(s + 3, H); ctx.lineTo(s + 3 + H * 0.35, 0); ctx.lineTo(s + H * 0.35, 0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
  ctx.globalAlpha = 1;
  glow(x0 + MW / 2, 70, col, 70, lk ? 0.08 : 0.24);
  // speed lines while it slides in
  if (e0 < 1) for (let i = 0; i < 7; i++) { const yy = 30 + ((i * 37) % 130); rect(0, yy, Math.round(90 * (1 - e)) + (i % 3) * 8, 1, P.paper); }
  ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x0 + MW / 2, 174, 34, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  // no portrait for this fighter yet (or still loading): the in-game sprite, big
  if (!hasModel(id) || !modelsReady()) {
    const s = SPR.chars[id].idles[Math.floor(t * 7) % 8], k = 6;
    ctx.globalAlpha = Math.min(1, e0 * 2.5 + 0.2);
    ctx.drawImage(lk ? s.tint('#07050b', false) : s.n, Math.round(x0 + MW / 2 - (s.w * k) / 2), 172 - s.h * k, s.w * k, s.h * k);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  line(150, 0, 132, H, col);
  if (!hasModel(id) || !modelsReady()) return;
  const img = lk ? modelFlat(id, '#07050b') : modelFrame(id, t);
  if (!img) return;
  h.save(); panelPath(h); h.clip();
  h.globalAlpha = Math.min(1, e0 * 2.5 + 0.2);
  h.drawImage(img, x0, 0, MW, MH);
  if (!lk && e0 >= 1 && e0 < 1.35) { h.globalAlpha = 1 - (e0 - 1) / 0.35; const wf = modelFlat(id, '#ffffff'); if (wf) h.drawImage(wf, x0, 0, MW, MH); }
  h.restore();
}
export function drawSelect(t) {
  drawBackdrop(t, 0.75);
  const ids = OPTIONS.char, id = ids[sel.i], k = CHARS[id], lk = locked(id), col = lk ? P.dust : k.color();
  if (sel.shown !== sel.i) { sel.shown = sel.i; sel.swap = t; }
  const [h] = hdBegin();
  drawHero(id, t, col, lk, h);
  // name over the left panel: painted into its own small canvas and put on the HD layer, above the portrait
  const secret = lk && id === 'DEV', ny = input.touch ? 12 : 6;
  const g = NAME.getContext('2d'); g.clearRect(0, 0, NAME.width, NAME.height); target(g);
  textO(secret ? '???' : k.hero, 8, ny, col, 2);
  text(secret ? 'A SECRET FIGHTER' : k.name, 8, ny + 13, lk ? P.stone2 : P.bone);
  const rec = best.chars[id];
  if (rec && !lk) text('BEST WAVE ' + rec.wave + (rec.won ? '  KING SLAIN' : ''), 8, ny + 20, P.gold);
  target(null);
  h.drawImage(NAME, 0, 0);
  // roster
  text('CHOOSE YOUR FIGHTER', PANEL_C, 2, P.dust, 1, 'c');
  ids.forEach((cid, i) => {
    const [x, y] = tilePos(i), on = i === sel.i, ch = CHARS[cid], tlk = locked(cid);
    ctx.save(); tilePath(x, y); ctx.fillStyle = on ? P.ink2 : P.ink1; ctx.fill(); ctx.clip();
    if (on) glow(x + TW / 2, y + TH / 2, ch.color(), 22, 0.25);
    // the in-game pixel fighter: the picked one runs, the others breathe and blink, locked ones are dark
    const set = SPR.chars[cid], s = on && !tlk ? set.run[Math.floor(t * 9) % 4] : tlk ? set.idle : set.idles[Math.floor(t * 7 + i * 3) % 8];
    // at 1x the whole fighter fits inside the tile
    bust(s, x + Math.round((TW + SLANT - s.w) / 2), y + TH - s.h - 4 - (on && !tlk ? Math.floor(t * 9) % 2 : 0), s.h, 1, tlk ? '#0a0810' : null);
    if (!on && !tlk) { ctx.globalAlpha = 0.3; rect(x, y, TW + SLANT, TH, P.ink0); ctx.globalAlpha = 1; }
    ctx.restore();
    tilePath(x, y); ctx.lineWidth = 1; ctx.strokeStyle = on ? ch.color() : P.ink3; ctx.stroke();
    if (tlk) { const lx = x + TW / 2 - 2, ly = y + 12; ring(lx + 4, ly, 3, 1, P.dust); rect(lx, ly, 9, 7, P.stone2); rect(lx + 4, ly + 2, 1, 3, P.ink0); }
    const r = best.chars[cid];
    if (r && r.won) px(x + TW + SLANT - 5, y + 3, P.gold);
    if (on) { const mx = x + TW / 2 + SLANT, my = y - 1 + (Math.floor(t * 4) % 2); for (let j = 0; j < 3; j++) rect(mx - j, my - 3 + j, 1 + j * 2, 1, ch.color()); }
  });
  if (lk) {
    textO('LOCKED', PANEL_C, 74, P.blood, 2, 'c');
    text('TO UNLOCK', PANEL_C, 92, P.dust, 1, 'c');
    text(k.mission[0], PANEL_C, 100, P.gold, 1, 'c');
    text(k.mission[1](), PANEL_C, 108, P.bone, 1, 'c');
  } else {
    text(k.lore[0], 154, 70, P.bone); text(k.lore[1], 154, 77, P.bone);
    drawBars([['POWER', k.bars.power], ['SPEED', k.bars.speed], ['RANGE', k.bars.range], ['TOUGH', k.bars.tough]], col, t, id === 'DEV');
    const ab = [['CLICK', k.primaryName], ...(k.charge ? [['HOLD', k.charge.name]] : []), ['Q', k.q.name + ' ' + k.q.cost], ['E', k.e.name + ' ' + k.e.cost], ['R', k.r.name]];
    ab.forEach(([key, name], i) => { const y = 101 + i * 7; text(key, 174, y, P.ember2, 1, 'r'); text(name, 178, y, P.paper); });
  }
  for (const [row, label, val] of [[1, 'ARENA', MAPS[settings.map].name], [2, 'DIFFICULTY', settings.diff]]) {
    const on = sel.row === row, y = ROW_Y[row];
    if (on) { rect(152, y - 2, 164, 9, P.ink3); rect(152, y - 2, 2, 9, P.ember); }
    text(label, 158, y, on ? P.paper : P.dust);
    text((on ? '< ' : '') + val + (on ? ' >' : ''), 312, y, on ? P.ember2 : P.bone, 1, 'r');
  }
  const on = sel.row === 3, pulse = Math.floor(t * 3) % 2;
  rect(PANEL_C - 40, START_Y, 80, 11, on ? col : P.ink3);
  textO('START', PANEL_C, START_Y + 3, on && pulse ? P.ink0 : P.paper, 1, 'c', on ? col : P.ink0);
  if (input.touch) text('< BACK', 6, 3, P.dust); else text('ENTER START   ESC BACK', PANEL_C, 173, P.stone2, 1, 'c');
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
    { label: 'RESOLUTION', value: () => (settings.res === 'AUTO' ? 'AUTO (FILL)' : settings.res === 'SHARP' ? 'SHARP (WHOLE ZOOM)' : settings.res.replace('X', ' X ')), adjust: stepList('res') },
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
  const r = runMenu(setm, items, 40, 36, 240, setm.tab === 1 ? 10 : 11);
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
  drawMenu(setm, items, 40, 36, 240, setm.tab === 1 ? 10 : 11);
  if (setm.tab === 1) roster().forEach((id, i) => bust(SPR.chars[id].idles[Math.floor(t * 7 + i * 3) % 8], 290, 34 + i * 17, 16));
  if (setm.tab === 2 && inRun) text('ARENA AND DIFFICULTY APPLY TO YOUR NEXT RUN', W / 2, 106, P.stone2, 1, 'c');
  text(input.touch ? 'TAP A TAB, TAP LEFT OR RIGHT SIDE OF A ROW TO CHANGE IT' : 'Q / E SWITCH TABS   ARROWS CHANGE   ESC BACK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- upgrade pick ----------
export const upg = { opts: [], sel: 0, t: 0 };
export function openUpgrade() { upg.opts = rollUpgrades(G.taken, G.char, isBossWave(G.wave)); upg.sel = 0; upg.t = 0; }
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
  const relicPick = upg.opts.some((o) => o.relic);
  textO(relicPick ? 'THE BOSS DROPPED RELICS. CHOOSE ONE' : isBossWave(next) ? 'NEXT: ' + BOSSES[bossFor(next)].name : 'TAKE ONE', W / 2, 32, relicPick ? '#ff4fa8' : isBossWave(next) ? P.blood : P.dust, 1, 'c');
  for (let i = 0; i < 3; i++) {
    const o = upg.opts[i], oc = C(o.c), k = back((upg.t - 0.08 - i * 0.07) / 0.35), on = upg.sel === i && upg.t > 0.3;
    const x = cardX(i), y = Math.round(CY + (1 - k) * -120) - (on ? 3 : 0);
    rect(x - 1, y - 1, CW + 2, CH + 2, on ? oc : P.ink0); rect(x, y, CW, CH, P.ink1);
    rect(x, y, CW, 1, on ? P.paper : P.ink3);
    const nm = typeof o.name === 'function' ? o.name(G.kit) : o.name;
    if (o.relic) { rect(x, y, CW, CH, '#1a0d1f'); const gl = Math.floor(G.time * 6) % 2; rect(x - 1, y - 1, CW + 2, 1, gl ? '#ff4fa8' : P.gold); rect(x - 1, y + CH, CW + 2, 1, gl ? P.gold : '#ff4fa8'); rect(x + 2, y + 3, CW - 4, 7, '#ff4fa8'); text('RELIC', x + CW / 2, y + 4, P.ink0, 1, 'c'); }
    else if (o.req) { rect(x, y, CW, CH, '#1d1608'); const gl = Math.floor(G.time * 8) % 2; rect(x - 1, y - 1, CW + 2, 1, gl ? P.gold : P.ember3); rect(x - 1, y + CH, CW + 2, 1, gl ? P.ember3 : P.gold); rect(x + 2, y + 3, CW - 4, 7, P.gold); text('EVOLUTION', x + CW / 2, y + 4, P.ink0, 1, 'c'); }
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
// two columns of run stats; each number counts up as it appears
function stats(y0, t) {
  const tm = Math.floor(G.time), clock = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0');
  const rows = [
    ['SCORE', G.score], ['TIME', clock],
    ['KILLS', G.kills], ['BOSSES SLAIN', G.bosses],
    ['DAMAGE DEALT', G.dmg], ['BEST MULTI', G.bestMulti >= 2 ? multiName(G.bestMulti) : '-'],
    ['LONGEST COMBO', G.maxCombo], ['PERFECT DODGES', G.perfects],
    ['TOP RANK', RANKS[G.bestRank].l + '  ' + RANKS[G.bestRank].w], ['LOOTLINGS', G.loot],
  ];
  rows.forEach((r, i) => {
    const t0 = 0.35 + i * 0.07;
    if (t < t0) return;
    const col = i % 2, x0 = col ? 166 : 22, x1 = col ? 298 : 154, y = y0 + Math.floor(i / 2) * 10;
    const k = Math.min(1, (t - t0) / 0.6), v = typeof r[1] === 'number' ? String(Math.round(r[1] * (1 - Math.pow(1 - k, 3)))) : r[1];
    text(r[0], x0, y, P.dust);
    text(v, x1, y, i === 8 ? C(RANKS[G.bestRank].c) : i === 0 ? P.gold : P.paper, 1, 'r');
  });
}
export function drawOver(t, isBest) {
  const k = ease(t / 0.6);
  dim(0.75 * k);
  textO('YOU FELL', W / 2, 26 - Math.round((1 - k) * 12), P.blood, 4, 'c');
  textO(G.kit.name + ' ON WAVE ' + G.wave, W / 2, 52, P.bone, 1, 'c');
  if (G.deathLine) text(G.deathLine, W / 2, 61, P.dust, 1, 'c');
  stats(72, t);
  if (isBest && t > 1 && Math.floor(t * 3) % 2) textO('NEW BEST', W / 2, 127, P.gold, 2, 'c');
  if (t > 1) textO(input.touch ? 'TAP LEFT  AGAIN       TAP RIGHT  MENU' : 'ENTER  SAME FIGHTER AGAIN     ESC  MENU', W / 2, 150, P.paper, 1, 'c');
}
export function drawVictory(t) {
  const k = ease(t / 0.8);
  dim(0.7 * k);
  for (let i = 0; i < 3; i++) glow(W / 2 + Math.sin(t + i * 2) * 80, 30 + Math.cos(t * 1.3 + i) * 10, P.gold, 30, 0.15);
  textO('VICTORY', W / 2, 18 - Math.round((1 - k) * 14), P.gold, 4, 'c');
  textO('THE ASHEN KING HAS FALLEN', W / 2, 44, P.ember3, 1, 'c');
  text(G.kit.name + '  ' + MAPS[G.mapKey].name + '  ' + G.diffKey, W / 2, 54, P.dust, 1, 'c');
  stats(66, t);
  if (t > 1.2) { textO((input.touch ? 'TAP LEFT' : 'ENTER') + '  KEEP GOING (ENDLESS)', W / 2, 128, P.paper, 1, 'c'); textO((input.touch ? 'TAP RIGHT' : 'ESC') + '  BACK TO MENU', W / 2, 140, P.dust, 1, 'c'); }
}

// ---------- opening: a press-to-begin gate (browsers need a gesture for sound), then the intro cinematic ----------
// The cinematic, any key skips it:
//   a white cut splits the black screen open on two lines of story,
//   all eight fighters cut in one after another: their big portrait slams in on a slanted band with
//   their name and attack sound (locked fighters show too, tagged LOCKED; only the secret one stays a
//   lit silhouette),
//   the eight stand side by side in slanted slices,
//   a slash wipes them away and the logo slams down letter by letter over the running roster.
const BEAT0 = 1.75, BEAT = 0.42, LINEUP = BEAT0 + 8 * BEAT, LOGO0 = LINEUP + 1.05;
export const INTRO_LEN = LOGO0 + 2.25;
const LETTER = (i) => LOGO0 + 0.12 + i * 0.07;
const PARADE = (i) => LOGO0 + 0.8 + i * 0.06, ULT = LOGO0 + 1.4;
const paradeX = (i, s) => W / 2 - (roster().length * 22) / 2 + i * 22 + 11 - s.w / 2;
const STORY = [[0.5, 'THE ASHEN KING SWALLOWED THE SUN.'], [1.1, 'EIGHT STILL STAND.']];
// a cue is [time, sound, phone buzz]; the beats play each fighter's own heavy attack as they land
export const INTRO_CUES = [
  [0, () => A.rift()], [0.35, () => A.riftCut(), 'heavy'],
  ...STORY.map(([t]) => [t, () => A.wall(), 'tap']),
  ...OPTIONS.char.flatMap((id, i) => [[BEAT0 + i * BEAT, () => A.dash()], [BEAT0 + i * BEAT + 0.1, () => A.charAtk(id, true), 'tap']]),
  ...OPTIONS.char.map((_, i) => [LINEUP + i * 0.05, () => A.wall()]),
  [LOGO0, () => A.riftCut(), 'heavy'],
  ...Array.from({ length: 8 }, (_, i) => [LETTER(i) + 0.1, () => A.wall(), 'tap']),
  ...Array.from({ length: 8 }, (_, i) => [PARADE(i), () => A.dash()]),
  [ULT, () => A.ultRelease(), 'heavy'],
];
// screen shake: [time, strength]
const SHAKES = [[0.35, 4], ...STORY.map(([t]) => [t, 1.5]), ...OPTIONS.char.map((_, i) => [BEAT0 + i * BEAT + 0.1, 3]), [LINEUP + 0.35, 2], [LOGO0, 4], ...Array.from({ length: 8 }, (_, i) => [LETTER(i) + 0.1, 2]), [ULT, 5]];
// the portraits load while the press-to-begin gate waits; one still is painted per frame
let warm = 0;
function warmPortraits() {
  loadModels();
  if (!modelsReady() || warm >= OPTIONS.char.length * 2) return;
  const id = OPTIONS.char[warm % 8];
  if (warm < 8) modelStill(id); else modelFlat(id, hidden(id) ? '#07050b' : '#ffffff');
  warm++;
}
export function drawSplash(t, touch) {
  warmPortraits();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const w = Math.round(60 + Math.sin(t * 2) * 10);
  rect(W / 2 - w / 2, H / 2 - 12, w, 1, P.ember);
  glow(W / 2, H / 2 - 12, P.ember, 20, 0.25 + Math.sin(t * 3) * 0.1);
  if (Math.floor(t * 1.6) % 2 === 0) text(touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', W / 2, H / 2, P.bone, 1, 'c');
  text('SOUND ON', W / 2, H / 2 + 14, P.stone2, 1, 'c');
}
const veil = (a, col = P.paper) => { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a) * (settings.flash ? 1 : 0.2); rect(0, 0, W, H, col); ctx.globalAlpha = 1; };
// the portrait (or, while it loads, the big sprite) for one fighter; the secret fighter is a silhouette
const hidden = (id) => id === 'DEV' && locked(id);
function portrait(id) {
  if (!hasModel(id) || !modelsReady()) return null;
  return hidden(id) ? modelFlat(id, '#07050b') : modelStill(id);
}
// one fighter's beat: a slanted band in their color, the portrait slamming in from its side, the name
// slamming down on the other side
function drawBeat(i, t, h) {
  const id = OPTIONS.char[i], ch = CHARS[id], lk = hidden(id), col = lk ? P.dust : ch.color(), right = i % 2 === 1;
  const k = ease(t / 0.16), dir = right ? 1 : -1;
  rect(-10, -10, W + 20, H + 20, P.void);
  // speed lines in the fighter's color, rushing the way the portrait came from
  for (let j = 0; j < 22; j++) {
    const y = (j * 37 + i * 13) % H, len = 24 + ((j * 53) % 80), run = (t * 900 * (1 + (j % 3) * 0.4) + j * 71) % (W + 200);
    const x = right ? W + 100 - run : run - 100 - len;
    line(x, y, x + len, y, j % 4 ? P.ink2 : col);
  }
  ctx.save(); ctx.translate(W / 2, H / 2 + 10); ctx.rotate(right ? 0.18 : -0.18);
  const bh = 78 * ease(t / 0.12);
  rect(-W, -bh / 2, W * 2, bh, P.ink1); rect(-W, -bh / 2, W * 2, 2, col); rect(-W, bh / 2 - 2, W * 2, 2, col);
  for (let j = 0; j < 12; j++) rect(-W + ((j * 60 + t * 220 * -dir + 4000) % (W * 2)), -bh / 2 + 5, 18, Math.max(0, bh - 10), P.ink0);
  ctx.restore();
  // the portrait: 160 x 240, a third off the bottom, sliding in with afterimages and drifting slowly
  const pic = portrait(id), PW = 160 * (1 + t * 0.06), PH = PW * 1.5;
  const tx = right ? W - PW + 6 : -6, from = right ? W + 40 : -PW - 40, x = from + (tx - from) * k - dir * t * 10, y = -14 - (PH - 240) * 0.3;
  glow(x + PW / 2, H / 2, col, 80, lk ? 0.12 : 0.32);
  if (pic) {
    if (lk) { h.globalAlpha = 0.9; const rim = modelFlat(id, col) || pic; h.drawImage(rim, x - 1.5, y, PW, PH); h.drawImage(rim, x + 1.5, y, PW, PH); h.globalAlpha = 1; }
    if (k < 1) for (let g = 3; g >= 1; g--) { h.globalAlpha = 0.3 / g; h.drawImage(modelFlat(id, col) || pic, x + dir * g * 22, y, PW, PH); }
    h.globalAlpha = 1;
    h.drawImage(pic, x, y, PW, PH);
    if (!lk && t > 0.1 && t < 0.24) { h.globalAlpha = 1 - (t - 0.1) / 0.14; h.drawImage(modelFlat(id, '#ffffff') || pic, x, y, PW, PH); h.globalAlpha = 1; }
  } else {
    const s = SPR.chars[id].idles[Math.floor(t * 7) % 8], S = 6, sx = Math.round(x + PW / 2 - (s.w * S) / 2), sy = 176 - s.h * S;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(S, S); drawSprite(s, 0, 0, right, lk ? '#07050b' : t > 0.1 && t < 0.16 ? P.paper : null); ctx.restore();
  }
  // the name, on the other half
  const nx = right ? 82 : 238, nk = ease((t - 0.08) / 0.1);
  if (t > 0.08) {
    const secret = lk && id === 'DEV';
    textO(secret ? '???' : ch.hero, nx, 62 - Math.round((1 - nk) * 26), nk < 1 ? col : P.paper, 3, 'c');
    const sub = secret ? 'A SECRET FIGHTER' : 'THE ' + ch.name.replace('THE ', ''), n = Math.min(sub.length, Math.floor((t - 0.14) * 70));
    if (n > 0) textO(sub.slice(0, n), nx, 90, col, 1, 'c');
    rect(nx - 50 * ease((t - 0.14) / 0.2), 100, 100 * ease((t - 0.14) / 0.2), 1, col);
    if (locked(id) && t > 0.22) text('LOCKED', nx, 106, P.stone2, 1, 'c');
  }
  // the slash that cuts to this beat
  if (t < 0.14) {
    const sk = ease(t / 0.06);
    ctx.globalAlpha = 1 - t / 0.14;
    const y0 = right ? H * 0.15 : H * 0.85, y1 = right ? H * 0.85 : H * 0.15;
    line(-10, y0, -10 + (W + 20) * sk, y0 + (y1 - y0) * sk, P.paper, 3);
    ctx.globalAlpha = 1;
  }
}
// where each fighter's face sits on its portrait (0-1 across, 0-1 down), for the lineup slices
const FOCUS = { BLADE: [0.68, 0.2], GUNNER: [0.6, 0.25], WIZARD: [0.57, 0.23], NINJA: [0.6, 0.21], MECHANIC: [0.57, 0.19], TANK: [0.57, 0.27], ROBOT: [0.5, 0.16], DEV: [0.5, 0.25] };
// all eight side by side in slanted slices, dropping in from alternate sides
function drawLineup(t, h) {
  rect(-10, -10, W + 20, H + 20, P.void);
  const SW = W / 8, SL = 14;
  OPTIONS.char.forEach((id, i) => {
    const k = ease((t - i * 0.05) / 0.22);
    if (k <= 0) return;
    const lk = hidden(id), col = lk ? P.dust : CHARS[id].color(), dy = Math.round((i % 2 ? 1 : -1) * (1 - k) * H), x0 = i * SW;
    const path = (c) => { c.beginPath(); c.moveTo(x0 + SL / 2, dy); c.lineTo(x0 + SW + SL / 2, dy); c.lineTo(x0 + SW - SL / 2, H + dy); c.lineTo(x0 - SL / 2, H + dy); c.closePath(); };
    ctx.save(); path(ctx); ctx.clip(); rect(x0 - SL, dy, SW + SL * 2, H, P.ink1); glow(x0 + SW / 2, H / 2 + dy, col, 40, 0.3); ctx.restore();
    const pic = portrait(id), [fx0, fy0] = FOCUS[id];
    if (pic) {
      const PW = 150, PH = 225, px0 = x0 + SW / 2 - PW * fx0, py0 = 60 - PH * fy0 + dy;
      h.save(); path(h); h.clip();
      if (lk) { const rim = modelFlat(id, col) || pic; h.drawImage(rim, px0 - 1, py0, PW, PH); h.drawImage(rim, px0 + 1, py0, PW, PH); }
      h.drawImage(pic, px0, py0, PW, PH);
      if (k < 1) { h.globalAlpha = 1 - k; h.drawImage(modelFlat(id, col) || pic, px0, py0, PW, PH); }
      h.restore();
    } else {
      const s = SPR.chars[id].idles[Math.floor(t * 7 + i) % 8], S = 4;
      ctx.save(); path(ctx); ctx.clip(); ctx.translate(Math.round(x0 + SW / 2 - (s.w * S) / 2), Math.round(150 - s.h * S + dy)); ctx.scale(S, S); drawSprite(s, 0, 0, false, lk ? '#07050b' : null); ctx.restore();
    }
    // the slice edges glow in the fighter's color
    line(x0 + SW + SL / 2, dy, x0 + SW - SL / 2, H + dy, col);
  });
  // on the HD layer, above the portraits
  if (t > 0.45 && h) { h.globalAlpha = 0.75 * ease((t - 0.45) / 0.15); h.fillStyle = P.void; h.fillRect(0, H - 27, W, 20); h.globalAlpha = 1; target(h); textO('HOLD THE PIT', W / 2, H - 20, P.paper, 2, 'c'); target(null); }
  else if (t > 0.45) textO('HOLD THE PIT', W / 2, H - 20, P.paper, 2, 'c');
}
// the logo: letters slam down one at a time over the arena, the fighters run in under it
function drawLogoPhase(t) {
  const lx = Math.round((W - LOGO.width) / 2), ly = 22;
  drawBackdrop(t, 0.6);
  glow(W / 2, ly + 16, P.ember, 70, 0.14);
  for (let i = 0; i < 8; i++) {
    const k = (t - LETTER(i)) / 0.1;
    if (k <= 0) continue;
    const y = k >= 1 ? 0 : -60 * (1 - k * k);
    ctx.save(); ctx.beginPath(); ctx.rect(lx + i * 24, 0, 24, H); ctx.clip();
    ctx.drawImage(LOGO, lx, ly + Math.round(y));
    ctx.restore();
    if (k >= 1 && k < 2.6) glow(lx + i * 24 + 12, ly + 28, P.ember, 16, 0.55 * (1 - (k - 1) / 1.6));
  }
  roster().forEach((id, i) => {
    const k = Math.min(1, (t - PARADE(i)) / 0.28);
    if (k <= 0) return;
    const s = k < 1 ? SPR.chars[id].run[Math.floor(t * 16) % 4] : SPR.chars[id].idles[Math.floor(t * 7 + i * 3) % 8], from = i % 2 ? W + 20 : -30;
    const tx = paradeX(i, s), y = 97 - s.h, e = 1 - Math.pow(1 - k, 3), x = from + (tx - from) * e;
    if (k < 1) for (let g = 1; g <= 3; g++) { ctx.globalAlpha = 0.25 / g; drawSprite(s, x - (tx - from) * 0.08 * g, y, from > tx, CHARS[id].color()); }
    ctx.globalAlpha = 1;
    drawSprite(s, x, y, from > tx && k < 1);
  });
  if (t > ULT) {
    const k = (t - ULT) / 0.8;
    ring(W / 2, ly + 16, 20 + k * 220, Math.max(1, Math.round(4 * (1 - k))), P.paper);
    ring(W / 2, ly + 16, 10 + k * 160, 1, P.ember);
    textO('THE KING SWALLOWED THE SUN. HOLD THE PIT.'.slice(0, Math.floor(k * 70)), W / 2, ly + 40, P.bone, 1, 'c');
  }
}
export function drawIntro(t) {
  warmPortraits();
  let sh = 0;
  for (const [ct, s] of SHAKES) if (t >= ct && t - ct < 0.15) sh = Math.max(sh, s * (1 - (t - ct) / 0.15));
  sh *= settings.shake;
  const ox = Math.round((Math.random() - 0.5) * sh * 2), oy = Math.round((Math.random() - 0.5) * sh * 2);
  // the first cut: a white line runs across the black screen
  if (t < 0.35) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const x = Math.round(W * (t / 0.35));
    rect(0, H / 2, x, 1, P.paper); rect(0, H / 2 + 1, x, 1, P.ember);
    glow(x, H / 2, P.paper, 18, 0.8);
    return;
  }
  ctx.save(); ctx.translate(ox, oy);
  const usesHd = t >= BEAT0 && t < LOGO0, [h] = usesHd ? hdBegin() : [null];
  if (h) { h.save(); h.translate(ox, oy); }
  if (t < BEAT0) {
    // the story, typed over the dark arena
    drawBackdrop(t, 0.85);
    STORY.forEach(([s, line_], j) => {
      if (t < s) return;
      const n = Math.min(line_.length, Math.floor((t - s) * 60));
      textO(line_.slice(0, n), W / 2, 70 + j * 22, j ? P.ember3 : P.bone, j ? 2 : 1, 'c');
    });
    // the screen closes to black for the first fighter
    if (t > BEAT0 - 0.2) { ctx.globalAlpha = (t - (BEAT0 - 0.2)) / 0.2; rect(-10, -10, W + 20, H + 20, P.void); ctx.globalAlpha = 1; }
  } else if (t < LINEUP) {
    const i = Math.floor((t - BEAT0) / BEAT);
    drawBeat(i, t - BEAT0 - i * BEAT, h);
  } else if (t < LOGO0) drawLineup(t - LINEUP, h);
  else drawLogoPhase(t);
  ctx.restore();
  if (h) h.restore();
  // the black halves split along the first cut
  if (t < 0.8) {
    const k = Math.min(1, (t - 0.35) / 0.45), e = k * k;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, -Math.round((H / 2) * e), W, H / 2); ctx.fillRect(0, H / 2 + Math.round((H / 2) * e), W, H / 2);
    rect(0, H / 2 - Math.round((H / 2) * e), W, 1, P.ember); rect(0, H / 2 + Math.round((H / 2) * e), W, 1, P.ember);
  }
  // flashes: the first cut, a soft one on each fighter, and white wipes into the logo and the ultimate ring
  veil((0.55 - t) / 0.2 * 0.8 * (t < 0.55 ? 1 : 0));
  if (t >= BEAT0 && t < LINEUP) { const bt = (t - BEAT0) % BEAT; if (bt > 0.1 && bt < 0.2) veil((0.2 - bt) / 0.1 * 0.3); }
  if (t >= LOGO0 - 0.12 && t < LOGO0 + 0.25) {
    const a = t < LOGO0 ? (t - (LOGO0 - 0.12)) / 0.12 : 1 - (t - LOGO0) / 0.25;
    veil(a * 0.95);
    if (t < LOGO0 && h) { h.globalAlpha = a * (settings.flash ? 1 : 0.2); h.fillStyle = P.paper; h.fillRect(0, 0, W, H); h.globalAlpha = 1; }
  }
  if (t >= ULT && t < ULT + 0.2) veil((ULT + 0.2 - t) / 0.2 * 0.6);
}

// ---------- phone controls: a fixed stick on the left, buttons on the right (drag the attack button to aim) ----------
const PRIMARY_ICON = { BLADE: 'blade', GUNNER: 'gun', WIZARD: 'star', NINJA: 'cross', MECHANIC: 'gear', TANK: 'fist', ROBOT: 'bolt', DEV: 'eye' };
function drawTouch(p, kit, full) {
  // the fixed movement stick: always visible, brighter while held
  const st = input.stick, on = st.id !== null;
  ctx.globalAlpha = on ? 0.45 : 0.25; ring(STICK_X, STICK_Y, STICK_R, 1, P.paper); ring(STICK_X, STICK_Y, STICK_R - 1, 1, P.ink0);
  ctx.globalAlpha = on ? 0.7 : 0.35; ring(st.x, st.y, 8, 8, P.paper); ctx.globalAlpha = 1;
  if (!on && G.time < 6) { ctx.globalAlpha = 0.5; text('MOVE', STICK_X, STICK_Y - 30, P.paper, 1, 'c'); ctx.globalAlpha = 1; }
  // swipe-aim: a line out of the fighter while the attack thumb drags
  const am = input.aim;
  if (am.active) {
    const px0 = p.x - fx.cam.x - fx.ox, py0 = p.y - 6 - fx.cam.y - fx.oy, ca = Math.cos(am.a), sa = Math.sin(am.a);
    for (let i = 10; i < 60; i += 6) { ctx.globalAlpha = 0.8 - i / 80; line(px0 + ca * i, py0 + sa * i, px0 + ca * (i + 3), py0 + sa * (i + 3), kit.color()); }
    ctx.globalAlpha = 1;
  }
  // aimed skill held: a line and a landing ring out of the fighter, red while it will cancel
  const sk = input.skill;
  if (sk.id !== null && sk.was) {
    const px0 = p.x - fx.cam.x - fx.ox, py0 = p.y - 6 - fx.cam.y - fx.oy, ca = Math.cos(sk.a), sa = Math.sin(sk.a);
    const col = sk.cancel ? P.blood : sk.key === 'r' ? P.gold : kit.color(), L = 18 + sk.k * 70;
    ctx.globalAlpha = sk.cancel ? 0.35 : 0.85;
    for (let i = 8; i < L; i += 5) line(px0 + ca * i, py0 + sa * i, px0 + ca * (i + 3), py0 + sa * (i + 3), col);
    ring(px0 + ca * L, py0 + sa * L, 5, 1, col); px(px0 + ca * L, py0 + sa * L, col);
    ctx.globalAlpha = 1;
    const b = TOUCH_BTNS.find((t) => t.id === sk.key);
    if (sk.cancel) textO('CANCEL', b.x - b.r - 4, b.y - 3, P.blood, 1, 'r');
    else textO('BACK TO CANCEL', W - 4, 60, P.dust, 1, 'r');
  }
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
    if (sk.key === b.id && sk.was) { const l = Math.min(b.r - 3, Math.hypot(sk.dx, sk.dy)); ring(b.x + Math.cos(sk.a) * l, b.y + Math.sin(sk.a) * l, 3, 3, sk.cancel ? P.blood : col); }
    if (sk.key === b.id && sk.cancel) ring(b.x, b.y, b.r + 1, 1, P.blood);
    if (b.id === 'attack' && am.active) { const l = Math.min(b.r - 4, Math.hypot(am.dx, am.dy)); ring(b.x + Math.cos(am.a) * l, b.y + Math.sin(am.a) * l, 5, 5, kit.color()); }
    if (b.id === 'attack') { ctx.save(); ctx.translate(b.x - 9, b.y - 9); ctx.scale(2, 2); drawSprite(s, 0, 0, false); ctx.restore(); }
    else drawSprite(s, b.x - 4, b.y - 4, false);
    if (b.id === 'r' && full) glow(b.x, b.y, P.gold, b.r + 6, 0.4);
    if (G.deny[b.id] > 0) ring(b.x, b.y, b.r + 1, 1, P.blood);
  }
}
// ---------- lock-in: the cinematic after you confirm a fighter ----------
export const LOCK_LEN = 1.45;
export function drawLockin(t, id) {
  const ch = CHARS[id], col = ch.color(), set = SPR.chars[id];
  const slam = t > 0.36 && t < 0.62 ? (0.62 - t) / 0.26 : 0;
  ctx.save();
  if (slam) ctx.translate(Math.round((Math.random() - 0.5) * 8 * slam), Math.round((Math.random() - 0.5) * 5 * slam));
  rect(-10, -10, W + 20, H + 20, P.void);
  // speed lines rushing past
  for (let i = 0; i < 28; i++) {
    const y = (i * 37 + 11) % H, len = 30 + ((i * 53) % 90), x = W + 120 - ((t * 760 * (1 + (i % 3) * 0.5) + i * 61) % (W + 260));
    line(x, y, x + len, y, i % 4 ? P.ink2 : col);
  }
  // a tilted band the fighter stands on
  ctx.save(); ctx.translate(W / 2, H / 2 + 6); ctx.rotate(-0.16);
  const bh = 70 * ease(t / 0.22);
  rect(-W, -bh / 2, W * 2, bh, P.ink1); rect(-W, -bh / 2, W * 2, 2, col); rect(-W, bh / 2 - 2, W * 2, 2, col);
  for (let i = 0; i < 12; i++) rect(-W + ((i * 60 + t * 140) % (W * 2)), -bh / 2 + 4, 20, Math.max(0, bh - 8), P.ink0);
  ctx.restore();
  // the fighter's big portrait dashes in on the HD layer with afterimages, flashes white as the slash
  // lands, then plays its loop. Without the portrait (still loading) the 5x sprite does the same.
  const pic = modelFrame(id, t);
  if (pic) {
    // bigger than the screen: the poster runs off the bottom edge, and pushes in slowly once it lands
    const [h] = hdBegin(), k = ease((t - 0.06) / 0.28), push = 1 + Math.max(0, t - 0.34) * 0.05;
    const MW2 = 156 * push, MH2 = 234 * push, x = -170 + (2 + 170) * k - (MW2 - 156) / 2, y = -16 - (MH2 - 234) * 0.3;
    h.save();
    if (slam) h.translate(Math.round((Math.random() - 0.5) * 8 * slam), Math.round((Math.random() - 0.5) * 5 * slam));
    glow(x + MW2 / 2, H / 2, col, 70, 0.3);
    if (k < 1) for (let g = 4; g >= 1; g--) { h.globalAlpha = 0.3 / g; h.drawImage(modelFlat(id, col) || pic, x - g * 18, y, MW2, MH2); }
    h.globalAlpha = 1;
    h.drawImage(pic, x, y, MW2, MH2);
    if (t > 0.36 && t < 0.5) { h.globalAlpha = 1 - (t - 0.36) / 0.14; h.drawImage(modelFlat(id, '#ffffff') || pic, x, y, MW2, MH2); h.globalAlpha = 1; }
    h.restore();
  }
  // the fighter dashes in at 5x with afterimages, then settles and breathes
  const S = 5, k = ease((t - 0.06) / 0.28), fr = k < 1 ? set.run[Math.floor(t * 18) % 4] : set.idles[Math.floor(t * 7) % 8];
  if (!pic) {
  const tx = 34, x = -130 + (tx + 130) * k, y = Math.round(H / 2 + 8 - (fr.h * S) / 2 + (k >= 1 && Math.floor(t * 3) % 2 ? 1 : 0));
  if (k < 1) for (let g = 4; g >= 1; g--) {
    ctx.globalAlpha = 0.35 / g; ctx.save(); ctx.translate(Math.round(x - g * 16), y); ctx.scale(S, S); drawSprite(fr, 0, 0, false, col); ctx.restore();
  }
  ctx.globalAlpha = 1;
  glow(x + (fr.w * S) / 2, y + (fr.h * S) / 2, col, 60, 0.25);
  ctx.save(); ctx.translate(Math.round(x), y); ctx.scale(S, S); drawSprite(fr, 0, 0, false, t > 0.36 && t < 0.42 ? P.paper : null); ctx.restore();
  // eyes flare once the name lands
  if (t > 0.6) { const [ex, ey] = set.eye, a = Math.max(0, 1 - (t - 0.6) * 2.2); glow(x + ex * S + S / 2, y + ey * S + S / 2, ch.eyeColor || col, 10 + 24 * a, 0.5 + a * 0.4); }
  }
  // the slash across the screen
  if (t > 0.3 && t < 0.62) {
    const sk = ease((t - 0.3) / 0.08), fade = t > 0.45 ? 1 - (t - 0.45) / 0.17 : 1;
    ctx.globalAlpha = Math.max(0, fade);
    line(-10, H * 0.82, -10 + (W + 20) * sk, H * 0.82 - (W + 20) * sk * 0.5, P.paper, 3);
    line(-10, H * 0.82 + 3, -10 + (W + 20) * sk, H * 0.82 + 3 - (W + 20) * sk * 0.5, col, 1);
    ctx.globalAlpha = 1;
  }
  // the name slams down, then the title types in
  if (t > 0.36) {
    const nk = ease((t - 0.36) / 0.12);
    textO(ch.hero, 222, 50 - Math.round((1 - nk) * 30), nk < 1 ? col : P.paper, nk < 1 ? 4 : 3, 'c');
  }
  if (t > 0.52) {
    const sub = 'THE ' + ch.name.replace('THE ', ''), n = Math.min(sub.length, Math.floor((t - 0.52) * 40));
    textO(sub.slice(0, n), 222, 82, col, 1, 'c');
    rect(222 - 60 * ease((t - 0.6) / 0.25), 94, 120 * ease((t - 0.6) / 0.25), 1, col);
  }
  if (t > 0.8) textO('READY', 222, 102, Math.floor(t * 8) % 2 ? P.paper : P.dust, 1, 'c');
  ctx.restore();
  // a white flash builds over everything (the portrait too) and carries into the arena, where it fades
  if (t > LOCK_LEN - 0.2) {
    const a = Math.min(1, (t - (LOCK_LEN - 0.2)) / 0.2);
    ctx.globalAlpha = a; rect(0, 0, W, H, P.paper); ctx.globalAlpha = 1;
    if (pic) { const h = hdCtx(); h.globalAlpha = a; h.fillStyle = P.paper; h.fillRect(0, 0, W, H); h.globalAlpha = 1; }
  }
}
