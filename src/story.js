// The story. Aurel was the Sun King. When the sun grew old he feared the dark that waits for everything, so he
// swallowed it to burn forever, and became the Ashen King: the sky went black, the land turned to ash (his own people
// with it: they are the ash things that climb out of his pit), and every night his army comes up out of the pit
// below his throne. The fighters go down into the pit, floor by floor, each for a reason of their own. The goal of a
// run: fight down 20 waves to his throne, kill the King and cut the sun out of him. Then the fighter chooses: go home
// (the run ends with their own ending, three pages that close the reason they came), or go deeper:
// the King's fire was what kept his pit sealed, and under it waits the dark he was so afraid of.
//
//   say()     the dialog box: the King taunts the fighter and tells them who he was, a voice in the ash begs for help,
//             each fighter answers in their own voice; past wave 20 the dark itself talks. A line types out letter by
//             letter beside the speaker's face.
//   stories   picture books, a page at a time: a small pixel picture with its caption typing out under it
//               lore     the intro: the golden sun, the fear, the swallowing, the ash, the fighters at the pit's edge
//               ending   the King falls: the sun breaks out, his people go free, his last look, the light, a last word
//               home     going home: the climb into the morning, three pages of the fighter's own ending (HOMES), the end
//               deeper   going deeper: the seal breaks, the dark opens its eyes, the fighter goes down
//               fall     falling in the deep: the fall, the nights they held it back, the sun still rising above
//   choice    the page after the ending: the run in comic panels, then GO HOME or GO DEEPER
import { W, H, fillScreen, ctx, P, BAYER, makeCanvas, rect, px, line, disc, ring, glow, text, textO, textW, wrapText, drawSprite } from './gfx.js?v=213';
import { SPR } from './sprites.js?v=213';
import { input, keyHit } from './input.js?v=213';
import { A } from './audio.js?v=213';
import { G } from './world.js?v=213';
import { CHARS } from './chars.js?v=213';
import { drawFighter } from './title-scene.js?v=213';
import { drawWeaponAt } from './hero-sprites.js?v=213';

export const KING = 'KING', VOID = 'VOID', ASH = 'ASH', NOX = 'NOX';
const TAU = Math.PI * 2;
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const ease = (k) => 1 - (1 - clamp01(k)) ** 3;
// the same "random" every time, so a picture doesn't change between frames
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// whose story it is: the run's fighter, or the one the Compendium is replaying an ending for (story.char)
const me = () => story.char || G?.char;
const hero = () => CHARS[me()]?.hero || 'THE FIGHTER';
const heroCol = () => CHARS[me()]?.color?.() || P.paper;
const evo = () => (story.char ? !!story.evo : G?.evo === true);
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
  w6: [[ASH, 'I KEPT THE BAKERY ON MILL STREET. AT FIRST LIGHT, MY GIRL DREW A SUN IN THE FLOUR.']],
  w8: [[KING, 'THE SUN WAS DYING, LITTLE ONE. I SAVED IT THE ONLY WAY I COULD. INSIDE ME.']],
  w11: [[ASH, 'WHEN THE OVENS WENT COLD, I TOOK HER HAND. NOW I HAVE NO HANDS. HAVE YOU SEEN HER LITTLE SUN?']],
  w13: [[KING, 'MY PEOPLE ARE STILL HERE, YOU KNOW. YOU HAVE BEEN CUTTING THEM DOWN ALL NIGHT.']],
  w16: [[ASH, 'THERE. ON YOUR SLEEVE. SHE STILL DRAWS IT WITH ONE FINGER. CARRY US BOTH TO MORNING.']],
  w18: [[KING, 'TWO MORE NIGHTS. THEN THE LAST FIRE COMES FOR YOU HIMSELF.']],
  // when it goes badly for you, or too well (the King's words, or the dark's below the pit)
  lowHp: [[KING, 'I CAN SMELL THE ASH ON YOU ALREADY.']],
  lowHpDeep: [[VOID, 'YES. LET GO. THE DARK IS SOFT.']],
  combo: [[KING, 'YOU DANCE WELL. THEY ALL DANCE WELL, AT FIRST.']],
  comboDeep: [[VOID, 'SUCH A BRIGHT LITTLE FIRE. YOU WILL KEEP ME WARM FOR A WHILE.']],
  warden: [[KING, 'WHEN THE ASH CAME, MY WARDEN LOCKED HIMSELF IN WITH IT SO NOTHING WOULD GET OUT.'], [KING, 'HE STILL HOLDS THE KEYS.']],
  wardenDead: [[KING, 'STUBBORN. GOOD. THE STUBBORN ONES BURN THE LONGEST.']],
  brood: [[KING, 'SHE NESTS IN THE WALLS ABOVE MY THRONE, AND HER CHILDREN ARE HUNGRY.']],
  broodDead: [[KING, 'YOU KILLED MY PET. I HAVE AN ARMY OF THEM.']],
  colossus: [[KING, 'I BUILT IT TO GUARD THE SUN. IT NEVER LEARNED HOW TO STOP. NEITHER DID I.']],
  colossusDead: [[KING, 'ENOUGH. COME DOWN TO MY THRONE. I WILL MEET YOU MYSELF.']],
  kingBurns: [[KING, 'YOU THINK YOU CAN PUT OUT THE SUN?']],
  kingUnbound: [[KING, 'I WILL NOT GO BACK INTO THE DARK!']],
  kingDead: [[KING, 'THE DARK... I HELD IT DOWN SO LONG... IT IS SO COLD...']],
  // below the pit, the dark he was afraid of
  deeper: [[VOID, 'A LITTLE LIGHT, FALLING INTO ME. HOW BRAVE. HOW BRIEF.']],
  w23: [[VOID, 'EVERY FIRE GOES OUT, LITTLE LIGHT. I AM WHERE THEY ALL GO.']],
  w27: [[VOID, 'YOUR KING SWALLOWED A SUN TO HIDE FROM ME. YOU CAME TO ME ON PURPOSE.']],
  w33: [[VOID, 'I WAS HERE BEFORE THE FIRST DAWN. I WILL BE HERE AFTER THE LAST.']],
  w37: [[VOID, 'YOU ARE TIRED. I CAN FEEL IT. REST. ONLY REST.']],
  w43: [[VOID, 'ABOVE YOU THEY SLEEP SAFE. THEY DO NOT EVEN KNOW YOUR NAME.']],
  w47: [[VOID, 'SO STUBBORN. SO BRIGHT. I THINK I WILL KEEP YOU.']],
  // the floors below the pit, as the dark shows them to you (the first wave of each, after its arrival)
  w26: [[VOID, 'FEEL THAT COLD? THIS IS THE WORLD WITHOUT A SUN. THIS IS WHAT I AM.']],
  w31: [[VOID, 'LOOK AROUND, LITTLE LIGHT. A THOUSAND OF YOU, AND NOT ONE IS GOING HOME.']],
  w36: [[VOID, 'THEY PRAYED TO THE SUN DOWN HERE, ONCE. I WAS THE ONE WHO ANSWERED.']],
  w41: [[VOID, 'HEAR THE GEARS? EVERY TICK IS ONE LESS BREATH FOR YOU.']],
  w46: [[VOID, 'NO MORE FLOORS, LITTLE LIGHT. THIS IS THE BOTTOM. THIS IS ME.']],
  wyrm: [[VOID, 'THE FIRST THING I EVER SWALLOWED.'], [VOID, 'IT SWIMS THROUGH STONE THE WAY YOU SWIM THROUGH AIR.']],
  herald: [[VOID, 'HIS HERALD ONCE CALLED THE WHOLE KINGDOM TO SEE THE SUN KING CROWNED.'], [VOID, 'I TOOK HIS VOICE. NOW IT CALLS THE STORM.']],
  mirror: [[VOID, 'IT WATCHED YOU ALL THE WAY DOWN, LITTLE LIGHT.'], [VOID, 'IT KNOWS HOW YOU MOVE. IT KNOWS HOW YOU TIRE.']],
  eclipse: [[VOID, 'YOU FREED HIS SUN, SO I MADE ONE OF MY OWN. IT HAS AN EYE.']],
  clock: [[VOID, 'YOUR KING ASKED HIS CLOCKMAKER TO STOP TIME.'], [VOID, 'SO THE SUN WOULD NEVER GROW OLD. I FINISHED THE WORK.']],
  // wave 50: the dark gives itself a shape and a name
  wyrmDead: [[VOID, 'IT WAS ALWAYS HUNGRY. SO AM I.']],
  heraldDead: [[VOID, 'LISTEN. NO ONE ANNOUNCES YOU DOWN HERE. NO ONE WILL REMEMBER YOU CAME.']],
  mirrorDead: [[VOID, 'YOU BROKE YOUR OWN FACE TO GET PAST IT. YOU ARE BECOMING LIKE ME.']],
  eclipseDead: [[VOID, 'MY SUN WAS BLIND ANYWAY. I NEVER NEEDED TO SEE YOU TO TAKE YOU.']],
  clockDead: [[VOID, 'TIME MOVES AGAIN. GOOD. EVERY SECOND OF IT BELONGS TO ME.']],
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
  // the floors below the pit: each fighter answers the dark as they arrive
  w26: {
    BLADE: "THEN I'LL CARRY THE EMBER THROUGH IT. COLD NEVER STOPPED A FIRE.",
    GUNNER: "I'VE SLEPT IN WORSE. DESERT NIGHTS GET COLD TOO.",
    WIZARD: 'THE STARS ARE COLD AS WELL, AND STILL THEY SHINE.',
    NINJA: "IT'S FINE. I'LL JUST RUN FASTER. ...WAIT, IS THE FLOOR ICE?",
    MECHANIC: "COLD KEEPS MY ENGINES HAPPY. YOU'RE DOING ME A FAVOR.",
    TANK: 'MY ARMOR HAS KNOWN WORSE WINTERS. KEEP TALKING.',
    ROBOT: 'TEMPERATURE LOGGED. OPERATING LIMITS NOT REACHED.',
    DEV: 'WHO PUT AN ICE LEVEL IN HERE? ...RIGHT. ME.',
  },
  w31: {
    BLADE: 'ONE OF US IS. THE ONE HOLDING THE SWORD.',
    GUNNER: "A THOUSAND OF ME? THAT'S A LOT OF BOUNTIES TO SPLIT.",
    WIZARD: 'A MIRROR SHOWS ONLY WHAT IS. THE STARS SHOW WHAT WILL BE.',
    NINJA: 'OKAY, BUT MY HAIR LOOKS AMAZING IN ALL OF THEM.',
    MECHANIC: 'HUH. I NEED A SHOWER. A THOUSAND SHOWERS.',
    TANK: 'I SEE AN OLD MAN IN ARMOR. HE IS STILL STANDING.',
    ROBOT: 'REFLECTIONS ARE NOT HOSTILE. PROCEEDING.',
    DEV: 'THIS ROOM IS GOING TO MURDER THE FRAME RATE.',
  },
  w36: {
    BLADE: 'THE SUN IS FREE NOW. YOUR TEMPLE IS EMPTY.',
    GUNNER: 'PREACHERS AND MONSTERS. SAME HUSTLE, DIFFERENT HATS.',
    WIZARD: 'I KNOW THIS PLACE. THE STARS WROTE IT DOWN BEFORE YOU ATE IT.',
    NINJA: 'A TEMPLE? QUICK, I NEED TO PRAY FOR MY MATH GRADE.',
    MECHANIC: "GOLD FLOORS. I'M TAKING A SAMPLE. OR TEN.",
    TANK: 'THE KING WAS CROWNED IN A TEMPLE LIKE THIS. I HELD HIS SWORD.',
    ROBOT: 'NO DEITY DETECTED. ONLY YOU.',
    DEV: 'THIS IS WHERE I PUT ALL THE LORE. NOBODY READS THE LORE.',
  },
  w41: {
    BLADE: "THEN I'LL MAKE EVERY BREATH COUNT.",
    GUNNER: "TICK TOCK. I'VE OUTRUN CLOCKS BEFORE.",
    WIZARD: 'TIME IS OLD, AND SO AM I. WE UNDERSTAND EACH OTHER.',
    NINJA: 'UGH, CLOCKS. THIS IS GIVING ME EXAM FLASHBACKS.',
    MECHANIC: 'OH, I LOVE THIS PLACE. LOOK AT THOSE TOLERANCES.',
    TANK: 'I STOOD WATCH FOR TWENTY YEARS. I KNOW HOW TO WAIT.',
    ROBOT: 'INTERNAL CLOCK SYNCHRONIZED. COUNTING DOWN TO YOU.',
    DEV: "THIS LEVEL HAS A TIMER BUG. PLEASE DON'T LOOK AT IT.",
  },
  w46: {
    BLADE: 'THEN THIS IS WHERE THE EMBER BURNS BRIGHTEST.',
    GUNNER: "BOTTOM OF THE PIT, BIGGEST BOUNTY. LET'S DANCE.",
    WIZARD: 'EVEN HERE I CAN SEE THE STARS. THEY ARE ON MY SIDE.',
    NINJA: "IF I WIN THIS, I'M SKIPPING SCHOOL FOR A WEEK.",
    MECHANIC: 'NO MORE FLOORS? GOOD. MY LEGS ARE KILLING ME.',
    TANK: 'MY OATH ENDS WHERE YOU DO. I CAN SEE THE END FROM HERE.',
    ROBOT: 'FINAL DEPTH REACHED. FINAL ORDER: HOLD THE LIGHT.',
    DEV: "LAST LEVEL. I NEVER FINISHED THE ART FOR IT. JUST... STARS.",
  },
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
const STORY_TALK = new Set(['w3', 'w6', 'w8', 'w11', 'w13', 'w16', 'w18', 'w23', 'w26', 'w27', 'w31', 'w33', 'w36', 'w37', 'w41', 'w43', 'w46', 'w47']);
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
  TANK: { warden: 'HE WAS A GOOD WARDEN ONCE. REST NOW, BROTHER.', brood: 'SHE NESTED IN THE WALLS ABOVE THE THRONE ROOM. I HEARD HER EVERY NIGHT ON WATCH.', colossus: 'I KNOW THE WAY TO YOUR THRONE. I GUARDED IT.' },
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
const SMALL_W = 114, STORY_W = 232;
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
// where a boss's face is in its sprite (x, y and the square's size, as fractions of the sprite's width), so the whole
// head shows, crown and all; fractions keep it framed whenever the boss is drawn bigger or smaller
const FACE_BOX = { king: [0.25, 0, 0.52], nox: [0.27, 0.045, 0.46] };
function bossFace(s, box, x, y) { const w = s.n.width, [fx, fy, fs] = box; ctx.drawImage(s.n, Math.round(fx * w), Math.round(fy * w), Math.round(fs * w), Math.round(fs * w), x, y, 24, 24); }
function face(who, x, y) {
  rect(x, y, 24, 24, '#05030a');
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, 24, 24); ctx.clip();
  if (who === KING) {
    const s = SPR.king?.[Math.floor(G.time * 2) % 2];
    if (s) { glow(x + 12, y + 14, P.ember, 14, 0.3); bossFace(s, FACE_BOX.king, x, y); }
  } else if (who === VOID) {
    // nothing to see but two eyes in the dark, blinking now and then
    const open = (G.time % 3.1) > 0.12;
    for (const ex of [8, 15]) { glow(x + ex, y + 12, '#b48cff', 5, 0.5); if (open) rect(x + ex - 1, y + 11, 3, 2, '#e8dcff'); else rect(x + ex - 1, y + 12, 3, 1, '#b48cff'); }
  } else if (who === NOX) {
    // Nox's hood, with its crown of dead stars and its eyes
    const s = SPR.nox?.[Math.floor(G.time * 2) % 2];
    if (s) { glow(x + 12, y + 12, '#b48cff', 14, 0.3); bossFace(s, FACE_BOX.nox, x, y); }
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
  k.wrap ??= wrapText(s, SMALL_W);
  const lines = k.wrap, bw = Math.max(textW(name), ...lines.map((l) => textW(l))) + 7, bh = 8 + lines.length * 6;
  const x = Math.round(W / 2 - bw / 2), y = 2 - Math.round((1 - ease(k.in)) * (bh + 4));
  rect(x - 1, y - 1, bw + 2, bh + 2, P.ink0); rect(x, y, bw, bh, '#0c0911'); rect(x, y, 2, bh, col);
  text(name, x + 4, y + 1, col, 1);
  let n = Math.min(s.length, Math.floor(k.t * CPS));
  lines.forEach((l, i) => { if (n > 0) text(l.slice(0, n), x + 4, y + 8 + i * 6, P.paper, 1); n -= l.length + 1; });
}
// the story: a wide box along the bottom with the speaker's face; the screen dims a little while the fight waits
function storyBox(k) {
  const [who, s] = k.q[k.i], col = colOf(who);
  k.wrap ??= wrapText(s, STORY_W);
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
      // the ledge in front, and the fighters on it: night, so they stand in shadow, lit only along the side that faces
      // the burning pit, their shadows thrown back away from it. Grom leads, at the very edge, nearest of them all.
      const ly = PY + PH - 12;
      rect(PX, ly, 96, 12, '#0a0508');
      for (let x = 0; x < 96; x += 4) rect(PX + x, ly - (hash(x) * 3 | 0), 4, 3, '#0a0508');
      for (let x = 96; x < 108; x++) rect(PX + x, ly + (x - 96), 1, 12, '#0a0508');
      glow(PX + 104, ly + 2, P.ember, 34, 0.16);
      for (const [id, dx, dy, k] of [['GUNNER', 16, -1, 0.6], ['NINJA', 34, -2, 1.2], ['BLADE', 52, -1, 1.8], ['TANK', 78, 2, 0]]) backlit(id, PX + dx, ly + dy, t + k);
    },
  },
];
const TORCH_AT = (k) => 0.9 + k * 0.18;
// a fighter at the pit's edge at night: their shadow on the ground, thrown away from the pit; their shape lit in ember
// a pixel toward it; themselves dark (where a browser can't darken a picture, a dark veil over the body does it)
function backlit(id, x, y, t) {
  ctx.globalAlpha = 0.75; ell(x - 6, y + 1, 9, 1.5, '#000000'); ctx.globalAlpha = 1;
  drawFighter(id, x + 2 / 3, y, 1, { t, tint: '#7a1c10' });
  drawFighter(id, x + 1 / 3, y, 1, { t, tint: '#ff6a2a', alpha: 0.9 });
  if (typeof ctx.filter === 'string') { ctx.save(); ctx.filter = 'brightness(0.34) saturate(0.75)'; drawFighter(id, x, y, 1, { t }); ctx.restore(); }
  else { drawFighter(id, x, y, 1, { t }); drawFighter(id, x, y, 1, { t, tint: '#07030a', alpha: 0.66 }); }
}
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
      // and among them, the baker of Mill Street and his girl, rising hand in hand (the Ash Story)
      const up = t - 3.2;
      if (up > 0) {
        const cx = PX + PW / 2 + 4, y = base - 4 - up * 8, a = Math.min(1, up) * Math.max(0, 1 - up / 3.5);
        ctx.globalAlpha = a; glow(cx, y - 7, P.gold, 12, 0.5);
        folk(cx - 3, y, 1, '#fff2c0', t); folk(cx + 4, y, 0.7, '#ffe08a', t); px(cx, y - 7, '#fff2c0');
        ctx.globalAlpha = 1;
      }
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
      wrapText(line_, 96).forEach((l, i) => { if (m > 0) textO(l.slice(0, m), PX + 150, PY + 44 + i * 9, P.paper, 1, 'c', '#3a1420'); m -= l.length + 1; });
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
    draw(t, o = {}) {
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
      let n = o.off ? 0 : Math.floor(t * 14);
      LOG.forEach((l, i) => { if (n > 0) text(l.slice(0, n), PX + 124, dy - 40 + i * 8, i === 3 ? P.gold : '#39ff6a', 1); n -= l.length + 4; });
      if (!o.off && Math.floor(t * 3) % 2) rect(PX + 124, dy - 8, 3, 1, '#39ff6a');
      if (!o.off) glow(PX + 154, dy - 25, '#39ff6a', 26, 0.15);
      // coffee
      rect(PX + 196, dy - 7, 6, 7, P.paper); for (let i = 0; i < 3; i++) px(PX + 198 + Math.sin(t * 3 + i) * 1.5, dy - 9 - i * 2 - ((t * 6) % 2 | 0), '#8a8aa0');
      if (!o.away) drawFighter('DEV', PX + 90, PY + PH, 2, { t, evo: evo() });
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
      drawFighter(me(), fxp, slope(fxp) + 1, 2, t < 6 ? { anim: 'walk', t, fps: 10, evo: evo() } : { t, evo: evo() });
    },
  },
  {
    len: 7.4,
    cue: () => A.storyCue('epilogue'),
    cap: () => (EPI[me()] || EPI.BLADE).cap,
    draw(t) { (EPI[me()] || EPI.BLADE).draw(t); },
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
// ---------- going home: three pages of each fighter's own story, after the climb ----------
// Each one pays off what they said on the way down:
//   Kael    gives the ember back to the sun, buries Aurel's crown under his cold blade, and comes home to his
//           grandmother singing the old Sun King's song to the sun for the first time
//   Vega    the bounty was a poor town's last sack of coins; she keeps one coin for luck, buys the town a round, and
//           takes the road again at sundown
//   Morrow  the stars come back and answer to their names, he takes three days to name the new sun, and the stars
//           give him back the face he traded for them
//   Rin     the cherry tree at her clan's burned shrine blooms, she runs for school at 8:59, and is late anyway
//   Rivet   she and Big Guy haul the Colossus core out of the pit, build a windmill from it, and light the town
//   Grom    he carves his King's tomb, stands one last watch, lays down his hammer and walks home to a lit window
//   Unit-7  no orders remain; a child gives it a flower to keep safe; it keeps that order for a thousand sunrises
//   Dev     a last patch closes the pit (one warning: something below still runs), everyone goes in the credits,
//           even the ash, and he logs off to see the real sun
const NIGHT_SKY = ['#05020a', '#0c0a1e', '#1a1838'], DAWN_SKY = ['#2a1838', '#7a3a4a', '#e08a4a'];
const DAY_SKY = ['#8ad0ff', '#ffe0a0', '#ffb070'], DUSK_SKY = ['#3a1838', '#a04a4a', '#ff9a4a'];
// days going by, one every `per` seconds: the sky turns, the sun arcs over, the stars come out at night
function daysGo(t, per) {
  const u = (t / per) % 1;
  sky(PX, PY, PW, PH, u < 0.1 ? DAWN_SKY : u < 0.48 ? DAY_SKY : u < 0.58 ? DUSK_SKY : NIGHT_SKY);
  if (u >= 0.58) for (let i = 0; i < 18; i++) px(PX + hash(i) * PW, PY + hash(i + 40) * 56, i % 3 ? '#8a84c0' : P.paper);
  else { const a = Math.PI * (u / 0.58); sun(PX + PW / 2 - Math.cos(a) * 92, PY + PH - 18 - Math.sin(a) * 74, 8, t, { ga: 0.3 }); }
  return u;
}
// a little house: walls, a roof, a window (lit, or dark), a door
function cottage(x, base, w, h, wall, roof, lit) {
  rect(x, base - h, w, h, wall);
  for (let i = 0; i < Math.ceil(w / 2) + 2; i++) rect(x - 2 + i, base - h - i, w + 4 - i * 2, 1, roof);
  rect(x + 4, base - h + 5, 6, 5, lit || '#2a1e22');
  if (lit) glow(x + 7, base - h + 7, lit, 9, 0.35);
  rect(x + w - 10, base - 10, 6, 10, '#3a2418');
}
// a music note
function note(x, y, col) { rect(x, y, 2, 2, col); rect(x + 1, y - 4, 1, 5, col); px(x + 2, y - 4, col); px(x + 3, y - 3, col); }
// a floating terminal window, its lines typing out (a line in col2 if it starts with '!')
function term(x, y, w, lines, t, cps = 16) {
  const h = lines.length * 8 + 7;
  ctx.globalAlpha = 0.86; rect(x, y, w, h, '#06120a'); ctx.globalAlpha = 1;
  rect(x, y, w, 1, '#39ff6a'); rect(x, y + h - 1, w, 1, '#1a5a2a'); rect(x, y, 1, h, '#1a5a2a'); rect(x + w - 1, y, 1, h, '#1a5a2a');
  let n = Math.floor(t * cps);
  lines.forEach((l, i) => {
    const warn = l[0] === '!', s = warn ? l.slice(1) : l;
    if (n > 0) text(s.slice(0, n), x + 4, y + 4 + i * 8, warn ? '#b48cff' : '#39ff6a', 1);
    n -= s.length + 3;
  });
  if (Math.floor(t * 3) % 2 && n > 0) rect(x + 4, y + 4 + lines.length * 8 - 2, 3, 1, '#39ff6a');
}
// Big Guy, Rivet's mech: a squat walker with an orange stripe and a cyan cockpit
function mech(x, base, t, walking) {
  const st = walking ? Math.sin(t * 7) : 0, bob = walking ? Math.abs(Math.cos(t * 7)) : 0;
  rect(x - 7, base - 8 - Math.max(0, st) * 2, 4, 8, '#4a4652'); rect(x + 3, base - 8 - Math.max(0, -st) * 2, 4, 8, '#4a4652');
  const by = base - 24 - bob;
  rect(x - 10, by, 20, 16, '#6a6470'); rect(x - 10, by, 20, 2, '#8a8490'); rect(x - 10, by + 10, 20, 2, '#ff9a3c');
  rect(x - 4, by + 3, 8, 5, '#62efff'); glow(x, by + 5, '#62efff', 6, 0.4);
  rect(x - 14, by + 3, 4, 10, '#5a5460'); rect(x + 10, by + 3, 4, 10, '#5a5460');
}
// the little person from the Ash Story, used for townsfolk; a child is k 0.7
const kid = (x, base, col, t, o) => folk(x, base, 0.7, col, t, o);

const HOMES = {
  BLADE: [
    {
      // the ember lifts off his raised blade and flies home into the new sun
      len: 7.4, cue: () => A.storyCue('freed'),
      cap: ['FOR A HUNDRED YEARS HIS FAMILY KEPT ONE EMBER', 'OF THE OLD SUN ALIVE IN HIS BLADE.', 'KAEL RAISED IT, AND LET THE EMBER GO HOME.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffd9a0', '#ffb070', '#e07050']);
        const sx = PX + 176, sy = PY + 28, gy = PY + PH - 14, k = clamp01((t - 1.4) / 2.8);
        const flare = t > 4.2 ? Math.max(0, 1 - (t - 4.2) / 1.4) : 0;
        sun(sx, sy, 12 + flare * 3, t, { ga: 0.35 + flare * 0.4 });
        if (flare > 0) { ctx.globalAlpha = flare; ring(sx, sy, 14 + (1 - flare) * 26, 1, P.gold); ring(sx, sy, 10 + (1 - flare) * 40, 1, P.paper); ctx.globalAlpha = 1; }
        ground(gy, '#4a3a2a', '#6aa84a');
        const [hx, hy, wa] = drawFighter('BLADE', PX + 74, gy + 1, 2, { t, wa: -1.2, front: true, evo: evo() }) || [PX + 80, gy - 20, -1.2];
        const tx = hx + Math.cos(wa) * 13, ty = hy + Math.sin(wa) * 13;
        // the path: up and over to the sun
        const at = (u) => { const cx = PX + 118, cy = PY + 2, a = (1 - u) ** 2, b = 2 * u * (1 - u), c = u * u; return [a * tx + b * cx + c * sx, a * ty + b * cy + c * sy]; };
        if (t < 1.4) { const f = 0.7 + 0.3 * Math.sin(t * 20); glow(tx, ty, '#ff6a2a', 10 + f * 4, 0.9); disc(tx, ty, 2.5, '#ff6a2a'); disc(tx, ty, 1.5, P.ember3); }
        else if (k < 1) {
          for (let j = 16; j >= 1; j--) { const [x, y] = at(Math.max(0, ease(k) - j * 0.02)); ctx.globalAlpha = 1 - j / 17; rect(x + Math.sin(t * 9 + j) * 1.5, y, 2, 2, j % 3 ? '#ff6a2a' : P.gold); }
          ctx.globalAlpha = 1;
          const [x, y] = at(ease(k)); glow(x, y, '#ff6a2a', 12, 0.9); disc(x, y, 3, '#ff6a2a'); disc(x, y, 2, P.ember3); px(x, y, P.paper);
        }
      },
    },
    { len: 7.4, cue: () => A.storyCue('aurel'), cap: ['HE BURIED THE CROWN ON THE HILL WHERE AUREL', 'HAD WATCHED THE DAWN AS A BOY,', 'AND LEFT HIS COLD BLADE STANDING OVER IT.'], draw: (t) => EPI.BLADE.draw(t) },
    {
      // home: his grandmother at her door, singing, notes drifting up into the evening
      len: 8, cue: () => A.endingCue(1),
      cap: ['AT HOME, HIS GRANDMOTHER WAS SINGING THE OLD SONG.', 'FOR THE FIRST TIME IN HER LIFE,', 'SHE SANG IT TO THE SUN.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#6a3a5a', '#e07a5a', '#ffc07a']);
        sun(PX + 34, PY + PH - 26, 13, t, { ga: 0.4 });
        const gy = PY + PH - 12;
        ground(gy, '#3a3a2a', '#5a8a3a');
        cottage(PX + 140, gy, 46, 30, '#7a5a4a', '#5a2a2a', '#ffd98a');
        const gx = PX + 136, arrive = clamp01(t / 4.6);
        folk(gx, gy, 0.95, '#d8c8d8', t, t > 4.6 ? { arm: [-6, -1] } : {});
        rect(gx - 2, gy - 14, 5, 2, '#a898b0');
        for (let i = 0; i < 7; i++) { const u = (t * 0.25 + i / 7) % 1; ctx.globalAlpha = Math.sin(u * Math.PI); note(gx + 2 + u * 34 + Math.sin(t * 2 + i) * 4, gy - 18 - u * 52, i % 2 ? P.gold : P.paper); }
        ctx.globalAlpha = 1;
        const kx = PX + 24 + ease(arrive) * 84;
        drawFighter('BLADE', kx, gy + 1, 2, arrive < 1 ? { anim: 'walk', t, fps: 10, evo: evo() } : { t, evo: evo() });
      },
    },
  ],

  GUNNER: [
    {
      // the town's poster comes down off the board and blows away
      len: 7.2, cue: () => A.storyCue('stamp'),
      cap: ['THE BOUNTY ON THE ASHEN KING WAS POSTED BY A TOWN', 'THAT HAD NOTHING LEFT BUT ONE SACK OF COINS.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffd9a0', '#ffb070', '#c06a50']);
        const gy = PY + PH - 14;
        for (const [x, w, h] of [[2, 30, 34], [36, 26, 26], [168, 30, 38], [200, 24, 28]]) { rect(PX + x, gy - h, w, h, '#8a5a3a'); rect(PX + x, gy - h, w, 2, '#5a3a2a'); rect(PX + x + 6, gy - h + 8, 8, 7, '#3a2418'); }
        ground(gy, '#a07a50', '#c09a60');
        // the sheriff's board
        const bx = PX + 104;
        rect(bx, gy - 40, 3, 40, '#5a3a2a'); rect(bx + 40, gy - 40, 3, 40, '#5a3a2a'); rect(bx - 2, gy - 44, 47, 28, '#6a4a30');
        const off = t > 3.8, pk = clamp01((t - 3.8) / 2.6);
        const px0 = off ? bx + 6 - pk * 120 : bx + 6, py0 = off ? gy - 41 + Math.sin(pk * 12) * 6 - pk * 10 : gy - 41, sq = off ? Math.abs(Math.cos(pk * 14)) : 1;
        const pw = Math.max(2, Math.round(31 * sq));
        rect(px0 + (31 - pw) / 2, py0, pw, 24, '#e8d8b0');
        if (sq > 0.6) { text('WANTED', px0 + 4, py0 + 2, '#6a2a1a', 1); crown(px0 + 16, py0 + 15, t); text('1 SACK', px0 + 4, py0 + 17, '#3a2a1a', 1); }
        // a tumbleweed
        const tw = PX + 240 - ((t * 40) % 300); ring(tw, gy - 4, 4, 1, '#a08050'); ring(tw, gy - 4, 2, 1, '#806040');
        const arrive = clamp01(t / 3);
        drawFighter('GUNNER', PX + 214 - ease(arrive) * 34, gy + 1, 2, arrive < 1 ? { anim: 'walk', t, fps: 10, flip: true, evo: evo() } : { t, flip: true, evo: evo() });
      },
    },
    { len: 7.6, cue: () => A.storyCue('gather'), cap: ['VEGA TOOK ONE COIN, FOR LUCK.', 'THE REST BOUGHT THE BIGGEST ROUND', 'THE TOWN HAD EVER DRUNK.'], draw: (t) => EPI.GUNNER.draw(t) },
    {
      // down the long road into the sunset, smaller and smaller
      len: 7.6, cue: () => A.storyCue('rise'),
      cap: ['BY SUNDOWN SHE WAS ON THE ROAD AGAIN.', 'SOMEWHERE, SOMEONE ALWAYS NEEDS A HUNTER.'],
      draw(t) {
        const hz = PY + 54, vx = PX + 110;
        sky(PX, PY, PW, hz - PY, DUSK_SKY);
        ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, hz - PY); ctx.clip(); sun(vx, hz - 6 + ease(t / 7.6) * 14, 12, t, { ga: 0.45 }); ctx.restore();
        rect(PX, hz, PW, PY + PH - hz, '#7a5038');
        for (let y = hz; y < PY + PH; y++) { const w = 2 + (y - hz) * 1.5; rect(vx - w / 2, y, w, 1, '#4a3024'); if ((y - hz + Math.floor(t * 20)) % 6 < 2) rect(vx, y, 1, 1, '#d8c090'); }
        for (const [x, h] of [[24, 16], [40, 10], [180, 20], [198, 12]]) { rect(PX + x, hz - h + 6, 3, h, '#3a2a2a'); rect(PX + x - 3, hz - h + 10, 3, 2, '#3a2a2a'); rect(PX + x + 3, hz - h + 8, 3, 2, '#3a2a2a'); }
        const u = ease(t / 7.6), y = PY + PH - 6 - u * (PY + PH - 6 - hz - 6), s = 2 - u * 1.25;
        ctx.globalAlpha = 0.35; rect(vx - 1, y, 3, 10 * s, '#2a1a14'); ctx.globalAlpha = 1;
        drawFighter('GUNNER', vx, y, s, { anim: 'walk', t, fps: 9, evo: evo() });
      },
    },
  ],

  WIZARD: [
    {
      // the first night with stars: each one lights as he names it
      len: 8, cue: () => A.storyCue('epilogue'),
      cap: ['THE NEXT NIGHT, THE STARS CAME BACK.', 'MORROW CALLED EACH ONE BY ITS NAME,', 'AND EACH ONE ANSWERED.'],
      draw(t) {
        sky(PX, PY, PW, PH, NIGHT_SKY);
        const NAMES = ['VESPER', 'ORIN', 'ALDA', 'KESS', 'MIRA', 'TAVEN', 'SOLE', 'IVRA', 'NUL', 'EMBERLIGHT', 'HANE', 'CORVUS'];
        const POS = [[14, 40], [40, 14], [62, 34], [92, 10], [118, 28], [150, 12], [176, 32], [24, 64], [56, 56], [100, 50], [136, 58], [196, 8]];
        const st = NAMES.map((n, i) => [PX + POS[i][0], PY + POS[i][1], 0.5 + i * 0.5, n]);
        for (let i = 0; i + 1 < st.length; i++) if (i % 4 !== 3 && t > st[i + 1][2] + 0.4) { ctx.globalAlpha = 0.35; line(st[i][0], st[i][1], st[i + 1][0], st[i + 1][1], '#5a5a9a'); ctx.globalAlpha = 1; }
        for (const [x, y, at, n] of st) {
          if (t < at) continue;
          const u = t - at, tw = Math.floor(t * 3 + x) % 5 ? 1 : 0.5;
          if (u < 0.3) glow(x, y, P.paper, 8 * (1 - u / 0.3) + 2, 0.6);
          px(x, y, tw > 0.6 ? P.paper : '#c8c0ff'); px(x - 1, y, '#6a6ab0'); px(x + 1, y, '#6a6ab0'); px(x, y - 1, '#6a6ab0'); px(x, y + 1, '#6a6ab0');
          if (u < 0.9) { ctx.globalAlpha = Math.min(1, (0.9 - u) * 3); text(n, Math.min(x + 4, PX + PW - textW(n) - 2), y - 3, '#c8c0ff', 1); ctx.globalAlpha = 1; }
        }
        ell(PX + 170, PY + PH + 14, 80, 30, '#14122a');
        drawFighter('WIZARD', PX + 168, PY + PH - 14, 2, { t, wa: -1.3, front: true, evo: evo() });
      },
    },
    {
      len: 8, cue: () => A.loreCue(0),
      cap: ["AT DAWN HE BEGAN TO SAY THE NEW SUN'S NAME.", 'IT TOOK HIM THREE DAYS.'],
      draw(t) { EPI.WIZARD.draw(t); textO('DAY ' + Math.min(3, 1 + Math.floor(t / 2.4)), PX + 8, PY + 6, P.gold, 1, 'l'); },
    },
    {
      // the pond at dawn: his reflection has a face again
      len: 8.2, cue: () => A.storyCue('freed'),
      cap: ['WHEN HE WAS DONE, THE STARS GAVE BACK', 'WHAT HE HAD TRADED FOR THEIR NAMES.', 'HE HAD FORGOTTEN HE COULD SMILE.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffd9a0', '#ffc0a0', '#c08aa0']);
        sun(PX + 186, PY + 26, 10, t, { ga: 0.35 });
        const wy = PY + 74, mx = PX + 92;
        ground(wy, '#3a5a3a', '#5a8a4a');
        ell(PX + 112, wy + 16, 70, 16, '#2a4a7a'); ell(PX + 112, wy + 15, 64, 13, '#3a6a9a');
        // the reflection, upside down in the water
        ctx.save(); ctx.beginPath(); ctx.rect(PX, wy + 1, PW, 40); ctx.clip();
        ctx.translate(0, 2 * wy + 2); ctx.scale(1, -1);
        ctx.globalAlpha = 0.55; drawFighter('WIZARD', mx, wy, 2, { t, bare: true, evo: evo() }); ctx.globalAlpha = 1;
        ctx.restore();
        for (let i = 0; i < 3; i++) { const r = ((t * 10 + i * 8) % 26); ctx.globalAlpha = 1 - r / 26; ring(mx, wy + 10, r, 1, '#8ab0e0'); ctx.globalAlpha = 1; }
        // the face the stars gave back, coming clear in the reflection
        const f = clamp01((t - 2.6) / 1.6);
        if (f > 0) {
          const fx = mx + 1, fy = wy + 22;
          ctx.globalAlpha = f;
          rect(fx - 3, fy - 3, 7, 6, '#e8c8a8'); px(fx - 2, fy - 1, '#2a1a1a'); px(fx + 2, fy - 1, '#2a1a1a');
          rect(fx - 3, fy + 3, 7, 3, '#f0f0f0'); rect(fx - 2, fy + 6, 5, 1, '#f0f0f0');
          px(fx - 1, fy + 2, '#8a4a3a'); px(fx, fy + 2, '#8a4a3a'); px(fx + 1, fy + 2, '#8a4a3a');
          ctx.globalAlpha = 1;
          for (let i = 0; i < 6; i++) { const a = t * 2 + (i * TAU) / 6; ctx.globalAlpha = f * 0.8; px(fx + Math.cos(a) * 9, fy + Math.sin(a) * 6, P.gold); ctx.globalAlpha = 1; }
        }
        drawFighter('WIZARD', mx, wy, 2, { t, bare: true, evo: evo() });
      },
    },
  ],

  NINJA: [
    {
      // her clan's burned shrine; the old cherry tree flowers as the sun reaches it
      len: 7.6, cue: () => A.storyCue('aurel'),
      cap: ["RIN WENT TO THE RUINS OF HER CLAN'S SHRINE FIRST.", 'THE OLD CHERRY TREE BLOOMED FOR THE FIRST TIME', 'IN A HUNDRED YEARS.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffe6f0', '#ffd0d8', '#e8a0b0']);
        sun(PX + 190, PY + 22, 9, t, { ga: 0.3 });
        const gy = PY + PH - 14;
        ground(gy, '#6a5a4a', '#8aa86a');
        // the torii gate, charred
        const gx = PX + 128;
        rect(gx, gy - 36, 4, 36, '#c0302a'); rect(gx + 30, gy - 36, 4, 36, '#c0302a');
        rect(gx - 6, gy - 40, 46, 4, '#c0302a'); rect(gx - 8, gy - 43, 50, 3, '#2a1a1a'); rect(gx - 2, gy - 31, 38, 3, '#a02a24');
        for (const [x, y] of [[1, 20], [31, 12], [8, -39], [24, -40], [2, 6]]) rect(gx + x, gy - Math.abs(y) - (y < 0 ? 0 : 0), 2, 3, '#2a1010');
        // the tree: bare branches, then blossom
        const tx = PX + 52;
        rect(tx, gy - 30, 4, 30, '#4a2a2a');
        for (const [dx, dy] of [[-16, -42], [14, -46], [-6, -50], [20, -34], [-20, -30]]) line(tx + 2, gy - 28, tx + dx, gy + dy, '#4a2a2a');
        for (let i = 0; i < 130; i++) {
          if (t < 1 + i * 0.022) continue;
          const a = hash(i) * TAU, r = 3 + hash(i + 9) * 20, x = tx + 2 + Math.cos(a) * r * 1.3, y = gy - 40 + Math.sin(a) * r * 0.6;
          rect(x, y, 2, 2, i % 3 ? '#ff9fc0' : '#ffd0e0');
        }
        if (t > 3.2) for (let i = 0; i < 16; i++) { const u = (t * 0.3 + hash(i + 2)) % 1; px(tx - 20 + hash(i + 5) * 60 + u * 50, gy - 46 + u * 46 + Math.sin(t * 3 + i) * 2, i % 2 ? '#ff9fc0' : '#ffd0e0'); }
        drawFighter('NINJA', PX + 92, gy + 1, 2, { t, flip: true, evo: evo() });
      },
    },
    {
      // the run to school: the street flies by, the bakery on Mill Street is open, the clock reads 8:59
      len: 6.8, cue: () => A.storyCue('choose'),
      cap: ['THEN SHE RAN. SCHOOL STARTED AT NINE.', 'IT WAS EIGHT FIFTY-NINE.'],
      draw(t) {
        sky(PX, PY, PW, PH, DAY_SKY);
        const gy = PY + PH - 12, cx = PX + 186;
        // the clock tower, far off
        rect(cx - 8, PY + 20, 16, gy - PY - 20, '#c8b8a8'); disc(cx, PY + 30, 6, '#ffffff'); ring(cx, PY + 30, 6, 1, '#4a3a3a');
        const m = Math.min(1, t / 6.2), ma = -Math.PI / 2 - 0.105 * (1 - m);
        line(cx, PY + 30, cx + Math.cos(ma) * 5, PY + 30 + Math.sin(ma) * 5, '#2a1a1a'); line(cx, PY + 30, cx + Math.cos(-Math.PI / 2 + TAU * 0.75) * 3, PY + 30 + Math.sin(-Math.PI / 2 + TAU * 0.75) * 3, '#2a1a1a');
        if (t > 6.2 && Math.floor(t * 6) % 2) textO('DING', cx, PY + 10, P.paper, 1, 'c');
        // the street scrolling by
        const off = t * 70;
        for (let i = 0; i < 8; i++) {
          const x = PX + ((i * 52 - off) % 416 + 416) % 416 - 60, h = 28 + hash(i) * 22, bakery = i === 3;
          rect(x, gy - h, 44, h, bakery ? '#a06a4a' : i % 2 ? '#d8c0a8' : '#c0a890');
          rect(x + 6, gy - h + 8, 10, 8, bakery ? '#ffd98a' : '#8ac0e0'); rect(x + 26, gy - h + 8, 10, 8, bakery ? '#ffd98a' : '#8ac0e0');
          if (bakery) { rect(x + 4, gy - h - 6, 36, 7, '#5a2a1a'); text('BAKERY', x + 10, gy - h - 5, '#ffd98a', 1); }
        }
        ground(gy, '#a09080', '#c0b0a0');
        for (let i = 0; i < 5; i++) { const u = (t * 3 + i / 5) % 1; ctx.globalAlpha = 1 - u; disc(PX + 66 - u * 30, gy - 2 - u * 4, 2 + u * 2, '#d8d0c0'); ctx.globalAlpha = 1; }
        drawFighter('NINJA', PX + 80, gy + 1, 2, { anim: 'run', t, fps: 16, evo: evo() });
      },
    },
    { len: 7.6, cue: () => A.endingCue(1), cap: ['SHE WAS STILL LATE. HER HOMEWORK WAS SCORCHED.', 'NOBODY ASKED WHY.', 'THE SUN WAS UP, AND THAT WAS ENOUGH.'], draw: (t) => EPI.NINJA.draw(t) },
  ],

  MECHANIC: [
    {
      // hauling the Colossus core up out of the pit: Big Guy pulls, Rivet pushes
      len: 7.4, cue: () => A.storyCue('stamp'),
      cap: ['RIVET DRAGGED THE COLOSSUS CORE UP OUT OF THE PIT.', 'BIG GUY DID MOST OF THE PULLING.'],
      draw(t) {
        sky(PX, PY, PW, PH, DAWN_SKY);
        const slope = (x) => PY + PH - 8 - (x - PX) * 0.22;
        ell(PX + 6, PY + PH + 4, 40, 14, '#0a0508');
        for (let x = PX; x < PX + PW; x++) rect(x, slope(x), 1, PY + PH - slope(x) + 1, '#3a2a26');
        for (let x = PX; x < PX + PW; x += 2) px(x, slope(x), '#5a4a3a');
        const g = PX + 54 + ease(t / 7.4) * 70, mx = g + 46, sx = g + 16;
        line(sx + 8, slope(sx) - 8, mx - 10, slope(mx) - 16, '#8a8490');
        rect(sx - 8, slope(sx) - 4, 18, 4, '#5a3a2a'); disc(sx, slope(sx) - 10, 6, '#2a3a4a'); disc(sx, slope(sx) - 10, 4, '#62efff');
        glow(sx, slope(sx) - 10, '#62efff', 14, 0.5 + 0.2 * Math.sin(t * 6));
        mech(mx, slope(mx), t, true);
        for (let i = 0; i < 3; i++) { const u = (t * 2 + i / 3) % 1; ctx.globalAlpha = 1 - u; disc(sx - 10 - u * 14, slope(sx) - 2 - u * 4, 2 + u * 2, '#8a7a6a'); ctx.globalAlpha = 1; }
        drawFighter('MECHANIC', sx - 28, slope(sx - 28) + 1, 2, { anim: 'walk', t, fps: 8, evo: evo() });
      },
    },
    {
      // a week of building, days flickering by: the tower rises, the sails go on and turn
      len: 7.6, cue: () => A.storyCue('gather'),
      cap: ['SHE BUILT FOR A WEEK.', 'NOT ONE PIECE OF IT WOULD EVER BE A WEAPON AGAIN.'],
      draw(t) {
        daysGo(t, 1.1);
        const gy = PY + PH - 12, mx = PX + 130, built = Math.min(56, t * 9);
        ground(gy, '#2a2030', '#3a3040');
        for (let y = 0; y < built; y++) { const w = 6 + Math.round((56 - y) * 0.18); rect(mx - w, gy - y - 1, w * 2, 1, y % 9 ? '#6a5a50' : '#5a4a42'); }
        if (built >= 56) {
          const hy = gy - 58, spin = (t - 6.2) * 1.6;
          for (let i = 0; i < 4; i++) { const a = spin + (i * TAU) / 4; line(mx, hy, mx + Math.cos(a) * 28, hy + Math.sin(a) * 28, '#d8c8b0', 2); }
          disc(mx, hy, 3, '#62efff'); glow(mx, hy, '#62efff', 10, 0.6);
        } else for (let i = 0; i < 4; i++) { const a = hash(Math.floor(t * 12) + i) * TAU; px(mx + 4 + Math.cos(a) * 4, gy - built + Math.sin(a) * 3, i % 2 ? '#fff6c8' : '#62efff'); }
        mech(mx - 40, gy, t, false);
        drawFighter('MECHANIC', mx + 40, gy + 1, 2, { t, flip: true, wa: Math.PI + 0.7, evo: evo() });
      },
    },
    { len: 8, cue: () => A.storyCue('epilogue'), cap: ['THAT NIGHT THE WHOLE TOWN HAD LIGHT AGAIN.', 'RIVET CALLED IT HER BEST REPAIR JOB YET.'], draw: (t) => EPI.MECHANIC.draw(t) },
  ],

  TANK: [
    {
      // carving the tomb in the old palace garden, a letter at a stroke, then the crown on top
      len: 7.6, cue: () => A.storyCue('aurel'),
      cap: ['GROM BURIED HIS KING IN THE OLD PALACE GARDEN.', 'HE CARVED THE NAME HIMSELF:', 'AUREL, WHO WAS GOOD ONCE.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffe0b0', '#ffc890', '#e09070']);
        const gy = PY + PH - 14, tx = PX + 136;
        ground(gy, '#4a3a2a', '#6aa84a');
        for (const x of [12, 196]) { rect(PX + x, gy - 26, 3, 26, '#5a3a2a'); ell(PX + x + 1, gy - 28, 10, 7, t > 2 ? '#5aa84a' : '#4a4038'); }
        rect(tx - 18, gy - 30, 36, 30, '#6a6070'); rect(tx - 18, gy - 30, 36, 2, '#8a8090');
        const strokes = Math.max(0, Math.floor((t - 0.6) / 0.75));
        text('AUREL'.slice(0, Math.min(5, strokes)), tx, gy - 20, '#2a2430', 1, 'c');
        const swing = strokes < 5 ? Math.sin(t * 8.4) : 0, wa = -0.5 + swing * 0.6;
        if (strokes < 5 && swing > 0.92) for (let i = 0; i < 3; i++) px(tx - 20 + hash(Math.floor(t * 20) + i) * 4, gy - 18 + hash(i + Math.floor(t * 20)) * 6, P.paper);
        if (t > 5) crown(tx, gy - 32 - Math.max(0, 1 - (t - 5) / 0.4) * 10, t);
        drawFighter('TANK', tx - 42, gy + 1, 2, { t, wa, evo: evo() });
      },
    },
    {
      // the last watch: the stars wheel overhead, the moon crosses, his visor glows
      len: 8, cue: () => A.storyCue('hold'),
      cap: ['HE STOOD ONE LAST WATCH THROUGH THE NIGHT,', 'AS HE HAD STOOD THEM ALL FOR TWENTY YEARS.'],
      draw(t) {
        sky(PX, PY, PW, PH, NIGHT_SKY);
        const pole = [PX + 110, PY + 8];
        for (let i = 0; i < 46; i++) { const r = 12 + hash(i) * 130, a = hash(i + 7) * TAU + t * 0.12; px(pole[0] + Math.cos(a) * r, pole[1] + Math.sin(a) * r * 0.7, i % 5 ? '#6a64a0' : P.paper); }
        const ma = Math.PI * (0.15 + t / 10); disc(PX + PW / 2 - Math.cos(ma) * 90, PY + 60 - Math.sin(ma) * 46, 5, '#e8e4ff');
        const gy = PY + PH - 14, tx = PX + 140;
        ground(gy, '#1a1a24', '#2a3a2a');
        rect(tx - 18, gy - 30, 36, 30, '#3a3644'); rect(tx - 18, gy - 30, 36, 2, '#4a4654'); text('AUREL', tx, gy - 20, '#14121a', 1, 'c'); crown(tx, gy - 32, t);
        for (let i = 0; i < 6; i++) { const x = PX + 20 + hash(i) * 180 + Math.sin(t + i) * 6, y = gy - 10 - hash(i + 4) * 30 + Math.cos(t * 1.3 + i) * 4; if (Math.floor(t * 2 + i) % 3) { px(x, y, '#d8ff6a'); glow(x, y, '#d8ff6a', 3, 0.4); } }
        drawFighter('TANK', tx - 40, gy + 1, 2, { t, wa: Math.PI / 2 - 0.1, evo: evo() });
        glow(tx - 38, gy - 30, '#ffd447', 6 + Math.sin(t * 2) * 2, 0.4);
      },
    },
    {
      // dawn: the hammer laid on the tomb, and the walk home down the road to a lit window and someone waving
      len: 8.4, cue: () => A.endingCue(1),
      cap: ['AT DAWN HE LAID HIS HAMMER ON THE TOMB.', 'THEN THE OLD KNIGHT WALKED HOME.', 'SOMEONE HAD KEPT A LIGHT ON FOR HIM.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#ffe0b0', '#ffb880', '#e08060']);
        sun(PX + 190, PY + 30, 12, t, { ga: 0.4 });
        const gy = PY + PH - 12;
        ground(gy, '#4a3a2a', '#6aa84a');
        rect(PX + 14, gy - 24, 30, 24, '#6a6070'); rect(PX + 14, gy - 24, 30, 2, '#8a8090');
        ctx.save(); ctx.translate(PX + 30, gy - 27); drawWeaponAt(ctx, 'hammer', evo(), 0, 0, 0.02, false, 1); ctx.restore();
        cottage(PX + 168, gy, 40, 26, '#7a5a4a', '#5a2a2a', '#ffd98a');
        folk(PX + 180, gy, 1, '#d8c0a8', t, { arm: [5, -6 + Math.round(Math.sin(t * 8) * 2)] });
        const u = ease(t / 8), x = PX + 56 + u * 90;
        drawFighter('TANK', x, gy + 1, 1.6, u < 1 ? { anim: 'walk', t, fps: 8, bare: true, evo: evo() } : { t, bare: true, evo: evo() });
      },
    },
  ],

  ROBOT: [
    {
      // at the pit's edge, the order list runs out
      len: 7.6, cue: () => A.storyCue('hold'),
      cap: ['ORDER COMPLETE. NO ORDERS REMAIN.', 'FOR ONCE, UNIT-7 DID NOT KNOW WHAT TO DO NEXT.'],
      draw(t) {
        sky(PX, PY, PW, PH, DAY_SKY);
        const gy = PY + PH - 14;
        ground(gy, '#4a3a30', '#6a8a4a');
        ell(PX + 196, gy + 8, 40, 10, '#0a0508');
        drawFighter('ROBOT', PX + 50, gy + 1, 2, { t, evo: evo() });
        term(PX + 92, PY + 10, 120, ['> ORDER: STOP THE KING', '> STATUS: COMPLETE', '> NEXT ORDER:', '!> NONE'], t, 18);
      },
    },
    {
      // a child brings a flower and asks it to keep it safe; it plants the flower and accepts
      len: 7.8, cue: () => A.storyCue('epilogue'),
      cap: ['A CHILD GAVE IT A FLOWER AND SAID: KEEP IT SAFE.', 'NEW ORDER ACCEPTED.'],
      draw(t) {
        sky(PX, PY, PW, PH, DAY_SKY);
        const gy = PY + PH - 14, rx = PX + 60;
        ground(gy, '#4a3a30', '#6a8a4a');
        drawFighter('ROBOT', rx, gy + 1, 2, { t, evo: evo() });
        const come = ease(clamp01(t / 2.6)), leave = clamp01((t - 5.6) / 2), kx = PX + 190 - come * 98 + leave * 110;
        kid(kx, gy, '#e0c0a0', t, t < 3.4 ? { arm: [-4, -3] } : t > 5.6 ? { arm: [4, -6 + Math.round(Math.sin(t * 10) * 2)] } : {});
        // the flower: in the child's hand, then the robot's, then planted
        const fl = t < 3.4 ? [kx - 4, gy - 10] : t < 4.8 ? [rx + 12, gy - 18] : [rx + 22, gy - 1];
        rect(fl[0], fl[1], 1, 4, '#5aa84a'); px(fl[0] + 1, fl[1] + 2, '#5aa84a'); rect(fl[0] - 1, fl[1] - 3, 3, 3, '#ff9fc0'); px(fl[0] - 2, fl[1] - 2, '#ff9fc0'); px(fl[0] + 2, fl[1] - 2, '#ff9fc0'); px(fl[0], fl[1] - 2, '#ffd447');
        if (t > 4.8 && t < 5.6) glow(fl[0], fl[1], '#ff9fc0', 6, 0.5);
        if (t > 3.4) term(PX + 100, PY + 10, 118, ['> NEW ORDER:', '> KEEP IT SAFE', '!> ACCEPTED'], t - 3.4, 18);
      },
    },
    {
      // a thousand sunrises on the sea cliff: the count climbs, the flowers spread, a bird's nest on its head
      len: 8.4, cue: () => A.storyCue('rise'),
      cap: ['IT KEPT THAT ORDER FOR A THOUSAND SUNRISES.', 'THE FLOWER BECAME A MEADOW. THE BIRDS MOVED IN.'],
      draw(t) {
        EPI.ROBOT.draw(t);
        const cy = PY + 70, n = Math.min(1000, Math.round(Math.pow(clamp01(t / 7), 2.2) * 1000));
        for (let i = 0; i < Math.min(40, n / 20); i++) { const x = PX + 6 + hash(i) * 84, c = i % 3 ? '#ff9fc0' : '#ffd447'; px(x, cy - 1, '#5aa84a'); px(x, cy - 2, c); }
        if (n > 600) { rect(PX + 50, cy - 26, 9, 2, '#8a6a3a'); px(PX + 51, cy - 27, '#8a6a3a'); px(PX + 57, cy - 27, '#8a6a3a'); if (Math.floor(t * 4) % 2) { px(PX + 53, cy - 28, '#6a3a4a'); px(PX + 54, cy - 29, '#6a3a4a'); } }
        textO('SUNRISES: ' + n, PX + 8, PY + 6, P.gold, 1, 'l');
      },
    },
  ],

  DEV: [
    {
      // a last patch at the edge of the pit: it closes, with one warning
      len: 7.6, cue: () => A.storyCue('seal'),
      cap: ['THE DEV OPENED A TERMINAL AT THE EDGE OF THE PIT', 'AND PUSHED ONE LAST PATCH: CLOSE IT.', 'IT BUILT WITH ONE WARNING.'],
      draw(t) {
        sky(PX, PY, PW, PH, DAWN_SKY);
        const gy = PY + PH - 16, pk = 1 - clamp01((t - 3) / 1.8), cx = PX + 150;
        ground(gy, '#2a2030', '#3a3040');
        if (pk > 0) {
          ell(cx, gy + 6, 50 * pk, 9 * pk, '#05020a');
          for (let i = 0; i < 10 * pk; i++) rect(cx - 50 * pk + hash(i + Math.floor(t * 12)) * 100 * pk, gy + 2 + hash(i) * 8, 4, 1, i % 2 ? '#39ff6a' : '#ff4fa8');
        } else rect(cx - 30, gy + 6, 60, 1, '#4a4058');
        drawFighter('DEV', PX + 46, gy + 1, 2, { t, evo: evo() });
        term(PX + 84, PY + 8, 130, ['$ PATCH PIT --CLOSE', '$ DEPLOY', 'BUILD OK. 1 WARNING:', '!SOMETHING BELOW IS', '!STILL RUNNING'], t, 16);
      },
    },
    {
      // the credits roll up over the dawn while everyone walks by underneath
      len: 9, cue: () => A.storyCue('gather'),
      cap: ['HE PUT EVERYONE IN THE CREDITS.', 'EVEN THE ASH. ESPECIALLY THE ASH.'],
      draw(t) {
        sky(PX, PY, PW, PH, ['#2a1838', '#5a3a5a', '#c07a5a']);
        const CRED = ['ASHBLADE', '', 'KAEL', 'VEGA HALE', 'MORROW', 'RIN', 'RIVET', 'GROM', 'UNIT-7', 'THE DEV', '', 'THE BAKER OF MILL STREET', 'AND HIS GIRL', 'THE PEOPLE OF THE ASH', 'AUREL, THE SUN KING', '', 'AND YOU'];
        const gy = PY + PH - 6;
        ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, PW, gy - 30 - PY); ctx.clip();
        CRED.forEach((s, i) => { const y = gy - 24 - t * 16 + i * 10; if (s) textO(s, PX + PW / 2, y, i === 0 ? P.gold : i === CRED.length - 1 ? P.ember3 : P.paper, 1, 'c'); });
        ctx.restore();
        rect(PX, gy, PW, 6, '#2a1a20');
        ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT', 'DEV'].forEach((id, i) => {
          const x = PX - 20 + ((t * 18 + i * 30) % 260);
          drawFighter(id, x, gy + 1, 1, { anim: 'walk', t: t + i * 0.3, fps: 9, evo: id === me() && evo() });
        });
      },
    },
    {
      // back at his desk: the build shipped; he goes out of the door into the real morning
      len: 8, cue: () => A.endingCue(1),
      cap: ['THEN HE CLOSED THE LAPTOP AND WENT OUTSIDE.', 'THE REAL SUN WAS UP TOO.', 'IT HAD BEEN WAITING FOR HIM.'],
      draw(t) {
        EPI.DEV.draw(t, { off: t > 1.2, away: true });
        const open = clamp01((t - 2.4) / 1.2), dx = PX + 196, walk = clamp01((t - 3) / 3);
        rect(dx, PY + 30, 20, PY + PH - 30 - PY, '#1a1418');
        if (open > 0) {
          rect(dx + 2, PY + 32, Math.round(16 * open), PY + PH - 32 - PY, '#fff2c0');
          ctx.globalAlpha = 0.25 * open; for (let i = 0; i < 6; i++) line(dx + 2, PY + 34 + i * 12, dx - 60 * open, PY + PH, '#ffe08a'); ctx.globalAlpha = 1;
          glow(dx + 10, PY + 60, P.gold, 30 * open, 0.4 * open);
        }
        const wx = PX + 90 + ease(walk) * 108;
        if (wx < dx + 14) { ctx.save(); ctx.beginPath(); ctx.rect(PX, PY, dx + 14 - PX, PH); ctx.clip(); drawFighter('DEV', wx, PY + PH, 2, walk > 0 && walk < 1 ? { anim: 'walk', t, fps: 10, evo: evo() } : { t, evo: evo() }); ctx.restore(); }
        if (t > 6) { ctx.globalAlpha = clamp01((t - 6) / 1.6); rect(PX, PY, PW, PH, '#fff6e0'); ctx.globalAlpha = 1; }
      },
    },
  ],
};
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

// ---------- the Ash Story: the voice in the ash tells his own story, a page at a time ----------
// He kept the bakery on Mill Street; every morning his girl drew a sun in the flour. The old sun, the King's fear, the
// swallowing, the hands that turned grey, the march into the pit, the little sun she still draws in the ash, the
// fighters at the edge, and the morning that frees them. (The same voice speaks to the fighter on waves 6, 11 and 16.)
// a little person in whole pixels, feet on base: k 1 a grown-up, under 0.8 a child. crumble (0..1) eats it from the
// hands and head and blows the ash away to the right.
function folk(x, base, k, col, t = 0, o = {}) {
  x = Math.round(x); base = Math.round(base);
  const child = k < 0.8, hh = child ? 10 : 14, cr = o.crumble || 0;
  const body = (dx, dy, w, h, c) => rect(x + dx, base - dy, w, h, c);
  if (child) { body(-1, 10, 3, 3, col); body(-1, 7, 3, 4, col); body(-1, 3, 1, 3, col); body(1, 3, 1, 3, col); }
  else { body(-1, 14, 3, 3, col); body(-2, 11, 5, 6, col); body(-2, 5, 2, 5, col); body(1, 5, 2, 5, col); }
  if (o.arm) { const [ax, ay] = o.arm; line(x + 2, base - hh + 5, x + ax, base - hh + 5 + ay, col); }
  if (o.crown) { px(x - 1, base - hh - 1, P.gold); px(x + 1, base - hh - 1, P.gold); px(x, base - hh - 2, P.gold); }
  if (cr > 0) for (let i = 0; i < 12 * cr; i++) {
    const u = (t * 0.6 + hash(i * 7 + x)) % 1;
    ctx.globalAlpha = (1 - u) * cr; px(x + 2 + u * 26 + Math.sin(t * 2 + i) * 2, base - hh + 4 + hash(i) * 6 - u * 10, i % 3 ? '#8a8086' : '#c8bcb4'); ctx.globalAlpha = 1;
  }
}
// a row of houses with windows (lit: a color, or none)
function street(base, col, lit, t, seed = 0) {
  for (let j = 0; j < 7; j++) {
    const x = PX + j * 33 - 4 + hash(j + seed) * 6, h = 30 + hash(j + 9 + seed) * 22, w = 26 + hash(j + 3) * 8;
    rect(x, base - h, w, h, col);
    for (let i = 0; i < Math.ceil(w / 2); i++) rect(x + i, base - h - i, w - i * 2, 1, col);
    if (lit) for (let wy = base - h + 6; wy < base - 8; wy += 9) rect(x + 5, wy, 4, 5, Math.floor(t * 1.5 + j + wy) % 9 ? lit : P.ember3);
  }
}
// falling ash, like grey snow
function ashFall(t, n, col = '#6a6266') {
  for (let i = 0; i < n; i++) {
    const u = (t * (0.08 + hash(i) * 0.06) + hash(i + 50)) % 1;
    px(PX + ((hash(i + 9) * PW + Math.sin(t + i) * 6 + u * 20) % PW), PY + u * PH, i % 4 ? col : '#a09498');
  }
}
// a circle sun drawn with one finger: p of it drawn so far
function fingerSun(x, y, rx, ry, p, col, rays = true) {
  for (let j = 0; j < 60; j++) { if (j / 60 > p) break; const a = (j / 60) * TAU; px(x + Math.cos(a) * rx, y + Math.sin(a) * ry, col); }
  if (rays && p >= 1) for (let j = 0; j < 8; j++) { const a = (j * TAU) / 8; line(x + Math.cos(a) * (rx + 2), y + Math.sin(a) * (ry + 1), x + Math.cos(a) * (rx + 5), y + Math.sin(a) * (ry + 3), col); }
}
const ASH_BOOK = [
  {
    // Mill Street at dawn: the bakery's oven, the father at the dough, the girl drawing her sun in the flour
    cue: () => A.loreCue(0),
    cap: ['BEFORE THE DARK, I BAKED BREAD ON MILL STREET.', 'EVERY MORNING MY GIRL DREW A SUN IN THE FLOUR.'],
    draw(t) {
      const cx = PX + PW / 2, base = PY + PH - 8;
      sky(PX, PY, PW, PH, ['#ffe9a8', '#ffc76a', '#ff9a4a', '#e0623a']);
      sun(PX + 30, PY + 22, 9, t);
      birds(PX + 120, PY + 12, t, 3, '#a05a3a');
      street(base, '#8a5640', '#ffd98a', t);
      // the bakery, its front cut away
      rect(cx - 62, base - 60, 124, 60, '#4a2a20'); rect(cx - 66, base - 64, 132, 5, '#6a3a28');
      for (let x = cx - 64; x < cx + 64; x += 8) rect(x, base - 59, 4, 3, (x / 8) % 2 ? '#e8d8b0' : '#c84a3a');
      rect(cx - 56, base - 52, 112, 48, '#2a1812'); glow(cx + 30, base - 20, P.ember, 40, 0.35);
      // the oven
      rect(cx + 18, base - 34, 30, 30, '#3a2a24'); ell(cx + 33, base - 16, 9, 6, '#120808');
      const f = Math.floor(t * 8) % 3; ell(cx + 33, base - 14, 7 - f, 3, '#ff9a3c'); ell(cx + 33, base - 13, 4, 2, '#ffe08a');
      // father at the dough, the girl at the table drawing
      folk(cx + 6, base - 4, 1, '#e3c8ab', t, { arm: [5, 2] });
      rect(cx - 50, base - 18, 46, 3, '#875b46'); rect(cx - 47, base - 15, 2, 11, '#4b3436'); rect(cx - 9, base - 15, 2, 11, '#4b3436');
      ell(cx - 14, base - 20, 4, 2, '#e8c890'); ell(cx - 42, base - 20, 4, 2, '#e8c890');
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { ctx.globalAlpha = 0.7 - j * 0.2; px(cx - 14 - i * 28 + Math.round(Math.sin(t * 2 + j + i)), base - 24 - j * 3 - Math.floor((t * 6) % 2), '#f8f0e0'); ctx.globalAlpha = 1; }
      folk(cx - 30, base - 4, 0.7, '#f0d8b8', t, { arm: [4, -2] });
      fingerSun(cx - 27, base - 19, 4, 1, (t * 0.4) % 1.4, '#fff6e8', false);
      rect(PX, base, PW, 8, '#5a3a2a');
    },
  },
  {
    // the old sun, dim and low, and the King on his tower reaching for it
    cue: () => A.loreCue(1),
    cap: ['THE SUN GREW OLD AND DIM. THE KING GREW AFRAID', 'OF THE DARK THAT WAITS FOR EVERYTHING.'],
    draw(t) {
      const base = PY + PH - 10;
      sky(PX, PY, PW, PH, ['#2a1a2a', '#6a3a3a', '#b8603a', '#d08a4a']);
      sun(PX + PW - 54, PY + 52, 22, t * 0.3, { core: '#f0b878', rim: '#c8703a', ray: '#a8502a', ga: 0.25 });
      castle(PX + 30, base, '#160c12', '#ffb347', t);
      // Aurel on the tallest tower, one arm up to the sun
      folk(PX + 71, base - 61, 1, '#160c12', t, { crown: true, arm: [6, -7 + Math.sin(t * 1.5)] });
      rect(PX, base, PW, 10, '#160c12');
    },
  },
  {
    // the swallowing: the sun pours into the King's mouth and the sky goes black at noon
    len: 6.2,
    cue: () => A.storyCue('aurel'),
    cap: ['ONE NIGHT HE OPENED HIS MOUTH TO THE SKY', 'AND SWALLOWED THE SUN WHOLE.'],
    draw(t) {
      const base = PY + PH - 10, k = clamp01((t - 0.6) / 3.2), kx = PX + 71, ky = base - 75;
      sky(PX, PY, PW, PH, ['#2a1a2a', '#6a3a3a', '#b8603a', '#d08a4a']);
      ctx.globalAlpha = 0.9 * k; rect(PX, PY, PW, PH, '#05030a'); ctx.globalAlpha = 1;
      const sx = PX + PW - 54 + (kx - (PX + PW - 54)) * k * k, sy = PY + 52 + (ky - (PY + 52)) * k * k, r = Math.max(1, 22 * (1 - k));
      if (k < 1) {
        for (let i = 0; i < 3; i++) line(sx, sy + (i - 1) * 2 * (1 - k), kx, ky, i === 1 ? '#fff6c8' : P.gold, 1);
        sun(sx, sy, r, t);
      }
      castle(PX + 30, base, '#160c12', k < 0.7 ? '#ffb347' : null, t);
      folk(PX + 71, base - 61, 1, k < 1 ? '#160c12' : '#3a0c10', t, { crown: true, arm: [5, -6] });
      if (k >= 1) { glow(kx, ky + 4, P.ember, 18, 0.5 + 0.2 * Math.sin(t * 5)); for (let i = 0; i < 6; i++) px(kx - 3 + hash(i) * 6, ky + 2 + ((t * 8 + i * 3) % 8), P.ember3); }
      rect(PX, base, PW, 10, '#160c12');
    },
  },
  {
    // grey hands: in the cold street the father and his girl begin to crumble, and the bread goes grey
    cue: () => A.storyCue('fall'),
    cap: ['BY MORNING OUR HANDS WERE GREY. WE DID NOT DIE.', 'WE CRUMBLED, AND THE WIND TOOK WHAT FELL.'],
    draw(t) {
      const cx = PX + PW / 2, base = PY + PH - 10, k = clamp01(t / 4);
      sky(PX, PY, PW, PH, ['#07060c', '#141220', '#221e2c']);
      blackSun(PX + PW - 30, PY + 18, 7, t);
      street(base, '#100c14', null, t, 4);
      rect(cx - 30, base - 30, 60, 30, '#1a1418'); rect(cx - 8, base - 22, 16, 22, '#07050a');
      rect(cx + 14, base - 10, 22, 3, '#3a2e2a');
      for (let i = 0; i < 3; i++) ell(cx + 18 + i * 6, base - 12, 3, 2, i < 3 * (1 - k) ? '#c8a878' : '#5a5458');
      const grey = (a, b) => (k < 0.5 ? a : b);
      folk(cx - 4, base, 1, grey('#a89888', '#6a6266'), t, { crumble: 0.4 + k * 0.6, arm: [6, 3] });
      folk(cx - 14, base, 0.7, grey('#b8a898', '#7a7276'), t, { crumble: 0.2 + k * 0.5, arm: [3, 2] });
      ashFall(t, 60);
      rect(PX, base, PW, 10, '#141016');
    },
  },
  {
    // the march into the pit: his fire calls them, and they go down in a line, hands reaching
    cue: () => A.storyCue('descend'),
    cap: ['HIS FIRE CALLED US DOWN INTO HIS PIT.', 'NOW WE FIGHT FOR HIM. WE CANNOT STOP OUR HANDS.'],
    draw(t) {
      const cx = PX + PW / 2, base = PY + PH - 18;
      sky(PX, PY, PW, PH, ['#030205', '#0e0810', '#1c0e12']);
      blackSun(cx, PY + 16, 9, t);
      rect(PX, base - 4, PW, 26, '#241a1e');
      for (let x = 0; x < PW; x += 2) px(PX + x, base - 4, hash(x) < 0.5 ? '#3a2e30' : '#1c1416');
      ell(cx, base + 8, 58, 11, '#2a0808'); ell(cx, base + 9, 52, 9, '#050204');
      glow(cx, base + 8, P.ember, 70, 0.4 + 0.1 * Math.sin(t * 3));
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI, fx = cx + Math.cos(a) * 46, h = 8 + 6 * Math.sin(t * 3 + i); line(fx, base + 8, fx + Math.sin(t * 2 + i) * 3, base + 8 - h, i % 2 ? P.ember : P.blood); }
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1, u = (t * 0.12 + i / 12) % 1, x = cx + side * (120 - u * 70), fall = Math.max(0, u - 0.82) / 0.18;
        ctx.globalAlpha = 1 - fall; folk(x, base + 2 + fall * 10, 1, '#4a4246', t + i, { crumble: 0.3, arm: [side * -5, -2] }); ctx.globalAlpha = 1;
      }
      ashFall(t, 30, '#3a3236');
    },
  },
  {
    // down in the pit, among the ash things, a small one draws a sun on the floor with one finger
    len: 6,
    cue: () => A.loreCue(3),
    cap: ['BUT EVERY NIGHT, SOMEONE DOWN HERE DRAWS', 'A LITTLE SUN IN THE ASH. I KNOW HER CIRCLES.'],
    draw(t) {
      const cx = PX + PW / 2, base = PY + PH - 12, p = clamp01((t - 0.8) / 2.6);
      sky(PX, PY, PW, PH, ['#020104', '#0a060c', '#140c12']);
      for (let i = 0; i < 7; i++) { const x = PX + i * 34, h = 30 + hash(i) * 40; rect(x, PY, 18, h, '#07040a'); rect(x + 4, PY + h, 10, 6, '#07040a'); }
      rect(PX, base, PW, 12, '#1a1216'); for (let x = 0; x < PW; x += 3) px(PX + x, base, hash(x + 3) < 0.5 ? '#2a2024' : '#120c10');
      [-80, -56, 52, 78].forEach((dx, i) => { const s = SPR[i % 2 ? 'brute' : 'husk']?.[0]; if (s) silhouette(s, cx + dx - s.w / 2, base - s.h, 1, '#120a10', '#3a2a30', dx > 0); });
      if (p > 0) glow(cx + 10, base + 2, P.gold, 26 * p, 0.35 * p);
      fingerSun(cx + 10, base + 3, 10, 3, p, p >= 1 ? P.gold : '#c8b890');
      glow(cx - 6, base - 6, '#8a7e84', 14, 0.25);
      folk(cx - 6, base, 0.7, '#8a7e84', t, { arm: [6 + Math.cos(t * 2) * 2, 4] });
      if (p >= 1) for (let i = 0; i < 8; i++) { const u = (t * 0.3 + hash(i)) % 1; ctx.globalAlpha = 1 - u; px(cx + 10 + (hash(i + 4) - 0.5) * 20, base - u * 30, P.gold); ctx.globalAlpha = 1; }
    },
  },
  {
    // the fighters at the pit's edge, torches lit, looking down
    cue: () => A.storyCue('gather'),
    cap: ['NOW YOU COME, ONE BY ONE, WITH BLADES AND FIRE.', 'WHEN YOU CUT US DOWN, DO NOT BE SORRY.', 'YOU ARE CUTTING OUR CHAINS.'],
    draw(t) {
      const base = PY + PH - 16;
      sky(PX, PY, PW, PH, ['#05040c', '#120c1c', '#2a1424']);
      for (let i = 0; i < 26; i++) if ((t * 2 + i) % 7 > 0.6) px(PX + hash(i) * PW, PY + hash(i + 30) * 50, '#8a84c0');
      blackSun(PX + PW - 26, PY + 16, 6, t);
      rect(PX, base, PW, 16, '#1a1218'); rect(PX, base + 8, PW, 8, '#050204'); glow(PX + PW / 2, base + 14, P.ember, 90, 0.25);
      ['BLADE', 'GUNNER', 'WIZARD', 'NINJA', 'MECHANIC', 'TANK', 'ROBOT', 'DEV'].forEach((id, i) => drawFighter(id, PX + 16 + i * 27, base + 1, 1, { t: t + i * 0.37, rim: '#3a0c10' }));
      for (let i = 0; i < 4; i++) { const x = PX + 30 + i * 54, f = Math.floor(t * 10 + i) % 3; rect(x, base - 14, 1, 14, '#4a3a30'); rect(x - 1, base - 17 - f, 3, 3 + f, P.ember); px(x, base - 18 - f, P.ember3); glow(x, base - 16, P.ember, 12, 0.3); }
    },
  },
  {
    // morning: the sun comes out of the King, the ash burns into light, and two shining people rise hand in hand
    len: 7.5,
    cue: () => A.storyCue('freed'),
    cap: ['BREAK HIS CROWN. LET THE SUN OUT.', 'AND IF YOU MEET MY GIRL, TELL HER', 'THE BREAD IS STILL WARM.'],
    draw(t) {
      const cx = PX + PW / 2, base = PY + PH - 12, rise = clamp01(t / 2.5);
      sky(PX, PY, PW, PH, ['#3a2030', '#7a4048', '#e0904a', '#ffc76a']);
      sun(cx, PY + 70 - rise * 48, 10, t, { ga: 0.4 });
      ctx.globalAlpha = 0.1 * rise; for (let i = 0; i < 5; i++) rect(PX + 14 + i * 44, PY, 16, PH, P.gold); ctx.globalAlpha = 1;
      rect(PX, base, PW, 12, '#3a2a2e'); for (let x = 0; x < PW; x += 3) px(PX + x, base, hash(x) < 0.5 ? '#5a4a4e' : '#2a1e22');
      ['husk', 'brute', 'husk', 'husk', 'priest', 'husk'].forEach((m, i) => {
        if (i === 2 || i === 3) return;
        const s = SPR[m]?.[0], x = PX + 10 + i * 36, d = clamp01((t - 0.8 - i * 0.25) / 1.4);
        burnAway(s, x, base, 1, '#1e1418', '#ffd98a', d, t, P.gold, i * 13);
      });
      fingerSun(cx, base + 4, 12, 3, 1, P.gold);
      const up = Math.max(0, t - 2.2), y = base - up * 7, a = Math.min(1, up) * (up > 5 ? Math.max(0, 1 - (up - 5)) : 1);
      ctx.globalAlpha = a;
      glow(cx, y - 8, P.gold, 16, 0.5);
      folk(cx - 3, y, 1, '#fff2c0', t); folk(cx + 4, y, 0.7, '#ffe08a', t); px(cx, y - 7, '#fff2c0');
      ctx.globalAlpha = 1;
    },
  },
];
const STORIES = { ash: ASH_BOOK, lore: LORE, ending: ENDING, home: HOME, deeper: DEEPER, fall: FALL, nightfall: NIGHTFALL };
export const story = { char: null, evo: false, name: null, pages: LORE, i: 0, t: 0, cued: -1, typed: 0, cap: null };
// going home is the climb, then three pages of the fighter's own ending, then THE END
const pagesOf = (name) => (name === 'home' ? [HOME[0], ...(HOMES[me()] || [HOME[1]]), HOME[2]] : STORIES[name]);
export function playStory(name, o = {}) { story.char = o.char || null; story.evo = !!o.evo; Object.assign(story, { name, pages: pagesOf(name), i: 0, t: 0, cued: -1, typed: 0, cap: null }); }
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
