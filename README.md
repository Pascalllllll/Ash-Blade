# Ashblade

Ashblade is a pixel-art hack and slash game that runs in the browser, on a computer or a phone. You pick a fighter and hold an arena against waves of enemies. Every fifth wave is a boss, and the fourth boss, the Ashen King on wave 20, ends the game. After that you can keep playing for score.

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

![Fighter select](docs/select.png)

## Bosses

| Wave | Boss | What it does |
| --- | --- | --- |
| 5 | The Warden | Sword sweeps, jumps that send out shockwaves, spirals of orbs |
| 10 | The Brood Mother | Digs under the floor and comes up under you, spits acid, lays eggs that hatch |
| 15 | Iron Colossus | Sweeping lasers and missile strikes. Its shield breaks only when you hit it with an orb you knocked back |
| 20 | The Ashen King | Three phases. In the last one the arena goes dark and he uses Thousand Cuts on you |

Each boss has its own entrance and its own music.

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
- Game: arena and difficulty. There are 5 arenas. On the ice everything slides, and in the forge, enemies knocked into lava catch fire.

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
