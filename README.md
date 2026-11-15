# God's Eye View — hybrid globe

A MapLibre GL globe that hands its screen over to Google's **Photorealistic 3D Tiles** when the
camera comes down: satellite imagery and street lines at world scale, real buildings once you zoom in.

This repository is the globe half of **God's Eye View** — the part you can open in a browser with no
backend. The full application adds the live layers (hazards, facilities, access bands, cards) from its
own API.

![God's Eye View globe](golden-temple.jpg)

## Quick start

```bash
git clone https://github.com/GurusGrace/gods-eye-globe.git
cd gods-eye-globe

# 1. put your own Google Maps Platform key in maplibre/globe.js
#    (Photorealistic 3D Tiles must be enabled on the project)
#      const PHOTO_KEY = 'PASTE_YOUR_GOOGLE_MAPS_API_KEY';
#    or set it before the module loads:
#      <script>window.GEV_PHOTO_KEY = 'AIza...'</script>

# 2. serve the folder (module scripts will not run from file://)
python -m http.server 4173      # or: npm run serve

# 3. open http://127.0.0.1:4173/
```

Without a key the globe still runs: satellite imagery, roads and labels work, and the 3D handoff
simply never fires (see the gating rule below).

## Controls

| Action | Result |
| --- | --- |
| scroll | zoom; the 3D takes over below ~11° of zoom |
| drag | pan |
| `Auto 3D` / `3D always` / `Flat 2D` | handoff mode |
| `?intro=0` | skip the opening sequence |
| `?debug3d=1` | adds `window.__photorealDebug()` — live tile and framebuffer readout |
| `?cache3d=512` | tile cache ceiling in MB (default 128, grows to ≥256 near the ground) |

## How the 3D handoff works

The 3D is a WebGL overlay (`#photoreal`, `z-index 0`) under the MapLibre canvas (`#map`, `z-index 1`).
Both are transparent, so hiding the flat imagery reveals the photoreal city underneath — no Cesium
container, no second map engine.

Readiness is judged **by pixels, not by bookkeeping**:

```js
// photoreal renderer: sample the framebuffer, then decide
hasPicture() {
  if (pixStats.opaqueFraction < 0.9) return false;                       // nothing painted
  if (pixStats.blueFraction > 0.7 && pixStats.lumaStd < 18) return false; // empty navy void
  return true;
}
```

That rule exists because a tileset can report every tile loaded, `progress 1.0`, geometry in the scene
— and still paint an empty void. Hiding the satellite map over that leaves the user looking at street
lines on nothing.

## Three bugs this code fixes (all measured, not guessed)

**1. The planet was rotated 90°.** `tiles.group.rotation.x = -Math.PI/2` was labelled "glTF Y-up →
Z-up", but this tileset already delivers content in the renderer's earth frame. A GLB fetched under a
Tokyo camera decoded to a texture of *Alaska and the North Pacific* — every camera was being served
root-level ocean at every zoom. Rotation is now `0` (overridable with `?rot3d=<deg>`). Tokyo renders
Ginza at z15 and at 0.5 km in perspective; Amritsar renders the Golden Temple complex and its sarovar.

**2. A lost WebGL context never came back.** The recovery check lived inside the render loop, and
`requestAnimationFrame` stops firing once the context dies — a frozen frame counter proved it. The loop
now polls the context live, and an out-of-loop watchdog rebuilds the renderer after 8 s. `destroy()`
removes its canvas so rebuilds do not leak contexts.

**3. Coarse tiles were declared good enough everywhere.** A single `errorTarget = 42` told the loader
that low detail was fine at any distance, so cities arrived as flat draped imagery with no buildings
("just lines"). It is distance-adaptive now — 10 under 1.2 km, 12, 16, 24, and 42 beyond 30 km — and the
cache grows to ≥256 MB within 3.5 km because deep tiles were being evicted the instant they landed,
leaving upscaled parents on screen.

Verified on an AMD Vega 8 / D3D11 with a headless-Chrome harness: four handoff modes (no flicker at a
fixed zoom, recovery from context loss, reveal on a stalled queue, one cover + one reveal on a place
change) and an 8-point GPU suite.

## Rebuilding the bundles

`maplibre/*.bundle.js` are built from `scripts/*.src.mjs`:

```bash
npm install
npm run bundle:maplibre
```

`maplibre/globe.js` is plain source, not bundled — edit it directly.

## Sources and attribution

- Imagery: Esri World Imagery, © Esri and contributors
- Map data: © OpenStreetMap contributors, served by OpenFreeMap
- 3D: Google Photorealistic 3D Tiles (`tile.googleapis.com/v1/3dtiles`) via
  [`3d-tiles-renderer`](https://github.com/NASA-AMMOS/3DTilesRendererJS) 0.5.4
- Rendering: [MapLibre GL JS](https://maplibre.org/) and [three.js](https://threejs.org/)

God's Eye View itself is MIT licensed; see the
[main project](https://github.com/bilawalsidhu/gods-eye-view) for the full licence and the rest of the
application.
