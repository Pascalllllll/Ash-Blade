import { ctx, P, rect, px, line, ring, disc } from './gfx.js?v=203';
import { A } from './audio.js?v=203';
import { G, B, TAU, clamp, hyp, angDiff, segDist, addRing, part, tryHurt, shake, sprFor } from './world.js?v=203';

const violet = '#c599ff', bone = '#f1d9dc', brass = '#edbc78', aqua = '#80edec';
const arts = {
  wyrm: ['FAULT COIL', 'CROSS THE BREAK IN THE RING', violet, 1.0, 1.45, 4],
  herald: ['GROUND WIRE', 'STAND INSIDE THE COPPER ROD', aqua, 1.65, 0.35, 5],
  mirror: ['COUNTERSTUDY', '', '#cfdeec', 1.05, 0.35, 4],
  eclipse: ['UMBRA', 'HIDE IN THE SHADOW OF A MOON', brass, 1.8, 0.45, 6],
  clock: ['BORROWED SECONDS', 'LEAVE YOUR OLD FOOTPRINTS', brass, 1.05, 1.45, 4],
  nox: ['NIGHT LOOM', 'STEP BETWEEN THE ROOTS', violet, 1.15, 1.0, 5],
};

const arenaX = x => clamp(x, B.x0 + 10, B.x1 - 10);
const arenaY = y => clamp(y, B.y0 + 10, B.y1 - 7);
export function rememberAction(kind) {
  const h = G.habits ||= { dash: 0, weapon: 0, spell: 0 };
  for (const k in h) h[k] *= 0.88;
  h[kind] += 1;
}

function study(e, dt, p) {
  e.sampleT = (e.sampleT || 0) - dt;
  if (e.sampleT > 0) return;
  e.sampleT = 0.32;
  const trail = e.footprints ||= [];
  if (trail.length === 12) trail.shift();
  trail.push({ x: p.x, y: p.y });
  const far = hyp(e.x - p.x, e.y - p.y) > 90 ? 1 : 0;
  e.far = (e.far ?? far) * 0.87 + far * 0.13;
}

function pin(x, y) { return { x: arenaX(x), y: arenaY(y) }; }
function makePattern(e) {
  const p = G.p, id = e.boss, spec = arts[id];
  const h = { id, t: 0, warn: spec[3], live: spec[4], dmg: spec[5], col: spec[2], title: spec[0], hint: spec[1],
    x: p.x, y: p.y, hit: false, fromX: e.x, fromY: e.y - e.r, angle: Math.atan2(p.y - e.y, p.x - e.x) };
  const space = p.x < (B.x0 + B.x1) / 2 ? 1 : -1;
  if (id === 'wyrm') {
    h.angle = Math.atan2((B.y0 + B.y1) / 2 - p.y, (B.x0 + B.x1) / 2 - p.x);
  } else if (id === 'herald') {
    h.rod = pin(p.x + space * 42, p.y + (p.y < (B.y0 + B.y1) / 2 ? 15 : -15));
  } else if (id === 'eclipse') {
    // The nearby moon always lies on the ray from the eye to the shelter. Either moon can block the light.
    const safe = pin(p.x + space * 39, p.y + (p.y < (B.y0 + B.y1) / 2 ? 12 : -12));
    const a = Math.atan2(safe.y - h.fromY, safe.x - h.fromX);
    h.moons = [pin(safe.x - Math.cos(a) * 17, safe.y - Math.sin(a) * 17),
      pin(p.x - space * 28, p.y - 25)];
  } else if (id === 'clock') {
    const trace = e.footprints || [p];
    h.marks = [0, 3, 6, 9].map(i => ({ ...trace[Math.max(0, trace.length - 1 - i)] }));
    h.beat = -1;
  } else if (id === 'mirror') {
    const habits = G.habits || {}, dash = habits.dash || 0, cast = habits.spell || 0, attack = habits.weapon || 0;
    h.read = dash > Math.max(cast, attack * 0.52) ? 'dash' : cast > attack * 0.48 && cast > 0 ? 'spell' : e.far > 0.56 ? 'range' : 'weapon';
    if (h.read === 'dash') {
      h.hint = 'IT MARKED YOUR LANDING';
      const a = p.dx || p.dy ? Math.atan2(p.dy, p.dx) : p.aim;
      h.end = pin(p.x + Math.cos(a) * 49, p.y + Math.sin(a) * 49);
    } else if (h.read === 'range') {
      h.hint = 'IT TRACED YOUR FIRING LINE';
      h.end = pin(p.x + Math.cos(h.angle) * 85, p.y + Math.sin(h.angle) * 85);
    } else if (h.read === 'spell') {
      h.hint = 'MOVE OUT OF THE SPELL SEAL'; h.r = 29;
    } else { h.hint = 'BACK AWAY FROM ITS RIPOSTE'; h.x = e.x; h.y = e.y; h.r = 40; }
  } else if (id === 'nox') {
    e.loom = (e.loom || 0) + 1;
    if (e.awakened && e.loom % 2 === 0) {
      h.heart = pin(p.x + space * 48, p.y + (p.y < (B.y0 + B.y1) / 2 ? 14 : -14));
      h.title = 'LAST LIGHT'; h.hint = 'SHELTER IN THE UNBLINKING EYE'; h.warn = 1.85; h.live = 0.55; h.dmg = 8; h.col = '#ffac80';
    } else {
      const a = h.angle + Math.PI / 2, nx = Math.cos(a), ny = Math.sin(a);
      h.roots = [];
      for (let i = e.awakened ? -2 : -1; i <= (e.awakened ? 2 : 1); i++) {
        const x = p.x + nx * i * 35, y = p.y + ny * i * 35;
        h.roots.push([x + ny * 116, y - nx * 116, x - ny * 116, y + nx * 116]);
      }
      h.dmg = e.awakened ? 7 : 5;
    }
  }
  return h;
}

function harmful(h, p) {
  const k = clamp((h.t - h.warn) / h.live, 0, 1);
  switch (h.id) {
    case 'wyrm': {
      const a = Math.atan2(p.y - h.y, p.x - h.x);
      return Math.abs(hyp(p.x - h.x, p.y - h.y) - (75 * (1 - k) + 4)) < 7 && Math.abs(angDiff(a, h.angle)) > 0.55;
    }
    case 'herald': return hyp(p.x - h.rod.x, p.y - h.rod.y) > 18;
    case 'eclipse': return !h.moons.some(m => segDist(m.x, m.y, h.fromX, h.fromY, p.x, p.y) < 10 &&
      (p.x - m.x) * (m.x - h.fromX) + (p.y - m.y) * (m.y - h.fromY) > 0);
    case 'clock': {
      const i = Math.min(3, Math.floor(k * 4)), m = h.marks[i];
      if (i !== h.beat) { h.hit = false; h.beat = i; addRing(m.x, m.y, brass, 76, 0.3, 2); A.click(); }
      return hyp(m.x - p.x, m.y - p.y) < 17;
    }
    case 'mirror':
      if (h.read === 'range') return segDist(p.x, p.y, h.fromX, h.fromY, h.end.x, h.end.y) < 9;
      if (h.read === 'dash') return segDist(p.x, p.y, h.x, h.y, h.end.x, h.end.y) < 11;
      return hyp(h.x - p.x, h.y - p.y) < h.r;
    case 'nox':
      if (h.heart) return hyp(p.x - h.heart.x, p.y - h.heart.y) > 20;
      return h.roots.some(r => segDist(p.x, p.y, ...r) < 8);
  }
}

// Give each boss an opening after its signature. Ordinary attacks keep their own phase and tell lengths.
export function deepBossTurn(e, dt) {
  const spec = arts[e.boss];
  if (!spec || G.p.state === 'dead' || e.state === 'intro') return false;
  if (e.boss === 'mirror' || e.boss === 'clock') study(e, dt, G.p);
  if (e.state === 'awakening') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'walk'; e.cd = 0.6; e.riteCd = 0; }
    return true;
  }
  if (!e.rite) {
    e.riteCd = (e.riteCd ?? 2.3) - dt;
    if (e.riteCd > 0 || e.state !== 'walk' || e.under || G.swallow) return false;
    const h = e.rite = makePattern(e);
    e.state = 'riteW'; e.superArmor = true;
    G.banner = { text: h.title, sub: h.hint, t: 0, life: Math.min(1.6, h.warn + 0.22), c: h.col }; A.warn();
  }
  const h = e.rite, before = h.t;
  h.t += dt; e.vx = e.vy = 0;
  if (before < h.warn && h.t >= h.warn) { A.riftCut(); shake(0.36); }
  if (h.t >= h.warn && h.t < h.warn + h.live && harmful(h, G.p) && !h.hit) {
    if (tryHurt(h.dmg, e.x, e.y)) h.hit = true;
  }
  if (h.t >= h.warn + h.live + 0.32) {
    e.rite = null; e.state = 'rec'; e.t = 0.65;
    e.riteCd = e.awakened ? 3.0 : e.phase >= 2 ? 5.5 : 7;
  }
  return true;
}

function shelter(x, y, r, col, active) {
  ctx.globalAlpha = active ? 0.42 : 0.19; disc(x, y, r, col); ctx.globalAlpha = 1;
  ring(x, y, r, 1, col); ring(x, y, r - 3, 1, col);
}
function strip(x0,y0,x1,y1,w,col) {
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.lineWidth=w; ctx.strokeStyle=col; ctx.stroke(); ctx.lineWidth=1;
}
function limb(x0, y0, x1, y1, wave, live, col) {
  let px0 = x0, py0 = y0;
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (let j = 1; j <= 12; j++) {
    const k = j / 12, bend = Math.sin(k * Math.PI) * Math.sin(wave + k * 7) * (live ? 2.5 : 6);
    const x = x0 + (x1 - x0) * k - Math.sin(a) * bend, y = y0 + (y1 - y0) * k + Math.cos(a) * bend;
    const w = 10 * (1 - k) + 2;
    strip(px0, py0, x, y, w, '#271831'); strip(px0, py0 - 1, x, y - 1, Math.max(1,w - 3), live ? '#bb668c' : '#634672');
    if (j % 2) px(x, y + 1, col);
    px0 = x; py0 = y;
  }
}

export function drawDeepFloor(e) {
  if (e.dead || e.dying) return;
  const h = e.rite, t = G.t;
  if (e.boss === 'nox' && e.awakened) {
    for (let i = 0; i < 4; i++) {
      const a = 0.48 + i * Math.PI / 2, x = e.x + Math.cos(a) * 27, y = e.y + Math.sin(a) * 10;
      limb(x, y, x + Math.cos(a) * (45 + 5 * Math.sin(t + i)), y + Math.sin(a) * 27, t * 2 + i, false, bone);
    }
  }
  if (!h) return;
  const live = h.t >= h.warn, k = clamp((h.t - h.warn) / h.live, 0, 1), c = live ? P.paper : h.col;
  if (h.roots) {
    for (const [x0,y0,x1,y1] of h.roots) {
      ctx.globalAlpha = live ? 0.7 : 0.2 + 0.25 * h.t / h.warn; strip(x0,y0,x1,y1,14,h.col); ctx.globalAlpha = 1;
      strip(x0,y0,x1,y1,1,c);
      const ext = live ? 1 : Math.min(0.20, h.t / h.warn * 0.20);
      limb(x0,y0,x0+(x1-x0)*ext,y0+(y1-y0)*ext,t*5,live,h.col);
    }
  } else if (h.heart || h.rod) {
    const m = h.heart || h.rod;
    shelter(m.x, m.y, h.heart ? 20 : 18, h.col, live);
    if (h.heart) { disc(m.x,m.y,5,bone); rect(m.x-1,m.y-4,2,8,P.ink0); }
    else { rect(m.x-1,m.y-11,3,12,brass); px(m.x,m.y-12,P.paper); }
    if (live) { ctx.globalAlpha=0.38; for (let i=0;i<10;i++){const a=i*TAU/10+t*0.7; strip(m.x+Math.cos(a)*23,m.y+Math.sin(a)*23,m.x+Math.cos(a)*190,m.y+Math.sin(a)*190,2,c);} ctx.globalAlpha=1; }
  } else if (h.id === 'wyrm') {
    const r = 75 * (1-k) + 4;
    ctx.beginPath(); ctx.arc(h.x,h.y,r,h.angle+0.55,h.angle+TAU-0.55); ctx.strokeStyle=c; ctx.lineWidth=live?5:2; ctx.stroke(); ctx.lineWidth=1;
    for(let i=0;i<12;i++){const a=h.angle+0.62+i*(TAU-1.24)/11; disc(h.x+Math.cos(a)*r,h.y+Math.sin(a)*r,2,h.col);}
  } else if (h.moons) {
    for (const m of h.moons) {
      const a=Math.atan2(m.y-h.fromY,m.x-h.fromX);
      ctx.globalAlpha=0.48; strip(m.x,m.y,m.x+Math.cos(a)*180,m.y+Math.sin(a)*180,19,'#141125'); ctx.globalAlpha=1;
      disc(m.x,m.y,9,'#43394c'); ring(m.x,m.y,9,1,c); px(m.x-3,m.y-4,bone);
    }
  } else if (h.marks) {
    for (let i=0;i<h.marks.length;i++){const m=h.marks[i]; if(live && i<h.beat) continue; ring(m.x,m.y,17,live && i===h.beat?4:1,c); line(m.x,m.y,m.x+7*Math.sin(i+t*4),m.y-7*Math.cos(i+t*4),brass);}
  } else if (h.end) {
    const x=h.read==='range'?h.fromX:h.x, y=h.read==='range'?h.fromY:h.y;
    ctx.globalAlpha=0.28; strip(x,y,h.end.x,h.end.y,h.read==='range'?18:22,h.col); ctx.globalAlpha=1; strip(x,y,h.end.x,h.end.y,live?4:1,c);
    ring(h.end.x,h.end.y,8,1,c);
  } else if (h.r) { ring(h.x,h.y,h.r,live?4:1,c); ring(h.x,h.y,h.r*Math.min(1,h.t/h.warn),1,h.col); }
}

export function awakenNox(e) {
  if (e.boss !== 'nox' || e.awakened) return false;
  e.awakened = true; e.phase = 4; e.state = 'awakening'; e.t = 1.9; e.rite = null;
  e.hp = e.maxHp = Math.round(e.maxHp * 0.65); e.chip = e.hp; e.r = 29; e.speed *= 1.14;
  e.loom = 0; e.enraged = false; e.fightT = 0; e.kx = e.ky = e.vx = e.vy = 0;
  G.hlines.length = G.hbeams.length = 0;
  for (const s of G.shots) if (s.owner === 'enemy') s.dead = true;
  for (const s of G.strikes) if (!s.friendly) s.dead = true;
  G.banner = { text: 'NOX UNBOUND', sub: 'THE SHROUD WAS ONLY A SKIN', t: 0, life: 1.9, c: '#ffac80' };
  for (let i=0;i<3;i++) addRing(e.x,e.y-32,i%2?violet:bone,90+i*45,0.8,2);
  A.rift(); A.bossRoar(); shake(0.8);
  return true;
}

export function noxDust(e, dt) {
  e.dying = Math.max(0,e.dying-dt);
  e.dustAcc = (e.dustAcc || 0) + dt*62;
  const sprite = sprFor(e), k = 1-e.dying/2.2;
  while(e.dustAcc >= 1) {
    e.dustAcc--;
    const x=e.x+(Math.random()-0.5)*sprite.w*(0.36+0.50*Math.sin(Math.PI*k)), y=e.y-sprite.h*(1-k);
    part(x,y,18+Math.random()*47,-10-Math.random()*25,0.8+Math.random()*0.6,Math.random()<0.33?bone:violet,{drag:0.7,s:1});
  }
  return e.dying === 0;
}
