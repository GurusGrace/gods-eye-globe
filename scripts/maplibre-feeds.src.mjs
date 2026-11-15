/* Live feeds for the MapLibre globe — every dynamic layer the Cesium app has.
 *
 * Every fetcher hits the same endpoints the Cesium app reads (the same-origin
 * /api proxy in the dev/preview server, or the same public feeds), so the two
 * globes show the same world. Returns GeoJSON FeatureCollections ready for
 * MapLibre sources; property `_icon` names the sprite.
 */
import { twoline2satrec, json2satrec, propagate, eciToGeodetic, gstime } from 'satellite.js';

const api = (path, opts) => fetch(path, opts).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

function pickLatLon(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return null;
  for (const [latK, lonK] of [['latitude', 'longitude'], ['lat', 'lon'], ['lat', 'lng']]) {
    if (Number.isFinite(obj[latK]) && Number.isFinite(obj[lonK])) return [obj[lonK], obj[latK]];
  }
  for (const v of Object.values(obj)) {
    const hit = pickLatLon(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function fc(features) { return { type: 'FeatureCollection', features }; }
function point(coords, props) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props };
}

/* ------------------------- fires & hazards ------------------------- */
export async function fires() {
  const d = await api('/api/firms');
  const rows = d.fires || [];
  const stride = Math.max(1, Math.ceil(rows.length / 20000)); // cap for the atlas
  const features = [];
  for (let i = 0; i < rows.length; i += stride) {
    const f = rows[i];
    if (!Number.isFinite(f.lat) || !Number.isFinite(f.lon)) continue;
    features.push(point([f.lon, f.lat], {
      name: `${f.satellite} ${f.instrument} FRP ${Math.round(f.frp || 0)}`,
      _icon: 'hazard-fire',
      frp: f.frp, brightness: f.brightness, daynight: f.daynight, acq: `${f.acqDate} ${f.acqTime}`,
    }));
  }
  return { features: fc(features), raw: rows.length, shown: features.length };
}

function coordMean(node, acc, depth = 0) {
  if (!node || depth > 6) return acc;
  if (typeof node[0] === 'number' && typeof node[1] === 'number') {
    acc[0] += node[0]; acc[1] += node[1]; acc[2] += 1;
    return acc;
  }
  if (Array.isArray(node)) for (const child of node) coordMean(child, acc, depth + 1);
  return acc;
}

export async function perimeters() {
  const d = await api('/api/fire-perimeters');
  const rows = d.rows || [];
  const features = [];
  for (const r of rows) {
    const mean = coordMean(r.polygons || r.geometry || r.rings, [0, 0, 0]);
    const c = pickLatLon(r) || (mean[2] ? [mean[0] / mean[2], mean[1] / mean[2]] : null);
    if (!c) continue;
    features.push(point(c, {
      name: r.name || r.stableId,
      _icon: 'hazard-fire',
      acres: r.acres, state: r.state, category: r.category,
      detail: `${r.county ? r.county + ', ' : ''}${r.state || ''} · ${r.acres ?? '?'} acres`,
    }));
  }
  return { features: fc(features), raw: rows.length };
}

export async function cyclones() {
  const d = await api('/api/cyclones');
  const storms = d.storms || [];
  const features = storms.map((s) => point([s.position.longitude, s.position.latitude], {
    name: `${s.classification} ${s.name}`,
    _icon: 'hazard-cyclone',
    detail: `${s.windKt} kt · ${s.pressureHpa} hPa · moving ${s.movement.directionDegrees}° @ ${s.movement.speedKt} kt`,
    advisory: s.advisoryNumber,
  }));
  return { features: fc(features), raw: storms.length };
}

/* ------------------------- space ------------------------- */
export async function launches() {
  const d = await api('/api/launches');
  const features = [];
  for (const r of d.results || []) {
    const c = pickLatLon(r.pad || r.location || r);
    if (!c) continue;
    const when = r.window_start || r.net || '';
    features.push(point(c, {
      name: r.name,
      _icon: 'launch',
      detail: `${r.status?.name || r.status || ''} · ${String(when).slice(0, 16).replace('T', ' ')}`,
    }));
  }
  return { features: fc(features), raw: d.results?.length || 0 };
}

function ommToTle(o) {
  const norad = String(o.NORAD_CAT_ID ?? '').padStart(5, '0');
  const epoch = new Date(o.EPOCH);
  const start = Date.UTC(epoch.getUTCFullYear(), 0, 1);
  const doy = (epoch.getTime() - start) / 86400000 + 1;
  const yy = String(epoch.getUTCFullYear()).slice(2);
  const epochField = yy + doy.toFixed(8).padStart(12, '0');
  const ecc = String(Math.max(0, Math.floor((o.ECCENTRICITY || 0) * 1e7))).padStart(7, '0');
  const f = (v, w, d) => Number(v || 0).toFixed(d).padStart(w, '0');
  const line1 = '1 ' + norad + 'U ' + String(o.OBJECT_ID ?? '').padEnd(8).slice(0, 8) + ' ' + epochField +
    '  .00000000  00000-0  00000-0 0  999';
  const line2 = '2 ' + norad + ' ' + f(o.INCLINATION, 8, 4) + ' ' + f(o.RA_OF_ASC_NODE, 8, 4) + ' ' + ecc +
    ' ' + f(o.ARG_OF_PERICENTER, 8, 4) + ' ' + f(o.MEAN_ANOMALY, 8, 4) + ' ' + f(o.MEAN_MOTION, 11, 8) + '00000';
  return { name: o.OBJECT_NAME, line1, line2 };
}

const TLE_GROUPS = [
  ['stations', 60],      // ISS, stations
  ['gps-ops', 400],      // GPS constellation — the GNSS the user asks about
  ['active', 1500],      // full active catalog (starlink group 502s on the proxy)
];

export async function satellites() {
  const features = [];
  let raw = 0;
  // CelesTrak's TLE text is best; it throttles aggressively, so a partial body
  // (or none at all) falls back to the app's OMM proxy — converted to two-line
  // elements here so satellite.js can propagate both routes identically.
  const parseTle = (body) => {
    const out = [];
    const rows = body.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    for (let i = 0; i + 1 < rows.length; i += 3) {
      const l1 = rows[i + 1] || '', l2 = rows[i + 2] || '';
      if (!/^1 /.test(l1) || !/^2 /.test(l2)) continue;
      const rec = twoline2satrec(l1, l2);
      if (rec) out.push([rows[i], rec]);
    }
    return out;
  };
  for (const [group, cap] of TLE_GROUPS) {
    let satrecs = [];
    try {
      const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);
      if (r.ok) satrecs = parseTle(await r.text());
    } catch { /* fall through to proxy */ }
    if (!satrecs.length) {
      try {
        const r2 = await fetch(`/api/celestrak/${group}`);
        if (r2.ok) {
          const body = await r2.text();
          const arr = body.trim().startsWith('[') ? JSON.parse(body) : [];
          const named = [];
          for (const o of arr) { const t = ommToTle(o); named.push(t.name, t.line1, t.line2); }
          satrecs = parseTle(named.join('\n'));
        }
      } catch { continue; }
    }
    raw += satrecs.length;
    const stride = Math.max(1, Math.ceil(satrecs.length / cap));
    const now = new Date();
    const gmst = gstime(now);
    for (let i = 0; i < satrecs.length; i += stride) {
      const [name, rec] = satrecs[i];
      try {
        const pv = propagate(rec, now);
        if (!pv?.position) continue;
        const g = eciToGeodetic(pv.position, gmst);
        const lat = (g.latitude * 180) / Math.PI, lon = (g.longitude * 180) / Math.PI;
        features.push(point([lon, lat], {
          name: name.replace(/^0 /, '').trim(),
          _icon: 'satellite',
          detail: `${group} · ${Math.round(g.height)} km`,
        }));
      } catch { /* decayed element */ }
    }
  }
  return { features: fc(features), raw };
}

/* ------------------------- ground ------------------------- */
export async function cctv() {
  const d = await api('/api/cctv/sources');
  const rows = d.sources || [];
  const features = rows.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map((c) => point([c.lon, c.lat], {
      name: c.name || c.id,
      _icon: 'cctv',
      camera_id: c.id, feed_type: c.feedType || '', license: c.license || '',
      detail: `${c.city || ''} · ${c.provider || ''}`,
    }));
  return { features: fc(features), raw: rows.length };
}

export async function radio() {
  const d = await api('/api/radio/stations');
  const rows = d.stations || [];
  const features = rows.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => point([s.lon, s.lat], {
      name: s.name,
      _icon: 'radio',
      stream_url: s.streamUrl || '', homepage: s.homepage || '', country: s.country || '', codec: s.codec || '', bitrate: s.bitrate || '',
      detail: (s.tags || []).slice(0, 3).join(', '),
    }));
  return { features: fc(features), raw: rows.length };
}

export async function transit() {
  const feeds = (await api('/api/transit/feeds')).feeds || [];
  const features = [];
  let raw = 0;
  for (const feed of feeds) {
    try {
      const d = await api(`/api/transit/vehicles/${encodeURIComponent(feed.id)}`);
      for (const v of d.vehicles || []) {
        if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
        raw++;
        features.push(point([v.lon, v.lat], {
          name: `${feed.name} ${v.label || v.routeId || v.id}`,
          _icon: 'transit',
          detail: `${feed.region || feed.name} · ${v.status || ''}`,
        }));
      }
    } catch { /* one feed down, rest continue */ }
  }
  return { features: fc(features), raw, feeds: feeds.length };
}

export async function bikeshare() {
  // Reuse the Cesium app's own city registry (same systems, same GBFS URLs).
  const registry = await import('../src/layers/bikeshare/registry.js');
  const cities = registry.GBFS_CITY_REGISTRY || [];
  const features = [];
  let raw = 0;
  for (const city of cities.slice(0, 8)) {
    const infoUrl = city.stationInformationUrl || city.infoUrl;
    if (!infoUrl) continue;
    try {
      const d = await api('/api/gbfs/' + encodeURIComponent(infoUrl));
      const stations = d?.data?.stations || d?.stations || [];
      for (const s of stations) {
        if (!Number.isFinite(s.lat) && !Number.isFinite(s.latitude)) continue;
        raw++;
        const lat = s.lat ?? s.latitude, lon = s.lon ?? s.longitude;
        features.push(point([lon, lat], {
          name: s.name || s.station_name || city.id,
          _icon: 'bike',
          detail: city.id || '',
        }));
      }
    } catch { /* one system down, rest continue */ }
  }
  return { features: fc(features), raw };
}

export async function vessels() {
  const d = await api('/api/vessels');
  const rows = d.rows || d.vessels || d || [];
  const features = [];
  for (const v of (Array.isArray(rows) ? rows : [])) {
    const c = pickLatLon(v);
    if (!c) continue;
    features.push(point(c, {
      name: v.name || v.mmsi || v.reference,
      _icon: 'vessel',
      detail: `${v.type || ''} · ${v.destination || ''}`,
    }));
  }
  return { features: fc(features), raw: features.length };
}

export async function installations(rawBox) {
  const cx = Number.isFinite(rawBox.west) && Number.isFinite(rawBox.east) ? (rawBox.west + rawBox.east) / 2 : 0;
  const cy = Number.isFinite(rawBox.south) && Number.isFinite(rawBox.north) ? (rawBox.south + rawBox.north) / 2 : 30;
  const bbox = {
    // The endpoint accepts small boxes (verified 2 deg); a 10 deg box is refused.
    west: cx - 2.5, east: cx + 2.5,
    south: cy - 2.5, north: cy + 2.5,
  };
  const q = new URLSearchParams(Object.entries({
    south: bbox.south.toFixed(5), west: bbox.west.toFixed(5),
    north: bbox.north.toFixed(5), east: bbox.east.toFixed(5),
  }));
  const d = await api(`/api/military-installations?${q}`);
  if (d.error) return { features: fc([]), raw: 0, note: String(d.error).slice(0, 40) };
  const rows = d.rows || d.sites || d.results || [];
  const features = [];
  for (const r of (Array.isArray(rows) ? rows : [])) {
    const c = pickLatLon(r);
    if (!c) continue;
    features.push(point(c, { name: r.name || r.id, _icon: 'install', detail: r.type || '' }));
  }
  return { features: fc(features), raw: rows.length };
}

export async function route(a, b, profile = 'driving') {
  const coords = `${a[0].toFixed(5)},${a[1].toFixed(5)};${b[0].toFixed(5)},${b[1].toFixed(5)}`;
  return api(`/api/route?profile=${encodeURIComponent(profile)}&coords=${encodeURIComponent(coords)}&steps=1`);
}

/* Bhote Koshi event places — the same bundled records the locator layer uses. */
export async function bhotePlaces() {
  const mod = await import('../src/data/bhoteKoshiIncidentPlaces.js');
  const list = mod.INCIDENT_OVERVIEW_PLACES || [];
  const features = [];
  for (const p of list) {
    const c = Number.isFinite(p.lat) && Number.isFinite(p.lon) ? [p.lon, p.lat] : pickLatLon(p);
    if (!c) continue;
    features.push(point(c, { name: p.title || p.id, _icon: 'launch', detail: 'Bhote Koshi' }));
  }
  return { features: fc(features), raw: list.length };
}

/* Wind: manifest gives the cycle; the grid is a packed u/v field. Sampled into
 * arrows. Format-guarded: if the bytes don't match the manifest dimensions the
 * layer reports 'format' rather than drawing nonsense. */
export async function windArrows() {
  const m = await api('/api/wind/manifest?model=gfs');
  const G = m.grid || {};
  const width = G.nx || m.width || m.cols || 0;
  const height = G.ny || m.height || m.rows || 0;
  if (!width || !height || !m.gridUrl) return { features: fc([]), raw: 0, note: 'no grid' };
  const buf = await (await fetch(m.gridUrl)).arrayBuffer();
  const expected = width * height * 2;
  if (buf.byteLength !== expected * 4 && buf.byteLength !== expected * 2) {
    return { features: fc([]), raw: 0, note: `format ${buf.byteLength}!=${expected * 4}` };
  }
  const f32 = buf.byteLength === expected * 4 ? new Float32Array(buf) : null;
  const i16 = f32 ? null : new Int16Array(buf);
  const scale = i16 ? 0.01 : 1;
  const features = [];
  for (let y = 0; y < height; y += Math.ceil(height / 30)) {
    for (let x = 0; x < width; x += Math.ceil(width / 60)) {
      const i = (y * width + x) * 2;
      const u = (f32 ? f32[i] : i16[i]) * scale;
      const v = (f32 ? f32[i + 1] : i16[i + 1]) * scale;
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
      const lon = (G.lo1 ?? 0) + x * (G.dx ?? 1);
      const lat = (G.la1 ?? 90) - y * (G.dy ?? 1);
      const dir = (Math.atan2(u, v) * 180) / Math.PI;
      features.push(point([lon, lat], {
        _icon: 'wind',
        rotate: (dir + 360) % 360,
        speed: Math.round(Math.hypot(u, v) * 10) / 10,
        detail: `${m.cycle?.validIso || ''}`,
      }));
    }
  }
  return { features: fc(features), raw: features.length };
}


/* ===================================================================== */
/* Layers added 2026-11-13 so the hybrid carries the full Cesium catalog. */
/* ===================================================================== */

/* Military aircraft — the same /api/military feed the Cesium layer reads
 * (ADS-B records flagged military). Only what the record says is shown. */
export async function military() {
  const d = await api('/api/military');
  const rows = d.ac || d.aircraft || [];
  const features = [];
  for (const a of rows) {
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
    features.push(point([a.lon, a.lat], {
      name: String(a.flight || a.r || a.hex || '').trim() || 'Military aircraft',
      _icon: 'aircraft-mil',
      rotate: Number.isFinite(a.track) ? a.track : 0,
      type: a.t || '',
      altitude_ft: a.alt_baro ?? '',
      speed_kt: a.gs ?? '',
      hex: a.hex || '',
      detail: `${a.t || 'type not reported'} · ${a.alt_baro ?? '?'} ft · ${a.gs ?? '?'} kt`,
    }));
  }
  return { features: fc(features), raw: rows.length };
}

/* Satellites — exactly the Cesium layer's core catalog (src/layers/satellites/
 * policy.js CATALOG_GROUPS, same /api/celestrak/<group> OMM proxy, NORAD de-dupe
 * where the first, most specific group wins). Starlink is the separate dense
 * catalog, as in the original. Records are cached and re-propagated on a timer
 * so the dots move, instead of a single snapshot. */
export const SATELLITE_GROUPS = Object.freeze([
  { tag: 'stations', path: 'stations' },
  { tag: 'visual', path: 'visual' },
  { tag: 'gps-ops', path: 'gps-ops' },
  { tag: 'glonass', path: 'glo-ops' },
  { tag: 'galileo', path: 'galileo' },
  { tag: 'geo', path: 'geo' },
]);
const satCache = { core: null, dense: null };

async function readGroups(groups) {
  const out = [];
  const seen = new Set();
  const perGroup = {};
  const results = await Promise.all(groups.map(async (g) => {
    try {
      const r = await fetch(`/api/celestrak/${g.path}`);
      if (!r.ok) return { g, rows: [] };
      const body = await r.text();
      return { g, rows: body.trim().startsWith('[') ? JSON.parse(body) : [] };
    } catch { return { g, rows: [] }; }
  }));
  for (const { g, rows } of results) {
    perGroup[g.tag] = rows.length;
    for (const o of rows) {
      let rec = null;
      try { rec = json2satrec(o); } catch { rec = null; }
      if (!rec || rec.error) continue;
      const id = Number(rec.satnum);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name: String(o.OBJECT_NAME || id), group: g.tag, rec, intl: o.OBJECT_ID || '' });
    }
  }
  return { list: out, perGroup };
}

/* Same table as src/data/satelliteClass.js + layers/satellites/policy.js
 * POINT_STYLES, so dot colour, size and card class match the Cesium layer. */
export const SATELLITE_CLASS = Object.freeze({
  stations: { klass: 'STATION', color: '#fff6e5', size: 9 },
  visual: { klass: 'VISUAL', color: '#9fb3c4', size: 7 },
  'gps-ops': { klass: 'NAV · GPS', color: '#4fd8ff', size: 7 },
  glonass: { klass: 'NAV · GLONASS', color: '#4fd8ff', size: 7 },
  galileo: { klass: 'NAV · GALILEO', color: '#4fd8ff', size: 7 },
  geo: { klass: 'GEO', color: '#c89bff', size: 7 },
  starlink: { klass: 'COMMS · STARLINK', color: '#54697f', size: 3 },
});
const ISS_NORAD = 25544;
function satFeatures(list, now = new Date()) {
  const gmst = gstime(now);
  const features = [];
  for (const s of list) {
    try {
      const pv = propagate(s.rec, now);
      if (!pv?.position) continue;
      const g = eciToGeodetic(pv.position, gmst);
      const iss = Number(s.id) === ISS_NORAD;
      const cls = iss ? { klass: 'STATION · ISS', color: '#ff4444', size: 14 } : (SATELLITE_CLASS[s.group] || SATELLITE_CLASS.visual);
      features.push(point([(g.longitude * 180) / Math.PI, (g.latitude * 180) / Math.PI], {
        name: s.name, _icon: 'satellite', norad: s.id, group: s.group, class_label: cls.klass,
        _color: cls.color, _size: cls.size, _iss: iss ? 1 : 0,
        altitude_km: Math.round(g.height), intl_designator: s.intl || '',
        detail: `${cls.klass} · ${Math.round(g.height)} km · NORAD ${s.id}`,
      }));
    } catch { /* decayed element */ }
  }
  return fc(features);
}

export async function satellitesCore() {
  if (!satCache.core) satCache.core = await readGroups(SATELLITE_GROUPS);
  return { features: satFeatures(satCache.core.list), raw: satCache.core.list.length, perGroup: satCache.core.perGroup };
}
export function satellitesCoreTick() { return satCache.core ? satFeatures(satCache.core.list) : null; }
export function satellitesCoreRefresh() { satCache.core = null; }

export async function satellitesDense() {
  if (!satCache.dense) satCache.dense = await readGroups([{ tag: 'starlink', path: 'starlink' }]);
  return { features: satFeatures(satCache.dense.list), raw: satCache.dense.list.length };
}
export function satellitesDenseTick() { return satCache.dense ? satFeatures(satCache.dense.list) : null; }

/* "Global Satellites" — the gold CareGap panel's Golden-Hour Triage tab
 * (src/caregap/caregapPanel.js, liveSatelliteItems): derived from the live
 * hourly hazard model's top facilities exactly as Cesium does it — wildfire
 * noise filter, first 25, one per country, first 12. Each site's satellites are
 * the live N2YO overhead sweep (/api/n2yo/above, server-side key). */
const HAZARD_SUMMARY = '/src/data/local_data/hospitals/global/caregap-hazard-global.summary.json';
export async function globalSatellites() {
  const r = await fetch(HAZARD_SUMMARY + '?t=' + Date.now());
  const t = await r.text();
  if (!r.ok || !t.trimStart().startsWith('{')) throw new Error('hazard summary unavailable');
  const hz = JSON.parse(t);
  const raw = Array.isArray(hz.top_facilities_diverse) && hz.top_facilities_diverse.length ? hz.top_facilities_diverse
    : Array.isArray(hz.top_facilities) ? hz.top_facilities : [];
  const corridors = raw.filter((f) => {
    if (!f || !Number.isFinite(Number(f.lat)) || !Number.isFinite(Number(f.lon))) return false;
    if (f.hazard === 'wildfire') {
      const sev = Number(f.severity) || 0;
      const ev = String(f.event || '');
      const near5 = Number((ev.match(/(\d+)\s*fires<=5km/) || [])[1]) || 0;
      const near25 = Number((ev.match(/(\d+)<=25km/) || [])[1]) || 0;
      if (sev < 0.25 && near5 < 2 && near25 < 5) return false;
    }
    return true;
  }).slice(0, 25);
  const seen = new Set();
  const items = corridors.filter((c) => { const k = c.iso2 || '—'; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
  const features = items.map((c, i) => point([Number(c.lon), Number(c.lat)], {
    name: c.name || 'Healthcare facility', rank: i + 1, iso2: c.iso2 || '—', hazard: c.hazard || 'hazard',
    severity: Number(c.severity) || 0, event: `${c.event || ''} · live N2YO all-catalog sweep on open`,
    _icon: 'satellite', site_id: `sat-${c.id || i}`,
  }));
  return { features: fc(features), raw: features.length, items: features.map((f) => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })), generatedAt: hz.generated_at || null };
}
export async function n2yoAbove(lat, lon) {
  return api(`/api/n2yo/above?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
}

/* Ground tracks — one orbital period ahead for the crewed stations group and
 * the GNSS constellations (the orbits the original draws on selection). */
export async function satelliteOrbits() {
  if (!satCache.core) satCache.core = await readGroups(SATELLITE_GROUPS);
  const pick = satCache.core.list.filter((s) => s.group === 'stations' || s.group === 'gps-ops' || s.group === 'galileo' || s.group === 'glonass');
  const features = [];
  const now = Date.now();
  for (const s of pick) {
    const periodMin = (2 * Math.PI) / (s.rec.no || 0.06); // rec.no is rad/min
    const steps = 120;
    let seg = [];
    let prevLon = null;
    for (let i = 0; i <= steps; i++) {
      const t = new Date(now + (i / steps) * periodMin * 60000);
      try {
        const pv = propagate(s.rec, t);
        if (!pv?.position) continue;
        const g = eciToGeodetic(pv.position, gstime(t));
        const lon = (g.longitude * 180) / Math.PI, lat = (g.latitude * 180) / Math.PI;
        if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
          if (seg.length > 1) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: seg }, properties: { name: s.name, group: s.group, norad: s.id } });
          seg = [];
        }
        seg.push([lon, lat]);
        prevLon = lon;
      } catch { break; }
    }
    if (seg.length > 1) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: seg }, properties: { name: s.name, group: s.group, norad: s.id } });
  }
  return { features: fc(features), raw: pick.length };
}

/* Fire perimeters as the real polygons (WFIGS/NIFC), not only centroids. */
function ringsFrom(node) {
  // Accept [[lon,lat],...] ring, [ring,...] polygon, or [polygon,...].
  if (!Array.isArray(node) || !node.length) return [];
  if (typeof node[0]?.[0] === 'number') return [[node]];
  if (typeof node[0]?.[0]?.[0] === 'number') return [node];
  if (typeof node[0]?.[0]?.[0]?.[0] === 'number') return node;
  return [];
}
export async function perimeterPolygons() {
  const d = await api('/api/fire-perimeters');
  const rows = d.rows || [];
  const polys = [];
  const pts = [];
  for (const r of rows) {
    const props = {
      name: r.name || r.stableId, acres: r.acres ?? null, contained_pct: r.containedPct ?? null,
      state: r.state || '', county: r.county || '', category: r.category || '', cause: r.cause || '',
      discovered: r.discoveredTime ? new Date(r.discoveredTime).toISOString().slice(0, 10) : '',
      updated: r.updatedTime ? new Date(r.updatedTime).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '',
      _icon: 'hazard-fire',
      detail: `${r.county ? r.county + ', ' : ''}${r.state || ''} · ${r.acres ?? 'acres not reported'} acres · ${r.containedPct ?? '?'}% contained`,
    };
    const geo = ringsFrom(r.polygons || r.rings || []);
    if (geo.length) polys.push({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: geo }, properties: props });
    const mean = coordMean(r.polygons || r.rings, [0, 0, 0]);
    if (mean[2]) pts.push(point([mean[0] / mean[2], mean[1] / mean[2]], props));
  }
  return { polygons: fc(polys), points: fc(pts), raw: rows.length };
}

/* Cyclones with the NHC forecast track, the uncertainty cone and forecast
 * points — the same /api/cyclones snapshot the Cesium layer validates. */
export async function cyclonesFull() {
  const d = await api('/api/cyclones');
  const storms = d.storms || [];
  const centers = [], tracks = [], cones = [], fpts = [];
  for (const s of storms) {
    const nm = `${s.classification || ''} ${s.name || ''}`.trim();
    if (s.position) centers.push(point([s.position.longitude, s.position.latitude], {
      name: nm, _icon: 'hazard-cyclone', advisory: s.advisoryNumber ?? '',
      detail: `${s.windKt ?? '?'} kt · ${s.pressureHpa ?? '?'} hPa · moving ${s.movement?.directionDegrees ?? '?'}° @ ${s.movement?.speedKt ?? '?'} kt`,
    }));
    if (s.track) tracks.push({ type: 'Feature', geometry: s.track, properties: { name: nm } });
    if (s.cone) cones.push({ type: 'Feature', geometry: s.cone, properties: { name: nm, note: 'Forecast center-track uncertainty, not storm size' } });
    for (const p of s.forecastPoints || []) {
      const c = pickLatLon(p) || (Array.isArray(p.coordinates) ? p.coordinates : null);
      if (c) fpts.push(point(c, { name: `${nm} +${p.leadHours ?? p.tau ?? '?'} h`, _icon: 'hazard-cyclone', detail: p.label || '' }));
    }
  }
  return { centers: fc(centers), tracks: fc(tracks), cones: fc(cones), forecast: fc(fpts), raw: storms.length, coverage: d.coverage || '' };
}

/* Wind streamlines traced through the GFS 10 m grid (RK2), as polylines. */
export async function windStreamlines() {
  const m = await api('/api/wind/manifest?model=gfs');
  const G = m.grid || {};
  const W = G.nx || 0, H = G.ny || 0;
  if (!W || !H || !m.gridUrl) return { features: fc([]), raw: 0, note: 'no grid' };
  const buf = await (await fetch(m.gridUrl)).arrayBuffer();
  const n = W * H * 2;
  const f32 = buf.byteLength === n * 4 ? new Float32Array(buf) : null;
  const i16 = !f32 && buf.byteLength === n * 2 ? new Int16Array(buf) : null;
  if (!f32 && !i16) return { features: fc([]), raw: 0, note: 'format' };
  const sc = i16 ? 0.01 : 1;
  const lo1 = G.lo1 ?? 0, la1 = G.la1 ?? 90, dx = G.dx ?? 1, dy = G.dy ?? 1;
  const uv = (lon, lat) => {
    let x = ((((lon - lo1) % 360) + 360) % 360) / dx;
    const y = (la1 - lat) / dy;
    if (y < 0 || y > H - 1) return null;
    const x0 = Math.floor(x) % W, y0 = Math.floor(y), x1 = (x0 + 1) % W, y1 = Math.min(H - 1, y0 + 1);
    const fx = x - Math.floor(x), fy = y - y0;
    const at = (xx, yy, k) => (f32 ? f32[(yy * W + xx) * 2 + k] : i16[(yy * W + xx) * 2 + k]) * sc;
    const lerp = (k) => (at(x0, y0, k) * (1 - fx) + at(x1, y0, k) * fx) * (1 - fy) + (at(x0, y1, k) * (1 - fx) + at(x1, y1, k) * fx) * fy;
    const u = lerp(0), v = lerp(1);
    return Number.isFinite(u) && Number.isFinite(v) ? [u, v] : null;
  };
  const features = [];
  for (let lat = -70; lat <= 70; lat += 5) {
    for (let lon = -180; lon < 180; lon += 6) {
      const line = [[lon, lat]];
      let p = [lon, lat], speedSum = 0;
      for (let k = 0; k < 18; k++) {
        const a = uv(p[0], p[1]); if (!a) break;
        const h = 0.35; // degrees per (m/s) step scale
        const mid = [p[0] + (a[0] * h) / Math.max(0.2, Math.cos((p[1] * Math.PI) / 180)) / 2, p[1] + (a[1] * h) / 2];
        const b = uv(mid[0], mid[1]); if (!b) break;
        const q = [p[0] + (b[0] * h) / Math.max(0.2, Math.cos((p[1] * Math.PI) / 180)), p[1] + b[1] * h];
        if (Math.abs(q[0] - p[0]) > 20) break;
        speedSum += Math.hypot(b[0], b[1]);
        line.push(q); p = q;
      }
      if (line.length > 3) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: line },
        properties: { speed: Math.round((speedSum / (line.length - 1)) * 10) / 10, valid: m.cycle?.validIso || '' } });
    }
  }
  return { features: fc(features), raw: features.length, valid: m.cycle?.validIso || '' };
}

/* Bhote Koshi 2026 — the bundled event record (public/events/bhote-koshi-2026
 * /event.json): schematic corridor, geoconfirmed witness anchors, the 16-step
 * evidence spine and the before/after imagery rectangle. */
export async function bhoteEvent() {
  const e = await (await fetch('/events/bhote-koshi-2026/event.json')).json();
  const corridor = (e.reconstruction?.corridor || []).filter((c) => Number.isFinite(c.lon) && Number.isFinite(c.lat)).map((c) => [c.lon, c.lat]);
  const lines = corridor.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: corridor },
    properties: { name: e.reconstruction?.label || 'Schematic downstream progression', note: e.reconstruction?.caveat || '' } }] : [];
  const pts = [];
  for (const w of e.witnessAnchors || []) {
    if (Number.isFinite(w.lat) && Number.isFinite(w.lon)) pts.push(point([w.lon, w.lat], {
      name: w.title, _icon: 'bhote', url: w.sourceUrl || '', provenance: w.provenance || '', detail: (w.details || []).join(' · ') }));
  }
  for (const s of e.evidenceSpine || []) {
    if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) pts.push(point([s.lon, s.lat], {
      name: `${s.sequence ?? ''}. ${s.title || s.id}`.trim(), _icon: 'bhote', phase: s.phase || '',
      url: s.sourceUrl || s.url || s.media?.url || '', detail: s.summary || '',
      captured: s.timing?.capturedAt || 'Not reported' }));
  }
  return { lines: fc(lines), points: fc(pts), imagery: e.imagery || null, title: e.title, observedDate: e.observedDate, raw: pts.length };
}

/* Bhote Koshi locator — published river centreline (GeoPera, CC BY-NC 4.0)
 * plus the incident overview places used by the Cesium locator layer. */
export async function bhoteLocator() {
  const fp = await import('../src/data/bhoteKoshiFloodPath.js');
  const places = await bhotePlaces();
  const path = (fp.BHOTE_KOSHI_FLOOD_PATH || []).map((p) => [p[0], p[1]]);
  for (const f of places.features.features) f.properties._icon = 'bhote';
  return { line: fc(path.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: path },
    properties: { name: 'Bhote Koshi river centreline (GeoPera, CC BY-NC 4.0)' } }] : []), points: places.features, raw: places.raw };
}

/* Fresh-data probe: the dev server serves src/, where the hourly hazard
 * refresh writes. Use it when it is reachable and really GeoJSON-lines. */
export async function freshAsset(path) {
  try {
    const r = await fetch(path, { method: 'HEAD' });
    const type = r.headers.get('content-type') || '';
    if (r.ok && !/text\/html/i.test(type)) return path;
  } catch { /* not served here */ }
  return null;
}

if (typeof window !== 'undefined') window.__feeds = { fires, perimeters, cyclones, launches, satellites, cctv, radio, transit, bikeshare, vessels, installations, route, bhotePlaces, windArrows, military, satellitesCore, satellitesDense, satelliteOrbits, perimeterPolygons, cyclonesFull, windStreamlines, bhoteEvent, bhoteLocator, globalSatellites, n2yoAbove };
