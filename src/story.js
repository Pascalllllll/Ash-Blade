// The story. Aurel was the Sun King. When the sun grew old he feared the dark that waits for everything, so he
// swallowed it to burn forever, and became the Ashen King: the sky went black, the land turned to ash (his own people
// with it: they are the ash things that climb out of his pit), and every night his army comes up out of the pit
// below his throne. The fighters hold the pit. The goal of a run: survive 20 nights, kill the King on the twentieth
// and cut the sun out of him. Then the fighter chooses: go home (the run ends with their own ending), or go deeper:
// the King's fire was what kept his pit sealed, and under it waits the dark he was so afraid of.
//
//   say()     the dialog box: the King taunts the fighter and tells them who he was, a voice in the ash begs for help,
//             each fighter answers in their own voice; past wave 20 the dark itself talks. A line types out letter by
//             letter beside the speaker's face.
//   stories   picture books, a page at a time: a small pixel picture with its caption typing out under it
//               lore     the intro: the golden sun, the fear, the swallowing, the ash, the fighters at the pit's edge
//               ending   the King falls: the sun breaks out, his people go free, his last look, the light, a last word
//               home     going home: the climb into the morning, the fighter's own ending, the end
//               deeper   going deeper: the seal breaks, the dark opens its eyes, the fighter goes down
//               fall     falling in the deep: the fall, the nights they held it back, the sun still rising above
//   choice    the page after the ending: the run in comic panels, then GO HOME or GO DEEPER
import { W, H, fillScreen, ctx, P, BAYER, makeCanvas, rect, px, line, disc, ring, glow, text, textO, textW, drawSprite } from './gfx.js?v=190';
import { SPR } from './sprites.js?v=190';
import { input, keyHit } from './input.js?v=190';
import { A } from './audio.js?v=190';
import { G } from './world.js?v=190';
import { CHARS } from './chars.js?v=190';
import { drawFighter } from './title-scene.js?v=190';
import { drawWeaponAt } from './hero-sprites.js?v=190';

export const KING = 'KING', VOID = 'VOID', ASH = 'ASH', NOX = 'NOX';
const TAU = Math.PI * 2;
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const ease = (k) => 1 - (1 - clamp01(k)) ** 3;
// the same "random" every time, so a picture doesn't change between frames
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hero = () => CHARS[G?.char]?.hero || 'THE FIGHTER';
const heroCol = () => CHARS[G?.char]?.color?.() || P.paper;
const evo = () => G?.evo === true;
// the nights fought below the pit (the one they fell on counts)
const nights = () => Math.max(1, (G?.wave || 21) - 20);
// how long they held the endless night, in words
const held = () => { const m = Math.floor((G?.night?.t || 0) / 60), sec = Math.floor((G?.night?.t || 0) % 60); return m ? m + (m === 1 ? ' MINUTE' : ' MINUTES') + (sec ? ' AND ' + sec + ' SECONDS' : '') : sec + ' SECONDS'; };

// ---------- the lines ----------
// the run, as the King sees it, and as the ash and the dark see it
export const TALK = {
  start: [[KING, 'ANOTHER MOTH FLIES INTO MY PIT. BURN SLOWLY, LITTLE ONE.']],
  // between his bosses he tells you who he was, a piece at a time; a voice in the ash tells you the rest
  w3: [[KING, 'THEY CALLED ME THE SUN KING ONCE. MY PEOPLE SANG MY NAME AT DAWN.']],
  w6: [[ASH, 'PLEASE... WE WERE HIS PEOPLE ONCE. WE DID NOT CHOOSE THIS.']],
  w8: [[KING, 'THE SUN WAS DYING, LITTLE ONE. I SAVED IT THE ONLY WAY I COULD. INSIDE ME.']],
  w11: [[ASH, 'HE WAS KIND, ONCE. HE WAS JUST SO AFRAID OF THE DARK.']],
  w13: [[KING, 'MY PEOPLE ARE STILL HERE, YOU KNOW. YOU HAVE BEEN CUTTING THEM DOWN ALL NIGHT.']],
  w16: [[ASH, 'WHEN YOU REACH HIM, SET THE SUN FREE. AND US WITH IT.']],
  w18: [[KING, 'TWO MORE NIGHTS. THEN THE LAST FIRE COMES FOR YOU HIMSELF.']],
  // when it goes badly for you, or too well (the King's words, or the dark's below the pit)
  lowHp: [[KING, 'I CAN SMELL THE ASH ON YOU ALREADY.']],
  lowHpDeep: [[VOID, 'YES. LET GO. THE DARK IS SOFT.']],
  combo: [[KING, 'YOU DANCE WELL. THEY ALL DANCE WELL, AT FIRST.']],
  comboDeep: [[VOID, 'SUCH A BRIGHT LITTLE FIRE. YOU WILL KEEP ME WARM FOR A WHILE.']],
  warden: [[KING, 'MY WARDEN HAS KEPT THIS PIT FOR A HUNDRED YEARS. HE WILL KEEP YOUR BONES.']],
  wardenDead: [[KING, 'STUBBORN. GOOD. THE STUBBORN ONES BURN THE LONGEST.']],
  brood: [[KING, 'SHE NESTS BELOW MY THRONE, AND HER CHILDREN ARE HUNGRY.']],
  broodDead: [[KING, 'YOU KILLED MY PET. I HAVE AN ARMY OF THEM.']],
  colossus: [[KING, 'MY OLD WAR MACHINE NEVER LEARNED HOW TO STOP. NEITHER DID I.']],
  colossusDead: [[KING, 'ENOUGH. COME DOWN TO MY THRONE. I WILL MEET YOU MYSELF.']],
  kingBurns: [[KING, 'YOU THINK YOU CAN PUT OUT THE SUN?']],
  kingUnbound: [[KING, 'I WILL NOT GO BACK INTO THE DARK!']],
  kingDead: [[KING, 'THE DARK... IT IS SO COLD...']],
  // below the pit, the dark he was afraid of
  deeper: [[VOID, 'A LITTLE LIGHT, FALLING INTO ME. HOW BRAVE. HOW BRIEF.']],
  w23: [[VOID, 'EVERY FIRE GOES OUT, LITTLE LIGHT. I AM WHERE THEY ALL GO.']],
  w27: [[VOID, 'YOUR KING SWALLOWED A SUN TO HIDE FROM ME. YOU CAME TO ME ON PURPOSE.']],
  w33: [[VOID, 'I WAS HERE BEFORE THE FIRST DAWN. I WILL BE HERE AFTER THE LAST.']],
  w37: [[VOID, 'YOU ARE TIRED. I CAN FEEL IT. REST. ONLY REST.']],
  w43: [[VOID, 'ABOVE YOU THEY SLEEP SAFE. THEY DO NOT EVEN KNOW YOUR NAME.']],
  w47: [[VOID, 'SO STUBBORN. SO BRIGHT. I THINK I WILL KEEP YOU.']],
  wyrm: [[VOID, 'SOMETHING SWIMS UP THROUGH THE STONE.']],
  herald: [[VOID, 'THE STORM HAS A VOICE NOW. IT KNOWS YOUR NAME.']],
  mirror: [[VOID, 'IT WATCHED YOU ALL THE WAY DOWN. IT LEARNED.']],
  eclipse: [[VOID, 'THE SUN YOU FREED HAS AN EYE. IT IS LOOKING AT YOU.']],
  clock: [[VOID, 'TIME ITSELF WANTS YOU GONE.']],
  // wave 50: the dark gives itself a shape and a name
  noxNight: [[NOX, 'NIGHT FALLS. IT ALWAYS DOES.']],
  noxLast: [[NOX, 'THERE IS NO DAWN DOWN HERE. THERE NEVER WAS.']],
  noxDead: [[NOX, 'YOU CANNOT KILL THE NIGHT, LITTLE LIGHT...'], [NOX, '...BUT YOU CAN STAND IN IT. LET US SEE HOW LONG.']],
  // the endless night after it
  night1: [[NOX, 'EVERYTHING I EVER SWALLOWED, I CAN GIVE BACK.']],
  night5: [[NOX, 'TWO AT A TIME NOW. YOU ARE SO VERY TIRED.']],
  lowHpNight: [[NOX, 'YES. LET GO. THE NIGHT IS SOFT.']],
  comboNight: [[NOX, 'BURN BRIGHT, LITTLE LIGHT. IT ONLY MAKES THE DARK LONGER.']],
};
// each fighter answers the King's first taunt
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
// and answers what the King, the ash and the dark tell them between the bosses
const ANSWER = {
  w3: {
    BLADE: 'I KNOW. MY GRANDMOTHER STILL SANG IT. SHE CRIED EVERY TIME.',
    GUNNER: 'NOW THEY JUST PUT YOUR FACE ON WANTED POSTERS.',
    WIZARD: 'THE STARS REMEMBER THAT SONG TOO. IT ENDS BADLY.',
    NINJA: 'MY CLAN SANG ABOUT YOU TOO. RIGHT BEFORE YOU BURNED IT.',
    MECHANIC: "SINGING'S NICE. A WORKING SUN WAS NICER.",
    TANK: 'I SANG IT WITH THEM, MY KING. EVERY MORNING, ON THE WALL.',
    ROBOT: 'SONG ARCHIVED. NO EFFECT ON MISSION.',
    DEV: 'THAT SONG IS A PLACEHOLDER. I NEVER FINISHED IT.',
  },
  w8: {
    BLADE: "YOU DIDN'T SAVE IT. YOU LOCKED IT IN A CAGE MADE OF YOU.",
    GUNNER: 'FUNNY. FROM DOWN HERE IT LOOKS A LOT LIKE STEALING.',
    WIZARD: 'EVERY STAR DIES, AUREL. THAT IS HOW NEW ONES ARE BORN.',
    NINJA: "YOU ATE THE SUN. THAT'S NOT SAVING. THAT'S SNACKING.",
    MECHANIC: "YOU DON'T FIX A DYING ENGINE BY SWALLOWING IT.",
    TANK: 'I WAS THERE THAT NIGHT. YOU SCREAMED FOR A WEEK.',
    ROBOT: 'CLAIM REJECTED. SUN STATUS: CAPTIVE.',
    DEV: "SAVED IT? I LITERALLY WROTE 'EVIL KING' IN YOUR CONFIG.",
  },
  w13: {
    BLADE: "THEN I'LL FREE THEM. THE SAME WAY I FREE THE SUN.",
    GUNNER: '...NOBODY TOLD ME THAT PART OF THE JOB.',
    WIZARD: 'THEIR SOULS ARE STILL IN THE ASH. I CAN HEAR THEM.',
    NINJA: "...THAT'S NOT FUNNY. THAT'S NOT FUNNY AT ALL.",
    MECHANIC: 'YOU TURNED PEOPLE INTO SPARE PARTS. I NEVER WILL.',
    TANK: 'I KNOW. I SEE THEIR FACES IN THE ASH. I KNEW THEIR NAMES.',
    ROBOT: 'NEW DATA. MISSION UPDATED: FREE THEM TOO.',
    DEV: "WAIT. THAT WASN'T IN MY DESIGN DOC. WHO WROTE THIS?",
  },
  w16: {
    BLADE: 'I PROMISE. EVERY ONE OF YOU.',
    GUNNER: 'NO CHARGE. JUST THIS ONCE.',
    WIZARD: 'YOU WILL SEE THE STARS AGAIN. I SWEAR IT.',
    NINJA: "OK. OK. I'VE GOT YOU. ALL OF YOU.",
    MECHANIC: "HOLD ON TIGHT. I'M FIXING THIS.",
    TANK: 'I FAILED YOU ONCE. NEVER AGAIN.',
    ROBOT: 'REQUEST LOGGED. PRIORITY: HIGHEST.',
    DEV: "NOTED. FILED UNDER 'MUST SHIP'.",
  },
  w18: {
    BLADE: "GOOD. I'M TIRED OF YOUR SOLDIERS. I CAME FOR YOU.",
    GUNNER: 'TWO NIGHTS. I CHARGE BY THE NIGHT, BY THE WAY.',
    WIZARD: 'TWO NIGHTS. THE STARS HAVE WAITED A HUNDRED YEARS.',
    NINJA: 'TWO MORE NIGHTS? I HAVE A QUIZ ON THURSDAY.',
    MECHANIC: 'TWO NIGHTS. PLENTY OF TIME TO BUILD SOMETHING MEAN.',
    TANK: 'THEN I WILL SEE YOU AT YOUR THRONE. LIKE OLD TIMES.',
    ROBOT: 'COUNTDOWN ACKNOWLEDGED. T MINUS TWO.',
    DEV: 'TWO WAVES TO THE FINAL BOSS. TIME TO STOP ADDING FEATURES.',
  },
  w43: {
    BLADE: "THEY DON'T NEED TO. THEY HAVE THE SUN.",
    GUNNER: 'GOOD. I HATE SIGNING AUTOGRAPHS.',
    WIZARD: 'THEN THEIR SLEEP IS MY SPELL. IT WILL HOLD.',
    NINJA: "THAT'S FINE. I DIDN'T DO IT TO BE FAMOUS.",
    MECHANIC: "NOBODY KNOWS WHO KEEPS THE LIGHTS ON. THAT'S THE JOB.",
    TANK: 'A GUARD IS NOT REMEMBERED. A GUARD IS NEEDED.',
    ROBOT: 'RECOGNITION NOT REQUIRED.',
    DEV: "THEY'LL SEE IT IN THE CREDITS.",
  },
};
// what they tell the dark when they first land in it
const DEEP_REPLY = {
  BLADE: 'I CARRIED A SUN DOWN HERE ONCE. I CAN CARRY ONE MORE.',
  GUNNER: "NOBODY POSTED A BOUNTY ON YOU. I'LL DO THIS ONE FOR FREE.",
  WIZARD: 'EVERY STAR WAS BORN IN THE DARK. I KNOW YOUR KIND.',
  NINJA: 'SCHOOL CAN WAIT. AGAIN.',
  MECHANIC: 'BIG, DARK AND OLD. SO, BASICALLY, BAD WIRING.',
  TANK: 'MY KING WAS AFRAID OF YOU. I AM NOT.',
  ROBOT: 'NEW ORDER ACCEPTED: HOLD THE DARK.',
  DEV: "I DIDN'T WRITE YOU. WHO WROTE YOU?",
};
// at wave 50 the dark rises out of the floor as Nox and names itself; each fighter answers it
const NOX_MEET = {
  BLADE: "I CARRIED AUREL'S SUN HOME. I CAN CARRY THIS LIGHT TOO.",
  GUNNER: 'BIGGEST BOUNTY IN THE WORLD, AND NOBODY EVEN POSTED IT.',
  WIZARD: 'EVERY STAR I KNOW WAS BORN OUT OF YOU. TONIGHT ONE OF THEM BITES BACK.',
  NINJA: 'OKAY. THE REAL FINAL BOSS. NO HOMEWORK IN THE WORLD IS WORTH THIS.',
  MECHANIC: "BIG, OLD AND DARK. YOU'RE STILL JUST A MACHINE WITH NO OFF SWITCH. I'LL FIND IT.",
  TANK: 'MY KING RAN FROM YOU FOR A HUNDRED YEARS. I WILL NOT RUN.',
  ROBOT: 'TARGET ACQUIRED. FINAL ORDER: HOLD THE LIGHT.',
  DEV: "I DIDN'T WRITE YOU. BUT I CAN STILL DEBUG YOU.",
};
export const noxLines = (id) => [
  [VOID, 'SO. YOU CAME ALL THE WAY DOWN. INTO ME.'],
  [NOX, 'CALL ME NOX. I AM THE NIGHT AFTER THE LAST NIGHT, AND EVERY FIRE ENDS IN ME.'],
  [id, NOX_MEET[id] || NOX_MEET.BLADE],
  [NOX, 'YOUR KING WAS RIGHT TO FEAR ME. COME. I WILL SHOW YOU WHY.'],
];
// the talks that are part of the story: the fight stops for them and they're read at the bottom of the screen.
// Everything else (a boss arriving, taunts, quips) is small talk at the top that doesn't stop anything.
const STORY_TALK = new Set(['w3', 'w6', 'w8', 'w11', 'w13', 'w16', 'w18', 'w23', 'w27', 'w33', 'w37', 'w43', 'w47']);
// what's said as a wave starts (boss: that wave's boss, or null): { lines, lore } or null
export function waveTalk(n, id, boss) {
  if (n === 1) return { lines: startLines(id), lore: true };
  if (n === 21) return { lines: [...TALK.deeper, [id, DEEP_REPLY[id] || DEEP_REPLY.BLADE]], lore: true };
  if (boss) return boss === 'king' || boss === 'nox' || !TALK[boss] ? null : { lines: TALK[boss], lore: false };
  const k = 'w' + n, a = ANSWER[k]?.[id];
  return TALK[k] ? { lines: a ? [...TALK[k], [id, a]] : TALK[k], lore: STORY_TALK.has(k) } : null;
}
// each fighter has a word of their own after each of the King's first three bosses falls
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
// the King's parting words over your body (and, once he's dead, the dark's)
const LAST_WORDS = ['ASH TO ASH.', 'ANOTHER LIGHT GOES OUT.', 'THE SUN STAYS MINE.', 'KNEEL. THEY ALL KNEEL IN THE END.', 'SLEEP NOW. THE PIT WILL KEEP YOU.'];
const NOX_WORDS = ['THE NIGHT KEEPS WHAT FALLS INTO IT.', 'EVERY FIRE ENDS IN ME. YOURS DID TOO.', 'REST, LITTLE LIGHT. IT IS ALWAYS NIGHT HERE.'];
export const lastWords = () => (G?.night ? 'NOX: ' + NOX_WORDS[Math.floor(Math.random() * NOX_WORDS.length)] : G?.won ? '??? : THE PIT KEEPS WHAT FALLS INTO IT.' : 'AUREL: ' + LAST_WORDS[Math.floor(Math.random() * LAST_WORDS.length)]);
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

// ---------- the dialog ----------
// Two kinds. Small talk (a boss arriving, taunts, quips) is a small box at the top that comes and goes on its own while
// the fight carries on. The story (the King telling who he was, the voice in the ash, the dark below the pit) is a box
// at the bottom, and the fight stops for it: nothing moves until it has been read. Enter, Space, a click or a tap
// shows the rest of a line, then the next one; Escape skips the rest (main.js).
const CPS = 42;                     // letters a second
const nameOf = (who) => (who === KING ? 'AUREL, THE ASHEN KING' : who === VOID ? '???' : who === NOX ? 'NOX, THE LAST NIGHT' : who === ASH ? 'A VOICE IN THE ASH' : CHARS[who]?.hero || who);
const colOf = (who) => (who === KING ? P.ember : who === VOID || who === NOX ? '#b48cff' : who === ASH ? '#d8c8b8' : who === 'DEV' ? '#39ff6a' : CHARS[who]?.color?.() || P.paper);
// lines: [[who, text], ...]. lore: part of the story (the bottom box, the fight waits for it). done: called after.
export function say(lines, o = {}) {
  if (!G || G.dead || !lines?.length) return;
  // small talk never cuts into the story
  if (G.talk?.lore && !o.lore) return;
  G.talk = { q: lines.slice(), i: 0, t: 0, lore: !!o.lore, done: o.done, wrap: null, in: 0 };
}
export const talking = () => !!G?.talk;
// the story is being told: the fight is paused for it
export const storyTalk = () => !!G?.talk?.lore;
export function skipTalk() { const k = G?.talk; if (!k) return; G.talk = null; k.done?.(); }
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
const SMALL_W = 124, STORY_W = 232;
// real time, so hit-stop and slow motion don't slow a voice down
export function updateTalk(dt) {
  const k = G?.talk;
  if (!k) return;
  k.in = Math.min(1, k.in + dt * 6);
  const [who, s] = k.q[k.i];
  const before = Math.min(s.length, Math.floor(k.t * CPS));
  k.t += dt;
  const now = Math.min(s.length, Math.floor(k.t * CPS));
  if (now > before && s[now - 1] !== ' ' && now % 2) A.voice(who === KING || who === VOID || who === NOX);
  const typed = k.t * CPS >= s.length, stay = Math.max(1.6, s.length / 22);
  // the story waits for the player; small talk moves on by itself
  const press = k.lore && k.in >= 1 && k.t > 0.12 && (keyHit('Enter', 'Space', 'KeyJ') || input.mouse.pressed);
  if (press && !typed) k.t = s.length / CPS;
  else if ((!k.lore && typed && k.t - s.length / CPS > stay) || (press && typed)) {
    if (press) A.ui();
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
    if (s) { glow(x + 12, y + 14, P.ember, 14, 0.3); ctx.drawImage(s.n, 12, 0, 36, 36, x, y, 24, 24); }
  } else if (who === VOID) {
    // nothing to see but two eyes in the dark, blinking now and then
    const open = (G.time % 3.1) > 0.12;
    for (const ex of [8, 15]) { glow(x + ex, y + 12, '#b48cff', 5, 0.5); if (open) rect(x + ex - 1, y + 11, 3, 2, '#e8dcff'); else rect(x + ex - 1, y + 12, 3, 1, '#b48cff'); }
  } else if (who === NOX) {
    // Nox's hood, with its crown of dead stars and its eyes
    const s = SPR.nox?.[Math.floor(G.time * 2) % 2];
    if (s) { glow(x + 12, y + 12, '#b48cff', 14, 0.3); ctx.drawImage(s.n, 34, 8, 39, 39, x - 1, y - 1, 26, 26); }
  } else if (who === ASH) {
    // a face in the ash: pale, hollow-eyed, never quite still, with ash blowing off it
    const f = Math.sin(G.time * 3);
    ctx.globalAlpha = 0.65 + 0.2 * f;
    ell(x + 12, y + 12, 7, 9, '#7a6a64'); ell(x + 12, y + 11, 6, 8, '#a8988e');
    rect(x + 8, y + 9, 3, 3, '#140c10'); rect(x + 13, y + 9, 3, 3, '#140c10'); rect(x + 10, y + 16, 4, 2 + (f > 0.6 ? 1 : 0), '#140c10');
    ctx.globalAlpha = 1;
    for (let i = 0; i < 7; i++) px(x + 3 + ((i * 7 + Math.floor(G.time * 9)) % 18), y + 22 - ((i * 5 + Math.floor(G.time * 13)) % 22), i % 2 ? '#7a6a64' : '#c8b8aa');
  } else {
    // a fighter shows the skin they're wearing
    const set = (G.char === who && G.evo === true ? SPR.evo : SPR.chars)[who], fr = set?.body?.idles?.[Math.floor(G.time * 7) % 16];
    if (fr) { const [ex, ey] = set.rig.eye; ctx.drawImage(fr.n, Math.round(ex - 18), Math.round(ey - 22), 36, 36, x, y, 24, 24); }
  }
  ctx.restore();
  rect(x - 1, y - 1, 26, 1, P.ink0); rect(x - 1, y + 24, 26, 1, P.ink0); rect(x - 1, y, 1, 24, P.ink0); rect(x + 24, y, 1, 24, P.ink0);
}
export function drawTalk() {
  const k = G?.talk;
  if (!k) return;
  if (k.lore) storyBox(k); else smallBox(k);
}
// small talk: a narrow box at the top middle, just the speaker's name and the line
function smallBox(k) {
  const [who, s] = k.q[k.i], col = colOf(who), name = nameOf(who);
  k.wrap ??= wrap(s, SMALL_W);
  const lines = k.wrap, bw = Math.max(textW(name), ...lines.map((l) => textW(l))) + 9, bh = 10 + lines.length * 7;
  const x = Math.round(W / 2 - bw / 2), y = 2 - Math.round((1 - ease(k.in)) * (bh + 4));
  rect(x - 1, y - 1, bw + 2, bh + 2, P.ink0); rect(x, y, bw, bh, '#0c0911'); rect(x, y, 2, bh, col);
  text(name, x + 5, y + 2, col, 1);
  let n = Math.min(s.length, Math.floor(k.t * CPS));
  lines.forEach((l, i) => { if (n > 0) text(l.slice(0, n), x + 5, y + 9 + i * 7, P.paper, 1); n -= l.length + 1; });
}
// the story: a wide box along the bottom with the speaker's face; the screen dims a little while the fight waits
function storyBox(k) {
  const [who, s] = k.q[k.i], col = colOf(who);
  k.wrap ??= wrap(s, STORY_W);
  const e = ease(k.in), lines = k.wrap, bh = Math.max(38, 17 + lines.length * 8), bx = 16, bw = W - 32, by = H - bh - 6 + Math.round((1 - e) * (bh + 12));
  fillScreen('#05030a', 0.35 * e);
  rect(bx - 2, by - 2, bw + 4, bh + 4, P.ink0); rect(bx - 1, by - 1, bw + 2, bh + 2, col); rect(bx, by, bw, bh, '#0c0911');
  face(who, bx + 6, by + 7);
  textO(nameOf(who), bx + 38, by + 5, col, 1);
  let n = Math.min(s.length, Math.floor(k.t * CPS));
  lines.forEach((l, i) => { if (n > 0) text(l.slice(0, n), bx + 38, by + 15 + i * 8, P.paper, 1); n -= l.length + 1; });
  // whose turn it is in the talk, and what to press
  if (k.q.length > 1) text((k.i + 1) + '/' + k.q.length, bx + bw - 5, by + 5, P.stone2, 1, 'r');
  if (k.t * CPS >= s.length) {
    const blink = Math.floor(G.time * 3) % 2;
    textO((input.touch ? 'TAP' : 'ENTER') + (blink ? ' >' : '  '), bx + bw - 5, by + bh - 9, blink ? col : P.dust, 1, 'r');
  }
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
// a filled ellipse in whole pixels, a row at a time
function ell(cx, cy, rx, ry, col) {
  if (rx <= 0 || ry <= 0) return;
  for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (w > 0) rect(Math.round(cx) - w, Math.round(cy) + y, w * 2, 1, col);
  }
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
// the black sun: a dark disc burning at the rim
function blackSun(x, y, r, t) {
  glow(x, y, P.blood, r * 3, 0.3);
  for (let i = 0; i < 16; i++) { const a = t * 0.2 + (i * Math.PI) / 8, L = (i % 2 ? r * 0.4 : r * 0.8) + Math.sin(t * 3 + i) * 1.5; line(x + Math.cos(a) * (r + 1), y + Math.sin(a) * (r + 1), x + Math.cos(a) * (r + 1 + L), y + Math.sin(a) * (r + 1 + L), i % 2 ? P.ember : P.ember3); }
  ring(x, y, r, 1, P.ember2); disc(x, y, r - 1, '#030104');
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
// a sprite standing with its feet at x, base, burning away into motes from the feet up (d: 0 whole, 1 gone)
function burnAway(s, x, base, sc, col, rim, d, t, mote, seed = 0) {
  if (!s) return;
  const h = s.h * sc, top = base - h, cut = top + h * (1 - d);
  if (d < 1) { ctx.save(); ctx.beginPath(); ctx.rect(x - 4, top - 4, s.w * sc + 8, cut - top + 4); ctx.clip(); silhouette(s, x, top, sc, col, rim); ctx.restore(); }
  if (d > 0) for (let i = 0; i < 10; i++) {
    const u = (t * 0.7 + hash(seed + i)) % 1, mx = x + hash(seed + i * 3) * s.w * sc + Math.sin(t * 3 + i) * 2, my = Math.min(cut, base) - u * 34;
    ctx.globalAlpha = (1 - u) * (d < 1 ? 1 : Math.max(0, 1.6 - d)); px(mx, my, i % 3 ? mote : P.paper); ctx.globalAlpha = 1;
  }
}
// birds far off: little v shapes drifting
function birds(x0, y0, t, n, col = '#2a1a20') {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((t * (8 + i * 2) + i * 37) % 120), y = y0 + Math.sin(t * 2 + i * 1.7) * 3 + i * 5, f = Math.floor(t * 6 + i) % 2;
    px(x - 1, y - f, col); px(x + 1, y - f, col); px(x, y, col);
  }
}
// two eyes in the dark, open k (0..1), r wide
function eyes(cx, cy, k, r, t, gap = 2.2) {
  if (k <= 0) return;
  const blink = (t % 4.3) < 0.14 ? 0.15 : 1;
  for (const s of [-1, 1]) {
    const x = cx + s * r * gap * 0.5, ry = Math.max(1, r * 0.42 * k * blink);
    glow(x, cy, '#b48cff', r * 1.6, 0.45 * k);
    ell(x, cy, r, ry, '#6a3aa8'); ell(x, cy, r - 1, Math.max(1, ry - 1), '#e8dcff');
    rect(Math.round(x) - 1, Math.round(cy - ry + 1), 2, Math.max(1, Math.round(ry * 2 - 1)), '#08040e');
  }
}
// the weapon a fighter carries, planted point down at x, y (the grip), sc times its size
function planted(x, y, sc, a = Math.PI / 2) {
  const set = SPR.chars[G?.char], wn = set?.rig?.weapon;
  if (!wn) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); drawWeaponAt(ctx, wn, evo(), 0, 0, a, false, 1); ctx.restore();
}
const KING_SPR = () => SPR.king?.[0];

// ---------- the pages ----------
const PX = 50, PY = 14, PW = 220, PH = 108;
// the intro
const LORE = [
  {
    cue: () => A.loreCue(0),
    cap: ['KING AUREL RULED BENEATH A GOLDEN SUN.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffe9a8', '#ffc76a', '#ff9a4a', '#e0623a']);
      sun(PX + PW / 2, PY + 34, 15, t);
      castle(PX + 50, PY + PH - 6, '#4a1c2a', '#ffe08a', t);
      rect(PX, PY + PH - 4, PW, 4, '#3a1420');
    },
  },
  {
    cue: () => A.loreCue(1),
    cap: ['BUT THE SUN GREW OLD AND DIM,', 'AND AUREL FEARED THE DARK.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#2a1838', '#5a2a4a', '#9a3a4a']);
      // the old sun, small and failing, its light flickering
      const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.3)) * (Math.sin(t * 17) > 0.6 ? 0.3 : 1);
      sun(PX + 150, PY + 30, 9, t * 0.3, { core: '#e0a060', rim: '#a0502a', ray: '#7a3a2a', glow: '#c06a3a', ga: 0.3 * f });
      line(PX + 146, PY + 26, PX + 151, PY + 31, '#6a2a1a'); line(PX + 153, PY + 27, PX + 150, PY + 33, '#6a2a1a');
      // the King, a black shape looking up at it
      silhouette(KING_SPR(), PX + 40, PY + PH - 54, 1, '#140a12', '#c06a3a', false, 0.35);
      rect(PX, PY + PH - 6, PW, 6, '#140a12');
    },
  },
  {
    cue: () => A.loreCue(2),
    cap: ['SO HE SWALLOWED IT WHOLE,', 'TO BURN FOREVER.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#1a0a12', '#3a0e18', '#6a1420']);
      const k = ease(t / 2.4), cx = PX + PW / 2, chestY = PY + PH - 34;
      // the sun is pulled down into him; its light streams after it
      const sy = PY + 18 + (chestY - PY - 18) * k, r = Math.max(2, 13 * (1 - k * 0.8));
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t * 2, L = 30 * (1 - k); ctx.globalAlpha = 0.5; line(cx + Math.cos(a) * (r + L), sy + Math.sin(a) * (r + L), cx + Math.cos(a) * r, sy + Math.sin(a) * r, P.ember3); ctx.globalAlpha = 1; }
      silhouette(KING_SPR(), cx - 30, PY + PH - 80, 1, '#0e070c', k > 0.95 ? P.ember : '#8a2a1a', false, 0.25 + 0.3 * k);
      if (k < 1) sun(cx, sy, r, t * 2);
      if (k > 0.9) { glow(cx, chestY, P.ember, 26, 0.6); glow(cx - 2, PY + PH - 66, P.blood, 6, 0.8); }
      rect(PX, PY + PH - 4, PW, 4, '#0e070c');
    },
  },
  {
    cue: () => A.loreCue(3),
    cap: ['THE SKY WENT BLACK. THE LAND TURNED TO ASH.', 'EVERY NIGHT, HIS ARMY CLIMBS OUT OF THE PIT.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#05020a', '#120612', '#2a0a14']);
      blackSun(PX + PW / 2, PY + 30, 14, t);
      // ash drifting down
      for (let i = 0; i < 40; i++) { const x = PX + ((i * 53 + t * 9 * (1 + (i % 3))) % PW), y = PY + ((i * 37 + t * 14 * (1 + (i % 2))) % PH); px(x, y, i % 4 ? '#5a5058' : '#8a7a80'); }
      // the pit, and what climbs out of it
      const base = PY + PH - 14;
      rect(PX, base, PW, 14, '#05020a');
      for (let x = 0; x < PW; x += 6) rect(PX + x, base - ((x * 7) % 5), 6, 4, '#05020a');
      const mons = [[SPR.brute?.[0], 40, 0.9], [SPR.husk?.[Math.floor(t * 4) % 2], 82, 1.4], [SPR.shade?.[0], 128, 0.6], [SPR.spitter?.[0], 168, 1.1]];
      for (const [s, dx, sp] of mons) {
        if (!s) continue;
        const rise = Math.min(1, (t * sp) / 2.5), x = PX + dx, y = base - s.h * rise + 4;
        ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, base - PY + 2); ctx.clip();
        silhouette(s, x, y, 1, '#0c0610', P.blood);
        ctx.restore();
        if (rise > 0.5) glow(x + s.w * 0.5, y + s.h * 0.3, P.blood, 4, 0.7);
      }
      for (let i = 0; i < 5; i++) { const x = PX + 20 + i * 44, a = 0.4 + 0.4 * Math.sin(t * 3 + i * 2); ctx.globalAlpha = a; line(x, base + 3, x + 6, base + 10, P.ember); ctx.globalAlpha = 1; }
    },
  },
  {
    // the goal, told as a picture: the fighters at the pit's edge, twenty torches lighting one by one down its
    // spiral to the throne, and the sun burning inside the King at the bottom
    len: 7,
    cue: () => A.storyCue('gather'),
    cap: ['THE LAST FIGHTERS CAME TO THE EDGE OF HIS PIT.', 'TWENTY NIGHTS DOWN TO HIS THRONE. THEN, CUT THE SUN FREE.'],
    update(t0, t1) { for (const k of [4, 9, 14, 19]) { const at = TORCH_AT(k); if (t0 < at && t1 >= at) A.storyCue('torch' + (k + 1)); } },
    draw(t) {
      sky(PX, PY, PW, PH, ['#05020a', '#100512', '#220814']);
      blackSun(PX + 30, PY + 18, 8, t);
      // the ash plain the pit is cut into, ruins far off along its edge
      const cx = PX + 134, RINGS = ['#2e1824', '#26131e', '#1e0f18', '#170b13', '#11080e', '#0b0509', '#060305'];
      const ringY = (r) => PY + 46 + r * 7.2, ringRx = (r) => 84 - r * 11.5, ringRy = (r) => 21 - r * 2.6;
      const plain = ringY(0) - ringRy(0) + 6;
      for (let x = 0; x < PW; x += 5) { const h = 3 + hash(x + 7) * 9; rect(PX + x, plain - h, 3, h, '#12080e'); }
      rect(PX, plain, PW, PY + PH - plain, '#1a0c14');
      for (let x = 0; x < PW; x += 2) px(PX + x, plain, hash(x) < 0.5 ? '#2a1620' : '#1a0c14');
      // the pit: terraces going down and darker to the throne, each with a lit lip
      RINGS.forEach((c, r) => {
        const y = ringY(r), rx = ringRx(r), ry = ringRy(r);
        ell(cx, y, rx, ry, c);
        for (let i = -20; i <= 20; i++) { const a = Math.PI + ((i + 20) / 40) * Math.PI; px(cx + Math.cos(a) * rx, y + Math.sin(a) * ry, r ? '#3a1c2a' : '#4a2232'); }
      });
      // twenty torches down the spiral; each lights in turn, the last one at the throne
      for (let k = 0; k < 20; k++) {
        const r = (k / 19) * 6, a = k * 1.32 + 0.6, x = cx + Math.cos(a) * ringRx(r) * 0.86, y = ringY(r) + Math.sin(a) * ringRy(r) * 0.8, lit = t >= TORCH_AT(k);
        const front = Math.sin(a) > -0.25;
        if (!lit) { px(x, y, front ? '#3a2830' : '#22161c'); continue; }
        const f = Math.floor(t * 10 + k) % 2;
        ctx.globalAlpha = front ? 1 : 0.55;
        rect(x, y - 1 - f, 1, 2 + f, k === 19 ? P.gold : P.ember); px(x, y - 2 - f, P.ember3);
        ctx.globalAlpha = 1;
        glow(x, y - 1, k === 19 ? P.gold : P.ember, 5, front ? 0.35 : 0.15);
      }
      // the throne at the bottom, the King on it, the sun burning in his chest; it flares when the last torch lights
      const ty = ringY(6), s = KING_SPR(), flare = t >= TORCH_AT(19) ? Math.max(0, 1 - (t - TORCH_AT(19)) / 0.8) : 0;
      if (s) silhouette(s, cx - s.w / 4, ty - s.h / 2 + 2, 0.5, '#07030a', '#6a2a1a');
      const beat = 0.5 + 0.5 * Math.sin(t * 5);
      glow(cx, ty - 12, P.ember, 6 + beat * 2 + flare * 14, 0.5 + flare * 0.5); px(cx, ty - 12, P.gold);
      if (flare > 0) for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + t; ctx.globalAlpha = flare; line(cx + Math.cos(a) * 3, ty - 12 + Math.sin(a) * 3, cx + Math.cos(a) * (6 + 16 * (1 - flare)), ty - 12 + Math.sin(a) * (6 + 16 * (1 - flare)), P.gold); ctx.globalAlpha = 1; }
      // the ledge in front, and the fighters on it, lit red from the pit below
      const ly = PY + PH - 12;
      rect(PX, ly, 96, 12, '#0a0508');
      for (let x = 0; x < 96; x += 4) rect(PX + x, ly - (hash(x) * 3 | 0), 4, 3, '#0a0508');
      for (let x = 96; x < 108; x++) rect(PX + x, ly + (x - 96), 1, 12, '#0a0508');
      glow(PX + 50, ly - 8, P.ember, 36, 0.14);
      ['TANK', 'BLADE', 'NINJA', 'GUNNER'].forEach((id, i) => drawFighter(id, PX + 14 + i * 21, ly + 1, 1, { t: t + i * 0.4, rim: '#3a0c10' }));
    },
  },
];
const TORCH_AT = (k) => 0.9 + k * 0.18;
// when the King falls
const ENDING = [
  {
    cue: () => A.endingCue(0),
    cap: ['THE KING FELL, AND THE SUN', 'BROKE FREE OF HIM.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#120610', '#2a0a14', '#4a1018']);
      const cx = PX + PW / 2, chest = PY + PH - 40, k = ease((t - 0.6) / 1.6);
      // light splits him open from the chest
      for (let i = 0; i < 14; i++) { const a = (i * TAU) / 14 + t * 0.3, L = 20 + 120 * k; ctx.globalAlpha = 0.25 + 0.5 * k; line(cx, chest, cx + Math.cos(a) * L, chest + Math.sin(a) * L, i % 2 ? P.ember3 : P.paper); ctx.globalAlpha = 1; }
      silhouette(KING_SPR(), cx - 30, PY + PH - 84 + Math.round(k * 10), 1, '#0e070c', P.ember, false, 0.4 * (1 - k));
      // the sun climbs out of him and up into the sky
      const sy = chest - 54 * ease((t - 1.6) / 1.8);
      if (t > 0.6) sun(cx, sy, 3 + 9 * ease((t - 0.6) / 2), t);
      rect(PX, PY + PH - 4, PW, 4, '#0e070c');
    },
  },
  {
    // his people, the ash things, burn away into light; small shining people rise where they stood
    len: 6.4,
    cue: () => A.storyCue('freed'),
    cap: ['WHERE THE LIGHT TOUCHED THE ASH,', 'HIS PEOPLE WERE FREE AT LAST.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#3a2030', '#7a4048', '#e0904a']);
      sun(PX + PW / 2, PY + 14, 8, t, { ga: 0.35 });
      ctx.globalAlpha = 0.1; for (let i = 0; i < 5; i++) rect(PX + 14 + i * 44, PY, 16, PH, P.gold); ctx.globalAlpha = 1;
      const base = PY + PH - 12;
      rect(PX, base, PW, 12, '#3a2a2e'); for (let x = 0; x < PW; x += 3) px(PX + x, base, hash(x) < 0.5 ? '#5a4a4e' : '#2a1e22');
      ['husk', 'brute', 'shade', 'husk', 'priest', 'archer'].forEach((m, i) => {
        const s = SPR[m]?.[0], x = PX + 14 + i * 34, d = clamp01((t - 0.5 - i * 0.32) / 1.4);
        burnAway(s, x, base, 1, '#1e1418', '#ffd98a', d, t, P.gold, i * 13);
        // a small shining person where the ash stood, rising and fading
        const free = t - (0.5 + i * 0.32 + 1.4);
        if (free > 0 && free < 3) {
          const fx = x + (s ? s.w / 2 : 6), fy = base - 4 - free * 9, a = Math.min(1, free * 2) * (1 - free / 3);
          ctx.globalAlpha = a; glow(fx, fy - 3, P.gold, 6, 0.5); rect(fx - 1, fy - 7, 2, 2, '#fff6c8'); rect(fx - 1, fy - 4, 2, 4, '#ffe08a'); px(fx - 2, fy - 4 + (Math.floor(t * 4 + i) % 2), '#ffe08a'); px(fx + 1, fy - 5, '#ffe08a'); ctx.globalAlpha = 1;
        }
      });
    },
  },
  {
    // his last look at the sun: he burns away to ash from the knees up, and his crown drops into it
    len: 6.6,
    cue: () => A.storyCue('aurel'),
    cap: ['AUREL LOOKED UP AT THE SUN ONE LAST TIME.', 'IN THE END, HE WAS NOT AFRAID OF THE DARK.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#2a1428', '#6a2a3a', '#c0603a']);
      const cx = PX + PW / 2 - 20, base = PY + PH - 10;
      sun(PX + PW - 46, PY + 24, 11, t, { ga: 0.5 });
      // a band of light from the sun to him
      ctx.globalAlpha = 0.12; for (let i = 0; i < 20; i++) line(PX + PW - 46, PY + 24, cx - 10 + i * 2, base - 30, P.gold); ctx.globalAlpha = 1;
      rect(PX, base, PW, 10, '#2a1418');
      const s = KING_SPR(), d = clamp01((t - 1.4) / 3);
      if (s) burnAway(s, cx - s.w / 2, base, 1, '#140a12', P.ember3, d, t, '#8a7a80', 77);
      // his crown drops into the ash
      if (d > 0.8) { const k = ease((d - 0.8) / 0.2); crown(cx, base - 2 - (1 - k) * 34, t); }
    },
  },
  {
    cue: () => A.endingCue(1),
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
    cue: () => A.endingCue(2),
    cap: [],
    // the fighter's last word types out beside them
    typed: (t) => Math.min((LAST[G.char] || LAST.BLADE).length, Math.floor(Math.max(0, t - 0.5) * 30)),
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffe9a8', '#ffc76a', '#ff9a4a']);
      glow(PX + 60, PY + 50, P.gold, 50, 0.4);
      drawFighter(G.char, PX + 58, PY + PH - 4, 4, { t, evo: evo() });
      const line_ = LAST[G.char] || LAST.BLADE;
      textO(hero(), PX + 150, PY + 22, heroCol(), 2, 'c');
      let m = Math.floor(Math.max(0, t - 0.5) * 30);
      wrap(line_, 96).forEach((l, i) => { if (m > 0) textO(l.slice(0, m), PX + 150, PY + 44 + i * 9, P.paper, 1, 'c', '#3a1420'); m -= l.length + 1; });
    },
  },
];

// ---------- each fighter's own ending, when they go home ----------
const ground = (y, col = '#3a2a2a', top = '#5a4a3a') => { rect(PX, y, PW, PY + PH - y, col); for (let x = 0; x < PW; x += 2) px(PX + x, y, hash(x + y) < 0.5 ? top : col); };
const EPI = {
  BLADE: {
    cap: ["KAEL LAID HIS BLADE ON AUREL'S GRAVE. THE LAST EMBER", 'WAS HOME NOW, AND HE WOULD NOT NEED IT AGAIN.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffd9a0', '#ffb070', '#e07050']);
      sun(PX + 150, PY + PH - 30, 16, t, { ga: 0.35 });
      const gy = PY + PH - 16;
      ground(gy, '#4a3a2a', '#6aa84a');
      const gx = PX + 136;
      ell(gx, gy, 20, 6, '#4a3226'); ell(gx, gy - 1, 18, 5, '#5e4230');
      crown(gx - 7, gy - 4, t);
      planted(gx + 9, gy - 21, 1.4);
      for (let i = 0; i < 6; i++) { const u = (t * 0.4 + hash(i)) % 1; ctx.globalAlpha = 1 - u; px(gx + 9 + Math.sin(t * 2 + i) * 3, gy - 22 - u * 30, P.gold); ctx.globalAlpha = 1; }
      drawFighter('BLADE', gx - 44, gy + 1, 2, { t, bare: true, evo: evo() });
    },
  },
  GUNNER: {
    cap: ['VEGA CASHED THE BIGGEST BOUNTY EVER POSTED,', 'AND BOUGHT THE WHOLE TOWN A ROUND.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#2a1838', '#7a3a4a', '#e08a4a']);
      const by = PY + PH - 12, bx = PX + 104;
      ground(by, '#2a1a1a', '#3a2a22');
      // the tavern: walls, a roof, warm windows full of people, the door wide open
      rect(bx, by - 54, 104, 54, '#4a2e22'); for (let i = 0; i < 12; i++) rect(bx - 6 + i, by - 54 - i, 116 - i * 2, 1, '#2a1a14');
      for (const wx of [8, 74]) {
        rect(bx + wx, by - 42, 22, 14, '#ffd98a');
        for (let j = 0; j < 3; j++) { const hop = Math.floor(t * 4 + j * 1.7 + wx) % 3 === 0 ? 1 : 0; rect(bx + wx + 3 + j * 7, by - 33 - hop, 4, 5, '#5a3426'); px(bx + wx + 4 + j * 7, by - 35 - hop, '#5a3426'); }
      }
      rect(bx + 44, by - 30, 16, 30, '#ffb347'); glow(bx + 52, by - 14, P.gold, 20, 0.35);
      rect(bx + 34, by - 52, 36, 9, '#1e120c'); text('TAVERN', bx + 52, by - 50, P.gold, 1, 'c');
      if (Math.floor(t * 2) % 3 === 0) textO('!', bx + 18, by - 50, P.paper, 1, 'c');
      // coins she tosses in the air
      for (let i = 0; i < 6; i++) { const u = (t * 0.9 + i / 6) % 1, cx = bx + 30 - i * 3, cy = by - 30 - Math.sin(u * Math.PI) * 30; px(cx + u * 10, cy, Math.floor(t * 8 + i) % 2 ? P.gold : '#fff6c8'); }
      drawFighter('GUNNER', bx + 30, by + 1, 2, { t, flip: true, evo: evo() });
    },
  },
  WIZARD: {
    cap: ['MORROW GAVE THE NEW SUN ITS NAME.', 'IT TOOK HIM THREE DAYS TO SAY IT.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#1a2050', '#5a4a8a', '#ffb080']);
      for (let i = 0; i < 18; i++) if (Math.floor(t * 3 + i) % 5) px(PX + hash(i) * PW, PY + hash(i + 40) * 40, i % 3 ? '#c8c0ff' : P.paper);
      sun(PX + 52, PY + PH - 34, 12, t);
      for (let i = 0; i < 6; i++) { const a = t * 0.6 + (i * TAU) / 6, x = PX + 52 + Math.cos(a) * 26, y = PY + PH - 34 + Math.sin(a) * 26; px(x, y, '#b48cff'); px(x - 1, y, '#8a6ae0'); px(x + 1, y, '#8a6ae0'); px(x, y - 1, '#8a6ae0'); px(x, y + 1, '#8a6ae0'); }
      ell(PX + 160, PY + PH + 12, 92, 36, '#2a2440');
      // the name: a scroll unrolling down the hill, covered in writing
      const L = Math.min(110, t * 28), sx = PX + 150, sy = PY + PH - 34;
      for (let i = 0; i < L; i++) { const x = sx - i * 0.9, y = sy + i * 0.35; rect(x, y, 2, 6, '#f0e6cc'); if (i % 3 === 0) px(x, y + 2 + (i % 2), '#6a5a8a'); }
      drawFighter('WIZARD', PX + 160, PY + PH - 23, 2, { t, wa: -0.95, front: true, evo: evo() });
    },
  },
  NINJA: {
    cap: ['RIN MADE IT TO CLASS.', 'SHE WAS STILL LATE. NOBODY ASKED WHY.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#bfe8ff', '#ffe6f0', '#ffd0d8']);
      const gy = PY + PH - 12, bx = PX + 120;
      ground(gy, '#c8b8a0', '#d8c8b0');
      // the school and its clock tower; the bell rings when she gets there
      rect(bx, gy - 46, 92, 46, '#efe2d2'); rect(bx - 2, gy - 48, 96, 3, '#a04a4a');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) rect(bx + 6 + c * 17, gy - 40 + r * 16, 10, 9, '#8ac0e0');
      rect(bx + 36, gy - 72, 20, 26, '#efe2d2'); for (let i = 0; i < 10; i++) rect(bx + 36 + i, gy - 72 - i, 20 - i * 2, 1, '#a04a4a');
      disc(bx + 46, gy - 60, 6, '#ffffff'); ring(bx + 46, gy - 60, 6, 1, '#4a3a3a');
      line(bx + 46, gy - 60, bx + 46 + Math.cos(t * 4) * 4, gy - 60 + Math.sin(t * 4) * 4, '#2a1a1a'); line(bx + 46, gy - 60, bx + 46 + Math.cos(t * 0.4) * 3, gy - 60 + Math.sin(t * 0.4) * 3, '#2a1a1a');
      rect(bx + 40, gy - 18, 12, 18, '#6a4a3a');
      // a cherry tree, petals blowing
      rect(PX + 24, gy - 30, 4, 30, '#5a3a2a'); ell(PX + 26, gy - 36, 20, 12, '#ff9fc0'); ell(PX + 30, gy - 40, 14, 8, '#ffc0d8');
      for (let i = 0; i < 14; i++) { const u = (t * 0.3 + hash(i)) % 1; px(PX + 10 + hash(i + 9) * 60 + u * 60, gy - 44 + u * 44 + Math.sin(t * 3 + i) * 2, i % 2 ? '#ff9fc0' : '#ffc0d8'); }
      const k = clamp01(t / 3.6), x = PX + 40 + ease(k) * 92;
      drawFighter('NINJA', x, gy + 1, 2, k < 1 ? { anim: 'run', t, fps: 14, evo: evo() } : { t, evo: evo() });
      if (k >= 1 && Math.floor(t * 4) % 2) textO('DING', bx + 46, gy - 88, P.paper, 1, 'c');
    },
  },
  MECHANIC: {
    cap: ['RIVET BUILT A WINDMILL OUT OF THE COLOSSUS.', 'THE TOWN HAD LIGHT AT NIGHT AGAIN.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#1a1838', '#4a3060', '#c06a50']);
      for (let i = 0; i < 12; i++) px(PX + hash(i + 3) * PW, PY + hash(i + 70) * 30, '#c8c0ff');
      const gy = PY + PH - 12, mx = PX + 150;
      ground(gy, '#2a2030', '#3a3040');
      // the windmill: a tower, four sails turning, the Colossus core glowing at the hub
      for (let y = 0; y < 56; y++) { const w = 6 + Math.round(y * 0.18); rect(mx - w, gy - 56 + y, w * 2, 1, y % 9 ? '#6a5a50' : '#5a4a42'); }
      const hy = gy - 58;
      for (let i = 0; i < 4; i++) { const a = t * 1.4 + (i * TAU) / 4; line(mx, hy, mx + Math.cos(a) * 30, hy + Math.sin(a) * 30, '#d8c8b0', 2); line(mx + Math.cos(a) * 10 + Math.cos(a + 1.57) * 4, hy + Math.sin(a) * 10 + Math.sin(a + 1.57) * 4, mx + Math.cos(a) * 28 + Math.cos(a + 1.57) * 4, hy + Math.sin(a) * 28 + Math.sin(a + 1.57) * 4, '#a89880', 2); }
      disc(mx, hy, 3, '#62efff'); glow(mx, hy, '#62efff', 10, 0.6);
      // the houses with their windows lit, and the power running to them along the wire
      for (const [hx, w] of [[PX + 18, 30], [PX + 56, 26]]) { rect(hx, gy - 20, w, 20, '#3a2a30'); for (let i = 0; i < 8; i++) rect(hx - 2 + i, gy - 20 - i, w + 4 - i * 2, 1, '#2a1a20'); rect(hx + 6, gy - 13, 6, 5, '#ffd98a'); glow(hx + 9, gy - 11, P.gold, 8, 0.3); }
      line(mx - 8, gy - 40, PX + 70, gy - 26, '#1a1418');
      const u = (t * 0.8) % 1; px(mx - 8 + (PX + 70 - mx + 8) * u, gy - 40 + 14 * u, '#62efff');
      drawFighter('MECHANIC', PX + 108, gy + 1, 2, { t, evo: evo() });
    },
  },
  TANK: {
    cap: ['GROM STOOD ONE LAST WATCH OVER HIS KING.', 'AT DAWN HE LAID DOWN HIS HAMMER, AND WENT HOME.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#ffe0b0', '#ffb880', '#e08060']);
      sun(PX + 168, PY + PH - 26, 14, t, { ga: 0.35 });
      const gy = PY + PH - 14, tx = PX + 132;
      ground(gy, '#4a3a2a', '#6aa84a');
      // the King's tomb: a stone with his crown cut into it, flowers in front
      rect(tx - 16, gy - 26, 32, 26, '#6a6070'); ell(tx, gy - 26, 16, 6, '#6a6070'); rect(tx - 16, gy - 26, 32, 2, '#8a8090');
      crown(tx, gy - 12, t);
      for (let i = 0; i < 5; i++) { px(tx - 12 + i * 6, gy - 2, '#5aa84a'); px(tx - 12 + i * 6, gy - 3, i % 2 ? '#ff9fc0' : '#ffd447'); }
      // his hammer laid on the grass
      ctx.save(); ctx.translate(PX + 12, gy - 2); ctx.scale(1.3, 1.3); drawWeaponAt(ctx, 'hammer', evo(), 0, 0, 0.05, false, 1); ctx.restore();
      drawFighter('TANK', tx - 40, gy + 1, 2, { t, bare: true, evo: evo() });
    },
  },
  ROBOT: {
    cap: ['UNIT-7 HAD NO ORDERS LEFT.', 'SO IT GAVE ITSELF ONE: WATCH EVERY SUNRISE.'],
    draw(t) {
      const hz = PY + 62;
      sky(PX, PY, PW, 62, ['#ffd0a0', '#ff9a7a', '#c0607a']);
      // the sun coming up out of the sea
      const sy = hz + 6 - ease(t / 5) * 22;
      ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, hz - PY); ctx.clip(); sun(PX + 150, sy, 13, t); ctx.restore();
      rect(PX, hz, PW, PY + PH - hz, '#3a4a7a');
      for (let i = 0; i < 16; i++) { const y = hz + 2 + i * 3, w = 30 - i, x = PX + 150 - w / 2 + Math.sin(t * 2 + i) * 3; rect(x, y, w, 1, i % 2 ? '#ffd98a' : '#e0a070'); }
      // the cliff, a robot at its edge, and a very small flower
      const cy = PY + 70;
      rect(PX, cy, 90, PY + PH - cy, '#2a2026'); for (let x = 0; x < 90; x += 3) px(PX + x, cy, '#4a3a40');
      drawFighter('ROBOT', PX + 56, cy + 1, 2, { t, evo: evo() });
      px(PX + 80, cy - 1, '#5aa84a'); px(PX + 80, cy - 2, '#5aa84a'); px(PX + 80, cy - 3, '#ff9fc0'); px(PX + 79, cy - 3, '#ff6a9a'); px(PX + 81, cy - 3, '#ff6a9a');
      birds(PX + 90, PY + 20, t, 3, '#6a3a4a');
    },
  },
  DEV: {
    cap: ['THE DEV SHIPPED THE ENDING.', 'ZERO BUGS. PROBABLY.'],
    draw(t) {
      rect(PX, PY, PW, PH, '#0a0c14');
      // a window behind: the sun coming up outside
      sky(PX + 14, PY + 12, 50, 40, ['#ffd0a0', '#ff9a7a', '#c0607a']);
      ctx.save(); ctx.beginPath(); ctx.rect(PX + 14, PY + 12, 50, 40); ctx.clip(); sun(PX + 40, PY + 50 - ease(t / 5) * 16, 7, t, { ga: 0.3 }); ctx.restore();
      rect(PX + 38, PY + 12, 2, 40, '#0a0c14'); rect(PX + 14, PY + 30, 50, 2, '#0a0c14');
      // the desk, the monitor, the build log typing out
      const dy = PY + PH - 26;
      rect(PX + 96, dy, 110, 4, '#3a2a22'); rect(PX + 100, dy + 4, 4, 22, '#2a1e18'); rect(PX + 198, dy + 4, 4, 22, '#2a1e18');
      rect(PX + 118, dy - 46, 72, 44, '#2a2e3a'); rect(PX + 121, dy - 43, 66, 36, '#06120a'); rect(PX + 150, dy - 2, 8, 2, '#2a2e3a');
      const LOG = ['> BUILD ENDING', '> TESTS 1337/1337', '> SUN: ONLINE', '> SHIPPED'];
      let n = Math.floor(t * 14);
      LOG.forEach((l, i) => { if (n > 0) text(l.slice(0, n), PX + 124, dy - 40 + i * 8, i === 3 ? P.gold : '#39ff6a', 1); n -= l.length + 4; });
      if (Math.floor(t * 3) % 2) rect(PX + 124, dy - 8, 3, 1, '#39ff6a');
      glow(PX + 154, dy - 25, '#39ff6a', 26, 0.15);
      // coffee
      rect(PX + 196, dy - 7, 6, 7, P.paper); for (let i = 0; i < 3; i++) px(PX + 198 + Math.sin(t * 3 + i) * 1.5, dy - 9 - i * 2 - ((t * 6) % 2 | 0), '#8a8aa0');
      drawFighter('DEV', PX + 90, PY + PH, 2, { t, evo: evo() });
    },
  },
};
// going home
const HOME = [
  {
    len: 6.4,
    cue: () => A.storyCue('climb'),
    cap: () => [hero() + ' CLIMBED OUT OF THE PIT,', 'INTO THE FIRST MORNING IN A HUNDRED YEARS.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#8ad0ff', '#ffe0a0', '#ffb070']);
      sun(PX + PW - 36, PY + 28, 13, t);
      birds(PX + 70, PY + 18, t, 4);
      // the hillside going up to the right; grass comes back where the fighter has walked
      const slope = (x) => PY + PH - 6 - (x - PX) * 0.3, fxp = PX + 24 + ease(t / 6) * 140;
      for (let x = PX; x < PX + PW; x++) rect(x, slope(x), 1, PY + PH - slope(x) + 1, '#4a3a30');
      for (let x = PX; x < PX + PW; x += 2) px(x, slope(x), '#6a5a4a');
      for (let x = PX; x < fxp - 4; x++) if (hash(x) < 0.55) { rect(x, slope(x) - 1, 1, 1 + (hash(x + 5) < 0.4 ? 1 : 0), '#5ac85a'); if (hash(x + 9) < 0.06) px(x, slope(x) - 3, hash(x) < 0.03 ? '#ff9fc0' : '#ffd447'); }
      drawFighter(G.char, fxp, slope(fxp) + 1, 2, t < 6 ? { anim: 'walk', t, fps: 10, evo: evo() } : { t, evo: evo() });
    },
  },
  {
    len: 7.4,
    cue: () => A.storyCue('epilogue'),
    cap: () => (EPI[G.char] || EPI.BLADE).cap,
    draw(t) { (EPI[G.char] || EPI.BLADE).draw(t); },
  },
  {
    len: 7.5,
    cue: () => A.endingCue(3),
    cap: [],
    draw(t) {
      sky(PX, PY, PW, PH, ['#05020a', '#0c0911', '#160f1e']);
      for (let i = 0; i < 24; i++) if (Math.floor(t * 2 + i) % 7) px(PX + hash(i + 11) * PW, PY + hash(i + 51) * PH * 0.6, i % 4 ? '#5a5070' : P.paper);
      textO('THE END', PX + PW / 2, PY + 20, P.gold, 3, 'c');
      if (t > 0.6) text('THANK YOU FOR PLAYING', PX + PW / 2, PY + 46, P.bone, 1, 'c');
      if (t > 2.2) {
        // but below the pit, two eyes open
        const k = ease((t - 2.2) / 1);
        eyes(PX + PW / 2, PY + 74, k, 5, t, 3);
        textO('BUT BELOW THE PIT, SOMETHING ELSE HAS WOKEN.', PX + PW / 2, PY + 92, '#b48cff', 1, 'c');
      }
    },
  },
];
// going deeper
const DEEPER = [
  {
    len: 6.2,
    cue: () => A.storyCue('seal'),
    cap: ["THE KING'S FIRE HAD KEPT HIS PIT SEALED.", 'NOW THE FIRE WAS OUT, AND THE SEAL BROKE.'],
    draw(t) {
      const k = clamp01((t - 0.3) / 2.8), sh = k < 1 && k > 0 ? Math.round(Math.sin(t * 40) * 1.5) : 0;
      ctx.save(); ctx.translate(sh, 0);
      sky(PX - 2, PY, PW + 4, PH, ['#0c0911', '#160f1e', '#1f1929']);
      for (let i = 0; i < 6; i++) { rect(PX + 8 + i * 40, PY, 12, PH - 30, '#1a1422'); rect(PX + 8 + i * 40, PY, 12, 2, '#2a2234'); }
      const fy = PY + PH - 30, cx = PX + PW / 2;
      rect(PX - 2, fy, PW + 4, 30, '#2a2030'); for (let x = 0; x < PW; x += 12) rect(PX + x, fy + ((x / 12) % 2) * 8, 1, 30, '#221a28');
      // his empty throne, tipping into the crack
      ctx.save(); ctx.translate(cx, fy); ctx.rotate(k * 0.18);
      rect(-10, -34, 20, 34, '#3a2a40'); rect(-12, -18, 24, 4, '#4a3a50'); rect(-10, -36, 4, 4, P.gold); rect(6, -36, 4, 4, P.gold);
      ctx.restore();
      // the cracks run out from under it, cold light pouring up through them
      for (let c = 0; c < 6; c++) {
        let x = cx, y = fy + 3; const dir = c < 3 ? -1 : 1, segs = Math.floor(9 * k);
        for (let s = 0; s < segs; s++) {
          const nx = x + dir * (6 + hash(c * 20 + s) * 8), ny = y + (hash(c * 31 + s) - 0.35) * 6;
          line(x, y, nx, Math.min(PY + PH - 1, ny), '#e8dcff'); glow(nx, ny, '#b48cff', 5, 0.35);
          if (s % 3 === 1) { ctx.globalAlpha = 0.12; rect(nx - 1, PY, 3, ny - PY, '#b48cff'); ctx.globalAlpha = 1; }
          x = nx; y = Math.min(PY + PH - 1, ny);
        }
      }
      // dust shaken down from the roof
      for (let i = 0; i < 16 * k; i++) { const u = (t * 0.8 + hash(i)) % 1; px(PX + hash(i + 3) * PW, PY + u * (fy - PY), '#6a5a70'); }
      ctx.restore();
    },
  },
  {
    len: 6.6,
    cue: () => A.storyCue('eyes'),
    cap: ['FROM UNDER IT CAME SOMETHING OLDER THAN THE KING:', 'THE DARK HE HAD BEEN AFRAID OF ALL ALONG.'],
    draw(t) {
      rect(PX, PY, PW, PH, '#030106');
      // the stars go out one by one
      for (let i = 0; i < 30; i++) if (t < 0.4 + hash(i + 2) * 3) px(PX + hash(i + 7) * PW, PY + hash(i + 17) * PH * 0.5, '#8a80a0');
      // feelers of dark reaching up, edged in violet
      for (let i = 0; i < 9; i++) {
        const x0 = PX + 12 + i * 25, h = 30 + hash(i) * 40 + Math.min(1, t / 3) * 20;
        for (let y = 0; y < h; y++) { const x = x0 + Math.sin(y * 0.12 + t * 1.6 + i) * (4 + y * 0.08), w = Math.max(1, 4 - y / 14); rect(x - w / 2, PY + PH - y, w, 1, y % 5 ? '#120820' : '#3a1a5a'); }
      }
      eyes(PX + PW / 2, PY + 40, ease((t - 0.8) / 1.6), 16, t, 2.6);
    },
  },
  {
    len: 6.8,
    cue: () => A.storyCue('descend'),
    cap: () => ['IF IT REACHED THE SURFACE, THE NEW DAWN WOULD DIE.', hero() + ' TURNED AWAY FROM THE LIGHT, AND WENT DOWN.'],
    draw(t) {
      // the morning far above, the crack below, a fighter at its edge, then into it
      sky(PX, PY, PW, 34, ['#8ad0ff', '#ffe0a0', '#ffb070']);
      sun(PX + 60, PY + 16, 8, t, { ga: 0.3 });
      rect(PX, PY + 34, PW, PH - 34, '#0a0410');
      for (let i = 0; i < 40; i++) { const y = PY + 34 + ((i * 13 + t * (t > 3 ? 160 : 10)) % (PH - 34)); ctx.globalAlpha = 0.4; rect(PX + hash(i) * PW, y, 1, t > 3 ? 5 : 1, '#3a1a5a'); ctx.globalAlpha = 1; }
      const ly = PY + 52;
      rect(PX, ly, 84, PH, '#1a1220'); for (let x = 0; x < 84; x += 3) px(PX + x, ly, '#3a2a40');
      glow(PX + PW / 2 + 30, PY + PH - 6, '#b48cff', 40, 0.25 + 0.1 * Math.sin(t * 2));
      if (t < 3) drawFighter(G.char, PX + 66, ly + 1, 2, { t, evo: evo() });
      else {
        const k = t - 3, x = PX + 66 + k * 30, y = ly + 1 + k * k * 70;
        if (y < PY + PH + 70) drawFighter(G.char, x, y, 2, { anim: 'dash' in (SPR.chars[G.char]?.body || {}) ? 'dash' : 'run', t, fps: 12, evo: evo() });
      }
      if (t > 4.2) eyes(PX + PW / 2 + 30, PY + PH - 14, ease((t - 4.2) / 1), 5, t, 3);
    },
  },
];
// falling in the deep
const FALL = [
  {
    len: 5.6,
    cue: () => A.storyCue('fall'),
    cap: () => ['IN THE DEEP DARK, ' + hero() + ' FELL AT LAST.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#030106', '#0e0618', '#1a0a26']);
      const gy = PY + PH - 16;
      rect(PX, gy, PW, 16, '#120a18'); for (let x = 0; x < PW; x += 3) px(PX + x, gy, '#2a1a34');
      const cx = PX + PW / 2, fade = Math.max(0, 1 - t / 4);
      glow(cx, gy - 6, heroCol(), 30, 0.4 * fade + 0.08);
      drawFighter(G.char, cx, gy + 1, 2, { anim: 'death', frame: 7, bare: true, evo: evo() });
      for (let i = 0; i < 10; i++) { const u = (t * 0.35 + hash(i)) % 1; ctx.globalAlpha = (1 - u) * 0.8; px(cx - 20 + hash(i + 4) * 40, gy - 4 - u * 50, heroCol()); ctx.globalAlpha = 1; }
      eyes(cx, PY + 26, 0.55 + 0.1 * Math.sin(t), 9, t, 2.6);
    },
  },
  {
    len: 6.4,
    cue: () => A.storyCue('hold'),
    cap: () => (G?.night
      ? ['FOR ' + held() + ' OF THE ENDLESS NIGHT, NOTHING GOT PAST THEM.', 'NOT ONE OF THE THINGS THE DARK SENT UP.']
      : ['BUT FOR ' + nights() + (nights() === 1 ? ' NIGHT' : ' NIGHTS') + ', NOTHING CLIMBED PAST THEM.', 'THE DARK NEVER REACHED THE SURFACE.']),
    draw(t) {
      rect(PX, PY, PW, PH, '#05020a');
      const cx = PX + PW / 2, gy = PY + PH - 26, col = heroCol(), pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      // the dark reaches for the weapon they left standing in the stone, and stops short of its light
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1, y0 = PY + 10 + i * 7, reach = 70 - 18 * pulse - hash(i) * 10;
        for (let x = 0; x < reach; x++) { const yy = y0 + Math.sin(x * 0.15 + t * 2 + i) * 3; px(cx + side * (PW / 2 - x), yy, x > reach - 4 ? '#b48cff' : '#1e0c30'); }
      }
      rect(PX, gy, PW, 26, '#120a18');
      glow(cx, gy - 10, col, 34 + pulse * 6, 0.45);
      planted(cx, gy - 18, 1.6);
      // a mark scratched for every night they held (every minute of the endless night)
      const n = G?.night ? Math.max(1, Math.floor(G.night.t / 60)) : nights();
      if (n <= 40) for (let i = 0; i < n; i++) { const g = Math.floor(i / 5), j = i % 5, x = PX + 10 + g * 14 + j * 2, y = gy + 8; if (j < 4) rect(x, y, 1, 7, P.bone); else line(x - 9, y + 6, x, y, P.bone); }
      else textO(n + (G?.night ? ' MINUTES' : ' NIGHTS'), PX + 10, gy + 9, P.bone, 1);
    },
  },
  {
    len: 6.6,
    cue: () => A.storyCue('rise'),
    cap: ['HIGH ABOVE, THE SUN STILL ROSE.', 'THE TOWN NEVER KNEW WHO KEPT THE DARK AWAY.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#7ac8ff', '#ffd98a', '#ffb05a']);
      sun(PX + PW / 2, PY + 30 - ease(t / 5) * 10, 13, t);
      castle(PX + 50, PY + PH - 14, '#5a2a3a', '#ffe08a', t);
      rect(PX, PY + PH - 12, PW, 12, '#4a6a3a'); for (let x = 0; x < PW; x += 2) px(PX + x, PY + PH - 12, hash(x) < 0.5 ? '#6aa84a' : '#4a6a3a');
      birds(PX + 40, PY + 22, t, 4);
      // where the pit was: a small light in the grass, burning in their color
      const lx = PX + 30, ly = PY + PH - 8;
      glow(lx, ly, heroCol(), 10 + Math.sin(t * 3) * 2, 0.6); px(lx, ly, P.paper); px(lx, ly - 1, heroCol());
    },
  },
];

// when Nox's shape breaks: the dark comes apart, everything it swallowed climbs back, the endless night begins
const NIGHTFALL = [
  {
    len: 6,
    cue: () => A.storyCue('seal'),
    cap: ['NOX CAME APART UNDER THE PIT,', 'LIKE THE LAST HOUR OF A NIGHT BEFORE THE DAWN.'],
    draw(t) {
      rect(PX, PY, PW, PH, '#030106');
      const cx = PX + PW / 2, cy = PY + 46, k = ease(t / 3);
      // the eyes crack and the shards fly apart, light pouring through the gaps
      for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU + hash(i) * 0.3, r = 10 + k * (40 + hash(i + 3) * 60); ctx.globalAlpha = 1 - k * 0.7; rect(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r * 0.7 - 2, 3 + (i % 2), 3, i % 3 ? '#3a1e6a' : '#b48cff'); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t * 0.2; ctx.globalAlpha = 0.18 + 0.4 * k; line(cx, cy, cx + Math.cos(a) * 150 * k, cy + Math.sin(a) * 110 * k, i % 2 ? P.gold : P.paper); }
      ctx.globalAlpha = 1;
      if (k < 0.8) eyes(cx, cy, 1 - k, 14, t, 2.6);
      glow(cx, cy, P.gold, 30 + 40 * k, 0.3 + 0.3 * k);
    },
  },
  {
    len: 6.6,
    cue: () => A.storyCue('eyes'),
    cap: ['BUT THE DARK CANNOT DIE. IT CAN ONLY BE HELD BACK.', 'EVERYTHING IT HAD EVER SWALLOWED CAME CLIMBING OUT OF IT.'],
    draw(t) {
      sky(PX, PY, PW, PH, ['#030106', '#0e0618', '#1a0a26']);
      const base = PY + PH - 8;
      rect(PX, base, PW, 8, '#05020a');
      // the bosses rise out of the dark one after another, shadows with burning eyes
      [['warden', 14, 0.0], ['colossus', 56, 0.5], ['clock', 104, 1.0], ['brood', 150, 1.5], ['eclipse', 182, 2.0]].forEach(([m, dx, at]) => {
        const sp = SPR[m]?.[0];
        if (!sp) return;
        const k = ease((t - 0.3 - at * 0.6) / 1.2), x = PX + dx, y = base - sp.h * k + 6;
        ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, base - PY); ctx.clip();
        silhouette(sp, x, y, 1, '#0a0414', '#6a3aa8');
        ctx.restore();
        if (k > 0.5) glow(x + sp.w * 0.5, y + sp.h * 0.35, '#b48cff', 5, 0.6);
      });
      eyes(PX + PW / 2, PY + 18, 0.6 + 0.2 * Math.sin(t), 6, t, 3);
    },
  },
  {
    len: 6.8,
    cue: () => A.storyCue('descend'),
    cap: () => [hero() + ' STOOD IN THE LAST LIGHT AND RAISED THEIR WEAPON.', 'THE ENDLESS NIGHT BEGAN. HOLD ON FOR AS LONG AS YOU CAN.'],
    draw(t) {
      rect(PX, PY, PW, PH, '#030106');
      const cx = PX + PW / 2, gy = PY + PH - 14;
      // a ring of light round the fighter, eyes all round it in the dark
      glow(cx, gy - 16, heroCol(), 46, 0.3);
      ell(cx, gy, 40, 8, '#1a1024'); ell(cx, gy, 34, 6, '#241830');
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.2, r = 70 + hash(i) * 30; eyes(cx + Math.cos(a) * r, PY + 40 + Math.sin(a) * 34, Math.min(1, Math.max(0, (t - 0.4 - i * 0.12) / 0.4)), 2, t + i, 3); }
      drawFighter(G.char, cx, gy + 2, 2, { t, wa: -0.85, front: true, evo: evo() });
    },
  },
];

// ---------- the player: a page at a time ----------
const STORIES = { lore: LORE, ending: ENDING, home: HOME, deeper: DEEPER, fall: FALL, nightfall: NIGHTFALL };
export const story = { name: null, pages: LORE, i: 0, t: 0, cued: -1, typed: 0, cap: null };
export function playStory(name) { Object.assign(story, { name, pages: STORIES[name], i: 0, t: 0, cued: -1, typed: 0, cap: null }); }
const capOf = (p) => (typeof p.cap === 'function' ? p.cap() : p.cap);
// a caption types out at 34 letters a second after a short pause; returns how many letters show at time t
const typedAt = (cap, t) => Math.min(cap.reduce((a, l) => a + l.length, 0), Math.floor(Math.max(0, t - 0.25) * 34));
// how long a page stays if nobody presses anything: long enough to read it twice
const pageLen = (p, cap) => p.len ?? Math.max(4.2, cap.reduce((a, l) => a + l.length, 0) / 34 + 2.4);
// any key or a tap: the next page; Escape (or the corner tap): skip the story. Returns 'skip', 'done' or null.
export function updateStory(dt) {
  const pg = story.pages[story.i], t0 = story.t;
  story.cap ??= capOf(pg);
  story.t += dt;
  if (story.cued !== story.i) { if (story.i > 0) A.lorePage(); pg.cue?.(); story.cued = story.i; story.typed = 0; }
  pg.update?.(t0, story.t);
  const n = pg.typed ? pg.typed(story.t) : typedAt(story.cap, story.t);
  if (n > story.typed) { story.typed = n; A.type(); }
  const corner = input.mouse.pressed && input.mouse.x > W - 60 && input.mouse.y < 26;
  if (keyHit('Escape') || corner) return 'skip';
  const next = story.t > 0.35 && (input.any || input.mouse.pressed);
  if (next || story.t > pageLen(pg, story.cap)) {
    A.ui();
    story.i++; story.t = 0; story.cap = null;
    if (story.i >= story.pages.length) { story.i = story.pages.length - 1; return 'done'; }
  }
  return null;
}
function frame(t) {
  // the page slides in, with a bright frame round it
  const k = ease(t / 0.3), dx = Math.round((1 - k) * 30);
  rect(PX - 3 + dx, PY - 3, PW + 6, PH + 6, P.ink0);
  rect(PX - 2 + dx, PY - 2, PW + 4, PH + 4, t < 0.12 ? P.paper : P.stone2);
  rect(PX - 1 + dx, PY - 1, PW + 2, PH + 2, P.ink0);
  return dx;
}
export function drawStory() {
  const pg = story.pages[story.i], t = story.t, cap = story.cap ?? capOf(pg);
  fillScreen('#000');
  // the dots: which page this is
  const N = story.pages.length;
  for (let i = 0; i < N; i++) rect(W / 2 - N * 4 + i * 8 + 2, PY + PH + 44, 4, 2, i === story.i ? P.gold : P.ink3);
  const dx = frame(t);
  ctx.save(); ctx.translate(dx, 0); ctx.beginPath(); ctx.rect(PX, PY, PW, PH); ctx.clip();
  pg.draw(t);
  ctx.restore();
  // the caption types out under the picture
  let n = Math.floor(Math.max(0, t - 0.25) * 34);
  cap.forEach((l, i) => { if (n > 0) textO(l.slice(0, n), W / 2, PY + PH + 10 + i * 10, i ? P.ember3 : P.bone, 1, 'c'); n -= l.length; });
  text(input.touch ? 'TAP  NEXT' : 'ANY KEY  NEXT', 8, H - 9, P.stone2, 1);
  text(input.touch ? 'SKIP' : 'ESC  SKIP', W - 16, H - 9, P.stone2, 1, 'r');
  if (input.touch) text('SKIP', W - 16, 8, P.stone2, 1, 'r');
}

// ---------- the choice: the run in comic panels, then the two roads ----------
export const choice = { t: 0, sel: 1 };
export function resetChoice() { choice.t = 0; choice.sel = 1; }
const inBox = (x, y, w, h) => input.mouse.x >= x && input.mouse.x < x + w && input.mouse.y >= y && input.mouse.y < y + h;
const CP = [[10, 22, 96, 66], [112, 22, 96, 66], [214, 22, 96, 66], [10, 94, 148, 46], [164, 94, 146, 46]];
const CB = [[10, 148, 148, 26], [164, 148, 146, 26]];
const STAMP = (i) => 0.15 + i * 0.28, ROADS = 1.65;
// returns 'home', 'deeper' or null
export function updateChoice(dt) {
  const t0 = choice.t;
  choice.t += dt;
  for (let i = 0; i < CP.length; i++) if (t0 < STAMP(i) && choice.t >= STAMP(i)) A.storyCue('stamp');
  if (t0 < ROADS && choice.t >= ROADS) A.storyCue('choose');
  // a key or a tap while the panels land: show the whole page now
  if (choice.t < ROADS) { if (choice.t > 0.3 && (input.any || input.mouse.pressed)) choice.t = ROADS; return null; }
  if (keyHit('ArrowLeft', 'KeyA')) { choice.sel = 0; A.ui(); }
  if (keyHit('ArrowRight', 'KeyD')) { choice.sel = 1; A.ui(); }
  for (let i = 0; i < 2; i++) {
    const [x, y, w, h] = CB[i];
    if (!inBox(x - 2, y - 2, w + 4, h + 4)) continue;
    if (input.mouse.moved && choice.sel !== i) { choice.sel = i; A.ui(); }
    if (input.mouse.pressed && choice.t > ROADS + 0.25) { A.select(); return i ? 'deeper' : 'home'; }
  }
  if (keyHit('Enter', 'Space') && choice.t > ROADS + 0.25) { A.select(); return choice.sel ? 'deeper' : 'home'; }
  return null;
}
// a comic caption box, top left of a panel
function tag(x, y, s, col) {
  const w = textW(s) + 6;
  rect(x, y, w, 9, P.ink0); rect(x + 1, y + 1, w - 2, 7, '#f6ecd0'); text(s, x + 3, y + 2, col === P.paper ? P.ink0 : '#1a1014', 1);
  rect(x + 1, y + 7, w - 2, 1, col);
}
const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const PANELS = [
  // the King: his crown in a heap of ash, smoke still rising
  (x, y, w, h, t) => {
    sky(x, y, w, h, ['#2a1018', '#4a1a20', '#2a1418']);
    rect(x, y + h - 14, w, 14, '#1a1014');
    ell(x + w / 2, y + h - 14, 30, 5, '#3a3036'); ell(x + w / 2, y + h - 15, 22, 3, '#4a4046');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 14; j++) { ctx.globalAlpha = 0.5 * (1 - j / 14); px(x + w / 2 - 18 + i * 12 + Math.sin(t * 2 + j * 0.5 + i) * 2, y + h - 18 - j * 2.2 - ((t * 6) % 2), '#6a5a60'); }
    ctx.globalAlpha = 1;
    crown(x + w / 2, y + h - 16, t);
    tag(x + 3, y + 3, 'AUREL: SLAIN', P.blood);
  },
  // the sun, free
  (x, y, w, h, t) => { sky(x, y, w, h, ['#ffe9a8', '#ffc76a', '#ff9a4a']); sun(x + w / 2, y + h / 2 + 5, 15, t); birds(x + 6, y + 18, t, 2); tag(x + 3, y + 3, 'THE SUN: FREE', P.gold); },
  // the fighter, still standing, weapon raised
  (x, y, w, h, t) => {
    sky(x, y, w, h, ['#ffd98a', '#ffb05a', '#e07040']);
    glow(x + w / 2, y + h - 24, P.gold, 34, 0.4);
    rect(x, y + h - 6, w, 6, '#4a2a2a');
    drawFighter(G.char, x + w / 2, y + h - 5, 2, { t, wa: -0.85, front: true, evo: evo() });
    tag(x + 3, y + 3, hero() + ': STANDING', heroCol());
  },
  // the run in numbers
  (x, y, w, h, t) => {
    rect(x, y, w, h, '#0c0911');
    tag(x + 3, y + 3, 'THE TWENTY NIGHTS', P.paper);
    const k = ease(t / 0.9), rows = [['SCORE', Math.round(G.score * k)], ['TIME', fmtTime(G.time)], ['KILLS', Math.round(G.kills * k)], ['BOSSES', Math.round(G.bosses * k)]];
    rows.forEach(([l, v], i) => { const cx = x + 6 + (i % 2) * 72, cy = y + 16 + Math.floor(i / 2) * 11; text(l, cx, cy, P.dust); text(String(v), cx + 66, cy, i === 0 ? P.gold : P.paper, 1, 'r'); });
    text(G.diffKey + (best0() ? '   NEW BEST' : ''), x + 6, y + 38, best0() && Math.floor(t * 3) % 2 ? P.gold : P.stone2, 1);
  },
  // and below, in the dark, something opens its eyes
  (x, y, w, h, t) => {
    rect(x, y, w, h, '#05020a');
    let cx = x, cy = y + h - 8;
    for (let i = 0; i < 12; i++) { const nx = x + (i + 1) * (w / 12), ny = y + h - 8 + (hash(i) - 0.5) * 6; line(cx, cy, nx, ny, '#b48cff'); cx = nx; cy = ny; }
    glow(x + w / 2, y + h - 8, '#b48cff', 30, 0.2);
    eyes(x + w / 2, y + h / 2 + 4, ease((t - 0.4) / 1.4), 6, t, 3);
    tag(x + 3, y + 3, 'BELOW: SOMETHING WOKE', '#b48cff');
  },
];
const best0 = () => G?.newBest === true;
export function drawChoice() {
  const t = choice.t;
  fillScreen('#07050b');
  // a halftone of dots behind the page, like a comic's print
  for (let y = 2; y < H; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) px(x, y, '#120e18');
  const k0 = ease(t / 0.3);
  textO('THE SUN IS FREE', W / 2, 5 - Math.round((1 - k0) * 12), P.gold, 2, 'c');
  CP.forEach(([x, y, w, h], i) => {
    if (t < STAMP(i)) return;
    const k = ease((t - STAMP(i)) / 0.18), sc = 1 + (1 - k) * 0.22;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    rect(x - 2, y - 2, w + 4, h + 4, P.ink0); rect(x - 1, y - 1, w + 2, h + 2, P.paper);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    PANELS[i](x, y, w, h, t - STAMP(i));
    ctx.restore();
    if (k < 1) { ctx.globalAlpha = 1 - k; rect(x, y, w, h, P.paper); ctx.globalAlpha = 1; }
    ctx.restore();
  });
  // the two roads
  CB.forEach(([x, y, w, h], i) => {
    if (t < ROADS + i * 0.08) return;
    const on = choice.sel === i, col = i ? '#b48cff' : P.gold, k = ease((t - ROADS - i * 0.08) / 0.25), yy = y + Math.round((1 - k) * 24);
    if (on) glow(x + w / 2, yy + h / 2, col, 40, 0.18 + 0.06 * Math.sin(t * 5));
    rect(x - 2, yy - 2, w + 4, h + 4, P.ink0); rect(x - 1, yy - 1, w + 2, h + 2, on ? col : P.ink3); rect(x, yy, w, h, on ? (i ? '#24123a' : '#2a1e08') : P.ink1);
    textO(i ? 'GO DEEPER' : 'GO HOME', x + w / 2, yy + 5, on ? col : P.bone, 2, 'c');
    text(i ? 'ENDLESS NIGHTS UNDER THE PIT' : 'YOUR STORY ENDS HERE', x + w / 2, yy + 18, on ? P.paper : P.dust, 1, 'c');
    if (on) { const a = Math.floor(t * 6) % 2; textO('>', x + 6 + a, yy + 9, col, 1); textO('<', x + w - 9 - a, yy + 9, col, 1); }
  });
}
