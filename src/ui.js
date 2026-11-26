import { drawGold, perkFactors } from './shop.js?v=216';
import { dailyList } from './daily.js?v=216';
import { keys, keyLabel } from './bindings.js?v=216';
import { W, H, FW, SX, onWidth, fillScreen, ctx, P, BAYER, makeCanvas, rect, px, line, ring, disc, drawSprite, glow, text, textO, textW, wrapText, logoCanvas, hdBegin, hdActive, hdCtx, target } from './gfx.js?v=216';
import { drawScene, drawFighter, drawLogo, flourishAngle, flourishFx, fighterColor } from './title-scene.js?v=216';
import { loadPortraits, portraitReady, drawPortrait, portraitLand, PORTRAIT_SCALE } from './portraits.js?v=216';
import { SPR, icon } from './sprites.js?v=216';
import { input, keyHit, TOUCH_BTNS, STICK_X, STICK_Y, STICK_R } from './input.js?v=216';
import { A } from './audio.js?v=216';
import { settings, best, OPTIONS, isUnlocked, TEST_BUFF, testing } from './store.js?v=216';
import { TWISTS, multiName, G, fx, RANKS, RANK_POWER, floor, decal, AW, AH, isBossWave, buzz, canVibrate, bossLock, DASH_COST, dashGap, evosDone, AWAKEN_NEED } from './world.js?v=216';
import { CHARS, skillPreview } from './chars.js?v=216';
import { BOSSES, bossFor } from './bosses.js?v=216';
import { MAPS } from './maps.js?v=216';
import { drawTalk } from './story.js?v=216';
import { byId, rollUpgrades, UPGRADES } from './upgrades.js?v=216';
const UPG_EVO = Object.fromEntries(UPGRADES.filter((u) => u.req).map((u) => [u.req, u.id]));

const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const back = (k) => { k = Math.min(1, Math.max(0, k)); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const inBox = (x, y, w, h) => input.mouse.x >= x && input.mouse.x < x + w && input.mouse.y >= y && input.mouse.y < y + h;
const C = (k) => P[k] || k;
function dim(a) { fillScreen(P.void, a); }

// ---------- overlays ----------
// screen-wide (the stage and its sides on a wide screen), drawn at x = -SX; remade when the width changes
function dithered(fn, col) {
  const c = makeCanvas(FW, H), g = c.getContext('2d'), img = g.createImageData(FW, H), d = img.data;
  const r = parseInt(col.slice(1, 3), 16), gr = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
  for (let y = 0; y < H; y++) for (let x = 0; x < FW; x++) {
    if (fn(x, y) <= (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) continue;
    const i = (y * FW + x) * 4; d[i] = r; d[i + 1] = gr; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const edge = (x, y) => Math.hypot((x - FW / 2) / (FW / 2), (y - H / 2) / (H / 2));
let VIG, RED;
function overlays() {
  VIG = dithered((x, y) => Math.max(0, (edge(x, y) - 0.86) * 2.2), '#07060b');
  RED = dithered((x, y) => Math.max(0, (edge(x, y) - 0.5) * 1.8), '#e0223f');
}
overlays();
onWidth(overlays);
let LOGO = null;
export function refreshArt() { LOGO = logoCanvas('ASHBLADE', 4, [P.paper, P.paper, P.ember3, P.ember3, P.ember2, P.ember, P.ember], P.ink0); }

export function vignette() { ctx.drawImage(VIG, -SX, 0); }
export function screenFlash() {
  if (fx.flashT <= 0) return;
  const k = fx.flashT / fx.flashMax, max = settings.flash ? (fx.flashStrong ? 0.8 : 0.4) : 0.12;
  fillScreen(fx.flashC, k * max);
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
  const top = Math.floor((rowH - 6) / 2);
  for (let i = 0; i < items.length; i++) {
    if (!inBox(x, y + i * rowH - top, w, rowH)) continue;
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
    const it = items[i], yy = y + i * rowH, sel = m.sel === i, top = Math.floor((rowH - 6) / 2);
    if (sel) { rect(x, yy - top, w, rowH - 1, P.ink3); rect(x, yy - top, 2, rowH - 1, P.ember); }
    text(it.label, x + 8, yy, sel ? P.paper : it.dimmed ? P.stone2 : P.dust);
    if (it.value) { const v = it.value(); text((sel && it.adjust ? '< ' : '') + v + (sel && it.adjust ? ' >' : ''), x + w - 8, yy, sel ? P.ember2 : P.bone, 1, 'r'); }
  }
}

// ---------- HUD ----------
function abilityBox(x, y, w, key, ready, frac, deny, ic, col) {
  x += deny > 0 ? (Math.floor(deny * 40) % 2 ? 1 : -1) : 0;
  rect(x - 1, y - 1, w + 2, 18, P.ink0);
  rect(x, y, w, 16, ready ? P.ink3 : P.ink1);
  if (!ready) rect(x, y + 16 - Math.round(16 * Math.min(1, frac)), w, Math.round(16 * Math.min(1, frac)), P.ink2);
  drawSprite(icon(ic, ready ? col : P.stone2), x + Math.floor((w - 9) / 2), y + 2, false);
  rect(x, y, w, 1, ready ? P.stone2 : P.ink2);
  textO(key, x + w / 2, y + 12, ready ? P.paper : P.dust, 1, 'c');
  if (deny > 0) { rect(x - 1, y - 1, w + 2, 1, P.blood); rect(x - 1, y + 16, w + 2, 1, P.blood); }
}

function drawUnlock(un) {
  const ch = CHARS[un.id], col = ch.color();
  const sprite = SPR.chars[un.id].idles[Math.floor(un.t * 8) % 16];
  const w = 88, h = 18, slide = Math.max(1 - un.t * 5, (un.t - 2.2) * 4, 0);
  const x = Math.round(W + SX - w - 4 + slide * (w + 5)), y = G.combo > 1 ? 85 : 32;
  rect(x, y, w, h, P.ink1); rect(x, y, 2, h, col);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y + 1, 19, 16); ctx.clip();
  drawSprite(sprite, x - 6, y - (SPR.chars[un.id].rig.top / 3) + 2, false);
  ctx.restore();
  text('FIGHTER UNLOCKED', x + 23, y + 3, P.dust);
  text(ch.hero, x + 23, y + 10, col);
}

function bossBar(b, y) {
  const bd = BOSSES[b.boss], w = 180, x = (W - w) / 2;
  textO((b.awakened ? 'NOX UNBOUND' : bd.name) + (!b.awakened && b.phase > 1 ? '  ' + 'I'.repeat(b.phase) : ''), W / 2, y - 8, b.phase > 1 ? bd.col : P.bone, 1, 'c');
  rect(x - 1, y - 1, w + 2, 5, P.ink0); rect(x, y, w, 3, P.ink2);
  b.chip = b.chip === undefined ? b.hp : Math.max(b.hp, b.chip - (b.maxHp * 0.25) / 60);
  rect(x, y, Math.round((w * Math.max(0, b.chip)) / b.maxHp), 3, P.paper);
  rect(x, y, Math.round((w * Math.max(0, b.hp)) / b.maxHp), 3, bd.col);
  if (b.shieldUp) rect(x, y - 1, Math.round((w * Math.max(0, b.hp)) / b.maxHp), 1, '#62efff');
  // phase marks where the boss changes, an enrage countdown, then the enraged tag
  for (const m of b.awakened ? [] : bd.marks || (bd.final ? [0.33, 0.66] : [0.5])) rect(x + Math.round(w * m), y - 1, 1, 5, P.ink0);
  if (b.enraged) textO('ENRAGED', x + w, y - 8, Math.floor(G.time * 6) % 2 ? P.blood : P.paper, 1, 'r');
  else if ((b.fightT || 0) > 45) textO('ENRAGE IN ' + Math.ceil(60 - b.fightT), x + w, y - 8, P.ember3, 1, 'r');
}
const clockOf = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function drawHealth(p) {
  const hp = Math.min(p.maxHp, Math.max(0, p.hp));
  const pulse = hp > 0 && hp <= 2 && Math.floor(G.time * 6) % 2;
  const columns = Math.max(10, Math.ceil(p.maxHp / 3)), pitch = Math.min(8, Math.floor(120 / columns));
  ctx.save(); ctx.translate(5, 4); ctx.scale(pitch / 8, pitch / 8);
  for (let i = 0; i < p.maxHp; i++) {
    const y = Math.floor(i / columns) * 8 - (pulse && i < hp ? 1 : 0);
    drawSprite(i < hp ? SPR.heart : SPR.heartE, (i % columns) * 8, y, false);
  }
  ctx.restore();
  return 6 + Math.ceil(p.maxHp / columns) * pitch;
}

export function drawHUD(menu) {
  const p = G.p, kit = G.kit;
  // a hero's entrance: no HUD yet, just its letterbox and name card
  if (G.cine?.overlay) { G.cine.overlay(); return; }
  const lb = G.boss && !G.night && BOSSES[G.boss.boss].bars(G.boss);
  // the left corner (health, energy, the ultimate, the ability boxes) hugs the screen's left edge
  ctx.save(); ctx.translate(-SX, 0);
  const ex = 6, ey = drawHealth(p), ew = 64;
  rect(ex - 1, ey - 1, ew + 2, 6, P.ink0); rect(ex, ey, ew, 4, P.ink2);
  const ef = Math.round((ew * p.energy) / 100);
  rect(ex, ey, ef, 4, P.volt2); rect(ex, ey, ef, 1, P.volt);
  for (let i = 1; i < 10; i++) rect(ex + Math.round((ew * i) / 10), ey, 1, 4, P.ink0);
  rect(ex + Math.round((ew * kit.q.cost) / 100), ey + 4, 1, 2, P.bone);
  rect(ex + Math.round((ew * kit.e.cost) / 100), ey + 4, 1, 2, P.bone);
  // the dash's cost, and the bar flashing when a dash was refused for want of it
  rect(ex + Math.round((ew * DASH_COST) / 100), ey + 4, 1, 2, P.volt);
  if (G.deny.dash > 0 && Math.floor(G.time * 16) % 2) { rect(ex - 1, ey - 1, ew + 2, 1, P.blood); rect(ex - 1, ey + 4, ew + 2, 1, P.blood); }
  const uy = ey + 8, full = p.ult >= 100, blink = Math.floor(G.time * 6) % 2;
  rect(ex - 1, uy - 1, ew + 2, 4, P.ink0); rect(ex, uy, ew, 2, P.ink2);
  rect(ex, uy, Math.round((ew * p.ult) / 100), 2, full ? (blink ? P.gold : P.paper) : P.gold2);
  if (full) { textO((input.touch ? 'R' : keyLabel('r')) + '  ' + kit.r.name, ex, uy + 5, blink ? P.gold : P.ember3); glow(ex + ew, uy + 1, P.gold, 8, 0.5); }
  if (p.dashMax > 1) for (let i = 0; i < p.dashMax; i++) rect(ex + ew + 4, ey + i * 4, 3, 3, i < p.charges ? kit.color() : P.ink3);
  kit.hud?.(p, ex, uy + (full ? 12 : 5));

  if (!input.touch) {
    const labels = ['q', 'e', 'r'].map(keyLabel), [qw, ew, rw] = labels.map(s => Math.max(16, textW(s) + 2));
    const by = H - 21 - (G.boss && qw + ew + rw + 14 > 70 + SX ? (G.night ? 35 : 18) : 0);
    abilityBox(6, by, qw, labels[0], p.energy >= kit.q.cost && p.cdQ <= 0, Math.min(p.energy / kit.q.cost, 1 - Math.max(0, p.cdQ) / kit.q.cd), G.deny.q, kit.q.icon, kit.color());
    abilityBox(10 + qw, by, ew, labels[1], p.energy >= kit.e.cost && p.cdE <= 0, Math.min(p.energy / kit.e.cost, 1 - Math.max(0, p.cdE) / kit.e.cd), G.deny.e, kit.e.icon, kit.color());
    abilityBox(14 + qw + ew, by, rw, labels[2], full, p.ult / 100, G.deny.r, kit.r.icon, P.gold);
  }
  ctx.restore();
  // the phone controls place themselves against the screen edges (see input.js)
  if (input.touch && !G.talk?.lore) drawTouch(p, kit, full);

  if (TEST_BUFF) textO('TEST BUFF ON', W / 2, 4, Math.floor(G.time * 2) % 2 ? P.gold : P.paper, 1, 'c');
  // TESTING, temporary: say so while god mode or a test start is on
  if (G.tested && !G.training && !G.talk) textO(settings.god ? 'GOD MODE' : 'TEST RUN', W / 2, 4, P.gold, 1, 'c');
  // score and high score, against the screen's right edge
  ctx.save(); ctx.translate(SX, 0);
  const hi = Math.max(best.score, G.startBest ?? best.score), beat = !G.tested && G.score > hi && hi > 0;
  // (on a phone the menu button sits in the very corner, so the numbers make room for it)
  const rx = input.touch ? W - 30 : W - 6, waveTxt = G.training ? 'TRAINING' : G.night ? 'NIGHT ' + clockOf(G.night.t) : 'WAVE ' + G.wave;
  textO(waveTxt, rx, 4, G.night ? '#b48cff' : P.bone, 1, 'r');
  // the wave twist, tagged next to the wave number
  if (G.twist) { const tw = TWISTS[G.twist]; textO(tw.name, rx - 6 - waveTxt.length * 4, 4, Math.floor(G.time * 2) % 2 ? tw.c : P.paper, 1, 'r'); }
  // (training keeps no score)
  if (!G.training) {
  textO('SCORE ' + String(G.score).padStart(7, '0'), rx, 12, P.paper, 1, 'r');
  const bestTxt = (beat ? 'NEW BEST ' : 'BEST ') + String((G.tested ? hi : Math.max(hi, G.score))).padStart(7, '0');
  textO(bestTxt, rx, 20, beat && Math.floor(G.time * 4) % 2 ? P.paper : P.gold, 1, 'r');
  // the gold you have, counting what this run has found (it is banked when the run ends)
  if (!G.tested) drawGold(rx - textW(bestTxt) - 8, 20, 'r', best.gold + G.gold - G.goldBanked);
  }

  if (G.combo >= 2) {
    const rk = RANKS[G.rank], rc = C(rk.c), pop = G.rankPop > 0.5 ? 1 : 0;
    textO(String(G.combo), W - 26, 31, P.paper, 2, 'r');
    textO('HITS', W - 7, 36, P.dust, 1, 'r');
    rect(W - 33, 44, 26, 1, P.ink0);
    const cw = Math.round((26 * Math.max(0, G.comboT)) / 3);
    rect(W - 7 - cw, 44, cw, 1, rc);
    textO(rk.l, W - 7, 49 - pop, rc, 2 + pop, 'r');
    textO(rk.w, W - 7, 66, rc, 1, 'r');
    // the damage the rank adds (RANK_POWER), from A up
    const pw = Math.round(((RANK_POWER[G.rank] || 1) - 1) * 100);
    if (pw > 0) textO('POWER +' + pw + '%', W - 7, 73, Math.floor(G.time * 4) % 2 && G.rank >= 6 ? P.paper : rc, 1, 'r');
    if (G.rank >= 4) glow(W - 16, 55, rc, 12, 0.18);
  }
  ctx.restore();

  const b = G.boss;
  // a health bar for every boss out (two at once in the endless night), stacked up from the bottom
  if (!lb) G.E.filter((e) => e.type === 'boss' && !e.dead).slice(0, 2).forEach((e, i) => bossBar(e, H - 12 - i * 17));
  // multi-kill callout: pops in, colour climbs with the count, the bonus lands when the chain ends
  const mk = G.mkShow;
  if (mk && !lb && !menu) {
    const n = mk.n, col = n >= 9 ? '#ff4fa8' : n >= 6 ? P.blood : n >= 4 ? P.ember : n >= 3 ? P.gold : P.paper;
    const pop = mk.t < 0.08 ? 1 : 0, fade = mk.t > 1.2 && Math.floor(G.time * 20) % 2;
    if (!fade) {
      textO(multiName(n), W / 2, 24 - pop, col, 2 + pop, 'c');
      if (n >= 6) glow(W / 2, 29, col, 30, 0.12 + Math.sin(G.time * 12) * 0.04);
      if (mk.bonus) textO('+' + mk.bonus, W / 2, 38, P.gold, 1, 'c'); else if (n > 2) textO('X' + n, W / 2, 38, P.dust, 1, 'c');
    }
  }
  if (bossLock()) textO('GET READY', W / 2, H - 30, Math.floor(G.time * 4) % 2 ? P.paper : P.dust, 1, 'c');

  // a fighter was just unlocked: a card drops in at the top middle (clear of the corners and the phone controls)
  // with the whole fighter standing in it, twice their size
  const un = G.unlocks[0];
  if (un && !G.talk?.lore) {
    drawUnlock(un);
  }
  // arrow on the screen edge pointing at an off-screen boss
  if (b && !b.dead && !lb) {
    const bx = b.x - fx.cam.x, by = b.y - 16 - fx.cam.y;
    if (bx < 4 - SX || bx > W + SX - 4 || by < 4 || by > H - 4) {
      const cx = W / 2, cy = H / 2, a = Math.atan2(by - cy, bx - cx);
      const m = Math.min((FW / 2 - 14) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 14) / Math.abs(Math.sin(a) || 1e-6));
      const ax = cx + Math.cos(a) * m, ay = cy + Math.sin(a) * m, col = BOSSES[b.boss].col, pulse = Math.sin(G.time * 8) * 2;
      for (let i = 0; i < 7; i++) { const w = 7 - i; line(ax + Math.cos(a) * (i + pulse) - Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) + Math.cos(a) * w, ax + Math.cos(a) * (i + pulse) + Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) - Math.cos(a) * w, col); }
      glow(ax, ay, col, 10, 0.5);
      textO(Math.round(Math.hypot(b.x - G.p.x, b.y - G.p.y) / 8) + 'M', ax - Math.cos(a) * 12, ay - Math.sin(a) * 12 - 2, col, 1, 'c');
    }
  }
  // the last few monsters of a wave, off the screen: small pointers at the edge, so a wave never stalls on a hunt
  if (!menu && !lb && !b && G.phase === 'fight' && !G.queue.length && !G.sigils.length) {
    const left = G.E.filter((e) => !e.dead && !e.prop && !e.dying && e.state !== 'spawn' && !e.under);
    if (left.length && left.length <= 3) for (const e of left) {
      const ex = e.x - fx.cam.x, ey = e.y - 8 - fx.cam.y;
      if (ex >= 2 - SX && ex <= W + SX - 2 && ey >= 2 && ey <= H - 2) continue;
      const cx = W / 2, cy = H / 2, a = Math.atan2(ey - cy, ex - cx);
      const m = Math.min((FW / 2 - 9) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 9) / Math.abs(Math.sin(a) || 1e-6));
      const ax = cx + Math.cos(a) * m, ay = cy + Math.sin(a) * m, col = e.def?.col || P.paper, pulse = Math.floor(G.time * 5) % 2;
      for (let i = 0; i < 4; i++) { const w = 4 - i; line(ax + Math.cos(a) * (i + pulse) - Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) + Math.cos(a) * w, ax + Math.cos(a) * (i + pulse) + Math.sin(a) * w, ay + Math.sin(a) * (i + pulse) - Math.cos(a) * w, col); }
    }
  }
  // letterbox while a boss makes its entrance
  if (lb) {
    const k = ease(Math.min(1, (b.introMax ??= b.t, (b.introMax - b.t) / 0.4)));
    rect(-SX, 0, FW, Math.round(22 * k), '#000'); rect(-SX, H - Math.round(22 * k), FW, Math.round(22 * k), '#000');
    const bd = BOSSES[b.boss];
    if (k > 0.9) { textO(bd.name, W / 2, H - 16, bd.col, 1, 'c'); text(bd.sub, W / 2, H - 8, P.dust, 1, 'c'); }
  }

  const bn = menu || lb ? null : G.banner;
  if (bn) {
    const k = bn.t / bn.life, inK = ease(bn.t / 0.25), outK = k > 0.8 ? (k - 0.8) / 0.2 : 0, y = 52;
    const barW = Math.round(FW * inK * (1 - outK));
    rect((W - barW) / 2, y - 6, barW, 1, bn.c); rect((W - barW) / 2, y + 22, barW, 1, bn.c);
    if (outK < 0.6) {
      const dx = Math.round((1 - inK) * 40);
      textO(bn.text, W / 2 + dx, y, bn.c, bn.text.length > 13 ? 2 : 3, 'c');
      if (bn.sub) textO(bn.sub, W / 2 - dx, y + 26, P.bone, 1, 'c');
    }
  }
  const low = p.hp <= 2 && p.hp > 0 ? 0.35 + Math.sin(G.time * 6) * 0.15 : 0, a = Math.max(fx.hurtVig * 0.8, low);
  if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(RED, -SX, 0); ctx.globalAlpha = 1; }
  // whoever is talking: the King, the fighter, or the thing below the pit
  if (!menu) drawTalk();
}

// ---------- title ----------
const embers = [];
// the floor, its decals and the darkening baked into one picture, so menus draw one full-screen layer instead
// of four. It's rebuilt when a menu opens (play may have added decals) and when the darkness or theme changes.
let bakedBg = null, bakedKey = '', bakedT = -1;
function backdropImage(t, darken) {
  if (!bakedBg) bakedBg = makeCanvas(AW, AH);
  const key = darken + P.void;
  if (key !== bakedKey || t < bakedT || t - bakedT > 0.25) {
    const g = bakedBg.getContext('2d');
    g.globalAlpha = 1; g.drawImage(floor, 0, 0); g.drawImage(decal, 0, 0);
    g.globalAlpha = darken; g.fillStyle = P.void; g.fillRect(0, 0, AW, AH); g.globalAlpha = 1;
    bakedKey = key;
  }
  bakedT = t;
  return bakedBg;
}
export function drawBackdrop(t, darken = 0.6) {
  const cx = Math.round(AW / 2 - W / 2 + Math.sin(t * 0.12) * 70), cy = Math.round(AH / 2 - H / 2 + Math.cos(t * 0.09) * 40);
  ctx.drawImage(backdropImage(t, darken), -cx, -cy);
  if (embers.length < 60 && Math.random() < 0.5) embers.push({ x: Math.random() * FW - SX, y: H + 2, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 22, c: Math.random() < 0.5 ? P.ember : P.ember2, life: 4 + Math.random() * 4, t: 0 });
  for (const e of embers) { e.t += 1 / 60; e.x += (e.vx + Math.sin(e.t * 2 + e.y * 0.05) * 6) / 60; e.y += e.vy / 60; px(e.x, e.y, e.c); glow(e.x, e.y, e.c, 3, 0.4); }
  for (let i = embers.length - 1; i >= 0; i--) if (embers[i].t > embers[i].life || embers[i].y < -4) embers.splice(i, 1);
  vignette();
}

export const titleMenu = { sel: 0 };
export function titleItems(save, go, practice) {
  const items = [];
  if (save) items.push({ label: 'CONTINUE', value: () => CHARS[save.char].name + '  WAVE ' + save.wave, act: () => go('continue') });
  if (practice) items.push({ label: save ? 'PRACTICE' : 'CONTINUE PRACTICE', value: () => CHARS[practice.char].name + '  WAVE ' + practice.wave, act: () => go('practice') });
  items.push({ label: 'PLAY', act: () => go('select') });
  items.push({ label: 'ASH STORY', act: () => go('ash') });
  items.push({ label: 'COMPENDIUM', act: () => go('codex') });
  items.push({ label: 'SETTINGS', act: () => go('settings') });
  return items;
}
// the title menu sits under the logo
export const TITLE_MENU = { w: 132, row: 13 };
export const titleMenuX = () => (W - TITLE_MENU.w) / 2;
export const titleMenuY = (n) => 68 - Math.max(0,n - 3) * 2;
const LOGO_Y = 12;

// ---------- title ----------
// The scene from title-scene.js (the swallowed sun, the ruins, the empty battlement), the logo with a light running
// across it, and the menu under it: no panel, outlined words; the picked one is gold, with ember arrows closing in on
// it and a soft glow behind it.
export function drawTitle(t, items) {
  const my = titleMenuY(items.length);
  const bline = best.score > 0 ? 'BEST ' + best.score + '   WAVE ' + best.wave + (best.won ? '   KING SLAIN' : '') : input.touch ? 'LEFT THUMB MOVES, RIGHT THUMB FIGHTS' : 'MOUSE AIM   CLICK ATTACK   '+keyLabel('dash')+' DASH';
  drawScene(t);
  drawLogo(LOGO, Math.round((W - LOGO.width) / 2), LOGO_Y, t);
  textO('THE KING SWALLOWED THE SUN', W / 2, LOGO_Y + LOGO.height + 1, P.dust, 1, 'c');
  items.forEach((it, i) => {
    const y = my + i * TITLE_MENU.row, on = titleMenu.sel === i, label = it.label + (it.value ? '  ' + it.value() : '');
    if (on) {
      glow(W / 2, y + 2, P.ember, 18, 0.35 + Math.sin(t * 5) * 0.1);
      const half = label.length * 2 + 6 + Math.round(Math.sin(t * 6)), c = Math.floor(t * 8) % 2 ? P.ember2 : P.ember;
      textO('>', W / 2 - half - 2, y, c, 1, 'c'); textO('<', W / 2 + half + 2, y, c, 1, 'c');
    }
    textO(label, W / 2, y, on ? P.gold : P.bone, 1, 'c');
  });
  textO(bline, W / 2, my + items.length * TITLE_MENU.row + 6, best.score > 0 ? P.gold : P.bone, 1, 'c');
  textO(input.touch ? 'TAP TO PICK' : 'ARROWS OR MOUSE, ENTER TO PICK', W / 2, 172, P.dust, 1, 'c');
}

// ---------- character select ----------
// The chosen fighter stands big on the left: an animated pixel portrait in a pose of their own (src/portraits.js),
// with their own particles and glows. The roster is a grid of slanted face tiles on the right, with lore, stats,
// attacks, arena, difficulty and START under it.
export const sel = { i: 0, row: 0, t: 0, shown: -1, swap: 0 };
// draws only the top rows of a sprite (head and shoulders), optionally scaled
function bust(s, x, y, rows, scale = 1, tint = null) {
  ctx.drawImage(tint ? s.tint(tint, false) : s.n, 0, 0, s.w * s.k, rows * s.k, Math.round(x), Math.round(y), s.w * scale, rows * scale);
}
export const roster = () => OPTIONS.char.filter(isUnlocked);
const locked = (id) => !isUnlocked(id);
const cycle = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
// roster tiles: 4 x 2, each a parallelogram leaning right by SLANT pixels
const TW = 38, TH = 26, TG = 3, SLANT = 4, TX0 = 154, TY0 = 10;
const tilePos = (i) => [TX0 + (i % 4) * (TW + TG), TY0 + Math.floor(i / 4) * (TH + TG)];
const DIFF_Y = 146, START_Y = 157, START_W = 100, START_H = 14, PANEL_C = 236;
export function updateSelect(dt) {
  sel.t += dt;
  loadPortraits();
  const ids = OPTIONS.char;
  const up = keyHit('ArrowUp', 'KeyW'), down = keyHit('ArrowDown', 'KeyS');
  // up and down walk the two tile rows first, then the arena, difficulty and START rows
  if (up || down) {
    A.ui();
    if (sel.row === 0 && down && sel.i < 4) sel.i += 4;
    else if (sel.row === 0 && up && sel.i >= 4) sel.i -= 4;
    else sel.row = (sel.row + (down ? 1 : 2)) % 3;
  }
  const lr = keyHit('ArrowLeft', 'KeyA') ? -1 : keyHit('ArrowRight', 'KeyD') ? 1 : 0;
  if (lr) {
    A.ui();
    if (sel.row === 0) sel.i = (sel.i + lr + ids.length) % ids.length;
    else if (sel.row === 1) return { diff: cycle(OPTIONS.diff, settings.diff, lr) };
  }
  for (let i = 0; i < ids.length; i++) {
    const [x, y] = tilePos(i);
    if (!inBox(x, y, TW + SLANT, TH)) continue;
    if (input.mouse.moved && sel.i !== i) { sel.i = i; sel.row = 0; A.ui(); }
    if (input.mouse.pressed) { sel.i = i; sel.row = 0; A.ui(); }
  }
  if (inBox(152, DIFF_Y - 3, 164, 11)) {
    if (input.mouse.moved) sel.row = 1;
    if (input.mouse.pressed) { A.ui(); return { diff: cycle(OPTIONS.diff, settings.diff, input.mouse.x > PANEL_C ? 1 : -1) }; }
  }
  const go = () => { if (locked(ids[sel.i])) { A.deny(); return null; } return { start: ids[sel.i] }; };
  if (inBox(PANEL_C - START_W / 2, START_Y - 1, START_W, START_H + 2)) { if (input.mouse.moved) sel.row = 2; if (input.mouse.pressed) return go(); }
  if (keyHit('Enter', 'Space') && sel.t > 0.2) return go();
  if (keyHit('Escape') || (input.touch && input.mouse.pressed && input.mouse.x < 46 && input.mouse.y < 18)) return { back: true };
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
const honor = (id) => best.chars[id]?.nox ? 2 : best.chars[id]?.won ? 1 : 0;
function tileEdge(x, y, f) {
  const P4 = [[x + SLANT, y], [x + TW + SLANT, y], [x + TW, y + TH], [x, y + TH]], L = [TW, Math.hypot(SLANT, TH), TW, Math.hypot(SLANT, TH)], tot = L[0] + L[1] + L[2] + L[3];
  let d = (((f % 1) + 1) % 1) * tot;
  for (let i = 0; i < 4; i++) { if (d <= L[i]) { const [ax, ay] = P4[i], [bx, by] = P4[(i + 1) % 4], k = d / L[i]; return [ax + (bx - ax) * k, ay + (by - ay) * k]; } d -= L[i]; }
  return P4[0];
}
// the honor frame: silver for wave 25, gold (with a crown) for wave 50
function honorFrame(x, y, rank, t, i) {
  const corners = [[x + SLANT, y], [x + TW + SLANT, y], [x + TW, y + TH], [x, y + TH]];
  if (rank === 1) {
    const S = '#dfe6f0', s = '#8a96a8';
    tilePath(x - 1, y - 1); ctx.strokeStyle = s; ctx.stroke();
    tilePath(x, y); ctx.strokeStyle = S; ctx.stroke();
    // diamond studs at the corners and ticks along the top
    for (const [cx, cy] of corners) { px(cx, cy - 1, S); px(cx - 1, cy, S); px(cx + 1, cy, S); px(cx, cy + 1, S); px(cx, cy, P.paper); }
    for (let k = 6; k < TW - 4; k += 6) px(x + SLANT + k, y - 2, s);
    // a glint running round the frame
    const [gx, gy] = tileEdge(x, y, t * 0.35 + i * 0.13);
    px(gx, gy, P.paper); glow(gx, gy, S, 4, 0.5);
  } else if (rank === 2) {
    const g = P.gold, g2 = P.gold2;
    tilePath(x - 1, y - 1); ctx.lineWidth = 2; ctx.strokeStyle = g2; ctx.stroke(); ctx.lineWidth = 1;
    tilePath(x, y); ctx.strokeStyle = g; ctx.stroke();
    // flourishes: an L of gold at each corner with a gem at its tip
    for (const [cx, cy] of corners) {
      const sx = cx < x + TW / 2 ? 1 : -1, sy = cy < y + TH / 2 ? 1 : -1;
      for (let k = 0; k < 4; k++) { px(cx - sx * 2, cy - sy * 2 + sy * k, g); px(cx - sx * 2 + sx * k, cy - sy * 2, g); }
      px(cx - sx * 2, cy - sy * 2, P.paper); px(cx - sx * 3, cy - sy * 3, '#ff4fa8');
    }
    // a crown on top
    const kx = Math.round(x + TW / 2 + SLANT), ky = y - 5;
    for (const [dx, dy] of [[-3, 0], [-3, 1], [-3, 2], [0, -1], [0, 0], [0, 1], [0, 2], [3, 0], [3, 1], [3, 2], [-2, 2], [-1, 2], [1, 2], [2, 2], [-2, 1], [2, 1], [-1, 1], [1, 1]]) px(kx + dx, ky + dy, g);
    px(kx, ky - 1, P.paper); px(kx - 3, ky, '#ff4fa8'); px(kx + 3, ky, '#62efff');
    glow(kx, ky, g, 6, 0.4);
    // two sparkles chasing each other round the frame, and stars twinkling at the corners
    for (const off of [0, 0.5]) { const [sx2, sy2] = tileEdge(x, y, t * 0.45 + off + i * 0.11); px(sx2, sy2, P.paper); px(sx2 - 1, sy2, g); px(sx2 + 1, sy2, g); px(sx2, sy2 - 1, g); px(sx2, sy2 + 1, g); glow(sx2, sy2, g, 5, 0.6); }
    corners.forEach(([cx, cy], k) => { const a = Math.max(0, Math.sin(t * 4 + k * 1.7 + i)); if (a > 0.6) { ctx.globalAlpha = a; px(cx + (k % 3 ? 3 : -3), cy + (k < 2 ? -3 : 3), P.paper); ctx.globalAlpha = 1; } });
  }
}
function tilePath(x, y, c = ctx) {
  c.beginPath(); c.moveTo(x + SLANT, y); c.lineTo(x + TW + SLANT, y); c.lineTo(x + TW, y + TH); c.lineTo(x, y + TH); c.closePath();
}
const PANEL = () => [[-SX, 0], [150, 0], [132, H], [-SX, H]];
const panelPath = (c) => { c.beginPath(); PANEL().forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
// the portrait's box in game units: the full screen height, centered in the left panel
const MW = 120, MH = 180, NAME = makeCanvas(150, 50);
// the big fighter on the left: slides in when picked, flashes white as it lands, then plays its loop
function drawHero(id, t, col, lk, h) {
  const e0 = (t - sel.swap) / 0.28, e = ease(e0), x0 = 12 - (1 - e) * 46;
  ctx.save(); panelPath(ctx); ctx.clip();
  rect(-SX, 0, 150 + SX, H, P.ink1);
  ctx.globalAlpha = 0.14 + (1 - e) * 0.25;
  for (let s = -H - SX; s < 160; s += 9) { ctx.beginPath(); ctx.moveTo(s, H); ctx.lineTo(s + 3, H); ctx.lineTo(s + 3 + H * 0.35, 0); ctx.lineTo(s + H * 0.35, 0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
  ctx.globalAlpha = 1;
  glow(x0 + MW / 2, 70, col, 70, lk ? 0.08 : 0.24);
  // speed lines while it slides in
  if (e0 < 1) for (let i = 0; i < 7; i++) { const yy = 30 + ((i * 37) % 130); rect(-SX, yy, Math.round(90 * (1 - e)) + (i % 3) * 8, 1, P.paper); }
  // the portrait: its own pose and loop, a silhouette while locked, a white flash and a burst as it lands, a shadow
  // as wide as its own stance
  const al = Math.min(1, e0 * 2.5 + 0.2), fx0 = x0 + MW / 2, fy0 = 173;
  if (!lk && e0 >= 1 && sel.landed !== sel.swap) { sel.landed = sel.swap; portraitLand(id, col); }
  if (!drawPortrait(id, t, fx0, fy0, PORTRAIT_SCALE, { tint: lk ? '#07050b' : null, alpha: al, still: lk, scene: true, shadow: true })) {
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x0 + MW / 2, 174, 34, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    // still loading: the in-game sprite, big
    const s = SPR.chars[id].idles[Math.floor(t * 7) % SPR.chars[id].idles.length], k = 6;
    ctx.globalAlpha = al;
    ctx.drawImage(lk ? s.tint('#07050b', false) : s.n, Math.round(x0 + MW / 2 - (s.w * k) / 2), 172 - s.h * k, s.w * k, s.h * k);
    ctx.globalAlpha = 1;
  } else if (!lk && e0 >= 1 && e0 < 1.35) drawPortrait(id, t, fx0, fy0, PORTRAIT_SCALE, { tint: '#ffffff', alpha: 1 - (e0 - 1) / 0.35 });
  ctx.restore();
  line(150, 0, 132, H, col);
}
// card: the camp's version (lobby.js) draws its own backdrop, and in place of the roster, difficulty and START shows
// card.head over the stats and card.prompts (rows of [key, words]) under them
export function drawSelect(t, card = null) {
  if (card) card.bg(); else drawBackdrop(t, 0.75);
  const ids = OPTIONS.char, id = ids[sel.i], k = CHARS[id], lk = locked(id), col = lk ? P.dust : k.color();
  // a new pick slides its portrait in; so does coming back to this screen (its clock restarts at 0, so a
  // swap time from an earlier visit would sit in the future and hold the portrait off to the left)
  if (sel.shown !== sel.i || t < sel.swap) { sel.shown = sel.i; sel.swap = t; }
  const [h] = hdBegin();
  drawHero(id, t, col, lk, h);
  // name over the left panel: painted into its own small canvas and put on the HD layer, above the portrait
  const secret = lk && id === 'DEV', ny = input.touch ? 16 : 6;
  const g = NAME.getContext('2d'); g.clearRect(0, 0, NAME.width, NAME.height); target(g);
  textO(secret ? '???' : k.hero, 8, ny, col, 2);
  text(secret ? 'A SECRET FIGHTER' : k.name, 8, ny + 13, lk ? P.stone2 : P.bone);
  const rec = best.chars[id];
  if (rec && !lk) text(rec.nox ? 'ENDLESS  ' + clockOf(rec.night || 0) : 'BEST WAVE ' + rec.wave, 8, ny + 20, P.bone);
  target(null);
  h.drawImage(NAME, 0, 0);
  if (card) { drawCardInfo(id, k, lk, col, t, card); return; }
  // roster
  text('CHOOSE YOUR FIGHTER', PANEL_C, 2, P.dust, 1, 'c');
  ids.forEach((cid, i) => {
    const [x, y] = tilePos(i), on = i === sel.i, ch = CHARS[cid], tlk = locked(cid);
    // a legend's tile glows gold from behind
    if (!tlk && honor(cid) === 2) glow(x + TW / 2 + SLANT / 2, y + TH / 2, P.gold, 30, 0.2 + Math.sin(t * 3 + i) * 0.06);
    ctx.save(); tilePath(x, y); ctx.fillStyle = on ? P.ink2 : P.ink1; ctx.fill(); ctx.clip();
    if (on) glow(x + TW / 2, y + TH / 2, ch.color(), 22, 0.25);
    // the in-game pixel fighter: the picked one runs, the others breathe and blink, locked ones are dark
    const set = SPR.chars[cid], s = on && !tlk ? set.run[Math.floor(t * (set.rig?.gait?.run?.fps || 13)) % set.run.length] : tlk ? set.idle : set.idles[Math.floor(t * 7 + i * 3) % set.idles.length];
    // at 1x the whole fighter fits inside the tile (a tall one, like Grom, stands a little lower so his head shows)
    const head = (set.rig?.top ?? 30) / 3 - 10, drop = Math.max(0, Math.ceil(1 - head));
    bust(s, x + Math.round((TW + SLANT - s.w) / 2), y + TH - s.h - 4 + drop - (on && !tlk ? Math.floor(t * 9) % 2 : 0), s.h, 1, tlk ? '#0a0810' : null);
    if (!on && !tlk) { ctx.globalAlpha = 0.3; rect(x, y, TW + SLANT, TH, P.ink0); ctx.globalAlpha = 1; }
    ctx.restore();
    tilePath(x, y); ctx.lineWidth = 1; ctx.strokeStyle = on ? ch.color() : P.ink3; ctx.stroke();
    if (!tlk && honor(cid)) honorFrame(x, y, honor(cid), t, i);
    if (tlk) { const lx = x + TW / 2 - 2, ly = y + 12; ring(lx + 4, ly, 3, 1, P.dust); rect(lx, ly, 9, 7, P.stone2); rect(lx + 4, ly + 2, 1, 3, P.ink0); }
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
    const ab = [[input.touch ? 'TAP' : keyLabel('attack'), k.primaryName], ...(k.charge ? [['HOLD', k.charge.name]] : []), [input.touch?'Q':keyLabel('q'), k.q.name + ' ' + k.q.cost], [input.touch?'E':keyLabel('e'), k.e.name + ' ' + k.e.cost], [input.touch?'R':keyLabel('r'), k.r.name]];
    ab.forEach(([key, name], i) => { const y = 101 + i * 7; text(key, 174, y, P.ember2, 1, 'r'); text(name, 178, y, P.paper); });
  }
  if (sel.row === 1) { rect(152, DIFF_Y - 3, 164, 11, P.ink3); rect(152, DIFF_Y - 3, 2, 11, P.ember); }
  text('DIFFICULTY', 158, DIFF_Y, sel.row === 1 ? P.paper : P.dust);
  text('< ' + settings.diff + ' >', 312, DIFF_Y, P.ember2, 1, 'r');
  const on = sel.row === 2, pulse = Math.floor(t * 3) % 2;
  rect(PANEL_C - START_W / 2 - 1, START_Y - 1, START_W + 2, START_H + 2, P.ink0); rect(PANEL_C - START_W / 2, START_Y, START_W, START_H, on ? col : P.ink3);
  textO('START', PANEL_C, START_Y + 5, on && pulse ? P.ink0 : P.paper, 1, 'c', on ? col : P.ink0);
  if (input.touch) { rect(3, 2, 34, 11, P.ink0); rect(4, 3, 32, 9, P.ink2); text('< BACK', 7, 5, P.paper); } else text('ENTER START   ESC BACK', PANEL_C, 174, P.stone2, 1, 'c');
}

// the camp's card: the fighter's stats on a dark panel to the right of their portrait
function drawCardInfo(id, k, lk, col, t, card) {
  ctx.globalAlpha = 0.86; rect(152, 0, W + SX - 152, H, '#0c0810'); ctx.globalAlpha = 1;
  rect(152, 0, 1, H, col);
  textO(card.head, PANEL_C, 6, col, 1, 'c');
  const rec = best.chars[id];
  if (lk) {
    textO('LOCKED', PANEL_C, 30, P.blood, 2, 'c');
    text('TO UNLOCK', PANEL_C, 50, P.dust, 1, 'c'); text(k.mission[0], PANEL_C, 60, P.gold, 1, 'c'); text(k.mission[1](), PANEL_C, 68, P.bone, 1, 'c');
  } else {
    text(k.lore[0], 158, 20, P.bone); text(k.lore[1], 158, 28, P.bone);
    const st = [['HEARTS', k.stats.hp + perkFactors(id).hp], ['SPEED', Math.round(k.stats.speed * perkFactors(id).speed)], ['DASHES', k.dash.charges], ['WEAPON POWER', Math.round((k.wpnPower || 1) * perkFactors(id).wpn * 100) + '%']];
    st.forEach(([n, v], i) => { const x = 158 + (i % 2) * 82, y = 40 + Math.floor(i / 2) * 8; text(n, x, y, P.dust); text(String(v), x + 76, y, P.paper, 1, 'r'); });
    // (the bars sit under the numbers: drawBars draws at y 85 and 92, so they are moved up here)
    ctx.save(); ctx.translate(4, -28); drawBars([['POWER', k.bars.power], ['SPEED', k.bars.speed], ['RANGE', k.bars.range], ['TOUGH', k.bars.tough]], col, t, id === 'DEV'); ctx.restore();
    const ab = [[input.touch ? 'TAP' : keyLabel('attack'), k.primaryName], ...(k.charge ? [['HOLD', k.charge.name]] : []), [input.touch ? 'Q' : keyLabel('q'), k.q.name + '  ' + k.q.cost], [input.touch ? 'E' : keyLabel('e'), k.e.name + '  ' + k.e.cost], [input.touch ? 'R' : keyLabel('r'), k.r.name]];
    ab.forEach(([key, name], i) => { const y = 76 + i * 8; text(key, 178, y, P.ember2, 1, 'r'); text(name, 182, y, P.paper); });
    text(rec ? 'BEST WAVE ' + rec.wave + (rec.won ? '   KING SLAIN' : '') + (rec.nox ? '   NOX' : '') : 'NO RUNS YET', PANEL_C, 122, P.gold, 1, 'c');
  }
  card.prompts.forEach(([key, words], i) => {
    const y = 138 + i * 13, on = i === 0, pulse = on && Math.floor(t * 3) % 2;
    rect(PANEL_C - 72, y - 3, 144, 11, on ? col : '#2a2028');
    textO(key + '  ' + words, PANEL_C, y, pulse ? P.ink0 : P.paper, 1, 'c', on ? col : P.ink0);
  });
}

// ---------- settings ----------
export const setm = { tab: 0, sel: 0 };
// four short tabs, so every row can be tall enough to tap on a phone
// (TEST is temporary: god mode and starting at a later wave, for testing the new stages)
const TABS = ['AUDIO', 'DISPLAY', 'EFFECTS', 'GAME', 'TEST'], TAB_X = (i) => 40 + i * 49, TAB_W = 45, SET_ROW = 14;
const pct = (v) => Math.round(v * 100) + '%';
const stepNum = (k, d, lo, hi) => (dir) => { settings[k] = Math.round(Math.min(hi, Math.max(lo, settings[k] + dir * d)) * 100) / 100; };
const stepList = (k) => (dir) => { settings[k] = cycle(OPTIONS[k], settings[k], dir); };
const toggle = (k) => () => { settings[k] = !settings[k]; };
export function settingsItems(ctxInfo) {
  if (setm.tab === 0) return [
    { label: 'MASTER VOLUME', value: () => (settings.mute ? 'MUTED' : pct(settings.master)), adjust: (dir) => { if (settings.mute) settings.mute = false; else stepNum('master', 0.1, 0, 1)(dir); } },
    { label: 'MUSIC', value: () => pct(settings.music), adjust: stepNum('music', 0.1, 0, 1) },
    { label: 'SOUND EFFECTS', value: () => pct(settings.sfx), adjust: stepNum('sfx', 0.1, 0, 1) },
    { label: 'SOUNDTRACK', value: () => (settings.track === 'AUTO' ? 'AUTO (FOLLOWS THE FIGHT)' : settings.track), adjust: stepList('track') },
    { label: 'BATTLE MUSIC', value: () => settings.combat, adjust: stepList('combat') },
    { label: 'BACK', act: () => 'back' },
  ];
  if (setm.tab === 1) return [
    { label: 'RESOLUTION', value: () => (settings.res === 'AUTO' ? 'AUTO (FILL)' : settings.res === 'SHARP' ? 'SHARP (WHOLE ZOOM)' : settings.res.replace('X', ' X ')), adjust: stepList('res') },
    { label: 'VIBRANCY', value: () => pct(settings.vibrancy), adjust: stepNum('vibrancy', 0.1, 0, 2) },
    { label: 'BRIGHTNESS', value: () => pct(settings.bright), adjust: stepNum('bright', 0.05, 0.6, 1.4) },
    { label: 'CONTRAST', value: () => pct(settings.contrast), adjust: stepNum('contrast', 0.05, 0.6, 1.6) },
    { label: 'BACK', act: () => 'back' },
  ];
  if (setm.tab === 2) return [
    { label: 'SCANLINES', value: () => (settings.crt ? 'ON' : 'OFF'), adjust: toggle('crt') },
    { label: 'SCREEN SHAKE', value: () => pct(settings.shake), adjust: stepNum('shake', 0.25, 0, 1) },
    { label: 'FLASHES', value: () => (settings.flash ? 'ON' : 'REDUCED'), adjust: toggle('flash') },
    { label: 'DAMAGE NUMBERS', value: () => (settings.numbers ? 'ON' : 'OFF'), adjust: toggle('numbers') },
    { label: 'PARTICLES', value: () => settings.particles, adjust: stepList('particles') },
    { label: 'BACK', act: () => 'back' },
  ];
  if (setm.tab === 4) return [
    { label: 'GOD MODE', value: () => (settings.god ? 'ON' : 'OFF'), adjust: toggle('god') },
    { label: 'ALL UPGRADES', value: () => settings.testBuffs ? 'ON' : 'OFF', adjust: toggle('testBuffs') },
    { label: 'FULL ENERGY AND POWERS', value: () => settings.testCharge ? 'ON' : 'OFF', adjust: toggle('testCharge') },
    { label: 'PLAY ANY FIGHTER', value: () => settings.testRoster ? 'ON' : 'OFF', adjust: toggle('testRoster') },
    { label: 'START NEW RUNS AT', value: () => (settings.testStart === 'NIGHT' ? 'THE ENDLESS NIGHT' : settings.testStart === 'WAVE 50' ? 'WAVE 50 (NOX)' : settings.testStart === 'WAVE 20' ? 'WAVE 20 (THE KING)' : settings.testStart), adjust: stepList('testStart') },
    { label: 'BACK', act: () => 'back' },
  ];
  return [
    { label: 'DIFFICULTY', value: () => settings.diff, adjust: stepList('diff') },
    { label: 'BLOOD STAINS', value: () => settings.blood, adjust: stepList('blood') },
    { label: 'VIBRATION', value: () => (canVibrate ? settings.vibe : settings.vibe + ' (NOT ON THIS DEVICE)'), adjust: (d) => { stepList('vibe')(d); buzz('heavy'); } },
    { label: 'CUSTOMIZE CONTROLS', value: () => { const n = Object.values(keys).filter(k => !k.length).length; return n ? n + ' UNASSIGNED' : ''; }, act: () => 'controls' },
    { label: 'RESET ALL SETTINGS', act: () => 'reset' },
    { label: 'ERASE SAVED RUN', act: () => 'erase', dimmed: !ctxInfo.hasSave },
    { label: 'BACK', act: () => 'back' },
  ];
}
export function updateSettings(items) {
  const tabKey = keyHit('KeyQ', 'PageUp') ? -1 : keyHit('KeyE', 'PageDown', 'Tab') ? 1 : 0;
  if (tabKey) { setm.tab = (setm.tab + tabKey + TABS.length) % TABS.length; setm.sel = 0; A.ui(); return 'changed'; }
  for (let i = 0; i < TABS.length; i++) if (inBox(TAB_X(i) - 2, 11, TAB_W + 4, 18) && input.mouse.pressed) { setm.tab = i; setm.sel = 0; A.ui(); return 'changed'; }
  if (keyHit('Escape')) return 'back';
  const before = JSON.stringify(settings);
  const r = runMenu(setm, items, 40, 38, 240, SET_ROW);
  if (r) return r;
  return JSON.stringify(settings) !== before ? 'changed' : null;
}
export function drawSettings(t, items, inRun) {
  if (inRun) dim(0.82); else drawBackdrop(t, 0.7);
  textO('SETTINGS', W / 2, 3, P.paper, 1, 'c');
  TABS.forEach((n, i) => {
    const x = TAB_X(i), on = setm.tab === i;
    rect(x, 14, TAB_W, 12, on ? P.ember : P.ink2);
    text(n, x + TAB_W / 2, 18, on ? P.ink0 : P.dust, 1, 'c');
  });
  drawMenu(setm, items, 40, 38, 240, SET_ROW);
  // the color theme and filters, on the fighters themselves
  if (setm.tab === 1) roster().forEach((id, i) => { const set = SPR.chars[id], s = set.idles[Math.floor(t * 7 + i * 3) % set.idles.length]; ctx.drawImage(s.n, Math.round(56 + i * 30 - s.w / 2), Math.round(164 - 92 / 3), s.w, s.h); });
  if (setm.tab === 3 && inRun) text('DIFFICULTY APPLIES TO YOUR NEXT RUN', W / 2, 142, P.stone2, 1, 'c');
  if (setm.tab === 4) {
    text("USING A CHEAT MAKES THIS A PRACTICE RUN.", W / 2, 135, P.stone2, 1, 'c');
    text('RECORDS AND UNLOCKS REQUIRE A CLEAN RUN.', W / 2, 144, P.stone2, 1, 'c');
  }
  text(input.touch ? 'TAP A TAB, TAP LEFT OR RIGHT SIDE OF A ROW TO CHANGE IT' : 'Q / E SWITCH TABS   ARROWS CHANGE   ESC BACK', W / 2, 170, P.stone2, 1, 'c');
}

// ---------- upgrade pick ----------
export const upg = { opts: [], cards: [], sel: 0, detail: false, t: 0 };
const CW = 94, CH = 100, CG = 8, CY = 48;
const cardX = (i) => Math.round((W - (CW * 3 + CG * 2)) / 2 + i * (CW + CG));
const upgradeName = (u) => typeof u.name === 'function' ? u.name(G.kit) : u.name;
function describeUpgrade(u) {
  const name = upgradeName(u), level = G.taken[u.id] || 0;
  const p = { ...G.p }, up = { ...G.up };
  u.f(up, p);
  let change = '';
  if (p.maxHp !== G.p.maxHp) change = 'MAX HEALTH  ' + G.p.maxHp + ' > ' + p.maxHp;
  else if (u.id === 'mend') change = 'HEALTH  ' + G.p.hp + ' > ' + p.hp;
  else if (p.dashMax !== G.p.dashMax) change = 'DASH CHARGES  ' + G.p.dashMax + ' > ' + p.dashMax;
  else {
    const stats = { dmg:'ALL DAMAGE', wpn:'WEAPON DAMAGE', spell:'SKILL DAMAGE', spd:'ATTACK SPEED', reach:'MELEE REACH',
      focus:'ULTIMATE GAIN', dashMul:'DASH RECHARGE TIME', regen:'ENERGY RECOVERY', shrap:'BLAST RADIUS' };
    for (const [key, label] of Object.entries(stats)) if (up[key] !== G.up[key]) {
      change = label + '  ' + pct(G.up[key]) + ' > ' + pct(up[key]); break;
    }
  }
  const evo = UPG_EVO[u.id];
  const family = u.req ? 'EVOLVED FROM ' + upgradeName(byId(u.req)) : evo ? 'AT MAX RANK  ' + upgradeName(byId(evo)) : '';
  return { name, title: wrapText(name, CW - 6), summary: wrapText(u.d.filter(Boolean).join(' '), CW - 6),
    description: wrapText(u.detail, 244), change, family, rank: u.id === 'mend' ? 'ONE USE' : 'RANK ' + (level + 1) + ' / ' + u.max };
}
export function openUpgrade() {
  upg.opts = rollUpgrades(G.taken, G.char, isBossWave(G.wave));
  upg.cards = upg.opts.map(describeUpgrade);
  upg.sel = 0; upg.detail = false; upg.t = 0;
}
export function updateUpgrade(rdt) {
  upg.t += rdt;
  if (upg.t < 0.6) return -1;
  if (keyHit('Tab')) { upg.detail = !upg.detail; A.ui(); return -1; }
  if (keyHit('ArrowLeft', 'KeyA')) { upg.sel = (upg.sel + 2) % 3; A.ui(); }
  if (keyHit('ArrowRight', 'KeyD')) { upg.sel = (upg.sel + 1) % 3; A.ui(); }
  if (upg.detail) {
    if (keyHit('Escape') || (input.mouse.pressed && inBox(32, 132, 100, 20))) { upg.detail = false; A.ui(); }
    else if (keyHit('Enter', 'Space') || (input.mouse.pressed && inBox(174, 132, 114, 20))) return upg.sel;
    return -1;
  }
  for (let i = 0; i < 3; i++) {
    if (keyHit('Digit' + (i + 1), 'Numpad' + (i + 1))) return i;
    const y = i === upg.sel ? CY - 3 : CY, x = cardX(i);
    if (!inBox(x, y, CW, CH)) continue;
    if (input.mouse.moved || input.mouse.pressed) upg.sel = i;
    if (input.mouse.pressed) {
      if (inBox(x + CW - 27, y + CH - 19, 27, 19)) { upg.detail = true; A.ui(); return -1; }
      return i;
    }
  }
  if (keyHit('Enter', 'Space')) return upg.sel;
  return -1;
}
function drawUpgradeDetail() {
  const o = upg.opts[upg.sel], card = upg.cards[upg.sel], col = C(o.c);
  rect(25, 25, 270, 131, P.ink0); rect(27, 27, 266, 127, P.ink1);
  rect(27, 27, 266, 2, col);
  ctx.save(); ctx.translate(38, 38); ctx.scale(2, 2); drawSprite(icon(o.icon, col), 0, 0, false); ctx.restore();
  text(o.relic ? 'RELIC' : o.req ? 'EVOLUTION' : G.kit.hero, 64, 37, P.dust);
  text(card.rank, 282, 37, P.dust, 1, 'r');
  text(card.name, 64, 48, col, 2);
  rect(37, 63, 246, 1, P.ink3);
  card.description.forEach((s, i) => text(s, 38, 72 + i * 10, P.paper));
  if (card.change) text(card.change, 38, 106, col);
  if (card.family) text(card.family, 38, 118, P.dust);
  rect(32, 132, 100, 20, P.ink2); text('BACK', 82, 140, P.bone, 1, 'c');
  rect(174, 132, 114, 20, col); text('TAKE UPGRADE', 231, 140, P.ink0, 1, 'c');
}
export function drawUpgrade() {
  dim(0.78);
  const k0 = ease(upg.t / 0.3), next = G.wave + 1;
  textO('WAVE ' + G.wave + ' CLEARED', W / 2, 14 - Math.round((1 - k0) * 10), P.ember3, 2, 'c');
  const relicPick = upg.opts.some((o) => o.relic), evoPick = !relicPick && !isBossWave(next) && upg.opts.some((o) => o.req);
  // an evolution on offer says how far along the awakening is (AWAKEN_NEED evolutions awaken the fighter)
  const evoLine = G.evo === true ? 'AN EVOLUTION IS ON OFFER' : 'AN EVOLUTION IS ON OFFER.  ' + evosDone() + ' OF ' + AWAKEN_NEED + ' AWAKEN YOUR FIGHTER';
  textO(relicPick ? 'THE BOSS DROPPED RELICS. CHOOSE ONE' : isBossWave(next) ? 'NEXT: ' + BOSSES[bossFor(next)].name : evoPick ? evoLine : 'TAKE ONE', W / 2, 32, relicPick ? '#ff4fa8' : isBossWave(next) ? P.blood : evoPick ? P.gold : P.dust, 1, 'c');
  for (let i = 0; i < 3; i++) {
    const o = upg.opts[i], oc = C(o.c), k = back((upg.t - 0.08 - i * 0.07) / 0.35), on = upg.sel === i && upg.t > 0.3;
    const x = cardX(i), y = Math.round(CY + (1 - k) * -120) - (on ? 3 : 0);
    rect(x - 1, y - 1, CW + 2, CH + 2, on ? oc : P.ink0); rect(x, y, CW, CH, P.ink1);
    rect(x, y, CW, 1, on ? P.paper : P.ink3);
    const card = upg.cards[i];
    if (o.relic) { rect(x, y, CW, CH, '#1a0d1f'); const gl = Math.floor(G.time * 6) % 2; rect(x - 1, y - 1, CW + 2, 1, gl ? '#ff4fa8' : P.gold); rect(x - 1, y + CH, CW + 2, 1, gl ? P.gold : '#ff4fa8'); rect(x + 2, y + 3, CW - 4, 7, '#ff4fa8'); text('RELIC', x + CW / 2, y + 4, P.ink0, 1, 'c'); }
    else if (o.req) { rect(x, y, CW, CH, '#1d1608'); const gl = Math.floor(G.time * 8) % 2; rect(x - 1, y - 1, CW + 2, 1, gl ? P.gold : P.ember3); rect(x - 1, y + CH, CW + 2, 1, gl ? P.ember3 : P.gold); rect(x + 2, y + 3, CW - 4, 7, P.gold); text('EVOLUTION', x + CW / 2, y + 4, P.ink0, 1, 'c'); }
    else if (o.only && o.only.length === 1) { rect(x + CW - 30, y + 3, 27, 7, P.ink3); text('UNIQUE', x + CW - 16, y + 4, P.gold, 1, 'c'); }
    ctx.save(); ctx.translate(x + CW / 2 - 9, y + 10); ctx.scale(2, 2); drawSprite(icon(o.icon, oc), 0, 0, false); ctx.restore();
    if (on) glow(x + CW / 2, y + 19, oc, 16, 0.3);
    card.title.forEach((s, j) => text(s, x + CW / 2, y + 34 + j * 7, oc, 1, 'c'));
    rect(x + 10, y + 49, CW - 20, 1, P.ink3);
    card.summary.forEach((s, j) => text(s, x + CW / 2, y + 54 + j * 8, P.bone, 1, 'c'));
    text(card.rank, x + 6, y + CH - 12, P.dust);
    rect(x + CW - 25, y + CH - 18, 23, 16, P.ink3);
    text('INFO', x + CW - 14, y + CH - 12, P.paper, 1, 'c');
  }
  if (upg.detail) { dim(0.8); drawUpgradeDetail(); }
  if (upg.t > 0.6) {
    const hint = upg.detail ? 'ARROWS COMPARE   TAB BACK   ENTER TAKE' : '1 2 3 TAKE   ARROWS SELECT   TAB INFO';
    textO(input.touch ? (upg.detail ? '' : 'TAP A CARD TO TAKE IT OR TAP INFO') : hint, W / 2, H - 17, P.dust, 1, 'c');
  }
}

export function drawInheritance(t, granted) {
  const cx = G.p.x - fx.cam.x, cy = G.p.y - fx.cam.y - 10;
  dim(0.36);
  const items = granted.length ? granted : UPGRADES.filter(u => !u.only || u.only.includes(G.char));
  for (let i = 0; i < 16; i++) {
    const k = Math.max(0, Math.min(1, (t - i * 0.10) / 1.05));
    if (k === 0 || k === 1) continue;
    const a = i * 2.4 + k * 0.85, r = (1 - k * k) * 88, u = items[Math.floor(i * items.length / 16)];
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.64;
    line(x, y, x + Math.cos(a - 0.4) * 6, y + Math.sin(a - 0.4) * 4, C(u.c));
    drawSprite(icon(u.icon, C(u.c)), x - 4, y - 4, false);
  }
  if (t > 1.2) { const k = Math.min(1, (t - 1.2) / 1.5); ctx.globalAlpha = 1 - k; ring(cx, cy, 8 + k * 49, 2, P.gold); ctx.globalAlpha = 1; }
  textO('THE ASH REMEMBERS', W / 2, 20, P.gold, 2, 'c');
  textO('EVERY GIFT IT CARRIED IS YOURS.', W / 2, 40, P.bone, 1, 'c');
  if (t > 1.45) textO('ALL UPGRADES AND RELICS OBTAINED', W / 2, H - 24, P.paper, 1, 'c');
}

// ---------- pause ----------
export const pauseMenu = { sel: 0 };
export const PAUSE_ROW = 16;
export function pauseItems(go) {
  return [
    { label: 'RESUME', act: () => go('resume') },
    { label: 'SETTINGS', act: () => go('settings') },
    { label: G.training ? 'START TRAINING AGAIN' : 'RESTART FROM WAVE ' + G.wave, act: () => go('restart') },
    { label: G.training ? 'BACK TO THE CAMP' : 'SAVE AND EXIT TO MENU', act: () => go('exit') },
  ];
}
export function drawPause(items) {
  dim(0.8);
  textO('PAUSED', W / 2, 22, P.paper, 3, 'c');
  text(G.kit.hero + '   WAVE ' + G.wave + '   ' + MAPS[G.mapKey].name + '   ' + G.diffKey, W / 2, 46, P.dust, 1, 'c');
  drawMenu(pauseMenu, items, 70, 62, 180, PAUSE_ROW);
  // today's missions and how far along they are (they count in real runs only)
  if (!G.tested && !G.training) {
    const list = dailyList();
    if (list.length) text("TODAY'S MISSIONS", W / 2, 122, P.gold, 1, 'c');
    list.forEach((m, i) => {
      const ready = !m.claimed && m.got >= m.goal;
      text(m.text + '   ' + (m.claimed ? 'CLAIMED' : ready ? 'DONE: CLAIM IT AT CAMP' : Math.min(m.got, m.goal) + '/' + m.goal), W / 2, 130 + i * 7, m.claimed ? '#6a8a6a' : ready ? P.gold : '#8a7a80', 1, 'c');
    });
  }
  text(G.saveError ? 'SAVE FAILED. CHECK BROWSER STORAGE AND RETRY.' : G.training ? 'TRAINING IS NEVER SAVED' : G.night ? 'SAVE KEEPS YOUR ENDLESS TIME AND BUILD' : 'CONTINUE RESTARTS THIS WAVE FROM ITS CHECKPOINT', W / 2, 155, G.saveError ? P.ember3 : P.stone2, 1, 'c');
  if (!input.touch) text('ESC TO RESUME', W / 2, 165, P.stone2, 1, 'c');
}

// ---------- game over ----------
// two columns of run stats; each number counts up as it appears
function stats(y0, t) {
  const tm = Math.floor(G.time), clock = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0');
  const rows = [
    ['SCORE', G.score], ['TIME', clock],
    ['KILLS', G.kills], ['BOSSES SLAIN', G.bosses],
    ['DAMAGE DEALT', Math.round(G.dmg)], ['BEST MULTI', G.bestMulti >= 2 ? multiName(G.bestMulti) : '-'],
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
// what the run paid, worked out now that it is over: the lootlings' coins and the payout (world.js payOut), counting up
function payout(y, t) {
  const pay = G.payout, k = Math.min(1, t / 0.8), n = Math.round(G.gold * (1 - Math.pow(1 - k, 3)));
  if (G.gold <= 0) { text('NO GOLD THIS TIME. THE DEEPER YOU GO, THE MORE THE PIT PAYS', W / 2, y, P.dust, 1, 'c'); return; }
  let why = [['LOOTLINGS', pay.found], ['DEPTH', pay.depth], ['BOSSES', pay.bosses], ['NIGHT', pay.night], ['KILLS', pay.kills]].filter(([, v]) => v > 0).map(([a, v]) => a + ' ' + v).join('  ');
  if (pay.mult !== 1 && pay.total > 0) why += '  X' + pay.mult + ' ' + G.diffKey;
  const head = '+' + n, w = textW(head) + 8 + 8 + textW(why), x0 = Math.round(W / 2 - w / 2);
  drawGold(x0, y, 'l', head);
  text(why, x0 + textW(head) + 16, y, P.dust);
}
export function drawOver(t, isBest) {
  const k = ease(t / 0.6);
  dim(0.75 * k);
  textO('YOU FELL', W / 2, 26 - Math.round((1 - k) * 12), P.blood, 4, 'c');
  // below the pit, what counts is how long they held the dark back; in the endless night, for how long
  const held = G.wave - 20;
  textO(G.night ? G.kit.hero + ' HELD THE ENDLESS NIGHT FOR ' + clockOf(G.night.t) + '   BEST ' + clockOf(Math.max(best.night || 0, G.night.t))
    : G.won ? G.kit.hero + ' HELD THE DARK FOR ' + held + (held === 1 ? ' NIGHT' : ' NIGHTS') : G.kit.hero + ' FELL ON WAVE ' + G.wave, W / 2, 52, G.won ? '#b48cff' : P.bone, 1, 'c');
  if (G.deathLine) text(G.deathLine, W / 2, 61, P.dust, 1, 'c');
  stats(72, t);
  if (G.payout && t > 1.1) payout(122, t - 1.1);
  if (isBest && t > 1 && Math.floor(t * 3) % 2) textO('NEW BEST', W / 2, 130, P.gold, 2, 'c');
  // the King's parting words over your body (the pit's, once he's dead), typed out
  if (G.lastWords && t > 0.8) { const n = Math.floor((t - 0.8) * 30); textO(G.lastWords.slice(0, n), W / 2, 142, G.won ? '#b48cff' : P.ember, 1, 'c'); }
  if (t > 1 && !input.touch) textO('ENTER  SAME FIGHTER AGAIN     ESC  MENU', W / 2, 153, P.paper, 1, 'c');
  // the next fighter still in ash, and how close you are to waking them (on a phone the buttons are there instead)
  if (t > 1.4 && !input.touch && !G.tested) {
    const next = OPTIONS.char.find((id) => !isUnlocked(id) && CHARS[id].mission);
    if (next) { const k = CHARS[next]; text('NEXT TO WAKE: ' + (next === 'DEV' ? '???' : k.hero) + '.  ' + k.mission[0] + '   ' + k.mission[1](), W / 2, 165, P.stone2, 1, 'c'); }
  }
  // on a phone, two big buttons (the left half of the screen plays again, the right half goes to the menu)
  if (t > 1 && input.touch) for (const [x, label, c] of [[W / 2 - 104, 'AGAIN', P.ember], [W / 2 + 8, 'MENU', P.stone2]]) {
    rect(x - 1, 151, 98, 20, P.ink0); rect(x, 152, 96, 18, P.ink2); rect(x, 152, 96, 1, c);
    textO(label, x + 48, 157, P.paper, 2, 'c');
  }
}

// ---------- opening: a press-to-begin gate (browsers need a gesture for sound), then the intro cinematic ----------
// The cinematic, any key skips it:
//   a white cut splits the black screen open on two lines of story,
//   all eight fighters cut in one after another: their big portrait slams in on a slanted band with
//   their name and attack sound (locked fighters show too, tagged LOCKED; only the secret one stays a
//   lit silhouette),
//   the eight stand side by side in slanted slices,
//   a slash wipes them away and the logo slams down letter by letter over the empty battlement.
const BEAT0 = 1.75, BEAT = 0.42, LINEUP = BEAT0 + 8 * BEAT, LOGO0 = LINEUP + 1.05;
export const INTRO_LEN = LOGO0 + 2.25;
const LETTER = (i) => LOGO0 + 0.12 + i * 0.07;
const ULT = LOGO0 + 1.4;
const STORY = [[0.5, 'THE ASHEN KING SWALLOWED THE SUN.'], [1.1, 'EIGHT STILL STAND.']];
// a cue is [time, sound, phone buzz]; the beats play each fighter's own heavy attack as they land
export const INTRO_CUES = [
  // (just after 0: a cue fires on the frame the clock passes it, and the first frame already starts past 0)
  [0.001, () => { A.rift(); A.introStart(); }], [0.35, () => A.riftCut(), 'heavy'],
  ...STORY.map(([t]) => [t, () => A.wall(), 'tap']),
  ...OPTIONS.char.flatMap((id, i) => [[BEAT0 + i * BEAT, () => { A.dash(); A.introBeat(i); }], [BEAT0 + i * BEAT + 0.12, () => A.charAtk(id, true), 'tap']]),
  [LINEUP, () => A.introLineup()],
  ...OPTIONS.char.map((_, i) => [LINEUP + i * 0.05, () => A.wall()]),
  [LOGO0, () => { A.riftCut(); A.introLogo(); }, 'heavy'],
  ...Array.from({ length: 8 }, (_, i) => [LETTER(i) + 0.1, () => A.wall(), 'tap']),
  [ULT, () => A.ultRelease(), 'heavy'],
];
// screen shake: [time, strength]
const SHAKES = [[0.35, 4], ...STORY.map(([t]) => [t, 1.5]), ...OPTIONS.char.map((_, i) => [BEAT0 + i * BEAT + 0.12, 3]), [LINEUP + 0.35, 2], [LOGO0, 4], [ULT, 5]];
// the select screen's portraits load while the press-to-begin gate waits; one still is painted per frame
let held = 0;
// The opening holds on its story lines until the fighters' sprites are in, so the cuts never show empty frames.
// A very slow connection gives up after 12 seconds.
const HOLD = BEAT0 - 0.25;
let heroesIn = false, heroesHooked = false;
function heroesLoaded() {
  if (!heroesHooked && SPR.heroesReady) { heroesHooked = true; SPR.heroesReady.then(() => { heroesIn = true; }); }
  return heroesIn;
}
export function introClock(t, dt) {
  if (t <= HOLD || t - dt > HOLD || heroesLoaded() || held > 12) return t;
  held += dt;
  return HOLD;
}
const holding = (t) => t >= HOLD - 0.001 && t <= HOLD + 0.001 && !heroesLoaded();
// the portraits start loading on the first screen, so the select screen has them ready
function warmPortraits() { loadPortraits(); }
// The press-any-key screen: the swallowed sun hangs black over the pit, its corona burning and its rays
// turning, the logo smolders below it, embers rise out of the pit, and the whole sky beats like a heart.
const sparks = [];
export function drawSplash(t, touch) {
  warmPortraits();
  const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.1)), 12), cx = W / 2, cy = 58, R = 30;
  fillScreen('#000');
  // a red sky that brightens toward the horizon, dithered in bands
  for (let y = 0; y < H; y++) {
    const k = Math.max(0, (y - 20) / (H - 20)) * (0.55 + beat * 0.25);
    for (let x = (y & 1); x < W; x += 2) if (k > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 * 1.6) px(x, y, '#1a0610');
  }
  // the corona: a wide red glow, turning rays and a burning rim, pulsing with the beat
  glow(cx, cy, P.blood, 90, 0.22 + beat * 0.18);
  glow(cx, cy, P.ember, 56, 0.28 + beat * 0.25);
  for (let i = 0; i < 24; i++) {
    const a = t * 0.15 + (i * TAU_) / 24, L = (i % 3 ? 14 : 24) + Math.sin(t * 3 + i * 1.7) * 4 + beat * 8;
    ctx.globalAlpha = 0.35 + 0.35 * Math.max(0, Math.sin(t * 2 + i));
    line(cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3), cx + Math.cos(a) * (R + 3 + L), cy + Math.sin(a) * (R + 3 + L), i % 3 ? P.ember : P.ember3);
  }
  ctx.globalAlpha = 1;
  ring(cx, cy, R + 2, 2, P.ember2); ring(cx, cy, R + 1, 1, P.ember3);
  disc(cx, cy, R, '#030104');
  // a thin crescent of light still slipping past the black sun
  for (let i = -10; i <= 10; i++) { const a = -0.6 + i * 0.06; px(cx + Math.cos(a) * R, cy + Math.sin(a) * R, i % 3 ? P.paper : P.ember3); }
  // the pit: a jagged black rim with burning cracks
  ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 150 + Math.sin(x * 0.11) * 4 + ((x * 37) % 7));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 6; i++) { const x = 24 + i * 52 + Math.sin(i) * 10, a = 0.4 + 0.4 * Math.sin(t * 2.5 + i * 2); ctx.globalAlpha = a; line(x, 156, x + 8, 168, P.ember); line(x + 8, 168, x + 4, 179, P.ember2); ctx.globalAlpha = 1; glow(x + 6, 165, P.ember, 10, 0.25 * a); }
  // embers rising out of the pit
  if (sparks.length < 70 && Math.random() < 0.7) sparks.push({ x: Math.random() * W, y: H, vx: (Math.random() - 0.5) * 10, vy: -12 - Math.random() * 30, life: 3 + Math.random() * 4, t: 0, c: Math.random() < 0.6 ? P.ember : P.ember3 });
  for (const s of sparks) { s.t += 1 / 60; s.x += (s.vx + Math.sin(s.t * 2 + s.y * 0.05) * 8) / 60; s.y += s.vy / 60; ctx.globalAlpha = Math.max(0, 1 - s.t / s.life); px(s.x, s.y, s.c); glow(s.x, s.y, s.c, 3, 0.3); ctx.globalAlpha = 1; }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].life || sparks[i].y < -4) sparks.splice(i, 1);
  // the logo smolders: each column of letters flickers a little brighter or dimmer on its own
  const lx = Math.round((W - LOGO.width) / 2), ly = 100;
  glow(cx, ly + 14, P.ember, 70, 0.18 + beat * 0.15);
  ctx.drawImage(LOGO, lx, ly);
  for (let x = 0; x < LOGO.width; x += 3) { const a = 0.12 + 0.12 * Math.sin(t * 6 + x * 0.7); ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(lx + x, ly, 3, LOGO.height); }
  ctx.globalAlpha = 1;
  textO('THE KING SWALLOWED THE SUN', cx, ly + 36, P.dust, 1, 'c');
  // the prompt: arrows close in on it with each beat
  const msg = touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY', pulse = 0.75 + 0.25 * Math.sin(t * 4), gap = 44 + Math.round(4 * (1 - beat));
  ctx.globalAlpha = pulse; textO(msg, cx, 160, P.paper, 1, 'c'); ctx.globalAlpha = 1;
  textO('>', cx - gap - 6, 160, P.ember, 1, 'c'); textO('<', cx + gap + 6, 160, P.ember, 1, 'c');
  text('SOUND ON', cx, 171, P.stone2, 1, 'c');
}
const TAU_ = Math.PI * 2;
const veil = (a, col = P.paper) => { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a) * (settings.flash ? 1 : 0.2); rect(-SX, 0, FW, H, col); ctx.globalAlpha = 1; };
// the secret fighter stays a silhouette until unlocked
const hidden = (id) => id === 'DEV' && locked(id);
// one fighter's beat: a slanted band in their color, the fighter (their sprite five times the size) slamming in
// from its side and cutting or firing as it lands, the name slamming down on the other side
function drawBeat(i, t) {
  const id = OPTIONS.char[i], ch = CHARS[id], lk = hidden(id), col = lk ? P.dust : ch.color(), right = i % 2 === 1;
  const k = ease(t / 0.16), dir = right ? 1 : -1;
  rect(-SX - 10, -10, FW + 20, H + 20, P.void);
  // speed lines in the fighter's color, rushing the way the fighter came from
  for (let j = 0; j < 22; j++) {
    const y = (j * 37 + i * 13) % H, len = 24 + ((j * 53) % 80), run = (t * 900 * (1 + (j % 3) * 0.4) + j * 71) % (FW + 200);
    const x = right ? W + SX + 100 - run : run - 100 - len - SX;
    line(x, y, x + len, y, j % 4 ? P.ink2 : col);
  }
  ctx.save(); ctx.translate(W / 2, H / 2 + 10); ctx.rotate(right ? 0.18 : -0.18);
  const bh = 78 * ease(t / 0.12);
  rect(-W, -bh / 2, W * 2, bh, P.ink1); rect(-W, -bh / 2, W * 2, 2, col); rect(-W, bh / 2 - 2, W * 2, 2, col);
  for (let j = 0; j < 12; j++) rect(-W + ((j * 60 + t * 220 * -dir + 4000) % (W * 2)), -bh / 2 + 5, 18, Math.max(0, bh - 10), P.ink0);
  ctx.restore();
  // the fighter, facing the middle, feet on the bottom of the screen
  const S = 5, tx = right ? W - 72 : 72, from = right ? W + 110 : -110, x = Math.round(from + (tx - from) * k - dir * t * 10), y = H - 3;
  glow(x, H / 2 + 6, col, 80, lk ? 0.12 : 0.35);
  if (k < 1) for (let g = 3; g >= 1; g--) drawFighter(id, x + dir * g * 24, y, S, { flip: right, t, tint: col, alpha: 0.3 / g });
  const swing = Math.max(0, Math.min(1, (t - 0.12) / 0.3));
  const res = drawFighter(id, x, y, S, { flip: right, t, tint: lk ? '#07050b' : t > 0.1 && t < 0.15 ? P.paper : null, rim: lk ? col : null, wa: lk ? undefined : flourishAngle(id, swing, right) });
  if (!lk && res && swing > 0 && swing < 1) flourishFx({ id, flip: right, x, y }, res, swing, S);
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
// all eight side by side in slanted slices, dropping in from alternate sides, each showing the fighter's face
function drawLineup(t) {
  rect(-SX - 10, -10, FW + 20, H + 20, P.void);
  const SW = FW / 8, SL = 14;
  OPTIONS.char.forEach((id, i) => {
    const k = ease((t - i * 0.05) / 0.22);
    if (k <= 0) return;
    const lk = hidden(id), col = lk ? P.dust : CHARS[id].color(), dy = Math.round((i % 2 ? 1 : -1) * (1 - k) * H), x0 = i * SW - SX;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0 + SL / 2, dy); ctx.lineTo(x0 + SW + SL / 2, dy); ctx.lineTo(x0 + SW - SL / 2, H + dy); ctx.lineTo(x0 - SL / 2, H + dy); ctx.closePath(); ctx.clip();
    rect(x0 - SL, dy, SW + SL * 2, H, P.ink1); glow(x0 + SW / 2, H / 2 + dy, col, 40, 0.3);
    drawFighter(id, x0 + SW / 2, 184 + dy, 5, { flip: i >= 4, t: t + i * 0.3, tint: lk ? "#07050b" : null, rim: lk ? col : null });
    if (k < 1) drawFighter(id, x0 + SW / 2, 184 + dy, 5, { flip: i >= 4, t, tint: col, alpha: 1 - k });
    ctx.restore();
    // the slice edges glow in the fighter's color
    line(x0 + SW + SL / 2, dy, x0 + SW - SL / 2, H + dy, col);
  });
  if (t > 0.45) { ctx.globalAlpha = 0.75 * ease((t - 0.45) / 0.15); rect(-SX, H - 27, FW, 20, P.void); ctx.globalAlpha = 1; textO('HOLD THE PIT', W / 2, H - 20, P.paper, 2, 'c'); }
}
// the title scene builds up: the logo slams down letter by letter over the empty battlement, then a ring bursts off
// it. It ends on exactly the title screen, so the switch to the menu has no cut.
function drawLogoPhase(t) {
  const lx = Math.round((W - LOGO.width) / 2), ly = LOGO_Y;
  drawScene(t);
  for (let i = 0; i < 8; i++) {
    const k = (t - LETTER(i)) / 0.1;
    if (k <= 0) continue;
    const y = k >= 1 ? 0 : -60 * (1 - k * k);
    ctx.save(); ctx.beginPath(); ctx.rect(lx + i * 24, 0, 24, H); ctx.clip();
    ctx.drawImage(LOGO, lx, ly + Math.round(y));
    ctx.restore();
    if (k >= 1 && k < 2.6) glow(lx + i * 24 + 12, ly + 16, P.ember, 16, 0.55 * (1 - (k - 1) / 1.6));
  }
  if (t > LETTER(7) + 0.1) textO('THE KING SWALLOWED THE SUN', W / 2, ly + LOGO.height + 1, P.dust, 1, 'c');
  if (t > ULT) {
    const k = (t - ULT) / 0.8;
    if (k < 1) { ring(W / 2, ly + 16, 20 + k * 220, Math.max(1, Math.round(4 * (1 - k))), P.paper); ring(W / 2, ly + 16, 10 + k * 160, 1, P.ember); }
  }
}
export function drawIntro(t) {
  let sh = 0;
  for (const [ct, s] of SHAKES) if (t >= ct && t - ct < 0.15) sh = Math.max(sh, s * (1 - (t - ct) / 0.15));
  sh *= settings.shake;
  const ox = Math.round((Math.random() - 0.5) * sh * 2), oy = Math.round((Math.random() - 0.5) * sh * 2);
  // the first cut: a white line runs across the black screen
  if (t < 0.35) {
    fillScreen('#000');
    const x = Math.round(W * (t / 0.35));
    rect(0, H / 2, x, 1, P.paper); rect(0, H / 2 + 1, x, 1, P.ember);
    glow(x, H / 2, P.paper, 18, 0.8);
    return;
  }
  ctx.save(); ctx.translate(ox, oy);
  if (t < BEAT0) {
    // the story, typed over the empty battlement under the black sun
    drawScene(t, { dark: 0.45, sun: 0.7 });
    STORY.forEach(([s, line_], j) => {
      if (t < s) return;
      const n = Math.min(line_.length, Math.floor((t - s) * 60));
      textO(line_.slice(0, n), W / 2, 86 + j * 22, j ? P.ember3 : P.bone, j ? 2 : 1, 'c');
    });
    // still waiting on the fighters' pictures: a thin bar fills under the story
    if (holding(t)) { const w = 120; rect(W / 2 - w / 2, 136, w, 1, P.ink3); rect(W / 2 - w / 2, 136, Math.round(w * Math.min(0.95, held / 3)), 1, P.ember); }
    // the screen closes to black for the first fighter
    if (t > BEAT0 - 0.2) { ctx.globalAlpha = (t - (BEAT0 - 0.2)) / 0.2; rect(-SX - 10, -10, FW + 20, H + 20, P.void); ctx.globalAlpha = 1; }
  } else if (t < LINEUP) {
    const i = Math.floor((t - BEAT0) / BEAT);
    drawBeat(i, t - BEAT0 - i * BEAT);
  } else if (t < LOGO0) drawLineup(t - LINEUP);
  else drawLogoPhase(t);
  ctx.restore();
  // the black halves split along the first cut
  if (t < 0.8) {
    const k = Math.min(1, (t - 0.35) / 0.45), e = k * k;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, -Math.round((H / 2) * e), W, H / 2); ctx.fillRect(0, H / 2 + Math.round((H / 2) * e), W, H / 2);
    rect(0, H / 2 - Math.round((H / 2) * e), W, 1, P.ember); rect(0, H / 2 + Math.round((H / 2) * e), W, 1, P.ember);
  }
  // flashes: the first cut, a soft one on each fighter, and white wipes into the logo and the ring
  veil((0.55 - t) / 0.2 * 0.8 * (t < 0.55 ? 1 : 0));
  if (t >= BEAT0 && t < LINEUP) { const bt = (t - BEAT0) % BEAT; if (bt > 0.1 && bt < 0.2) veil((0.2 - bt) / 0.1 * 0.3); }
  if (t >= LOGO0 - 0.12 && t < LOGO0 + 0.25) veil((t < LOGO0 ? (t - (LOGO0 - 0.12)) / 0.12 : 1 - (t - LOGO0) / 0.25) * 0.95);
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
  if (sk.id !== null) {
    const g=skillPreview(p,sk.key,sk), col=sk.cancel?P.blood:sk.key==='r'?P.gold:kit.color();
    if (g) {
      ctx.save(); ctx.translate(-Math.round(fx.cam.x+fx.ox),-Math.round(fx.cam.y+fx.oy));
      ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1; ctx.beginPath();
      if (g.r) ctx.arc(g.x,g.y,g.r,0,Math.PI*2);
      else if (g.spread) { ctx.moveTo(g.x0,g.y0); ctx.arc(g.x0,g.y0,g.length,g.a-g.spread,g.a+g.spread); ctx.closePath(); }
      else {
        const a=Math.atan2(g.y-g.y0,g.x-g.x0),nx=-Math.sin(a)*g.width,ny=Math.cos(a)*g.width;
        ctx.moveTo(g.x0+nx,g.y0+ny); ctx.lineTo(g.x+nx,g.y+ny); ctx.lineTo(g.x-nx,g.y-ny); ctx.lineTo(g.x0-nx,g.y0-ny); ctx.closePath();
      }
      ctx.globalAlpha=sk.cancel?0.04:0.15; ctx.fill(); ctx.globalAlpha=0.83; ctx.stroke();
      if(g.r){ line(g.x-3,g.y,g.x+3,g.y,col); line(g.x,g.y-3,g.x,g.y+3,col); }
      ctx.restore();
    }
    const b = TOUCH_BTNS.find((t) => t.id === sk.key);
    if (sk.cancel) textO('CANCEL', b.x - b.r - 4, b.y - 3, P.blood, 1, 'r');
    else textO('BACK TO CANCEL', W + SX - 4, 60, P.dust, 1, 'r');
  }
  const recovery = Math.max(0, (p.nextDash || 0) - G.t);
  const dashFill = p.charges ? 1 : 1 - p.dashCd / (kit.dash.cd * G.up.dashMul);
  const recoveryFill = recovery ? 1 - recovery / (kit.dash.time + dashGap(kit)) : 1;
  const state = {
    attack: [true, 1, PRIMARY_ICON[G.char], kit.color()],
    dash: [p.charges > 0 && recovery === 0 && p.energy >= DASH_COST, Math.min(dashFill, recoveryFill, p.energy / DASH_COST), 'dash', P.paper],
    q: [p.energy >= kit.q.cost && p.cdQ <= 0, Math.min(p.energy / kit.q.cost, 1 - Math.max(0, p.cdQ) / kit.q.cd), kit.q.icon, kit.color()],
    e: [p.energy >= kit.e.cost && p.cdE <= 0, Math.min(p.energy / kit.e.cost, 1 - Math.max(0, p.cdE) / kit.e.cd), kit.e.icon, kit.color()],
    r: [full, p.ult / 100, kit.r.icon, P.gold],
  };
  for (const b of TOUCH_BTNS) {
    if (b.id === 'pause') {
      // the menu button: pause, settings, restart, back to the menu
      const held_ = input.tb.pause;
      ctx.globalAlpha = 0.85; rect(b.x - 10, b.y - 9, 20, 18, P.ink0); rect(b.x - 9, b.y - 8, 18, 16, held_ ? P.ink3 : P.ink2); ctx.globalAlpha = 1;
      rect(b.x - 9, b.y - 8, 18, 1, P.stone2);
      rect(b.x - 4, b.y - 4, 3, 8, P.paper); rect(b.x + 1, b.y - 4, 3, 8, P.paper);
      textO('MENU', b.x, b.y + 11, P.bone, 1, 'c');
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
  rect(-SX - 10, -10, FW + 20, H + 20, P.void);
  // speed lines rushing past
  for (let i = 0; i < 28; i++) {
    const y = (i * 37 + 11) % H, len = 30 + ((i * 53) % 90), x = W + SX + 120 - ((t * 760 * (1 + (i % 3) * 0.5) + i * 61) % (FW + 260));
    line(x, y, x + len, y, i % 4 ? P.ink2 : col);
  }
  // a tilted band the fighter stands on
  ctx.save(); ctx.translate(W / 2, H / 2 + 6); ctx.rotate(-0.16);
  const bh = 70 * ease(t / 0.22);
  rect(-W, -bh / 2, W * 2, bh, P.ink1); rect(-W, -bh / 2, W * 2, 2, col); rect(-W, bh / 2 - 2, W * 2, 2, col);
  for (let i = 0; i < 12; i++) rect(-W + ((i * 60 + t * 140) % (W * 2)), -bh / 2 + 4, 20, Math.max(0, bh - 8), P.ink0);
  ctx.restore();
  // the fighter's big portrait dashes in with afterimages, flashes white as the slash lands, then plays its loop
  // and pushes in slowly. Without the portrait (still loading) the 5x sprite does the same.
  const pic = portraitReady(id);
  if (pic) {
    // three canvas pixels to an art pixel, the feet below the screen: a shot from the knees up. Unit-7 is a squat
    // machine (its picture is 161 art pixels tall, the others about 230), so it stands on the screen instead, its
    // middle at the screen's middle, on the left like the rest.
    const k = ease((t - 0.06) / 0.28), S = PORTRAIT_SCALE + 1, x = -110 + (84 + 110) * k, y = id === 'ROBOT' ? H / 2 + 81 : H + 64;
    glow(x, H / 2, col, 80, 0.3);
    if (k < 1) for (let g = 4; g >= 1; g--) drawPortrait(id, t, x - g * 18, y, S, { tint: col, alpha: 0.3 / g });
    drawPortrait(id, t, x, y, S);
    if (t > 0.36 && t < 0.5) drawPortrait(id, t, x, y, S, { tint: '#ffffff', alpha: 1 - (t - 0.36) / 0.14 });
  }
  // the fighter dashes in at 5x with afterimages, then settles and breathes
  const S = 5, k = ease((t - 0.06) / 0.28), fr = k < 1 ? set.run[Math.floor(t * 18) % set.run.length] : set.idles[Math.floor(t * 7) % set.idles.length];
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
    ctx.globalAlpha = a; rect(-SX, 0, FW, H, P.paper); ctx.globalAlpha = 1;
    if (pic) { const h = hdCtx(); h.globalAlpha = a; h.fillStyle = P.paper; h.fillRect(-SX, 0, FW, H); h.globalAlpha = 1; }
  }
}

export function drawLeave(menu,items) {
  drawBackdrop(0,0.85); textO('LEAVE ASHBLADE?', W/2,44,P.ember2,2,'c');
  drawMenu(menu,items,90,76,140,19);
}
