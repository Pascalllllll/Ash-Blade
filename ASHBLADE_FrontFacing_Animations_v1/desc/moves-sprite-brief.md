# Ashblade: moves and sprite brief for all 8 heroes

This file describes every hero's attack 1, attack 2, attack 3, skill 1, skill 2 and ultimate: what the move does in the game, which way it goes, and what the sprite frames should show. It is written for whoever draws the sprite sheets. The move details (names, reach, timing) come from the game code in `src/chars.js`.

Keys in the game: attacks are the left mouse button (hold for a charged attack on melee heroes), skill 1 is **Q**, skill 2 is **E**, the ultimate is **R**.

## Rules for every sheet

These match Kael's coded pack (`ASHBLADE_Kael_Coded_Sprites_64px`), which is now in the game.

| Item | Rule |
|---|---|
| Frame size | **128 × 96 transparent source pixels** per frame for all 8 heroes (hero art remains ~54 px tall; Grom ~60 px); game renders at pixel density 3. This supersedes the prior 64 × 64 request to leave room for hair, legs, weapons, and effects. |
| Hero size | Front-facing body about **54 pixels** tall in the exported atlas; **Grom 60 pixels**, all anchored to the same pixel baseline. |
| Feet | On bottom row of the source frame (**anchor x 64, y 95**). Keep the same anchor for standing/moving; aerial entrance and collapse intentionally change visible foot height. |
| Outline | Bold black outline, 2 pixels thick, like Kael and Vega |
| Facing | **OPTION A — always faces the CAMERA**, compact Soul Knight-inspired chibi with short legs. No side profile or sprite mirroring when changing aim; only attacks/projectiles/slash effects rotate to aim. |
| Weapon | Keep the hero's original weapon, wheelchair or treads, readable in each relevant frame; avoid a second rendered weapon. Kael is armed except for barehanded lightning Skill 2. |
| Effects | Small effects close to the body (a slash trail, sparks, a glow on the hands) go in the frames and must stay inside the 64 × 64 tile. Big effects are drawn by the game: projectiles, beams, shockwaves, meteors, the turret, the coil and the mech. Don't draw those, or they show twice |
| Nothing else | No text, labels, frame borders, grid lines or shadows under the feet |

### Frame counts

| Animation | Frames | Used for |
|---|---:|---|
| idle | 8 | standing still |
| run | 8 | moving |
| attack1 | 8 | first hit of the combo, or the basic shot |
| attack2 | 8 | second hit, or the second shot |
| attack3 | 8 | third hit (the finisher), also the release of the charged attack |
| skill1 | 6 to 8 | Q |
| skill2 | 8 | E |
| ultimate | 10 | R (also used in existing custom cinematics where applicable) |
| dash | 6 | dodge dash |
| hit | 4 | taking damage |
| death | 8 | Distinct stylized cinematic death per hero; game effects supply the violent impacts and disintegration. |
| entrance | 8 | Distinct entrance poses supporting each hero's existing arena cinematic. |

Optional: a **charge** frame (1 or 2 frames) for melee heroes, a wind-up pose held while the attack button is held. If it's missing, the game uses the first frames of attack1, as it does for Kael now.

### About direction

The game aims in every direction (mouse or right stick), but **the hero sprite always faces the screen**. The game aims the actual hitboxes, projectiles, and large effects in world space. For attacks, pose shoulders/hands so the gesture reads as a frontal slash, cast, or swing; the small sprite effects remain near the hero without creating duplicate gameplay beams.

---

## Kael (BLADE): sword, ember fire

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: slash | Wide horizontal cut in front of him, short step forward | Forward (right) | Sword pulled back behind the shoulder, then a fast horizontal swing across the body to the right, ending low. Orange ember trail along the blade |
| **Attack 2**: X-cut | Two crossing cuts in the same arc | Forward | Two quick diagonal cuts: high-left to low-right, then low-left to high-right, leaving an X-shaped ember trail |
| **Attack 3**: thrust and whirlwind | Long lunging stab, then a full 360° spin (the heaviest hit) | Forward, then all around | A deep lunge with the sword straight ahead, then a full body spin with a ring-shaped ember trail. Also used for the charged attack, Ashen Crescent (a big crescent cut while dashing forward) |
| **Skill 1 (Q)**: Rift | Blinks up to about 6 body lengths in the aim direction and cuts everything on the line; leaves afterimages | Forward | Crouch, vanish into a dark streak, reappear further right finishing a cut with the sword out to the side. Matches the pack's skill1 dash slash |
| **Skill 2 (E)**: Tempest | A shockwave around him plus chain lightning to nearby foes; deletes nearby enemy bullets | All around (facing the camera is fine) | Sword lowered, both hands charged with purple lightning, sparks bursting outward on the peak frame. Matches the pack's skill2 |
| **Ultimate (R)**: Thousand Cuts | Time stops, he cuts the nearest foes (up to 14) many times, then returns to where he started | All around | Sword raised, eyes glowing, then rapid cuts in different directions (one direction per frame), ending with the sword sheathed or lowered while the cuts land |

Note: Kael's combo in the game has four hits (slash, X-cut, thrust, spin). With three attack animations, the fourth hit reuses attack1 for now.

## Vega Hale (GUNNER): revolver, gold

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: revolver shot | Fast single shots, 14 per cylinder load | Forward | Arm straight out to the right, revolver level, small muzzle flash at the barrel tip, the arm kicks up on recoil |
| **Attack 2**: second shot | The next shot (rapid fire alternates attack1 and attack2 so it doesn't look stiff) | Forward | Same aim with the other hand fanning the hammer, a slightly different recoil, a spent shell falling |
| **Attack 3**: reload | After 14 shots she reloads for about 1 second | In place | Gun tipped up, cylinder swung open, a quick spin of the cylinder, flick it shut |
| **Skill 1 (Q)**: Buckshot | Point-blank shotgun blast (11 pellets in a cone); the kick pushes her backward | Forward, she slides back | Both hands on the gun, a big flash cone to the right, body leaning back from the recoil, coat flaring |
| **Skill 2 (E)**: Deadeye | Slows time and fires 6 sure shots at the closest foes | Forward | Hat brim down, one eye glowing gold, the gun snapping to different heights (one shot per frame or two), a gold flash on each |
| **Ultimate (R)**: Last Stand | 4 seconds of minigun fire; she moves slower | Forward | She swings a heavy minigun up to the hip and fires: barrels spinning, a long muzzle flame, shells pouring, feet braced. Loopable frames for the 4 seconds |

## Morrow (WIZARD): staff, violet magic

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: arcane bolt | Fires a homing violet bolt from the staff tip | Forward | Staff pointed right, the orb at its tip flaring violet, small rune sparks |
| **Attack 2**: second bolt | The next bolt (alternates with attack1) | Forward | Staff swept from low to forward with the free hand pushing, a violet flash at the orb |
| **Attack 3**: heavy cast | A stronger cast pose for the end of a burst | Forward | Staff held with both hands overhead, then thrust forward, a bigger violet glow and a ring of runes around the orb |
| **Skill 1 (Q)**: Arcane Missiles | A rune circle flares at his feet and 5 homing missiles leave the staff one after another | Forward and up | Staff raised high, a glowing rune circle under his feet, the orb pulsing once per missile |
| **Skill 2 (E)**: Blizzard | A freezing storm lands where he aims, about 9 body lengths ahead, for 3 seconds | Forward (the storm itself is drawn by the game) | Staff thrust forward, frost gathering around the orb and his sleeves, a blue-white tint, breath of cold air |
| **Ultimate (R)**: Starfall | Meteors fall on every foe for about 2.6 seconds | Up (facing the camera is fine) | Both arms raised, staff pointed at the sky, face hidden in the hood, starlight from above, robe blown upward |

## Rin (SAMURAI): katana, sakura pink

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: quick cut | Very fast short cut | Forward | A small, sharp horizontal cut with the katana, pink trail, almost no wind-up |
| **Attack 2**: X-cut | Two crossing cuts | Forward | Two fast diagonal cuts making an X, pink and red trail |
| **Attack 3**: lunging stab and iai draw | A long stab, then an iai draw: she dashes through foes and cuts twice. Also the charged attack, Iai Dash (the longer the hold, the further the dash) | Forward, long | Hand on the sheathed sword, crouched low, then a blur forward and the blade fully drawn behind her at the end, petals in the wake |
| **Skill 1 (Q)**: Senko | A laser fired from the sword along the aim, huge damage | Forward (the beam is drawn by the game) | Katana held level at shoulder height pointing right, the blade glowing white-pink, body braced, hair blown back |
| **Skill 2 (E)**: Hana Arashi | A storm of blades and petals circles her for 4 seconds | All around (facing the camera is fine) | Sword held upright in front of her face, petals swirling around her body, a light pink glow |
| **Ultimate (R)**: Issen | Time stops, she hops through a chain of 11 cuts | Forward, many directions | A deep iai stance, then a single flash: she's gone, then reappears with the sword already drawn and slowly sheathes it as the cuts land |

Note: Rin's combo in the game has four hits (quick cut, X-cut, stab, iai draw). With three attack animations, the fourth hit reuses attack1 for now.

## Rivet (MECHANIC): giant wrench, orange

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: wrench swing | A wide swing in front | Forward | The wrench pulled back over the shoulder, then swung across to the right with both hands |
| **Attack 2**: wrench twirl | A full 360° spin | All around | She spins the wrench around her body like a propeller, an orange motion arc in a full circle |
| **Attack 3**: ground slam | Heavy slam into the ground in front, the strongest hit. Also the charged attack, Overclock Slam | Forward and down | The wrench lifted high overhead, steam venting from it, then slammed into the floor in front, sparks and dust bursting from the impact point |
| **Skill 1 (Q)**: Turret | Places an auto-gun in front of her (lasts 14 s) | Forward | Kneeling, setting something down in front of her with a quick wrench tap. The turret itself is drawn by the game |
| **Skill 2 (E)**: Tesla Coil | Places a coil that zaps 3 foes at once for 7 s | Forward | Planting a post with both hands, then a spark jumping to her goggles. The coil is drawn by the game |
| **Ultimate (R)**: Iron Titan | A mech drops in from the sky, punches and fires missiles | Up, then forward | She raises a remote or the wrench to the sky, goggles flashing, then points forward to send the mech in. The mech is drawn by the game |

## Grom (TANK): war hammer, steel

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: hammer sweep | A wide sweep in front, heavy knockback | Forward | The hammer dragged back, then swept across to the right at waist height, the body twisting with it |
| **Attack 2**: overhead slam | The hammer lifted and slammed down in front | Forward and down | The hammer raised high over the helmet with both hands, then brought straight down, dust and cracks at the impact |
| **Attack 3**: hammer spin | A full 360° spin, the finisher. Also the charged attack, Earthshatter (a huge slam that cracks the ground) | All around | The hammer held out at arm's length, the whole body spinning, a steel-grey ring of motion around him |
| **Skill 1 (Q)**: Bulldoze | Charges forward, invincible, carrying foes into walls | Forward | Shoulder lowered, head down, running hard to the right, the cape streaming behind, dust kicked up |
| **Skill 2 (E)**: Ground Slam | Two shockwaves that stun everything around | All around (facing the camera is fine) | Jumping slightly, then both fists or the hammer slammed into the ground, cracks spreading, the visor glowing |
| **Ultimate (R)**: Fortress | 6 seconds invincible, reflects every bullet | In place (facing the camera is fine) | A wide stance, the hammer planted head-down in front of him, both hands on it, a golden glow around the armor. Loopable for the 6 seconds. No shield (it was removed) |

## Unit-7 (ROBOT): arm cannon, cyan volt

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: laser start | Starts a continuous laser from the cannon | Forward | The cannon arm raised level to the right, the lens charging up with a cyan glow |
| **Attack 2**: laser held | The beam stays on while the button is held; it heats up | Forward (the beam is drawn by the game) | Loopable frames of firing: the cannon vibrating, the lens flaring, the body braced, the screen-face showing a focused icon |
| **Attack 3**: overheat | After too long the laser overheats and stops for about 1.4 s | In place | The cannon lowered, steam and smoke venting from the vents, the screen-face showing an error or a red warning |
| **Skill 1 (Q)**: Rocket Salvo | 6 homing rockets fan out along the aim from the top of the body | Forward and up | Shoulder or back hatches popping open, small flashes as the rockets leave, the body jolted by the launch |
| **Skill 2 (E)**: Barrier | A shield that blocks 3 hits, then bursts and damages foes nearby | All around (facing the camera is fine) | Arms crossed in front, a cyan hexagon pattern forming around the body, the screen-face showing a shield icon |
| **Ultimate (R)**: Orbital Laser | A beam from the sky that follows the aim for 4.5 s | Up | Antennas glowing, an arm or antenna pointed up calling the satellite, the screen-face showing a target icon. Loopable for the 4.5 seconds |

## The Dev (DEV): laptop and wheelchair, terminal green

| Move | In the game | Direction | Sprite should show |
|---|---|---|---|
| **Attack 1**: ping | Fires a green data packet | Forward | Typing on the laptop, a green flash on the screen, a small packet icon leaving to the right |
| **Attack 2**: ping burst | More packets at once as his version goes up (up to 7 in a fan) | Forward | Faster typing with both hands, the laptop screen lit brighter, several green flashes |
| **Attack 3**: hard Enter | The heavy keystroke at the end of a burst | Forward | One hand raised, then slammed down on the Enter key, the screen flashing, the chair rocking back |
| **Skill 1 (Q)**: Exploit | Marks a group of foes and hacks all of them | Forward | Eyes behind the glasses glowing green, the laptop turned toward the foes, green target brackets flashing around the screen |
| **Skill 2 (E)**: Firewall | A 4-second ring around him that deletes bullets and burns foes | All around (facing the camera is fine) | The laptop held up like a shield, green code scrolling, a glitchy green outline around him and the chair |
| **Ultimate (R)**: rm -rf | Types `sudo rm -rf /enemies` and deletes everything on screen | In place, then everywhere | Cracking his knuckles, typing the command (a line of green text above the laptop is fine), then the final Enter with a big green glitch burst |

---

## After the sheets come in

Send the sheets the same way as Kael's pack (a zip with the frames as coded data or transparent PNG strips). The game currently plays one skill animation for both Q and E and has no separate ultimate animation; once a hero's sheet has skill1, skill2 and ultimate, the code will be changed to play each one on its own key.


## Implementation update: Option A / front-facing hero atlases

- Entry animations: Kael ember drop, Vega sliding gunslinger entry, Morrow portal materialization, Rin smoky blink/petals, Rivet breaking out of a crate, Grom meteor landing, Unit-7 scanline beam assembly, The Dev terminal-glitch materialization. The game owns large cinematic VFX.
- Ultimate (R) poses are **distinct per character** and visually separate from Q and E. Kael Thousand Cuts, Vega minigun stance, Morrow Starfall, Rin Issen, Rivet Iron Titan command, Grom Fortress, Unit-7 Orbital Laser, The Dev rm -rf.
- Death poses: 8 frames, intentionally different effects for each. High-impact stylized pixel violence uses the original game effects (ember/ash, final gunshot, magic implosion, sakura fragmentation, explosive mechanical scrap, Grom armor shattering, electrical malfunction, The Dev's deletion). Do not duplicate the major effects inside the atlas.
- No jump action in normal gameplay. There is a separate **dash** action, not dodge roll.
- Every atlas has 128x96 transparent cells arranged as 10 columns with 13 action rows, and `art/sprites/manifest.json` lists frame counts and pivot.
- Source-to-atlas conversion is deterministic, nearest-neighbor, and retains original author art. Automatically derived poses are provisional until manually art-directed.
