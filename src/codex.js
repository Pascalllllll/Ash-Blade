// The Compendium: everything a player has found, kept across runs (best.codex in store.js). Six pages: the fighters
// (and their awakened forms), the monsters, the bosses, the floors of the pit, the endings (watch one again) and the
// records. What hasn't been found yet is a dark shape and '???'. Opened from the title menu or the camp's old stone.
// Keys: Q / E or Tab change the page, arrows pick, Enter uses (hear a fighter, watch an ending), Escape goes back.
import { ctx, W, H, FW, SX, P, rect, px, text, textO, textW, glow, drawSprite } from './gfx.js?v=206';
import { A } from './audio.js?v=206';
import { input, keyHit } from './input.js?v=206';
import { OPTIONS, best, isUnlocked } from './store.js?v=206';
import { CHARS } from './chars.js?v=206';
import { SPR, EVO_NAMES } from './sprites.js?v=206';
import { MAPS, DEPTHS } from './maps.js?v=206';
import { BOSSES, ORDER } from './bosses.js?v=206';
import { monsterFrame } from './monster-motion.js?v=206';
import { drawFighter } from './title-scene.js?v=206';
import { drawEmote } from './emotes.js?v=206';

const FOES = {
  husk: ['ASH HUSK', "WHAT IS LEFT OF THE KING'S PEOPLE.", 'THEY WIND UP BEFORE THEY SWING.'],
  wisp: ['HEX WISP', 'A SPARK OF CURSED FIRE.', 'ITS PINK ORBS CAN BE HIT BACK.'],
  tick: ['EMBER TICK', 'SMALL AND QUICK.', 'IT LIGHTS ITS FUSE AND BURSTS.'],
  brute: ['ASH BRUTE', 'ONCE A SMITH. STILL SWINGS LIKE ONE.', 'SLOW TO TURN. HITS HARD.'],
  slime: ['PIT SLIME', 'IT FELL IN AND NEVER LEFT.', 'CUT IT AND IT SPLITS IN TWO.'],
  slimelet: ['SLIMELET', 'WHAT A PIT SLIME LEAVES BEHIND.', 'IT HOPS AT YOUR ANKLES.'],
  spitter: ['ACID SPITTER', 'IT HANGS BACK AND LOBS ACID.', 'GET IN CLOSE.'],
  shade: ['SHADE', 'A SHADOW THAT FORGOT ITS OWNER.', 'IT FADES, THEN STRIKES FROM BEHIND.'],
  archer: ['ASH ARCHER', "THE KING'S GUARD STILL AIMS TRUE.", 'WATCH FOR THE LINE OF ITS SHOT.'],
  priest: ['ASH PRIEST', 'IT CHANTS TO HEAL THE OTHERS.', 'HIT IT MID-CHANT TO BREAK THE SPELL.'],
  lootling: ['LOOTLING', 'A THIEF FULL OF ENERGY.', 'EVERY HIT SHAKES SOME LOOSE. CATCH IT.'],
  larva: ['BROOD LARVA', "THE BROOD MOTHER'S YOUNG.", 'IT BURSTS ON YOU. THERE ARE ALWAYS MORE.'],
  egg: ['BROOD EGG', 'SOMETHING MOVES INSIDE.', 'BREAK IT BEFORE IT HATCHES.'],
  bellwraith: ['BELL WRAITH', 'IT RINGS FOR THE DEAD.', 'EACH TOLL SENDS A RING ALONG THE FLOOR.'],
  glasswing: ['GLASSWING', 'A MOTH FROM THE GLASS HALL.', 'IT THROWS SHARDS THAT BOUNCE.'],
};
const TRICK = {
  warden: 'HIS CHAIN HOLDS YOU. THREE DASHES BREAK IT.', brood: 'HER WEBS HOLD YOUR FEET. HER YOUNG NEVER STOP.',
  colossus: 'A WAR MACHINE NOBODY TURNED OFF.', king: 'WHEN HE SAYS KNEEL, DO NOT MOVE.',
  wyrm: 'IT SWALLOWS YOU WHOLE. CUT YOUR WAY OUT.', herald: 'HIS HORN CHARGES THE FLOOR. STAND ON THE DARK TILES.',
  mirror: 'IT LEARNED YOUR MOVES. IT FIGHTS LIKE YOU.', eclipse: 'ITS STARE HOLDS YOU IN PLACE.',
  clock: 'STAND IN ITS DIAL WHEN THE HAND COMES ROUND AND TIME STOPS.', nox: 'THE NIGHT AFTER THE LAST NIGHT.',
};
const PAGES = ['FIGHTERS', 'MONSTERS', 'BOSSES', 'FLOORS', 'ENDINGS', 'RECORDS'];
const cx = () => best.codex;
const n = (cat, k) => cx()[cat]?.[k] || 0;
const lines = () => [
  ['BEST SCORE', best.score], ['DEEPEST WAVE', best.wave], ['MONSTERS SLAIN', best.kills], ['BEST COMBO', best.combo],
  ['PERFECT DODGES IN A RUN', best.perfects], ['BOSSES BEATEN', Object.values(cx().bosses || {}).reduce((a, b) => a + b, 0)],
  ['THE ASHEN KING', best.won ? 'SLAIN' : 'WAITS'], ['LONGEST NIGHT', Math.floor((best.night || 0) / 60) + ':' + String((best.night || 0) % 60).padStart(2, '0')],
  ['FIGHTERS AWAKE', Object.keys(cx().awake || {}).length + ' / 8'], ['ENDINGS SEEN', Object.keys(cx().endings || {}).length + ' / 8'],
];
function entries(page) {
  if (page === 0) return OPTIONS.char.map((id) => ({ id, known: isUnlocked(id), label: isUnlocked(id) ? CHARS[id].hero : '???' }));
  if (page === 1) return Object.keys(FOES).map((id) => ({ id, known: n('foes', id) > 0, label: n('foes', id) > 0 ? FOES[id][0] : '???' }));
  if (page === 2) return ORDER.map((id, i) => ({ id, wave: (i + 1) * 5, known: n('bosses', id) > 0 || best.wave > (i + 1) * 5, label: n('bosses', id) > 0 || best.wave > (i + 1) * 5 ? BOSSES[id].short : '???' }));
  if (page === 3) return DEPTHS.map((id, i) => ({ id, wave: i * 5 + 1, known: n('floors', id) > 0 || best.wave >= i * 5 + 1, label: n('floors', id) > 0 || best.wave >= i * 5 + 1 ? MAPS[id].name : '???' }));
  if (page === 4) return OPTIONS.char.map((id) => ({ id, known: n('endings', id) > 0, label: n('endings', id) > 0 ? CHARS[id].hero + ' GOES HOME' : '???' }));
  return lines().map(([k, v]) => ({ id: k, known: true, label: k, v }));
}
// how much has been found, over everything there is
export function completion() {
  let got = 0, all = 0;
  for (let p = 0; p < 5; p++) for (const e of entries(p)) { all++; if (e.known) got++; }
  all += 8; got += Object.keys(cx().awake || {}).length;
  return Math.round((got / all) * 100);
}

export const codex = { page: 0, sel: 0, t: 0, from: 'title', hover: -1 };
export function openCodex(from) { Object.assign(codex, { page: 0, sel: 0, t: 0, from }); }
const ROW = 11, LIST_Y = 34, LIST_X = 6, LIST_W = 112, VISIBLE = 12;
const tabX = (i) => 6 + i * 52;

export function updateCodex(dt) {
  codex.t += dt;
  const list = entries(codex.page);
  const turn = (d) => { codex.page = (codex.page + d + PAGES.length) % PAGES.length; codex.sel = 0; A.ui(); };
  if (keyHit('KeyE', 'Tab', 'PageDown', 'BracketRight')) turn(1);
  if (keyHit('KeyQ', 'PageUp', 'BracketLeft')) turn(-1);
  if (keyHit('ArrowRight', 'KeyD')) turn(1);
  if (keyHit('ArrowLeft', 'KeyA')) turn(-1);
  if (keyHit('ArrowDown', 'KeyS')) { codex.sel = (codex.sel + 1) % list.length; A.ui(); }
  if (keyHit('ArrowUp', 'KeyW')) { codex.sel = (codex.sel - 1 + list.length) % list.length; A.ui(); }
  const m = input.mouse;
  if (m.pressed || m.moved) {
    for (let i = 0; i < PAGES.length; i++) if (m.pressed && m.y >= 14 && m.y < 25 && m.x >= tabX(i) && m.x < tabX(i) + 50 && codex.page !== i) { codex.page = i; codex.sel = 0; A.ui(); return null; }
    const top = Math.max(0, Math.min(codex.sel - VISIBLE + 1, list.length - VISIBLE));
    for (let i = 0; i < Math.min(VISIBLE, list.length); i++) {
      const y = LIST_Y + i * ROW;
      if (m.x >= LIST_X && m.x < LIST_X + LIST_W && m.y >= y - 1 && m.y < y + ROW - 1) {
        if (codex.sel !== top + i) { codex.sel = top + i; if (m.pressed || m.moved) A.ui(); }
        else if (m.pressed) return act(list[codex.sel]);
      }
    }
    if (m.pressed && m.x > LIST_X + LIST_W && m.y > H - 22 && m.y < H - 8) return act(list[codex.sel]);
  }
  if (keyHit('Enter', 'Space')) return act(list[codex.sel]);
  if (keyHit('Escape') || (input.touch && m.pressed && m.x < 46 && m.y < 12)) return { back: codex.from };
  return null;
}
function act(e) {
  if (!e?.known) { A.deny(); return null; }
  if (codex.page === 0) { A.prepareVoice(e.id, 'entrances'); A.playVoice(e.id, 0, 'entrances'); return null; }
  if (codex.page === 4) { A.select(); return { ending: e.id, evo: n('awake', e.id) > 0 }; }
  return null;
}

export function drawCodex(t) {
  rect(-SX, 0, FW, H, '#0c0810');
  for (let i = 0; i < 30; i++) px(-SX + ((i * 97) % FW), (i * 53) % H, '#1e1620');
  textO('THE COMPENDIUM', 6, 3, P.gold, 1, 'l');
  textO(completion() + '% FOUND', W - 6, 3, P.ember3, 1, 'r');
  PAGES.forEach((p, i) => {
    const on = i === codex.page, x = tabX(i);
    rect(x, 14, 50, 11, on ? '#3a2830' : '#1a1218'); if (on) rect(x, 24, 50, 1, P.gold);
    text(p, x + 25, 17, on ? P.gold : '#8a7a80', 1, 'c');
  });
  const list = entries(codex.page), top = Math.max(0, Math.min(codex.sel - VISIBLE + 1, list.length - VISIBLE));
  for (let i = 0; i < Math.min(VISIBLE, list.length); i++) {
    const e = list[top + i], y = LIST_Y + i * ROW, on = top + i === codex.sel;
    if (on) { rect(LIST_X - 2, y - 2, LIST_W + 4, ROW - 1, '#2a1e26'); rect(LIST_X - 2, y - 2, 2, ROW - 1, P.gold); }
    if (codex.page === 5) { text(e.label, LIST_X + 2, y, P.bone); text(String(e.v), LIST_X + LIST_W + 190, y, P.paper, 1, 'r'); continue; }
    text(e.label, LIST_X + 4, y, e.known ? (on ? P.paper : P.bone) : '#5a4a52');
    if (e.wave) text('W' + e.wave, LIST_X + LIST_W - 2, y, '#6a5a62', 1, 'r');
  }
  if (list.length > VISIBLE) { const k = codex.sel / (list.length - 1); rect(LIST_X + LIST_W + 3, LIST_Y + Math.round(k * (VISIBLE - 1) * ROW), 1, 8, P.gold); }
  if (codex.page !== 5) drawDetail(list[codex.sel], t);
  else { textO('A RECORD OF EVERY RUN', W / 2 + 60, LIST_Y + VISIBLE * ROW + 4, '#6a5a62', 1, 'c'); }
  if (input.touch) { rect(3, 1, 34, 11, P.ink0); text('< BACK', 7, 4, P.paper); }
  else text('Q / E PAGE   ARROWS PICK   ENTER USE   ESC BACK', W / 2, H - 7, '#6a5a62', 1, 'c');
}
function panel() { const x = LIST_X + LIST_W + 8; rect(x, 30, W - x - 4, H - 46, '#140e16'); rect(x, 30, W - x - 4, 1, '#3a2a32'); return x; }
function drawDetail(e, t) {
  if (!e) return;
  const x0 = panel(), cxm = Math.round((x0 + W - 4) / 2);
  const say = (s, y, c = P.bone) => text(s, cxm, y, c, 1, 'c');
  const title = (s, y, c) => textO(s, cxm, y, c, 1, 'c');
  if (!e.known) {
    title('???', 40, '#6a5a62');
    if (codex.page === 0) { drawFighter(e.id, cxm, 110, 2, { t: 0, frame: 0, tint: '#2a2028', bare: true }); say('NOT YET FOUND', 120, '#6a5a62'); say('TO WAKE: ' + CHARS[e.id].mission[0], 130, P.gold); }
    else if (codex.page === 2) { say('WAITS ON WAVE ' + e.wave, 120, '#6a5a62'); }
    else if (codex.page === 3) { say('FLOOR ' + (DEPTHS.indexOf(e.id) + 1) + ', FROM WAVE ' + e.wave, 120, '#6a5a62'); }
    else if (codex.page === 4) { say("WIN A RUN AS " + (isUnlocked(e.id) ? CHARS[e.id].hero : 'THIS FIGHTER'), 110, '#6a5a62'); say('AND CHOOSE TO GO HOME', 120, '#6a5a62'); }
    else say('NOT YET MET', 110, '#6a5a62');
    return;
  }
  if (codex.page === 0) {
    const k = CHARS[e.id], aw = n('awake', e.id) > 0, rec = best.chars[e.id];
    title(k.hero, 36, k.color());
    say(k.lore[0], 46); say(k.lore[1], 54);
    glow(cxm - (aw ? 34 : 0), 96, k.color(), 26, 0.18);
    drawFighter(e.id, cxm - (aw ? 34 : 0), 112, 2, { t, anim: Math.floor(t / 3) % 2 ? 'run' : undefined, fps: 12 });
    if (aw) { glow(cxm + 34, 96, P.gold, 26, 0.2); drawFighter(e.id, cxm + 34, 112, 2, { t, evo: true }); text(EVO_NAMES[e.id], cxm + 34, 116, P.gold, 1, 'c'); text('AWAKENED', cxm + 34, 123, '#8a7a80', 1, 'c'); }
    else text('AWAKENING NOT YET FOUND', cxm, 116, '#5a4a52', 1, 'c');
    say(rec ? 'BEST WAVE ' + rec.wave + (rec.won ? '   KING SLAIN' : '') + (rec.nox ? '   NOX BEATEN' : '') : 'NO RUNS YET', 134, P.paper);
    text(input.touch ? 'TAP: HEAR THEIR VOICE' : 'ENTER: HEAR THEIR VOICE', cxm, H - 19, P.gold, 1, 'c');
  } else if (codex.page === 1) {
    const f = FOES[e.id], frames = SPR[e.id];
    title(f[0], 36, P.paper);
    const s = Array.isArray(frames) ? frames[Math.floor(t * 5) % frames.length] : frames;
    if (s) { ctx.save(); ctx.translate(cxm, 92); ctx.scale(2, 2); drawSprite(s, -s.w / 2, -s.h / 2, false); ctx.restore(); }
    say(f[1], 116); say(f[2], 124);
    say('SLAIN ' + n('foes', e.id), 138, P.gold);
  } else if (codex.page === 2) {
    const b = BOSSES[e.id];
    title(b.name, 36, b.col); say(b.sub, 45, '#8a7a80');
    const s = monsterFrame(e.id, (t * 0.5) % 1, SPR[e.id]);
    if (s) { const k = Math.min(1.5, 70 / s.h, 150 / s.w); ctx.save(); ctx.translate(cxm, 92); ctx.scale(k, k); drawSprite(s, -s.w / 2, -s.h / 2, false); ctx.restore(); }
    say(TRICK[e.id] || '', 132);
    say('WAVE ' + e.wave + '   BEATEN ' + n('bosses', e.id), 142, P.gold);
  } else if (codex.page === 3) {
    const m = MAPS[e.id];
    title(m.name, 36, P.ember3); say(m.desc, 46);
    // a window onto the floor: its own colors in a small tiled patch
    const f = m.f || ['#2a2026', '#322830', '#1e161c', '#3a2e36'], w = m.w || f;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) { const h = (x * 7 + y * 13) % 5; rect(cxm - 60 + x * 10, 60 + y * 10, 9, 9, y === 0 ? w[x % 2] : f[h % 4]); if (h === 0) rect(cxm - 60 + x * 10 + 2, 62 + y * 10, 2, 1, f[3]); }
    if (m.flame) for (const fx of [cxm - 56, cxm + 52]) { rect(fx, 64, 3, 6, '#3a2a22'); rect(fx, 60 - (Math.floor(t * 8) % 2), 3, 4, m.flame[0]); px(fx + 1, 59, m.flame[2]); glow(fx + 1, 62, m.flame[1], 10, 0.4); }
    say('FLOOR ' + (DEPTHS.indexOf(e.id) + 1) + ', WAVES ' + e.wave + ' TO ' + (e.wave + 4), 128, P.gold);
    say('REACHED ' + n('floors', e.id) + (n('floors', e.id) === 1 ? ' TIME' : ' TIMES'), 138);
  } else if (codex.page === 4) {
    const k = CHARS[e.id];
    title(k.hero + ' GOES HOME', 36, k.color());
    drawFighter(e.id, cxm, 104, 2, { anim: 'walk', t, fps: 9, evo: n('awake', e.id) > 0 });
    drawEmote('heart', cxm, 64, t % 3, 1);
    say('SEEN ' + n('endings', e.id) + (n('endings', e.id) === 1 ? ' TIME' : ' TIMES'), 124, P.gold);
    text(input.touch ? 'TAP: WATCH IT AGAIN' : 'ENTER: WATCH IT AGAIN', cxm, H - 19, P.gold, 1, 'c');
  }
}
