// All sound is synthesized with Web Audio: no files, no network.
let ac = null, master, sfx, mus, crunch, nbuf, delayIn, delayNode;
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
const TRACKS = {
  'ASHEN HYMN': {
    bpm: 80,
    prog: [[38, [0, 3, 7]], [34, [0, 4, 7]], [31, [0, 3, 7]], [33, [0, 4, 7]]],
    kick: 'x.......x.......', snare: '................', hat: '..........x.....',
    bass: bars('0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . . . . .|0 . . . . . . . . . . . 7 . . .'),
    bassLen: 14, bassCut: 500,
    lead: bars('7 . . . 5 . 3 . 2 . . . 0 . . .|8 . . . 7 . 5 . 3 . . . 5 . . .|5 . . . 3 . 2 . 0 . . . -2 . . .|-1 . . . 2 . . . 7 . . . . . . .'),
    leadType: 'triangle', leadVol: 0.09, leadOct: 12, bell: true,
    arp: null,
  },
  'PIT DIRGE': {
    bpm: 128,
    prog: [[38, [0, 3, 7]], [34, [0, 4, 7]], [36, [0, 4, 7]], [33, [0, 4, 7]]],
    kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.xxx.x.x.xx',
    bass: bars('0 . . 12 . . 0 . 0 . 12 . . 0 . 12|0 . . 12 . . 0 . 0 . 12 . . 0 . 12|0 . . 12 . . 0 . 0 . 12 . . 0 . 12|0 . . 12 . . 0 . 0 . 12 . . 0 . 12'),
    bassLen: 1.7, bassCut: 1100,
    lead: bars('12 . 10 . 12 . 15 . 14 . 12 . 10 . 7 .|8 . . 10 12 . . . 10 . 8 . 7 . . .|7 . 10 . 12 . 14 . 15 . 14 . 12 . 10 .|13 . . . 16 . . . 19 . . . 13 . . .'),
    leadType: 'square', leadVol: 0.05, leadOct: 0,
    arp: [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 3, 2, 1, 2],
  },
  OVERDRIVE: {
    bpm: 150,
    prog: [[38, [0, 3, 7]], [36, [0, 4, 7]], [34, [0, 4, 7]], [33, [0, 4, 7]]],
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx',
    bass: bars('0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .|0 . 12 . 0 . 12 . 0 12 0 12 0 . 12 .'),
    bassLen: 1.5, bassCut: 1600,
    lead: bars('12 . . 12 15 . 12 . 17 . 15 . 12 . 10 .|10 . . 10 14 . 10 . 15 . 14 . 10 . 7 .|8 . . 8 12 . 8 . 15 . 12 . 8 . 10 .|13 . 12 . 13 . 16 . 19 . 16 . 13 . 12 .'),
    leadType: 'sawtooth', leadVol: 0.045, leadOct: 0,
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3],
  },
  KINGFALL: {
    bpm: 138,
    prog: [[38, [0, 3, 7]], [39, [0, 4, 7]], [38, [0, 3, 7]], [37, [0, 3, 6]]],
    kick: 'x..x..x...x..x..', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.x.x.',
    bass: bars('0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 0 .|0 0 . 0 0 . 0 . 0 0 . 0 12 . 1 .'),
    bassLen: 1.4, bassCut: 900,
    lead: bars('12 . . . 13 . . . 12 . 10 . 8 . 7 .|13 . . . 15 . . . 13 . 12 . 10 . 8 .|12 . 13 . 12 . 10 . 7 . 8 . 10 . 12 .|11 . . . 10 . . . 8 . 7 . 6 . 7 .'),
    leadType: 'sawtooth', leadVol: 0.05, leadOct: 0, bell: true,
    arp: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 2, 3, 2],
  },
};
// what plays in each moment when the track setting is AUTO, and how loud each layer is
const SCENES = {
  title: { track: 'ASHEN HYMN', pad: 1, bass: 0.7, drums: 0.5, arp: 0, lead: 1 },
  calm: { track: 'ASHEN HYMN', pad: 1, bass: 0.5, drums: 0, arp: 0, lead: 0.7 },
  fight: { track: 'PIT DIRGE', pad: 0.4, bass: 1, drums: 1, arp: 0.55, lead: 0 },
  hot: { track: 'PIT DIRGE', pad: 0.6, bass: 1, drums: 1, arp: 1, lead: 1 },
  boss: { track: 'OVERDRIVE', pad: 0.5, bass: 1, drums: 1, arp: 0.8, lead: 1 },
  final: { track: 'KINGFALL', pad: 1, bass: 1, drums: 1, arp: 0.7, lead: 1 },
  dead: { track: null, pad: 0.6, bass: 0, drums: 0, arp: 0, lead: 0 },
};
let choice = 'AUTO', scene = 'title', cur = TRACKS['ASHEN HYMN'], pending = null;
let step = 0, nextT = 0;
const S16 = () => 60 / cur.bpm / 4;

function kick(t) { tone('sine', 150, 42, 0.2, 0.9, layers.drums, t); hiss(0.012, 0.25, 'highpass', 3000, 3000, 1, layers.drums, t); }
function snare(t, v = 1) { hiss(0.15, 0.32 * v, 'bandpass', 1900, 1500, 0.8, layers.drums, t); tone('triangle', 200, 150, 0.08, 0.18 * v, layers.drums, t); }
function hat(t, open) { hiss(open ? 0.09 : 0.025, 0.09, 'highpass', 8000, 8000, 1, layers.drums, t); }
function bassNote(n, t) {
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain();
  const len = S16() * cur.bassLen;
  o.type = 'sawtooth'; o.frequency.value = mtof(n);
  f.type = 'lowpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(cur.bassCut, t); f.frequency.exponentialRampToValueAtTime(150, t + Math.min(len, 0.5));
  env(e, t, 0.004, 0.3, len);
  o.connect(f); f.connect(e); e.connect(layers.bass);
  o.start(t); o.stop(t + len + 0.05);
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
    o.connect(f); f.connect(e); e.connect(layers.pad);
    o.start(t); o.stop(t + dur + 0.05);
  }
}
function leadNote(n, len, t) {
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain();
  o.type = cur.leadType; o.frequency.value = mtof(n);
  f.type = 'lowpass'; f.frequency.value = cur.leadType === 'sawtooth' ? 2400 : 3200;
  const d = Math.max(0.08, S16() * len * 0.95);
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(cur.leadVol, t + 0.01);
  e.gain.setValueAtTime(cur.leadVol * 0.8, t + d * 0.6);
  e.gain.exponentialRampToValueAtTime(0.0001, t + d + (cur.bell ? 0.4 : 0.05));
  o.connect(f); f.connect(e); e.connect(layers.lead); e.connect(delayIn);
  o.start(t); o.stop(t + d + 0.5);
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
  o.connect(f); f.connect(e); e.connect(layers.arp); e.connect(delayIn);
  o.start(t); o.stop(t + 0.15);
}
function playStep(i, t) {
  const s = i % 16, bar = Math.floor(i / 16) % 4;
  if (s === 0 && pending) { cur = pending; pending = null; if (delayNode) delayNode.delayTime.setValueAtTime(S16() * 3, t); }
  const [root, ch] = cur.prog[bar];
  if (s === 0) pad(root, ch, t);
  const bn = cur.bass[bar][s];
  if (bn !== null && bn !== undefined) bassNote(root + bn, t);
  if (cur.kick[s] === 'x') kick(t);
  if (cur.snare[s] === 'x') snare(t, s % 4 === 0 ? 1 : 0.5);
  if (cur.hat[s] === 'x') hat(t, s % 8 === 6);
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
  return t ? TRACKS[t] : null;
}
function applyScene() {
  const want = wantTrack();
  if (want && want !== cur) {
    // jump to the next bar line so the change lands on the beat
    pending = want;
    const s = step % 16;
    if (s !== 0) step += 16 - s;
  }
  if (!ac) return;
  const L = SCENES[scene];
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
    for (const k of ['pad', 'bass', 'drums', 'arp', 'lead']) { layers[k] = ac.createGain(); layers[k].gain.value = 0; layers[k].connect(mus); }
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
    choice = s.track;
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
