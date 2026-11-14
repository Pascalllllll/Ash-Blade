# Ashblade

Ashblade is a pixel-art hack and slash game that runs in the browser, on a computer or a phone. You pick a fighter and hold an arena against waves of enemies. Every fifth wave is a boss, and the fourth boss, the Ashen King on wave 20, ends the story. After that the game goes endless, and every wave adds 15% enemy health, more enemies and more elites.

**Play it at [ash-blade.vercel.app](https://ash-blade.vercel.app/).**

What's in it:
- 8 fighters, each with its own combo, three powers, entrance, sounds and an awakened second look
- 8 kinds of enemies, including the Lootling, a goblin that runs off with a sack of gold
- 10 bosses up to wave 50, where the final boss is The Dev, the game's own developer
- Wave twists that change the rules: Blood Moon, Swarm, Elite Hunt, Gold Rush, Glass and Blackout
- Heavy hits that launch bodies into crowds, multi-kill chains, perfect dodges and counters
- Elites with affixes, a relic to choose after every boss, and a signature kill and death scene for every fighter
- Endless mode, 5 arenas, 4 difficulties, phone controls, and saves at every wave

![Title screen](docs/title.png)

## Story

The Ashen King swallowed the sun and sealed the last of the world in a pit. Seven fighters went down after him, each for a reason of their own. An eighth was there before any of them.

## Fighters

Every fighter has a basic attack, two powers on Q and E that cost energy, and an ultimate on R that charges as your basic attack lands.

| Fighter | Hero | Basic attack | Q | E | R |
| --- | --- | --- | --- | --- | --- |
| Blade | Kael | 4-hit sword combo: slash, X-cut, thrust, whirlwind | Rift: blinks forward and cuts every enemy on the line | Tempest: knocks enemies back and chains lightning between them | Thousand Cuts: stops time and cuts every enemy on screen |
| Gunner | Vega Hale | Revolver, reloads after 14 shots | Buckshot: 11-pellet shotgun blast that pushes you back | Deadeye: time slows, crosshairs lock onto the 6 nearest enemies (8 or 10 with Extended Mag), then she fans the hammer, one sure critical shot each. No aiming needed | Last Stand: 4 seconds of minigun |
| Wizard | Morrow | Homing magic bolt | Frost Blink: teleports and freezes enemies at both ends | Meteor | Starfall: meteors land on enemies for about 3 seconds |
| Samurai | Rin | 4-hit katana combo: cut, X-cut, lunging stab, a quick-draw that dashes through and cuts twice. 2 dashes, 7 health | Sakura Wave: a flying crescent slash that passes through enemies and cuts their shots out of the air | Kamae: a counter stance. If anything hits you in it, you flash-step to the attacker, cut everything around it and your next hit does triple damage. If nothing comes, you still draw for a small cut | Issen: time stops while you flicker from enemy to enemy in 11 cuts, then you sheathe your sword and everything you cut bursts |
| Mechanic | Rivet | Wrench combo: swing, twirl, ground slam | Turret, up to 2 at once | Tesla Coil: zaps 3 enemies at a time for 7 seconds | Iron Titan: a giant mech rockets down onto the arena with a shockwave, stomps after enemies, throws piston punches and fires homing missile salvos from its shoulder pods for 12 seconds, then jets away |
| Tank | Grom | Slow hammer combo: sweep, ground slam, full spin. 12 health | Bulldoze: charges and pins enemies against walls | Ground Slam: shockwaves that stun | Fortress: 6 seconds of no damage, shots bounce back |
| Robot | Unit-7 | Laser that overheats if you hold it too long | Rocket Salvo: 6 homing rockets | Barrier: blocks 3 hits, then bursts | Orbital Laser: a beam from above follows your aim for 4.5 seconds |

Every fighter, monster and boss breathes, blinks and leans into attacks. Monsters move with a full set of motion on top of their frames: each step bounces and lands, they lean into where they're going, sway and breathe while idle, crouch and lean back on a wind-up, stretch into lunges and charges, wobble when stunned and tilt from hits. Each kind moves its own way: slimes jiggle, larvae wiggle, wisps and shades sway, ticks scuttle and brutes stomp. The fighters' hair and clothes blow in the wind, streaming behind whichever way they face: Rin's side-swept blue hair fading to pink at the tips and the red jacket tied around her hips, Morrow's cowl and beard, Vega's bandana and coat. Grom's crimson cape snaps behind him, Morrow floats instead of walking when he moves, and Unit-7 rolls on tank treads. Every fighter also has its own attack and hit sounds: steel rings for the Blade, an anvil clang for the Mechanic, a chiptune arpeggio for The Dev, and so on. Hits rise in pitch as your combo grows. Each fighter also has its own entrance at the start of a run. The Tank falls from the sky and cracks the floor, the Robot teleports down in a beam, and the Mechanic breaks out of a crate.

The eighth fighter is The Dev, who wrote this world and is now debugging it from the inside. He starts as an ordinary programmer with a laptop on his lap, riding a motorized wheelchair. At 250% power a laser rewrites him into his hooded form, riding a rebuilt chair with neon wheels and a holo screen. He starts below the other fighters, with one shot at a time and 6 health, and grows with every wave and every 20 kills. He's about even by wave 15, then ramps hard after wave 20: about 0.8x power on wave 1, 1.2x by wave 10, 1.7x by wave 20, 3.2x by wave 30, 5x by wave 40 and 7.5x by wave 50. His spread widens past waves 20 and 35. His shots plant bugs that crash an enemy: five bugs early, four from wave 15 and three from wave 30.

Every other fighter also awakens into a new look once per run: on its first evolution upgrade or at wave 25. A beam of light hits them, they change skin and gain 1 max health. The awakened forms are Ashen Kael, Deadeye Vega, Archmage Morrow, Oni Rin, Rivet Mk-II, Titan Grom and Unit-7 Omega.

### How each fighter kills, and how each one dies

Every fighter finishes enemies their own way, and every fighter has a death scene of their own. It ends on an epitaph, which also shows on the game-over screen.

| Fighter | Kills | Death |
| --- | --- | --- |
| Kael | Enemies catch fire; embers and ash rise off the body | Drops to one knee, plants his sword and crumbles to ash from the head down. The sword stays, its flame going out. *The last ember goes out* |
| Vega | Head shots: blood jets up, gun smoke, a spent casing | Spins, falls flat on her back, and her dropped revolver fires one last shot into the sky. *One bullet short* |
| Morrow | Enemies unravel into motes of arcane light | Rises as his last spell turns on him and implodes. His hat falls where he stood. *The spell was never finished* |
| Rin | A burst of petals, and the cut line hangs in the air | A storm of cherry blossoms rises around her and thickens until she fades behind it, then she scatters into petals and the wind carries them away. *She scatters with the blossoms* |
| Rivet | Enemies come apart into bolts, nuts and springs | Her suit overloads, beeping faster and faster, then blows apart. Her goggles bounce away. *Warranty void* |
| Grom | Enemies are flattened into a wide splat and a ring of dust | His armor cracks plate by plate and he falls forward like a wall. The ground shakes and his helmet rolls away. *The wall has fallen* |
| Unit-7 | The laser disintegrates enemies into white-hot pixels and ash | Shorts out with sparks and ERR. Its head pops off on a spring and the red eye fades to dark. *Shutdown complete* |
| The Dev | Enemies are deleted into glitch pixels, now and then with a 404 | The screen tears, a FATAL ERROR box pops up, and he is deleted line by line. His empty wheelchair rolls away. *Process terminated* |

### Unlocking fighters

You start with Blade. Every other fighter unlocks when you finish its mission, and the game tells you the moment it happens. The fighter select screen shows each mission and how close you are.

| Fighter | Mission |
| --- | --- |
| Gunner | Reach wave 10 |
| Wizard | Land a 100-hit combo |
| Samurai | Make 25 perfect dodges in one run |
| Mechanic | Kill 1500 enemies in total, across all runs |
| Tank | Beat any boss without getting hit |
| Robot | Defeat the Ashen King |
| The Dev | Reach wave 50 |

![Fighter select](docs/select.png)

## Upgrades

After every wave you pick one of three upgrades. Each fighter has about 60 picks before the list runs out, which lasts past wave 50. Taking an upgrade to its maximum level unlocks its evolution:

| Max this | Evolution |
| --- | --- |
| Ultimate Mastery | Your ultimate becomes version II: it lasts longer or hits harder, then you deal double damage for 8 seconds |
| Spell Mastery | Q and E cast a second time for free |
| Weapon Mastery | Basic hits release homing spirits |
| Heartwood | Survive one killing blow per wave |
| Swift Step | An extra dash, and dashing cuts every enemy you pass |
| Static Charge | Every 4th hit chains lightning to 7 enemies |
| Kindling | Burning enemies explode when they die |
| Orbit Blades | Twice the blades, on a wider orbit |

## Enemies

| Enemy | From wave | What it does |
| --- | --- | --- |
| Husk | 1 | Walks up and lunges |
| Wisp | 2 | Keeps its distance and fires pink orbs |
| Tick | 3 | Runs at you and explodes |
| Slime | 3 | Hops at you and hurts when it lands. Splits into two small slimes when it dies |
| Brute | 4 | Charges in a straight line and stuns itself on walls |
| Spitter | 5 | A rooted plant that lobs acid where you are heading. The acid stays on the floor for 4 seconds |
| Shade | 8 | Fades out, reappears behind you, and slashes after a short warning |
| Lootling | 4 (rare) | A goblin with a sack of gold that runs from you and never fights. Every hit knocks a coin loose. Kill it for a jackpot of energy, two hearts and a big score bonus. After 11 seconds it digs out and is gone |

### Elite affixes

From wave 6 some enemies are elites: more health, a coloured outline, and one affix. The affix name shows over an elite when it appears and whenever you hit it.

| Affix | What it does |
| --- | --- |
| Regen | Heals fast if you stop hitting it for a moment |
| Volatile | Pulses orange. When it dies it leaves a blast that goes off after a short warning |
| Warded | A cyan shell soaks damage before its health. Break the shell first |
| Frenzy | Moves and attacks about 30% faster |
| Split | Splits into two smaller copies when it dies |

### Wave twists

From wave 6, about one normal wave in three comes with a twist, announced when the wave starts and tagged next to the wave number. Survive it for a score bonus, full energy and a heart.

| Twist | What changes |
| --- | --- |
| Blood Moon | The arena turns red, enemies are 25% faster, and every kill scores double |
| Swarm | Almost twice as many enemies, with half the health |
| Elite Hunt | Half the enemies are elites, and every elite drops a heart |
| Gold Rush | Three lootlings join the wave |
| Glass | Enemies have half health, and every hit you take costs an extra heart |
| Blackout | The lights go out except around you. 1.5x score |

![A Blood Moon wave](docs/twist.png)

### Big hits

- Heavy blows (combo finishers, counters, explosions and ultimates) launch the body across the arena. A flying body knocks over and damages every enemy it hits, so one good hit can bowl through a crowd. Lighter cuts still slice enemies in two.
- Kills within half a second of each other chain into a multi-kill: Double Kill, Triple Kill, up to Annihilation at 20. The bonus score grows with the square of the chain.
- Enemies squash and wobble when hit, the camera kicks in the direction of each blow, and damage numbers hop out of the target.
- The last kill of a wave freezes the frame and sends out a shockwave.
- On your last two hearts, a heartbeat plays, and it beats faster on the last one.
- The end-of-run screen shows score, time, kills, bosses slain, damage dealt, best multi-kill, longest combo, perfect dodges, top rank and lootlings caught.

## Relics

Every boss drops three relics, and you keep one. Relics are only offered after bosses, and each one changes the run.

| Relic | Effect |
| --- | --- |
| Phoenix Feather | Once per run, when a hit would kill you, you rise again at full health in a fire blast that damages every enemy |
| Berserker Mark | +60% damage while you're at half health or less |
| Storm Crown | Lightning strikes a random enemy every 2 seconds |
| Hourglass | Cooldowns 25% shorter and one more dash |
| Midas Coin | Lootlings show up far more often, kills drop twice the energy, +25% score |
| Reaper Scythe | Kills often release a soul that hunts the next enemy |
| Titan Belt | +4 max health and a full heal |
| Eclipse Stone | Your ultimate charges twice as fast |

## Bosses

| Wave | Boss | What it does |
| --- | --- | --- |
| 5 | The Warden | Sword sweeps, jumps that send out shockwaves, spirals of orbs, rings of orbs with one gap, four rotating chain beams |
| 10 | The Brood Mother | Digs under the floor and comes up under you, spits acid, lays eggs, releases swarms of larvae, rains acid over the whole arena |
| 15 | Iron Colossus | Sweeping lasers, missile strikes, a rocket fist that flies back to its arm, and four spinning lasers. Its shield breaks only when you hit it with an orb you knocked back |
| 20 | The Ashen King | Twice the size of the other bosses, with three phases. He summons armored knights, sends out rings of fire, and in the last phase darkens the arena, spins six beams around himself and uses Thousand Cuts on you |

After wave 20 six more bosses join, ending with The Dev himself on wave 50. Then all ten repeat with more health each time:

| Wave | Boss | What it does |
| --- | --- | --- |
| 25 | Void Wyrm | A serpent whose whole body hurts to touch. Tunnels under you, breathes a cone of orbs, circles you and spits inward |
| 30 | Storm Herald | Calls lightning on your position, teleports, keeps four storm orbs firing at you, and fires lightning lances |
| 35 | The Mirror | A dark copy of your own fighter. Dashes, slash combos and rift lines like yours, and brings elite husks in its second half |
| 40 | Eclipse | A giant eye. Spirals, rings and rotating beams of light, and darkens the arena in its second half |
| 45 | The Clockwork | A brass clock. Its hour and minute hands sweep the arena as beams, it freezes a ring of shots in mid-air and then turns every one toward you, fires rings in a tick-tock rhythm, and in its second half sets off twelve strikes around you like the hours on a dial |
| 50 | The Dev | The final boss: The Dev at three times the size, compiling into the arena from a terminal. Packet volleys, RM -RF lines you have to dash through, firewalls of shots with one gap, fork bombs of minions, a DDOS that sweeps the arena row by row with one safe gap, and lag-spike teleports. Sudo Mode at 60% health speeds him up, and Kernel Panic at 25% darkens the arena and spins beams while he fires a spiral |

Every boss has 50% more health than its base, acts 25% faster than the other enemies, and enrages after 60 seconds, which makes it 50% faster. The health bar counts down the last 15 seconds before the enrage.

When a boss arrives, your fighter freezes until its entrance is over: you can't move, attack or use powers, and nothing can hurt you.

Each boss has its own entrance and its own music. When a boss is off screen, an arrow on the edge of the screen points to it and shows how far away it is. The music adds reverb, a choir on the slow themes and a crowd shout on the fast ones.

![Fighting The Dev, the final boss on wave 50](docs/boss.png)

## Controls

| Action | Keyboard and mouse | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Fixed stick in the bottom-left. Touch anywhere on the left side to use it |
| Aim | Mouse | Drag from the attack button toward where you want to hit. A plain tap aims at the nearest enemy |
| Attack | Left click or J, hold to keep attacking | Big button on the right. Tap for one attack, hold to keep attacking |
| Dash | Space or right click | Dash button |
| Powers | Q, E, R | Buttons around the attack button. Tap to cast at the nearest enemy. For aimed powers, hold and drag to aim (further means farther), lift to cast, or drag back onto the button to cancel |
| Pause | Esc | Button at the top |

You can't be hit while dashing. If you dash through an attack just as it lands, time slows down, you get energy back, and your next hit within 2.5 seconds is a counter: triple damage and a shockwave that hits everything nearby.

After you take a hit you can't be hit again for 0.8 seconds. Clearing a wave doesn't heal you, so health only comes from drops and upgrades.

Use the button in the bottom-right corner, or F11, to go fullscreen. Escape pauses the game and doesn't leave fullscreen (in Firefox and Safari it still does).

Hitting a pink orb sends it back at the enemies. Orbs with a red ring can't be sent back.

On a phone, the game asks you to turn the phone sideways. It pauses whenever you turn it back upright.

![Phone controls: dragging a power to aim it](docs/mobile.png)

## Settings

- Audio: master, music and effects volume. The soundtrack setting either follows the fight or plays one track of your choice. You can also pick which of the four battle tracks plays during normal waves. The default is HYPERDRIVE, a 150 bpm hard-kick EDM track that also plays on the title screen. The fast tracks are built like EDM: four-on-the-floor kicks, offbeat bass, chord stabs, and an 8-bar cycle that builds up with a snare roll and a riser, then drops.
- Video: resolution (sharpest whole-number zoom, fill the screen, or a fixed 720p to 1440p), color theme, vibrancy, brightness, contrast, hue shift and scanlines. You can also turn down screen shake, flashes, damage numbers and particles.
- Game: arena, difficulty, blood stains and vibration. Blood and scorch marks fade after about 10 seconds by default, or 30 seconds, or never. Vibration has four levels (off, light, medium, strong) and works on phones whose browser supports it, which includes Android but not iPhone. There are 5 arenas. On the ice everything slides, and in the forge, enemies knocked into lava catch fire.

## Saving

The game saves your run at the start of every wave. You can quit from the pause menu and pick the run up later with Continue on the title screen. Your best score is saved for each fighter.

## How it's built

The game is plain JavaScript with no libraries and no build step. It draws everything at 320×180 and scales it up. The sprites are written as grids of characters in the code, and all music and sound effects are generated in the browser with the Web Audio API, so the game has no image or audio files.

The page makes no network requests. A Content Security Policy only allows the game's own files to load. Saved settings and runs are checked against the allowed values before they are used.

| File | Contents |
| --- | --- |
| `src/main.js` | Main loop, screens, saving |
| `src/world.js` | Combat, enemies, elite affixes, wave twists, projectiles, arena drawing |
| `src/deaths.js` | Each fighter's signature kills and death scenes |
| `src/chars.js` | The eight fighters |
| `src/bosses.js` | The ten bosses |
| `src/ui.js` | HUD, menus, settings, title intro, phone controls |
| `src/maps.js` | Arenas |
| `src/audio.js` | Music and sound effects |
| `src/sprites.js`, `src/gfx.js` | Pixel art and drawing |
| `src/input.js` | Keyboard, mouse and touch |
| `src/upgrades.js`, `src/store.js` | Upgrades and saved data |

## License

Ashblade is licensed under the [PolyForm Strict License 1.0.0](LICENSE.md). You can play it and read the code for personal, non-commercial use. You may not change it, share copies of it or build other works from it, and you may not use it commercially. For any other use, ask the author.
