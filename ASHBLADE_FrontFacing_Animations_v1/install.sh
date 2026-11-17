#!/usr/bin/env bash
set -euo pipefail
srcdir="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f src/world.js || ! -f src/sprites.js || ! -f index.html ]]; then
  echo 'ERROR: Run from the ASHBLADE project root (where src/ and index.html exist).' >&2
  exit 1
fi
backup=".ashblade-backups/front-facing-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
files=(src/sprites.js src/world.js src/chars.js src/deaths.js src/animation-atlases.js index.html desc/moves-sprite-brief.md preview-animations.html)
for path in "${files[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/$(dirname "$path")"
    cp -p "$path" "$backup/$path"
  fi
done
mkdir -p art/sprites desc
for path in "${files[@]}"; do
  if [[ -f "$srcdir/$path" ]]; then
    mkdir -p "$(dirname "$path")"
    cp "$srcdir/$path" "$path"
  fi
done
cp "$srcdir"/art/sprites/*.png art/sprites/
cp "$srcdir"/art/sprites/manifest.json art/sprites/
echo "Installed Option A sprite patch. Backup: $backup"
echo 'Restart game and hard refresh (Ctrl+Shift+R).'
echo 'Preview: python3 -m http.server 8000 -> http://localhost:8000/preview-animations.html'
