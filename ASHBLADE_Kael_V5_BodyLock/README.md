# ASHBLADE — Kael V5 BodyLock

**Kael only.** This package rebuilds the Kael base/evolved pixel animation atlases from the previous approved art master. It is not a generic replacement character and it does not edit the other seven heroes.

## Art rules

- **Two visual facings:** Right is mostly front-facing with a slight turn; Left mirrors Right. **Movement and attack direction stay 360° in the engine.**
- **Fixed original head, violet hair, eyes, scarf and torso proportions:** core artwork is reused without scaling. No visual shrink between idle and combat actions.
- **Independent two-foot walk/run:** 8 source pixel phases per movement type, alternately lifted shoes and separate left/right strides. Feet anchor at source row **y=92**. Each full cell is **120 × 96** transparent PNG pixels; the sprite's art is ~55 px tall, preserving the v4 on-screen scale.
- **Sword:** hand-attached, drawn with new angle-specific pixel clusters. Blade tip remains inside the cell and should not be rendered by the game's separate weapon renderer (the shared loader already sets `ownWeapon=true`).
- **E (Tempest):** Kael uses **bare hands**, with small purple lightning only. Major electricity/shockwaves stay in the engine. Q uses a dash slash; R is a rapid cut sequence.
- **Death:** deliberately collapses/dissolves using the original animation art; this is the only action that changes body height greatly.
- **Body stability:** `src/world.js` applies a Kael-only continuous walk/run phase clock to reduce foot-phase jumps during acceleration, and removes its extra whole-sprite combat lean. No damage, cooldown, attack or movement mechanics are modified.

## Coverage

One atlas per skin with **100 frames**; each atlas is **1200 × 1248** RGBA (10 columns × 13 rows). Both skins contain:

| Action | Frames |
|---|---:|
| Entrance | 8 |
| Idle | 8 |
| Walk | 8 |
| Run | 8 |
| Attack1 / Attack2 / Attack3 | 8 each |
| Skill1 (Q) | 8 |
| Skill2 (E) | 8 |
| Ultimate (R) | 10 |
| Dash | 6 |
| Hit | 4 |
| Death | 8 |

Detailed move semantics follow `desc/moves-sprite-brief.md` already in the ASHBLADE project. The guide's older front-only rule is superseded by the user's **two-facing soft-angle** decision.

## Install — requires existing v4 Manual Polish

Place `ASHBLADE_Kael_V5_BodyLock.zip` into `~/Downloads`, then from the project root:

```bash
unzip -o ~/Downloads/ASHBLADE_Kael_V5_BodyLock.zip
bash ASHBLADE_Kael_V5_BodyLock/install.sh
python3 ASHBLADE_Kael_V5_BodyLock/tools/validate.py
python3 -m http.server 8000
```

Visit `http://localhost:8000/`, **Ctrl+Shift+R**. In DevTools → Console verify:

```text
[ASHBLADE] 2-Facing Soft-Angle V5: eight heroes and evolved skins ready
```

The loader remains shared for 8 heroes, but only **Kael's two PNG atlases** change. Each other hero's asset remains unchanged. The installer changes the import cache version so the browser cannot reuse old v4 assets. It also adds Kael-specific stride-clock and disables an extra Kael attack lean. Installer automatically creates a timestamped backup and is idempotent.

For a frame-by-frame local preview:

`http://localhost:8000/ASHBLADE_Kael_V5_BodyLock/preview.html`

**Pillow is not required for installation or validation.** Only the artwork generator `tools/rebuild_kael.py` and preview generator `tools/make_previews.py` require Pillow. The source V4 input images are included in `source/` to make the art-building process reproducible.

## Rollback

From project root:

```bash
python3 ASHBLADE_Kael_V5_BodyLock/rollback.py
```

Warning: rollback restores the backed-up files and overwrites newer changes to those files. Keep an additional backup if you've modified them after installing v5.

## Limitations

- This is a **master-derived pixel-art rebuild**, with new independently phased shoes, scarf highlights and sword poses. It is **not** a hand-painted illustration of 200 independent full characters. Core hair/face/body is intentionally kept consistent, per the user's request. Secondary movement remains restrained to avoid jitter.
- Automated tests cover PNG transparency, clipping, foot anchors, installer idempotency, preservation of other heroes, JS syntax and rollback. The game itself has **not** been fully verified by automated browser gameplay in this environment. Review the animation in-game to assess speed/feel.
- For a larger artistic step beyond v5, an artist will need to manually paint subtle shoulder/arm/torso deformation for each animation keyframe. The current data structure allows that without modifying combat.
