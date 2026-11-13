// All sound is synthesized with Web Audio: no files, no network.
let ac = null, master, sfx, mus, crunch, nbuf, delayIn, delayNode, verbIn, padDuck, bassDuck;
const layers = {};
const loops = {};
const last = {};
const rnd = (a, b) => a + Math.random() * (b - a);

function gate(name, gap) {
  if (!ac) return false;
  const t = ac.currentTime;
  if (last[name] !== undefined && t - last[name] < gap) return false;
  last[name] = t;
  return true;
}
function env(node, t, a, peak, d) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(type, f0, f1, dur, vol, dest = sfx, t = ac.currentTime, a = 0.002) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + dur);
  const e = ac.createGain();
  env(e, t, a, vol, dur);
  o.connect(e); e.connect(dest);
  o.start(t); o.stop(t + a + dur + 0.03);
}
function hiss(dur, vol, type, f0, f1, q = 1, dest = sfx, t = ac.currentTime, a = 0.002) {
  const s = ac.createBufferSource();
  s.buffer = nbuf;
  const f = ac.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + a + dur);
  const e = ac.createGain();
  env(e, t, a, vol, dur);
  s.connect(f); f.connect(e); e.connect(dest);
  s.start(t, Math.random() * 1.2); s.stop(t + a + dur + 0.03);
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- soundtrack ----------
// Lead lines are offsets from D4 (MIDI 62), '.' is a rest. Bass is offset from each bar's root.
const bars = (s) => s.split('|').map((b) => b.trim().split(/\s+/).map((t) => (t === '.' ? null : +t)));
const same = (s) => bars([s, s, s, s].join('|'));
const DM = [0, 3, 7], MA = [0, 4, 7];
const TRACKS = {
  'ASHEN HYMN': {
    choir: true, bpm: 80, prog: [[38, DM], [34, MA], [31, DM], [33, MA]],
    kick: 'x.......x.......', snare: '................', hat: '..........x.....',
    bass: bars('0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . 7 . . .'),
    bassLen: 14, bassCut: 500,
    lead: bars('7 . . . 5 . 3 . 2 . . . 0 . . .|8 . . . 7 . 5 . 3 . . . 5 . . .|5 . . . 3 . 2 . 0 . . . -2 . . .|-1 . . . 2 . . . 7 . . . . . . .'),
    leadType: 'triangle', leadVol: 0.09, leadOct: 12, bell: true,
  },
  // ----- battle music -----
  'PIT DIRGE': {
    harm: true, stab: true, wobble: true, hey: [[], [12], [], [12, 14]], bpm: 132, prog: [[38, DM], [34, MA], [36, MA], [33, MA]],
    kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', hat: '..x...x...x...x.',
    bass: same('. . 0 12 . . 0 12 . . 0 12 . . 0 12'), bassLen: 1.6, bassCut: 1800,
    lead: bars('12 . 10 . 12 . 15 . 14 . 12 . 10 . 7 .|8 . . 10 12 . . . 10 . 8 . 7 . . .|7 . 10 . 12 . 14 . 15 . 14 . 12 . 10 .|13 . . . 16 . . . 19 . . . 13 . 12 .'),
    leadType: 'square', leadVol: 0.05, leadOct: 0, arp: [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 2, 1, 2],
  },
  BLOODRUSH: {
    wobble: true, harm: true, hey: [[], [], [], [12, 14]], bpm: 172, prog: [[38, DM], [38, DM], [34, MA], [36, MA]],
    kick: 'x.........x.....', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', tom: '..............xx',
    bass: same('0 . . . . . . . . . 0 . 3 . . .'), bassLen: 5, bassCut: 900, dist: true,
    lead: bars('12 . . 12 . . 15 . . . 12 . 10 . . .|12 . . 12 . . 17 . . . 15 . 12 . . .|10 . . 10 . . 14 . . . 12 . 10 . 8 .|12 . . 12 . . 14 . 15 . 17 . 19 . . .'),
    leadType: 'sawtooth', leadVol: 0.04, leadOct: 0, supersaw: true, arp: [0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2, 0, 2, 3, 2],
  },
  'NEON PULSE': {
    harm: true, stab: true, hey: [[], [], [], [12]], bpm: 124, prog: [[38, DM], [34, MA], [41, MA], [36, MA]],
    kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', hat: '..x...x...x...x.',
    bass: same('. . 12 . . . 12 . . . 12 . . . 12 0'), bassLen: 1.8, bassCut: 1700,
    lead: bars('7 . . 10 . . 12 . 14 . . 12 . 10 . .|5 . . 8 . . 10 . 12 . . 10 . 8 . .|3 . . 7 . . 10 . 15 . . 14 . 12 . .|7 . . . 5 . . . 2 . . . 0 . . .'),
    leadType: 'sawtooth', leadVol: 0.045, leadOct: 0, supersaw: true, arp: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
  },
  // ----- one theme per boss -----
  WARDEN: {
    stab: true, wobble: true, harm: true, hey: [[4, 12], [4, 12], [4, 12], [4, 12, 14]], bpm: 150, prog: [[38, DM], [36, MA], [34, MA], [33, MA]],
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', tom: '............xxxx',
    bass: bars('0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 12 0 12 0 . 12 .'),
    bassLen: 1.5, bassCut: 1600,
    lead: bars('12 . . 12 15 . 12 . 17 . 15 . 12 . 10 .|10 . . 10 14 . 10 . 15 . 14 . 10 . 7 .|8 . . 8 12 . 8 . 15 . 12 . 8 . 10 .|13 . 12 . 13 . 16 . 19 . 16 . 13 . 12 .'),
    leadType: 'sawtooth', leadVol: 0.045, leadOct: 0, supersaw: true, arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3],
  },
  BROOD: {
    wobble: true, harm: true, bpm: 166, prog: [[38, DM], [39, MA], [38, DM], [36, DM]],
    kick: 'x..x..x...x..x..', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', tom: '..x.....x.x.....',
    bass: same('0 . 1 0 . 1 0 . 3 . 1 0 . 1 . 0'), bassLen: 0.8, bassCut: 1200, dist: true,
    lead: bars('12 13 12 13 15 . 13 . 12 13 12 13 10 . 8 .|13 15 13 15 17 . 15 . 13 15 13 15 12 . 10 .|12 13 12 13 15 . 13 . 12 13 12 13 18 . 17 .|10 12 10 12 13 . 12 . 10 . 8 . 7 . 6 .'),
    leadType: 'square', leadVol: 0.04, leadOct: 0,
  },
  COLOSSUS: {
    stab: true, wobble: true, harm: true, hey: [[], [12], [], [12]], bpm: 128, prog: [[38, DM], [38, DM], [41, MA], [39, MA]],
    kick: 'x..x..x.x..x..x.', snare: '....x.......x...', clap: '....x.......x...', hat: '..x...x...x...x.', metal: true, tom: '.......x.......x',
    bass: same('0 . . 0 . . 0 . 0 . . 0 . 0 0 .'), bassLen: 1.2, bassCut: 700, dist: true,
    lead: bars('0 . . 3 . . 5 . 6 . 5 . 3 . . .|0 . . 3 . . 5 . 8 . 6 . 5 . . .|3 . . 7 . . 8 . 10 . 8 . 7 . . .|1 . . 3 . . 1 . 0 . . . -2 . . .'),
    leadType: 'square', leadVol: 0.06, leadOct: 0, arp: [0, 0, 3, 0, 0, 3, 0, 2, 0, 0, 3, 0, 0, 3, 2, 1],
  },
  KINGFALL: {
    stab: true, choir: true, harm: true, hey: [[], [], [], [12, 13, 14]], bpm: 150, prog: [[38, DM], [39, MA], [38, DM], [37, [0, 3, 6]]],
    kick: 'x..x..x...x..x..', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.x.x.', tom: 'x.......x...x.x.', clap: '............x...',
    bass: bars('0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 1 .'),
    bassLen: 1.4, bassCut: 900, dist: true,
    lead: bars('12 . . . 13 . . . 12 . 10 . 8 . 7 .|13 . . . 15 . . . 13 . 12 . 10 . 8 .|12 . 13 . 12 . 10 . 7 . 8 . 10 . 12 .|11 . . . 10 . . . 8 . 7 . 6 . 7 .'),
    leadType: 'sawtooth', leadVol: 0.05, leadOct: 0, bell: true, supersaw: true, arp: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 2, 3, 2],
  },
};
Object.assign(TRACKS, {
  VOID: {
    wobble: true, choir: true, harm: true, bpm: 132, prog: [[38, DM], [39, MA], [41, MA], [39, MA]],
    kick: 'x..x..x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tom: '..............xx',
    bass: same('0 . . 0 . 0 . . 0 . . 0 . 1 . 0'), bassLen: 1.3, bassCut: 900, dist: true,
    lead: bars('0 . . 1 . . 3 . 1 . . 0 . -2 . .|0 . . 1 . . 5 . 3 . . 1 . 0 . .|3 . . 5 . . 6 . 5 . . 3 . 1 . .|1 . . 0 . . -2 . 0 . . . . . . .'),
    leadType: 'sawtooth', leadVol: 0.045, leadOct: 12, supersaw: true,
  },
  TEMPEST: {
    stab: true, wobble: true, harm: true, hey: [[], [], [], [12, 14]], bpm: 174, prog: [[38, DM], [36, MA], [34, MA], [36, MA]],
    kick: 'x.........x.....', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', clap: '............x...',
    bass: same('0 . . . . . 0 . . . 0 . 12 . . .'), bassLen: 4, bassCut: 1000, dist: true,
    lead: bars('19 . 17 . 15 . 14 . 12 . 14 . 15 . 17 .|17 . 15 . 14 . 12 . 10 . 12 . 14 . 15 .|15 . 14 . 12 . 10 . 8 . 10 . 12 . 14 .|13 . . . 16 . . . 19 . . . 22 . . .'),
    leadType: 'square', leadVol: 0.04, leadOct: 0, arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
  },
  ECLIPSE: {
    stab: true, choir: true, harm: true, bell: true, hey: [[], [12], [], [12, 13, 14]], bpm: 160, prog: [[38, DM], [34, MA], [36, MA], [37, [0, 3, 6]]],
    kick: 'x...x...x...x...', snare: '....x.......x.x.', clap: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', tom: 'x...x...x..xxxxx',
    bass: same('0 0 12 0 0 12 0 0 0 0 12 0 0 12 0 12'), bassLen: 0.9, bassCut: 1200, dist: true,
    lead: bars('12 . . 15 . . 19 . 17 . . 15 . 14 . .|10 . . 14 . . 17 . 15 . . 14 . 12 . .|12 . . 16 . . 19 . 21 . . 19 . 16 . .|13 . . . 12 . . . 10 . . . 9 . . .'),
    leadType: 'sawtooth', leadVol: 0.045, leadOct: 0, supersaw: true, arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3],
  },
});
// the Mirror plays the battle theme backwards, slower and sung
TRACKS.REFLECTION = { ...TRACKS['PIT DIRGE'], bpm: 146, leadType: 'triangle', leadOct: 12, bell: true, choir: true, hey: null, lead: TRACKS['PIT DIRGE'].lead.map((b) => [...b].reverse()) };

// what plays in each moment when the soundtrack is AUTO, and how loud each layer is
const SCENES = {
  title: { track: 'ASHEN HYMN', pad: 1, bass: 0.7, drums: 0.5, arp: 0, lead: 1 },
  calm: { track: 'ASHEN HYMN', pad: 1, bass: 0.5, drums: 0, arp: 0, lead: 0.7 },
  fight: { track: 'COMBAT', pad: 0.4, bass: 1, drums: 1, arp: 0.55, lead: 0 },
  hot: { track: 'COMBAT', pad: 0.6, bass: 1, drums: 1, arp: 1, lead: 1 },
  boss_warden: { track: 'WARDEN', pad: 0.5, bass: 1, drums: 1, arp: 0.8, lead: 1 },
  boss_brood: { track: 'BROOD', pad: 0.4, bass: 1, drums: 1, arp: 0, lead: 1 },
  boss_colossus: { track: 'COLOSSUS', pad: 0.6, bass: 1, drums: 1, arp: 0.6, lead: 1 },
  boss_king: { track: 'KINGFALL', pad: 1, bass: 1, drums: 1, arp: 0.7, lead: 1 },
  boss_wyrm: { track: 'VOID', pad: 1, bass: 1, drums: 1, arp: 0, lead: 1 },
  boss_herald: { track: 'TEMPEST', pad: 0.5, bass: 1, drums: 1, arp: 0.9, lead: 1 },
  boss_mirror: { track: 'REFLECTION', pad: 0.8, bass: 1, drums: 1, arp: 0.6, lead: 1 },
  boss_eclipse: { track: 'ECLIPSE', pad: 1, bass: 1, drums: 1, arp: 0.8, lead: 1 },
  dead: { track: null, pad: 0.6, bass: 0, drums: 0, arp: 0, lead: 0 },
};
let choice = 'AUTO', combat = 'PIT DIRGE', scene = 'title', cur = TRACKS['ASHEN HYMN'], pending = null;
let step = 0, nextT = 0, mcr = null;
const S16 = () => 60 / cur.bpm / 4;

function kick(t) {
  tone('sine', 160, 42, 0.22, 1, layers.drums, t); tone('sine', 60, 38, 0.3, 0.5, layers.drums, t);
  hiss(0.012, 0.3, 'highpass', 3000, 3000, 1, layers.drums, t);
  for (const d of [padDuck, bassDuck]) { d.gain.cancelScheduledValues(t); d.gain.setValueAtTime(d === padDuck ? 0.35 : 0.55, t); d.gain.linearRampToValueAtTime(1, t + 0.2); }
}
function crash(t) { hiss(1.6, 0.12, 'highpass', 5000, 3500, 0.7, layers.drums, t); hiss(1.2, 0.06, 'highpass', 5000, 3500, 0.7, verbIn, t); }
// a gang shout: noise through two vowel formants, a few voices slightly apart
function hey(t) {
  for (let v = 0; v < 4; v++) {
    const at = t + v * 0.008, s = ac.createBufferSource(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
    s.buffer = nbuf; f1.type = 'bandpass'; f1.frequency.value = 650 + v * 40; f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = 1150 + v * 60; f2.Q.value = 6;
    env(g, at, 0.01, 0.5, 0.14);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(170 + v * 23, at); o.frequency.exponentialRampToValueAtTime(130 + v * 18, at + 0.15);
    env(og, at, 0.01, 0.12, 0.13);
    s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g); o.connect(f1); o.connect(f2); o.connect(og); og.connect(f1);
    g.connect(layers.drums); g.connect(verbIn);
    s.start(at, Math.random()); s.stop(at + 0.2); o.start(at); o.stop(at + 0.2);
  }
}
function snare(t, v = 1) { hiss(0.15, 0.34 * v, 'bandpass', 1900, 1500, 0.8, layers.drums, t); tone('triangle', 200, 150, 0.08, 0.18 * v, layers.drums, t); hiss(0.2, 0.12 * v, 'bandpass', 1900, 1500, 0.8, verbIn, t); }
function clap(t) { for (let i = 0; i < 3; i++) hiss(0.03 + (i === 2 ? 0.08 : 0), 0.3, 'bandpass', 1400, 1200, 1.5, layers.drums, t + i * 0.012); }
function hat(t, open, vel) { if (cur.metal) { hiss(0.06, 0.16, 'bandpass', 7200, 6800, 12, layers.drums, t); tone('square', 3100, 3000, 0.02, 0.02, layers.drums, t); } else hiss(open ? 0.09 : 0.025, 0.09 * vel, 'highpass', 8000, 8000, 1, layers.drums, t); }
function tom(t, i) { const f = 190 - (i % 4) * 25; tone('sine', f, f * 0.45, 0.2, 0.55, layers.drums, t); }
function bassNote(n, t) {
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain();
  const len = S16() * cur.bassLen;
  o.type = 'sawtooth'; o.frequency.value = mtof(n);
  f.type = 'lowpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(cur.bassCut, t); f.frequency.exponentialRampToValueAtTime(150, t + Math.min(len, 0.5));
  env(e, t, 0.004, 0.3, len);
  if (cur.wobble) {
    f.frequency.cancelScheduledValues(t); f.frequency.setValueAtTime(700, t); f.Q.value = 10;
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.type = 'triangle'; lfo.frequency.value = (cur.bpm / 60) * 2; lg.gain.value = 650;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + len + 0.05);
  }
  o.connect(f); f.connect(e); e.connect(cur.dist ? mcr : layers.bass);
  o.start(t); o.stop(t + len + 0.05);
  tone('sine', mtof(n - 12), mtof(n - 12), len, 0.28, layers.bass, t, 0.005);
}
function pad(root, ch, t) {
  const dur = S16() * 16;
  for (const iv of ch) for (const det of [-8, 8]) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(root + 24 + iv); o.detune.value = det;
    f.type = 'lowpass'; f.frequency.value = 700;
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.026, t + Math.min(0.6, dur / 3));
    e.gain.setValueAtTime(0.026, t + dur * 0.8);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pn = ac.createStereoPanner(); pn.pan.value = det < 0 ? -0.6 : 0.6;
    o.connect(f); f.connect(e); e.connect(pn); pn.connect(layers.pad);
    o.start(t); o.stop(t + dur + 0.05);
  }
  if (cur.choir) for (const iv of ch) {
    const o = ac.createOscillator(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), e = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(root + 36 + iv);
    lfo.frequency.value = 5; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune);
    f1.type = 'bandpass'; f1.frequency.value = 750; f1.Q.value = 4; f2.type = 'bandpass'; f2.frequency.value = 1200; f2.Q.value = 5;
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.05, t + 0.6); e.gain.setValueAtTime(0.05, t + dur * 0.8); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1); o.connect(f2); f1.connect(e); f2.connect(e); e.connect(layers.pad);
    o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
}
function leadNote(n, len, t) {
  const d = Math.max(0.08, S16() * len * 0.95), f = ac.createBiquadFilter(), e = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = cur.leadType === 'sawtooth' ? 2600 : 3200;
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(cur.leadVol, t + 0.01);
  e.gain.setValueAtTime(cur.leadVol * 0.8, t + d * 0.6);
  e.gain.exponentialRampToValueAtTime(0.0001, t + d + (cur.bell ? 0.4 : 0.05));
  f.connect(e); e.connect(layers.lead); e.connect(delayIn);
  const voices = cur.supersaw ? [[0, -14], [0, 0], [0, 14]] : [[0, 0]];
  if (cur.harm) voices.push([-12, 0], [7, 0]);
  for (const [iv, det] of voices) {
    const o = ac.createOscillator();
    o.type = cur.leadType; o.frequency.value = mtof(n + iv); o.detune.value = det;
    if (iv) { const hg = ac.createGain(); hg.gain.value = iv === 7 ? 0.35 : 0.5; o.connect(hg); hg.connect(f); } else o.connect(f);
    o.start(t); o.stop(t + d + 0.5);
  }
  if (cur.bell) {
    const o2 = ac.createOscillator(), e2 = ac.createGain();
    o2.type = 'sine'; o2.frequency.value = mtof(n + 12);
    env(e2, t, 0.003, cur.leadVol * 0.5, 0.6);
    o2.connect(e2); e2.connect(layers.lead); e2.connect(delayIn);
    o2.start(t); o2.stop(t + 0.7);
  }
}
function arpNote(n, t) {
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain();
  o.type = 'square'; o.frequency.value = mtof(n);
  f.type = 'lowpass'; f.frequency.value = 2600;
  env(e, t, 0.003, 0.04, 0.1);
  const pn = ac.createStereoPanner(); pn.pan.value = (step % 2 ? 0.55 : -0.55);
  o.connect(f); f.connect(e); e.connect(pn); pn.connect(layers.arp); e.connect(delayIn);
  o.start(t); o.stop(t + 0.15);
}
// ---------- EDM: offbeat chord stabs, risers, snare rolls and drops ----------
function stab(root, ch, t) {
  const f = ac.createBiquadFilter(), e = ac.createGain();
  f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.14);
  env(e, t, 0.004, 0.035, 0.13);
  f.connect(e); e.connect(layers.arp); e.connect(verbIn);
  for (const iv of [0, ch[1], ch[2], 12]) for (const det of [-12, 12]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(root + 36 + iv); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + 0.2);
  }
}
function riser(t, dur) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
  s.buffer = nbuf; s.loop = true;
  f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
  e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.22, t + dur);
  s.connect(f); f.connect(e); e.connect(layers.drums); e.connect(verbIn);
  s.start(t); s.stop(t + dur + 0.02);
  tone('sawtooth', 110, 880, dur, 0.04, layers.arp, t, dur * 0.9);
}
function drop(t) {
  tone('sine', 90, 28, 1.1, 0.9, layers.drums, t);
  hiss(0.9, 0.3, 'lowpass', 3000, 100, 0.7, layers.drums, t);
  crash(t); hey(t);
}

function playStep(i, t) {
  const s = i % 16, bar = Math.floor(i / 16) % 4;
  if (s === 0 && pending) { cur = pending; pending = null; if (delayNode) delayNode.delayTime.setValueAtTime(S16() * 3, t); }
  const [root, ch] = cur.prog[bar];
  if (s === 0) pad(root, ch, t);
  const edm = cur.bpm > 100, phrase = Math.floor(i / 16) % 8, build = edm && phrase === 7;
  if (s === 0 && bar === 0 && edm) { if (phrase === 0 && i > 0) drop(t); else crash(t); }
  if (build && s === 0) riser(t, S16() * 16);
  if (build) {
    // snare roll speeding up into the drop, kick drops out for the last half bar
    if (s < 8 ? s % 2 === 0 : true) snare(t, 0.35 + (s / 16) * 0.65);
  }
  if (cur.stab && edm && !build && (s === 2 || s === 6 || s === 10 || s === 14 || (bar === 3 && s === 12))) stab(root, ch, t);
  if (cur.hey && cur.hey[bar] && cur.hey[bar].includes(s)) hey(t);
  const bn = cur.bass[bar][s];
  if (bn !== null && bn !== undefined) bassNote(root + bn, t);
  if (cur.kick[s] === 'x' && !(build && s >= 8)) kick(t);
  if (cur.snare[s] === 'x') snare(t, s % 4 === 0 ? 1 : 0.5);
  if (cur.clap && cur.clap[s] === 'x') clap(t);
  if (cur.hat[s] === 'x') hat(t, s % 8 === 6, s % 2 ? 0.6 : 1);
  if (cur.tom && cur.tom[s] === 'x' && (bar === 3 || !cur.tom.endsWith('xxxx'))) tom(t, s);
  const ln = cur.lead[bar][s];
  if (ln !== null && ln !== undefined) {
    let len = 1;
    while (len < 4 && s + len < 16 && cur.lead[bar][s + len] === null) len++;
    leadNote(62 + cur.leadOct + ln, len, t);
  }
  if (cur.arp) { const tones = [0, ch[1], ch[2], 12]; arpNote(root + 36 + tones[cur.arp[s]], t); }
}
function schedule() {
  if (!ac || ac.state !== 'running' || choice === 'OFF') return;
  if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
  while (nextT < ac.currentTime + 0.12) { playStep(step, nextT); nextT += S16(); step++; }
}
function wantTrack() {
  if (choice !== 'AUTO') return TRACKS[choice] || null;
  const t = SCENES[scene].track;
  return t === 'COMBAT' ? TRACKS[combat] : t ? TRACKS[t] : null;
}
function applyScene() {
  const want = wantTrack();
  if (want && want !== cur) {
    // land the change on the next bar line
    pending = want;
    const s = step % 16;
    if (s !== 0) step += 16 - s;
  }
  if (!ac) return;
  const L = choice === 'AUTO' || scene === 'dead' ? SCENES[scene] : { pad: 0.8, bass: 1, drums: scene === 'title' || scene === 'calm' ? 0.5 : 1, arp: 0.8, lead: 1 };
  for (const k of ['pad', 'bass', 'drums', 'arp', 'lead']) layers[k].gain.setTargetAtTime(L[k], ac.currentTime, 0.5);
}

export const A = {
  get ready() { return !!ac; },
  init(s) {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ac.createGain();
    master.connect(comp); comp.connect(ac.destination);
    sfx = ac.createGain(); sfx.connect(master);
    mus = ac.createGain(); mus.connect(master);
    crunch = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 3.2); }
    crunch.curve = curve;
    const cg = ac.createGain(); cg.gain.value = 0.55;
    crunch.connect(cg); cg.connect(sfx);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2.5, ac.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a generated hall reverb
    const verb = ac.createConvolver(), ir = ac.createBuffer(2, ac.sampleRate * 2.2, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); }
    verb.buffer = ir;
    verbIn = ac.createGain(); verbIn.gain.value = 0.32;
    const vlp = ac.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 4000;
    verbIn.connect(vlp); vlp.connect(verb); verb.connect(mus);
    padDuck = ac.createGain(); padDuck.connect(mus);
    bassDuck = ac.createGain(); bassDuck.connect(mus);
    for (const k of ['pad', 'bass', 'drums', 'arp', 'lead']) {
      layers[k] = ac.createGain(); layers[k].gain.value = 0;
      layers[k].connect(k === 'pad' ? padDuck : k === 'bass' ? bassDuck : mus);
      if (k !== 'bass' && k !== 'drums') layers[k].connect(verbIn);
    }
    mcr = ac.createWaveShaper(); mcr.curve = curve;
    const mg = ac.createGain(); mg.gain.value = 0.45; mcr.connect(mg); mg.connect(layers.bass);
    delayIn = ac.createGain(); delayIn.gain.value = 0.3;
    delayNode = ac.createDelay(2);
    const fb = ac.createGain(), lp = ac.createBiquadFilter();
    delayNode.delayTime.value = S16() * 3; fb.gain.value = 0.35; lp.type = 'lowpass'; lp.frequency.value = 1800;
    delayIn.connect(delayNode); delayNode.connect(lp); lp.connect(fb); fb.connect(delayNode); lp.connect(mus);
    this.settings(s);
    applyScene();
    nextT = ac.currentTime + 0.1;
    setInterval(schedule, 25);
  },
  settings(s) {
    choice = s.track; combat = s.combat;
    if (!ac) return;
    master.gain.setTargetAtTime(s.master * 0.85, ac.currentTime, 0.05);
    mus.gain.setTargetAtTime(choice === 'OFF' ? 0 : s.music * 0.5, ac.currentTime, 0.05);
    sfx.gain.setTargetAtTime(s.sfx, ac.currentTime, 0.05);
    applyScene();
  },
  scene(name) {
    if (!SCENES[name] || name === scene) return;
    scene = name;
    applyScene();
  },
  suspend(on) { if (ac) on ? ac.suspend() : ac.resume(); },

  // continuous sounds: beams, minigun hum, orbital laser
  loop(name, on, kind = 'beam') {
    if (!ac) return;
    const l = loops[name];
    if (on && !l) {
      const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.value = kind === 'orbital' ? 55 : kind === 'boss' ? 70 : 180;
      o2.frequency.value = o.frequency.value * 1.505;
      f.type = 'lowpass'; f.frequency.value = kind === 'orbital' ? 900 : 1600; f.Q.value = 4;
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(kind === 'orbital' ? 0.22 : 0.09, ac.currentTime, 0.03);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfx);
      o.start(); o2.start();
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = kind === 'orbital' ? 9 : 22; lg.gain.value = 300;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      loops[name] = { o, o2, g, lfo };
    } else if (!on && l) {
      l.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.03);
      const t = ac.currentTime + 0.2;
      l.o.stop(t); l.o2.stop(t); l.lfo.stop(t);
      delete loops[name];
    }
  },
  stopLoops() { for (const k in loops) this.loop(k, false); },

  swing(n) {
    if (!gate('sw', 0.02)) return;
    const h = n === 2;
    hiss(h ? 0.2 : 0.12, h ? 0.55 : 0.38, 'bandpass', h ? 450 : 800, h ? 5200 : 3800, 1.5);
    tone('sine', h ? 900 : 1300, h ? 380 : 620, 0.09, 0.05);
  },
  heavySwing() { if (gate('hsw', 0.05)) { hiss(0.3, 0.6, 'bandpass', 250, 2400, 1.2); tone('sine', 300, 120, 0.25, 0.15, crunch); } },
  hit(heavy, crit) {
    if (!gate('hit', 0.03)) return;
    tone('sine', heavy ? 200 : 175, 40, heavy ? 0.2 : 0.13, 1, crunch);
    hiss(0.07, 0.5, 'highpass', 2600, 1200, 0.7);
    tone('square', rnd(1400, 1800), 600, 0.05, 0.06);
    if (crit) tone('triangle', 2400, 2300, 0.3, 0.12);
  },
  tick() { if (gate('tick', 0.045)) { tone('sine', 220, 80, 0.06, 0.4, crunch); hiss(0.03, 0.2, 'highpass', 3000, 2000, 1); } },
  kill() { if (gate('kill', 0.04)) { tone('sine', 120, 28, 0.32, 1, crunch); hiss(0.3, 0.5, 'lowpass', 4200, 180, 0.8); } },
  slice() { if (gate('slice', 0.04)) hiss(0.1, 0.35, 'bandpass', 5000, 9500, 2); },
  dash() { if (gate('dash', 0.05)) { hiss(0.17, 0.32, 'bandpass', 280, 1900, 1.2); tone('sine', 300, 760, 0.12, 0.05); } },
  parry() {
    if (!gate('parry', 0.04)) return;
    tone('sine', 1320, 1320, 0.55, 0.22); tone('sine', 1980, 1975, 0.35, 0.12);
    tone('square', 700, 1400, 0.06, 0.08); hiss(0.05, 0.4, 'highpass', 4000, 4000, 1);
  },
  perfect() { if (!ac) return; tone('triangle', 500, 1600, 0.35, 0.15); tone('sine', 1600, 1600, 0.6, 0.08, sfx, ac.currentTime + 0.12); hiss(0.4, 0.2, 'bandpass', 2200, 600, 3); },
  rift() { if (!ac) return; hiss(0.18, 0.45, 'bandpass', 600, 7000, 1.5); tone('sine', 300, 1800, 0.18, 0.12); },
  riftCut() { if (!ac) return; tone('sine', 3200, 2800, 0.6, 0.12); tone('triangle', 1600, 1500, 0.4, 0.1); hiss(0.12, 0.5, 'highpass', 3000, 6000, 1); last.boom = -1; this.boom(0.8); },
  zap() {
    if (!ac) return;
    const t = ac.currentTime;
    for (let i = 0; i < 7; i++) tone('square', rnd(200, 1400), rnd(90, 300), 0.05, 0.07, sfx, t + i * 0.03);
    hiss(0.32, 0.4, 'highpass', 3000, 8000, 4); tone('sawtooth', 95, 40, 0.3, 0.35, crunch);
  },
  zip() { if (gate('zip', 0.06)) { tone('square', rnd(800, 1600), rnd(200, 400), 0.06, 0.05); hiss(0.06, 0.15, 'highpass', 5000, 5000, 2); } },
  boom(sz = 1) { if (gate('boom', 0.05)) { tone('sine', 100, 24, 0.3 * sz + 0.1, 1, crunch); hiss(0.4 * sz, 0.7, 'lowpass', 2600, 90, 0.7); } },
  wall() { if (gate('wall', 0.05)) { tone('sine', 90, 38, 0.16, 0.9, crunch); hiss(0.1, 0.5, 'lowpass', 1500, 300, 1); } },
  gun() { if (gate('gun', 0.03)) { tone('square', 900, 120, 0.06, 0.18, crunch); hiss(0.07, 0.45, 'bandpass', 3000, 900, 0.8); } },
  minigun() { if (gate('mg', 0.028)) { tone('square', 700, 100, 0.04, 0.14, crunch); hiss(0.04, 0.35, 'bandpass', 2500, 800, 0.8); } },
  shotgun() { if (!ac) return; tone('sine', 140, 30, 0.3, 1, crunch); hiss(0.25, 0.8, 'lowpass', 6000, 300, 0.6); tone('square', 400, 60, 0.12, 0.2, crunch); },
  reload() { if (!ac) return; tone('square', 1200, 1200, 0.03, 0.06); tone('square', 800, 800, 0.04, 0.07, sfx, ac.currentTime + 0.12); },
  click() { if (gate('click', 0.1)) tone('square', 2200, 2200, 0.02, 0.05); },
  toss() { if (gate('toss', 0.08)) { hiss(0.15, 0.2, 'bandpass', 800, 1600, 2); tone('sine', 600, 900, 0.1, 0.05); } },
  magic() { if (gate('magic', 0.05)) { tone('triangle', rnd(700, 900), 1400, 0.12, 0.08); tone('sine', 1800, 2400, 0.08, 0.04); } },
  freeze() { if (!ac) return; hiss(0.4, 0.4, 'highpass', 6000, 2000, 2); tone('sine', 2400, 1200, 0.4, 0.1); tone('triangle', 3200, 3000, 0.5, 0.05); },
  meteorFall() { if (gate('mf', 0.08)) hiss(0.5, 0.25, 'bandpass', 400, 2400, 2); },
  shuriken() { if (gate('shu', 0.05)) { hiss(0.08, 0.3, 'bandpass', 3000, 6000, 3); tone('square', 1800, 1200, 0.04, 0.04); } },
  smoke() { if (!ac) return; hiss(0.6, 0.5, 'lowpass', 1500, 200, 0.7); tone('sine', 300, 80, 0.3, 0.2); },
  build() { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 3; i++) tone('square', 300 + i * 120, 200, 0.05, 0.1, crunch, t + i * 0.07); },
  pew() { if (gate('pew', 0.05)) tone('square', 1400, 500, 0.06, 0.05); },
  shieldUp() { if (!ac) return; tone('sine', 300, 900, 0.3, 0.15); tone('triangle', 600, 1800, 0.3, 0.06); },
  shieldHit() { if (gate('shh', 0.06)) { tone('triangle', 1600, 800, 0.15, 0.15); hiss(0.08, 0.3, 'highpass', 3000, 3000, 1); } },
  rocket() { if (gate('rk', 0.04)) { hiss(0.3, 0.35, 'bandpass', 600, 3000, 1.5); tone('sawtooth', 200, 400, 0.15, 0.05); } },
  overheat() { if (!ac) return; hiss(0.6, 0.4, 'highpass', 2000, 6000, 1); tone('square', 600, 200, 0.4, 0.08); },
  pickup(n) {
    if (!gate('pk', 0.022)) return;
    const f = 660 * Math.pow(2, Math.min(n, 24) / 12);
    tone('triangle', f, f, 0.09, 0.1); tone('sine', f * 2, f * 2, 0.05, 0.04);
  },
  heal() { if (!ac) return; tone('sine', 523, 523, 0.15, 0.15); tone('sine', 784, 784, 0.25, 0.15, sfx, ac.currentTime + 0.08); },
  hurt() { if (!ac) return; tone('sawtooth', 260, 70, 0.3, 0.45, crunch); hiss(0.25, 0.5, 'lowpass', 1800, 200, 1); },
  death() { if (!ac) return; tone('sawtooth', 220, 30, 1.6, 0.5, crunch); hiss(1.4, 0.5, 'lowpass', 3000, 80, 0.7); },
  rank(r) {
    if (!ac) return;
    const base = 74 + [0, 0, 2, 3, 5, 7, 10][r];
    tone('triangle', mtof(base), mtof(base), 0.08, 0.12);
    tone('triangle', mtof(base + 7), mtof(base + 7), 0.18, 0.12, sfx, ac.currentTime + 0.07);
  },
  deny() { if (gate('deny', 0.12)) tone('square', 180, 140, 0.08, 0.07); },
  ui() { if (gate('ui', 0.03)) tone('square', 880, 880, 0.03, 0.05); },
  select() { if (!ac) return; tone('square', 660, 660, 0.05, 0.06); tone('square', 990, 990, 0.1, 0.06, sfx, ac.currentTime + 0.05); },
  sigil() { if (gate('sig', 0.12)) { tone('sine', 220, 440, 0.4, 0.04); hiss(0.4, 0.05, 'bandpass', 800, 2400, 6); } },
  spawn() { if (gate('spn', 0.06)) { hiss(0.12, 0.2, 'lowpass', 1200, 300, 1); tone('sine', 300, 90, 0.12, 0.14); } },
  shoot() { if (gate('shoot', 0.05)) tone('triangle', 520, 240, 0.14, 0.07); },
  fuse() { if (gate('fuse', 0.08)) tone('square', 1200, 1200, 0.04, 0.05); },
  step() { if (gate('step', 0.1)) hiss(0.03, 0.05, 'lowpass', 900, 400, 1); },
  splat() { if (gate('splat', 0.05)) { hiss(0.15, 0.3, 'lowpass', 900, 200, 2); tone('sine', 180, 60, 0.1, 0.2); } },
  warn() { if (gate('warn', 0.2)) { tone('square', 880, 880, 0.08, 0.06); tone('square', 660, 660, 0.08, 0.06, sfx, ac.currentTime + 0.1); } },
  waveStart(boss) {
    if (!ac) return;
    if (boss) { this.bossRoar(); return; }
    tone('triangle', 147, 147, 0.5, 0.12); tone('triangle', 220, 220, 0.6, 0.1, sfx, ac.currentTime + 0.12);
  },
  waveClear() { if (!ac) return; const t = ac.currentTime; [62, 65, 69, 74, 77].forEach((n, i) => tone('triangle', mtof(n), mtof(n), 0.4, 0.1, sfx, t + i * 0.07)); },
  victory() { if (!ac) return; const t = ac.currentTime; [62, 66, 69, 74, 78, 81, 86].forEach((n, i) => { tone('triangle', mtof(n), mtof(n), 0.8, 0.1, sfx, t + i * 0.12); tone('sine', mtof(n + 12), mtof(n + 12), 0.6, 0.05, sfx, t + i * 0.12); }); },
  bossRoar() {
    if (!ac) return;
    tone('sawtooth', 75, 45, 1.3, 0.5, crunch, ac.currentTime, 0.1);
    tone('sawtooth', 112, 60, 1.2, 0.3, crunch, ac.currentTime, 0.1);
    hiss(1.2, 0.4, 'lowpass', 700, 120, 2, sfx, ac.currentTime, 0.1);
  },
  ultStart() { if (!ac) return; tone('sine', 70, 30, 1.2, 0.8, crunch); hiss(0.5, 0.4, 'bandpass', 200, 6000, 2, sfx, ac.currentTime, 0.4); },
  ultCut(i) { if (!ac) return; hiss(0.05, 0.4, 'bandpass', 6000, 9500, 3); tone('sine', 1800 + i * 70, 1700 + i * 70, 0.07, 0.05); },
  ultRelease() { if (!ac) return; last.boom = -1; this.boom(2.6); tone('sine', 2600, 2400, 1.3, 0.1); hiss(1, 0.5, 'lowpass', 8000, 200, 0.7); },
};
