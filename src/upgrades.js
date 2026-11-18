import { TEST_BUFF } from './store.js?v=183';
// One is picked after every cleared wave. `max` caps stacking, `only` limits it to some fighters.
// Every upgrade has an evolution (`req`), which only appears once the upgrade it needs is maxed out.
// Any five evolutions awaken the fighter (see world.js).
const MELEE = ['BLADE', 'NINJA', 'MECHANIC', 'TANK'];
export const UPGRADES = [
  // ---- shared ----
  { id: 'power', name: 'WHETSTONE', d: ['ALL DAMAGE', '+15%'], icon: 'blade', c: 'ember2', max: 5, f: (u) => { u.dmg *= 1.15; } },
  { id: 'haste', name: 'QUICKHAND', d: ['ATTACK SPEED', '+12%'], icon: 'dash', c: 'paper', max: 4, f: (u) => { u.spd *= 1.12; } },
  { id: 'reach', name: 'LONG EDGE', d: ['MELEE REACH', '+15%'], icon: 'blade', c: 'bone', max: 3, only: MELEE, f: (u) => { u.reach *= 1.15; } },
  { id: 'wpn', name: 'WEAPON MASTERY', d: ['BASIC ATTACK', 'DAMAGE +20%'], icon: 'blade', c: 'ember', max: 3, f: (u) => { u.wpn *= 1.2; } },
  { id: 'spell', name: 'SPELL MASTERY', d: ['Q AND E DAMAGE +20%', 'COOLDOWNS -12%'], icon: 'star', c: 'volt', max: 3, f: (u) => { u.spell *= 1.2; u.cdMul *= 0.88; } },
  { id: 'focus', name: 'ULTIMATE MASTERY', d: ['ULTIMATE CHARGES', '20% FASTER'], icon: 'eye', c: 'gold', max: 3, f: (u) => { u.focus *= 1.2; } },
  { id: 'heart', name: 'HEARTWOOD', d: ['+2 MAX HEALTH', 'AND A FULL HEAL'], icon: 'heart', c: 'blood', max: 3, f: (u, p) => { p.maxHp += 2; p.hp = p.maxHp; } },
  { id: 'swift', name: 'SWIFT STEP', d: ['DASH RECHARGES', '15% FASTER'], icon: 'dash', c: 'volt', max: 3, f: (u) => { u.dashMul *= 0.85; } },
  { id: 'static', name: 'STATIC CHARGE', d: ['EVERY 8TH HIT', 'CHAINS LIGHTNING'], icon: 'bolt', c: 'volt', max: 2, f: (u) => { u.static++; } },
  { id: 'ember', name: 'KINDLING', d: ['YOUR ATTACKS', 'SET FOES ALIGHT'], icon: 'flame', c: 'ember', max: 2, f: (u) => { u.ember++; } },
  { id: 'orbit', name: 'ORBIT BLADES', d: ['+1 BLADE CIRCLES', 'AROUND YOU'], icon: 'cross', c: 'bone', max: 4, f: (u) => { u.orbit++; } },
  { id: 'crit', name: 'KEEN EYE', d: ['CRITICAL HIT', 'CHANCE +8%'], icon: 'eye', c: 'gold', max: 3, f: (u) => { u.crit += 0.08; } },
  { id: 'phantom', name: 'PHANTOM STEP', d: ['YOUR DASH CUTS', 'EVERY FOE IT CROSSES'], icon: 'dash', c: 'volt', max: 2, f: (u) => { u.phantom++; } },
  { id: 'mirror', name: 'MIRROR GUARD', d: ['PARRIED ORBS', 'PIERCE, X2 DAMAGE'], icon: 'orb', c: 'hex', max: 1, only: MELEE, f: (u) => { u.mirror++; } },
  { id: 'well', name: 'DEEP WELL', d: ['ENERGY REFILLS', '30% FASTER'], icon: 'orb', c: 'volt', max: 3, f: (u) => { u.regen *= 1.3; } },
  { id: 'debt', name: 'BLOOD DEBT', d: ['HEAL 1 HEALTH', 'EVERY 20 KILLS'], icon: 'heart', c: 'blood', max: 1, f: (u) => { u.debt = 1; } },
  { id: 'shrap', name: 'SHRAPNEL', d: ['EXPLOSIONS ARE', '35% BIGGER'], icon: 'burst', c: 'ember', max: 2, f: (u) => { u.shrap *= 1.35; } },
  { id: 'exec', name: 'EXECUTIONER', d: ['FOES UNDER 20%', 'TAKE +60% DAMAGE'], icon: 'blade', c: 'blood', max: 1, f: (u) => { u.exec = 1; } },
  { id: 'magnet', name: 'LODESTONE', d: ['PICKUPS FLY TO YOU', 'FROM FAR AWAY'], icon: 'orb', c: 'gold', max: 1, f: (u) => { u.magnet = 1; } },
  { id: 'thorns', name: 'THORNS', d: ['WHEN HIT, BLAST', 'FOES AROUND YOU'], icon: 'burst', c: 'blood', max: 2, f: (u) => { u.thorns++; } },
  // ---- evolutions ----
  { id: 'evoWpn', name: 'SPIRIT STRIKES', req: 'wpn', d: ['BASIC HITS RELEASE', 'HOMING SPIRITS'], icon: 'star', c: 'gold', max: 1, f: (u) => { u.evoWpn = 1; } },
  { id: 'evoSpell', name: (k) => k.q.name.split(' ')[0] + ' & ' + k.e.name.split(' ')[0] + ' II', req: 'spell', d: ['Q AND E CAST', 'TWICE FOR FREE'], icon: 'star', c: 'volt', max: 1, f: (u) => { u.evoSpell = 1; } },
  { id: 'evoUlt', name: (k) => k.r.name + ' II', req: 'focus', d: ['BIGGER ULTIMATE, THEN', '8S ASCENDED: X2 DAMAGE'], icon: 'eye', c: 'gold', max: 1, f: (u) => { u.evoUlt = 1; } },
  { id: 'evoHeart', name: 'UNDYING', req: 'heart', d: ['ONCE PER WAVE, SURVIVE', 'A KILLING BLOW'], icon: 'heart', c: 'gold', max: 1, f: (u) => { u.evoHeart = 1; } },
  { id: 'evoSwift', name: 'BLINK STORM', req: 'swift', d: ['+1 DASH, DASHES', 'SHRED FOES'], icon: 'dash', c: 'gold', max: 1, f: (u, p) => { u.evoSwift = 1; u.phantom += 2; p.dashMax++; p.charges++; } },
  { id: 'evoStatic', name: 'THUNDERGOD', req: 'static', d: ['EVERY 4TH HIT CHAINS', 'TO 7 FOES'], icon: 'bolt', c: 'gold', max: 1, f: (u) => { u.evoStatic = 1; } },
  { id: 'evoEmber', name: 'INFERNO', req: 'ember', d: ['BURNING FOES', 'EXPLODE ON DEATH'], icon: 'flame', c: 'gold', max: 1, f: (u) => { u.evoEmber = 1; } },
  { id: 'evoOrbit', name: 'BLADE STORM', req: 'orbit', d: ['TWICE THE BLADES,', 'WIDER AND STRONGER'], icon: 'cross', c: 'gold', max: 1, f: (u) => { u.evoOrbit = 1; } },
  // shared
  { id: 'evoPower', name: 'RAZOR EDGE', req: 'power', d: ['ALL DAMAGE', '+30% MORE'], icon: 'blade', c: 'gold', max: 1, f: (u) => { u.dmg *= 1.3; } },
  { id: 'evoHaste', name: 'FRENZY', req: 'haste', d: ['ATTACK SPEED', '+25% MORE'], icon: 'dash', c: 'gold', max: 1, f: (u) => { u.spd *= 1.25; } },
  { id: 'evoReach', name: "GIANT'S REACH", req: 'reach', d: ['MELEE REACH', '+30% MORE'], icon: 'blade', c: 'gold', max: 1, only: MELEE, f: (u) => { u.reach *= 1.3; } },
  { id: 'evoCrit', name: 'DEATHMARK', req: 'crit', d: ['+15% CRIT CHANCE,', 'CRITS DEAL X3'], icon: 'eye', c: 'gold', max: 1, f: (u) => { u.crit += 0.15; u.evoCrit = 1; } },
  { id: 'evoPhantom', name: 'SHADOW STEP', req: 'phantom', d: ['DASH CUTS HIT', 'THREE TIMES HARDER'], icon: 'dash', c: 'gold', max: 1, f: (u) => { u.phantom += 3; } },
  { id: 'evoMirror', name: 'REFLECT ALL', req: 'mirror', d: ['PARRIED SHOTS HOME', 'IN ON YOUR FOES'], icon: 'orb', c: 'gold', max: 1, only: MELEE, f: (u) => { u.evoMirror = 1; } },
  { id: 'evoWell', name: 'WELLSPRING', req: 'well', d: ['ENERGY REFILLS', '60% FASTER MORE'], icon: 'orb', c: 'gold', max: 1, f: (u) => { u.regen *= 1.6; } },
  { id: 'evoDebt', name: 'BLOOD PACT', req: 'debt', d: ['HEAL 1 HEALTH', 'EVERY 10 KILLS'], icon: 'heart', c: 'gold', max: 1, f: (u) => { u.evoDebt = 1; } },
  { id: 'evoShrap', name: 'CLUSTER BLAST', req: 'shrap', d: ['EXPLOSIONS ARE', '50% BIGGER MORE'], icon: 'burst', c: 'gold', max: 1, f: (u) => { u.shrap *= 1.5; } },
  { id: 'evoExec', name: 'GUILLOTINE', req: 'exec', d: ['FOES UNDER 35%', 'TAKE DOUBLE DAMAGE'], icon: 'blade', c: 'gold', max: 1, f: (u) => { u.evoExec = 1; } },
  { id: 'evoMagnet', name: 'LIFELINE', req: 'magnet', d: ['ENERGY REFILLS 30%', 'FASTER, +1 MAX HEALTH'], icon: 'orb', c: 'gold', max: 1, f: (u, p) => { u.regen *= 1.3; p.maxHp++; p.hp++; } },
  { id: 'evoThorns', name: 'BRAMBLE', req: 'thorns', d: ['WHEN HIT, A BLAST', 'TWICE AS STRONG'], icon: 'burst', c: 'gold', max: 1, f: (u) => { u.thorns += 2; } },
  // fighter signatures
  { id: 'evoEcho', name: 'RIFT MASTER', req: 'echo', d: ['POWERS +25% DAMAGE,', 'COOLDOWNS -20%'], icon: 'blade', c: 'gold', max: 1, only: ['BLADE'], f: (u) => { u.spell *= 1.25; u.cdMul *= 0.8; } },
  { id: 'evoStorm', name: 'EYE OF THE STORM', req: 'storm', d: ['TEMPEST JUMPS', 'TO 3 MORE FOES'], icon: 'bolt', c: 'gold', max: 1, only: ['BLADE'], f: (u) => { u.storm += 3; } },
  { id: 'evoMag', name: 'BOTTOMLESS MAG', req: 'mag', d: ['+100% AMMO,', 'EVEN FASTER RELOAD'], icon: 'gun', c: 'gold', max: 1, only: ['GUNNER'], f: (u) => { u.mag += 2; } },
  { id: 'evoPierce', name: 'RAILGUN', req: 'pierce', d: ['BULLETS PIERCE', '3 MORE FOES'], icon: 'gun', c: 'gold', max: 1, only: ['GUNNER'], f: (u) => { u.pierce += 3; } },
  { id: 'evoFrost', name: 'ABSOLUTE ZERO', req: 'frost', d: ['FROZEN FOES TAKE', 'DOUBLE DAMAGE'], icon: 'snow', c: 'gold', max: 1, only: ['WIZARD'], f: (u) => { u.evoFrost = 1; } },
  { id: 'evoTwin', name: 'ARCANE STORM', req: 'twin', d: ['12 MISSILES AND', 'A HUGE BLIZZARD'], icon: 'star', c: 'gold', max: 1, only: ['WIZARD'], f: (u) => { u.evoTwin = 1; } },
  { id: 'evoCharges', name: 'FOURTH STEP', req: 'charges', d: ['+1 DASH', 'CHARGE'], icon: 'dash', c: 'gold', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'evoVenom', name: 'DEATH BLOSSOM', req: 'venom', d: ['SENKO POISON', 'BURNS TWICE AS HARD'], icon: 'cross', c: 'gold', max: 1, only: ['NINJA'], f: (u) => { u.evoVenom = 1; } },
  { id: 'evoOverclock', name: 'HYPERCLOCK', req: 'overclock', d: ['TURRETS AND COILS', 'FIRE FASTER STILL'], icon: 'gear', c: 'gold', max: 1, only: ['MECHANIC'], f: (u) => { u.overclock += 2; } },
  { id: 'evoHands', name: 'ASSEMBLY LINE', req: 'hands', d: ['+2 TURRETS', 'AT ONCE'], icon: 'gear', c: 'gold', max: 1, only: ['MECHANIC'], f: (u) => { u.hands += 2; } },
  { id: 'evoAfter', name: 'EARTHQUAKE', req: 'after', d: ['GROUND SLAM SENDS', 'TWO MORE WAVES'], icon: 'fist', c: 'gold', max: 1, only: ['TANK'], f: (u) => { u.after += 2; } },
  { id: 'evoIron', name: 'ADAMANT', req: 'iron', d: ['+5 MAX HEALTH', 'AND A FULL HEAL'], icon: 'shield', c: 'gold', max: 1, only: ['TANK'], f: (u, p) => { p.maxHp += 5; p.hp = p.maxHp; } },
  { id: 'evoCoolant', name: 'CRYO CORE', req: 'coolant', d: ['LASER HEATS UP', '75% SLOWER'], icon: 'snow', c: 'gold', max: 1, only: ['ROBOT'], f: (u) => { u.evoCoolant = 1; } },
  { id: 'evoCluster', name: 'SWARM PODS', req: 'cluster', d: ['+6 ROCKETS', 'PER SALVO'], icon: 'rocket', c: 'gold', max: 1, only: ['ROBOT'], f: (u) => { u.cluster += 2; } },
  { id: 'evoFork', name: 'RECURSION', req: 'fork', d: ['CRASH NEEDS', '1 FEWER BUG'], icon: 'burst', c: 'gold', max: 1, only: ['DEV'], f: (u) => { u.overflow++; } },
  { id: 'evoOverflow', name: 'SEGFAULT', req: 'overflow', d: ['ALL DAMAGE', '+25% MORE'], icon: 'bolt', c: 'gold', max: 1, only: ['DEV'], f: (u) => { u.dmg *= 1.25; } },
  // ---- signature upgrades ----
  { id: 'echo', name: 'RIFT ECHO', d: ['RIFT CUTS', 'A SECOND TIME'], icon: 'blade', c: 'volt', max: 1, only: ['BLADE'], f: (u) => { u.echo = 1; } },
  { id: 'storm', name: 'STORM HEART', d: ['TEMPEST JUMPS', 'TO 2 MORE FOES'], icon: 'bolt', c: 'volt', max: 2, only: ['BLADE'], f: (u) => { u.storm++; } },
  { id: 'mag', name: 'EXTENDED MAG', d: ['+50% AMMO,', 'FASTER RELOAD'], icon: 'gun', c: 'gold', max: 2, only: ['GUNNER'], f: (u) => { u.mag++; } },
  { id: 'pierce', name: 'HOLLOW POINTS', d: ['BULLETS PIERCE', 'ONE MORE FOE'], icon: 'gun', c: 'ember2', max: 2, only: ['GUNNER'], f: (u) => { u.pierce++; } },
  { id: 'frost', name: 'FROSTBITE', d: ['FROZEN FOES SHATTER', 'WHEN THEY DIE'], icon: 'snow', c: 'volt', max: 1, only: ['WIZARD'], f: (u) => { u.frost = 1; } },
  { id: 'twin', name: 'TWIN CAST', d: ['8 MISSILES AND', 'A WIDER BLIZZARD'], icon: 'star', c: 'ember', max: 1, only: ['WIZARD'], f: (u) => { u.twin = 1; } },
  { id: 'charges', name: 'THIRD STEP', d: ['+1 DASH', 'CHARGE'], icon: 'dash', c: 'blood', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'venom', name: 'VENOM EDGE', d: ['SENKO BEAM', 'POISONS FOES'], icon: 'cross', c: 'ichor', max: 1, only: ['NINJA'], f: (u) => { u.venom = 1; } },
  { id: 'overclock', name: 'OVERCLOCK', d: ['TURRETS AND COILS', 'FIRE 40% FASTER'], icon: 'gear', c: 'ember2', max: 2, only: ['MECHANIC'], f: (u) => { u.overclock++; } },
  { id: 'hands', name: 'EXTRA HANDS', d: ['+1 TURRET', 'AT ONCE'], icon: 'gear', c: 'volt', max: 2, only: ['MECHANIC'], f: (u) => { u.hands++; } },
  { id: 'after', name: 'AFTERSHOCK', d: ['GROUND SLAM', 'SENDS ONE MORE WAVE'], icon: 'fist', c: 'ember2', max: 2, only: ['TANK'], f: (u) => { u.after++; } },
  { id: 'iron', name: 'IRON SKIN', d: ['+3 MAX HEALTH', ''], icon: 'shield', c: 'bone', max: 2, only: ['TANK'], f: (u, p) => { p.maxHp += 3; p.hp += 3; } },
  { id: 'coolant', name: 'COOLANT', d: ['LASER HEATS UP', '40% SLOWER'], icon: 'snow', c: 'volt', max: 1, only: ['ROBOT'], f: (u) => { u.coolant = 1; } },
  { id: 'cluster', name: 'CLUSTER PODS', d: ['+3 ROCKETS', 'PER SALVO'], icon: 'rocket', c: 'ember', max: 2, only: ['ROBOT'], f: (u) => { u.cluster++; } },
  { id: 'fork', name: 'FORK BOMB', d: ['CRASHED FOES SPLIT', 'BUGS TO NEIGHBORS'], icon: 'burst', c: 'ichor', max: 1, only: ['DEV'], f: (u) => { u.fork = 1; } },
  { id: 'overflow', name: 'STACK OVERFLOW', d: ['CRASH NEEDS', '1 FEWER BUG'], icon: 'bolt', c: 'ichor', max: 2, only: ['DEV'], f: (u) => { u.overflow++; } },
  // ---- relics: legendary, one is chosen after every boss and never offered on normal waves ----
  { id: 'phoenix', relic: true, name: 'PHOENIX FEATHER', d: ['ONCE PER RUN, RISE', 'FROM DEATH IN FIRE'], icon: 'flame', c: 'ember', max: 1, f: (u) => { u.phoenix = 1; } },
  { id: 'rage', relic: true, name: 'BERSERKER MARK', d: ['+60% DAMAGE AT', 'HALF HEALTH OR LESS'], icon: 'blade', c: 'blood', max: 1, f: (u) => { u.rage = 1; } },
  { id: 'crown', relic: true, name: 'STORM CROWN', d: ['LIGHTNING STRIKES A', 'FOE EVERY 2 SECONDS'], icon: 'bolt', c: 'volt', max: 1, f: (u) => { u.crown = 1; } },
  { id: 'hourglass', relic: true, name: 'HOURGLASS', d: ['COOLDOWNS -25%', 'AND +1 DASH'], icon: 'dash', c: 'paper', max: 1, f: (u, p) => { u.cdMul *= 0.75; p.dashMax++; p.charges++; } },
  { id: 'midas', relic: true, name: 'MIDAS COIN', d: ['MORE LOOTLINGS, X2', 'ENERGY, +25% SCORE'], icon: 'orb', c: 'gold', max: 1, f: (u) => { u.midas = 1; } },
  { id: 'reaper', relic: true, name: 'REAPER SCYTHE', d: ['KILLS RELEASE SOULS', 'THAT HUNT THE NEXT'], icon: 'star', c: 'hex', max: 1, f: (u) => { u.reaper = 1; } },
  { id: 'titan', relic: true, name: 'TITAN BELT', d: ['+4 MAX HEALTH', 'AND A FULL HEAL'], icon: 'heart', c: 'bone', max: 1, f: (u, p) => { p.maxHp += 4; p.hp = p.maxHp; } },
  { id: 'eclipse', relic: true, name: 'ECLIPSE STONE', d: ['ULTIMATE CHARGES', 'TWICE AS FAST'], icon: 'eye', c: 'gold', max: 1, f: (u) => { u.focus *= 2; } },
];

export const MEND = { id: 'mend', name: 'MEND', d: ['RESTORE 3 HEALTH', ''], icon: 'heart', c: 'blood', max: 999, f: (u, p) => { p.hp = Math.min(p.maxHp, p.hp + 3); } };
export const byId = (id) => (id === 'mend' ? MEND : UPGRADES.find((u) => u.id === id));
// (with the test buff on, one pick counts as maxed, so the evolution comes right after)
const maxed = (taken, id) => (taken[id] || 0) >= (TEST_BUFF ? 1 : byId(id).max);

export function rollUpgrades(taken, char, afterBoss = false) {
  // after a boss: three relics, if any are left
  if (afterBoss) {
    const relics = UPGRADES.filter((u) => u.relic && !taken[u.id]).sort(() => Math.random() - 0.5);
    if (relics.length) { const out = relics.slice(0, 3); while (out.length < 3) out.push(MEND); return out; }
  }
  const pool = UPGRADES.filter((u) => !u.relic && (taken[u.id] || 0) < u.max && (!u.only || u.only.includes(char)) && (!u.req || maxed(taken, u.req)));
  const out = [];
  const take = (u) => out.push(pool.splice(pool.indexOf(u), 1)[0]);
  // an unlocked evolution almost always shows up, then a signature upgrade often does
  const evo = pool.filter((u) => u.req);
  if (evo.length && (TEST_BUFF || Math.random() < 0.85)) take(evo[Math.floor(Math.random() * evo.length)]);
  const sig = pool.filter((u) => u.only && u.only.length === 1);
  if (sig.length && Math.random() < 0.5) take(sig[Math.floor(Math.random() * sig.length)]);
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  while (out.length < 3) out.push(MEND);
  return out.sort(() => Math.random() - 0.5);
}
