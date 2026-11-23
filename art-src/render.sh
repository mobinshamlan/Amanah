#!/usr/bin/env bash
# Offline render of the AMANAH desk scenes with headless Chrome + SwiftShader.
# Usage: art-src/render.sh <workdir-with-three/> <scene> <width> <height> <out.png> [extra query]
#   <workdir> must contain three/build/three.module.js and three/examples/jsm/... (three@0.170.0)
#   A local copy of amanah-desk.html is written there with the jsDelivr import map rewritten to ./three/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$1"; SCENE="$2"; W="$3"; H="$4"; OUT="$5"; EXTRA="${6:-}"
PORT="${PORT:-3199}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

sed 's#https://cdn.jsdelivr.net/npm/three@0.170.0/#./three/#g' "$HERE/amanah-desk.html" > "$WORK/amanah-desk.local.html"

if ! curl -s -o /dev/null "http://localhost:$PORT/" ; then
  (cd "$WORK" && python3 -m http.server "$PORT" >/dev/null 2>&1 &)
  sleep 1
fi

BG=()
case "$SCENE" in compare|question|handover) BG=(--default-background-color=00000000);; esac

"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size="$W,$H" --virtual-time-budget=30000 --timeout=120000 ${BG[@]+"${BG[@]}"} \
  --screenshot="$OUT" "http://localhost:$PORT/amanah-desk.local.html?scene=$SCENE&w=$W&h=$H$EXTRA" 2>/dev/null
echo "wrote $OUT"
