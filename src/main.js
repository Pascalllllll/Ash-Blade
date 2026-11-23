import { openControls, closeControls, updateControls, drawControls } from './control-menu.js?v=200';
import { resetKeys, resetLayout } from './bindings.js?v=200';
import { fit, ctx, W, H, P, fillScreen, applyTheme, applyDisplay, hdEnd } from './gfx.js?v=200';
import { input, keyHit, endFrame, actionHit, placeButtons, releaseTouches } from './input.js?v=200';
import { A } from './audio.js?v=200';
import { OPTIONS, settings, best, loadAll, saveBest, saveSettings, resetSettings, saveRun, loadRun, clearRun, isUnlocked } from './store.js?v=200';
import { buildSprites } from './sprites.js?v=200';
import { byId, takeUpgrade, grantAllUpgrades } from './upgrades.js?v=200';
import { G, fx, newRun, startWave, update, controls, drawWorld, showMap, snapshot, buzz, evolveFx, bankStats, flash, applyPractice } from './world.js?v=200';
import {
  drawLeave, drawHUD, drawTitle, titleItems, titleMenu, runMenu, drawUpgrade, updateUpgrade, openUpgrade, upg, drawInheritance,
  pauseItems, pauseMenu, PAUSE_ROW, drawPause, drawOver, vignette, screenFlash, cursor, refreshArt,
  sel, updateSelect, drawSelect, drawLockin, LOCK_LEN, setm, settingsItems, updateSettings, drawSettings, drawSplash, drawIntro, introClock, INTRO_LEN, TITLE_MENU, titleMenuX, titleMenuY, INTRO_CUES,
} from './ui.js?v=200';
import { playStory, updateStory, drawStory, resetChoice, updateChoice, drawChoice, storyTalk, skipTalk } from './story.js?v=200';

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
const frameInterval = 1000 / 60;
let nextFrame = last;
const readSlot = practice => loadRun(id => !!byId(id), practice);
let save = readSlot(false), practice = readSlot(true);
const menuItems = () => titleItems(save, id => id, practice);
let waveCheckpoint = null, inheritance = [];

function go(s) {
  if (scene === 'play' && s !== 'play') { input.touchPlay = false; releaseTouches(); }
  if (scene === 'play' && s === 'pause') A.pauseVoice();
  else if (scene === 'pause' && s === 'play') A.resumeVoice();
  else if (scene === 'play' || s === 'title') A.stopVoice();
  scene = s; sceneT = 0;
}
function pauseRun() { pauseMenu.sel = 0; go('pause'); A.scene('calm'); A.stopLoops(); }
function resumeRun() { go('play'); A.scene(G.night ? 'night' : G.boss ? 'boss_' + G.boss.boss : 'fight'); }
function toTitle() { settingsFrom = 'title'; save = readSlot(false); practice = readSlot(true); showMap(settings.map); titleMenu.sel = 0; A.stopLoops(); A.scene('title'); go('title'); }
function startRun(char, s) {
  A.init(settings); newRun(char, s); waveCheckpoint = snapshot(); go('play'); }
function checkpoint() {
  if (!G || G.dead) return;
  waveCheckpoint = snapshot();
  G.saveError = !saveRun(waveCheckpoint);
  bankStats();
}
function recordBest(won) {
  if (G.tested) { newBest = G.newBest = false; return; }
  bankStats();
  newBest = G.score > best.score;
  G.newBest = newBest;
  if (newBest) best.score = G.score;
  best.wave = Math.max(best.wave, G.wave);
  // the longest anyone has held the endless night, in seconds
  if (G.night) best.night = Math.max(best.night || 0, Math.floor(G.night.t));
  if (won) best.won = true;
  const r = best.chars[G.char] || { score: 0, wave: 0, won: false };
  best.chars[G.char] = { score: Math.max(r.score, G.score), wave: Math.max(r.wave, G.wave), won: !!(r.won || G.won || won),
    nox: !!(r.nox || G.nox), night: Math.max(r.night || 0, Math.floor(G.night?.t || 0)) };
  saveBest();
}
function applySettings(prev) {
  if (settingsFrom === 'pause') {
    applyPractice();
    if (G.tested && waveCheckpoint) {
      waveCheckpoint.tested = true;
      if (settings.testBuffs) {
        const now=snapshot();
        for (const k of ['taken','hp','maxHp','dashMax','awakened','ult','energy']) waveCheckpoint[k]=now[k];
      }
    }
  }
  if (prev.theme !== settings.theme) { applyTheme(settings.theme); buildSprites(); refreshArt(); }
  applyDisplay(settings);
  A.settings(settings);
  if (settingsFrom === 'title' && prev.map !== settings.map) showMap(settings.map);
  saveSettings();
}

const exitMenu = {sel:0};
let leaving = false;
function armBack() {
  if (!input.touch || leaving || history.state?.ashbladeGuard) return;
  const hasPrevious = history.length > 1;
  history.pushState({ashbladeGuard:true,hasPrevious},'');
}
function leaveGame() {
  leaving=true;
  if (history.state?.hasPrevious) history.go(-2);
  else location.replace('about:blank');
}
if (input.touch) armBack();
addEventListener('touchstart',armBack,{once:true});
addEventListener('popstate',() => {
  if (leaving || !input.touch) return;
  // The back gesture consumed our entry. Restore it before continuing inside the game.
  if (!history.state?.ashbladeGuard) history.pushState({ashbladeGuard:true,hasPrevious:priorPage},'');
  if (scene==='play' && !G.dead && !G.cine) pauseRun();
  else if (scene==='pause') resumeRun();
  else if (scene==='controls') { closeControls(); go('settings'); }
  else if (scene==='upgrade' && upg.detail) { upg.detail = false; }
  else if (scene==='settings') { if(settingsFrom==='pause') go('pause'); else toTitle(); }
  else if (scene==='title') { exitMenu.sel=0; go('leave'); }
  else if (['leave','ash','select','splash','lore','intro','over'].includes(scene)) toTitle();
});
const priorPage = history.state?.ashbladeGuard ? !!history.state.hasPrevious : history.length>1;

addEventListener('blur', () => { if (scene === 'play' && !G.dead) pauseRun(); });

function tick(now) {
  // Keep the fractional time between display refreshes on 75, 90 and 144 Hz screens.
  if (now + 0.5 < nextFrame) { requestAnimationFrame(tick); return; }
  nextFrame = (now - nextFrame >= frameInterval ? now : nextFrame) + frameInterval;
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
  if (scene === 'splash') {
    if (input.any || input.mouse.pressed) { A.init(settings); A.scene('lore'); playStory('lore'); go('lore'); }
    drawSplash(sceneT, input.touch);
  } else if (scene === 'lore') {
    // the story so far, page by page: any key turns the page, Escape skips to the menu
    const r = updateStory(rdt);
    if (r === 'skip') { go('title'); A.scene('title'); drawTitle(0.8, menuItems()); }
    else if (r === 'done') { A.scene('intro'); go('intro'); drawIntro(0); }
    else drawStory();
  } else if (scene === 'intro') {
    for (const [ct, cue, bz] of INTRO_CUES) if (sceneT >= ct && sceneT - rdt < ct) { cue(); if (bz) buzz(bz); }
    // the title music starts when the opening ends or is skipped
    if (sceneT > 0.3 && (input.any || input.mouse.pressed)) { go('title'); A.scene('title'); }
    else if (sceneT >= INTRO_LEN) { go('title'); A.scene('title'); }
    else drawIntro(sceneT);
    if (scene === 'title') drawTitle(0.8, menuItems());
  } else if (scene === 'title') {
    const items = menuItems();
    const r = runMenu(titleMenu, items, titleMenuX(), titleMenuY(items.length), TITLE_MENU.w, TITLE_MENU.row);
    if (r === 'continue' && save) startRun(save.char, save);
    else if (r === 'practice' && practice) startRun(practice.char, practice);
    else if (r === 'ash') { playStory('ash'); go('ash'); A.scene('lore'); }
    else if (r === 'select') { sel.i = Math.max(0, OPTIONS.char.indexOf(settings.char)); if (!isUnlocked(settings.char)) sel.i = 0; sel.row = 0; sel.t = 0; go('select'); }
    else if (r === 'settings') { settingsFrom = 'title'; setm.tab = 0; setm.sel = 0; go('settings'); }
    drawTitle(sceneT, items);
  } else if (scene === 'ash') {
    if (updateStory(rdt)) toTitle(); else drawStory();
  } else if (scene === 'leave') {
    const items=[{label:'STAY',act:()=> 'stay'},{label:'LEAVE GAME',act:()=> 'leave'}];
    const choice=keyHit('Escape')?'stay':runMenu(exitMenu,items,90,76,140,19);
    if(choice==='stay') toTitle(); else if(choice==='leave') leaveGame();
    drawLeave(exitMenu,items);
  } else if (scene === 'controls') {
    if (updateControls()==='back') go('settings'); else drawControls();
  } else if (scene === 'select') {
    const r = updateSelect(rdt);
    if (r?.map || r?.diff) { const prev = { ...settings }; Object.assign(settings, r); applySettings(prev); }
    if (r?.back) toTitle();
    else if (r?.start) { settings.char = r.start; saveSettings(); lockId = r.start; A.init(settings); A.prepareVoice(lockId, 'entrances'); go('lockin'); }
    else drawSelect(sceneT);
    if (scene === 'play') drawWorld();
  } else if (scene === 'lockin') {
    const cues = [[0, () => A.rift()], [0.1, () => A.dash()], [0.32, () => A.riftCut()], [0.37, () => { A.boom(0.9); buzz('heavy'); }], [0.62, () => A.charAtk(lockId, true)]];
    for (const [ct, fn] of cues) if (sceneT >= ct && sceneT - rdt < ct) fn();
    // into the arena: the lock-in's white flash fades out over the first moments of the run
    if (sceneT >= LOCK_LEN || (sceneT > 0.5 && (keyHit('Enter', 'Space', 'Escape') || input.mouse.pressed))) { startRun(lockId, null); flash(P.paper, 0.55, true); checkpoint(); drawWorld(); }
    else drawLockin(sceneT, lockId);
  } else if (scene === 'settings') {
    const items = settingsItems({ hasSave: !!(save || practice) });
    const prev = { ...settings };
    const r = updateSettings(items);
    if (r === 'changed') applySettings(prev);
    else if (r === 'reset') { resetSettings(); resetKeys(); resetLayout(); placeButtons(); applySettings(prev); }
    else if (r === 'erase') { clearRun(); save = practice = null; }
    else if (r === 'controls') { openControls(); go('controls'); }
    else if (r === 'back') { if (settingsFrom === 'pause') go('pause'); else toTitle(); }
    if (settingsFrom === 'pause') { drawWorld(); vignette(); }
    drawSettings(sceneT, items, settingsFrom === 'pause');
  } else if (scene === 'play') {
    // the story is being told: the fight holds still until it has been read (Escape skips the rest of it)
    if (storyTalk() && !G.dead) { if (keyHit('Escape')) skipTalk(); update(0, rdt); }
    else if ((keyHit('Escape') || actionHit('pause') || input.thit.has('pause')) && !G.dead && !G.cine) pauseRun();
    else {
      controls();
      update(rdt * ts, rdt);
      if (G.victory && (!G.sunrise || G.sunrise.t >= 2.6) && G.deadT === 0 && G.phase === 'clear' && G.phaseT < 0) { G.victory = false; recordBest(true); playStory('ending'); go('ending'); A.scene('dawn'); }
      // Nox has fallen: the story of the endless night, then a last upgrade, then the night itself
      else if (G.nightFall && G.deadT === 0 && G.phase === 'clear' && G.phaseT < 0 && !G.talk) {
        G.nightFall = false; G.nox = true; recordBest(true);
        inheritance = grantAllUpgrades(G); A.victory(); go('inheritance');
      }
      else if (G.wantUpgrade) { G.wantUpgrade = false; openUpgrade(); go('upgrade'); }
      // falling below the pit, after the King, has its own story before the run's end
      if (G.dead && G.deadT > 3.4) { recordBest(false); clearRun(G.tested); save = null; if (G.won) { playStory('fall'); go('fall'); A.scene('lore'); } else go('over'); }
    }
    drawWorld(); vignette(); drawHUD();
  } else if (scene === 'upgrade') {
    update(0, rdt);
    const pick = updateUpgrade(rdt);
    if (pick >= 0) {
      const o = upg.opts[pick];
      takeUpgrade(G, o);
      A.select();
      startWave(G.wave + 1);
      if (o.req) evolveFx(typeof o.name === 'function' ? o.name(G.kit) : o.name, o.id);
      checkpoint();
      go('play');
    }
    drawWorld(); vignette(); drawHUD(true); drawUpgrade();
  } else if (scene === 'pause') {
    const items = pauseItems((r) => r);
    const r = (keyHit('Escape') || actionHit('pause')) ? 'resume' : runMenu(pauseMenu, items, 70, 62, 180, PAUSE_ROW);
    if (r === 'resume') resumeRun();
    else if (r === 'settings') { settingsFrom = 'pause'; setm.tab = 0; setm.sel = 0; go('settings'); }
    else if (r === 'restart') { if (waveCheckpoint) startRun(G.char, waveCheckpoint); }
    else if (r === 'exit') {
      const s = G.night ? snapshot() : waveCheckpoint;
      if (s && saveRun(s)) { if (G.night) recordBest(G.won); toTitle(); }
      else { G.saveError = true; A.deny(); }
    }
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
    if (r === 'home') { clearRun(G.tested); save = null; playStory('home'); go('home'); drawStory(); }
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
  } else if (scene === 'inheritance') {
    drawWorld(); drawInheritance(sceneT, inheritance);
    if (sceneT >= 3.4 || (sceneT > 0.85 && (input.any || input.mouse.pressed))) {
      playStory('nightfall'); go('nightfall'); A.scene('lore'); drawStory();
    }
  } else if (scene === 'nightfall') {
    if (updateStory(rdt)) { startWave(51); checkpoint(); go('play'); drawWorld(); }
    else drawStory();
  } else if (scene === 'fall') {
    // fallen in the deep: the nights they held, the sun still rising; then the run's numbers
    if (updateStory(rdt)) { go('over'); A.scene('calm'); drawWorld(); vignette(); drawOver(0, newBest); }
    else drawStory();
  }
  if (scene === 'title' || scene === 'select' || scene === 'settings') { /* menus draw their own backdrop */ }
  screenFlash();
  cursor();
  // Route the next tap to the scene this frame just displayed.
  input.touchPlay = scene === 'play' && G && !G.dead && !G.cine && !storyTalk();
  endFrame();
  hdEnd();
  requestAnimationFrame(tick);
}

fillScreen(P.void);
document.documentElement.classList.add('ready');
requestAnimationFrame(tick);
