import * as maplibregl from './maplibre-gl.mjs';
import { initPhotoreal } from './photoreal.bundle.js?v=20261115-3dok';
import * as feeds from './feeds.bundle.js?v=20261115-3dok';
import { createDawnLayer as createDawn } from './dawn.bundle.js?v=20261115-3dok';

/* The golden globe: every bundled CareGap layer from the Cesium app, live
 * feeds, global roads, the approved 3D icons, the golden Harmandir Sahib
 * startup — and Google Photorealistic 3D Tiles on zoom (the hybrid: the map
 * owns every input and its symbols ride on top of the photoreal world).
 *
 * Camera sync for the hybrid (verified against maplibre's globe transform):
 *   distance_m = cameraToCenterDistance / worldSize * 40075017
 * the camera then orbits the ground point exactly like maplibre's does.
 */

const hud = document.getElementById('hud');
const say = (msg, bad) => { hud.textContent = msg; hud.classList.toggle('bad', !!bad); };
const fatal = (msg) => { say(msg, true); window.__fatal = msg; console.error('[globe]', msg); };

const probe = document.createElement('canvas');
if (!probe.getContext('webgl2')) {
  fatal('WebGL2 is not available in this browser, so the globe cannot render.\nTurn on hardware acceleration: chrome://settings/system or edge://settings/system');
}

/* Your own Google Maps Platform key, with "Photorealistic 3D Tiles" enabled.
 * Do not commit a real key here. You can also set it at runtime:
 *   <script>window.GEV_PHOTO_KEY = '...'</script>  before the module script. */
const PHOTO_KEY = (typeof window !== 'undefined' && window.GEV_PHOTO_KEY) || 'PASTE_YOUR_GOOGLE_MAPS_API_KEY';
const AMRITSAR = { lon: 74.8765, lat: 31.6200 }; // Harmandir Sahib

/* Bundled layers — ids, names, colours and icon kinds mirror
 * src/data/infrastructure.js + src/caregap/markerRasterAssets.js exactly. */
/* Default visibility follows the Cesium app's CareGap display mode
 * (src/caregap/caregapPanel.js CAREGAP_VISIBLE_LAYER_IDS): CareGap's own layers
 * plus the feeds CareGap reads start ON; everything else starts OFF and has its
 * own toggle. Defaults load one at a time (staggered) so the GPU is never hit
 * with every dataset at once. */
const LAYERS = [
  { id: 'local-hospitals', group: 'caregap', name: 'Health facilities (Nepal, HDX/OSM)', color: '#ff3b6b', kind: 'facility', on: true },
  { id: 'local-caregap-hazard', group: 'caregap', name: 'Facility hazard exposure (FIRMS+storms) - model estimate', color: '#dc2626', kind: 'hazard', on: true },
  { id: 'local-caregap', group: 'caregap', name: 'Access-gap cells (Nepal + SSA)', color: '#ffb000', kind: 'gap', on: true, band: 'access' },
  { id: 'local-overture-healthcare', group: 'caregap', name: 'Global health POIs (Overture)', color: '#22c55e', kind: 'facility', on: true },
  { id: 'local-caregap-pop', group: 'caregap', name: 'Population-weighted gaps (global)', color: '#ff6a00', kind: 'population', on: true, band: 'access' },
  { id: 'local-caregap-traveltime', group: 'caregap', name: 'Travel-time gaps (global)', color: '#9b59ff', kind: 'travel', on: true, band: 'access' },
  { id: 'local-caregap-dam-downstream', group: 'caregap', name: 'Dam-downstream exposure (global)', color: '#0d9488', kind: 'water', on: true },
  { id: 'local-caregap-netctx', group: 'caregap', name: 'Network context - cities', color: '#2563eb', kind: 'network', on: true },
  { id: 'local-caregap-fac-netctx', group: 'caregap', name: 'Facility network context (global)', color: '#7c3aed', kind: 'network', on: true },
  { id: 'local-caregap-ind-overture', group: 'caregap', name: 'Care gap - India (Overture)', color: '#a855f7', kind: 'gap', on: true, band: 'access' },
  { id: 'local-dams', group: 'ground', name: 'Dams (USACE/OSM)', color: '#0088ff', kind: 'water', on: false },
  { id: 'local-datacenters', group: 'ground', name: 'Datacenters (OSM)', color: '#00ffff', kind: 'network', on: false },
  { id: 'local-antarctic-censored', group: 'ground', name: 'Antarctic imagery-gap dossier', color: '#38bdf8', kind: 'censor', on: false },
];

/* Live layers - every dynamic id of the Cesium catalog (src/data/layerState.js),
 * reading the same endpoints the old app reads. `cesium` names the original id. */
const LIVE = [
  { id: 'harmandir-3d', cesium: 'none (new)', group: 'caregap', gold: true, name: 'Sri Harmandir Sahib (3D) - gold landmark', color: '#ffc83d', kind: 'harmandir', live: true, feed: 'harmandir', on: true },
  { id: 'live-earthquakes', cesium: 'earthquakes', group: 'hazard', name: 'Earthquakes - USGS past day (size = magnitude)', color: '#f472b6', kind: 'hazard-quake', live: true, feed: 'earthquakes', refreshSec: 60, on: true },
  { id: 'live-fires', cesium: 'local-firms', group: 'hazard', name: 'Active fires - NASA FIRMS (sampled for display)', color: '#f97316', kind: 'flame', live: true, feed: 'fires', refreshSec: 1800, on: true },
  { id: 'live-perimeters', cesium: 'fire-perimeters', group: 'hazard', name: 'Fire perimeters - WFIGS/NIFC (US polygons)', color: '#ef4444', kind: 'hazard-fire', live: true, feed: 'perimeters', refreshSec: 1800, on: true },
  { id: 'live-cyclones', cesium: 'weather-cyclones', group: 'hazard', name: 'Cyclones - NOAA NHC (track + cone)', color: '#fbbf24', kind: 'hazard-cyclone', live: true, feed: 'cyclones', refreshSec: 900, on: false },
  { id: 'live-wind', cesium: 'wind', group: 'hazard', name: 'Wind - GFS 10 m arrows', color: '#7dd3fc', kind: 'wind', live: true, feed: 'wind', refreshSec: 10800, on: false },
  { id: 'live-wind-lines', cesium: 'wind', group: 'hazard', name: 'Wind - GFS 10 m streamlines', color: '#93c5fd', kind: 'lines', live: true, feed: 'windlines', refreshSec: 10800, on: false },
  { id: 'live-flights', cesium: 'flights', group: 'air', name: 'Aircraft - OpenSky, live', color: '#7dd3fc', kind: 'aircraft', live: true, feed: 'flights', refreshSec: 45, on: true },
  { id: 'live-military', cesium: 'military', group: 'air', name: 'Military aircraft - ADS-B, live', color: '#a3a36b', kind: 'aircraft-mil', live: true, feed: 'military', refreshSec: 30, on: true },
  { id: 'live-awareness', cesium: 'military-awareness', group: 'air', name: 'Military awareness - density of military ADS-B (derived)', color: '#d97706', kind: 'heat', live: true, feed: 'awareness', refreshSec: 60, on: false },
  { id: 'live-vessels', cesium: 'ais-live-vessels', group: 'air', name: 'Ships - AIS live', color: '#22d3ee', kind: 'vessel', live: true, feed: 'vessels', refreshSec: 120, on: true },
  { id: 'live-satellites', cesium: 'satellites', group: 'air', name: 'Satellites & GNSS - CelesTrak core catalog (moving)', color: '#e2e8f0', kind: 'satellite', live: true, feed: 'satellites', refreshSec: 7200, on: true },
  /* The gold CareGap panel's second satellite menu ("🛰️ Global Satellites"
   * tab of Live Golden-Hour Triage). Cesium keeps the triage tray closed on
   * open, so this starts off. */
  { id: 'live-gurdwaras', cesium: 'none (new)', group: 'caregap', gold: true, name: 'Gurdwaras - langar (OpenStreetMap, in view, zoom 7+)', color: '#ffb703', kind: 'gurdwara', live: true, feed: 'gurdwaras', on: false },
  { id: 'caregap-global-satellites', cesium: 'caregap-triage:sat', group: 'caregap', gold: true, name: '🛰️ Global Satellites - Golden-Hour Triage (N2YO overhead per site)', color: '#a855f7', kind: 'globalsat', live: true, feed: 'globalSatellites', refreshSec: 3600, on: false },
  { id: 'live-starlink', cesium: 'satellites', group: 'air', name: 'Starlink - dense catalog (points only)', color: '#54697f', kind: 'dots', live: true, feed: 'starlink', refreshSec: 7200, on: false },
  { id: 'live-orbits', cesium: 'satellites', group: 'air', name: 'Satellite orbits - stations + GNSS ground tracks', color: '#c7d2fe', kind: 'lines', live: true, feed: 'orbits', refreshSec: 600, on: false },
  { id: 'live-launches', cesium: 'rocket-launches', group: 'air', name: 'Rocket launches - Space Devs', color: '#c084fc', kind: 'launch', live: true, feed: 'launches', refreshSec: 21600, on: false },
  { id: 'live-transit', cesium: 'transit', group: 'ground', name: 'Transit vehicles - GTFS-rt feeds', color: '#34d399', kind: 'transit', live: true, feed: 'transit', refreshSec: 60, on: false },
  { id: 'live-bikeshare', cesium: 'bikeshare', group: 'ground', name: 'Bikeshare stations - GBFS', color: '#a3e635', kind: 'bike', live: true, feed: 'bikeshare', refreshSec: 300, on: false },
  { id: 'live-traffic', cesium: 'traffic', group: 'ground', name: 'Traffic - OSM road classes (live flow needs TomTom key)', color: '#fb7185', kind: 'lines', live: true, feed: 'traffic', on: false },
  { id: 'live-cctv', cesium: 'cctv', group: 'ground', name: 'Street cameras - public CCTV (frame on click)', color: '#94a3b8', kind: 'cctv', live: true, feed: 'cctv', refreshSec: 600, on: false },
  { id: 'live-radio', cesium: 'radio', group: 'ground', name: 'Radio stations - live directory (play on click)', color: '#fda4af', kind: 'radio', live: true, feed: 'radio', refreshSec: 86400, on: false },
  { id: 'live-alpr', cesium: 'alpr-cameras', group: 'ground', name: 'ALPR cameras - US & CA', color: '#facc15', kind: 'cctv', live: true, feed: 'alpr', on: false },
  { id: 'live-installations', cesium: 'military-installations', group: 'ground', name: 'Military installations - Overpass / mapped landuse', color: '#67e8f9', kind: 'install', live: true, feed: 'installations', refreshSec: 3600, on: false },
  { id: 'submarine-cables', cesium: 'telegeography-submarine-cables', group: 'ground', name: 'Submarine cables - TeleGeography', color: '#2dd4bf', kind: 'cables', live: true, on: false },
  { id: 'cable-landings', cesium: 'telegeography-submarine-cables', group: 'ground', name: 'Cable landing points', color: '#5eead4', kind: 'cables-points', live: true, on: false },
  { id: 'weather-radar', cesium: 'weather-radar', group: 'imagery', name: 'Weather radar - CONUS (time slider)', color: '#60a5fa', kind: 'raster', live: true, feed: 'radar', refreshSec: 300, on: false },
  { id: 'weather-satellite', cesium: 'weather-satellite', group: 'imagery', name: 'Weather satellite IR - global (time slider)', color: '#818cf8', kind: 'raster', live: true, feed: 'satellite-imagery', refreshSec: 600, on: false },
  { id: 'weather-lightning', cesium: 'weather-lightning', group: 'imagery', name: 'Lightning density (time slider)', color: '#fde047', kind: 'raster', live: true, feed: 'lightning', refreshSec: 300, on: false },
  { id: 'recent-imagery', cesium: 'recent-imagery', group: 'imagery', name: 'Recent imagery - MODIS Terra true colour (daily)', color: '#a5b4fc', kind: 'raster', live: true, feed: 'gibs', gibs: 'MODIS', on: false },
  { id: 'recent-hls-s30', cesium: 'recent-imagery', group: 'imagery', name: 'Recent imagery - HLS S30 Sentinel-2 (30 m)', color: '#a5b4fc', kind: 'raster', live: true, feed: 'gibs', gibs: 'S30', on: false },
  { id: 'recent-hls-l30', cesium: 'recent-imagery', group: 'imagery', name: 'Recent imagery - HLS L30 Landsat 8/9 (30 m)', color: '#a5b4fc', kind: 'raster', live: true, feed: 'gibs', gibs: 'L30', on: false },
  { id: 'recent-viirs', cesium: 'recent-imagery', group: 'imagery', name: 'Recent imagery - VIIRS NOAA-21 daily overview', color: '#a5b4fc', kind: 'raster', live: true, feed: 'gibs', gibs: 'VIIRS', on: false },
  { id: 'recent-modis-flood', cesium: 'recent-imagery', group: 'imagery', name: 'Flood classification - MODIS 1-day', color: '#38bdf8', kind: 'raster', live: true, feed: 'gibs', gibs: 'MODIS_FLOOD', on: false },
  { id: 'live-bhote', cesium: 'bhote-koshi-2026', group: 'events', name: 'Bhote Koshi 2026 flood - event record + post-event image', color: '#ffd166', kind: 'bhote', live: true, feed: 'bhote', on: false },
  { id: 'live-bhote-locator', cesium: 'bhote-koshi-locator', group: 'events', name: 'Bhote Koshi locator - river path + places', color: '#fbbf24', kind: 'bhote', live: true, feed: 'bhotelocator', on: false },
  { id: 'needs-mapillary', cesium: 'street-level', group: 'imagery', name: 'Street-level photos - Mapillary (needs token)', color: '#64748b', kind: 'keyed', live: true, on: false },
];
const GROUPS = [
  ['caregap', 'CareGap'], ['hazard', 'Hazards & weather'], ['air', 'Air, sea & space'],
  ['ground', 'Ground & infrastructure'], ['imagery', 'Imagery'], ['events', 'Events'],
];

/* GIBS products, mirroring src/layers/recentImagery/model.js PRODUCTS. */
const GIBS = {
  MODIS: { layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', level: 9, fmt: 'jpeg', lagDays: 0 },
  S30: { layer: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance', level: 12, fmt: 'png', lagDays: 3 },
  L30: { layer: 'HLS_L30_Nadir_BRDF_Adjusted_Reflectance', level: 12, fmt: 'png', lagDays: 3 },
  VIIRS: { layer: 'VIIRS_NOAA21_CorrectedReflectance_TrueColor', level: 9, fmt: 'jpg', lagDays: 1 },
  MODIS_FLOOD: { layer: 'MODIS_Combined_Flood_1-Day', level: 9, fmt: 'png', lagDays: 1 },
};

/* Access bands and hazard risk colours from src/caregap/layerMarkerGlyph.js. */
const ACCESS_BAND_COLORS = { served: '#3fb950', limited: '#d29922', gap: '#f0883e', desert: '#f85149' };
const bandColor = ['match', ['downcase', ['to-string', ['coalesce', ['get', 'access_band'], '']]],
  'served', ACCESS_BAND_COLORS.served, 'limited', ACCESS_BAND_COLORS.limited, 'gap', ACCESS_BAND_COLORS.gap,
  'desert', ACCESS_BAND_COLORS.desert, 'rgba(0,0,0,0)'];
const riskColor = ['case',
  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'risk_band'], '']]], 'high'], '#ff3b30',
  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'risk_band'], '']]], 'medium'], '#ff7a00',
  ['all', ['==', ['downcase', ['to-string', ['coalesce', ['get', 'risk_band'], '']]], 'low'], ['<', ['to-number', ['coalesce', ['get', 'severity'], 1]], 0.08]], '#8bc34a',
  ['==', ['downcase', ['to-string', ['coalesce', ['get', 'risk_band'], '']]], 'low'], '#ffb300',
  'rgba(0,0,0,0)'];

/* style-layer id -> panel layer id, for click cards on layers that are not
 * named <id>-icons / <id>-clusters (lines, polygons, vector tiles). */
const pickLayers = new Map();
window.__pickLayers = pickLayers;

/* Chip colours from src/data/markerClusters.js chipHeat(). */
const CHIP_STEPS = [[0, '#689660'], [8, '#5c9450'], [18, '#b09232'], [40, '#ba642c'], [110, '#aa3e2c']];
const chipColor = ['step', ['get', 'point_count'], CHIP_STEPS[0][1]];
for (let i = 1; i < CHIP_STEPS.length; i++) chipColor.push(CHIP_STEPS[i][0], CHIP_STEPS[i][1]);
/* Cluster chips scale with zoom only. Nesting a step-per-feature expression
 * inside a multiplication silently produced no discs at all, so this stays a
 * plain zoom interpolation - the count is written on the chip instead. */
const chipRadius = ['interpolate', ['linear'], ['zoom'], 0.9, 7, 3, 9, 6, 12, 9, 15, 12, 18, 16, 22];

function hazardKind(props) {
  const h = String(props.hazard || props.hazard_type || props.type || '').toLowerCase();
  if (/earthquake|quake|seismic|tremor/.test(h)) return 'hazard-quake';
  if (/flood|surge|rain|inundat/.test(h)) return 'hazard-flood';
  if (/wildfire|fire|flame|burn|forest/.test(h)) return 'hazard-fire';
  if (/cyclone|hurricane|typhoon|storm|wind/.test(h)) return 'hazard-cyclone';
  return 'hazard';
}

function featurePoint(feature) {
  const g = feature?.geometry;
  const ring = g?.type === 'Point' ? [g.coordinates]
    : g?.type === 'LineString' ? g.coordinates
    : g?.type === 'Polygon' ? g.coordinates?.[0]
    : g?.type === 'MultiPolygon' ? g.coordinates?.[0]?.[0] : null;
  const pts = (ring || []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

function parseGeojsonLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed line */ }
  }
  return out;
}

async function sprite(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/* Integer only: a fractional pixelRatio rounds the sprite rect to zero and
 * the icon silently never draws in this maplibre build. */
function iconPixelRatio(img) {
  return Math.max(1, Math.round(img.naturalHeight / 140));
}

const loaded = new Map();
const stats = {};
window.__layerStats = stats;

/* The manifest is a build artifact and the served root varies: the app's
 * preview server mounts the project root (manifest at /dist/maplibre/), while
 * a plain `vite preview` serves dist/ itself (manifest at /maplibre/). Try
 * both and keep the base the winner came from, so every asset path in the
 * manifest resolves against the same directory. A missing manifest returns the
 * app's HTML shell with a 200, so the body is sniffed for JSON rather than
 * trusting the status code. */
let manifest;
let manifestBase = './';
for (const candidate of ['./maplibre/manifest.json', './dist/maplibre/manifest.json']) {
  try {
    const res = await fetch(candidate + '?t=' + Date.now());
    if (!res.ok) continue;
    const body = await res.text();
    if (!body.trimStart().startsWith('{')) continue;
    manifest = JSON.parse(body);
    /* Asset paths inside the manifest are relative to the ROOT that holds
     * maplibre/ (e.g. "assets/foo.geojsonl"), not to the manifest's folder. */
    manifestBase = candidate.replace(/maplibre\/manifest\.json.*$/, '');
    break;
  } catch (e) { /* try the next candidate */ }
}
if (!manifest) {
  fatal('manifest failed to load: not found at /maplibre/manifest.json or /dist/maplibre/manifest.json\n(run `npm run build`)');
  throw new Error('manifest not found');
}

/* Resolve a manifest-relative asset path against the manifest's own folder. */
const assetUrl = (path) => manifestBase + path;

/* The cover is on screen while the map is still loading, and the map takes a
 * while on a small GPU. Wire Enter NOW so an early click is never swallowed:
 * it is remembered and honoured the moment the globe is ready. */
let pendingEnter = false;
let enterHandler = null;
const coverEnterButton = document.querySelector('.gev-enter');
coverEnterButton?.addEventListener('click', () => {
  if (enterHandler) { enterHandler(); return; }
  pendingEnter = true;
  coverEnterButton.disabled = true;
  coverEnterButton.textContent = 'Preparing live globe...';
  const status = document.querySelector('.gev-loading');
  if (status) { status.hidden = false; status.textContent = 'Loading the 3D world and live layers'; }
});

// The cover's rotating preview globe uses the same Blue Marble as the app.
try {
  document.querySelector('.gev-globe-texture')?.style.setProperty('--gev-marble-preview', `url("${assetUrl(manifest.textures.marble)}")`);
} catch { /* cover absent */ }

let dawn = null;

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: manifest.glyphs,
    projection: { type: 'globe' },
    sources: {
      imagery: {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, maxzoom: 16, attribution: 'Esri World Imagery',
      },
      /* Low-zoom copy of the same imagery, always resident: while the sharp
       * tiles for a new view are still loading (spin, zoom, fly) this is drawn
       * underneath instead of the black page, so the globe never goes blank. */
      'imagery-low': {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, maxzoom: 3,
      },
      roads: { type: 'vector', url: manifest.roads, attribution: '© OpenStreetMap contributors' },
    },
    layers: [
      { id: 'transparent-base', type: 'background', paint: { 'background-color': 'rgba(0,0,0,0)' } },
      { id: 'imagery-low', type: 'raster', source: 'imagery-low', paint: { 'raster-fade-duration': 0 } },
      { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 0 } },
      { id: 'road-minor', type: 'line', source: 'roads', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['tertiary', 'minor', 'residential', 'service']]],
        paint: { 'line-color': '#c9d4dd', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 12, 1.1, 15, 2.2] } },
      { id: 'road-primary', type: 'line', source: 'roads', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]],
        paint: { 'line-color': '#f0ead6', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 12, 2, 15, 3.4] } },
      { id: 'road-trunk', type: 'line', source: 'roads', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['trunk', 'trunk_link']]],
        paint: { 'line-color': '#ffe08a', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.1, 12, 2.6, 15, 4.4] } },
      { id: 'road-motorway', type: 'line', source: 'roads', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'motorway_link']]],
        paint: { 'line-color': '#ffb84d', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 12, 3.2, 15, 5.4] } },
      { id: 'road-labels', type: 'symbol', source: 'roads', 'source-layer': 'transportation_name', minzoom: 11,
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-padding': 4 },
        paint: { 'text-color': '#eef4fa', 'text-halo-color': '#0b1420', 'text-halo-width': 1.4 } },
      { id: 'place-labels', type: 'symbol', source: 'roads', 'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]], minzoom: 4,
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 9, 15], 'text-font': ['Noto Sans Regular'], 'text-padding': 5, 'text-transform': 'uppercase' },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#0b1420', 'text-halo-width': 1.6, 'text-opacity': 0.92 } },
    ],
  },
  center: [-40, 25],
  zoom: 2.4,
  /* MapLibre's globe projection defaults to minZoom -2, and below zoom 0 the
   * globe transform is invalid: point geometry (city dots, cluster badges,
   * the approved 3D art) is projected into the sea and, on this GPU, the
   * renderer can die outright. Clamp at 0 so the globe stays a globe. */
  minZoom: 0.9,
  maxZoom: 22,
  maxPitch: 85,
  antialias: true,
  /* Render stability while the camera moves: no symbol cross-fade (labels
   * popping in/out looked like flicker), a larger tile cache so tiles seen a
   * moment ago are still there after a spin, and pending tiles are not
   * cancelled mid-zoom (cancelled tiles were the black holes). */
  fadeDuration: 0,
  maxTileCacheSize: 600,
  cancelPendingTileRequestsWhileZooming: false,
  refreshExpiredTiles: false,
});
window.__map = map;

/* The layers panel covers the right edge. Pad the map by its width so the
 * globe sits in the middle of what the visitor can actually see rather than
 * half-hidden behind the panel. */
const centreForPanel = () => {
  const panel = document.getElementById('panel');
  const rect = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
  /* On a narrow screen the panel is a bottom sheet: pad the bottom instead. */
  const narrow = window.innerWidth <= 640;
  const pad = narrow
    ? { top: 0, bottom: Math.min(Math.round(rect.height), Math.round(window.innerHeight * 0.5)), left: 0, right: 0 }
    : { top: 0, bottom: 0, left: 0, right: rect.width > 200 ? Math.round(rect.width) : 0 };
  try { map.setPadding(pad); } catch { /* not ready */ }
};
document.querySelector('#panel h1')?.addEventListener('click', () => {
  if (window.innerWidth > 640) return;
  document.getElementById('panel').classList.toggle('folded');
  setTimeout(centreForPanel, 50);
});
centreForPanel();
window.addEventListener('resize', centreForPanel);
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
map.on('error', (e) => console.error('[maplibre]', (e && e.error && e.error.message) || e));

/* ------------------------------------------------------------------ */
/* Hybrid 3D: photoreal tiles under the map's symbols.                  */
/* ------------------------------------------------------------------ */
let photoreal = null;
let mode = 'auto'; // auto | 3d | 2d
let photorealOn = false;

/* The 3D tiles renderer is created on first use, not at map load, and never
 * while the map is hidden (the dawn owns the screen then). */
function ensurePhotoreal() {
  if (photoreal) return photoreal;
  const el = document.getElementById('photoreal');
  if (!el || map.getContainer().style.visibility === 'hidden') return null;
  try {
    const q3 = new URLSearchParams(location.search);
    photoreal = initPhotoreal(el, PHOTO_KEY, { fov: 36.87, cacheMB: Number(q3.get('cache3d')) || 128 });
    photoreal.setEnabled(false);
    syncPhotorealCamera();
  } catch (e) {
    console.error('[photoreal]', e);
    photoreal = null;
  }
  return photoreal;
}

/* Camera distance to the ground point in metres (the photoreal camera uses
 * exactly this). z10 is about 82 km, z13.2 about 9 km, z15 about 2.5 km. */
function cameraDistance() {
  const t = map._camera?.transform;
  if (!t) return Infinity;
  const d = (t.cameraToCenterDistance / t.worldSize) * 40075017;
  return Number.isFinite(d) ? d : Infinity;
}

function syncPhotorealCamera() {
  if (!photoreal) return;
  const distance = cameraDistance();
  /* Far above the 3D range there is nothing to show and the tiles loader
   * would chase the planet; the renderer itself also parks above 32 km. */
  if (!Number.isFinite(distance) || distance > 140000) return;
  const center = map.getCenter();
  photoreal.setView(center.lat, center.lng, distance, map.getBearing(), map.getPitch());
}

/* When the 3D world is shown. Decided by zoom with hysteresis -
 * it turns on below ON and only turns off above OFF - and it is NOT tied to
 * gestures any more. The old code switched the 3D tiles off on every
 * movestart and back on at moveend (and toggled exactly at one zoom), which
 * is what made the buildings vanish and reappear on every drag or zoom. */
const PHOTOREAL_RANGE = {
  '3d': { on: 11.0, off: 10.6 },   // the "Open the 3D map" view lands at z11.2
  auto: { on: 13.2, off: 12.8 },
};
function applyPhotorealVisibility() {
  const zoom = map.getZoom();
  const range = PHOTOREAL_RANGE[mode] || PHOTOREAL_RANGE.auto;
  const want = mode === '2d' ? false
    : photorealOn === true ? zoom >= range.off
    : zoom >= range.on;
  if (want && !photoreal) ensurePhotoreal();
  if (!photoreal) return;
  if (want === photorealOn) return;
  photorealOn = want;
  const el = document.getElementById('photoreal');
  el.style.transition = 'opacity .6s ease';
  el.style.opacity = want ? '1' : '0';
  /* The raster imagery stays on until the 3D tiles for this view have
   * actually loaded (not just "some tile exists"), then steps aside; it comes
   * back only when the 3D world is switched off. */
  if (!want) {
    imageryHidden = false;
    clearTimeout(paintWatcher);
    showImagery(true);
  } else {
    waitForPhotorealPaint();
  }
  if (want) syncPhotorealCamera();
  photoreal.setEnabled(want);
  for (const b of document.querySelectorAll('.modeBtn')) b.classList.toggle('active', b.dataset.mode === mode);
}
window.__photorealState = () => (photoreal ? { on: photorealOn, imageryHidden, coveredBecause, ...(photoreal.state ? photoreal.state() : {}) } : null);

map.on('move', syncPhotorealCamera);
map.on('render', syncPhotorealCamera);
/* Re-checking during a zoom is safe now that nothing else toggles the 3D
 * world: with hysteresis it flips at most once per crossing. Throttled. */
/* No zoom-event toggles any more: the 3D on/off decision is made only at
 * moveend (and on explicit mode changes), never in the middle of a gesture. */
let gestureMoving = false;
map.on('movestart', () => { gestureMoving = true; });
let imageryHidden = false;
let paintWatcher = 0;
let imageryOpacity = 1;
let fadeTimer = 0;
/* Why the flat map is covering the 3D world right now. 'empty' = the 3D had
 * nothing to draw, 'context' = the WebGL context died. null = the 3D world
 * is on show. */
let coveredBecause = null;
/* Opacity, not visibility: a layer with visibility 'none' stops requesting
 * tiles, so when it came back for a spin it had nothing loaded = black. */
/* The flat raster lives in the MAP canvas, which is ABOVE the 3D canvas, so
 * swapping between them is a hard cover. Cross-fade it instead: a hard
 * switch reads as the 3D world blinking out and in while you zoom. */
function showImagery(on, instant) {
  const to = on ? 1 : 0;
  const from = imageryOpacity;
  clearInterval(fadeTimer);
  const apply = (v) => {
    imageryOpacity = v;
    try {
      map.setPaintProperty('imagery', 'raster-opacity', v);
      map.setPaintProperty('imagery-low', 'raster-opacity', v);
    } catch { /* not ready */ }
  };
  if (instant || from === to) { apply(to); harmandirPhotoreal(!on); return; }
  const t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / 450);
    apply(from + (to - from) * k);
    if (k >= 1) { clearInterval(fadeTimer); harmandirPhotoreal(!on); }
  }, 30);
}
/* Where the ground is that the 3D tiles we are showing belong to. When the
 * camera moves to a NEW piece of ground, the tiles of the old one stay drawn
 * until the new ones arrive - showing the old buildings over the new place
 * is worse than showing the flat map for a moment. Zooming in on the SAME
 * place is not a new place: the parent tile covers it while its children
 * download, so that must never trigger the cover. */
let photorealGround = null;
function groundMovedMeters() {
  if (!photorealGround) return 0;
  const c = map.getCenter();
  const dy = (c.lat - photorealGround.lat) * 111320;
  const dx = (c.lng - photorealGround.lng) * 111320 * Math.cos((c.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}
function checkPhotorealGround() {
  if (!photoreal || !photorealOn || !photoreal.state) return;
  if (!imageryHidden) return;
  if (groundMovedMeters() < 800) return;
  /* At moveend the tile loader has not re-evaluated the new view yet, so
   * downloading/queued still read 0 and the old ground looks "settled".
   * Give it a moment, then cover if the new ground is still coming in. */
  let tries = 0;
  const attempt = () => {
    if (!photoreal || !photorealOn || !imageryHidden) return;
    if (groundMovedMeters() < 800) return;
    const st = photoreal.state();
    const busy = (st.downloading || 0) > 0 || (st.queued || 0) > 0 || (st.parsing || 0) > 0 || (st.progress ?? 1) < 0.85;
    if (!busy) return;
    coveredBecause = 'ground';
    imageryHidden = false;
    showImagery(true);
    waitForPhotorealPaint({ noStall: true });
  };
  const tick = () => {
    if (tries++ > 6) return;
    const st = photoreal && photoreal.state ? photoreal.state() : null;
    if (!st) return;
    const busy = (st.downloading || 0) > 0 || (st.queued || 0) > 0 || (st.parsing || 0) > 0 || (st.progress ?? 1) < 0.85;
    if (busy) { attempt(); return; }
    setTimeout(tick, 500);
  };
  tick();
}
function waitForPhotorealPaint(opts) {
  if (imageryHidden || !photoreal) return;
  clearTimeout(paintWatcher);
  const startedAt = Date.now();
  const allowStall = !(opts && opts.noStall);
  let lastProgress = -1;
  let lastProgressAt = startedAt;
  const check = () => {
    if (!photoreal || !photorealOn) return;
    const st = photoreal.state ? photoreal.state() : {};
    const prog = st.progress ?? 0;
    if (prog !== lastProgress) { lastProgress = prog; lastProgressAt = Date.now(); }
    const ready = !gestureMoving && photoreal.isReady();
    /* Tile errors can keep the queue from ever reaching 85 % - then the 3D
     * world never comes out at all and the map stays flat for good. If the
     * load has stalled but something IS drawn, show it: a half-loaded 3D
     * beats a flat map that never gives way. */
    /* A stall only counts as "good enough" when the 3D canvas really holds a
     * picture: Google's tileset can finish loading and still paint an empty
     * navy void, and covering the flat map with that is exactly what leaves
     * the map as nothing but street lines. */
    const hasPicture = photoreal.hasPicture ? photoreal.hasPicture() : true;
    const stalled = allowStall && hasPicture && !gestureMoving && prog > 0 && st.visible > 0 && Date.now() - lastProgressAt > 8000;
    if (ready || stalled) {
      imageryHidden = true;
      coveredBecause = null;
      const c = map.getCenter();
      photorealGround = { lat: c.lat, lng: c.lng };
      showImagery(false);
      return;
    }
    if (Date.now() - startedAt < 60000) paintWatcher = setTimeout(check, 350);
  };
  paintWatcher = setTimeout(check, 350);
}

/* Arriving somewhere new (search, fly, a long drag) the 3D tiles there are
 * not loaded yet. Bring the imagery back underneath until they are, instead
 * of showing an empty black ground. */
/* The flat imagery sits in the MAP canvas, i.e. ABOVE the 3D canvas, so
 * re-showing it covers the buildings. The old test was "visible tiles === 0"
 * - but that reads 0 for a moment on EVERY REPLACE refinement (the parent
 * tile is swapped for its children), i.e. exactly while you zoom. So the
 * cover went on mid-zoom and came off again when you stopped: the 3D world
 * blinked out and in. "Empty" now means the 3D has nothing to draw AND
 * nothing on the way - tiles still downloading are the 3D arriving, not the
 * 3D dying. The cover also needs 2.5 s to persist, not 1.5 s. */
let emptySince = 0;
setInterval(() => {
  if (!photoreal || !photorealOn || !photoreal.state) { emptySince = 0; return; }
  const st = photoreal.state();
  /* A lost WebGL context blanks the 3D canvas. Cover it with the flat map
   * so the user gets a map instead of a black hole, and take the cover off
   * as soon as the context is back and there is something to draw. */
  if (st.contextIsLost) {
    emptySince = 0;
    if (coveredBecause !== 'context') {
      coveredBecause = 'context';
      imageryHidden = false;
      showImagery(true);
    }
    return;
  }
  if (coveredBecause === 'context') {
    if (st.visible > 0) {
      coveredBecause = null;
      imageryHidden = true;
      showImagery(false);
    }
    return;
  }
  /* While a gesture is running the 3D keeps rendering; never judge it now. */
  if (gestureMoving) { emptySince = 0; return; }
  /* Waiting for a new piece of ground: waitForPhotorealPaint owns that. */
  if (coveredBecause === 'ground') { emptySince = 0; return; }
  const busy = (st.downloading || 0) > 0 || (st.parsing || 0) > 0 || (st.queued || 0) > 0;
  const empty = st.visible === 0 && !busy;
  if (!empty) {
    emptySince = 0;
    /* It had nothing, now it has: take the cover off again. */
    if (coveredBecause === 'empty' && st.visible > 0) {
      coveredBecause = null;
      imageryHidden = true;
      showImagery(false);
    }
    return;
  }
  if (!emptySince) { emptySince = Date.now(); return; }
  if (Date.now() - emptySince > 2500 && coveredBecause === null) {
    emptySince = 0;
    coveredBecause = 'empty';
    imageryHidden = false;
    showImagery(true);
  }
}, 500);

/* A WebGL context that does not come back means a dead 3D world - and on a
 * shared-memory GPU under load that is exactly what happens. Rebuild the
 * renderer instead of leaving the map flat for good: the tiles are fetched
 * again, and the flat map covers the gap until they are in. */
let contextLostSince = 0;
setInterval(() => {
  if (!photoreal || !photoreal.state) { contextLostSince = 0; return; }
  const st = photoreal.state();
  if (!st.contextIsLost) { contextLostSince = 0; return; }
  if (!contextLostSince) { contextLostSince = Date.now(); return; }
  if (Date.now() - contextLostSince < 8000) return;
  contextLostSince = 0;
  try { photoreal.destroy(); } catch { /* already gone */ }
  photoreal = null;
  photorealOn = false;
  coveredBecause = 'context';
  imageryHidden = false;
  showImagery(true);
  /* Rebuild on the next tick: ensurePhotoreal() makes a fresh renderer and
   * the swap logic takes it from there. */
  setTimeout(() => { applyPhotorealVisibility(); }, 300);
}, 1000);

/* ?debug3d=1 - on-screen state of the 3D world, so a real-GPU session can be
 * read off the screen (temporary diagnostic, off by default). */
if (new URLSearchParams(location.search).get('debug3d') === '1') {
  const box = document.createElement('div');
  box.id = 'debug3d';
  box.style.cssText = 'position:fixed;left:8px;top:40px;z-index:99999;font:11px/1.35 ui-monospace,Consolas,monospace;color:#e8f5e9;background:rgba(0,0,0,.72);border:1px solid #ffd166;border-radius:6px;padding:6px 8px;pointer-events:none;white-space:pre;min-width:210px';
  document.body.append(box);
  let lastFrames = 0, lastT = performance.now();
  setInterval(() => {
    const st = photoreal && photoreal.state ? photoreal.state() : null;
    const now = performance.now();
    const fps = st ? Math.round(((st.frames - lastFrames) * 1000) / (now - lastT)) : 0;
    if (st) lastFrames = st.frames; lastT = now;
    let img = '?';
    try { img = String(map.getPaintProperty('imagery', 'raster-opacity') ?? 1); } catch { /* */ }
    const el = document.getElementById('photoreal');
    box.textContent = [
      'debug3d  ' + new Date().toLocaleTimeString(),
      'mode ' + mode + '  zoom ' + map.getZoom().toFixed(2) + '  dist ' + (cameraDistance() / 1000).toFixed(1) + ' km',
      '3D on ' + photorealOn + '  canvas opacity ' + (el ? el.style.opacity || '1' : '-'),
      'flat imagery ' + (imageryHidden ? 'HIDDEN' : 'SHOWN') + ' (opacity ' + img + ')  moving ' + gestureMoving,
      st ? 'tiles drawn ' + st.visible + '  active ' + st.active + '  cached ' + st.loaded : 'renderer not created',
      st ? 'load ' + Math.round(st.progress * 100) + '%  dl ' + st.downloading + '  parse ' + st.parsing + '  queue ' + st.queued + '  err ' + st.errorTarget : '',
      st ? 'cache ' + st.cacheMB + ' / ' + st.cacheMaxMB + ' MB  gpu ' + st.gpuObjects : '',
      st ? '3D fps ' + fps + '  running ' + st.running + '  ctx lost ' + st.contextLost + (st.contextIsLost ? ' (NOW)' : '') : '',
    ].join('\n');
  }, 250);
}

let clampingFloor = false;
const clampZoomFloor = () => {
  if (clampingFloor || map.getZoom() >= 0.9) return;
  /* Instant and guarded: an animated ease here re-enters on its own moveend
   * and fights the next wheel step, which froze zoom at the floor. */
  clampingFloor = true;
  try { map.setZoom(0.9); } finally { clampingFloor = false; }
};

/* No movestart handler for the 3D world: it keeps rendering through drags,
 * zooms and flights. The GPU guard is distance-based instead (the renderer
 * stops pulling tiles above 70 km, and the switch above turns it off), so a
 * long flight still cannot queue the whole planet. */
map.on('moveend', () => { gestureMoving = false; clampZoomFloor(); applyPhotorealVisibility(); checkPhotorealGround(); });

/* ------------------------------------------------------------------ */
/* Interaction gate: no GeoJSON re-tiling while the camera moves.       */
/* ------------------------------------------------------------------ */
/* Live feeds (satellites every 3 s, aircraft, quakes...) used to call
 * setData in the middle of a spin or zoom; each call re-tiles the source on
 * the worker and re-places every symbol, which is what made icons blink and
 * frames stall. While the camera moves the newest data per source is held
 * and applied once it settles. Paused entirely while the tab is hidden. */
let interacting = false;
let interactStartedAt = 0;
let flushTimer = 0;
const heldData = new Map();
const dataGate = { applied: 0, held: 0, appliedWhileMoving: 0 };
window.__dataGate = dataGate;
const GeoJSONProto = maplibregl.GeoJSONSource && maplibregl.GeoJSONSource.prototype;
const rawSetData = GeoJSONProto ? GeoJSONProto.setData : null;
if (GeoJSONProto && !GeoJSONProto.__gevGated) {
  GeoJSONProto.__gevGated = true;
  GeoJSONProto.setData = function gatedSetData(data, ...rest) {
    // hold during a gesture, but never longer than 8 s (a long fly still updates)
    if (interacting && Date.now() - interactStartedAt < 8000) { heldData.set(this, [data, rest]); dataGate.held++; return this; }
    dataGate.applied++;
    if (map.isMoving()) dataGate.appliedWhileMoving++;
    return rawSetData.call(this, data, ...rest);
  };
}
const flushHeldData = () => {
  for (const [src, [data, rest]] of heldData) {
    try { dataGate.applied++; rawSetData.call(src, data, ...rest); } catch { /* source removed */ }
  }
  heldData.clear();
};
map.on('movestart', () => { interactStartedAt = Date.now(); interacting = true; clearTimeout(flushTimer); });
map.on('moveend', () => {
  clearTimeout(flushTimer);
  // a short settle so wheel-zoom steps and inertia count as one gesture
  flushTimer = setTimeout(() => { if (map.isMoving()) return; interacting = false; flushHeldData(); }, 300);
});
const liveTicksPaused = () => document.hidden || (interacting && Date.now() - interactStartedAt < 8000);
window.__liveTicksPaused = liveTicksPaused;

/* GPU context loss (driver reset, sleep, too many tabs): say so, and repaint
 * when the browser hands the context back instead of leaving a dead canvas. */
map.on('webglcontextlost', () => { say('Graphics context lost - restoring the globe...', true); });
map.on('webglcontextrestored', () => { say('Globe restored'); map.triggerRepaint(); setTimeout(() => say(''), 2500); });

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */
function addPointLayers(def, sourceId, { iconLayer = true, labelField = true } = {}) {
  map.addLayer({
    id: `${def.id}-clusters`, type: 'circle', source: sourceId, filter: ['has', 'point_count'],
    paint: { 'circle-color': chipColor, 'circle-radius': chipRadius, 'circle-stroke-width': 1.6, 'circle-stroke-color': '#fff3d0' },
  });
  map.addLayer({
    id: `${def.id}-counts`, type: 'symbol', source: sourceId, filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}',
      'text-size': ['interpolate', ['linear'], ['zoom'], 0.8, 7, 3, 9, 6, 11, 9, 12],
      'text-font': ['Noto Sans Regular'], 'text-allow-overlap': true },
    paint: { 'text-color': '#fffdf5', 'text-halo-color': '#3a2600', 'text-halo-width': 0.8 },
  });
  /* Severity encoding the Cesium markers carry: access band (served /
   * limited / gap / desert) or hazard risk band, as a disc under the art. */
  if (def.band === 'access' || def.kind === 'hazard') {
    map.addLayer({
      id: `${def.id}-band`, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
      paint: { 'circle-color': def.kind === 'hazard' ? riskColor : bandColor, 'circle-opacity': 0.78,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.9, 2.2, 4, 4, 8, 7, 12, 11],
        'circle-stroke-width': 0.6, 'circle-stroke-color': '#1a1206' },
    });
    pickLayers.set(`${def.id}-band`, def.id);
  }
  if (iconLayer) {
    map.addLayer({
      id: `${def.id}-icons`, type: 'symbol', source: sourceId, filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': ['get', '_icon'], 'icon-allow-overlap': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0.8, 0.10, 3, 0.18, 6, 0.32, 9, 0.45, 12, 0.55] },
    });
    map.addLayer({
      id: `${def.id}-labels`, type: 'symbol', source: sourceId, filter: ['!', ['has', 'point_count']],
      minzoom: 8,
      layout: { 'text-field': labelField ? ['coalesce', ['get', 'name:en'], ['get', 'name'], ''] : '', 'text-size': 10.5,
        'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1.05], 'text-anchor': 'top', 'text-padding': 3, 'text-optional': true },
      paint: { 'text-color': '#f4f8fb', 'text-halo-color': '#0b1420', 'text-halo-width': 1.3 },
    });
  }
}

async function loadLayer(def) {
  if (loaded.has(def.id)) return;
  if (def.live) return loadLiveLayer(def);
  const entry = manifest.data[def.id];
  if (!entry) { stats[def.id] = { error: 'not in manifest' }; setCount(def, 'not in build'); return; }
  say(`loading ${def.name}…`);
  /* Hazard exposure is refreshed hourly into src/ by the CareGap pipeline; the
   * manifest copy is frozen at build time. Read the refreshed file when this
   * server serves it (read-only), else fall back to the build copy. */
  let url = assetUrl(entry.file);
  let fresh = false;
  if (def.id === 'local-caregap-hazard') {
    const live = await feeds.freshAsset('/src/data/local_data/hospitals/global/caregap-hazard-global.geojsonl');
    if (live) { url = live + '?t=' + Date.now(); fresh = true; }
  }
  const text = await (await fetch(url)).text();
  const features = [];
  for (const f of parseGeojsonLines(text)) {
    const pt = featurePoint(f);
    if (!pt) continue;
    f.geometry = { type: 'Point', coordinates: pt };
    f.properties = f.properties || {};
    f.properties._icon = def.kind === 'hazard' ? hazardKind(f.properties) : def.kind;
    features.push(f);
  }
  const fc = { type: 'FeatureCollection', features };
  loaded.set(def.id, fc);
  stats[def.id] = { features: features.length, enabled: true, note: fresh ? 'refreshed file' : 'build copy' };
  map.addSource(def.id, { type: 'geojson', data: fc, cluster: true, clusterRadius: 42, clusterMaxZoom: 9 });
  addPointLayers(def, def.id);
  trackLayers(def, ['-clusters', '-counts', '-band', '-icons', '-labels'].map((x) => def.id + x));
  setCount(def, features.length);
  say(`${def.name}: ${features.length.toLocaleString()} features`);
  /* The hazard model is re-run hourly by the CareGap pipeline: re-read it
   * every 30 min while it is served, so the exposure points stay current. */
  if (fresh) {
    every(def, 1800, async () => {
      const liveUrl = await feeds.freshAsset('/src/data/local_data/hospitals/global/caregap-hazard-global.geojsonl');
      if (!liveUrl) return;
      const t2 = await (await fetch(liveUrl + '?t=' + Date.now(), { cache: 'no-store' })).text();
      const next = [];
      for (const f of parseGeojsonLines(t2)) {
        const pt = featurePoint(f);
        if (!pt) continue;
        f.geometry = { type: 'Point', coordinates: pt };
        f.properties = f.properties || {};
        f.properties._icon = hazardKind(f.properties);
        next.push(f);
      }
      if (!next.length) return;
      const fc2 = { type: 'FeatureCollection', features: next };
      loaded.set(def.id, fc2);
      map.getSource(def.id)?.setData(fc2);
      stats[def.id] = { ...stats[def.id], features: next.length };
      setCount(def, next.length);
    });
  }
}

/* ---------------- custom glyphs (no approved art covers these) ---------- */
function glyphImage(draw) {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  draw(g, S);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = c.toDataURL('image/png');
  });
}
const GOLD = '#ffd166', GOLD_D = '#b98a2f', INK = '#241706';
async function registerGlyphs() {
  const defs = {
    satellite: (g) => {
      g.fillStyle = GOLD; g.fillRect(-9, -7, 18, 14);
      g.fillStyle = '#3b6ea5'; g.fillRect(-22, -5, 11, 10); g.fillRect(11, -5, 11, 10);
      g.strokeStyle = GOLD_D; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -7); g.lineTo(0, -16); g.lineTo(8, -20); g.stroke();
      g.beginPath(); g.arc(8, -20, 2.4, 0, Math.PI * 2); g.fill();
    },
    launch: (g) => {
      g.fillStyle = GOLD; g.beginPath();
      g.moveTo(0, -22); g.quadraticCurveTo(11, -4, 8, 12); g.lineTo(-8, 12); g.quadraticCurveTo(-11, -4, 0, -22); g.fill();
      g.fillStyle = GOLD_D; g.beginPath(); g.moveTo(-8, 4); g.lineTo(-16, 16); g.lineTo(-8, 12); g.fill();
      g.beginPath(); g.moveTo(8, 4); g.lineTo(16, 16); g.lineTo(8, 12); g.fill();
      g.fillStyle = '#ff8c42'; g.beginPath(); g.moveTo(-5, 13); g.lineTo(0, 24); g.lineTo(5, 13); g.fill();
    },
    cctv: (g) => {
      g.fillStyle = '#aab7c4'; g.fillRect(-16, -12, 24, 14);
      g.fillStyle = INK; g.beginPath(); g.arc(2, -5, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = GOLD; g.beginPath(); g.arc(2, -5, 2.2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8fa3b2'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(8, 2); g.lineTo(16, 10); g.lineTo(16, 20); g.stroke();
    },
    radio: (g) => {
      g.strokeStyle = GOLD; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 20); g.lineTo(0, -14); g.moveTo(-10, 20); g.lineTo(0, -2); g.lineTo(10, 20); g.stroke();
      g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(0, -18, 3.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = GOLD_D; g.lineWidth = 2.2;
      for (const r of [7, 12, 17]) { g.beginPath(); g.arc(0, -18, r, -Math.PI * 0.82, -Math.PI * 0.18); g.stroke(); }
    },
    transit: (g) => {
      g.fillStyle = '#8fd3a7'; g.fillRect(-14, -16, 28, 30);
      g.fillStyle = '#dff5e7'; g.fillRect(-10, -11, 20, 10);
      g.fillStyle = INK; g.fillRect(-10, 2, 6, 7); g.fillRect(4, 2, 6, 7);
      g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(-7, 16, 3.2, 0, Math.PI * 2); g.arc(7, 16, 3.2, 0, Math.PI * 2); g.fill();
    },
    bike: (g) => {
      g.strokeStyle = GOLD; g.lineWidth = 3.4;
      g.beginPath(); g.arc(-11, 8, 8, 0, Math.PI * 2); g.moveTo(19, 8); g.arc(11, 8, 8, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-11, 8); g.lineTo(-2, -8); g.lineTo(8, -8); g.lineTo(11, 8); g.moveTo(-2, -8); g.lineTo(2, 8); g.stroke();
    },
    install: (g) => {
      g.fillStyle = '#7fd4e8'; g.beginPath();
      g.moveTo(0, -20); g.lineTo(17, -12); g.lineTo(17, 6); g.lineTo(0, 20); g.lineTo(-17, 6); g.lineTo(-17, -12); g.closePath(); g.fill();
      g.fillStyle = INK; g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        g.lineTo(Math.cos(a + Math.PI / 5) * 3.4, Math.sin(a + Math.PI / 5) * 3.4);
      }
      g.closePath(); g.fill();
    },
    'aircraft-mil': (g) => {
      // Olive-gold airframe silhouette (no approved art exists for military aircraft).
      g.fillStyle = '#b5b37a'; g.strokeStyle = INK; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(0, -24); g.lineTo(4, -8); g.lineTo(22, 2); g.lineTo(22, 7); g.lineTo(4, 2); g.lineTo(3, 16);
      g.lineTo(9, 21); g.lineTo(9, 24); g.lineTo(0, 21); g.lineTo(-9, 24); g.lineTo(-9, 21); g.lineTo(-3, 16); g.lineTo(-4, 2);
      g.lineTo(-22, 7); g.lineTo(-22, 2); g.lineTo(-4, -8); g.closePath(); g.fill(); g.stroke();
    },
    bhote: (g) => {
      // Flood marker: a gold-rimmed water drop with wave lines (not a rocket).
      g.fillStyle = '#38bdf8'; g.strokeStyle = GOLD; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(14, -4, 16, 6, 0, 20); g.bezierCurveTo(-16, 6, -14, -4, 0, -22); g.fill(); g.stroke();
      g.strokeStyle = '#e0f2fe'; g.lineWidth = 2;
      for (const y of [2, 9]) { g.beginPath(); g.moveTo(-8, y); g.quadraticCurveTo(-4, y - 3, 0, y); g.quadraticCurveTo(4, y + 3, 8, y); g.stroke(); }
    },
    wind: (g) => {
      g.fillStyle = GOLD;
      g.beginPath(); g.moveTo(0, -22); g.lineTo(9, -6); g.lineTo(3.6, -6); g.lineTo(3.6, 20); g.lineTo(-3.6, 20); g.lineTo(-3.6, -6); g.lineTo(-9, -6); g.closePath(); g.fill();
    },
  };
  for (const [name, draw] of Object.entries(defs)) {
    try { map.addImage(name, await glyphImage(draw), { pixelRatio: 2 }); }
    catch (e) { console.error('glyph', name, e.message); }
  }
}

/* ---------------- live dispatch -------------------------------------- */
const defLayers = new Map();   // def.id -> [maplibre layer ids]
const refreshTimers = new Map();

function trackLayers(def, ids) { defLayers.set(def.id, ids); }

function viewBox() {
  const c = map.getCenter();
  return { west: c.lng - 2.5, east: c.lng + 2.5, south: c.lat - 2.5, north: c.lat + 2.5 };
}

async function addFeedPoints(def) {
  const loader = def.feed === 'bhote' ? feeds.bhotePlaces
    : def.feed === 'wind' ? feeds.windArrows
    : feeds[def.feed];
  const result = def.feed === 'installations' ? await feeds.installations(viewBox()) : await loader();
  const fcObj = result.features || result;
  const n = fcObj.features ? fcObj.features.length : 0;
  // Overpass can be unconfigured upstream; the old app then falls back to the
  // mapped military landuse in the OpenMapTiles vector source — draw exactly
  // that class so the installations layer is never simply absent.
  if (def.feed === 'installations' && !n) {
    map.addLayer({ id: def.id + '-mil', type: 'fill', source: 'roads', 'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'military'],
      paint: { 'fill-color': '#67e8f9', 'fill-opacity': 0.25, 'fill-outline-color': '#22d3ee' } });
    map.addLayer({ id: def.id + '-mil-labels', type: 'symbol', source: 'roads', 'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'military'], minzoom: 8,
      layout: { 'text-field': ['coalesce', ['get', 'name'], ''], 'text-size': 10, 'text-font': ['Noto Sans Regular'], 'text-optional': true },
      paint: { 'text-color': '#c8f4ff', 'text-halo-color': '#0b1420', 'text-halo-width': 1.2 } });
    trackLayers(def, [def.id + '-mil', def.id + '-mil-labels']);
    pickLayers.set(def.id + '-mil', def.id);
    setCount(def, 'landuse tiles');
    stats[def.id] = { features: 'military landuse tiles', enabled: true, note: result.note || 'tile fallback' };
    say(def.name + ': mapped military landuse (Overpass unavailable)');
    return;
  }
  stats[def.id] = { features: result.raw ?? n, enabled: true, shown: result.shown ?? n };
  setCount(def, feedCountLabel(def, result));
  if (!n) { stats[def.id].note = result.note || 'no rows'; setCount(def, result.note ? 'unavailable' : 0); return; }
  const srcId = def.id;
  map.addSource(srcId, { type: 'geojson', data: fcObj, cluster: def.feed !== 'wind', clusterRadius: (def.feed === 'cctv' || def.feed === 'radio') ? 30 : 42, clusterMaxZoom: 8 });
  const ids = [];
  if (def.feed === 'wind') {
    map.addLayer({ id: def.id + '-icons', type: 'symbol', source: srcId, minzoom: 2, maxzoom: 11,
      layout: { 'icon-image': 'wind', 'icon-size': 0.3, 'icon-rotate': ['get', 'rotate'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true } });
    ids.push(def.id + '-icons');
  } else {
    map.addLayer({ id: def.id + '-clusters', type: 'circle', source: srcId, filter: ['has', 'point_count'],
      paint: { 'circle-color': chipColor, 'circle-radius': chipRadius, 'circle-stroke-width': 1.6, 'circle-stroke-color': '#fff3d0' } });
    map.addLayer({ id: def.id + '-counts', type: 'symbol', source: srcId, filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12, 'text-font': ['Noto Sans Regular'] },
      paint: { 'text-color': '#fffdf5', 'text-halo-color': '#3a2600', 'text-halo-width': 0.8 } });
    map.addLayer({ id: def.id + '-icons', type: 'symbol', source: srcId, filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': ['get', '_icon'], 'icon-size': def.feed === 'satellites' ? 0.4 : 0.5, 'icon-allow-overlap': true } });
    map.addLayer({ id: def.id + '-labels', type: 'symbol', source: srcId, filter: ['!', ['has', 'point_count']], minzoom: 8,
      layout: { 'text-field': ['coalesce', ['get', 'name'], ''], 'text-size': 10, 'text-font': ['Noto Sans Regular'],
        'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 3, 'text-optional': true },
      paint: { 'text-color': '#f4f8fb', 'text-halo-color': '#0b1420', 'text-halo-width': 1.3 } });
    ids.push(def.id + '-clusters', def.id + '-counts', def.id + '-icons', def.id + '-labels');
  }
  trackLayers(def, ids);
  say(def.name + ': ' + n.toLocaleString() + ' live');
}

async function addAlprVector(def) {
  const ids = [];
  for (const country of ['us', 'ca']) {
    try {
      const tj = await (await fetch('https://tiles.dontgetflocked.com/cameras-' + country + '-hourly.json')).json();
      const srcId = 'alpr-' + country;
      map.addSource(srcId, { type: 'vector', tiles: tj.tiles, minzoom: tj.minzoom || 0, maxzoom: tj.maxzoom || 14 });
      const vlayer = tj.vector_layers?.[0]?.id || 'cameras';
      map.addLayer({ id: def.id + '-' + country, type: 'symbol', source: srcId, 'source-layer': vlayer,
        layout: { 'icon-image': 'cctv', 'icon-size': 0.38, 'icon-allow-overlap': true } });
      ids.push(def.id + '-' + country);
      pickLayers.set(def.id + '-' + country, def.id);
    } catch (e) { console.error('alpr', country, e.message); }
  }
  trackLayers(def, ids);
  stats[def.id] = { features: 'vector tiles', enabled: true };
  setCount(def, ids.length ? 'vector tiles' : 'unavailable');
}

async function addCables(def) {
  const key = def.id === 'submarine-cables' ? 'cables' : 'cable-landings';
  const entry = manifest.data[key];
  if (!entry) { stats[def.id] = { error: 'not in manifest' }; return; }
  const data = await (await fetch(assetUrl(entry.file))).json();
  const isLines = key === 'cables';
  map.addSource(def.id, { type: 'geojson', data });
  map.addLayer(isLines ? {
    id: def.id, type: 'line', source: def.id,
    paint: { 'line-color': def.color, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 6, 1.6], 'line-opacity': 0.75 },
  } : {
    id: def.id, type: 'circle', source: def.id,
    paint: { 'circle-color': def.color, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 6, 3.4], 'circle-stroke-width': 0.8, 'circle-stroke-color': '#0b1420' },
  });
  trackLayers(def, [def.id]);
  pickLayers.set(def.id, def.id);
  stats[def.id] = { features: entry.features ?? (data.features ? data.features.length : 0), enabled: true };
  setCount(def, stats[def.id].features);
  say(def.name + ': ' + (entry.features ?? 0).toLocaleString());
}

/* ---------------- helpers for the added layers ----------------------- */
function clusteredPoints(def, srcId, fcObj, { radius = 40, maxZoom = 8, iconSize = 0.5, rotate = false, labels = true } = {}) {
  map.addSource(srcId, { type: 'geojson', data: fcObj, cluster: true, clusterRadius: radius, clusterMaxZoom: maxZoom });
  map.addLayer({ id: def.id + '-clusters', type: 'circle', source: srcId, filter: ['has', 'point_count'],
    paint: { 'circle-color': chipColor, 'circle-radius': chipRadius, 'circle-stroke-width': 1.6, 'circle-stroke-color': '#fff3d0' } });
  map.addLayer({ id: def.id + '-counts', type: 'symbol', source: srcId, filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': ['interpolate', ['linear'], ['zoom'], 0.8, 7, 3, 9, 6, 11, 9, 12],
      'text-font': ['Noto Sans Regular'], 'text-allow-overlap': true },
    paint: { 'text-color': '#fffdf5', 'text-halo-color': '#3a2600', 'text-halo-width': 0.8 } });
  const layout = { 'icon-image': ['coalesce', ['get', '_icon'], def.kind], 'icon-allow-overlap': true,
    'icon-size': typeof iconSize === 'number' ? ['interpolate', ['linear'], ['zoom'], 0.8, iconSize * 0.35, 6, iconSize * 0.8, 10, iconSize] : iconSize };
  if (rotate) { layout['icon-rotate'] = ['coalesce', ['get', 'rotate'], 0]; layout['icon-rotation-alignment'] = 'map'; }
  map.addLayer({ id: def.id + '-icons', type: 'symbol', source: srcId, filter: ['!', ['has', 'point_count']], layout });
  const ids = [def.id + '-clusters', def.id + '-counts', def.id + '-icons'];
  if (labels) {
    map.addLayer({ id: def.id + '-labels', type: 'symbol', source: srcId, filter: ['!', ['has', 'point_count']], minzoom: 8,
      layout: { 'text-field': ['coalesce', ['get', 'name'], ''], 'text-size': 10, 'text-font': ['Noto Sans Regular'],
        'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 3, 'text-optional': true },
      paint: { 'text-color': '#f4f8fb', 'text-halo-color': '#0b1420', 'text-halo-width': 1.3 } });
    ids.push(def.id + '-labels');
  }
  return ids;
}
/* Every count shown in the panel is the feature count the layer just drew,
 * stamped with the time it arrived (row tooltip + the gold "Live now" block). */
const countMeta = new Map();
function setCount(def, value) {
  const at = Date.now();
  countMeta.set(def.id, { value, at });
  const ct = document.getElementById('ct-' + def.id);
  if (ct) {
    ct.textContent = typeof value === 'number' ? value.toLocaleString() : String(value);
    ct.title = `${def.name}\nupdated ${new Date(at).toLocaleTimeString()}${def.refreshSec ? ` · refreshes every ${def.refreshSec >= 60 ? Math.round(def.refreshSec / 60) + ' min' : def.refreshSec + ' s'}` : ''}`;
  }
  if (def.id === 'live-satellites') { const el = document.getElementById('cg-sat-count'); if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : String(value); }
}
function every(def, sec, fn) {
  if (refreshTimers.has(def.id)) return;
  refreshTimers.set(def.id, setInterval(() => { if (stats[def.id]?.enabled !== false && !document.hidden) fn().catch(() => { /* transient */ }); }, sec * 1000));
}
const isoDay = (lagDays) => new Date(Date.now() - lagDays * 86400000).toISOString().slice(0, 10);

/* Weather: the proxy serves EPSG:4326 frames, drawn here as image tiles of
 * its own geographic tiling (/api/weather/tile, level 3 = 22.5 degree squares)
 * instead of web-mercator tiles, which would land in the wrong place. The
 * proxy only accepts 2:1 detail windows, so the old full-width strips were
 * refused (HTTP 400) - square geographic tiles are what it serves. Tiles stop
 * at 67.5 degrees: the map's globe cannot place images past ~85 degrees. */
const weatherState = new Map();
const WEATHER_Z = 3;
function weatherStrips(bounds) {
  const span = 180 / 2 ** WEATHER_Z;
  const out = [];
  for (let y = 0; y < 2 ** WEATHER_Z; y++) {
    const north = 90 - y * span, south = north - span;
    if (north > 67.5 + 1e-9 || south < -67.5 - 1e-9) continue;
    if (south >= bounds.north || north <= bounds.south) continue;
    for (let x = 0; x < 2 ** (WEATHER_Z + 1); x++) {
      const west = -180 + x * span, east = west + span;
      if (west >= bounds.east || east <= bounds.west) continue;
      out.push({ west, east, south, north, z: WEATHER_Z, x, y });
    }
  }
  return out;
}
function weatherImageUrl(product, time, b) {
  return '/api/weather/tile?product=' + product + '&time=' + encodeURIComponent(time) +
    '&z=' + b.z + '&x=' + b.x + '&y=' + b.y + '&size=256';
}
function setWeatherTime(def, time) {
  const st = weatherState.get(def.id);
  if (!st) return;
  st.time = time;
  st.strips.forEach((b, i) => {
    map.getSource(`${def.id}-s${i}`)?.updateImage({ url: weatherImageUrl(st.product, time, b),
      coordinates: [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]] });
  });
  setCount(def, String(time).slice(5, 16).replace('T', ' '));
  const lab = document.getElementById('wt-' + def.id);
  if (lab) lab.textContent = String(time).replace('T', ' ').slice(0, 16) + ' UTC';
}
async function addWeatherStrips(def) {
  const product = def.feed === 'satellite-imagery' ? 'clouds' : def.feed;
  const mj = await (await fetch('/api/weather/manifest?product=' + product)).json();
  const times = Array.isArray(mj.times) ? mj.times : [];
  const time = mj.latest || mj.time || times[times.length - 1];
  if (!time || !mj.bounds) throw new Error(mj.reason || 'no frame in weather manifest');
  const strips = weatherStrips(mj.bounds);
  const ids = [];
  strips.forEach((b, i) => {
    const sid = `${def.id}-s${i}`;
    map.addSource(sid, { type: 'image', url: weatherImageUrl(product, time, b),
      coordinates: [[b.west, b.north], [b.east, b.north], [b.east, b.south], [b.west, b.south]] });
    map.addLayer({ id: sid, type: 'raster', source: sid, paint: { 'raster-opacity': product === 'radar' ? 0.72 : 0.58, 'raster-fade-duration': 0 } });
    ids.push(sid);
  });
  trackLayers(def, ids);
  weatherState.set(def.id, { product, strips, times, time });
  stats[def.id] = { features: String(time).slice(0, 16), enabled: true, note: mj.coverage || '' };
  setCount(def, String(time).slice(5, 16).replace('T', ' '));
  addTimeSlider(def, times, time);
  every(def, def.refreshSec || 300, async () => {
    const m2 = await (await fetch('/api/weather/manifest?product=' + product)).json();
    const st = weatherState.get(def.id);
    if (!st || !Array.isArray(m2.times)) return;
    const wasLatest = st.time === st.times[st.times.length - 1];
    st.times = m2.times;
    updateTimeSlider(def, m2.times, wasLatest ? m2.times[m2.times.length - 1] : st.time);
    if (wasLatest) setWeatherTime(def, m2.times[m2.times.length - 1]);
  });
}
function addTimeSlider(def, times, time) {
  const row = document.getElementById('row-' + def.id);
  if (!row || !times.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'tslider';
  wrap.id = 'ts-' + def.id;
  const input = document.createElement('input');
  input.type = 'range'; input.min = '0'; input.max = String(times.length - 1); input.step = '1';
  input.value = String(Math.max(0, times.indexOf(time)));
  const lab = document.createElement('span');
  lab.id = 'wt-' + def.id;
  lab.textContent = String(time).replace('T', ' ').slice(0, 16) + ' UTC';
  input.addEventListener('input', () => {
    const st = weatherState.get(def.id);
    if (st) setWeatherTime(def, st.times[Number(input.value)]);
  });
  wrap.append(input, lab);
  row.after(wrap);
}
function updateTimeSlider(def, times, time) {
  const input = document.querySelector('#ts-' + def.id + ' input');
  if (!input) return;
  input.max = String(times.length - 1);
  input.value = String(Math.max(0, times.indexOf(time)));
}

async function addGibs(def) {
  const g = GIBS[def.gibs] || GIBS.MODIS;
  const day = isoDay(g.lagDays);
  map.addSource(def.id, { type: 'raster', tileSize: 256, maxzoom: g.level,
    tiles: ['a', 'b', 'c'].map((sub) => `https://gibs-${sub}.earthdata.nasa.gov/wmts/epsg3857/best/${g.layer}/default/${day}/GoogleMapsCompatible_Level${g.level}/{z}/{y}/{x}.${g.fmt}`),
    attribution: 'NASA GIBS' });
  map.addLayer({ id: def.id, type: 'raster', source: def.id, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 250 } });
  trackLayers(def, [def.id]);
  stats[def.id] = { features: day, enabled: true, note: def.gibs === 'S30' || def.gibs === 'L30' ? 'tiles only where an overpass imaged that day' : '' };
  setCount(def, day);
}

async function addTraffic(def) {
  /* The Cesium traffic layer falls back to OpenFreeMap road classes when no
   * TomTom key is configured; this is that fallback - road class only, NOT
   * live congestion. */
  let hasKey = false;
  try { hasKey = !!(await (await fetch('/api/tomtom/status')).json()).hasKey; } catch { /* status down */ }
  const ids = [];
  map.addLayer({ id: def.id + '-roads', type: 'line', source: 'roads', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
    paint: { 'line-color': ['match', ['get', 'class'], 'motorway', '#ff5d73', 'trunk', '#ff8a5b', 'primary', '#ffc15b', 'secondary', '#ffe08a', '#d9f99d'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 10, 2.2, 15, 5], 'line-opacity': 0.85 } });
  ids.push(def.id + '-roads');
  pickLayers.set(def.id + '-roads', def.id);
  trackLayers(def, ids);
  stats[def.id] = { features: hasKey ? 'road classes (TomTom key present)' : 'road classes - no live flow', enabled: true };
  setCount(def, hasKey ? 'classes' : 'no flow');
}

async function addSatellites(def, dense) {
  const r = dense ? await feeds.satellitesDense() : await feeds.satellitesCore();
  map.addSource(def.id, { type: 'geojson', data: r.features });
  if (dense) {
    map.addLayer({ id: def.id + '-dots', type: 'circle', source: def.id,
      paint: { 'circle-color': '#54697f', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 6, 2], 'circle-opacity': 0.8 } });
    trackLayers(def, [def.id + '-dots']);
    pickLayers.set(def.id + '-dots', def.id);
  } else {
    // Class-coloured points with Cesium's POINT_STYLES sizes (ISS 14 px red,
    // stations 9 px, others 7 px); the approved satellite icon from zoom 4.
    map.addLayer({ id: def.id + '-dots', type: 'circle', source: def.id,
      paint: { 'circle-color': ['get', '_color'], 'circle-radius': ['/', ['coalesce', ['get', '_size'], 7], 2],
        'circle-stroke-color': 'rgba(255,255,255,0.3)', 'circle-stroke-width': ['case', ['==', ['get', '_iss'], 1], 2, 0] } });
    map.addLayer({ id: def.id + '-icons', type: 'symbol', source: def.id, minzoom: 4,
      layout: { 'icon-image': 'satellite', 'icon-allow-overlap': true, 'icon-size': ['interpolate', ['linear'], ['zoom'], 4, 0.2, 8, 0.32] } });
    map.addLayer({ id: def.id + '-iss', type: 'symbol', source: def.id, filter: ['==', ['get', '_iss'], 1],
      layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-allow-overlap': true },
      paint: { 'text-color': '#ffb4b4', 'text-halo-color': '#0b1420', 'text-halo-width': 1.4 } });
    pickLayers.set(def.id + '-dots', def.id);
    map.addLayer({ id: def.id + '-labels', type: 'symbol', source: def.id, minzoom: 5,
      filter: ['in', ['get', 'group'], ['literal', ['stations', 'gps-ops', 'galileo', 'glonass']]],
      layout: { 'text-field': ['get', 'name'], 'text-size': 9.5, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': '#e2e8f0', 'text-halo-color': '#0b1420', 'text-halo-width': 1.2 } });
    trackLayers(def, [def.id + '-dots', def.id + '-icons', def.id + '-iss', def.id + '-labels']);
  }
  stats[def.id] = { features: r.raw, enabled: true, perGroup: r.perGroup || null };
  setCount(def, r.raw);
  // Move the dots: re-propagate the cached elements (no network).
  const tickSec = dense ? 15 : 3;
  refreshTimers.set(def.id + ':tick', setInterval(() => {
    if (stats[def.id]?.enabled === false || liveTicksPaused()) return;
    const next = dense ? feeds.satellitesDenseTick() : feeds.satellitesCoreTick();
    if (next) map.getSource(def.id)?.setData(next);
  }, tickSec * 1000));
}

async function addLines(def, fcObj, color, width = 1.6, dash = null) {
  map.addSource(def.id, { type: 'geojson', data: fcObj });
  const paint = { 'line-color': color, 'line-width': width, 'line-opacity': 0.85 };
  if (dash) paint['line-dasharray'] = dash;
  map.addLayer({ id: def.id + '-lines', type: 'line', source: def.id, paint });
  pickLayers.set(def.id + '-lines', def.id);
  return [def.id + '-lines'];
}

/* Gurdwaras from OpenStreetMap (amenity=place_of_worship + religion=sikh)
 * through the app's own bounded, cached /api/overpass proxy, for the area in
 * view. Langar is served at gurdwaras widely; times/24-7 status come only
 * from the OSM tags and are otherwise 'Not reported'. Plain gold dots - no
 * symbol is drawn or altered. */
const gurdwaraCache = new Map();
let gurdwaraSource = 'app Overpass proxy';
let overpassConfigured = null;
async function addGurdwaras(def) {
  const EMPTY = { type: 'FeatureCollection', features: [] };
  map.addSource(def.id, { type: 'geojson', data: EMPTY });
  map.addLayer({ id: def.id + '-dots', type: 'circle', source: def.id,
    paint: { 'circle-color': '#ffb703', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 14, 7], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff6d8' } });
  map.addLayer({ id: def.id + '-labels', type: 'symbol', source: def.id, minzoom: 10,
    layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
    paint: { 'text-color': '#ffe8b0', 'text-halo-color': '#0b1420', 'text-halo-width': 1.3 } });
  pickLayers.set(def.id + '-dots', def.id);
  trackLayers(def, [def.id + '-dots', def.id + '-labels']);
  stats[def.id] = { features: 0, enabled: true };
  const refresh = async () => {
    if (stats[def.id]?.enabled === false) return;
    if (map.getZoom() < 7) { setCount(def, 'zoom in (7+)'); return; }
    const c = map.getCenter(); const bd = map.getBounds();
    const half = 5; // the proxy refuses boxes over 12 degrees
    const s0 = Math.max(bd.getSouth(), c.lat - half), n0 = Math.min(bd.getNorth(), c.lat + half);
    const w0 = Math.max(bd.getWest(), c.lng - half), e0 = Math.min(bd.getEast(), c.lng + half);
    // rounded to 0.5 degree so small pans reuse the same answer
    const box = [Math.floor(s0 * 2) / 2, Math.floor(w0 * 2) / 2, Math.ceil(n0 * 2) / 2, Math.ceil(e0 * 2) / 2].map((v) => v.toFixed(1)).join(',');
    const q = `[out:json][timeout:25];nwr["amenity"="place_of_worship"]["religion"="sikh"](${box});out center 500;`;
    let j = gurdwaraCache.get(box);
    if (!j) {
      const body = new URLSearchParams({ data: q });
      const hdr = { 'Content-Type': 'application/x-www-form-urlencoded' };
      if (overpassConfigured === null) {
        try { overpassConfigured = !!(await (await fetch('/api/overpass/status')).json()).configured; } catch { overpassConfigured = false; }
      }
      /* When this server has no Overpass upstream configured (OVERPASS_UPSTREAMS)
       * ask the public Overpass API directly - one bounded query per view. */
      gurdwaraSource = overpassConfigured ? 'app Overpass proxy' : 'overpass-api.de (public)';
      const r = overpassConfigured
        ? await fetch('/api/overpass', { method: 'POST', headers: hdr, body })
        : await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: hdr, body });
      if (!r.ok) throw new Error('Overpass ' + r.status);
      j = await r.json();
      gurdwaraCache.set(box, j);
      if (gurdwaraCache.size > 40) gurdwaraCache.delete(gurdwaraCache.keys().next().value);
    }
    const features = [];
    for (const el of j.elements || []) {
      const lon = el.lon ?? el.center?.lon, lat = el.lat ?? el.center?.lat;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const t = el.tags || {};
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: {
        name: t['name:en'] || t.name || 'Gurdwara (name not reported)',
        name_local: t.name || 'Not reported',
        langar: t.langar || t['langar:hours'] || 'Not reported',
        opening_hours: t.opening_hours || 'Not reported',
        website: t.website || t['contact:website'] || 'Not reported',
        source: `OpenStreetMap contributors via ${gurdwaraSource}`, osm: `${el.type}/${el.id}`,
      } });
    }
    map.getSource(def.id)?.setData({ type: 'FeatureCollection', features });
    stats[def.id] = { ...stats[def.id], features: features.length };
    setCount(def, features.length ? features.length : '0 in view');
  };
  await refresh();
  let t = 0;
  map.on('moveend', () => { clearTimeout(t); t = setTimeout(() => refresh().catch((e) => setCount(def, errorLabel(def, e))), 1500); });
  loaded.set(def.id, true);
}

/* ------------------------------------------------------------------ */
/* Sri Harmandir Sahib - gold landmark + simplified 3D form            */
/* ------------------------------------------------------------------ */
/* Footprints are the real OpenStreetMap outlines (ODbL, © OpenStreetMap
 * contributors): sanctum way/705233057, the island walk way/705233963,
 * the causeway (pier) way/1314884411 towards Darshani Deori, and the
 * sarovar "Amritsaras" relation/1460839. The upper tiers and domes are a
 * simplified, respectful representation; heights are drawn tall on purpose
 * so the landmark reads above everything around it - they are not survey
 * heights. Over the photoreal Google tiles the water and causeway become
 * thin gold outlines so the real complex is not covered. */
const HARMANDIR = { lon: 74.8765281, lat: 31.6199787 }; // OSM way/705233057 centroid
const HM_SANCTUM = [[74.87662, 31.619899], [74.876552, 31.619887], [74.876411, 31.619966], [74.876452, 31.62002], [74.876492, 31.620071], [74.876634, 31.619991], [74.876644, 31.61993], [74.87662, 31.619899]];
const HM_ISLAND = [[74.876357, 31.619954], [74.876545, 31.619851], [74.87664, 31.619864], [74.876683, 31.61992], [74.876662, 31.620004], [74.876482, 31.620101], [74.876445, 31.620058], [74.876404, 31.62001], [74.876357, 31.619954]];
const HM_CAUSEWAY = [[74.875945, 31.620352], [74.875903, 31.620302], [74.876404, 31.62001], [74.876445, 31.620058], [74.875945, 31.620352]];
const HM_SAROVAR = [[74.877191, 31.619606], [74.876736, 31.61906], [74.876695, 31.619086], [74.876715, 31.619112], [74.876469, 31.619246], [74.876445, 31.619214], [74.875383, 31.61978], [74.875782, 31.620271], [74.875847, 31.620235], [74.875903, 31.620302], [74.875945, 31.620352], [74.87601, 31.620429], [74.875945, 31.620475], [74.8763, 31.620898], [74.877364, 31.620338], [74.877341, 31.620305], [74.877579, 31.620185], [74.877612, 31.620232], [74.877679, 31.620193], [74.877381, 31.619827], [74.877324, 31.619861], [74.877183, 31.619693], [74.877137, 31.61964], [74.877191, 31.619606]];
const HM_CARD = {
  name: 'Sri Harmandir Sahib (Golden Temple), Amritsar',
  langar: 'Langar - the free community kitchen - is served here 24/7.',
  location: '31.61998 N, 74.87653 E (OpenStreetMap way/705233057)',
  model: 'Simplified 3D form on the real OpenStreetMap footprints; tiers and domes are representational, not survey heights.',
  more: '/info.html',
  source: '© OpenStreetMap contributors (ODbL)',
};
function hmScaleRing(ring, k, c = HARMANDIR) {
  return ring.map(([x, y]) => [c.lon + (x - c.lon) * k, c.lat + (y - c.lat) * k]);
}
function hmCircle(c, rM, n = 20) {
  const dLat = rM / 111320, dLon = rM / (111320 * Math.cos(c.lat * Math.PI / 180));
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * 2 * Math.PI; out.push([c.lon + Math.cos(a) * dLon, c.lat + Math.sin(a) * dLat]); }
  return out;
}
function hmFeatures() {
  const poly = (ring, props) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: Array.isArray(ring[0][0]) ? ring : [ring] }, properties: { ...HM_CARD, ...props } });
  const f = [];
  f.push(poly([HM_SAROVAR, HM_ISLAND.slice().reverse()], { part: 'sarovar' }));
  f.push(poly(HM_CAUSEWAY, { part: 'causeway', base: 0, top: 2.5, color: '#f4ecd8' }));
  f.push(poly(HM_ISLAND, { part: 'island', base: 0, top: 2.5, color: '#f4ecd8' }));
  // Sanctum: gold lower storey on the true footprint, a smaller upper storey,
  // the central dome in narrowing rings with a finial, four corner kiosks.
  f.push(poly(HM_SANCTUM, { part: 'sanctum', base: 2.5, top: 20, color: '#f2b51d' }));
  f.push(poly(hmScaleRing(HM_SANCTUM, 0.72), { part: 'upper', base: 20, top: 30, color: '#f7c33a' }));
  const domeR = [[5.2, 30, 34], [4.6, 34, 37], [3.6, 37, 39.5], [2.4, 39.5, 41.5], [1.2, 41.5, 43], [0.45, 43, 49]];
  for (const [r, b, t] of domeR) f.push(poly(hmCircle(HARMANDIR, r), { part: 'dome', base: b, top: t, color: '#ffd04d' }));
  const up = hmScaleRing(HM_SANCTUM, 0.62);
  for (const i of [0, 2, 4, 5]) {
    const c = { lon: up[i][0], lat: up[i][1] };
    f.push(poly(hmCircle(c, 1.3, 12), { part: 'kiosk', base: 30, top: 34, color: '#ffd04d' }));
    f.push(poly(hmCircle(c, 0.6, 10), { part: 'kiosk', base: 34, top: 36.5, color: '#ffd04d' }));
  }
  return { type: 'FeatureCollection', features: f };
}
let hmOverPhotoreal = false;
/* Called when the photoreal tiles take over (true) or step aside (false). */
function harmandirPhotoreal(on) {
  hmOverPhotoreal = !!on;
  if (!map.getLayer('harmandir-3d-water')) return;
  try {
    map.setPaintProperty('harmandir-3d-water', 'fill-opacity', on ? 0 : 0.55);
    map.setPaintProperty('harmandir-3d-walk', 'fill-extrusion-opacity', on ? 0 : 0.95);
    map.setPaintProperty('harmandir-3d-gold', 'fill-extrusion-opacity', on ? 0.82 : 0.96);
    map.setPaintProperty('harmandir-3d-outline', 'line-opacity', on ? 0.9 : 0.6);
  } catch { /* style not ready */ }
}
window.__harmandir = () => ({ layers: ['harmandir-3d-glow', 'harmandir-3d-dot', 'harmandir-3d-gold'].map((id) => !!map.getLayer(id)), overPhotoreal: hmOverPhotoreal, at: HARMANDIR });
async function addHarmandir(def) {
  const id = def.id;
  map.addSource(id, { type: 'geojson', data: hmFeatures() });
  map.addSource(id + '-pt', { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [HARMANDIR.lon, HARMANDIR.lat] }, properties: { ...HM_CARD } }] } });
  const Z3D = 14.6; // 3D form fades in from here; the marker hands over by z16.5
  map.addLayer({ id: id + '-water', type: 'fill', source: id, filter: ['==', ['get', 'part'], 'sarovar'], minzoom: Z3D,
    paint: { 'fill-color': '#3a7fa8', 'fill-opacity': 0.55 } });
  map.addLayer({ id: id + '-outline', type: 'line', source: id, filter: ['in', ['get', 'part'], ['literal', ['sarovar', 'causeway', 'island']]], minzoom: Z3D,
    paint: { 'line-color': '#ffd166', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.2, 19, 3], 'line-opacity': 0.6, 'line-blur': 0.6 } });
  map.addLayer({ id: id + '-walk', type: 'fill-extrusion', source: id, filter: ['in', ['get', 'part'], ['literal', ['causeway', 'island']]], minzoom: Z3D,
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-opacity': 0.95 } });
  map.addLayer({ id: id + '-gold', type: 'fill-extrusion', source: id, filter: ['in', ['get', 'part'], ['literal', ['sanctum', 'upper', 'dome', 'kiosk']]], minzoom: Z3D,
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'],
      'fill-extrusion-opacity': 0.96, 'fill-extrusion-vertical-gradient': true } });
  // Landmark marker: larger than any other marker, glowing gold, at every zoom
  // until the 3D form takes over.
  const fade = (a) => ['interpolate', ['linear'], ['zoom'], 15, a, 16.5, 0];
  map.addLayer({ id: id + '-glow', type: 'circle', source: id + '-pt', maxzoom: 16.5,
    paint: { 'circle-color': '#ffc83d', 'circle-blur': 1, 'circle-opacity': fade(0.55),
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.9, 16, 5, 24, 10, 34, 14, 46] } });
  map.addLayer({ id: id + '-dot', type: 'circle', source: id + '-pt', maxzoom: 16.5,
    paint: { 'circle-color': '#ffd84d', 'circle-opacity': fade(1), 'circle-stroke-color': '#fff4c2', 'circle-stroke-opacity': fade(1),
      'circle-stroke-width': 2, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.9, 7, 5, 9, 10, 12, 14, 14] } });
  map.addLayer({ id: id + '-label', type: 'symbol', source: id + '-pt', minzoom: 3,
    layout: { 'text-field': 'Sri Harmandir Sahib', 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 12, 12, 15, 17, 17], 'text-offset': [0, 1.9],
      'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-font': ['Noto Sans Regular'] },
    paint: { 'text-color': '#ffe08a', 'text-halo-color': '#3a2600', 'text-halo-width': 1.6 } });
  const ids = ['-water', '-outline', '-walk', '-gold', '-glow', '-dot', '-label'].map((x) => id + x);
  trackLayers(def, ids);
  for (const x of ['-gold', '-dot', '-glow']) pickLayers.set(id + x, id);
  harmandirPhotoreal(imageryHidden);
  stats[id] = { ...stats[id], features: 1 };
  setCount(def, '1 landmark');
  loaded.set(id, true);
}

async function loadLiveLayer(def) {
  if (def.kind === 'keyed') {
    let configured = false;
    try { configured = !!(await (await fetch('/api/mapillary/status')).json()).configured; } catch { /* down */ }
    stats[def.id] = { error: configured ? 'token present - viewer not ported' : 'needs MAPILLARY token in .env', enabled: true };
    setCount(def, configured ? 'token set' : 'needs token');
    say(def.name + (configured ? ': token present; the street-level viewer is not ported yet' : ': needs a Mapillary token (.env)'), !configured);
    loaded.set(def.id, true);
    return;
  }
  try {
    if (def.feed === 'harmandir') { await addHarmandir(def); return; }
    if (def.feed === 'gurdwaras') { await addGurdwaras(def); return; }
    if (def.feed === 'earthquakes') {
      const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
      map.addSource('live-earthquakes', { type: 'geojson', data: url, cluster: true, clusterRadius: 38, clusterMaxZoom: 6 });
      map.addLayer({ id: 'live-earthquakes-clusters', type: 'circle', source: 'live-earthquakes', filter: ['has', 'point_count'],
        paint: { 'circle-color': chipColor, 'circle-radius': chipRadius, 'circle-stroke-width': 1.6, 'circle-stroke-color': '#fff3d0' } });
      map.addLayer({ id: 'live-earthquakes-counts', type: 'symbol', source: 'live-earthquakes', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': ['interpolate', ['linear'], ['zoom'], 0.8, 7, 3, 9, 6, 11], 'text-font': ['Noto Sans Regular'], 'text-allow-overlap': true },
        paint: { 'text-color': '#fffdf5', 'text-halo-color': '#3a2600', 'text-halo-width': 0.8 } });
      // M>=5.0 drawn as significant, like the Cesium layer.
      map.addLayer({ id: 'live-earthquakes-sig', type: 'circle', source: 'live-earthquakes',
        filter: ['all', ['!', ['has', 'point_count']], ['>=', ['to-number', ['coalesce', ['get', 'mag'], 0]], 5]],
        paint: { 'circle-color': 'rgba(244,114,182,0.18)', 'circle-stroke-color': '#f472b6', 'circle-stroke-width': 1.6,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 8, 6, 18, 10, 30] } });
      const magFactor = ['max', 0.55, ['min', 2.4, ['/', ['to-number', ['coalesce', ['get', 'mag'], 1]], 3]]];
      map.addLayer({ id: 'live-earthquakes-icons', type: 'symbol', source: 'live-earthquakes', filter: ['!', ['has', 'point_count']],
        layout: { 'icon-image': 'hazard-quake', 'icon-allow-overlap': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, ['*', 0.12, magFactor], 6, ['*', 0.24, magFactor], 10, ['*', 0.36, magFactor]] } });
      map.addLayer({ id: 'live-earthquakes-labels', type: 'symbol', source: 'live-earthquakes', filter: ['!', ['has', 'point_count']], minzoom: 4,
        layout: { 'text-field': ['concat', 'M', ['to-string', ['coalesce', ['get', 'mag'], '?']]], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1], 'text-anchor': 'top', 'text-optional': true },
        paint: { 'text-color': '#ffd6e8', 'text-halo-color': '#2b0716', 'text-halo-width': 1.3 } });
      trackLayers(def, ['live-earthquakes-clusters', 'live-earthquakes-counts', 'live-earthquakes-sig', 'live-earthquakes-icons', 'live-earthquakes-labels']);
      stats[def.id] = { features: 'live', enabled: true };
      fetch(url).then((r) => r.json()).then((j) => { stats[def.id].features = j.features?.length ?? 0; setCount(def, stats[def.id].features); }).catch(() => {});
      every(def, 60, async () => {
        const j = await (await fetch(url + '?t=' + Date.now())).json();
        map.getSource('live-earthquakes')?.setData(j);
        stats[def.id].features = j.features?.length ?? 0;
        setCount(def, stats[def.id].features);
      });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'flights') {
      const ids = clusteredPoints(def, 'live-flights', { type: 'FeatureCollection', features: [] }, { radius: 34, maxZoom: 6, iconSize: 0.34, rotate: true, labels: false });
      trackLayers(def, ids);
      const poll = async () => {
        try {
          const r = await fetch('/api/flights');
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const payload = await r.json();
          const features = (payload.states || [])
            .filter((row) => Number.isFinite(row[5]) && Number.isFinite(row[6]))
            .map((row) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [row[5], row[6]] },
              properties: { name: String(row[1] || row[0] || '').trim(), _icon: 'aircraft', rotate: Number.isFinite(row[10]) ? row[10] : 0,
                origin_country: row[2] || '', altitude_m: row[7] ?? '', velocity_ms: row[9] ?? '', icao24: row[0] || '' } }));
          map.getSource('live-flights')?.setData({ type: 'FeatureCollection', features });
          stats['live-flights'] = { features: features.length, enabled: stats['live-flights']?.enabled !== false };
          setCount(def, features.length);
        } catch (e) {
          stats['live-flights'] = { error: String(e.message || e), enabled: true };
          setCount(def, 'rate-limited');
        }
      };
      poll();
      refreshTimers.set(def.id, setInterval(() => { if (stats[def.id]?.enabled !== false) poll(); }, (def.refreshSec || 45) * 1000));
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'military' || def.feed === 'awareness') {
      const r = await feeds.military();
      if (def.feed === 'military') {
        trackLayers(def, clusteredPoints(def, def.id, r.features, { radius: 34, maxZoom: 6, iconSize: 0.36, rotate: true }));
      } else {
        map.addSource(def.id, { type: 'geojson', data: r.features });
        map.addLayer({ id: def.id + '-heat', type: 'heatmap', source: def.id,
          paint: { 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 14, 8, 40], 'heatmap-opacity': 0.7,
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, '#78350f', 0.5, '#d97706', 0.8, '#fbbf24', 1, '#fff7d6'] } });
        trackLayers(def, [def.id + '-heat']);
      }
      stats[def.id] = { features: r.raw, enabled: true, note: def.feed === 'awareness' ? 'derived density, not a threat assessment' : '' };
      setCount(def, r.raw);
      every(def, def.refreshSec || 30, async () => {
        const n = await feeds.military();
        map.getSource(def.id)?.setData(n.features);
        stats[def.id].features = n.raw; setCount(def, n.raw);
      });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'globalSatellites') {
      const r = await feeds.globalSatellites();
      map.addSource(def.id, { type: 'geojson', data: r.features });
      map.addLayer({ id: def.id + '-ring', type: 'circle', source: def.id,
        paint: { 'circle-radius': 13, 'circle-color': 'rgba(168,85,247,0.28)', 'circle-stroke-color': '#ffd166', 'circle-stroke-width': 2 } });
      map.addLayer({ id: def.id + '-icons', type: 'symbol', source: def.id,
        layout: { 'icon-image': 'satellite', 'icon-size': 0.34, 'icon-allow-overlap': true,
          'text-field': ['concat', '#', ['to-string', ['get', 'rank']], ' ', ['get', 'iso2']], 'text-size': 10, 'text-font': ['Noto Sans Regular'],
          'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-optional': true },
        paint: { 'text-color': '#ffe2a8', 'text-halo-color': '#120e06', 'text-halo-width': 1.4 } });
      pickLayers.set(def.id + '-ring', def.id);
      trackLayers(def, [def.id + '-ring', def.id + '-icons']);
      window.__globalSatItems = r.items;
      stats[def.id] = { features: r.raw, enabled: true, generatedAt: r.generatedAt };
      setCount(def, `${r.raw} sites`);
      every(def, def.refreshSec, async () => {
        const n = await feeds.globalSatellites();
        map.getSource(def.id)?.setData(n.features);
        window.__globalSatItems = n.items;
        setCount(def, `${n.raw} sites`);
      });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'satellites' || def.feed === 'starlink') {
      await addSatellites(def, def.feed === 'starlink');
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'orbits') {
      const r = await feeds.satelliteOrbits();
      trackLayers(def, await addLines(def, r.features, '#c7d2fe', 1.1, [2, 2]));
      stats[def.id] = { features: r.raw, enabled: true };
      setCount(def, r.raw);
      every(def, def.refreshSec, async () => { const n = await feeds.satelliteOrbits(); map.getSource(def.id)?.setData(n.features); });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'perimeters') {
      const r = await feeds.perimeterPolygons();
      map.addSource(def.id + '-poly', { type: 'geojson', data: r.polygons });
      map.addLayer({ id: def.id + '-fill', type: 'fill', source: def.id + '-poly', paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.32 } });
      map.addLayer({ id: def.id + '-outline', type: 'line', source: def.id + '-poly', paint: { 'line-color': '#ff8a80', 'line-width': 1.4 } });
      pickLayers.set(def.id + '-fill', def.id);
      const ids = [def.id + '-fill', def.id + '-outline', ...clusteredPoints(def, def.id, r.points, { radius: 30, maxZoom: 6, iconSize: 0.42 })];
      trackLayers(def, ids);
      stats[def.id] = { features: r.raw, enabled: true };
      setCount(def, r.raw);
      every(def, def.refreshSec, async () => {
        const n = await feeds.perimeterPolygons();
        map.getSource(def.id + '-poly')?.setData(n.polygons); map.getSource(def.id)?.setData(n.points);
        stats[def.id].features = n.raw; setCount(def, n.raw);
      });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'cyclones') {
      const r = await feeds.cyclonesFull();
      map.addSource(def.id + '-cone', { type: 'geojson', data: r.cones });
      map.addLayer({ id: def.id + '-cone', type: 'fill', source: def.id + '-cone', paint: { 'fill-color': '#7fe6ed', 'fill-opacity': 0.22 } });
      map.addSource(def.id + '-track', { type: 'geojson', data: r.tracks });
      map.addLayer({ id: def.id + '-track', type: 'line', source: def.id + '-track', paint: { 'line-color': '#7fe6ed', 'line-width': 2, 'line-dasharray': [2, 1.5] } });
      map.addSource(def.id + '-fc', { type: 'geojson', data: r.forecast });
      map.addLayer({ id: def.id + '-fc', type: 'circle', source: def.id + '-fc', paint: { 'circle-color': '#7fe6ed', 'circle-radius': 4, 'circle-stroke-color': '#0b1420', 'circle-stroke-width': 1 } });
      map.addSource(def.id, { type: 'geojson', data: r.centers });
      map.addLayer({ id: def.id + '-icons', type: 'symbol', source: def.id, layout: { 'icon-image': 'hazard-cyclone', 'icon-size': 0.5, 'icon-allow-overlap': true } });
      ['-cone', '-track', '-fc'].forEach((x) => pickLayers.set(def.id + x, def.id));
      trackLayers(def, [def.id + '-cone', def.id + '-track', def.id + '-fc', def.id + '-icons']);
      stats[def.id] = { features: r.raw, enabled: true, note: r.coverage };
      setCount(def, r.raw ? r.raw : '0 active');
      every(def, def.refreshSec, async () => {
        const n = await feeds.cyclonesFull();
        map.getSource(def.id + '-cone')?.setData(n.cones); map.getSource(def.id + '-track')?.setData(n.tracks);
        map.getSource(def.id + '-fc')?.setData(n.forecast); map.getSource(def.id)?.setData(n.centers);
        setCount(def, n.raw ? n.raw : '0 active');
      });
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'windlines') {
      const r = await feeds.windStreamlines();
      map.addSource(def.id, { type: 'geojson', data: r.features });
      map.addLayer({ id: def.id + '-lines', type: 'line', source: def.id,
        paint: { 'line-color': ['interpolate', ['linear'], ['get', 'speed'], 0, '#93c5fd', 6, '#a7f3d0', 12, '#fde68a', 20, '#fca5a5'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 1.4], 'line-opacity': 0.75 } });
      pickLayers.set(def.id + '-lines', def.id);
      trackLayers(def, [def.id + '-lines']);
      stats[def.id] = { features: r.raw, enabled: true, note: r.valid };
      setCount(def, r.raw);
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'bhote') {
      const r = await feeds.bhoteEvent();
      const ids = [];
      const rect = r.imagery?.rectangle;
      if (rect && r.imagery.after?.path) {
        map.addSource(def.id + '-after', { type: 'image', url: '/events/bhote-koshi-2026/' + r.imagery.after.path,
          coordinates: [[rect.west, rect.north], [rect.east, rect.north], [rect.east, rect.south], [rect.west, rect.south]] });
        map.addLayer({ id: def.id + '-after', type: 'raster', source: def.id + '-after', paint: { 'raster-opacity': 0.9 } });
        ids.push(def.id + '-after');
      }
      ids.push(...await addLines(def, r.lines, '#38bdf8', 3));
      map.addSource(def.id + '-pts', { type: 'geojson', data: r.points });
      map.addLayer({ id: def.id + '-icons', type: 'symbol', source: def.id + '-pts', layout: { 'icon-image': 'bhote', 'icon-size': 0.42, 'icon-allow-overlap': true } });
      map.addLayer({ id: def.id + '-labels', type: 'symbol', source: def.id + '-pts', minzoom: 10,
        layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-font': ['Noto Sans Regular'], 'text-offset': [0, 1], 'text-anchor': 'top', 'text-optional': true },
        paint: { 'text-color': '#fff3d6', 'text-halo-color': '#0b1420', 'text-halo-width': 1.3 } });
      ids.push(def.id + '-icons', def.id + '-labels');
      trackLayers(def, ids);
      stats[def.id] = { features: r.raw, enabled: true };
      setCount(def, r.raw);
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'bhotelocator') {
      const r = await feeds.bhoteLocator();
      const ids = await addLines(def, r.line, '#fbbf24', 2.4);
      map.addSource(def.id + '-pts', { type: 'geojson', data: r.points });
      map.addLayer({ id: def.id + '-icons', type: 'symbol', source: def.id + '-pts', layout: { 'icon-image': 'bhote', 'icon-size': 0.4, 'icon-allow-overlap': true } });
      ids.push(def.id + '-icons');
      trackLayers(def, ids);
      stats[def.id] = { features: r.raw, enabled: true };
      setCount(def, r.raw);
      loaded.set(def.id, true);
      return;
    }
    if (def.feed === 'traffic') { await addTraffic(def); loaded.set(def.id, true); return; }
    if (def.kind === 'raster') {
      if (def.feed === 'gibs') await addGibs(def);
      else await addWeatherStrips(def);
    } else if (def.feed === 'alpr') {
      await addAlprVector(def);
    } else if (def.kind === 'cables' || def.kind === 'cables-points') {
      await addCables(def);
    } else {
      await addFeedPoints(def);
    }
    if (def.refreshSec && !refreshTimers.has(def.id) && def.kind !== 'raster') {
      every(def, def.refreshSec, async () => {
        const src = map.getSource(def.id);
        if (!src?.setData) return;
        const fn = feeds[def.feed === 'wind' ? 'windArrows' : def.feed];
        if (!fn) return;
        const r = def.feed === 'installations' ? await fn(viewBox()) : await fn();
        src.setData(r.features || r);
        stats[def.id] = { ...stats[def.id], features: r.raw ?? (r.features?.features?.length ?? 0), enabled: true };
        setCount(def, feedCountLabel(def, r));
      });
    }
    loaded.set(def.id, true);
  } catch (e) {
    stats[def.id] = { error: String(e.message || e), enabled: true };
    setCount(def, errorLabel(def, e));
    say(def.name + ': ' + String(e.message || e).slice(0, 60), true);
  }
}

/* Say why a feed is empty when the server tells us (e.g. AIS needs a key). */
function errorLabel(def, e) {
  const msg = String(e?.message || e || '');
  if (/\b503\b/.test(msg) && def.feed === 'vessels') return 'needs AIS key';
  if (/\b(401|403)\b/.test(msg)) return 'key refused';
  if (/\b429\b/.test(msg)) return 'rate-limited';
  if (/\b503\b/.test(msg)) return 'not configured';
  return 'unavailable';
}
function feedCountLabel(def, r) {
  if (def.feed === 'fires' && Number.isFinite(r.shown) && r.shown !== r.raw) return `${r.shown.toLocaleString()} of ${r.raw.toLocaleString()}`;
  if (def.feed === 'transit' && Number.isFinite(r.feeds)) return `${(r.raw ?? 0).toLocaleString()} · ${r.feeds} feeds`;
  return r.raw ?? (r.features?.features?.length ?? 0);
}

const loading = new Map();
const wanted = new Map(); // def.id -> checkbox state
function applyVisibility(def) {
  const on = wanted.get(def.id) !== false;
  const ids = defLayers.get(def.id) || ['-clusters', '-counts', '-band', '-icons', '-labels'].map((x) => def.id + x);
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }
  const ts = document.getElementById('ts-' + def.id);
  if (ts) ts.style.display = on ? '' : 'none';
  if (stats[def.id]) stats[def.id].enabled = on;
}
function ensureLoaded(def) {
  if (loaded.has(def.id)) return Promise.resolve();
  if (!loading.has(def.id)) {
    const ct = document.getElementById('ct-' + def.id);
    if (ct && ['—', '', 'queued'].includes(ct.textContent)) ct.textContent = 'loading…';
    loading.set(def.id, loadLayer(def)
      .catch((e) => { stats[def.id] = { error: String(e?.message || e) }; setCount(def, 'unavailable'); })
      .finally(() => { loading.delete(def.id); applyVisibility(def); }));
  }
  return loading.get(def.id);
}
function setLayer(def, on) {
  wanted.set(def.id, on);
  applyVisibility(def);
  if (on) return ensureLoaded(def);
  return Promise.resolve();
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */
const rows = document.getElementById('rows');
const sub = document.getElementById('panel-sub');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function panelRow(def, parent = rows) {
  const row = document.createElement('label');
  row.className = 'row';
  row.id = 'row-' + def.id;
  row.dataset.layer = def.id;
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!def.on;
  cb.dataset.layer = def.id;
  cb.setAttribute('aria-label', 'Toggle ' + def.name);
  const sw = document.createElement('span');
  sw.className = def.live ? 'liveDot' : 'sw';
  sw.style.background = def.live ? '' : def.color;
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = def.name;
  const ct = document.createElement('span');
  ct.className = 'ct';
  ct.id = `ct-${def.id}`;
  ct.textContent = def.on ? 'queued' : '—';
  if (def.gold) row.classList.add('gold');
  row.append(cb, sw, nm, ct);
  parent.append(row);
  wanted.set(def.id, !!def.on);
  cb.addEventListener('change', () => setLayer(def, cb.checked));
  return row;
}

/* Defaults load one after another with a pause, so the GPU and the tile
 * workers are never handed every dataset at the same moment. */
async function loadDefaultsStaggered(defs) {
  for (const def of defs) {
    if (!def.on || wanted.get(def.id) === false) continue;
    await ensureLoaded(def);
    await sleep(700);
  }
  say('default CareGap layers loaded');
}

/* ---------------- CareGap summary + legend (slim port of caregapPanel.js) */
const SUMMARY_PATHS = {
  pop: '/src/data/local_data/hospitals/global/caregap-deserts-global-pop-core-f7fdc24e9ac2.summary.json',
  hazard: '/src/data/local_data/hospitals/global/caregap-hazard-global.summary.json',
  traveltime: '/src/data/local_data/hospitals/global/caregap-deserts-global-traveltime.summary.json',
  overture: '/src/data/local_data/hospitals/global/overture-healthcare-global-overview.summary.json',
};
async function readSummary(path) {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    const t = await r.text();
    return r.ok && t.trimStart().startsWith('{') ? JSON.parse(t) : null;
  } catch { return null; }
}
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? Number(n).toLocaleString() : 'Not reported');
const hhmm = (d = new Date()) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
/* Everything in the gold menu is read live: the model summaries are re-read
 * every SUMMARY_REFRESH_MIN (no cache), the "Live now" block re-reads the
 * running layers every LIVE_BLOCK_SEC, and each block carries its own
 * "updated" time. Nothing here is a typed-in number. */
const SUMMARY_REFRESH_MIN = 10;
const LIVE_BLOCK_SEC = 15;
const HAZARD_LIVE_MIN = 90; // same LIVE/STALE threshold as the Cesium gold menu
async function buildCaregapPanel(parent) {
  const box = document.createElement('details');
  box.id = 'caregap-summary';
  box.className = 'cg';
  box.open = true;
  box.innerHTML = `<summary>Sarbat Da Bhalla · CareGap summary</summary>
    <div class="cg-legend"><b>Access band</b> (straight-line distance to a documented POI)
      ${[['served', 'Near documented POI', '<5 km'], ['limited', 'Limited access', '5-10 km'], ['gap', 'Access gap', '10-20 km'], ['desert', 'Access desert', '>=20 km']]
        .map(([b, l, r]) => `<div><i style="background:${ACCESS_BAND_COLORS[b]}"></i>${l} <span>${r}</span></div>`).join('')}
      <b>Hazard exposure risk</b> (model estimate)
      ${[['#ff3b30', 'High'], ['#ff7a00', 'Medium'], ['#ffb300', 'Low'], ['#8bc34a', 'Low, minor source']]
        .map(([c, l]) => `<div><i style="background:${c}"></i>${l}</div>`).join('')}
    </div>
    <div class="cg-h">● Live now <span class="cg-upd" id="cg-live-upd"></span></div>
    <div class="cg-stats" id="cg-live">waiting for live layers…</div>
    <div class="cg-stats" id="cg-stats">loading summaries…</div>`;
  parent.append(box);
  renderLiveBlock();
  setInterval(() => { if (!document.hidden) renderLiveBlock(); }, LIVE_BLOCK_SEC * 1000);
  await renderCaregapStats();
  setInterval(() => { if (!document.hidden) renderCaregapStats().catch(() => {}); }, SUMMARY_REFRESH_MIN * 60000);
}

/* "Live now": counts straight from the running layers (stats[]), so they move
 * with every feed refresh. A layer that is off or failed says so. */
function renderLiveBlock() {
  const el = document.getElementById('cg-live');
  if (!el) return;
  const row = (id, label) => {
    const st = stats[id];
    const m = countMeta.get(id);
    let v;
    if (st && st.enabled === false) v = '<span class="cg-off">hidden</span>';
    else if (m && typeof m.value === 'number') v = `<b>${fmt(m.value)}</b> <span class="cg-upd">${hhmm(new Date(m.at))}</span>`;
    else if (m && m.value && m.value !== 'queued' && m.value !== '—') v = `<span class="cg-off">${esc(m.value)}</span>`;
    else if (st) v = `<b>${fmt(st.features)}</b>`;
    else v = '<span class="cg-off">off</span>';
    return `<div>${label}: ${v}</div>`;
  };
  const out = [
    row('live-satellites', '🛰️ Satellites tracked (CelesTrak core)'),
    row('live-starlink', 'Starlink (dense)'),
    row('caregap-global-satellites', 'Golden-Hour triage sites'),
    row('live-gurdwaras', 'Gurdwaras in view (langar, OSM)'),
    row('live-earthquakes', 'Earthquakes, past day (USGS)'),
    row('live-fires', 'Active fires (FIRMS, sampled)'),
    row('live-flights', 'Aircraft (OpenSky)'),
    row('live-cyclones', 'Cyclone centres (NHC)'),
  ];
  const per = stats['live-satellites']?.perGroup;
  if (per && typeof per === 'object') {
    const parts = Object.entries(per).filter(([, n]) => Number(n) > 0).map(([g, n]) => `${esc(g)} ${fmt(n)}`);
    if (parts.length) out.push(`<div class="cg-sub">by group: ${parts.join(' · ')}</div>`);
  }
  const all = [...LAYERS, ...LIVE];
  const on = all.filter((d) => stats[d.id] && stats[d.id].enabled !== false).length;
  out.push(`<div class="cg-sub">${on} of ${all.length} layers on</div>`);
  el.innerHTML = out.join('');
  const upd = document.getElementById('cg-live-upd');
  if (upd) upd.textContent = `updated ${hhmm()} · every ${LIVE_BLOCK_SEC} s`;
}
window.__renderLiveBlock = renderLiveBlock;

let lastSummaries = null;
async function renderCaregapStats() {
  const [pop, hz, tt, ov] = await Promise.all(Object.values(SUMMARY_PATHS).map(readSummary));
  lastSummaries = { pop, hz, tt, ov, at: Date.now() };
  window.__caregapSummaries = lastSummaries;
  applySummaryNames();
  const out = [];
  const nr = 'Not reported';
  out.push(`<div class="cg-h">CareGap model <span class="cg-upd">read ${hhmm()} · re-read every ${SUMMARY_REFRESH_MIN} min</span></div>`);
  if (pop) {
    const pct = Number(pop.pct_pop_in_gap_plus_desert);
    out.push(`<div>Population in gap + desert: <b>${Number.isFinite(pct) ? pct.toFixed(1) + '%' : nr}</b> of ${fmt(pop.total_pop)} (GHSL model estimate)</div>`);
    out.push(`<div>Facilities in the access model: ${fmt(pop.facilities)}</div>`);
  } else out.push(`<div>Population access model: ${nr}</div>`);
  const med = Number(tt?.motor_min?.median_pop_weighted);
  out.push(`<div>Pop-weighted median motor travel to care: ${Number.isFinite(med) ? Math.round(med) + ' min (MAP model estimate)' : nr}</div>`);
  if (ov) out.push(`<div>Overture health POIs: ${fmt(ov.total_rows)} rows, ${fmt(ov.countries)} countries (overview shows ${fmt(ov.overview_points)})</div>`);
  else out.push(`<div>Overture health POIs: ${nr}</div>`);
  if (hz) {
    const gen = Date.parse(hz.generated_at || '');
    const ageMin = Number.isFinite(gen) ? Math.max(0, Math.round((Date.now() - gen) / 60000)) : null;
    const age = ageMin === null ? `hazard model time ${nr}`
      : `${ageMin <= HAZARD_LIVE_MIN ? '<span class="cg-live">● LIVE</span>' : '<span class="cg-stale">⚠ STALE</span>'} · hazard model updated ${ageMin < 120 ? ageMin + ' min' : Math.round(ageMin / 60) + ' h'} ago`;
    out.push(`<div class="cg-warn">${esc(hz.label || 'EXPOSURE ESTIMATE - not confirmed impact.')}</div>`);
    out.push(`<div>${age}</div>`);
    out.push(`<div>Facilities in modelled exposure: ${fmt(hz.counts?.facilities_exposed)} · severity ≥0.35: ${fmt(hz.counts?.facilities_severity_ge_0_35)}</div>`);
    const areas = (hz.top_areas_025deg || []).slice(0, 5);
    if (areas.length) {
      out.push('<div class="cg-h">Top exposed corridors (0.25° cells)</div>');
      areas.forEach((a, i) => out.push(`<div class="cg-fly" data-lon="${a.cell_lon}" data-lat="${a.cell_lat}">${i + 1}. ${esc(a.main_hazard || 'hazard')} · ${esc(a.iso2 || '—')} · ${fmt(a.facilities)} facilities ›</div>`));
    }
    const quakes = (hz.quakes || []).slice(0, 3);
    if (quakes.length) {
      out.push('<div class="cg-h">Recent quake zones</div>');
      quakes.forEach((q) => out.push(`<div class="cg-fly" data-lon="${q.lon}" data-lat="${q.lat}">M${Number(q.mag).toFixed(1)} · ${esc(q.place || '')} · ${fmt(q.facilities)} facilities ›</div>`));
    }
  } else out.push(`<div>Hazard exposure model: ${nr}</div>`);
  // The gold menu's two satellite lists, as in Cesium: the Satellites layer
  // (CelesTrak core) and the Golden-Hour Triage "Global Satellites" tab.
  out.push('<div class="cg-h" id="cg-sat-h">🛰️ Satellites (two lists, as in the Cesium gold menu)</div>');
  out.push(`<div class="cg-sub">1. Satellites - CelesTrak core catalog: <b id="cg-sat-count">${fmt(stats['live-satellites']?.features)}</b> tracked now (stations, visual, GPS, GLONASS, Galileo, GEO; toggle "Satellites &amp; GNSS"). Starlink is a separate dense toggle.</div>`);
  out.push('<div class="cg-sub">2. Global Satellites - Golden-Hour Triage sites (from the hazard model run, one per country, top 12). Tap a site for the live N2YO overhead sweep:</div>');
  out.push('<div id="cg-globalsat">loading…</div>');
  out.push('<div class="cg-note">Records and feeds come from public datasets and live APIs; coverage varies by region and completeness is not reported as a percentage. Map appearance does not verify that a facility is operating, its beds, or safe access.</div>');
  out.push('<div class="cg-note">Langar - free community meals - is offered by gurdwaras widely across the countries covered, many 24/7, not only at Harmandir Sahib. Turn on \"Gurdwaras - langar\" to see gurdwaras mapped in OpenStreetMap for the area in view; langar times are shown only where OSM records them.</div>');
  out.push(`<div class="cg-credit">Sarbat Da Bhalla &amp; Global Satellite Intelligence · Done by Guru's Grace</div>`);
  const statsEl = document.getElementById('cg-stats');
  if (!statsEl) return;
  statsEl.innerHTML = out.join('');
  statsEl.querySelectorAll('.cg-fly').forEach((el) => el.addEventListener('click', () => {
    const lon = Number(el.dataset.lon), lat = Number(el.dataset.lat);
    if (Number.isFinite(lon) && Number.isFinite(lat)) map.flyTo({ center: [lon, lat], zoom: 9, pitch: 30, duration: 3500, essential: true });
  }));
  fillGlobalSatList().catch((e) => { const el = document.getElementById('cg-globalsat'); if (el) el.textContent = 'Global Satellites unavailable: ' + e.message; });
}

/* Layer names carry no typed-in totals: where a total is known it comes from
 * the summary just read, otherwise the name stays plain. */
function applySummaryNames() {
  const ov = lastSummaries?.ov;
  const setName = (id, text) => { const el = document.querySelector(`#row-${CSS.escape(id)} .nm`); if (el) el.textContent = text; };
  const ovDef = LAYERS.find((d) => d.id === 'local-overture-healthcare');
  if (ovDef) {
    ovDef.name = Number.isFinite(Number(ov?.countries)) ? `Global health POIs (Overture, ${fmt(ov.countries)} countries)` : 'Global health POIs (Overture)';
    setName(ovDef.id, ovDef.name);
  }
}

/* Golden-Hour "Global Satellites" list. Fly & inspect turns on the same layers
 * Cesium's Fly & Inspect enables (hazard, fires, perimeters, quakes,
 * satellites, health sites) and reads /api/n2yo/above for that site. */
async function fillGlobalSatList() {
  const host = document.getElementById('cg-globalsat');
  if (!host) return;
  const r = await feeds.globalSatellites();
  window.__globalSatItems = r.items;
  if (!r.items.length) { host.textContent = 'No triage sites in the current hazard model run.'; return; }
  host.innerHTML = r.items.map((it, i) => `<div class="cg-gs" data-i="${i}"><span class="cg-fly">#${it.rank} ${esc(it.name)} (${esc(it.iso2)}) · ${esc(it.hazard)} ›</span>
    <button class="cg-n2yo" data-i="${i}">Overhead now</button><div class="cg-n2yo-out" id="cg-n2yo-${i}"></div></div>`).join('');
  host.querySelectorAll('.cg-gs .cg-fly').forEach((el) => el.addEventListener('click', async () => {
    const it = r.items[Number(el.parentElement.dataset.i)];
    for (const id of ['local-caregap-hazard', 'live-fires', 'live-perimeters', 'live-earthquakes', 'live-satellites', 'local-hospitals', 'local-overture-healthcare', 'caregap-global-satellites']) {
      const cb = document.querySelector(`#row-${CSS.escape(id)} input`);
      const def = [...LAYERS, ...LIVE].find((d) => d.id === id);
      if (cb && def && !cb.checked) { cb.checked = true; setLayer(def, true); }
    }
    map.flyTo({ center: [it.lon, it.lat], zoom: 9, pitch: 35, duration: 3500, essential: true });
  }));
  host.querySelectorAll('.cg-n2yo').forEach((b) => b.addEventListener('click', async () => {
    const i = Number(b.dataset.i);
    const it = r.items[i];
    const outEl = document.getElementById('cg-n2yo-' + i);
    outEl.textContent = 'Querying N2YO…';
    try {
      outEl.innerHTML = n2yoHtml(await feeds.n2yoAbove(it.lat, it.lon));
    } catch (e) { outEl.textContent = 'N2YO unavailable: ' + e.message; }
  }));
}
function n2yoHtml(n) {
  if (!n || n.status !== 'ok') return esc(n?.reason || n?.error || 'N2YO not configured on this server');
  const lines = [`<div><b>${fmt(n.totalAbove)}</b> objects in the 45° sky cone (${n.fullCatalog ? 'full N2YO catalog' : 'named groups only'}, ${fmt(n.categoryCatalogSize)} documented categories)</div>`];
  for (const c of n.categories || []) {
    const names = (c.satellites || []).map((x) => x.name).filter(Boolean).slice(0, 4).join(', ');
    lines.push(`<div>${esc(c.category)}: ${fmt(c.count)}${names ? ` <span>(${esc(names)})</span>` : ''}</div>`);
  }
  lines.push(`<div class="cg-note">Checked ${esc(String(n.checkedAt || '').replace('T', ' ').slice(0, 16))} UTC · N2YO live overhead; an overpass is not imagery of this site.</div>`);
  return lines.join('');
}
window.__n2yoHtml = n2yoHtml;

/* ---------------- Search: coordinates, loaded layers, then places ------- */
/* 1) "lat, lon" typed directly; 2) names in the layers already loaded (no
 * network); 3) places near the view through the server's Google proxy (key
 * stays server-side), falling back to OpenStreetMap Nominatim worldwide. */
const NAME_KEYS = ['name', 'name_en', 'Name', 'NAME', 'title', 'facility', 'facility_name', 'site', 'label'];
function searchLoaded(q, limit = 8) {
  const needle = q.toLowerCase();
  const hits = [];
  for (const [id, fc] of loaded) {
    if (!fc || !Array.isArray(fc.features)) continue;
    const def = [...LAYERS, ...LIVE].find((d) => d.id === id);
    for (const f of fc.features) {
      const p = f.properties || {};
      let nm = null;
      for (const k of NAME_KEYS) if (typeof p[k] === 'string' && p[k]) { nm = p[k]; break; }
      if (!nm || !nm.toLowerCase().includes(needle)) continue;
      const c = f.geometry?.coordinates;
      if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
      hits.push({ name: nm, sub: def?.name || id, lon: c[0], lat: c[1], zoom: 14 });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
let googlePlacesOff = false; // set after the first refusal: Places is not enabled for this server's key
async function searchPlaces(q) {
  const c = map.getCenter();
  if (!googlePlacesOff) try {
    const r = await fetch(`/api/google/text-search?${new URLSearchParams({ q, lat: c.lat.toFixed(5), lon: c.lng.toFixed(5), radiusM: 50000 })}`);
    if (!r.ok) googlePlacesOff = true;
    if (r.ok) {
      const j = await r.json();
      if (j.configured === false) googlePlacesOff = true;
      const places = (j.places || []).filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude)).slice(0, 6);
      if (places.length) return places.map((p) => ({ name: p.name || p.displayName || q, sub: p.address || p.formattedAddress || 'Google Places', lon: p.longitude, lat: p.latitude, zoom: 15 }));
    }
  } catch { /* fall through to OSM */ }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'json', limit: 6 })}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return [];
    const j = await r.json();
    return (Array.isArray(j) ? j : []).map((p) => ({ name: String(p.display_name || q).split(',')[0], sub: `${p.display_name || ''} · OpenStreetMap`, lon: Number(p.lon), lat: Number(p.lat), zoom: p.type === 'country' ? 5 : 13 }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
  } catch { return []; }
}
let searchMarker = null;
function goTo(hit) {
  map.flyTo({ center: [hit.lon, hit.lat], zoom: hit.zoom || 12, duration: 3000, essential: true });
  try {
    searchMarker?.remove();
    searchMarker = new maplibregl.Marker({ color: '#ffd166' }).setLngLat([hit.lon, hit.lat]).addTo(map);
  } catch { /* marker optional */ }
  say(`${hit.name} · ${hit.lat.toFixed(4)}, ${hit.lon.toFixed(4)}`);
}
function buildSearch(parent) {
  const wrap = document.createElement('div');
  wrap.className = 'searchRow';
  wrap.innerHTML = `<input id="gev-search" type="search" placeholder="Search a place, facility or lat, lon" aria-label="Search the map" autocomplete="off">
    <div id="gev-search-out" class="searchOut" role="listbox"></div>`;
  parent.append(wrap);
  const input = wrap.querySelector('input');
  const out = wrap.querySelector('#gev-search-out');
  let seq = 0;
  const render = (hits, note) => {
    out.innerHTML = hits.map((h, i) => `<div class="searchHit" data-i="${i}" role="option"><b>${esc(h.name)}</b><span>${esc(h.sub)}</span></div>`).join('') + (note ? `<div class="searchNote">${esc(note)}</div>` : '');
    out.querySelectorAll('.searchHit').forEach((el) => el.addEventListener('click', () => { goTo(hits[Number(el.dataset.i)]); out.innerHTML = ''; }));
  };
  const run = async () => {
    const q = input.value.trim();
    const my = ++seq;
    if (q.length < 2) { out.innerHTML = ''; return; }
    const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      const lat = Number(m[1]), lon = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { render([{ name: `${lat}, ${lon}`, sub: 'coordinates (lat, lon)', lat, lon, zoom: 13 }]); return; }
    }
    const local = searchLoaded(q);
    render(local, 'searching places…');
    const places = await searchPlaces(q);
    if (my !== seq) return;
    const all = [...local, ...places];
    render(all, all.length ? '' : 'No matches in loaded layers or places.');
  };
  let t = 0;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 450); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(t); run().then(() => { const first = out.querySelector('.searchHit'); if (first) first.click(); }); }
    if (e.key === 'Escape') { out.innerHTML = ''; input.blur(); }
  });
  window.__search = { run: (q) => { input.value = q; return run(); }, searchLoaded };
}

map.on('load', async () => {
  say('loading approved icons…');
  for (const [kind, file] of Object.entries(manifest.art)) {
    try { const img = await sprite(assetUrl(file)); map.addImage(kind, img, { pixelRatio: iconPixelRatio(img) }); }
    catch (e) { console.error('icon', kind, e.message); }
  }
  await registerGlyphs();

  sub.textContent = `${Object.keys(manifest.data).length} bundled datasets · live layers · roads from OpenStreetMap · approved 3D icons`;

  buildSearch(rows);

  // 3D mode switch
  const modeWrap = document.createElement('div');
  modeWrap.className = 'modeRow';
  for (const [m, label] of [['auto', 'Auto 3D'], ['3d', '3D always'], ['2d', 'Flat 2D']]) {
    const b = document.createElement('button');
    b.className = 'modeBtn' + (m === 'auto' ? ' active' : '');
    b.dataset.mode = m;
    b.textContent = label;
    b.addEventListener('click', () => {
      mode = m;
      photorealOn = null; // force re-evaluate
      applyPhotorealVisibility();
      for (const x of document.querySelectorAll('.modeBtn')) x.classList.toggle('active', x.dataset.mode === m);
    });
    modeWrap.append(b);
  }
  rows.append(modeWrap);

  // Directions: click the map for A then B; the same /api/route engine (car | foot | bike, as directions/index.js).
  let routeMode = false;
  let routeProfile = 'car';
  const routePts = [];
  const routeWrap = document.createElement('div');
  routeWrap.className = 'modeRow';
  const routeBtn = document.createElement('button');
  routeBtn.className = 'modeBtn';
  routeBtn.id = 'routeBtn';
  routeBtn.textContent = 'Route: off';
  routeBtn.addEventListener('click', () => {
    routeMode = !routeMode;
    routeBtn.classList.toggle('active', routeMode);
    routeBtn.textContent = routeMode ? 'Route: click A then B' : 'Route: off';
    if (!routeMode) { routePts.length = 0; }
  });
  routeWrap.append(routeBtn);
  for (const [p, label] of [['car', 'Drive'], ['foot', 'Walk'], ['bike', 'Bike']]) {
    const b = document.createElement('button');
    b.className = 'modeBtn profBtn' + (p === 'car' ? ' active' : '');
    b.dataset.profile = p;
    b.textContent = label;
    b.addEventListener('click', () => {
      routeProfile = p;
      for (const x of document.querySelectorAll('.profBtn')) x.classList.toggle('active', x.dataset.profile === p);
    });
    routeWrap.append(b);
  }
  rows.append(routeWrap);
  /* /api/route answers { ok, profile, distanceM, durationS, geometry: [[lon,lat],...] }:
   * geometry is a plain point list, not a GeoJSON object. */
  const routeCoords = (r) => (Array.isArray(r?.geometry) ? r.geometry
    : r?.geometry?.coordinates || r?.routes?.[0]?.geometry?.coordinates || []);
  window.__routeCoords = routeCoords;
  map.on('click', async (e) => {
    if (!routeMode) return;
    routePts.push([e.lngLat.lng, e.lngLat.lat]);
    if (routePts.length < 2) { say('route: first point set - click the destination'); return; }
    const [a, b] = routePts.splice(0, 2);
    try {
      const r = await feeds.route(a, b, routeProfile);
      const coords = routeCoords(r).filter((c) => Number.isFinite(c?.[0]) && Number.isFinite(c?.[1]));
      if (coords.length < 2) throw new Error(r?.error || 'no route returned');
      const line = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords },
        properties: { name: 'Route (' + (r.profile || routeProfile) + ')', distance_km: Math.round((r.distanceM || 0) / 100) / 10, duration_min: Math.round((r.durationS || 0) / 60) } }] };
      const src = map.getSource('route-line');
      if (src) src.setData(line);
      else {
        map.addSource('route-line', { type: 'geojson', data: line });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route-line',
          paint: { 'line-color': '#ffd166', 'line-width': 4, 'line-opacity': 0.92 } });
      }
      window.__lastRoutePoints = coords.length;
      say(`route (${r.profile || routeProfile}): ${(Math.round((r.distanceM || 0) / 100) / 10).toLocaleString()} km · ${Math.round((r.durationS || 0) / 60)} min · ${coords.length} points`);
    } catch (err) { say('route failed: ' + err.message, true); }
  });

  // CareGap summary + legend sits above the layer list.
  buildCaregapPanel(rows).catch((e) => console.error('[caregap panel]', e));

  const ALL = [...LAYERS, ...LIVE];
  for (const [gid, gname] of GROUPS) {
    const defs = ALL.filter((d) => d.group === gid);
    if (!defs.length) continue;
    const h = document.createElement('div');
    h.className = 'grp';
    h.textContent = gname;
    rows.append(h);
    for (const def of defs) panelRow(def);
  }

  const allBtn = document.createElement('button');
  allBtn.id = 'allbtn';
  allBtn.textContent = 'Enable every layer (loads one at a time)';
  let allRunning = false;
  allBtn.addEventListener('click', async () => {
    if (allRunning) return;
    allRunning = true;
    allBtn.disabled = true;
    let i = 0;
    for (const def of ALL) {
      i++;
      allBtn.textContent = `Loading ${i}/${ALL.length}: ${def.name.slice(0, 28)}…`;
      const cb = document.querySelector(`#row-${CSS.escape(def.id)} input`);
      if (cb && !cb.checked) { cb.checked = true; }
      try { await setLayer(def, true); } catch { /* row shows the error */ }
      await sleep(900); // stagger: one dataset at a time
    }
    allBtn.textContent = 'All layers enabled';
    allBtn.disabled = false;
    allRunning = false;
    say('every layer is on');
  });
  rows.append(allBtn);
  const noneBtn = document.createElement('button');
  noneBtn.id = 'nonebtn';
  noneBtn.textContent = 'Hide every layer';
  noneBtn.addEventListener('click', () => {
    for (const def of ALL) {
      const cb = document.querySelector(`#row-${CSS.escape(def.id)} input`);
      if (cb) cb.checked = false;
      setLayer(def, false);
    }
  });
  rows.append(noneBtn);

  const foot = document.createElement('div');
  foot.className = 'foot';
  foot.textContent = `${ALL.length} toggleable layers covering every id of the Cesium catalog; CareGap layers and the feeds CareGap reads start on. Live feeds use the same endpoints as the Cesium app. Roads: © OpenStreetMap via OpenFreeMap. Icons: approved 3D CareGap art. 3D: Google Photorealistic Tiles.`;
  rows.append(foot);
  window.__layerDefs = ALL.map((d) => ({ id: d.id, cesium: d.cesium || d.id, name: d.name, group: d.group, defaultOn: !!d.on }));

  // photoreal layer (hidden until the zoom threshold or an explicit mode).
  // The renderer itself is created lazily by ensurePhotoreal() when the
  // camera first comes close enough for 3D tiles to be worth loading.
  try {
    document.getElementById('photoreal').style.opacity = '0';
    applyPhotorealVisibility();
  } catch (e) {
    console.error('[photoreal]', e);
  }

  window.__benchReady = true;
  say('ready — golden globe standing by');
  /* Light live feeds first (quakes, fires, aircraft, satellites appear within
   * seconds, as the Cesium app's fresh open does), then the heavy CareGap files. */
  loadDefaultsStaggered([...LIVE, ...LAYERS]);

  runStartup();
  /* An Enter click that arrived while the globe was still loading. The
   * button is disabled by then, so invoke the handler rather than clicking it. */
  if (pendingEnter) {
    pendingEnter = false;
    if (enterHandler) enterHandler(); else coverEnterButton?.click();
  }
});

/* ------------------------------------------------------------------ */
/* Golden startup: Harmandir Sahib cover -> dawn -> Amritsar            */
/* ------------------------------------------------------------------ */
function runStartup() {
  const skipIntro = /[?&]intro=0/.test(location.search);
  // `?cover=0` — index.html already showed the launch cover and the visitor
  // pressed Enter there. Skip the duplicate cover and start the dawn at once.
  const skipCover = /[?&]cover=0/.test(location.search);
  // With either skip flag the cover leaves the DOM before anything else runs.
  // `cover` is then null, so the tail of this function starts the dawn at once
  // (calling runDawn here would hit its temporal dead zone further down).
  const skipAny = skipCover || skipIntro;
  if (skipAny) document.getElementById('gev-intro')?.remove();
  const cover = skipAny ? null : document.getElementById('gev-intro');

  /* Phase 3 — the actual 3D map opens. */
  const open3d = () => {
    document.getElementById('open3d')?.setAttribute('hidden', '');
    mode = '3d';
    photorealOn = null;
    applyPhotorealVisibility();
    for (const b of document.querySelectorAll('.modeBtn')) b.classList.toggle('active', b.dataset.mode === '3d');
    map.flyTo({ center: [AMRITSAR.lon, AMRITSAR.lat], zoom: 11.2, pitch: 58, bearing: 30, duration: 5200, curve: 1.25, essential: true });
    say('opening the 3D map over Amritsar…');
    setTimeout(() => say('Amritsar — Harmandir Sahib · golden globe live'), 5400);
    try { dawn?.dispose(); dawn = null; } catch { /* gone */ }
  };

  if (skipIntro) { open3d(); return; }

  /* Phase 1 - the exact dawn of globeIntro.js: the light front rising from
   * Harmandir Sahib over the night earth (Black Marble city lights + clouds),
   * driven with the original timeline: 700 ms seed, 6600 ms wave, 900 ms fade. */
  const WAVE_MS = 6600, PRE_MS = 700, FADE_MS = 900, MIN_WAVE_FRAMES = 34;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const unitFromLngLat = (lngLat) => {
    const lat = (lngLat.lat * Math.PI) / 180, lon = (lngLat.lng * Math.PI) / 180;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  };

  const driveDawn = () => {
    if (!dawn) return;
    const t = map._camera?.transform;
    if (!t) return;
    // Camera basis in maplibre's unit-sphere globe space (probe: |cameraPosition| ~ 1).
    const cam = t.cameraPosition;
    const c = [cam[0], cam[1], cam[2]];
    const center = map.getCenter();
    const g = unitFromLngLat(center);
    const fwd = [g[0] - c[0], g[1] - c[1], g[2] - c[2]];
    const fl = Math.hypot(...fwd) || 1;
    fwd[0] /= fl; fwd[1] /= fl; fwd[2] /= fl;
    const cl = Math.hypot(...c) || 1;
    const up0 = [c[0] / cl, c[1] / cl, c[2] / cl];
    const b = (map.getBearing() * Math.PI) / 180;
    const lam = (center.lng * Math.PI) / 180, phi = (center.lat * Math.PI) / 180;
    const east = [-Math.sin(lam), Math.cos(lam), 0];
    const north = [-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)];
    const fh = [north[0] * Math.cos(b) + east[0] * Math.sin(b), north[1] * Math.cos(b) + east[1] * Math.sin(b), north[2] * Math.cos(b) + east[2] * Math.sin(b)];
    let right = [fh[1] * up0[2] - fh[2] * up0[1], fh[2] * up0[0] - fh[0] * up0[2], fh[0] * up0[1] - fh[1] * up0[0]];
    const rl = Math.hypot(...right) || 1;
    right = [right[0] / rl, right[1] / rl, right[2] / rl];
    let up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const ul = Math.hypot(...up) || 1;
    up = [up[0] / ul, up[1] / ul, up[2] / ul];
    const fov = (t.perspectiveFrustum && t.perspectiveFrustum.fov) || 0.6435;
    const tanY = Math.tan(fov / 2);
    const tanX = tanY * (map.getContainer().clientWidth / Math.max(1, map.getContainer().clientHeight));
    dawn.update({ camPos: c, fwd, right, up, tanX, tanY });
  };

  const runDawn = () => {
    if (!dawn) dawn = createDawn(document.getElementById('dawn-gl'), {
      night: assetUrl(manifest.textures.night),
      clouds: assetUrl(manifest.textures.clouds),
      marble: assetUrl(manifest.textures.marble),
    }, { fov: 36.87 });
    const u = dawn.uniforms;
    u.u_dark.value = 1;
    u.u_front.value = 0;
    u.u_soft.value = 0.16;
    u.u_seed.value = 0.25;
    u.u_clouds.value = 0.9;

    // Startup chrome stays back for the length of the cinematic, as the
    // original startup styles did (gev-intro-running).
    for (const id of ['panel', 'hud']) document.getElementById(id)?.style.setProperty('visibility', 'hidden');
    // Far night globe, held: START = Harmandir longitude, lat 22, as in the original.
    map.jumpTo({ center: [AMRITSAR.lon, 22], zoom: 2.6, pitch: 0, bearing: 0 });
    map.getContainer().style.visibility = 'hidden'; // first frame is already night

    const t0 = performance.now();
    let last = 0;
    let waveProgress = 0;
    let waveEndAt = 0;
    let endFadeStarted = 0;

    const frame = (now) => {
      if (!dawn) return;
      /* A slow frame must not stretch the intro: the wave is timeline driven,
       * so a long frame advances it further instead of being thrown away. */
      const dt = last ? Math.min(now - last, 900) : 16;
      last = now;
      const e = now - t0;
      driveDawn();

      // Original timeline (globeIntro.js): seed, front, soft, clouds.
      const pre = clamp01(e / PRE_MS);
      /* Original globeIntro.js behaviour: a frame may advance the wave by at
       * most 1/MIN_WAVE_FRAMES, so a struggling GPU still shows at least 34
       * frames of the light front, and a healthy GPU runs the full 6.6 s. */
      waveProgress = Math.min(1, waveProgress + Math.min(dt / WAVE_MS, 1 / MIN_WAVE_FRAMES));
      const w = waveProgress;
      u.u_seed.value = 0.25 + 0.75 * easeInOutSine(pre) * (1 - easeInOutSine(clamp01((w - 0.05) / 0.25)));
      u.u_front.value = Math.PI * 1.04 * easeInOutCubic(w);
      u.u_soft.value = 0.10 + 0.12 * easeInOutSine(w);
      if (w >= 1 && !waveEndAt) waveEndAt = now;
      if (waveEndAt) {
        if (!endFadeStarted) endFadeStarted = now;
        const endFade = clamp01((now - endFadeStarted) / FADE_MS);
        u.u_dark.value = 1 - easeInOutSine(endFade);
        u.u_seed.value *= 1 - easeInOutSine(endFade);
        if (endFade >= 1) {
          map.getContainer().style.visibility = '';
          document.getElementById('dawn-gl').style.opacity = '0';
          try { dawn.dispose(); } catch { /* gone */ }
          dawn = null;
          showCard();
          return;
        }
      }
      dawn.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  /* Phase 2 — the card: More information, then the 3D map opens. */
  const showCard = () => {
    for (const id of ['panel', 'hud']) document.getElementById(id)?.style.removeProperty('visibility');
    const card = document.getElementById('open3d');
    card?.removeAttribute('hidden');
    document.getElementById('open3dBtn')?.addEventListener('click', open3d, { once: true });
    say('the golden dawn has crossed the globe — open the 3D map');
  };

  /* Phase 0 — the original launch cover. Enter (or clicking the preview
   * globe) loads status, lifts the cover, and hands over to the dawn. When a
   * skip flag removed the cover, `cover` is null and the dawn starts here. */
  if (!cover || !cover.isConnected) { runDawn(); return; }
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    const status = cover.querySelector('.gev-loading');
    const button = cover.querySelector('.gev-enter');
    if (button) { button.disabled = true; button.textContent = 'Preparing live globe...'; }
    if (status) { status.hidden = false; status.textContent = 'Loading the 3D world and live layers'; }
    setTimeout(() => {
      if (status) status.textContent = 'Live globe ready · revealing Harmandir Sahib';
      cover.classList.add('gev-out');
      setTimeout(() => { cover.remove(); runDawn(); }, 950);
    }, 900);
  };
  /* From now on a click on Enter goes straight through. */
  enterHandler = enter;
  const button = cover.querySelector('.gev-enter');
  const core = cover.querySelector('.gev-core');
  // The original cover is pointer-events:none for first paint; the app enables
  // exactly this once it is wired (launchIntro does the same).
  if (core) { core.style.pointerEvents = 'auto'; core.style.cursor = 'pointer'; }
  button?.addEventListener('click', (e) => { e.stopPropagation(); enter(); });
  core?.addEventListener('click', (e) => { if (e.target?.closest?.('a, button')) return; enter(); });
}
