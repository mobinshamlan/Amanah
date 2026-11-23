# AMANAH artwork source

Original 3D still-life renders for the homepage, modelled procedurally in three.js (r170) and rendered offline with headless Chrome. No text, letters, numbers or people appear in any scene (the hero is mirrored for RTL). All objects are generic fictional props.

| Scene (`?scene=`) | Output | Size | Notes |
| --- | --- | --- | --- |
| `hero` | `public/art/hero-desk.jpg` | 2560×1440 | Lost-property counter; props in the right ~58 %, calm wall/top on the left for the headline |
| `mobile` | `public/art/hero-desk-mobile.jpg` | 1200×1000 | Same scene, props centred and tighter |
| `compare` | `public/art/guide-compare.png` | 1200×900, transparent | Two torn report slips, brass magnifier, closed padlock |
| `question` | `public/art/guide-question.png` | 1200×900, transparent | Card with a question-mark cut-out in a brass holder, pine pencil |
| `handover` | `public/art/guide-handover.png` | 1200×900, transparent | Kraft parcel with keyhole tag, service bell, brass stamp |

`amanah-desk.html` is self-contained: procedural CanvasTextures (oak grain, paper fibre, kraft), extruded shapes (keys, tag with keyhole eyelet, slips, question mark), lathe (bell, stamp), tubes (string), RoundedBox (furniture). Lighting: a multi-sample warm directional key (soft shadows, PCFSoft 4096 maps) shaped by an invisible off-camera window occluder, hemisphere fill, PMREM RoomEnvironment for brass, ACES tone mapping, sRGB output. Query params: `w`, `h`, `exposure`, `env`.

## Re-render

The committed import map points at jsDelivr (`three@0.170.0`). Rendering uses local copies so Chrome never touches the network:

```bash
WORK=/path/to/workdir                      # any scratch folder
mkdir -p "$WORK/three/build" "$WORK/three/examples/jsm/environments" "$WORK/three/examples/jsm/geometries"
curl -sL https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js -o "$WORK/three/build/three.module.js"
curl -sL https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js -o "$WORK/three/examples/jsm/environments/RoomEnvironment.js"
curl -sL https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js -o "$WORK/three/examples/jsm/geometries/RoundedBoxGeometry.js"

art-src/render.sh "$WORK" hero     2560 1440 "$WORK/hero.png"
art-src/render.sh "$WORK" mobile   1200 1000 "$WORK/mobile.png"
art-src/render.sh "$WORK" compare  1200 900  "$WORK/compare.png"
art-src/render.sh "$WORK" question 1200 900  "$WORK/question.png"
art-src/render.sh "$WORK" handover 1200 900  "$WORK/handover.png"

sips -s format jpeg -s formatOptions 82 "$WORK/hero.png"   --out public/art/hero-desk.jpg
sips -s format jpeg -s formatOptions 82 "$WORK/mobile.png" --out public/art/hero-desk-mobile.jpg
cp "$WORK/compare.png" public/art/guide-compare.png
cp "$WORK/question.png" public/art/guide-question.png
cp "$WORK/handover.png" public/art/guide-handover.png
```

`render.sh` rewrites the import map to `./three/`, starts `python3 -m http.server 3199` in `$WORK` if nothing is listening, and runs Chrome with `--headless=new --use-angle=swiftshader` (transparent scenes get `--default-background-color=00000000`). Stop the server afterwards (`pkill -f "http.server 3199"`). A full hero render takes about 20 s on an M-series Mac.
