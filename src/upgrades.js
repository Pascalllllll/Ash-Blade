// One is picked after every cleared wave. `max` caps stacking; `only` limits it to some characters.
const MELEE = ['BLADE', 'NINJA', 'MECHANIC', 'TANK'];
export const UPGRADES = [
  // shared
  { id: 'power', name: 'WHETSTONE', d: ['ALL DAMAGE', '+20%'], icon: 'blade', c: 'ember2', max: 4, f: (u) => { u.dmg *= 1.2; } },
  { id: 'haste', name: 'QUICKHAND', d: ['ATTACK SPEED', '+15%'], icon: 'dash', c: 'paper', max: 3, f: (u) => { u.spd *= 1.15; } },
  { id: 'reach', name: 'LONG EDGE', d: ['MELEE REACH', '+18%'], icon: 'blade', c: 'bone', max: 2, only: MELEE, f: (u) => { u.reach *= 1.18; } },
  { id: 'static', name: 'STATIC CHARGE', d: ['EVERY 8TH HIT', 'CHAINS LIGHTNING'], icon: 'bolt', c: 'volt', max: 2, f: (u) => { u.static++; } },
  { id: 'ember', name: 'KINDLING', d: ['YOUR ATTACKS', 'SET FOES ALIGHT'], icon: 'flame', c: 'ember', max: 2, f: (u) => { u.ember++; } },
  { id: 'phantom', name: 'PHANTOM STEP', d: ['YOUR DASH CUTS', 'EVERY FOE IT CROSSES'], icon: 'dash', c: 'volt', max: 2, f: (u) => { u.phantom++; } },
  { id: 'mirror', name: 'MIRROR GUARD', d: ['PARRIED ORBS', 'PIERCE, X2 DAMAGE'], icon: 'orb', c: 'hex', max: 1, only: MELEE, f: (u) => { u.mirror++; } },
  { id: 'heart', name: 'HEARTWOOD', d: ['+2 MAX HEALTH', 'AND A FULL HEAL'], icon: 'heart', c: 'blood', max: 3, f: (u, p) => { p.maxHp += 2; p.hp = p.maxHp; } },
  { id: 'well', name: 'DEEP WELL', d: ['ENERGY REFILLS', '35% FASTER'], icon: 'orb', c: 'volt', max: 2, f: (u) => { u.regen *= 1.35; } },
  { id: 'debt', name: 'BLOOD DEBT', d: ['HEAL 1 HEALTH', 'EVERY 20 KILLS'], icon: 'heart', c: 'blood', max: 1, f: (u) => { u.debt = 1; } },
  { id: 'shrap', name: 'SHRAPNEL', d: ['EXPLOSIONS ARE', '35% BIGGER'], icon: 'burst', c: 'ember', max: 2, f: (u) => { u.shrap *= 1.35; } },
  { id: 'exec', name: 'EXECUTIONER', d: ['FOES UNDER 20%', 'TAKE +60% DAMAGE'], icon: 'blade', c: 'blood', max: 1, f: (u) => { u.exec = 1; } },
  { id: 'focus', name: 'FOCUS', d: ['ULTIMATE CHARGES', '25% FASTER'], icon: 'eye', c: 'gold', max: 2, f: (u) => { u.focus *= 1.25; } },
  // signature upgrades
  { id: 'echo', name: 'RIFT ECHO', d: ['RIFT CUTS', 'A SECOND TIME'], icon: 'blade', c: 'volt', max: 1, only: ['BLADE'], f: (u) => { u.echo = 1; } },
  { id: 'storm', name: 'STORM HEART', d: ['TEMPEST JUMPS', 'TO 2 MORE FOES'], icon: 'bolt', c: 'volt', max: 2, only: ['BLADE'], f: (u) => { u.storm++; } },
  { id: 'mag', name: 'EXTENDED MAG', d: ['+50% AMMO,', 'FASTER RELOAD'], icon: 'gun', c: 'gold', max: 2, only: ['GUNNER'], f: (u) => { u.mag++; } },
  { id: 'pierce', name: 'HOLLOW POINTS', d: ['BULLETS PIERCE', 'ONE MORE FOE'], icon: 'gun', c: 'ember2', max: 2, only: ['GUNNER'], f: (u) => { u.pierce++; } },
  { id: 'frost', name: 'FROSTBITE', d: ['FROZEN FOES SHATTER', 'WHEN THEY DIE'], icon: 'snow', c: 'volt', max: 1, only: ['WIZARD'], f: (u) => { u.frost = 1; } },
  { id: 'twin', name: 'TWIN STAR', d: ['METEOR FALLS', 'TWICE'], icon: 'star', c: 'ember', max: 1, only: ['WIZARD'], f: (u) => { u.twin = 1; } },
  { id: 'charges', name: 'THIRD STEP', d: ['+1 DASH', 'CHARGE'], icon: 'dash', c: 'blood', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'venom', name: 'VENOM EDGE', d: ['SHURIKENS', 'POISON FOES'], icon: 'cross', c: 'ichor', max: 1, only: ['NINJA'], f: (u) => { u.venom = 1; } },
  { id: 'overclock', name: 'OVERCLOCK', d: ['TURRETS AND COILS', 'FIRE 40% FASTER'], icon: 'gear', c: 'ember2', max: 2, only: ['MECHANIC'], f: (u) => { u.overclock++; } },
  { id: 'hands', name: 'EXTRA HANDS', d: ['+1 TURRET', 'AT ONCE'], icon: 'gear', c: 'volt', max: 2, only: ['MECHANIC'], f: (u) => { u.hands++; } },
  { id: 'after', name: 'AFTERSHOCK', d: ['GROUND SLAM', 'SENDS ONE MORE WAVE'], icon: 'fist', c: 'ember2', max: 2, only: ['TANK'], f: (u) => { u.after++; } },
  { id: 'iron', name: 'IRON SKIN', d: ['+3 MAX HEALTH', ''], icon: 'shield', c: 'bone', max: 2, only: ['TANK'], f: (u, p) => { p.maxHp += 3; p.hp += 3; } },
  { id: 'coolant', name: 'COOLANT', d: ['LASER HEATS UP', '40% SLOWER'], icon: 'snow', c: 'volt', max: 1, only: ['ROBOT'], f: (u) => { u.coolant = 1; } },
  { id: 'cluster', name: 'CLUSTER PODS', d: ['+3 ROCKETS', 'PER SALVO'], icon: 'rocket', c: 'ember', max: 2, only: ['ROBOT'], f: (u) => { u.cluster++; } },
];

export const MEND = { id: 'mend', name: 'MEND', d: ['RESTORE 3 HEALTH', ''], icon: 'heart', c: 'blood', max: 999, f: (u, p) => { p.hp = Math.min(p.maxHp, p.hp + 3); } };
export const byId = (id) => (id === 'mend' ? MEND : UPGRADES.find((u) => u.id === id));

export function rollUpgrades(taken, char) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max && (!u.only || u.only.includes(char)));
  const out = [];
  // a signature upgrade shows up more often than its share
  const sig = pool.filter((u) => u.only && u.only.length === 1);
  if (sig.length && Math.random() < 0.6) out.push(pool.splice(pool.indexOf(sig[Math.floor(Math.random() * sig.length)]), 1)[0]);
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  while (out.length < 3) out.push(MEND);
  return out.sort(() => Math.random() - 0.5);
}
