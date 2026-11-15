/* Google Photorealistic 3D Tiles as a library for the MapLibre hybrid globe.
 *
 * The map owns every input; this only renders. `setView(lat, lon, distance,
 * bearing, pitch)` places the camera at `distance` metres from the ground
 * point, orbit-style — the exact geometry MapLibre's globe camera uses, so the
 * photoreal world and the map's symbols stay glued together.
 *
 * altitude derivation (verified against maplibre's globe transform):
 *   distance_m = cameraToCenterDistance / worldSize * EARTH_CIRCUMFERENCE
 * at z10 ≈ 91 km, z17 ≈ 716 m — matching the visual scale at both ends.
 */
import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

const EARTH_R = 6378137;
const E2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);

function ecef(latDeg, lonDeg, altM) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const N = EARTH_R / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return new THREE.Vector3(
    (N + altM) * Math.cos(lat) * Math.cos(lon),
    (N + altM) * Math.cos(lat) * Math.sin(lon),
    (N * (1 - E2) + altM) * Math.sin(lat),
  );
}

function enu(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    up: new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)),
    east: new THREE.Vector3(-Math.sin(lon), Math.cos(lon), 0),
    north: new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)),
  };
}

export function initPhotoreal(container, key, { fov = 36.87, cacheMB = 128 } = {}) {
  /* The 3D world is an overlay, not the product's artwork: the approved 3D
   * icons and the map labels keep the full device resolution. The tiles
   * renderer does not need MSAA or a 2x buffer - on a shared-memory GPU that
   * cost is what starves the frame rate and makes the globe stall. */
  const renderer = new THREE.WebGLRenderer({ antialias: false, logarithmicDepthBuffer: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(1);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  container.appendChild(renderer.domElement);
  /* A lost WebGL context (common on shared-memory GPUs under pressure) blanks
   * the 3D canvas until restored. Ask the browser to restore it, and count it
   * so the debug overlay can show it. */
  let contextLost = 0, contextIsLost = false;
  /* The truth about the context: isContextLost() works whether the context
   * was lost, restored by the browser, or replaced by a new one. */
  const contextLostNow = () => {
    try { return !!(renderer.getContext() && renderer.getContext().isContextLost()); } catch { return false; }
  };
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost++; contextIsLost = true; console.warn('[photoreal] WebGL context lost'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { contextIsLost = false; console.warn('[photoreal] WebGL context restored'); });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 2, 4.0e7);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(1, 1, 1);
  scene.add(sun);

  const tiles = new TilesRenderer('https://tile.googleapis.com/v1/3dtiles/root.json');
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: key }));
  /* GoogleCloudAuthPlugin asks for errorTarget 20, which pulls a very dense
   * tile set. A single high value (42) cut the tile count but it also told
   * the loader that coarse tiles were "good enough" at ANY distance - so up
   * close the city came in as flat draped imagery with street lines and no
   * buildings at all ("just lines"). Keep it tight near the ground, where
   * the buildings are the point, and coarse only for the far view. */
  const errorTargetFor = (distanceM) => {
    if (!Number.isFinite(distanceM)) return 42;
    if (distanceM < 1200) return 10;
    if (distanceM < 4000) return 12;
    if (distanceM < 12000) return 16;
    if (distanceM < 30000) return 24;
    return 42;
  };
  tiles.errorTarget = 8;
  /* The library's default tile cache is 0.4 GB / 8000 tiles. On a shared-memory
   * GPU that is what takes the browser down when you fly away and come back.
   * A small, recent cache keeps the photoreal sharp near the camera and frees
   * everything else. */
  /* 400 tiles / 80 MB was too small: one drag to new ground evicted the
   * parent tiles, so the area went empty until children re-downloaded (the
   * "buildings disappear when I move" effect). Keep enough for the view, its
   * ancestors and the last few views, still far below the library's 0.4 GB. */
  /* 256 MB was too much for a shared-memory GPU (AMD Vega 8 class): the
   * driver itself starts paging. Default 128 MB, configurable (?cache3d=MB).
   * minBytes stays BELOW max so the cache trims gently instead of thrashing. */
  const cacheBytes = Math.max(64, Math.min(512, Number(cacheMB) || 128)) * 1024 * 1024;
  /* Close to the ground the useful tiles are big: with a 128 MB ceiling the
   * deep ones were evicted the moment they arrived, so the view fell back to
   * upscaled parents - a blurry mush with no buildings. Give the cache room
   * when the camera is low, and release it again for the far view. */
  const closeCacheBytes = Math.min(512, Math.max(256, (cacheBytes / 1048576) * 2)) * 1024 * 1024;
  if (tiles.lruCache) {
    tiles.lruCache.minSize = 500;
    tiles.lruCache.maxSize = 1200;
    tiles.lruCache.minBytesSize = Math.round(cacheBytes * 0.7);
    tiles.lruCache.maxBytesSize = cacheBytes;
    tiles.lruCache.unloadPercent = 0.02; // evict a little at a time, never a whole level at once
  }
  /* Ancestors stay drawn until their children are ready, and siblings load
   * together so a pan does not open gaps (library defaults, set explicitly). */
  tiles.loadAncestors = true;
  tiles.loadSiblings = true;
  /* No LOD gaps: in 0.5.4 a REPLACE parent is drawn until ALL its children are
   * ready ("kicked" children load but are not shown). The gaps came from the
   * parent itself being evicted from the cache, which loadAncestors + the
   * cache floor above prevent. Also keep loaded-but-off-frustum tiles drawn
   * so the edge of the view does not pop while dragging. */
  tiles.displayActiveTiles = true;
  /* NO extra rotation: Google's tileset already delivers its content in the
   * earth frame this renderer uses, so the old -90 deg "Y-up -> Z-up" turn
   * rotated the whole planet. The tile fetched under a Tokyo camera was the
   * Alaska / North-Pacific one - a navy void, at every zoom, which is what
   * "the 3D map is not loading, just lines" actually was. Overridable with
   * ?rot3d=<deg> for diagnosis. */
  const rotQ = new URLSearchParams(location.search).get('rot3d');
  tiles.group.rotation.x = rotQ === null ? 0 : (Number(rotQ) * Math.PI) / 180;
  scene.add(tiles.group);
  tiles.setCamera(camera);

  const resize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    tiles.setResolutionFromRenderer(camera, renderer);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let last = { lat: 0, lon: 0, distance: 0, bearing: 0, pitch: 0 };
  const setView = (lat, lon, distance, bearing, pitch) => {
    /* Mid-flight the map's transform can hand over a camera that is far away
     * or not finite yet. Forwarding that to the tiles loader asks it for the
     * whole planet and wedges the GPU, so clamp and ignore nonsense. */
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(distance)) return;
    if (!Number.isFinite(bearing)) bearing = 0;
    if (!Number.isFinite(pitch)) pitch = 0;
    /* Remember the distance the map actually asked for; the clamp below is
     * only so the camera maths stays sane. */
    last = { lat, lon, distance, bearing, pitch };
    const d = Math.min(Math.max(distance, 400), 140000);
    /* Refine to building level when the camera is close: this is the one
     * setting that decides whether the city has buildings or just lines. */
    const et = errorTargetFor(distance);
    if (et !== tiles.errorTarget) tiles.errorTarget = et;
    if (tiles.lruCache) {
      const wantBytes = distance < 3500 ? closeCacheBytes : cacheBytes;
      if (tiles.lruCache.maxBytesSize !== wantBytes) {
        tiles.lruCache.maxBytesSize = wantBytes;
        tiles.lruCache.minBytesSize = Math.round(wantBytes * 0.7);
      }
    }
    const ground = ecef(lat, lon, 0);
    const { up, east, north } = enu(lat, lon);
    const b = (bearing * Math.PI) / 180;
    const heading = east.clone().multiplyScalar(Math.sin(b)).add(north.multiplyScalar(Math.cos(b)));
    const p = (pitch * Math.PI) / 180;
    const pos = ground.clone()
      .add(up.clone().multiplyScalar(d * Math.cos(p)))
      .add(heading.clone().multiplyScalar(-d * Math.sin(p)));
    camera.position.copy(pos);
    camera.up.copy(up);
    camera.lookAt(ground);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  };

  setView(31.62, 74.8765, 26000, 30, 58);

  /* Exactly one animation loop for the whole lifetime. setEnabled() only
   * flips a flag: the loop stays parked and does no tile work while the 3D
   * layer is off, and it never doubles up on repeated enable/disable. */
  let running = false;
  let lastFrame = 0;
  let frames = 0;
  let lastPixels = null;
  /* Grid of framebuffer samples: how much of the 3D canvas holds real image
   * (alpha up, colours varied) versus empty sky/void or the tileset's flat
   * navy backdrop. */
  let pixStats = null;
  const sampleFrame = () => {
    try {
      const gl = renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      if (!w || !h) return;
      const px = new Uint8Array(4);
      let opaque = 0, blueish = 0, n = 0;
      const lumas = [];
      const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
      for (const fx of grid) {
        for (const fy of grid) {
          gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const [r, g, b, a] = px; n++;
          if (a > 10) opaque++;
          if (b > 1.3 * Math.max(r, g) && b > 25) blueish++;
          lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
        }
      }
      const mean = lumas.reduce((s, v) => s + v, 0) / lumas.length;
      const std = Math.sqrt(lumas.reduce((s, v) => s + (v - mean) ** 2, 0) / lumas.length);
      pixStats = {
        samples: n, opaqueFraction: Math.round((opaque / n) * 100) / 100,
        blueFraction: Math.round((blueish / n) * 100) / 100,
        lumaMean: Math.round(mean), lumaStd: Math.round(std),
      };
    } catch (e) { pixStats = { error: String(e && e.message || e).slice(0, 90) }; }
  };
  const MIN_FRAME_MS = 33; // ~30 fps keeps the 3D glued to the map while dragging
  const animate = (now) => {
    requestAnimationFrame(animate);
    if (!running) return;
    /* While the dawn owns the screen the map is hidden; rendering the tiles
     * then is pure waste and competes with the intro animation. */
    if (container.style.visibility === 'hidden') return;
    /* Only pull tiles while the camera is near the ground. A distant camera
     * makes every tile in the tileset visible, which is how the renderer
     * used to stall on a long flight. */
    /* 26 km is about zoom 9.5: below that the tiles cover the region, above
     * it they cover continents and the queue explodes. */
    /* The map switches the 3D world off below z10.6 (3D mode); this guard
     * only matters during a long flight. Must stay above that switch, or the
     * overlay would be "on" but frozen - the old 26 km guard was below the
     * z11.2 opening view and froze it. */
    if (last.distance > 140000) return;
    if (now - lastFrame < MIN_FRAME_MS) return;
    lastFrame = now;
    /* The context can die or come back without the events we listen for:
     * three.js can also quietly build a fresh one. Ask the context itself. */
    if (contextLostNow()) { contextIsLost = true; return; }
    if (contextIsLost) {
      contextIsLost = false;
      console.warn('[photoreal] WebGL context back');
      /* The GPU resources went with the old context: put the tiles back on
       * screen instead of sitting on a dead scene for good. */
      try { tiles.group.visible = true; } catch { /* not ready */ }
      if (!tiles.group.parent) scene.add(tiles.group);
    }
    tiles.update();
    renderer.render(scene, camera);
    frames++;
    /* What did the 3D canvas ACTUALLY paint? Tile counts lie: Google's tiles
     * can be present, "loaded" and drawn and still leave the screen an empty
     * navy void - and then hiding the flat map leaves nothing but street
     * lines. Sample the framebuffer, so "the 3D has arrived" means real
     * pixels, not bookkeeping. */
    if (frames % 20 === 0) sampleFrame();
  };
  requestAnimationFrame(animate);

  /* Temporary diagnostic hook (?debug3d=1): lets a real-GPU session inspect
   * what the tiles renderer is actually doing instead of guessing from pixels. */
  if (new URLSearchParams(location.search).get('debug3d') === '1') {
    window.__photorealDebug = () => {
      const cam = camera.position, c = new THREE.Vector3();
      camera.getWorldDirection(c);
      let withContent = 0, drawn = 0;
      for (const t of tiles.visibleTiles) {
        if (t.content) withContent++;
        if (t.__used || t.used) drawn++;
      }
      return {
        errorTarget: tiles.errorTarget, pixels: pixStats, tilesLoaded: tiles.stats.loaded, failed: tiles.stats.failed,
        visibleTiles: tiles.visibleTiles.size, withContent, drawn, used: tiles.stats.used,
        cam: [+cam.x.toFixed(1), +cam.y.toFixed(1), +cam.z.toFixed(1)],
        dir: [+c.x.toFixed(2), +c.y.toFixed(2), +c.z.toFixed(2)],
        fov: camera.fov, near: camera.near, far: camera.far,
        bg: scene.background ? String(scene.background.type || scene.background) : null,
        groupInScene: !!tiles.group.parent, groupVisible: tiles.group.visible, groupRot: +tiles.group.rotation.x.toFixed(3),
        groupChildren: tiles.group.children.length,
        last: last ? { lat: +last.lat.toFixed(4), lon: +last.lon.toFixed(4), distance: Math.round(last.distance) } : null,
        maxDepthSeen: (() => { let m = 0; for (const t of tiles.visibleTiles) m = Math.max(m, t.__depth ?? 0); return m; })(),
        blueFraction: pixStats && pixStats.blueFraction, lumaStd: pixStats && pixStats.lumaStd,
      };
    };
  }

  return {
    setView,
    resize,
    /* True once real 3D geometry has been added to the scene. The map keeps
     * its raster imagery visible until then, so the overlay never opens on a
     * black or half-covered screen while tiles are still in flight. */
    /* Ready = tiles for THIS view are in, not merely some tile from an
     * earlier place: something visible and the load queue mostly drained. */
    /* Readiness is "the 3D has a picture to show", NOT "every tile is in".
     * loadProgress is 1 - loading/cached, so up close - where fine tiles keep
     * streaming while you look - it plateaus far below 85 % and a strict
     * threshold keeps the flat map on top for ever ("the 3D map just won't
     * load"). Once several tiles are drawn the 3D world is real content. */
    /* Does the 3D canvas hold a real picture? Tile bookkeeping says the tiles
     * are in while the screen is still an empty navy void - Google's tileset
     * does exactly that where it has no geometry for this level yet. */
    hasPicture() {
      if (!pixStats || pixStats.error) return true;
      if (pixStats.opaqueFraction < 0.9) return false;
      if (pixStats.blueFraction > 0.7 && pixStats.lumaStd < 18) return false;
      return true;
    },
    isReady() {
      const v = tiles.visibleTiles.size;
      if (!v) return false;
      if (tiles.loadProgress < 0.2 && v < 6) return false;
      return this.hasPicture();
    },
    state() {
      const st = tiles.stats; const c = tiles.lruCache || {};
      return { visible: tiles.visibleTiles.size, active: tiles.activeTiles.size, loaded: c.itemSet ? c.itemSet.size : null,
        cacheMB: Math.round((c.cachedBytes || 0) / 1048576), cacheMaxMB: Math.round((c.maxBytesSize || 0) / 1048576),
        progress: Math.round(tiles.loadProgress * 100) / 100, downloading: st.downloading, parsing: st.parsing, queued: st.queued,
        errorTarget: tiles.errorTarget, pixels: pixStats,
        running, frames, contextLost, contextIsLost: contextIsLost || contextLostNow(), gpuObjects: renderer.info ? renderer.info.memory.geometries + 'g/' + renderer.info.memory.textures + 't' : null };
    },
    setEnabled(on) { running = on; },
    destroy() { running = false; ro.disconnect(); tiles.dispose?.(); renderer.dispose(); /* take the canvas with it, or the dead ones pile up */ renderer.domElement.remove(); },
  };
}
