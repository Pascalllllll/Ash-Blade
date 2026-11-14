// One is picked after every cleared wave. `max` caps stacking, `only` limits it to some fighters.
// An evolution (`req`) only appears once the upgrade it needs is maxed out.
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
  // ---- signature upgrades ----
  { id: 'echo', name: 'RIFT ECHO', d: ['RIFT CUTS', 'A SECOND TIME'], icon: 'blade', c: 'volt', max: 1, only: ['BLADE'], f: (u) => { u.echo = 1; } },
  { id: 'storm', name: 'STORM HEART', d: ['TEMPEST JUMPS', 'TO 2 MORE FOES'], icon: 'bolt', c: 'volt', max: 2, only: ['BLADE'], f: (u) => { u.storm++; } },
  { id: 'mag', name: 'EXTENDED MAG', d: ['+50% AMMO,', 'FASTER RELOAD'], icon: 'gun', c: 'gold', max: 2, only: ['GUNNER'], f: (u) => { u.mag++; } },
  { id: 'pierce', name: 'HOLLOW POINTS', d: ['BULLETS PIERCE', 'ONE MORE FOE'], icon: 'gun', c: 'ember2', max: 2, only: ['GUNNER'], f: (u) => { u.pierce++; } },
  { id: 'frost', name: 'FROSTBITE', d: ['FROZEN FOES SHATTER', 'WHEN THEY DIE'], icon: 'snow', c: 'volt', max: 1, only: ['WIZARD'], f: (u) => { u.frost = 1; } },
  { id: 'twin', name: 'TWIN STAR', d: ['METEOR FALLS', 'TWICE'], icon: 'star', c: 'ember', max: 1, only: ['WIZARD'], f: (u) => { u.twin = 1; } },
  { id: 'charges', name: 'THIRD STEP', d: ['+1 DASH', 'CHARGE'], icon: 'dash', c: 'blood', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'venom', name: 'VENOM EDGE', d: ['SAKURA WAVES', 'POISON FOES'], icon: 'cross', c: 'ichor', max: 1, only: ['NINJA'], f: (u) => { u.venom = 1; } },
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
const maxed = (taken, id) => (taken[id] || 0) >= byId(id).max;

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
  if (evo.length && Math.random() < 0.85) take(evo[Math.floor(Math.random() * evo.length)]);
  const sig = pool.filter((u) => u.only && u.only.length === 1);
  if (sig.length && Math.random() < 0.5) take(sig[Math.floor(Math.random() * sig.length)]);
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  while (out.length < 3) out.push(MEND);
  return out.sort(() => Math.random() - 0.5);
}
