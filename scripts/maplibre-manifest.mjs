/**
 * Generate dist/maplibre/manifest.json: which built asset file holds each
 * bundled layer, each approved icon, and how many features it carries.
 *
 * The data files are emitted by Vite with content hashes
 * (assets/datacenters-CtzejECr.geojsonl), so the static MapLibre pages cannot
 * hardcode them. This runs after `vite build` and writes the resolved paths
 * next to the pages, keeping the source of truth in src/ (one copy of every
 * file, shared with the Cesium app).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const assetsDir = join(root, 'dist', 'assets');
const outDir = join(root, 'dist', 'maplibre');

const LAYERS = {
  'local-datacenters': 'datacenters',
  'local-dams': 'dams',
  'local-hospitals': 'hospitals',
  'local-caregap': 'caregap-deserts',
  'local-caregap-pop': 'caregap-deserts-global-pop-core-f7fdc24e9ac2',
  'local-caregap-traveltime': 'caregap-deserts-global-traveltime',
  'local-caregap-dam-downstream': 'caregap-dam-downstream-global-top',
  'local-caregap-netctx': 'network-context-global',
  'local-caregap-fac-netctx': 'facility-network-context-global-top',
  'local-overture-healthcare': 'overture-healthcare-global-overview',
  'local-caregap-hazard': 'caregap-hazard-global',
  'local-caregap-ind-overture': 'caregap-deserts-IND-overture-merged-pop',
  'local-antarctic-censored': 'antarctic-imagery-gap',
};

const EXTRA_DATA = {
  cables: 'cable-geo',
  'cable-landings': 'landing-point-geo',
};

const TEXTURES = {
  marble: 'earth-blue-marble-4k',   // launch cover preview globe
  night: 'earth-night-4k',          // dawn shader: city lights
  clouds: 'nasa-clouds-2048',       // dawn shader: cloud layer
};

const ART = {
  facility: 'healthcare-building-realistic',
  water: 'dam-realistic',
  network: 'network-tower-realistic',
  gap: 'access-gap-realistic',
  population: 'population-realistic',
  travel: 'travel-time-realistic',
  hazard: 'hazard-symbol-realistic',
  'hazard-fire': 'hazard-fire',
  'hazard-flood': 'hazard-flood',
  'hazard-quake': 'hazard-quake',
  'hazard-cyclone': 'hazard-cyclone',
  flame: 'fire_3d',
  censor: 'eye_3d',
  aircraft: 'plane_3d',
  vessel: 'ship_3d',
};

/* Vite emits name-HASH.ext; the hash is 6-12 chars and must be the ONLY thing
 * after `wanted-` (names like caregap-deserts-global-traveltime must never be
 * mistaken for caregap-deserts). Match the raw filename, not a stripped base. */
const HASHED = /^[A-Za-z0-9_-]{6,12}\.[a-z0-9]+$/i;
function matchFile(files, wanted, ext) {
  const exact = files.find((f) => f === `${wanted}${ext}`);
  if (exact) return exact;
  return files.find((f) => f.startsWith(`${wanted}-`) && HASHED.test(f.slice(wanted.length + 1)));
}

const files = readdirSync(assetsDir).filter((f) => /\.(geojsonl|json|png|jpg)$/i.test(f));
const data = {};
const art = {};
const missing = [];

for (const [layerId, wanted] of Object.entries(LAYERS)) {
  const hit = matchFile(files, wanted, '.geojsonl');
  if (!hit) { missing.push(`layer ${layerId} (${wanted})`); continue; }
  const path = join(assetsDir, hit);
  const text = readFileSync(path, 'utf8');
  const count = text.split('\n').filter((l) => l.trim()).length;
  data[layerId] = { file: `assets/${hit}`, bytes: statSync(path).size, features: count };
}

for (const [kind, wanted] of Object.entries(ART)) {
  const hit = matchFile(files, wanted, '.png');
  if (!hit) { missing.push(`art ${kind} (${wanted})`); continue; }
  art[kind] = `assets/${hit}`;
}

if (missing.length) {
  console.error('maplibre-manifest: missing assets:\n  ' + missing.join('\n  '));
  process.exitCode = 1;
}

for (const [key, wanted] of Object.entries(EXTRA_DATA)) {
  const hit = matchFile(files, wanted, '.json');
  if (hit) {
    const path2 = join(assetsDir, hit);
    let feat = null;
    try { feat = JSON.parse(readFileSync(path2, 'utf8')).features?.length ?? null; } catch { /* not geojson */ }
    data[key] = { file: `assets/${hit}`, bytes: statSync(path2).size, features: feat };
  }
  else missing.push(`data ${key} (${wanted})`);
}

const textures = {};
for (const [key, wanted] of Object.entries(TEXTURES)) {
  const hit = matchFile(files, wanted, '.jpg');
  if (hit) textures[key] = `assets/${hit}`;
  else missing.push(`texture ${key} (${wanted})`);
}

mkdirSync(outDir, { recursive: true });
const manifest = {
  generatedAt: new Date().toISOString(),
  data,
  art,
  textures,
  roads: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));

/* `bundle:maplibre` runs AFTER `vite build`, so the bundles it writes into
 * public/maplibre/ never reached dist/maplibre/. Copy them over so dist/ is a
 * coherent, servable tree — a stale bundle there renders an old globe. */
const bundleDir = join(root, 'public', 'maplibre');
let copied = 0;
for (const name of ['globe.js', 'dawn.bundle.js', 'feeds.bundle.js', 'photoreal.bundle.js', 'cards.bundle.js', 'engine-switch.js']) {
  const src = join(bundleDir, name);
  if (!existsSync(src)) continue;
  copyFileSync(src, join(outDir, name));
  copied += 1;
}

console.log(`maplibre-manifest: ${Object.keys(data).length} layers, ${Object.keys(art).length} icons -> dist/maplibre/manifest.json (${copied} bundles synced)`);
for (const [id, v] of Object.entries(data)) console.log(`  ${id.padEnd(32)} ${String(v.features).padStart(7)} features  ${(v.bytes / 1048576).toFixed(1)} MB`);
