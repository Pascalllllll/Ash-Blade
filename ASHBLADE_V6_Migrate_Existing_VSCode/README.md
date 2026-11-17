# ASHBLADE V6 — Migrate into your existing VS Code project

This is a **non-destructive art/runtime migration**, NOT a replacement project. Requires an existing V4/V5 shared `installSoftAngleSprites(SPR)` runtime.

From your existing repo root:

```bash
unzip -o ~/Downloads/ASHBLADE_V6_Migrate_Existing_VSCode.zip
bash ASHBLADE_V6_Migrate_Existing_VSCode/install.sh
python3 tools/validate_soulknight.py
python3 -m http.server 8000
```

Only these existing source files are changed: `src/sprites.js` (loader import URL), `src/world.js` (facing import URL), `index.html` (cache bust), `src/soft-angle-atlases.js` (V6 loader). It overwrites the 16 Base/Evolved sprite atlases and metadata. Other game source files and local gameplay modifications are retained. Adds preview, generator, and masters.

Before writing anything the installer checks your loader structure and atlas signatures. It backs up all affected files under `.ashblade-backups/soulknight-v6-migration-...`. On installation failure it automatically restores files. For manual rollback:

```bash
python3 ASHBLADE_V6_Migrate_Existing_VSCode/rollback.py '<BACKUP_PATH_PRINTED_BY_INSTALLER>'
```

If your current runtime differs from V4/V5 or any checks fail, stop and supply the current source files instead of copying entire V6 `src` onto the repo.
