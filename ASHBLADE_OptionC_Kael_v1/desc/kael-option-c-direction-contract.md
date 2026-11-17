# Kael — Option C directional contract

This file takes precedence over the **Facing** and **Frame size** rows of `desc/moves-sprite-brief.md` for Kael **only**. All move descriptions from that document remain authoritative.

- Right: native 3/4 side view; Left: mirror right at runtime.
- Up: native back-view with no facial eyes; Down: native front-view with eyes.
- Actions use the `128×96` source atlas grid introduced by the already-installed Option A patch. Sprite visible height is ~54 source px, pivot x=64 y=95.
- Attack 1 horizontal slash. Attack 2 crossing X-cut. Attack 3 thrust then rotating cut (charge release reuses attack3). Skill 1/Q Rift dash sword slash; Skill 2/E Tempest barehand chain lightning; Ultimate/R Thousand Cuts. Entrance and death remain distinct.
- Weapon included in sprite, **never draw it again** from `heldWeapon()` for Kael.
- Large effects are owned by the game (`src/chars.js` / `src/world.js`). Sprite cells contain only body-local trails and sparks.
- Other seven heroes remain with their existing art until each is deliberately migrated to Option C.
