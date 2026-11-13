# Ashblade

Ashblade is a pixel-art hack and slash game that runs in the browser, on a computer or a phone. You pick a fighter and hold an arena against waves of enemies. Every fifth wave is a boss, and the fourth boss, the Ashen King on wave 20, ends the story. After that the game goes endless, and every wave adds 15% enemy health, more enemies and more elites.

![Title screen](docs/title.png)

## Fighters

Every fighter has a basic attack, two powers on Q and E that cost energy, and an ultimate on R that charges as your basic attack lands.

| Fighter | Basic attack | Q | E | R |
| --- | --- | --- | --- | --- |
| Blade | 3-hit sword combo | Rift: blinks forward and cuts every enemy on the line | Tempest: knocks enemies back and chains lightning between them | Thousand Cuts: stops time and cuts every enemy on screen |
| Gunner | Revolver, reloads after 14 shots | Buckshot: shotgun blast that pushes you back | Grenade | Last Stand: 4 seconds of minigun |
| Wizard | Homing magic bolt | Frost Blink: teleports and freezes enemies at both ends | Meteor | Starfall: meteors land on enemies for about 3 seconds |
| Ninja | 4-hit dagger combo, 2 dashes | Shuriken Fan: 5 stars that bounce off walls | Smoke Bomb: 3 seconds invisible, next hit does triple damage | Shadow Clones: 3 clones attack for 7 seconds |
| Mechanic | Wrench | Turret, up to 2 at once | Tesla Coil: zaps 3 enemies at a time for 7 seconds | Junk Golem: a scrap giant fights for 12 seconds |
| Tank | Slow hammer, 12 health | Bulldoze: charges and pins enemies against walls | Ground Slam: shockwaves that stun | Fortress: 6 seconds of no damage, shots bounce back |
| Robot | Laser that overheats if you hold it too long | Rocket Salvo: 6 homing rockets | Barrier: blocks 3 hits, then bursts | Orbital Laser: a beam from above follows your aim for 4.5 seconds |

Each fighter also has its own entrance at the start of a run. The Tank falls from the sky and cracks the floor, the Robot teleports down in a beam, and the Mechanic breaks out of a crate.

There is also a secret eighth fighter, The Dev. It starts at half power and gets stronger every wave and every 20 kills, reaching roughly 4x power by wave 50. Its shots plant bugs, and five bugs crash an enemy. Beat the Ashen King to unlock it.

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

## Bosses

| Wave | Boss | What it does |
| --- | --- | --- |
| 5 | The Warden | Sword sweeps, jumps that send out shockwaves, spirals of orbs, rings of orbs with one gap, four rotating chain beams |
| 10 | The Brood Mother | Digs under the floor and comes up under you, spits acid, lays eggs, releases swarms of larvae, rains acid over the whole arena |
| 15 | Iron Colossus | Sweeping lasers, missile strikes, a rocket fist that flies back to its arm, and four spinning lasers. Its shield breaks only when you hit it with an orb you knocked back |
| 20 | The Ashen King | Twice the size of the other bosses, with three phases. He summons armored knights, sends out rings of fire, and in the last phase darkens the arena, spins six beams around himself and uses Thousand Cuts on you |

After wave 20 four more bosses join, then all eight repeat with more health each time:

| Wave | Boss | What it does |
| --- | --- | --- |
| 25 | Void Wyrm | A serpent whose whole body hurts to touch. Tunnels under you, breathes a cone of orbs, circles you and spits inward |
| 30 | Storm Herald | Calls lightning on your position, teleports, keeps four storm orbs firing at you, and fires lightning lances |
| 35 | The Mirror | A dark copy of your own fighter. Dashes, slash combos and rift lines like yours, and brings elite husks in its second half |
| 40 | Eclipse | A giant eye. Spirals, rings and rotating beams of light, and darkens the arena in its second half |

Every boss has 25% more health than its base, acts 15% faster than the other enemies, and enrages after 75 seconds, which makes it 40% faster again.

Each boss has its own entrance and its own music. The music adds reverb, a choir on the slow themes and a crowd shout on the fast ones.

![The Brood Mother's acid](docs/boss.png)

## Controls

| Action | Keyboard and mouse | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Left thumb anywhere on the left side |
| Aim | Mouse | Automatic, aims at the nearest enemy |
| Attack | Left click or J, hold to keep attacking | Big button on the right |
| Dash | Space or right click | Dash button |
| Powers | Q, E, R | Buttons around the attack button |
| Pause | Esc | Button at the top |

You can't be hit while dashing. If you dash through an attack just as it lands, time slows down and you get energy back.

Hitting a pink orb sends it back at the enemies. Orbs with a red ring can't be sent back.

On a phone, the game asks you to turn the phone sideways. It pauses whenever you turn it back upright.

![Playing on a phone](docs/mobile.png)

## Settings

- Audio: master, music and effects volume. The soundtrack setting either follows the fight or plays one track of your choice. You can also pick which of the three battle tracks plays during normal waves.
- Video: color theme, vibrancy, brightness, contrast, hue shift and scanlines. You can also turn down screen shake, flashes, damage numbers and particles.
- Game: arena, difficulty and vibration. Vibration has four levels (off, light, medium, strong) and works on phones whose browser supports it, which includes Android but not iPhone. There are 5 arenas. On the ice everything slides, and in the forge, enemies knocked into lava catch fire.

## Saving

The game saves your run at the start of every wave. You can quit from the pause menu and pick the run up later with Continue on the title screen. Your best score is saved for each fighter.

## How it's built

The game is plain JavaScript with no libraries and no build step. It draws everything at 320×180 and scales it up. The sprites are written as grids of characters in the code, and all music and sound effects are generated in the browser with the Web Audio API, so the game has no image or audio files.

The page makes no network requests. A Content Security Policy only allows the game's own files to load. Saved settings and runs are checked against the allowed values before they are used.

| File | Contents |
| --- | --- |
| `src/main.js` | Main loop, screens, saving |
| `src/world.js` | Combat, enemies, projectiles, arena drawing |
| `src/chars.js` | The seven fighters |
| `src/bosses.js` | The four bosses |
| `src/ui.js` | HUD, menus, settings, title intro, phone controls |
| `src/maps.js` | Arenas |
| `src/audio.js` | Music and sound effects |
| `src/sprites.js`, `src/gfx.js` | Pixel art and drawing |
| `src/input.js` | Keyboard, mouse and touch |
| `src/upgrades.js`, `src/store.js` | Upgrades and saved data |

## License

Ashblade is licensed under the [PolyForm Strict License 1.0.0](LICENSE.md). You can play it and read the code for personal, non-commercial use. You may not change it, share copies of it or build other works from it, and you may not use it commercially. For any other use, ask the author.
