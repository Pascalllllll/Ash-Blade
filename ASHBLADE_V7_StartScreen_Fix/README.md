# ASHBLADE V7 Start Screen Fix — duplicate ES modules

## Root cause (verified in V7 full game)

`src/main.js` imported `./sprites.js?v=7motion` and `./world.js?v=7motion`, while `src/ui.js` and other code imported `./sprites.js?v=206` and `./world.js?v=206`. JavaScript ES modules are cached by the *full URL*, including query strings; those are distinct module instances. The UI therefore accessed its own, uninitialized `SPR.chars` and threw:

```
TypeError: Cannot read properties of undefined (reading 'BLADE')
```

This stopped `requestAnimationFrame` on the title screen, leaving a static image that did not respond to PLAY.

## Install in your **existing VS Code project**

```bash
cd '/mnt/5866DC3066DC111C/Coding/Project/Ashblade-(Hack-and-Slash-Game)'
unzip -o ~/Downloads/ASHBLADE_V7_StartScreen_Fix.zip
bash ASHBLADE_V7_StartScreen_Fix/install.sh
python3 ASHBLADE_V7_StartScreen_Fix/tools/audit_modules.py
python3 -m http.server 8000
```

Then Ctrl+Shift+R. Select PLAY; the roster should show, then START.

## Changes

- `src/main.js`: reuses the exact versioned `sprites.js` and `world.js` imports from the UI, preserving all gameplay code.
- `index.html`: bumps the entry script URL to force a fresh module fetch.
- Creates backup under `.ashblade-backups/startscreen-esm-sync-*`.

No sprite art, state, saves, UI layout or other source files are modified.

## Test evidence

Reproduced crash under Chromium in an isolated in-memory module-graph test with a V7 project snapshot; after correcting two imports, title -> character select -> Kael lock-in ran without the crash. This is not a substitute for testing your particular local modified repo.

## Rollback

```bash
python3 ASHBLADE_V7_StartScreen_Fix/rollback.py '.ashblade-backups/startscreen-esm-sync-YOUR-BACKUP-FOLDER'
```

If console errors persist after patch, copy the first red error from F12 -> Console to diagnose.
