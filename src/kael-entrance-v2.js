// Kael's 24-frame entrance V2. Asset loading is independent from the gameplay atlas.
// Transparent PNG frames are 120x96 source pixels; game density is 3 source pixels per game pixel.
// No changes to other heroes, attacks, Q/E/R, or movement.
const COLS = 12, ROWS = 2, COUNT = 24;
const TILE_W = 120, TILE_H = 96, SS = 3;
const FRAME_MS = 70;
export const KAEL_ENTRANCE_V2_DURATION = COUNT * FRAME_MS / 1000;
let state = 'loading';
let frames = null;

function mkCanvas() {
  const c = document.createElement('canvas');
  c.width = TILE_W; c.height = TILE_H;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}
function wrapFrame(image, i) {
  const original = mkCanvas();
  original.getContext('2d').drawImage(
    image, (i % COLS) * TILE_W, Math.floor(i / COLS) * TILE_H,
    TILE_W, TILE_H, 0, 0, TILE_W, TILE_H
  );
  const flipped = mkCanvas(), fc = flipped.getContext('2d');
  fc.translate(TILE_W, 0);
  fc.scale(-1, 1);
  fc.drawImage(original, 0, 0);
  return { n: original, f: flipped, w: TILE_W / SS, h: TILE_H / SS, k: SS };
}

export function preloadKaelEntranceV2() {
  if (state === 'ready' || state === 'loading-requested') return;
  state = 'loading-requested';
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    if (image.naturalWidth !== COLS * TILE_W || image.naturalHeight !== ROWS * TILE_H) {
      state = 'failed';
      console.error('[ASHBLADE] Kael entrance V2: incorrect PNG dimensions');
      return;
    }
    frames = Array.from({length: COUNT}, (_, i) => wrapFrame(image, i));
    state = 'ready';
    console.info('[ASHBLADE] Kael Entrance V7 size-corrected: 24 frames, matching 54px gameplay height');
  };
  image.onerror = () => {
    state = 'failed';
    console.warn('[ASHBLADE] Kael Entrance V2 image unavailable; using existing entrance animation.');
  };
  image.src = new URL('../art/sprites/motion-v7/kael-entrance-v7-scaled-54px.png?v=171', import.meta.url).href;
}
export function kaelEntranceV2Ready() { return state === 'ready'; }
// The drawn frames play up to the landing (the smoke, the red cuts, Kael rising); from the landing on the game draws
// Kael's own sprite with his sword in hand, since the later frames have the old sword painted in.
export const KAEL_ENTRANCE_V2_LAND = 8;
export function kaelEntranceV2Frame(elapsedSeconds) {
  if (state !== 'ready') return null;
  const i = Math.min(COUNT - 1, Math.max(0, Math.floor(Math.max(0,elapsedSeconds) * 1000 / FRAME_MS)));
  return i < KAEL_ENTRANCE_V2_LAND ? frames[i] : null;
}
preloadKaelEntranceV2();
