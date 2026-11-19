import { fit, ctx, W, H, P, fillScreen, applyTheme, applyDisplay, hdEnd } from './gfx.js?v=190';
import { input, keyHit, endFrame } from './input.js?v=190';
import { A } from './audio.js?v=190';
import { OPTIONS, settings, best, loadAll, saveBest, saveSettings, resetSettings, saveRun, loadRun, clearRun, isUnlocked } from './store.js?v=190';
import { buildSprites } from './sprites.js?v=190';
import { byId } from './upgrades.js?v=190';
import { G, fx, newRun, startWave, update, controls, drawWorld, showMap, snapshot, buzz, evolveFx, bankStats, flash } from './world.js?v=190';
import {
  drawHUD, drawTitle, titleItems, titleMenu, runMenu, drawUpgrade, updateUpgrade, openUpgrade, upg,
  pauseItems, pauseMenu, PAUSE_ROW, drawPause, drawOver, vignette, screenFlash, cursor, refreshArt,
  sel, updateSelect, drawSelect, drawLockin, LOCK_LEN, setm, settingsItems, updateSettings, drawSettings, drawSplash, drawIntro, introClock, INTRO_LEN, TITLE_MENU, titleMenuX, titleMenuY, INTRO_CUES,
} from './ui.js?v=190';
import { playStory, updateStory, drawStory, resetChoice, updateChoice, drawChoice, storyTalk, skipTalk } from './story.js?v=190';

loadAll();
applyTheme(settings.theme);
applyDisplay(settings);
buildSprites();
refreshArt();
showMap(settings.map);
fit();
addEventListener('resize', fit);
addEventListener('touchstart', fit, { once: true });

let lockId = null;
let scene = 'splash', sceneT = 0, last = performance.now(), newBest = false, settingsFrom = 'title';
let save = loadRun((id) => !!byId(id));

function go(s) { scene = s; sceneT = 0; }
function toTitle() { settingsFrom = 'title'; save = loadRun((id) => !!byId(id)); showMap(settings.map); titleMenu.sel = 0; A.stopLoops(); A.scene('title'); go('title'); }
function startRun(char, s) {
  A.init(settings); newRun(char, s); go('play'); }
function checkpoint() { if (G && !G.dead) { saveRun(snapshot()); bankStats(); } }
function recordBest(won) {
  bankStats();
  newBest = G.score > best.score;
  G.newBest = newBest;
  if (newBest) best.score = G.score;
  best.wave = Math.max(best.wave, G.wave);
  // the longest anyone has held the endless night, in seconds
  if (G.night) best.night = Math.max(best.night || 0, Math.floor(G.night.t));
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
  // capped at 60 fps: 90 and 120 Hz phones would otherwise update and draw twice as often for nothing,
  // which costs battery and heat and makes them throttle
  if (now - last < 1000 / 62) { requestAnimationFrame(tick); return; }
  // the step is capped so a long stall can't jump the game ahead, but high enough (down to about 12 fps) that a
  // slow device still runs at full speed instead of in slow motion
  const rdt = Math.max(0, Math.min(0.08, (now - last) / 1000));
  // performance mode: if frames run long during a fight, effects thin out until the device keeps up again
  if (scene === 'play') { fx.ema = (fx.ema || 1 / 60) * 0.97 + rdt * 0.03; if (!fx.lowFx && fx.ema > 1 / 46) fx.lowFx = true; else if (fx.lowFx && fx.ema < 1 / 58) fx.lowFx = false; }
  last = now;
  sceneT += rdt;
  if (scene === 'intro') sceneT = introClock(sceneT, rdt);

  let ts = 1;
  fx.freezeCd = Math.max(0, (fx.freezeCd || 0) - rdt);
  if (fx.freeze > 0) { fx.freeze -= rdt; ts = 0; }
  else if (fx.slowT > 0) { fx.slowT -= rdt; ts = fx.slowF; if (fx.slowT <= 0) fx.slowF = 1; }
  fx.trauma = Math.max(0, fx.trauma - rdt * 1.5);
  fx.shakeT += rdt * 30;
  const sh = fx.trauma * fx.trauma * settings.shake;
  fx.ox = Math.round(10 * sh * Math.sin(fx.shakeT * 1.7));
  fx.oy = Math.round(7 * sh * Math.sin(fx.shakeT * 2.3 + 1));
  // the directional kick springs back fast, in real time so it settles during hit-stop
  const kd = Math.exp(-16 * rdt); fx.kx *= kd; fx.ky *= kd;
  fx.ox += Math.round(fx.kx); fx.oy += Math.round(fx.ky);
  fx.flashT -= rdt;
  if (input.any || input.mouse.pressed) A.init(settings);
  // (while the story is being told a tap reads on, so the phone controls step aside)
  input.touchPlay = scene === 'play' && G && !G.dead && !G.cine && !storyTalk();
  // phones held upright: pause and let the overlay ask for landscape
  const portrait = input.touch && innerHeight > innerWidth;
  if (portrait && scene === 'play' && !G.dead) { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); }

  if (scene === 'splash') {
    if (input.any || input.mouse.pressed) { A.init(settings); A.scene('lore'); playStory('lore'); go('lore'); }
    drawSplash(sceneT, input.touch);
  } else if (scene === 'lore') {
    // the story so far, page by page: any key turns the page, Escape skips to the menu
    const r = updateStory(rdt);
    if (r === 'skip') { go('title'); A.scene('title'); drawTitle(0.8, titleItems(save, (q) => q)); }
    else if (r === 'done') { A.scene('intro'); go('intro'); drawIntro(0); }
    else drawStory();
  } else if (scene === 'intro') {
    for (const [ct, cue, bz] of INTRO_CUES) if (sceneT >= ct && sceneT - rdt < ct) { cue(); if (bz) buzz(bz); }
    // the title music starts when the opening ends or is skipped
    if (sceneT > 0.3 && (input.any || input.mouse.pressed)) { go('title'); A.scene('title'); }
    else if (sceneT >= INTRO_LEN) { go('title'); A.scene('title'); }
    else drawIntro(sceneT);
    if (scene === 'title') drawTitle(0.8, titleItems(save, (r) => r));
  } else if (scene === 'title') {
    const items = titleItems(save, (r) => r);
    const r = runMenu(titleMenu, items, titleMenuX(), titleMenuY(items.length), TITLE_MENU.w, TITLE_MENU.row);
    if (r === 'continue' && save) startRun(save.char, save);
    else if (r === 'select') { sel.i = Math.max(0, OPTIONS.char.indexOf(settings.char)); if (!isUnlocked(settings.char)) sel.i = 0; sel.row = 0; sel.t = 0; go('select'); }
    else if (r === 'settings') { settingsFrom = 'title'; setm.tab = 0; setm.sel = 0; go('settings'); }
    drawTitle(sceneT, items);
  } else if (scene === 'select') {
    const r = updateSelect(rdt);
    if (r?.map || r?.diff) { const prev = { ...settings }; Object.assign(settings, r); applySettings(prev); }
    if (r?.back) toTitle();
    else if (r?.start) { settings.char = r.start; saveSettings(); clearRun(); lockId = r.start; A.init(settings); go('lockin'); }
    else drawSelect(sceneT);
    if (scene === 'play') drawWorld();
  } else if (scene === 'lockin') {
    const cues = [[0, () => A.rift()], [0.1, () => A.dash()], [0.32, () => A.riftCut()], [0.37, () => { A.boom(0.9); buzz('heavy'); }], [0.62, () => A.charAtk(lockId, true)]];
    for (const [ct, fn] of cues) if (sceneT >= ct && sceneT - rdt < ct) fn();
    // into the arena: the lock-in's white flash fades out over the first moments of the run
    if (sceneT >= LOCK_LEN || (sceneT > 0.5 && (keyHit('Enter', 'Space', 'Escape') || input.mouse.pressed))) { startRun(lockId, null); flash(P.paper, 0.55, true); checkpoint(); drawWorld(); }
    else drawLockin(sceneT, lockId);
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
    // the story is being told: the fight holds still until it has been read (Escape skips the rest of it)
    if (storyTalk() && !G.dead) { if (keyHit('Escape')) skipTalk(); update(0, rdt); }
    else if ((keyHit('Escape', 'KeyP') || input.thit.has('pause')) && !G.dead && !G.cine) { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); }
    else {
      controls();
      update(rdt * ts, rdt);
      if (G.victory && G.deadT === 0 && G.phase === 'clear' && G.phaseT < 0) { G.victory = false; recordBest(true); playStory('ending'); go('ending'); A.scene('dawn'); }
      // Nox has fallen: the story of the endless night, then a last upgrade, then the night itself
      else if (G.nightFall && G.deadT === 0 && G.phase === 'clear' && G.phaseT < 0 && !G.talk) { G.nightFall = false; recordBest(true); playStory('nightfall'); go('nightfall'); A.scene('lore'); }
      else if (G.wantUpgrade) { G.wantUpgrade = false; openUpgrade(); go('upgrade'); }
      // falling below the pit, after the King, has its own story before the run's end
      if (G.dead && G.deadT > 3.4) { recordBest(false); clearRun(); save = null; if (G.won) { playStory('fall'); go('fall'); A.scene('lore'); } else go('over'); }
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
      if (o.req) evolveFx(typeof o.name === 'function' ? o.name(G.kit) : o.name, o.id);
      checkpoint();
      go('play');
    }
    drawWorld(); vignette(); drawHUD(true); drawUpgrade();
  } else if (scene === 'pause') {
    const items = pauseItems((r) => r);
    const r = keyHit('Escape', 'KeyP') ? 'resume' : runMenu(pauseMenu, items, 70, 62, 180, PAUSE_ROW);
    if (r === 'resume') { go('play'); A.scene(G.night ? 'night' : G.boss ? 'boss_' + G.boss.boss : 'fight'); }
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
  } else if (scene === 'ending') {
    // the sun breaks free, his people go free, his last look, the light comes back, the fighter's last word
    if (updateStory(rdt)) { resetChoice(); go('choice'); drawChoice(); }
    else drawStory();
  } else if (scene === 'choice') {
    // the run in comic panels, then the two roads: go home (the run ends) or go deeper (endless)
    const r = updateChoice(rdt);
    if (r === 'home') { clearRun(); save = null; playStory('home'); go('home'); drawStory(); }
    else if (r === 'deeper') { G.saidLow = G.saidCombo = false; playStory('deeper'); go('deeper'); A.scene('lore'); drawStory(); }
    else drawChoice();
  } else if (scene === 'home') {
    // the climb into the morning, the fighter's own ending, the end; then the menu
    if (updateStory(rdt)) toTitle();
    else drawStory();
  } else if (scene === 'deeper') {
    // the seal breaks, the dark wakes, the fighter goes down; then the next upgrade and wave 21
    if (updateStory(rdt)) { openUpgrade(); go('upgrade'); A.scene('calm'); drawWorld(); vignette(); drawHUD(true); drawUpgrade(); }
    else drawStory();
  } else if (scene === 'nightfall') {
    // the dark comes apart, everything it swallowed climbs back, the endless night begins (after one more upgrade)
    if (updateStory(rdt)) { openUpgrade(); go('upgrade'); A.scene('calm'); drawWorld(); vignette(); drawHUD(true); drawUpgrade(); }
    else drawStory();
  } else if (scene === 'fall') {
    // fallen in the deep: the nights they held, the sun still rising; then the run's numbers
    if (updateStory(rdt)) { go('over'); A.scene('calm'); drawWorld(); vignette(); drawOver(0, newBest); }
    else drawStory();
  }
  if (scene === 'title' || scene === 'select' || scene === 'settings') { /* menus draw their own backdrop */ }
  screenFlash();
  cursor();
  endFrame();
  hdEnd();
  requestAnimationFrame(tick);
}

fillScreen(P.void);
document.documentElement.classList.add('ready');
requestAnimationFrame(tick);
