#!/usr/bin/env bash
set -euo pipefail
python3 "$(dirname "${BASH_SOURCE[0]}")/install.py"
node --check src/sprites.js
node --check src/world.js
node --check src/soft-facing.js
