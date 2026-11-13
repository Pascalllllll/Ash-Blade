import { fit, ctx, W, H, P, applyTheme, applyDisplay } from './gfx.js';
import { input, keyHit, endFrame } from './input.js';
import { A } from './audio.js';
import { settings, best, loadAll, saveBest, saveSettings, resetSettings, saveRun, loadRun, clearRun } from './store.js';
import { buildSprites } from './sprites.js';
import { byId } from './upgrades.js';
import { G, fx, newRun, startWave, update, controls, drawWorld, showMap, snapshot, buzz } from './world.js';
import {
  drawHUD, drawTitle, titleItems, titleMenu, runMenu, drawUpgrade, updateUpgrade, openUpgrade, upg,
  pauseItems, pauseMenu, drawPause, drawOver, drawVictory, vignette, screenFlash, cursor, refreshArt,
  sel, updateSelect, drawSelect, setm, settingsItems, updateSettings, drawSettings, drawSplash, drawIntro, INTRO_LEN, INTRO_CUES,
} from './ui.js';

loadAll();
applyTheme(settings.theme);
applyDisplay(settings);
buildSprites();
refreshArt();
showMap(settings.map);
fit();
addEventListener('resize', fit);
addEventListener('touchstart', fit, { once: true });

let scene = 'splash', sceneT = 0, last = performance.now(), newBest = false, settingsFrom = 'title';
let save = loadRun((id) => !!byId(id));

function go(s) { scene = s; sceneT = 0; }
function toTitle() { settingsFrom = 'title'; save = loadRun((id) => !!byId(id)); showMap(settings.map); titleMenu.sel = 0; A.stopLoops(); A.scene('title'); go('title'); }
function startRun(char, s) { A.init(settings); newRun(char, s); go('play'); }
function checkpoint() { if (G && !G.dead) saveRun(snapshot()); }
function recordBest(won) {
  newBest = G.score > best.score;
  if (newBest) best.score = G.score;
  best.wave = Math.max(best.wave, G.wave);
  if (won) best.won = true;
  const r = best.chars[G.char] || { score: 0, wave: 0, won: false };
  best.chars[G.char] = { score: Math.max(r.score, G.score), wave: Math.max(r.wave, G.wave), won: r.won || won };
  saveBest();
}
function applySettings(prev) {
  if (prev.theme !== settings.theme) { applyTheme(settings.theme); buildSprites(); refreshArt(); }
  applyDisplay(settings);
  A.settings(settings);
  if (settingsFrom === 'title' && prev.map !== settings.map) showMap(settings.map);
  saveSettings();
}

addEventListener('blur', () => { if (scene === 'play' && !G.dead) { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); } });

function tick(now) {
  const rdt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  sceneT += rdt;

  let ts = 1;
  if (fx.freeze > 0) { fx.freeze -= rdt; ts = 0; }
  else if (fx.slowT > 0) { fx.slowT -= rdt; ts = fx.slowF; if (fx.slowT <= 0) fx.slowF = 1; }
  fx.trauma = Math.max(0, fx.trauma - rdt * 1.5);
  fx.shakeT += rdt * 30;
  const sh = fx.trauma * fx.trauma * settings.shake;
  fx.ox = Math.round(10 * sh * Math.sin(fx.shakeT * 1.7));
  fx.oy = Math.round(7 * sh * Math.sin(fx.shakeT * 2.3 + 1));
  fx.flashT -= rdt;
  if (input.any || input.mouse.pressed) A.init(settings);
  input.touchPlay = scene === 'play' && G && !G.dead && !G.cine;
  // phones held upright: pause and let the overlay ask for landscape
  const portrait = input.touch && innerHeight > innerWidth;
  if (portrait && scene === 'play' && !G.dead) { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); }

  if (scene === 'splash') {
    if (input.any || input.mouse.pressed) { A.init(settings); A.scene('title'); go('intro'); }
    drawSplash(sceneT, input.touch);
  } else if (scene === 'intro') {
    for (const [ct, cue] of INTRO_CUES) if (sceneT >= ct && sceneT - rdt < ct) { A[cue](); if (cue === 'riftCut' || cue === 'ultRelease') buzz('heavy'); else if (cue === 'wall') buzz('tap'); }
    if (sceneT > 0.3 && (input.any || input.mouse.pressed)) go('title');
    else if (sceneT >= INTRO_LEN) go('title');
    else drawIntro(sceneT);
    if (scene === 'title') drawTitle(0.8, titleItems(save, (r) => r));
  } else if (scene === 'title') {
    const items = titleItems(save, (r) => r);
    const r = runMenu(titleMenu, items, (W - 150) / 2, 104, 150, 12);
    if (r === 'continue' && save) startRun(save.char, save);
    else if (r === 'select') { sel.i = Math.max(0, ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT'].indexOf(settings.char)); sel.row = 0; sel.t = 0; go('select'); }
    else if (r === 'settings') { settingsFrom = 'title'; setm.tab = 0; setm.sel = 0; go('settings'); }
    drawTitle(sceneT, items);
  } else if (scene === 'select') {
    const r = updateSelect(rdt);
    if (r?.map || r?.diff) { const prev = { ...settings }; Object.assign(settings, r); applySettings(prev); }
    if (r?.back) toTitle();
    else if (r?.start) { settings.char = r.start; saveSettings(); clearRun(); startRun(r.start, null); checkpoint(); }
    else drawSelect(sceneT);
    if (scene === 'play') drawWorld();
  } else if (scene === 'settings') {
    const items = settingsItems({ hasSave: !!save });
    const prev = { ...settings };
    const r = updateSettings(items);
    if (r === 'changed') applySettings(prev);
    else if (r === 'reset') { resetSettings(); applySettings(prev); }
    else if (r === 'erase') { clearRun(); save = null; }
    else if (r === 'back') { if (settingsFrom === 'pause') go('pause'); else toTitle(); }
    if (settingsFrom === 'pause') { drawWorld(); vignette(); }
    drawSettings(sceneT, items, settingsFrom === 'pause');
  } else if (scene === 'play') {
    if ((keyHit('Escape', 'KeyP') || input.thit.has('pause')) && !G.dead && !G.cine) { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); }
    else {
      controls();
      update(rdt * ts, rdt);
      if (G.victory && G.deadT === 0 && G.phase === 'clear' && G.phaseT < 0) { G.victory = false; recordBest(true); go('victory'); A.scene('title'); }
      else if (G.wantUpgrade) { G.wantUpgrade = false; openUpgrade(); go('upgrade'); }
      if (G.dead && G.deadT > 2.2) { recordBest(false); clearRun(); save = null; go('over'); }
    }
    drawWorld(); vignette(); drawHUD();
  } else if (scene === 'upgrade') {
    update(0, rdt);
    const pick = updateUpgrade(rdt);
    if (pick >= 0) {
      const o = upg.opts[pick];
      o.f(G.up, G.p);
      G.taken[o.id] = (G.taken[o.id] || 0) + 1;
      A.select();
      startWave(G.wave + 1);
      checkpoint();
      go('play');
    }
    drawWorld(); vignette(); drawHUD(true); drawUpgrade();
  } else if (scene === 'pause') {
    const items = pauseItems((r) => r);
    const r = keyHit('Escape', 'KeyP') ? 'resume' : runMenu(pauseMenu, items, 70, 64, 180, 13);
    if (r === 'resume') { go('play'); A.scene(G.boss ? 'boss_' + G.boss.boss : 'fight'); }
    else if (r === 'settings') { settingsFrom = 'pause'; setm.tab = 0; setm.sel = 0; go('settings'); }
    else if (r === 'restart') { const s = loadRun((id) => !!byId(id)); if (s) startRun(s.char, s); else { startRun(G.char, null); checkpoint(); } }
    else if (r === 'exit') toTitle();
    if (scene === 'pause' || scene === 'settings') { drawWorld(); vignette(); drawHUD(true); if (scene === 'pause') drawPause(items); }
  } else if (scene === 'over') {
    update(rdt * ts, rdt);
    const tapL = input.touch && input.mouse.pressed && input.mouse.x < W / 2, tapR = input.touch && input.mouse.pressed && !tapL;
    if (sceneT > 1 && (keyHit('Enter', 'Space') || (!input.touch && input.mouse.pressed) || tapL)) { const c = G.char; startRun(c, null); checkpoint(); }
    else if (sceneT > 0.5 && (keyHit('Escape') || (sceneT > 1 && tapR))) toTitle();
    if (scene !== 'title') { drawWorld(); vignette(); drawOver(sceneT, newBest); }
  } else if (scene === 'victory') {
    update(rdt * ts, rdt);
    const tapL = input.touch && input.mouse.pressed && input.mouse.x < W / 2, tapR = input.touch && input.mouse.pressed && !tapL;
    if (sceneT > 1.2 && (keyHit('Enter', 'Space') || (!input.touch && input.mouse.pressed) || tapL)) { openUpgrade(); go('upgrade'); A.scene('calm'); }
    else if (sceneT > 1.2 && (keyHit('Escape') || tapR)) toTitle();
    if (scene !== 'title') { drawWorld(); vignette(); drawVictory(sceneT); }
  }
  if (scene === 'title' || scene === 'select' || scene === 'settings') { /* menus draw their own backdrop */ }
  screenFlash();
  cursor();
  endFrame();
  requestAnimationFrame(tick);
}

ctx.fillStyle = P.void;
ctx.fillRect(0, 0, W, H);
document.documentElement.classList.add('ready');
requestAnimationFrame(tick);
