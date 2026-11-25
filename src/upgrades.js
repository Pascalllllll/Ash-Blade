import { TEST_BUFF } from './store.js?v=201';
// One is picked after every cleared wave. `max` caps stacking, `only` limits it to some fighters.
// Every upgrade has an evolution (`req`), which only appears once the upgrade it needs is maxed out.
// Any four evolutions awaken the fighter (see world.js).
const MELEE = ['BLADE', 'NINJA', 'MECHANIC', 'TANK'];
export const UPGRADES = [
  // ---- shared ----
  { id: 'power', name: 'WHETSTONE', d: ['ALL DAMAGE', '+15%'], icon: 'whetstone', detail: "Multiplies your weapon, skill and ultimate damage. Each rank builds on the last.", c: 'ember2', max: 5, f: (u) => { u.dmg *= 1.15; } },
  { id: 'haste', name: 'QUICKHAND', d: ['ATTACK SPEED', '+12%'], icon: 'boot', detail: "Swing again sooner, charge a heavy attack faster or fire your ranged weapon more often.", c: 'paper', max: 4, f: (u) => { u.spd *= 1.12; } },
  { id: 'reach', name: 'LONG EDGE', d: ['MELEE REACH', '+15%'], icon: 'reach', detail: "Extends the hit area of every swing in your basic melee combo.", c: 'bone', max: 3, only: MELEE, f: (u) => { u.reach *= 1.15; } },
  { id: 'wpn', name: 'WEAPON MASTERY', d: ['BASIC ATTACK', 'DAMAGE +20%'], icon: 'blade', detail: "Raises the damage of your basic weapon hits, including charged attacks.", c: 'ember', max: 3, f: (u) => { u.wpn *= 1.2; } },
  { id: 'spell', name: 'SPELL MASTERY', d: ['Q AND E DAMAGE +20%', 'COOLDOWNS -12%'], icon: 'book', detail: "Both regular skills hit harder and recharge sooner. Their energy cost stays the same.", c: 'volt', max: 3, f: (u) => { u.spell *= 1.2; u.cdMul *= 0.88; } },
  { id: 'focus', name: 'ULTIMATE MASTERY', d: ['ULTIMATE CHARGES', '20% FASTER'], icon: 'moon', detail: "Gain more ultimate charge from hits that build the meter. Each rank stacks with Eclipse Stone.", c: 'gold', max: 3, f: (u) => { u.focus *= 1.2; } },
  { id: 'heart', name: 'HEARTWOOD', d: ['+2 MAX HEALTH', 'AND A FULL HEAL'], icon: 'heart', detail: "Gain two permanent hearts for this run and immediately refill every heart.", c: 'blood', max: 3, f: (u, p) => { p.maxHp += 2; p.hp = p.maxHp; } },
  { id: 'swift', name: 'SWIFT STEP', d: ['DASH RECHARGES', '15% FASTER'], icon: 'boot', detail: "Shortens the wait for each spent dash charge. Kael still needs to land between dashes.", c: 'volt', max: 3, f: (u) => { u.dashMul *= 0.85; } },
  { id: 'static', name: 'STATIC CHARGE', d: ['EVERY 8TH HIT', 'CHAINS LIGHTNING'], icon: 'bolt', detail: "Every eighth charging hit sends a bolt to nearby foes. Rank one can jump to three and rank two to five.", c: 'volt', max: 2, f: (u) => { u.static++; } },
  { id: 'ember', name: 'KINDLING', d: ['YOUR ATTACKS', 'SET FOES ALIGHT'], icon: 'flame', detail: "Weapon hits that build your meter also ignite the target for two seconds. Another hit refreshes the burn.", c: 'ember', max: 2, f: (u) => { u.ember++; } },
  { id: 'orbit', name: 'ORBIT BLADES', d: ['+1 BLADE CIRCLES', 'AROUND YOU'], icon: 'orbit', detail: "A blade circles you and cuts enemies it touches. Add another blade with each rank.", c: 'bone', max: 4, f: (u) => { u.orbit++; } },
  { id: 'crit', name: 'KEEN EYE', d: ['CRITICAL HIT', 'CHANCE +8%'], icon: 'eye', detail: "Add eight percentage points to your weapon critical chance. Ordinary critical hits deal double damage.", c: 'gold', max: 3, f: (u) => { u.crit += 0.08; } },
  { id: 'phantom', name: 'PHANTOM STEP', d: ['YOUR DASH CUTS', 'EVERY FOE IT CROSSES'], icon: 'dash', detail: "Deal damage to each foe you dash through. A second rank doubles the cut.", c: 'volt', max: 2, f: (u) => { u.phantom++; } },
  { id: 'mirror', name: 'MIRROR GUARD', d: ['PARRIED ORBS', 'PIERCE, X2 DAMAGE'], icon: 'shield', detail: "Swing into a parryable shot. The returned projectile can pass through a crowd and hits twice as hard.", c: 'hex', max: 1, only: MELEE, f: (u) => { u.mirror++; } },
  { id: 'well', name: 'DEEP WELL', d: ['ENERGY REFILLS', '30% FASTER'], icon: 'drop', detail: "Speeds up passive energy recovery, including the time between fights.", c: 'volt', max: 3, f: (u) => { u.regen *= 1.3; } },
  { id: 'debt', name: 'BLOOD DEBT', d: ['HEAL 1 HEALTH', 'EVERY 20 KILLS'], icon: 'drop', detail: "Your twentieth kill restores one missing heart. The count carries into the next wave.", c: 'blood', max: 1, f: (u) => { u.debt = 1; } },
  { id: 'shrap', name: 'SHRAPNEL', d: ['EXPLOSIONS ARE', '35% BIGGER'], icon: 'burst', detail: "Expands the radius of your explosions and projectile splash. Enemies farther from the impact can be hit.", c: 'ember', max: 2, f: (u) => { u.shrap *= 1.35; } },
  { id: 'exec', name: 'EXECUTIONER', d: ['FOES UNDER 20%', 'TAKE +60% DAMAGE'], icon: 'scythe', detail: "After a foe drops below one fifth of its maximum health, subsequent hits deal 60% more damage. Works on bosses.", c: 'blood', max: 1, f: (u) => { u.exec = 1; } },
  { id: 'magnet', name: 'LODESTONE', d: ['PICKUPS FLY TO YOU', 'FROM FAR AWAY'], icon: 'magnet', detail: "Hearts and energy start following you from 175 pixels away. Their usual pickup range is 70.", c: 'gold', max: 1, f: (u) => { u.magnet = 1; } },
  { id: 'thorns', name: 'THORNS', d: ['WHEN HIT, BLAST', 'FOES AROUND YOU'], icon: 'thorns', detail: "Taking damage hits enemies within 50 pixels of you. Rank two doubles the retaliation damage.", c: 'blood', max: 2, f: (u) => { u.thorns++; } },
  // ---- evolutions ----
  { id: 'evoWpn', name: 'SPIRIT STRIKES', req: 'wpn', d: ['BASIC HITS RELEASE', 'HOMING SPIRITS'], icon: 'orb', detail: "Charging hits can release a homing spirit. Critical hits release three and a weapon kill releases five more.", c: 'gold', max: 1, f: (u) => { u.evoWpn = 1; } },
  { id: 'evoSpell', name: (k) => k.q.name.split(' ')[0] + ' & ' + k.e.name.split(' ')[0] + ' II', req: 'spell', d: ['Q AND E GAIN', 'TWO FREE REPEATS'], icon: 'book', detail: "Each successful regular skill casts again after 0.3 and 0.6 seconds for free. Aimed casts keep their original aim.", c: 'volt', max: 1, f: (u) => { u.evoSpell = 1; } },
  { id: 'evoUlt', name: (k) => k.r.name + ' II', req: 'focus', d: ['BIGGER ULTIMATE, THEN', '8S ASCENDED: X2 DAMAGE'], icon: 'moon', detail: "Your ultimate gains its fighter-specific upgrade. For eight seconds afterward you deal double damage and emit shockwaves.", c: 'gold', max: 1, f: (u) => { u.evoUlt = 1; } },
  { id: 'evoHeart', name: 'UNDYING', req: 'heart', d: ['ONCE PER WAVE, SURVIVE', 'A KILLING BLOW'], icon: 'heart', detail: "A lethal hit refills your hearts and grants three seconds of invulnerability. Recharges at the next wave.", c: 'gold', max: 1, f: (u) => { u.evoHeart = 1; } },
  { id: 'evoSwift', name: 'BLINK STORM', req: 'swift', d: ['+1 DASH, DASHES', 'SHRED FOES'], icon: 'boot', detail: "Adds a dash charge and two ranks of dash damage. A delayed cut strikes enemies along the path you took.", c: 'gold', max: 1, f: (u, p) => { u.evoSwift = 1; u.phantom += 2; p.dashMax++; p.charges++; } },
  { id: 'evoStatic', name: 'THUNDERGOD', req: 'static', d: ['EVERY 4TH HIT CHAINS', 'TO 7 FOES'], icon: 'bolt', detail: "Every fourth charging hit chains to up to seven foes and calls down lightning. A separate strike falls every 2.5 seconds.", c: 'gold', max: 1, f: (u) => { u.evoStatic = 1; } },
  { id: 'evoEmber', name: 'INFERNO', req: 'ember', d: ['BURNING FOES', 'EXPLODE ON DEATH'], icon: 'flame', detail: "Your Kindling burn grows stronger. A burning enemy explodes on death and leaves a patch of fire.", c: 'gold', max: 1, f: (u) => { u.evoEmber = 1; } },
  { id: 'evoOrbit', name: 'BLADE STORM', req: 'orbit', d: ['TWICE THE BLADES,', 'WIDER AND STRONGER'], icon: 'orbit', detail: "Doubles your orbiting blades and their contact damage. They sweep a wider orbit and fire outward.", c: 'gold', max: 1, f: (u) => { u.evoOrbit = 1; } },
  // shared
  { id: 'evoPower', name: 'RAZOR EDGE', req: 'power', d: ['ALL DAMAGE', '+30% MORE'], icon: 'whetstone', detail: "Multiplies the damage you already deal by 1.3, including every rank of Whetstone.", c: 'gold', max: 1, f: (u) => { u.dmg *= 1.3; } },
  { id: 'evoHaste', name: 'FRENZY', req: 'haste', d: ['ATTACK SPEED', '+25% MORE'], icon: 'boot', detail: "Multiplies your upgraded attack speed by 1.25. Melee swings, charges and ranged fire benefit.", c: 'gold', max: 1, f: (u) => { u.spd *= 1.25; } },
  { id: 'evoReach', name: "GIANT'S REACH", req: 'reach', d: ['MELEE REACH', '+30% MORE'], icon: 'reach', detail: "Multiplies the reach of your upgraded basic melee swings by 1.3.", c: 'gold', max: 1, only: MELEE, f: (u) => { u.reach *= 1.3; } },
  { id: 'evoCrit', name: 'DEATHMARK', req: 'crit', d: ['+15% CRIT CHANCE,', 'CRITS DEAL X3'], icon: 'eye', detail: "Adds fifteen percentage points to weapon critical chance. A weapon critical now deals triple damage.", c: 'gold', max: 1, f: (u) => { u.crit += 0.15; u.evoCrit = 1; } },
  { id: 'evoPhantom', name: 'SHADOW STEP', req: 'phantom', d: ['DASH CUTS HIT', 'THREE TIMES HARDER'], icon: 'dash', detail: "Triples the contact damage from Phantom Step, including the extra ranks granted by Blink Storm.", c: 'gold', max: 1, f: (u) => { u.evoPhantom = 1; } },
  { id: 'evoMirror', name: 'REFLECT ALL', req: 'mirror', d: ['PARRIED SHOTS HOME', 'IN ON YOUR FOES'], icon: 'shield', detail: "After a successful parry, the returned projectile steers toward enemies as it travels.", c: 'gold', max: 1, only: MELEE, f: (u) => { u.evoMirror = 1; } },
  { id: 'evoWell', name: 'WELLSPRING', req: 'well', d: ['ENERGY REFILLS', 'ANOTHER 60%'], icon: 'drop', detail: "Multiplies your current passive energy recovery rate by 1.6.", c: 'gold', max: 1, f: (u) => { u.regen *= 1.6; } },
  { id: 'evoDebt', name: 'BLOOD PACT', req: 'debt', d: ['HEAL 1 HEALTH', 'EVERY 10 KILLS'], icon: 'drop', detail: "Halves Blood Debt's kill requirement. Every ten kills recover one missing heart.", c: 'gold', max: 1, f: (u) => { u.evoDebt = 1; } },
  { id: 'evoShrap', name: 'CLUSTER BLAST', req: 'shrap', d: ['EXPLOSIONS ARE', 'ANOTHER 50% WIDER'], icon: 'burst', detail: "Multiplies your already expanded explosion and projectile splash radius by 1.5.", c: 'gold', max: 1, f: (u) => { u.shrap *= 1.5; } },
  { id: 'evoExec', name: 'GUILLOTINE', req: 'exec', d: ['FOES UNDER 35%', 'TAKE DOUBLE DAMAGE'], icon: 'scythe', detail: "Executioner now starts below 35% enemy health and doubles damage against that target.", c: 'gold', max: 1, f: (u) => { u.evoExec = 1; } },
  { id: 'evoMagnet', name: 'LIFELINE', req: 'magnet', d: ['ENERGY REFILLS 30%', 'FASTER, +1 MAX HEALTH'], icon: 'magnet', detail: "Adds a heart and fills it. Your energy regenerates 30% faster for the rest of the run.", c: 'gold', max: 1, f: (u, p) => { u.regen *= 1.3; p.maxHp++; p.hp++; } },
  { id: 'evoThorns', name: 'BRAMBLE', req: 'thorns', d: ['WHEN HIT, A BLAST', 'TWICE AS STRONG'], icon: 'thorns', detail: "Adds two ranks of Thorns. An enemy inside the retaliation radius takes twice the previous max-rank damage.", c: 'gold', max: 1, f: (u) => { u.thorns += 2; } },
  // fighter signatures
  { id: 'evoEcho', name: 'RIFT MASTER', req: 'echo', d: ['POWERS +25% DAMAGE,', 'COOLDOWNS -20%'], icon: 'blade', detail: "Increases Rift and Tempest damage by another 25% and multiplies both cooldowns by 0.8.", c: 'gold', max: 1, only: ['BLADE'], f: (u) => { u.spell *= 1.25; u.cdMul *= 0.8; } },
  { id: 'evoStorm', name: 'EYE OF THE STORM', req: 'storm', d: ['TEMPEST JUMPS', 'TO 3 MORE FOES'], icon: 'bolt', detail: "Tempest can chain to three additional targets after the jumps already gained from Storm Heart.", c: 'gold', max: 1, only: ['BLADE'], f: (u) => { u.evoStorm = 1; } },
  { id: 'evoMag', name: 'BOTTOMLESS MAG', req: 'mag', d: ['+100% AMMO,', 'EVEN FASTER RELOAD'], icon: 'magazine', detail: "Adds fourteen rounds to your revolver, improves reload speed and lets Deadeye mark more shots.", c: 'gold', max: 1, only: ['GUNNER'], f: (u) => { u.mag += 2; } },
  { id: 'evoPierce', name: 'RAILGUN', req: 'pierce', d: ['BULLETS PIERCE', '3 MORE FOES'], icon: 'bullet', detail: "Your revolver rounds can pass through three additional foes beyond the ranks from Hollow Points.", c: 'gold', max: 1, only: ['GUNNER'], f: (u) => { u.pierce += 3; } },
  { id: 'evoFrost', name: 'ABSOLUTE ZERO', req: 'frost', d: ['FROZEN FOES TAKE', 'DOUBLE DAMAGE'], icon: 'snow', detail: "Hits against frozen enemies deal double damage while the freeze lasts.", c: 'gold', max: 1, only: ['WIZARD'], f: (u) => { u.evoFrost = 1; } },
  { id: 'evoTwin', name: 'ARCANE STORM', req: 'twin', d: ['12 MISSILES AND', 'A HUGE BLIZZARD'], icon: 'star', detail: "Arcane Missiles launches twelve shots per cast. Blizzard expands from a 52 to a 66 pixel radius.", c: 'gold', max: 1, only: ['WIZARD'], f: (u) => { u.evoTwin = 1; } },
  { id: 'evoCharges', name: 'FOURTH STEP', req: 'charges', d: ['+1 DASH', 'CHARGE'], icon: 'boot', detail: "Adds another stored dash and fills that charge immediately.", c: 'gold', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'evoVenom', name: 'DEATH BLOSSOM', req: 'venom', d: ['SENKO POISON', 'BURNS TWICE AS HARD'], icon: 'drop', detail: "Doubles the damage per second of Senko poison over its three-second duration.", c: 'gold', max: 1, only: ['NINJA'], f: (u) => { u.evoVenom = 1; } },
  { id: 'evoOverclock', name: 'HYPERCLOCK', req: 'overclock', d: ['TURRETS AND COILS', 'FIRE FASTER STILL'], icon: 'coil', detail: "Adds two more Overclock ranks. Both your turret fire rate and coil pulse rate increase.", c: 'gold', max: 1, only: ['MECHANIC'], f: (u) => { u.overclock += 2; } },
  { id: 'evoHands', name: 'ASSEMBLY LINE', req: 'hands', d: ['+2 TURRETS', 'AT ONCE'], icon: 'turret', detail: "Raises your active turret limit by two. Building beyond the limit replaces the oldest turret.", c: 'gold', max: 1, only: ['MECHANIC'], f: (u) => { u.hands += 2; } },
  { id: 'evoAfter', name: 'EARTHQUAKE', req: 'after', d: ['GROUND SLAM SENDS', 'TWO MORE WAVES'], icon: 'burst', detail: "Ground Slam sends two more expanding shockwaves. Each can strike the same foe once.", c: 'gold', max: 1, only: ['TANK'], f: (u) => { u.after += 2; } },
  { id: 'evoIron', name: 'ADAMANT', req: 'iron', d: ['+5 MAX HEALTH', 'AND A FULL HEAL'], icon: 'shield', detail: "Increases your maximum health by five and restores all missing hearts immediately.", c: 'gold', max: 1, only: ['TANK'], f: (u, p) => { p.maxHp += 5; p.hp = p.maxHp; } },
  { id: 'evoCoolant', name: 'CRYO CORE', req: 'coolant', d: ['LASER HEATS UP', '75% SLOWER'], icon: 'snow', detail: "The laser generates one quarter of its original heat while firing, extending each burst before overheat.", c: 'gold', max: 1, only: ['ROBOT'], f: (u) => { u.evoCoolant = 1; } },
  { id: 'evoCluster', name: 'SWARM PODS', req: 'cluster', d: ['+6 ROCKETS', 'PER SALVO'], icon: 'rocket', detail: "Each Rocket Salvo launches six additional homing rockets. Each has its own impact and splash.", c: 'gold', max: 1, only: ['ROBOT'], f: (u) => { u.cluster += 2; } },
  { id: 'evoFork', name: 'RECURSION', req: 'fork', d: ['EARLIER OR', 'STRONGER CRASHES'], icon: 'bug', detail: "Reduces the number of bugs needed for a crash. At the two-bug minimum, spare ranks increase crash damage.", c: 'gold', max: 1, only: ['DEV'], f: (u) => { u.overflow++; } },
  { id: 'evoOverflow', name: 'SEGFAULT', req: 'overflow', d: ['ALL DAMAGE', '+25% MORE'], icon: 'stack', detail: "Multiplies damage from all of your attacks by 1.25. This stacks with the Dev's wave and version bonuses.", c: 'gold', max: 1, only: ['DEV'], f: (u) => { u.dmg *= 1.25; } },
  // ---- signature upgrades ----
  { id: 'echo', name: 'RIFT ECHO', d: ['RIFT CUTS', 'A SECOND TIME'], icon: 'blade', detail: "Rift cuts the enemies it marked a second time, shortly after the first cut.", c: 'volt', max: 1, only: ['BLADE'], f: (u) => { u.echo = 1; } },
  { id: 'storm', name: 'STORM HEART', d: ['TEMPEST JUMPS', 'TO 2 MORE FOES'], icon: 'bolt', detail: "Each rank lets Tempest jump to two more enemies if they are close enough to chain.", c: 'volt', max: 2, only: ['BLADE'], f: (u) => { u.storm++; } },
  { id: 'mag', name: 'EXTENDED MAG', d: ['+50% AMMO,', 'FASTER RELOAD'], icon: 'magazine', detail: "Adds seven revolver rounds per rank and shortens reload time. Your next reload fills the larger magazine.", c: 'gold', max: 2, only: ['GUNNER'], f: (u) => { u.mag++; } },
  { id: 'pierce', name: 'HOLLOW POINTS', d: ['BULLETS PIERCE', 'ONE MORE FOE'], icon: 'bullet', detail: "Each revolver round can continue through one additional target per rank.", c: 'ember2', max: 2, only: ['GUNNER'], f: (u) => { u.pierce++; } },
  { id: 'frost', name: 'FROSTBITE', d: ['FROZEN FOES SHATTER', 'WHEN THEY DIE'], icon: 'snow', detail: "Killing a frozen foe sends shards into nearby enemies. Blizzard can set up several shatters at once.", c: 'volt', max: 1, only: ['WIZARD'], f: (u) => { u.frost = 1; } },
  { id: 'twin', name: 'TWIN CAST', d: ['8 MISSILES AND', 'A WIDER BLIZZARD'], icon: 'star', detail: "Arcane Missiles launches eight shots instead of five. Blizzard grows from a 40 to a 52 pixel radius.", c: 'ember', max: 1, only: ['WIZARD'], f: (u) => { u.twin = 1; } },
  { id: 'charges', name: 'THIRD STEP', d: ['+1 DASH', 'CHARGE'], icon: 'boot', detail: "Store one more dash for a burst of movement. The new charge is ready immediately.", c: 'blood', max: 1, only: ['NINJA'], f: (u, p) => { p.dashMax++; p.charges++; } },
  { id: 'venom', name: 'VENOM EDGE', d: ['SENKO BEAM', 'POISONS FOES'], icon: 'drop', detail: "Senko leaves surviving targets poisoned. The poison keeps dealing damage for three seconds.", c: 'ichor', max: 1, only: ['NINJA'], f: (u) => { u.venom = 1; } },
  { id: 'overclock', name: 'OVERCLOCK', d: ['TURRETS AND COILS', 'FIRE 40% FASTER'], icon: 'coil', detail: "Each rank adds 40% of the original firing rate to turrets and Tesla coils.", c: 'ember2', max: 2, only: ['MECHANIC'], f: (u) => { u.overclock++; } },
  { id: 'hands', name: 'EXTRA HANDS', d: ['+1 TURRET', 'AT ONCE'], icon: 'turret', detail: "Each rank lets one more turret stay active. A turret normally lasts fourteen seconds.", c: 'volt', max: 2, only: ['MECHANIC'], f: (u) => { u.hands++; } },
  { id: 'after', name: 'AFTERSHOCK', d: ['GROUND SLAM', 'SENDS ONE MORE WAVE'], icon: 'burst', detail: "Ground Slam releases one additional wave per rank. Waves expand one after another and clear shots.", c: 'ember2', max: 2, only: ['TANK'], f: (u) => { u.after++; } },
  { id: 'iron', name: 'IRON SKIN', d: ['+3 MAX HEALTH', ''], icon: 'shield', detail: "Gain three permanent hearts for this run. The three new hearts start full.", c: 'bone', max: 2, only: ['TANK'], f: (u, p) => { p.maxHp += 3; p.hp += 3; } },
  { id: 'coolant', name: 'COOLANT', d: ['LASER HEATS UP', '40% SLOWER'], icon: 'snow', detail: "While firing, your laser builds 60% of its usual heat. You can hold the beam longer before overheating.", c: 'volt', max: 1, only: ['ROBOT'], f: (u) => { u.coolant = 1; } },
  { id: 'cluster', name: 'CLUSTER PODS', d: ['+3 ROCKETS', 'PER SALVO'], icon: 'rocket', detail: "Adds three rockets to each salvo per rank. The rockets spread out, then home in on targets.", c: 'ember', max: 2, only: ['ROBOT'], f: (u) => { u.cluster++; } },
  { id: 'fork', name: 'FORK BOMB', d: ['CRASHED FOES SPLIT', 'BUGS TO NEIGHBORS'], icon: 'bug', detail: "A crashed enemy spreads two bugs to each nearby foe. Those bugs count toward the next crash.", c: 'ichor', max: 1, only: ['DEV'], f: (u) => { u.fork = 1; } },
  { id: 'overflow', name: 'STACK OVERFLOW', d: ['EARLIER OR', 'STRONGER CRASHES'], icon: 'stack', detail: "Each rank reduces the crash threshold by one. Spare ranks increase crash damage once it reaches two bugs.", c: 'ichor', max: 2, only: ['DEV'], f: (u) => { u.overflow++; } },
  // ---- relics: legendary, one is chosen after every boss and never offered on normal waves ----
  { id: 'phoenix', relic: true, name: 'PHOENIX FEATHER', d: ['ONCE PER RUN, RISE', 'FROM DEATH IN FIRE'], icon: 'feather', detail: "A lethal hit consumes the feather, refills all hearts and unleashes a fire blast. It works once per run.", c: 'ember', max: 1, f: (u) => { u.phoenix = 1; } },
  { id: 'rage', relic: true, name: 'BERSERKER MARK', d: ['+60% DAMAGE AT', 'HALF HEALTH OR LESS'], icon: 'blade', detail: "Your attacks deal 60% more damage whenever your current health is at or below half of maximum.", c: 'blood', max: 1, f: (u) => { u.rage = 1; } },
  { id: 'crown', relic: true, name: 'STORM CROWN', d: ['LIGHTNING STRIKES A', 'FOE EVERY 2 SECONDS'], icon: 'crown', detail: "Every two seconds, lightning targets a living foe. Nearby enemies can also be struck.", c: 'volt', max: 1, f: (u) => { u.crown = 1; } },
  { id: 'hourglass', relic: true, name: 'HOURGLASS', d: ['COOLDOWNS -25%', 'AND +1 DASH'], icon: 'hourglass', detail: "Cuts both regular skill cooldowns by a quarter and adds one ready dash charge.", c: 'paper', max: 1, f: (u, p) => { u.cdMul *= 0.75; p.dashMax++; p.charges++; } },
  { id: 'midas', relic: true, name: 'MIDAS COIN', d: ['MORE LOOTLINGS, X2', 'ENERGY, +25% SCORE'], icon: 'coin', detail: "Raises the chance of a lootling, doubles energy drops from kills and adds 25% to the score for those kills.", c: 'gold', max: 1, f: (u) => { u.midas = 1; } },
  { id: 'reaper', relic: true, name: 'REAPER SCYTHE', d: ['KILLS RELEASE SOULS', 'THAT HUNT THE NEXT'], icon: 'scythe', detail: "Each kill has a 35% chance to release a homing soul that can damage another enemy.", c: 'hex', max: 1, f: (u) => { u.reaper = 1; } },
  { id: 'titan', relic: true, name: 'TITAN BELT', d: ['+4 MAX HEALTH', 'AND A FULL HEAL'], icon: 'belt', detail: "Adds four permanent hearts for this run and immediately restores all missing health.", c: 'bone', max: 1, f: (u, p) => { p.maxHp += 4; p.hp = p.maxHp; } },
  { id: 'eclipse', relic: true, name: 'ECLIPSE STONE', d: ['ULTIMATE CHARGES', 'TWICE AS FAST'], icon: 'moon', detail: "Doubles ultimate charge from qualifying hits. Stacks with Ultimate Mastery.", c: 'gold', max: 1, f: (u) => { u.focus *= 2; } },
];

export const MEND = { id: 'mend', name: 'MEND', d: ['RESTORE 3 HEALTH', ''], icon: 'heart', detail: "Restore up to three missing hearts immediately. You can take Mend again on a later wave.", c: 'blood', max: 999, f: (u, p) => { p.hp = Math.min(p.maxHp, p.hp + 3); } };
export const byId = (id) => (id === 'mend' ? MEND : UPGRADES.find((u) => u.id === id));
export function takeUpgrade(run, u) {
  if (u.only && !u.only.includes(run.char)) return false;
  if (u !== MEND && (run.taken[u.id] || 0) >= u.max) return false;
  u.f(run.up, run.p);
  if (u !== MEND) run.taken[u.id] = (run.taken[u.id] || 0) + 1;
  return true;
}
export function grantAllUpgrades(run) {
  const granted = [];
  // Resolve base ranks first, including signatures listed after their evolutions.
  for (const evolved of [false, true]) for (const u of UPGRADES) {
    if (!!u.req !== evolved || (u.only && !u.only.includes(run.char))) continue;
    const missing = u.max - (run.taken[u.id] || 0);
    for (let i = 0; i < missing; i++) takeUpgrade(run, u);
    if (missing > 0) granted.push(u);
  }
  return granted;
}
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
