// The story. Aurel was the Sun King. When the sun grew old he feared the dark that waits for everything, so he
// swallowed it to burn forever, and became the Ashen King: the sky went black, the land turned to ash, and every
// night his army climbs out of the pit below his throne. The fighters hold the pit. The goal of a run: survive 20
// waves, kill the King on the twentieth, and free the sun. (Past wave 20 the pit keeps going: with the King dead,
// nothing keeps shut what was sealed below it.)
//
//   LORE    the intro's story panels, each a small pixel picture with its caption; the last one is the run's goal
//   say()   the dialog box: the King taunts the fighter through the run, meets them at wave 20 (each fighter answers
//           in their own voice) and dies with a last word; a line types out letter by letter beside the speaker's face
//   ENDING  what plays when the King falls: the sun breaks out of him, the light comes back, the fighter's last line
import { W, H, ctx, P, BAYER, makeCanvas, rect, px, line, disc, ring, glow, text, textO, textW, drawSprite } from './gfx.js?v=185';
import { SPR } from './sprites.js?v=185';
import { input, keyHit } from './input.js?v=185';
import { A } from './audio.js?v=185';
import { G } from './world.js?v=185';
import { CHARS } from './chars.js?v=185';
import { drawFighter } from './title-scene.js?v=185';

export const KING = 'KING', VOID = 'VOID';
const ease = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

// ---------- the lines ----------
// the run, as the King sees it
export const TALK = {
  start: [[KING, 'ANOTHER MOTH FLIES INTO MY PIT. BURN SLOWLY, LITTLE ONE.']],
  // between his bosses he tells you who he was, a piece at a time
  w3: [[KING, 'THEY CALLED ME THE SUN KING ONCE. MY PEOPLE SANG MY NAME AT DAWN.']],
  w8: [[KING, 'THE SUN WAS DYING, LITTLE ONE. I SAVED IT THE ONLY WAY I COULD. INSIDE ME.']],
  w13: [[KING, 'MY PEOPLE ARE STILL HERE, YOU KNOW. YOU HAVE BEEN CUTTING THEM DOWN ALL NIGHT.']],
  w18: [[KING, 'TWO MORE NIGHTS. THEN THE LAST FIRE COMES FOR YOU HIMSELF.']],
  // when it goes badly for you, or too well
  lowHp: [[KING, 'I CAN SMELL THE ASH ON YOU ALREADY.']],
  combo: [[KING, 'YOU DANCE WELL. THEY ALL DANCE WELL, AT FIRST.']],
  warden: [[KING, 'MY WARDEN HAS KEPT THIS PIT FOR A HUNDRED YEARS. HE WILL KEEP YOUR BONES.']],
  wardenDead: [[KING, 'STUBBORN. GOOD. THE STUBBORN ONES BURN THE LONGEST.']],
  brood: [[KING, 'SHE NESTS BELOW MY THRONE, AND HER CHILDREN ARE HUNGRY.']],
  broodDead: [[KING, 'YOU KILLED MY PET. I HAVE AN ARMY OF THEM.']],
  colossus: [[KING, 'MY OLD WAR MACHINE NEVER LEARNED HOW TO STOP. NEITHER DID I.']],
  colossusDead: [[KING, 'ENOUGH. COME DOWN TO MY THRONE. I WILL MEET YOU MYSELF.']],
  kingBurns: [[KING, 'YOU THINK YOU CAN PUT OUT THE SUN?']],
  kingUnbound: [[KING, 'I WILL NOT GO BACK INTO THE DARK!']],
  kingDead: [[KING, 'THE DARK... IT IS SO COLD...']],
  // past wave 20, something older answers from below
  deeper: [[VOID, 'THE KING KEPT THIS PIT SHUT. NOW NOTHING DOES. COME DEEPER.']],
  wyrm: [[VOID, 'SOMETHING SWIMS UP THROUGH THE STONE.']],
  herald: [[VOID, 'THE STORM HAS A VOICE NOW. IT KNOWS YOUR NAME.']],
  mirror: [[VOID, 'IT WATCHED YOU ALL THE WAY DOWN. IT LEARNED.']],
  eclipse: [[VOID, 'THE SUN YOU FREED HAS AN EYE. IT IS LOOKING AT YOU.']],
  clock: [[VOID, 'TIME ITSELF WANTS YOU GONE.']],
  devboss: [['DEVBOSS', 'YOU WERE NEVER SUPPOSED TO GET THIS FAR. NICE. NOW THE REAL BOSS FIGHT.']],
};
// each fighter answers his first taunt
const REPLY = {
  BLADE: "I CARRY THE LAST EMBER OF YOUR SUN, AUREL. I'M BRINGING IT HOME.",
  GUNNER: "BURN SLOW? I WAS HOPING FOR QUICK. YOUR HEAD'S WORTH MORE THAT WAY.",
  WIZARD: 'THE STARS TOLD ME YOUR NAME, KING. THEY ALSO TOLD ME HOW YOU END.',
  NINJA: "MOTH? I'M A SAMURAI. ALSO I HAVE A TEST ON MONDAY, SO MOVE IT.",
  MECHANIC: "NICE PIT. SHAME ABOUT THE WIRING. I'LL FIX IT ON MY WAY DOWN.",
  TANK: 'I KNOW THAT VOICE, MY KING. I STOOD GUARD BESIDE IT FOR TWENTY YEARS.',
  ROBOT: 'VOICE PRINT MATCHED. TARGET ONE. ORDER CONFIRMED.',
  DEV: "OH NO. I WROTE YOUR DIALOGUE. IT'S WORSE OUT LOUD.",
};
export const startLines = (id) => [...TALK.start, [id, REPLY[id] || REPLY.BLADE]];
// and has a word of their own after each of his first three bosses falls
const QUIP = {
  BLADE: { warden: "ONE GATE DOWN. I'M COMING, AUREL.", brood: "THEN I'LL BURN THROUGH ALL OF THEM.", colossus: 'THAT IS ALL I WANTED. WAIT FOR ME.' },
  GUNNER: { warden: "THAT'S ONE BOUNTY. YOU'RE NEXT ON THE POSTER.", brood: "GOOD. I'VE GOT AN ARMY OF BULLETS.", colossus: 'FINALLY, A MEETING WITH THE MANAGEMENT.' },
  WIZARD: { warden: 'HIS BONES REMEMBERED A SPELL. I MADE THEM FORGET IT.', brood: 'SPIDERS. WHY IS IT ALWAYS SPIDERS.', colossus: 'FIVE MORE NIGHTS, AND THE STARS COME BACK.' },
  NINJA: { warden: "FIRST BOSS DONE. NOW WHERE'S THE SNACK MACHINE?", brood: "EW. EW. I'M NEVER GETTING THAT OUT OF MY HAIR.", colossus: "YOU HEAR THAT? HE'S SCARED OF ME." },
  MECHANIC: { warden: 'BONES ARE JUST BAD STRUTS. EASY.', brood: 'BUGS IN THE SYSTEM. MY SPECIALTY.', colossus: "I'M KEEPING THIS CORE. IT'LL MAKE A GREAT TURRET." },
  TANK: { warden: 'HE WAS A GOOD WARDEN ONCE. REST NOW, BROTHER.', brood: 'SHE NESTED UNDER THE THRONE ROOM. I HEARD HER EVERY NIGHT ON WATCH.', colossus: 'I KNOW THE WAY TO YOUR THRONE. I GUARDED IT.' },
  ROBOT: { warden: 'OBSTACLE ONE REMOVED. CONTINUING DESCENT.', brood: 'BIOLOGICAL HAZARD CLEARED.', colossus: 'TARGET ONE HAS ACCEPTED ENGAGEMENT.' },
  DEV: { warden: 'BOSS ONE, PATCHED OUT.', brood: 'I SAID NO SPIDERS IN THE DESIGN DOC.', colossus: 'OK. FINAL BOSS INCOMING. HYPE.' },
};
export const bossDeadLines = (boss, id) => (TALK[boss + 'Dead'] ? [...TALK[boss + 'Dead'], ...(QUIP[id]?.[boss] ? [[id, QUIP[id][boss]]] : [])] : null);
// the King's parting words over your body (and, once he's dead, the pit's)
const LAST_WORDS = ['ASH TO ASH.', 'ANOTHER LIGHT GOES OUT.', 'THE SUN STAYS MINE.', 'KNEEL. THEY ALL KNEEL IN THE END.', 'SLEEP NOW. THE PIT WILL KEEP YOU.'];
export const lastWords = () => (G?.won ? '??? : THE PIT KEEPS WHAT FALLS INTO IT.' : 'AUREL: ' + LAST_WORDS[Math.floor(Math.random() * LAST_WORDS.length)]);
// wave 20: the King and the fighter face to face. [what the fighter says, what the King answers]
const MEET = {
  BLADE: ['MY BLADE STILL HOLDS AN EMBER OF THE OLD SUN. I CAME TO GIVE IT BACK.', 'THEN I WILL TAKE THAT EMBER FROM YOUR COLD HANDS.'],
  GUNNER: ["THERE'S A BOUNTY ON YOUR CROWN, YOUR MAJESTY. NOTHING PERSONAL.", 'NO GOLD BUYS LIGHT, HUNTER. I OWN ALL OF IT.'],
  WIZARD: ['I KNOW THE NAME OF EVERY STAR. YOURS IS ABOUT TO GO OUT.', 'STARS DIE, WARLOCK. I ATE ONE SO THAT I WOULD NOT.'],
  NINJA: ["YOU BURNED MY CLAN. ALSO I HAVE HOMEWORK DUE FRIDAY, SO LET'S BE QUICK.", 'THE LAST OF THE RED ONI. I WILL MAKE IT QUICK, CHILD.'],
  MECHANIC: ['I BUILT ALL MY TOYS OUT OF YOUR COLOSSUS. WANT TO SEE THEM?', 'A SCAVENGER, ARMED WITH MY OWN SCRAP. HOW FITTING.'],
  TANK: ['I SWORE TO GUARD YOU, MY KING. NOW I GUARD THEM FROM YOU.', 'MY OWN GUARD. YOU KNELT TO ME ONCE. YOU WILL KNEEL AGAIN.'],
  ROBOT: ['ONE ORDER LEFT IN MEMORY. STOP THE KING. EXECUTING.', 'A MACHINE OBEYING A DEAD COMMAND. I WILL SWITCH YOU OFF.'],
  DEV: ['I WROTE YOU AS THE FINAL BOSS. TIME TO RUN THE ENDING.', 'THEN YOU WROTE ME TOO WELL. I DO NOT END.'],
};
export const meetLines = (id) => [
  [KING, 'SO. YOU CRAWLED ALL THE WAY DOWN TO MY THRONE.'],
  [id, (MEET[id] || MEET.BLADE)[0]],
  [KING, (MEET[id] || MEET.BLADE)[1]],
  [KING, 'I AM THE LAST FIRE. COME, AND BURN.'],
];
// each fighter's last word, in the light
const LAST = {
  BLADE: 'REST NOW, OLD SUN. THE PIT IS QUIET.',
  GUNNER: "BOUNTY COLLECTED. FIRST ROUND'S ON ME.",
  WIZARD: 'A NEW STAR RISES. I WILL GIVE IT A BETTER NAME.',
  NINJA: 'DONE. AND I CAN STILL MAKE IT TO CLASS.',
  MECHANIC: "THE SUN'S BACK ONLINE. NOW THAT'S A REPAIR JOB.",
  TANK: 'MY KING IS DEAD. MY WATCH IS FINALLY OVER.',
  ROBOT: 'ORDER COMPLETE. NO ORDERS REMAIN. I WILL STAY AND WATCH THE SUNRISE.',
  DEV: 'ENDING COMPILED. ZERO ERRORS. SHIP IT.',
};

// ---------- the dialog box ----------
const CPS = 42;                     // letters a second
const nameOf = (who) => (who === KING ? 'AUREL, THE ASHEN KING' : who === VOID ? '???' : who === 'DEVBOSS' ? 'THE DEV' : CHARS[who]?.hero || who);
const colOf = (who) => (who === KING ? P.ember : who === VOID ? '#b48cff' : who === 'DEV' || who === 'DEVBOSS' ? '#39ff6a' : CHARS[who]?.color?.() || P.paper);
// lines: [[who, text], ...]. hold: the game waits for the talk (a boss's entrance); the fighter can speed it up
export function say(lines, o = {}) {
  if (!G || G.dead || !lines?.length) return;
  G.talk = { q: lines.slice(), i: 0, t: 0, hold: !!o.hold, done: o.done, wrap: null, in: 0 };
}
export const talking = () => !!G?.talk;
function wrap(s, width) {
  const out = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const next = cur ? cur + ' ' + w : w;
    if (textW(next) > width && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}
// between the hearts (left) and the score (right)
const BW = 152, BX = 102, BY = 3, TEXT_W = BW - 36;
// real time, so hit-stop and slow motion don't slow a voice down
export function updateTalk(dt) {
  const k = G?.talk;
  if (!k) return;
  k.in = Math.min(1, k.in + dt * 6);
  const [who, s] = k.q[k.i];
  const before = Math.min(s.length, Math.floor(k.t * CPS));
  k.t += dt;
  const now = Math.min(s.length, Math.floor(k.t * CPS));
  if (now > before && s[now - 1] !== ' ' && now % 2) A.voice(who === KING || who === VOID);
  const typed = k.t * CPS >= s.length, stay = Math.max(1.7, s.length / 20);
  const skip = k.hold && (keyHit('Enter', 'Space') || input.mouse.pressed);
  if (skip && !typed) k.t = s.length / CPS;
  else if ((typed && k.t - s.length / CPS > stay) || (skip && typed)) {
    k.i++; k.t = 0; k.wrap = null;
    if (k.i >= k.q.length) { G.talk = null; k.done?.(); }
  }
}
// a speaker's face, 24 x 24: a crop of their own sprite, four screen pixels to each of its art pixels
function face(who, x, y) {
  rect(x, y, 24, 24, '#05030a');
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, 24, 24); ctx.clip();
  if (who === KING) {
    const s = SPR.king?.[Math.floor(G.time * 2) % 2];
    if (s) { glow(x + 12, y + 14, P.ember, 14, 0.3); ctx.drawImage(s.n, 6, 0, 18, 18, x, y, 24, 24); }
  } else if (who === VOID) {
    // nothing to see but two eyes in the dark, blinking now and then
    const open = (G.time % 3.1) > 0.12;
    for (const ex of [8, 15]) { glow(x + ex, y + 12, '#b48cff', 5, 0.5); if (open) rect(x + ex - 1, y + 11, 3, 2, '#e8dcff'); else rect(x + ex - 1, y + 12, 3, 1, '#b48cff'); }
  } else {
    // the wave 50 boss is the awakened Dev; a fighter shows the skin they're wearing
    const id = who === 'DEVBOSS' ? 'DEV' : who, set = (who === 'DEVBOSS' || (G.char === who && G.evo === true) ? SPR.evo : SPR.chars)[id], fr = set?.body?.idles?.[Math.floor(G.time * 7) % 16];
    if (fr) { const [ex, ey] = set.rig.eye; ctx.drawImage(fr.n, Math.round(ex - 18), Math.round(ey - 22), 36, 36, x, y, 24, 24); }
  }
  ctx.restore();
  rect(x - 1, y - 1, 26, 1, P.ink0); rect(x - 1, y + 24, 26, 1, P.ink0); rect(x - 1, y, 1, 24, P.ink0); rect(x + 24, y, 1, 24, P.ink0);
}
export function drawTalk() {
  const k = G?.talk;
  if (!k) return;
  const [who, s] = k.q[k.i], col = colOf(who);
  k.wrap ??= wrap(s, TEXT_W);
  const lines = k.wrap, bh = 15 + Math.max(2, lines.length) * 7, y = BY - Math.round((1 - ease(k.in)) * (bh + 6));
  rect(BX - 1, y - 1, BW + 2, bh + 2, P.ink0); rect(BX, y, BW, bh, '#0c0911');
  rect(BX, y, BW, 1, col); rect(BX, y + bh - 1, BW, 1, P.ink2);
  face(who, BX + 4, y + 4);
  textO(nameOf(who), BX + 32, y + 4, col, 1);
  let n = Math.min(s.length, Math.floor(k.t * CPS));
  lines.forEach((l, i) => {
    if (n <= 0) return;
    text(l.slice(0, n), BX + 32, y + 13 + i * 7, P.paper, 1);
    n -= l.length + 1;
  });
  if (k.hold && k.t * CPS >= s.length && Math.floor(G.time * 3) % 2) textO('>', BX + BW - 6, y + bh - 8, col, 1);
}

// ---------- small pictures ----------
// a sky in bands of color, dithered where they meet; made once per size and palette
const skies = new Map();
function sky(x0, y0, w, h, cols) {
  const key = w + 'x' + h + cols.join();
  let c = skies.get(key);
  if (!c) {
    c = makeCanvas(w, h); const g = c.getContext('2d'), n = cols.length - 1;
    for (let y = 0; y < h; y++) {
      const f = (y / Math.max(1, h - 1)) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
      for (let x = 0; x < w; x++) { g.fillStyle = k > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? cols[i + 1] : cols[i]; g.fillRect(x, y, 1, 1); }
    }
    skies.set(key, c);
  }
  ctx.drawImage(c, x0, y0);
}
// a sun: a disc with a hot rim and turning rays
function sun(x, y, r, t, o = {}) {
  const core = o.core || '#fff6c8', rim = o.rim || P.gold, ray = o.ray || P.ember3;
  glow(x, y, o.glow || P.gold, r * 3, o.ga ?? 0.45);
  for (let i = 0; i < 16; i++) {
    const a = t * 0.4 + (i * Math.PI) / 8, L = (i % 2 ? r * 0.5 : r * 0.9) + Math.sin(t * 3 + i) * 2;
    line(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), x + Math.cos(a) * (r + 2 + L), y + Math.sin(a) * (r + 2 + L), ray);
  }
  disc(x, y, r, rim); disc(x, y, r - 1, core);
  if (r > 5) disc(x - Math.round(r * 0.35), y - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.25)), '#ffffff');
}
// the castle on the hill: towers with pointed roofs and lit windows
function castle(x0, base, col, lit, t) {
  const T = [[0, 26, 12], [14, 38, 14], [32, 52, 18], [54, 30, 12], [70, 44, 14], [88, 24, 10], [100, 34, 12]];
  for (const [dx, h, w] of T) {
    const x = x0 + dx, top = base - h;
    rect(x, top, w, h, col);
    for (let i = 0; i < Math.ceil(w / 2); i++) rect(x + i, top - i, w - i * 2, 1, col);      // the roof
    rect(x + Math.floor(w / 2), top - Math.ceil(w / 2) - 4, 1, 4, col);                    // the spire
    if (lit) for (let wy = top + 5; wy < base - 4; wy += 7) if ((dx + wy) % 3) rect(x + Math.floor(w / 2) - 1, wy, 2, 3, (Math.floor(t * 2 + dx) % 7) ? lit : P.ember);
  }
  rect(x0 - 10, base, 134, 4, col);
}
// the King's crown, a little icon
function crown(x, y, t) {
  glow(x, y - 3, P.ember, 12, 0.35);
  const X = Math.round(x) - 8, Y = Math.round(y);
  rect(X, Y - 2, 17, 2, '#120e16'); rect(X, Y, 17, 1, P.gold);
  for (let i = 0; i < 5; i++) {
    const sx = X + 1 + i * 4, h = i === 2 ? 5 : i % 2 ? 4 : 3;
    rect(sx, Y - 2 - h, 2, h, '#120e16'); px(sx, Y - 2 - h, P.gold);
    if (i < 4) px(sx + 2, Y - 4 - ((Math.floor(t * 12) + i) % 2), P.ember3);
  }
}
// a sprite as a silhouette, scaled, with a rim of light on one side
function silhouette(s, x, y, sc, col, rim, flip = false, show = 0) {
  if (!s) return;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sc, sc);
  if (rim) drawSprite(s, -1 / sc, -1 / sc, flip, rim);
  if (show) { drawSprite(s, 0, 0, flip); ctx.globalAlpha = 1 - show; }
  drawSprite(s, 0, 0, flip, col);
  ctx.restore();
}

// ---------- the intro's story panels ----------
const PX = 50, PY = 14, PW = 220, PH = 108;
const KING_SPR = () => SPR.king?.[0];
export const LORE = [
  {
    cap: ['KING AUREL RULED BENEATH A GOLDEN SUN.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffe9a8', '#ffc76a', '#ff9a4a', '#e0623a']);
      sun(PX + PW / 2, PY + 34, 15, t);
      castle(PX + 50, PY + PH - 6, '#4a1c2a', '#ffe08a', t);
      rect(PX, PY + PH - 4, PW, 4, '#3a1420');
    },
  },
  {
    cap: ['BUT THE SUN GREW OLD AND DIM,', 'AND AUREL FEARED THE DARK.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#2a1838', '#5a2a4a', '#9a3a4a']);
      // the old sun, small and failing, its light flickering
      const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.3)) * (Math.sin(t * 17) > 0.6 ? 0.3 : 1);
      sun(PX + 150, PY + 30, 9, t * 0.3, { core: '#e0a060', rim: '#a0502a', ray: '#7a3a2a', glow: '#c06a3a', ga: 0.3 * f });
      line(PX + 146, PY + 26, PX + 151, PY + 31, '#6a2a1a'); line(PX + 153, PY + 27, PX + 150, PY + 33, '#6a2a1a');
      // the King, a black shape looking up at it
      silhouette(KING_SPR(), PX + 40, PY + PH - 54, 2, '#140a12', '#c06a3a', false, 0.35);
      rect(PX, PY + PH - 6, PW, 6, '#140a12');
    },
  },
  {
    cap: ['SO HE SWALLOWED IT WHOLE,', 'TO BURN FOREVER.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#1a0a12', '#3a0e18', '#6a1420']);
      const k = ease(t / 2.4), cx = PX + PW / 2, chestY = PY + PH - 34;
      // the sun is pulled down into him; its light streams after it
      const sy = PY + 18 + (chestY - PY - 18) * k, r = Math.max(2, 13 * (1 - k * 0.8));
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 2, L = 30 * (1 - k); ctx.globalAlpha = 0.5; line(cx + Math.cos(a) * (r + L), sy + Math.sin(a) * (r + L), cx + Math.cos(a) * r, sy + Math.sin(a) * r, P.ember3); ctx.globalAlpha = 1; }
      silhouette(KING_SPR(), cx - 30, PY + PH - 80, 2, '#0e070c', k > 0.95 ? P.ember : '#8a2a1a', false, 0.25 + 0.3 * k);
      if (k < 1) sun(cx, sy, r, t * 2);
      if (k > 0.9) { glow(cx, chestY, P.ember, 26, 0.6); glow(cx - 2, PY + PH - 66, P.blood, 6, 0.8); }
      rect(PX, PY + PH - 4, PW, 4, '#0e070c');
    },
  },
  {
    cap: ['THE SKY WENT BLACK. THE LAND TURNED TO ASH.', 'EVERY NIGHT, HIS ARMY CLIMBS OUT OF THE PIT.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#05020a', '#120612', '#2a0a14']);
      // the black sun, burning at the rim
      const cx = PX + PW / 2, cy = PY + 30;
      glow(cx, cy, P.blood, 40, 0.3);
      for (let i = 0; i < 20; i++) { const a = t * 0.2 + (i * Math.PI) / 10, L = (i % 2 ? 6 : 11) + Math.sin(t * 3 + i) * 2; line(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, cx + Math.cos(a) * (15 + L), cy + Math.sin(a) * (15 + L), i % 2 ? P.ember : P.ember3); }
      ring(cx, cy, 14, 1, P.ember2); disc(cx, cy, 13, '#030104');
      // ash drifting down
      for (let i = 0; i < 40; i++) { const x = PX + ((i * 53 + t * 9 * (1 + (i % 3))) % PW), y = PY + ((i * 37 + t * 14 * (1 + (i % 2))) % PH); px(x, y, i % 4 ? '#5a5058' : '#8a7a80'); }
      // the pit, and what climbs out of it
      const base = PY + PH - 14;
      rect(PX, base, PW, 14, '#05020a');
      for (let x = 0; x < PW; x += 6) rect(PX + x, base - ((x * 7) % 5), 6, 4, '#05020a');
      const mons = [[SPR.brute?.[0], 40, 0.9], [SPR.husk?.[Math.floor(t * 4) % 2], 82, 1.4], [SPR.shade?.[0], 128, 0.6], [SPR.spitter?.[0], 168, 1.1]];
      for (const [s, dx, sp] of mons) {
        if (!s) continue;
        const rise = Math.min(1, (t * sp) / 2.5), x = PX + dx, y = base - s.h * 1.5 * rise + 4;
        ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, base - PY + 2); ctx.clip();
        silhouette(s, x, y, 1.5, '#0c0610', P.blood);
        ctx.restore();
        if (rise > 0.5) glow(x + s.w * 0.75, y + s.h * 0.4, P.blood, 4, 0.7);
      }
      for (let i = 0; i < 5; i++) { const x = PX + 20 + i * 44, a = 0.4 + 0.4 * Math.sin(t * 3 + i * 2); ctx.globalAlpha = a; line(x, base + 3, x + 6, base + 10, P.ember); ctx.globalAlpha = 1; }
    },
  },
  {
    goal: true,
    cap: ['THE LAST FIGHTERS HOLD THE PIT.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#0c0911', '#160f1e', '#1f1929']);
      textO('YOUR GOAL', PX + PW / 2, PY + 8, P.gold, 2, 'c');
      const rows = [
        ['SURVIVE 20 WAVES', (x, y) => { rect(x - 8, y - 6, 17, 12, P.ink0); rect(x - 7, y - 5, 15, 10, '#2b2337'); textO('20', x + 1, y - 2, P.paper, 1, 'c'); }],
        ['SLAY THE ASHEN KING', (x, y) => { crown(x, y + 3, t); line(x - 9, y + 5, x + 9, y - 7, P.blood, 2); }],
        ['FREE THE SUN', (x, y) => sun(x, y, 5, t)],
      ];
      rows.forEach(([label, icon], i) => {
        const k = ease((t - 0.3 - i * 0.35) / 0.3);
        if (k <= 0) return;
        const y = PY + 38 + i * 24, x = PX + 44 - Math.round((1 - k) * 20);
        ctx.globalAlpha = k;
        icon(x, y);
        textO(label, x + 20, y - 3, i === 1 ? P.ember3 : P.paper, 1);
        ctx.globalAlpha = 1;
      });
    },
  },
];
export const LORE_PANEL = 4.2;          // seconds a panel stays if nobody presses anything
export const lore = { i: 0, t: 0, cued: -1, typed: 0 };
export function resetLore() { lore.i = 0; lore.t = 0; lore.cued = -1; lore.typed = 0; }
// a panel's caption types out at 34 letters a second after a short pause; returns how many letters show at time t
const typedAt = (cap, t) => Math.min(cap.reduce((a, l) => a + l.length, 0), Math.floor(Math.max(0, t - 0.25) * 34));
// any key or a tap: the next panel; Escape (or the corner tap): skip the story. Returns 'skip', 'done' or null.
export function updateLore(dt) {
  const t0 = lore.t;
  lore.t += dt;
  if (lore.cued !== lore.i) { if (lore.i > 0) A.lorePage(); A.loreCue(lore.i); lore.cued = lore.i; lore.typed = 0; }
  const pnl = LORE[lore.i], n = typedAt(pnl.cap, lore.t);
  if (n > lore.typed) { lore.typed = n; A.type(); }
  if (pnl.goal) for (let k = 0; k < 3; k++) { const at = 0.3 + k * 0.35; if (t0 < at && lore.t >= at) A.goalHit(k); }
  const corner = input.mouse.pressed && input.mouse.x > W - 60 && input.mouse.y < 26;
  if (keyHit('Escape') || corner) return 'skip';
  const next = lore.t > 0.35 && (input.any || input.mouse.pressed);
  if (next || lore.t > LORE_PANEL + (LORE[lore.i].goal ? 1.2 : 0)) {
    A.ui();
    lore.i++; lore.t = 0;
    if (lore.i >= LORE.length) return 'done';
  }
  return null;
}
function frame(t) {
  // the panel slides in, with a bright frame round it
  const k = ease(t / 0.3), dx = Math.round((1 - k) * 30);
  rect(PX - 3 + dx, PY - 3, PW + 6, PH + 6, P.ink0);
  rect(PX - 2 + dx, PY - 2, PW + 4, PH + 4, t < 0.12 ? P.paper : P.stone2);
  rect(PX - 1 + dx, PY - 1, PW + 2, PH + 2, P.ink0);
  return dx;
}
export function drawLore() {
  const pnl = LORE[lore.i], t = lore.t;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // the dots: which panel this is
  for (let i = 0; i < LORE.length; i++) rect(W / 2 - LORE.length * 4 + i * 8 + 2, PY + PH + 30 + 14, 4, 2, i === lore.i ? P.gold : P.ink3);
  const dx = frame(t);
  ctx.save(); ctx.translate(dx, 0); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
  pnl.draw(t);
  ctx.restore();
  // the caption types out under the picture
  let n = Math.floor(Math.max(0, t - 0.25) * 34);
  pnl.cap.forEach((l, i) => { if (n > 0) textO(l.slice(0, n), W / 2, PY + PH + 10 + i * 10, i ? P.ember3 : P.bone, 1, 'c'); n -= l.length; });
  text(input.touch ? 'TAP  NEXT' : 'ANY KEY  NEXT', 8, H - 9, P.stone2, 1);
  text(input.touch ? 'SKIP' : 'ESC  SKIP', W - 16, H - 9, P.stone2, 1, 'r');
  if (input.touch) text('SKIP', W - 16, 8, P.stone2, 1, 'r');
}

// ---------- the ending ----------
export const ENDING = [
  {
    cap: ['THE KING FELL, AND THE SUN', 'BROKE FREE OF HIM.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#120610', '#2a0a14', '#4a1018']);
      const cx = PX + PW / 2, chest = PY + PH - 40, k = ease((t - 0.6) / 1.6);
      // light splits him open from the chest
      for (let i = 0; i < 14; i++) { const a = (i * Math.PI * 2) / 14 + t * 0.3, L = 20 + 120 * k; ctx.globalAlpha = 0.25 + 0.5 * k; line(cx, chest, cx + Math.cos(a) * L, chest + Math.sin(a) * L, i % 2 ? P.ember3 : P.paper); ctx.globalAlpha = 1; }
      silhouette(KING_SPR(), cx - 30, PY + PH - 84 + Math.round(k * 10), 2, '#0e070c', P.ember, false, 0.4 * (1 - k));
      // the sun climbs out of him and up into the sky
      const sy = chest - 54 * ease((t - 1.6) / 1.8);
      if (t > 0.6) sun(cx, sy, 3 + 9 * ease((t - 0.6) / 2), t);
      rect(PX, PY + PH - 4, PW, 4, '#0e070c');
    },
  },
  {
    cap: ['LIGHT CAME BACK TO THE LAND,', 'FOR THE FIRST TIME IN A HUNDRED YEARS.'],
    draw(t) {
      const k = ease(t / 3);
      sky(PX, PY, PW, PH, k < 0.5 ? ['#2a1428', '#7a3040', '#e0703a'] : ['#7ac8ff', '#ffd98a', '#ffb05a']);
      sun(PX + PW / 2, PY + PH - 10 - 60 * k, 14, t);
      castle(PX + 50, PY + PH - 6, k < 0.5 ? '#2a1020' : '#5a2a3a', '#ffe08a', t);
      rect(PX, PY + PH - 4, PW, 4, '#3a1420');
      // the ash turns to light
      for (let i = 0; i < 30; i++) { const x = PX + ((i * 53 + t * 6) % PW), y = PY + PH - ((i * 37 + t * 12 * (1 + (i % 3))) % PH); px(x, y, i % 3 ? P.gold : P.paper); }
    },
  },
  {
    hero: true,
    cap: [],
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffe9a8', '#ffc76a', '#ff9a4a']);
      glow(PX + 60, PY + 50, P.gold, 50, 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
      drawFighter(G.char, PX + 58, PY + PH - 4, 4, { t, evo: G.evo === true });
      ctx.restore();
      const id = G.char, line_ = LAST[id] || LAST.BLADE, n = Math.floor(Math.max(0, t - 0.5) * 30);
      textO(CHARS[id]?.hero || '', PX + 150, PY + 22, CHARS[id]?.color?.() || P.paper, 2, 'c');
      const ls = wrap(line_, 96);
      let m = n;
      ls.forEach((l, i) => { if (m > 0) textO(l.slice(0, m), PX + 150, PY + 44 + i * 9, P.paper, 1, 'c', '#3a1420'); m -= l.length + 1; });
    },
  },
  {
    end: true,
    cap: [],
    draw(t) {
      sky(PX, PY, PW, PH, ['#05020a', '#0c0911', '#160f1e']);
      textO('THE END', PX + PW / 2, PY + 22, P.gold, 3, 'c');
      if (t > 0.6) text('THANK YOU FOR PLAYING', PX + PW / 2, PY + 50, P.bone, 1, 'c');
      if (t > 1.8) {
        // but below the pit, two eyes open
        const k = ease((t - 1.8) / 0.8), cx = PX + PW / 2, cy = PY + 78;
        for (const ex of [-8, 8]) { glow(cx + ex, cy, '#b48cff', 6, 0.5 * k); rect(cx + ex - 2, cy - Math.round(k), 5, Math.max(1, Math.round(2 * k)), '#e8dcff'); }
        textO('BUT BELOW THE PIT, SOMETHING ELSE HAS WOKEN.', PX + PW / 2, PY + 92, '#b48cff', 1, 'c');
      }
    },
  },
];
export const ENDING_PANEL = 5;
export const ending = { i: 0, t: 0, said: false, cued: -1, typed: 0 };
export function resetEnding() { ending.i = 0; ending.t = 0; ending.said = false; ending.cued = -1; ending.typed = 0; }
export function updateEnding(dt) {
  ending.t += dt;
  const pnl = ENDING[ending.i];
  if (ending.cued !== ending.i) { if (ending.i > 0) A.lorePage(); A.endingCue(ending.i); ending.cued = ending.i; ending.typed = 0; }
  // the captions, and the fighter's last word, type out with their ticks
  const words = pnl.hero ? Math.min((LAST[G.char] || LAST.BLADE).length, Math.floor(Math.max(0, ending.t - 0.5) * 30)) : typedAt(pnl.cap, ending.t);
  if (words > ending.typed) { ending.typed = words; A.type(); }
  if (keyHit('Escape')) return 'done';
  const next = ending.t > 0.6 && (input.any || input.mouse.pressed);
  if (next || ending.t > ENDING_PANEL + (pnl.end ? 2 : 0)) {
    A.ui();
    ending.i++; ending.t = 0;
    if (ending.i >= ENDING.length) return 'done';
  }
  return null;
}
export function drawEnding() {
  const pnl = ENDING[ending.i], t = ending.t;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const dx = frame(t);
  ctx.save(); ctx.translate(dx, 0); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
  pnl.draw(t);
  ctx.restore();
  let n = Math.floor(Math.max(0, t - 0.25) * 34);
  pnl.cap.forEach((l, i) => { if (n > 0) textO(l.slice(0, n), W / 2, PY + PH + 10 + i * 10, i ? P.ember3 : P.bone, 1, 'c'); n -= l.length; });
  text(input.touch ? 'TAP  NEXT' : 'ANY KEY  NEXT', 8, H - 9, P.stone2, 1);
}
