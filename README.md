# Ashblade

A pixel-art hack and slash for the browser, on a computer or a phone. Pick a fighter and hold an arena against waves of monsters. Every fifth wave is a boss. Beating the Ashen King on wave 20 frees the sun and plays the ending, and then the game goes endless, getting harder every wave.

**Play it at [ash-blade.vercel.app](https://ash-blade.vercel.app/).**

- 8 chibi pixel-art fighters, each with a combo, three powers, a cinematic entrance that ends on their name card, a gory death scene of their own and an awakened second look. Every fighter's weapon is held in hand and turns to wherever you aim: blades swing through each cut and guns kick back when they fire
- Fighters that move with weight: 12-frame walks and runs where the body sinks into every step and springs up on the next, the arms swing against the feet and the run leans in. Rin, the fastest, has a quick little ninja run of her own, leaning hard with her arms swept back and her katana trailing behind her. They push off in a puff of dust, skid when they turn hard or stop, throw themselves forward into a dash with speed lines and afterimages, and flinch with their eyes screwed shut when hit. Stand still for a few seconds and they show off: Kael spins his sword, Vega twirls her revolver, Morrow raises his staff, Rin flicks her katana clean, Rivet tosses her wrench, Grom heaves his hammer onto his shoulder
- A big animated pixel portrait of every fighter on the select screen, each in a pose of their own and ending in a signature move: Kael's fire slash, Vega's gun twirl, Morrow's orb flare over a turning magic circle, Rin's flash cut through falling petals, Rivet's wrench taps, Grom's ground slam, Unit-7's charged shot, the Dev's glitch among floating code windows
- A title screen drawn in the game's own pixels: the swallowed sun over the ruins of the pit, and the eight fighters on a battlement, taking turns to show off their weapons
- An opening that tells the story in illustrated pixel panels (how King Aurel swallowed the sun) and shows the goal of a run, then all eight fighters cut in one after another and drop onto that battlement as the logo slams down (any key turns the page, Escape skips it)
- A villain who talks: the Ashen King taunts you through the run, meets you face to face on wave 20 (every fighter answers him in their own words), and an ending plays when he falls
- 10 kinds of monsters, drawn in the same pixel style as the fighters, including an archer whose aim you can see and a priest that heals the others, plus elites with affixes and wave twists that change the rules. Every kill breaks a monster apart pixel by pixel
- 10 bosses, up to The Dev, the game's own developer, on wave 50
- Upgrades after every wave and a relic after every boss
- 5 arenas, 4 difficulties, phone controls, and a save at every wave

![The title screen: the eight fighters on the battlement under the swallowed sun](docs/opening.png)

## Story

Aurel was the Sun King, and his kingdom lived in its light. When the sun grew old and dim he feared the dark that waits for everything, so he swallowed the sun whole, to burn forever. The sky went black, the land turned to ash, and he became the Ashen King. Every night his army of ash climbs out of the pit below his throne.

Eight fighters hold the pit, each for a reason of their own. The goal of a run: survive 20 waves, kill the Ashen King on the twentieth, and free the sun. He speaks to you on the way down: when the run begins, when each of his bosses arrives and dies, and face to face before the last fight, where every fighter answers him in their own voice. When he falls the sun breaks out of him, the light comes back, and your fighter has the last word.

Past wave 20 the pit keeps going. With the King dead, nothing keeps shut what was sealed below it, and something older starts to answer.

## Fighters

Every fighter has a basic attack, two powers on Q and E that cost energy, and an ultimate on R that charges as your hits land.

| Fighter | Hero | Basic attack | Q | E | R |
| --- | --- | --- | --- | --- | --- |
| Blade | Kael | 4-hit sword combo | Rift: blinks forward and cuts everything on the line | Tempest: knocks enemies back and chains lightning between them | Thousand Cuts: stops time and cuts every enemy on screen |
| Gunner | Vega Hale | Revolver, reloads after 14 shots | Buckshot: an 11-pellet blast that pushes you back | Deadeye: crosshairs lock on and she fires one sure critical shot at each of the 6 nearest enemies | Last Stand: 4 seconds of minigun |
| Wizard | Morrow | Homing magic bolt | Arcane Missiles: a rune circle flares and 5 homing missiles leave his staff | Blizzard: a 3-second frost storm where you aim that cuts and freezes everything in it | Starfall: meteors rain on enemies for about 3 seconds |
| Samurai | Rin | 4-hit katana combo ending in a quick-draw dash. 2 dashes, 8 health | Senko: a beam of light shoots from her sword across the arena in an instant, hitting everything on the line for huge damage and destroying shots. Costs 50 energy | Hana Arashi: for 4 seconds a ring of petal blades cuts anything close, parries shots, and speeds her up | Issen: time stops while she cuts from enemy to enemy 11 times |
| Mechanic | Rivet | Wrench combo | Turret, up to 2 at once | Tesla Coil: zaps 3 enemies at a time for 7 seconds | Iron Titan: a giant mech lands and fights beside her for 18 seconds, punching, firing missile salvos and ground-pounding to stun |
| Tank | Grom | Slow hammer combo. 12 health | Bulldoze: charges and pins enemies against walls | Ground Slam: shockwaves that stun and wipe out enemy shots | Fortress: 6 seconds of no damage, and shots bounce back |
| Robot | Unit-7 | Laser that overheats if held too long | Rocket Salvo: 6 homing rockets | Barrier: blocks 3 hits, then bursts | Orbital Laser: a beam from above follows your aim for 4.5 seconds |

The four melee fighters charge up when you hold attack. Let go early for a weaker version.

| Fighter | Charged attack |
| --- | --- |
| Kael | Ashen Crescent: a wide burning cut that throws a wave of fire ahead and knocks shots back |
| Rin | Iai Dash: she flash-steps through everything ahead, parrying every shot on the way, and the cuts open a beat later |
| Rivet | Overclock Slam: the wrench smashes the floor, stuns, arcs lightning to nearby enemies, and knocks shots back on the way down |
| Grom | Earthshatter: the hammer knocks shots back, the ground cracks in a ring that stuns everything in it, and the shockwave wipes out every enemy shot it rolls over |

The eighth fighter is The Dev, a programmer in a motorized wheelchair who wrote this world and is now debugging it from the inside. He starts weaker than the others, with one shot at a time and 6 health, and grows with every wave and every 20 kills: about even by wave 15, 7.5 times as strong by wave 50. His shots plant bugs that crash an enemy.

Pink afterimages trail behind Rin when she runs. She wears her katana sheathed at her hip: swinging, charging, a power or running flat out draws it, and a moment after she's done she flicks it clean and slides it home with a click. The first cut out of the scabbard is a quick draw (IAI): a flash along the cut and a sure critical hit, half again as hard. Her **Flash Strike**: the first sword swing or skill within 0.6 seconds after a dash does 2.5 times the damage, so a dash into Senko hits for well over 200.

Every fighter awakens once per run, after any five evolutions (see Upgrades). The evolution banner counts them, AWAKENING 1/5 to 5/5. The awakened forms are Ashen Kael, Deadeye Vega, Archmage Morrow, Oni Rin, Rivet Mk-II, Titan Grom, Unit-7 Omega and Root. Awakening brings a new look, 1 more max health, and an evolved kit for the rest of the run:

- **Look:** mostly black and gold. Ashen Kael gets silver-white hair, a gold scarf and black clothes; Deadeye Vega a black hat and coat with gold, silver hair and a crimson bandana; Archmage Morrow a black robe with gold trim and blazing gold eyes; Oni Rin a samurai's battle dress: a red scarf whose end folds into a cape, a black chest plate with a white V and thin gold trim, white bracers banded red, a red obi with its knot, red skirt plates hemmed in gold over a grey hakama, and long blue hair falling down both sides with pink ends; Rivet Mk-II platinum hair, red-lensed gold goggles and black overalls with gold; Titan Grom black plate with gold trim and a burning red visor; Unit-7 Omega a gold shell on a black frame, and it flies on two jet engines with swept wings; Root a black hoodie, four orbiting screens and windows popping up around him.
- **Weapon:** each awakened fighter carries a weapon of their own: a black-and-gold greatsword with a burning edge, a long-barreled gold hand cannon with a sight, a black staff with a gold crescent and a sun-gold orb, a black nodachi with a glowing crimson edge, a gold power wrench with a glowing core, a spiked black-and-gold maul with red runes, a gold plasma cannon.
- **Effects:** slashes, shots, beams, particles and powers switch to an awakened color scheme, drawn thicker, with an extra glowing spark on every effect, a sparkling trail behind every shot, a colored ribbon behind every swing, and a weapon that smoulders all the time.
- **Basic attack:** 30% more damage, plus an extra effect on every hit.
- **Melee swings:** every awakened swing leaves a second, wider arc and adds the fighter's own extra: Ashen Kael throws flame crescents, Oni Rin sends gold blade waves, Rivet Mk-II arcs lightning forward, and Titan Grom rolls blood-red shockwaves along the ground, with his slam and spin ending in a quake ringed by eruptions.
- **Charged attack:** a double ring spins at the feet while charging, and the release bursts in the fighter's awakened colors. Ashen Kael throws five crescents and a line of white fire erupts along the cut. Oni Rin fans eight gold waves out of her dash, then a second cut opens along it. Rivet Mk-II calls a ring of lightning strikes and a long chain. Titan Grom sends three aftershocks and a ring of eruptions.
- **Q and E:** cost a quarter less, recharge a fifth faster, and release an awakened burst after each cast.
- **Ultimate:** 30% more damage, an awakened finisher, and it keeps 30% of its charge. It also charges a quarter faster.

| Awakened | Basic hits | After Q and E | After the ultimate |
| --- | --- | --- | --- |
| Ashen Kael | Set enemies on fire | A ring of fire | The whole screen burns |
| Deadeye Vega | Shots ricochet to the next enemy | A fan of 10 gold rounds | A homing volley at up to 10 enemies |
| Archmage Morrow | Bolts arc to a second enemy | Lightning on the 3 nearest enemies | Lightning on 8 enemies |
| Oni Rin | A petal cut opens a beat later | A ring cut that parries every shot near her | The blossom storm rises around her for free |
| Rivet Mk-II | Every third hit arcs to two more enemies | A tesla chain through 5 enemies | A 10-enemy chain and lightning strikes |
| Titan Grom | A shockwave through the enemies around the target | A quake that stuns | A great quake that stuns everything near |
| Unit-7 Omega | The laser scorches | 3 homing mini-rockets | A ring of 8 homing rockets |
| Root | Each hit forks a bug into a nearby enemy | Crashes the 3 nearest enemies | Glitches everything in range |

Each fighter also has their own sounds and an entrance of about three seconds in a letterbox, ending on their name card. Any attack key, Space, Enter or a tap skips it.

| Fighter | Entrance |
| --- | --- |
| Kael | The sky darkens and he crashes down as a burning meteor, ringed by pillars of fire, then sweeps his sword all the way round |
| Vega | High noon: a bell, dust on the wind, a tumbleweed. She drops in spinning and firing all round, lands in falling brass, twirls her revolver and fires once at the sky |
| Morrow | A summoning circle draws itself rune by rune, a pillar of violet light comes down into it, and he floats down inside it as it bursts |
| Rin | Petals storm across while her afterimages cut the air. She appears in a burst of sakura smoke, flicks her blade clean, and every cut left in the air bursts at once |
| Rivet | A drop pod slams down on a target marker, vents steam and blows open in golden smoke, and she slams her wrench into the floor |
| Grom | The ground shakes under a growing shadow, he falls hammer first, and the floor splits into glowing cracks and rock spikes |
| Unit-7 | Scan lines, DEPLOYING UNIT-7 and a countdown, then an orbital beam. It builds itself up row by row inside it and powers on |
| The Dev | Code rains and a terminal compiles him. ACCESS GRANTED, the window shuts off like an old screen, and he renders in from coarse blocks |

### How they kill, and how they die

| Fighter | Kills | Death |
| --- | --- | --- |
| Kael | Enemies catch fire and turn to ash | Cut in two: his top half slides off, his legs fold, both halves burn to ash, and his sword stays standing in the floor. *The last ember goes out* |
| Vega | Head shots, gun smoke, a spent casing | Riddled with bullets, the last one takes her hat off. On her knees she fires one last shot at the sky, then falls into her own blood. *One bullet short* |
| Morrow | Enemies unravel into arcane light | His own spell lifts him up and tears him into burning pieces that rain down with his blood. *The spell was never finished* |
| Rin | A burst of petals | Six cuts flash across her, then she falls apart along all of them at once, and the pieces scatter into petals. *She scatters with the blossoms* |
| Rivet | Enemies come apart into bolts and springs | Her rig overloads and blows her apart, head and chest flying, and her machines go up with her. *Warranty void* |
| Grom | Enemies are flattened into a splat | The King's crown comes down out of the dark onto his helm and makes his last guard kneel: his armor buckles plate by plate, blood bursting from its joints, he braces on his hammer until the haft snaps, and the crown crushes him into his own armor. His helm rolls away and its visor light goes out. *Kneel before the King* |
| Unit-7 | Enemies disintegrate into pixels | Its head pops off on a fountain of oil, the body counts down from three and blows itself to scrap. *Shutdown complete* |
| The Dev | Enemies are deleted, now and then with a 404 | A FATAL ERROR box, and he is deleted line by line. *Process terminated* |

### Unlocking fighters

You start with Blade. The select screen shows each mission and how close you are. A fighter who has cleared wave 25 gets a silver frame on the select screen and a WAVE 25 VETERAN badge; clearing wave 50 earns a gold frame with a crown, sparkles and a WAVE 50 LEGEND badge.

| Fighter | Mission |
| --- | --- |
| Gunner | Reach wave 10 |
| Wizard | Land a 100-hit combo |
| Samurai | Make 25 perfect dodges in one run |
| Mechanic | Kill 1500 enemies across all runs |
| Tank | Beat any boss without getting hit |
| Robot | Defeat the Ashen King |
| The Dev | Reach wave 50 |

![Fighter select](docs/select.png)

## Upgrades

After every wave you pick one of three upgrades. Every upgrade has an evolution, offered once you max it. Any five evolutions awaken your fighter.

| Max this | Evolution |
| --- | --- |
| Weapon Mastery | Spirit Strikes: basic hits release homing spirits |
| Spell Mastery | Q and E cast a second time for free |
| Ultimate Mastery | Your ultimate gets stronger, then you deal double damage for 8 seconds |
| Whetstone | Razor Edge: all damage +30% more |
| Quickhand | Frenzy: attack speed +25% more |
| Long Edge (melee) | Giant's Reach: melee reach +30% more |
| Keen Eye | Deathmark: +15% crit chance, and crits deal triple damage |
| Heartwood | Undying: survive one killing blow per wave |
| Swift Step | Blink Storm: an extra dash, and dashing cuts every enemy you pass |
| Phantom Step | Shadow Step: dash cuts hit three times harder |
| Mirror Guard (melee) | Reflect All: parried shots home in on enemies |
| Deep Well | Wellspring: energy refills 60% faster again |
| Lodestone | Lifeline: energy refills 30% faster, +1 max health |
| Blood Debt | Blood Pact: heal 1 health every 10 kills |
| Static Charge | Thundergod: every 4th hit chains lightning to 7 enemies |
| Kindling | Inferno: burning enemies explode when they die |
| Shrapnel | Cluster Blast: explosions 50% bigger again |
| Executioner | Guillotine: enemies under 35% health take double damage |
| Orbit Blades | Blade Storm: twice the blades, on a wider orbit |
| Thorns | Bramble: the blast when you're hit is twice as strong |

Each fighter's own upgrades evolve too:

| Fighter | Upgrade → evolution |
| --- | --- |
| Kael | Rift Echo → Rift Master (powers +25% damage, cooldowns -20%). Storm Heart → Eye of the Storm (Tempest jumps to 3 more) |
| Vega | Extended Mag → Bottomless Mag (+100% ammo). Hollow Points → Railgun (bullets pierce 3 more) |
| Morrow | Frostbite → Absolute Zero (frozen enemies take double damage). Twin Cast → Arcane Storm (12 missiles, a huge blizzard) |
| Rin | Third Step → Fourth Step (+1 dash). Venom Edge → Death Blossom (poison burns twice as hard) |
| Rivet | Overclock → Hyperclock (turrets and coils fire faster still). Extra Hands → Assembly Line (+2 turrets) |
| Grom | Aftershock → Earthquake (ground slam sends 2 more waves). Iron Skin → Adamant (+5 max health and a full heal) |
| Unit-7 | Coolant → Cryo Core (the laser heats 75% slower). Cluster Pods → Swarm Pods (+6 rockets per salvo) |
| The Dev | Fork Bomb → Recursion (a crash needs 1 fewer bug). Stack Overflow → Segfault (all damage +25%) |

## Relics

Every boss drops three relics, and you keep one.

| Relic | Effect |
| --- | --- |
| Phoenix Feather | Once per run, rise again at full health instead of dying |
| Berserker Mark | +60% damage at half health or less |
| Storm Crown | Lightning strikes a random enemy every 2 seconds |
| Hourglass | Cooldowns 25% shorter and one more dash |
| Midas Coin | More lootlings, double energy from kills, +25% score |
| Reaper Scythe | Kills often release a soul that hunts the next enemy |
| Titan Belt | +4 max health and a full heal |
| Eclipse Stone | Your ultimate charges twice as fast |

## Monsters

| Monster | From wave | What it does |
| --- | --- | --- |
| Husk | 1 | Walks up and lunges |
| Wisp | 2 | Keeps its distance and fires pink orbs |
| Tick | 3 | Runs at you and explodes |
| Slime | 3 | Hops on you, and splits in two when it dies |
| Brute | 4 | Charges in a straight line and stuns itself on walls |
| Spitter | 5 | A rooted plant that lobs acid where you're heading |
| Archer | 4 | A hooded goblin with a bow. It keeps its distance, then draws and aims, and a dashed red line shows exactly where the arrow will fly: it follows you while the bow is drawn, then locks and flashes white just before the shot. Arrows can be parried |
| Ash Priest | 6 | A robed healer that stays behind the others. It chants inside a green circle, tethered to every wounded monster in it, then heals them by 30%. Hit it mid-chant to break the spell |
| Shade | 8 | Disappears and reappears behind you |
| Lootling | 4 (rare) | A goblin that runs off with a sack of gold. Kill it before it digs out for energy, a heart and score |

From wave 6 some monsters are elites, with more health and one affix: Regen, Volatile, Warded, Frenzy or Split.

About one wave in three from wave 6 also comes with a twist. Survive it for a bonus.

| Twist | What changes |
| --- | --- |
| Blood Moon | Enemies are 25% faster, and kills score double |
| Swarm | Almost twice as many enemies, with half the health |
| Elite Hunt | Half the enemies are elites, and each drops a heart |
| Gold Rush | Three lootlings join the wave |
| Glass | Enemies have half health, and every hit you take costs an extra heart |
| Blackout | The lights go out except around you. 1.5x score |

![Grom in a Blood Moon wave](docs/twist.png)

Monsters die in pixels. A cut splits a monster along its own pixel grid, and both halves fly apart and crumble from the wound outward, shedding square chips that bounce on the floor; any other kill dissolves it pixel by pixel from the side the blow came from. Heavy hits launch bodies across the arena, tumbling a quarter turn at a time and knocking over whatever they hit, until they shatter. Kills close together chain into multi-kills, up to Annihilation at 20.

## Bosses

| Wave | Boss | What it does |
| --- | --- | --- |
| 5 | The Warden | Sword sweeps, shockwave jumps, rings and spirals of orbs |
| 10 | The Brood Mother | Burrows under you, spits acid, lays eggs |
| 15 | Iron Colossus | Lasers and missiles. Its shield only breaks to an orb you knocked back |
| 20 | The Ashen King | Aurel himself. He talks to you before the fight, then three phases, armored knights, rings of fire, and his own Thousand Cuts |
| 25 | Void Wyrm | A serpent that tunnels under you and breathes orbs |
| 30 | Storm Herald | Calls lightning on you and teleports |
| 35 | The Mirror | A dark copy of your own fighter |
| 40 | Eclipse | A giant eye with spirals and rotating beams |
| 45 | The Clockwork | Its clock hands sweep the arena as beams |
| 50 | The Dev | The developer himself, three times the size: RM -RF lines, fork bombs, and a Kernel Panic at 25% health |

After wave 50 all ten come back with more health. Every boss enrages after 60 seconds.

![Oni Rin fighting The Dev on wave 50](docs/boss.png)

## Controls

| Action | Keyboard and mouse | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Stick on the left |
| Aim | Mouse | Drag from the attack button. A tap aims at the nearest enemy |
| Attack | Left click or J. Hold to keep firing or to charge | Attack button |
| Dash | Space or right click | Dash button |
| Powers | Q, E, R | Tap to cast at the nearest enemy, or hold and drag to aim |
| Pause | Esc | Button at the top |

Hearts are rare: ordinary monsters seldom drop one, a boss's summoned army never does, and after a hit you're only safe for a third of a second. Dashing makes you untouchable. Dash through an attack as it lands and time slows, and your next hit is a counter for triple damage. Hit a pink orb to send it back.

Hits in a row build a combo, ranked D, C, B, A, S, SS and SSS. From A up the rank powers you: every hit does 5% more damage at A, 10% at S, 18% at SS and 30% at SSS (the HUD shows it under the rank). From S you leave afterimages in the rank's color, and every rank up from A bursts off you. Getting hit loses the combo and the power with it.

![Phone controls](docs/mobile.png)

## Settings

The game fills the window on any screen by default. Sharp mode instead zooms by whole numbers so every pixel is the same size, and there are fixed sizes from 720p to 1440p.

The other settings cover volume and music choice, color theme and screen filters, arena, difficulty, and vibration on Android phones. Screen shake starts at 25%. Shake, flashes, damage numbers and particles can all be turned up or down.

## How it's built

Plain JavaScript with no libraries and no build step. The game runs on a 320×180 grid and draws on a 960×540 canvas, three canvas pixels to a game pixel, so the fighters can carry three times the detail of the world around them. Each fighter comes from one picture of them, read on that picture's own pixel grid so every drawn pixel becomes exactly one sprite pixel (`art/sprites/soulknight-masters/`, about 27 by 32 pixels each). Their idle, walk, run, dash, hurt and death frames and their awakened colors are drawn from it at that size, then doubled, so every pixel is a crisp 2×2 block (`art/sprites/heroes/`). Each weapon is its own sprite at the same pixel size, turned in advance to 64 angles so it can point anywhere. The entrances, the deaths, the opening and the title screen are drawn in code from the same sprites: a death can cut the body along straight lines into pieces that each fall, spin, bounce and bleed on their own. The select screen's portraits are posed and animated from the same pictures (`art/sprites/portraits/`), then drawn eleven times bigger with their effects in code. Monsters and bosses are pixel grids in `src/monster-art.js`, shaded the way the fighters are: flat bands of light and shadow with a checkered seam between them, dark lines where one shape overlaps another, and a little grain on rough skin and stone. The story, the dialog box and the ending are in `src/story.js`, and the music and sound are generated in the browser with the Web Audio API. The page makes no network requests, and runs and settings save only in your browser. It is built to run smoothly on phones: the game is capped at 60 fps, sprites and the camera move in canvas pixels so motion stays smooth, the large pictures sit on their own layers and are only redrawn when they change, the fighters' sprite sheets and portraits are small (about 530 KB for all of them), and if a device starts falling behind in a big fight the game thins out its particle effects on its own until it keeps up again.

| Folder | Contents |
| --- | --- |
| `src/` | The game. `src/hero-sprites.js` loads the fighters and turns their weapons |
| `art/` | The fighters' sprite sheets and weapons, and the pictures they're made from |
| `icons/` | Browser tab and home screen icons |
| `skin/` | Each fighter's current and awakened sprite as an image |
| `desc/` | A description of each fighter |
| `docs/` | Screenshots for this README |

## License

[PolyForm Strict 1.0.0](LICENSE.md). You can play it and read the code for personal, non-commercial use. You may not change it, share copies or use it commercially. For anything else, ask the author.
