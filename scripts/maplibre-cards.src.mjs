/* Click-to-inspect cards for the MapLibre golden globe.
 *
 * Ported from the Cesium application (src/data/localGeojsonCore.js:
 * localInfrastructureOverlayCopy, healthSiteVerificationLines and
 * selectedHealthSiteDetails, plus src/caregap/caregapPopup.js). In the Cesium
 * app every icon - hospitals, emergency facilities such as fire stations,
 * clinics, dams, datacenters, access-gap cells, hazard exposure, live feed
 * points - opens a record card on click. The MapLibre globe drew the same
 * icons but had no click handling, so this restores it.
 *
 * Rules kept from the original:
 *  - copy comes only from the source record; nothing is invented or estimated
 *  - unknown key fields read "Not reported"
 *  - hazard exposure stays labelled as a model estimate, never confirmed impact
 *  - facility operation is never claimed from the map
 *
 * Built with esbuild into public/maplibre/cards.bundle.js (npm run
 * bundle:maplibre). It attaches to window.__map, so globe.js needs no change.
 */
import { caregapPopupLines, antarcticPopupLines, isCaregapLayer } from '../src/caregap/caregapPopup.js';

const MEDIA_NOTE = 'Media plays from the public source; availability is not guaranteed.';
const LAYER_NAMES = {
  'local-hospitals': 'Health facilities (Nepal, HDX/OSM)',
  'local-caregap-hazard': 'Facility hazard exposure (FIRMS+storms)',
  'local-caregap': 'Access-gap cells (Nepal + SSA)',
  'local-dams': 'Dams (USACE)',
  'local-datacenters': 'Datacenters (OSM)',
  'local-overture-healthcare': 'Global health POIs (Overture)',
  'local-caregap-pop': 'Population-weighted gaps (global)',
  'local-caregap-traveltime': 'Travel-time gaps (global)',
  'local-caregap-dam-downstream': 'Dam-downstream exposure (global)',
  'local-caregap-netctx': 'Network context - cities',
  'local-caregap-fac-netctx': 'Facility network context (global)',
  'local-caregap-ind-overture': 'Care gap - India (Overture)',
  'local-antarctic-censored': 'Antarctic imagery-gap dossier',
  'live-earthquakes': 'Earthquakes - USGS, live',
  'live-flights': 'Aircraft - OpenSky, live',
  'live-fires': 'Active fires - NASA FIRMS',
  'live-perimeters': 'Fire perimeters - WFIGS',
  'live-cyclones': 'Cyclones - NOAA NHC',
  'live-satellites': 'Satellites & GPS - CelesTrak',
  'live-launches': 'Rocket launches - Space Devs',
  'live-vessels': 'Ships - AIS live',
  'live-transit': 'Transit vehicles',
  'live-bikeshare': 'Bikeshare stations - GBFS',
  'live-cctv': 'Street cameras - public CCTV',
  'live-radio': 'Radio stations - live directory',
  'live-alpr': 'ALPR cameras - US & CA',
  'live-installations': 'Military installations - Overpass',
  'live-bhote': 'Bhote Koshi - event places',
  'cable-landings': 'Cable landing points',
};

const HEALTH_LAYERS = new Set(['local-hospitals', 'local-overture-healthcare']);
const SITE_PANEL_LAYERS = new Set([
  'local-hospitals', 'local-overture-healthcare', 'local-caregap', 'local-caregap-pop',
  'local-caregap-traveltime', 'local-caregap-dam-downstream', 'local-caregap-netctx',
  'local-caregap-fac-netctx', 'local-caregap-hazard', 'local-caregap-ind-overture',
  'local-datacenters', 'local-dams',
]);
const FACILITY_LAYERS = new Set(['local-hospitals', 'local-overture-healthcare', 'local-caregap-hazard']);
const NOT_REPORTED = 'Not reported';

/* ---------------- pure helpers (same behaviour as localGeojsonCore.js) --- */
function cleanLabel(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'undefined' || text === 'null') return '';
  return text;
}
function firstClean(values) { return values.map(cleanLabel).find(Boolean) || ''; }
function clampLine(value, max = 104) {
  const text = cleanLabel(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}
function layerTitle(layerId) {
  const defs = typeof window !== 'undefined' ? window.__layerDefs : null;
  const hit = Array.isArray(defs) ? defs.find((d) => d.id === layerId) : null;
  return LAYER_NAMES[layerId] || hit?.name || layerId;
}

/** MapLibre hands back nested GeoJSON properties as JSON strings. */
export function normaliseProperties(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try { out[key] = JSON.parse(value); continue; } catch { /* plain text */ }
    }
    out[key] = value;
  }
  return out;
}

export function featureLabel(props, layerId) {
  const tags = props.tags || {};
  const text = [
    props.name, props.name_en, props['name:en'], tags.name, tags['name:en'], tags.official_name,
    tags.operator, tags['operator:short'], props.operator,
    props.output ? `${layerTitle(layerId)} ${props.output}` : '',
    props.osm_id ? `${layerTitle(layerId)} ${props.osm_id}` : '',
    props.title, props.place,
  ].map(cleanLabel).find(Boolean);
  return clampLine(text || layerTitle(layerId), 60);
}

/** Old-app ambient card copy (localInfrastructureOverlayCopy). */
function infrastructureLines(props, layerId, title) {
  const tags = props.tags || {};
  const lines = [];
  if (layerId === 'local-datacenters') {
    const operator = firstClean([tags.operator, props.operator, tags['operator:short']]);
    const capacity = firstClean([tags['capacity:it_load'], tags.it_load, tags.capacity, props.capacity]);
    const line = [operator, capacity]
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .filter((v) => v.toLowerCase() !== title.toLowerCase())
      .join(' - ');
    if (line) lines.push(line);
  } else if (isCaregapLayer(layerId)) {
    lines.push(...caregapPopupLines(props, layerId));
  } else if (layerId === 'local-antarctic-censored') {
    lines.push(...antarcticPopupLines(props, layerId));
  } else if (layerId === 'local-dams') {
    const river = firstClean([tags.associated_river, props.associated_river, tags.river, props.river, tags['river:name']]);
    if (river && river.toLowerCase() !== title.toLowerCase()) lines.push(`River: ${river}`);
  }
  return lines;
}

/** Old-app selected-site record lines (healthSiteVerificationLines). */
function siteRecordLines(props, layerId) {
  const tags = props.tags || {};
  const value = (...keys) => firstClean(keys.map((k) => tags[k] ?? props[k]));
  const lines = [];
  const source = {
    'local-hospitals': 'HDX / OpenStreetMap',
    'local-overture-healthcare': 'Overture Places sampled health POI',
    'local-datacenters': 'OpenStreetMap datacenters',
    'local-dams': 'OpenStreetMap / USACE dams',
  }[layerId] || value('source', 'pop_source', 'traveltime_source') || 'CareGap dataset';
  lines.push(`Record source: ${source}`);
  const sourceDate = value('source_updated_at', 'dataset_as_of', 'as_of', 'source_date');
  if (sourceDate) lines.push(`Source record date: ${sourceDate}`);

  const category = value('category', 'healthcare', 'amenity', 'type', 'join_grain', 'hazard');
  const operator = value('operator', 'operator:short');
  const contact = value('phone', 'contact:phone', 'telephone');
  const website = value('website', 'contact:website', 'url');
  const status = value('operational_status', 'operating_status', 'status', 'facility_status', 'opening_hours');
  const facility = FACILITY_LAYERS.has(layerId);
  if (category) lines.push(`Recorded category: ${category.replace(/_/g, ' ')}`);
  else if (facility) lines.push(`Recorded category: ${NOT_REPORTED}`);
  if (operator || facility) lines.push(`Provider/operator (source record): ${operator || NOT_REPORTED}`);
  if (contact || facility) lines.push(`Contact (source record): ${contact || NOT_REPORTED}`);
  if (website) lines.push(`Website (source record): ${website}`);
  const address = value('addr:full', 'addr_full', 'address', 'addr:street');
  const city = value('addr:city', 'addr_city');
  if (address || city) lines.push(`Address (source record): ${[address, city].filter((v, i, a) => v && a.indexOf(v) === i).join(', ')}`);
  const admin = value('adm2_name', 'adm1_name');
  if (admin && HEALTH_LAYERS.has(layerId)) lines.push(`Admin area (source record): ${admin}`);
  if (facility) {
    lines.push(status ? `Recorded opening/status: ${status} (source record)` : `Recorded opening/status: ${NOT_REPORTED}`);
    const beds = value('beds', 'available_beds');
    lines.push(`Beds (source record): ${beds || NOT_REPORTED}`);
    const emergency = value('emergency');
    if (emergency) lines.push(`Emergency service (source record): ${emergency}`);
  }
  return lines;
}

/** Live-feed points carry name + detail + a few primitives. */
function liveLines(props, layerId) {
  const lines = [];
  if (layerId === 'live-earthquakes') {
    if (props.mag != null) lines.push(`Magnitude: ${props.mag}${props.magType ? ` ${props.magType}` : ''}`);
    if (props.time) lines.push(`Time: ${new Date(Number(props.time)).toISOString().replace('T', ' ').slice(0, 16)} UTC`);
    if (props.tsunami) lines.push('Tsunami flag set by USGS (check official warnings)');
    if (props.url) lines.push(`USGS event page: ${props.url}`);
    lines.push('Source: USGS earthquake feed (past day)');
    return lines;
  }
  if (layerId === 'live-satellites' || layerId === 'live-starlink') {
    lines.push(`NORAD: ${props.norad ?? NOT_REPORTED}`);
    lines.push(`Class: ${props.class_label || NOT_REPORTED}`);
    lines.push(`CelesTrak group: ${props.group || NOT_REPORTED}`);
    lines.push(`International designator: ${props.intl_designator || NOT_REPORTED}`);
    lines.push(`Altitude now: ${Number.isFinite(Number(props.altitude_km)) ? `${props.altitude_km} km (SGP4 from public elements)` : NOT_REPORTED}`);
    lines.push(`Operator / country: ${props.operator || props.country || NOT_REPORTED}`);
    lines.push('Source: CelesTrak GP elements via /api/celestrak');
    return lines;
  }
  if (layerId === 'caregap-global-satellites') {
    lines.push(`Triage rank: #${props.rank ?? NOT_REPORTED} · ${props.iso2 || NOT_REPORTED}`);
    lines.push(`Primary modelled hazard: ${props.hazard || NOT_REPORTED} (model estimate)`);
    if (props.event) lines.push(`Matched event: ${props.event}`);
    lines.push('Satellites overhead: live N2YO sweep loading below…');
    lines.push("Source: CareGap Live Multi-Hazard Engine · Golden-Hour Triage (Guru's Grace)");
    return lines;
  }
  if (props.detail) lines.push(String(props.detail));
  if (layerId === 'live-perimeters') lines.push('Perimeter as mapped by WFIGS/NIFC; containment and acreage are as reported.');
  if (layerId === 'live-cyclones') lines.push('Cone = forecast centre-track uncertainty, not storm size. Consult the official NHC advisory.');
  if (layerId === 'live-awareness') lines.push('Derived density of military ADS-B positions - not a threat assessment.');
  if (layerId === 'live-traffic') lines.push('Road class from OpenStreetMap only - no live congestion without a TomTom key.');
  if (props.url) lines.push(`Source: ${props.url}`);
  const skip = new Set(['name', 'detail', 'title', 'place', 'url', 'stream_url', 'camera_id', 'rotate', 'note']);
  for (const [k, v] of Object.entries(props)) {
    if (skip.has(k) || k.startsWith('_') || v === null || v === '' || typeof v === 'object') continue;
    if (lines.length >= 7) break;
    lines.push(`${k.replace(/_/g, ' ')}: ${v}`);
  }
  lines.push(`Source: ${layerTitle(layerId)}`);
  return lines;
}

/** Full card for a clicked feature: { title, lines, layerName }. */
export function cardFor(rawProps, layerId) {
  const props = normaliseProperties(rawProps);
  const title = featureLabel(props, layerId);
  const lines = [];
  const push = (line) => { const t = clampLine(line); if (t && !lines.includes(t)) lines.push(t); };
  if (SITE_PANEL_LAYERS.has(layerId) || layerId === 'local-antarctic-censored') {
    const co = Array.isArray(props.__coLocatedRecords) ? props.__coLocatedRecords : [];
    if (co.length) push(`Consolidated location marker: ${co.length + 1} co-located records at this site`);
    for (const l of infrastructureLines(props, layerId, title)) push(l);
    if (SITE_PANEL_LAYERS.has(layerId)) {
      for (const l of siteRecordLines(props, layerId)) push(l);
      if (HEALTH_LAYERS.has(layerId) || layerId === 'local-caregap-hazard') {
        push('Operation, capacity and safe access are not verified by this map.');
      }
    }
    if (props.osm_id || props.osm) push(`OpenStreetMap: ${props.osm || props.osm_id}`);
  } else {
    for (const l of liveLines(props, layerId)) push(l);
  }
  return { title, lines, layerName: layerTitle(layerId) };
}

/* ---------------- DOM card + map wiring --------------------------------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function linkify(text) {
  const safe = esc(text);
  return safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">link</a>');
}

const CSS = `
#poi-card{position:absolute;z-index:35;width:min(330px,calc(100vw - 24px));pointer-events:auto;
  background:linear-gradient(165deg,rgba(26,20,10,.96),rgba(10,8,5,.97));border:1px solid rgba(255,206,120,.45);
  border-radius:14px;box-shadow:0 18px 56px rgba(0,0,0,.65),0 0 36px rgba(255,190,90,.14);color:#f1e7d4;
  font:12px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;padding:11px 13px 10px;transform:translate(-50%,calc(-100% - 18px))}
#poi-card[hidden]{display:none}
#poi-card h3{margin:0 18px 2px 0;font:600 14.5px/1.3 Georgia,'Times New Roman',serif;color:#ffd98f}
#poi-card .lyr{font-size:9.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,214,140,.7);margin-bottom:6px}
#poi-card ul{margin:0;padding:0;list-style:none}
#poi-card li{padding:2px 0;border-bottom:1px solid rgba(255,210,140,.08)}
#poi-card li:last-child{border-bottom:0}
#poi-card a{color:#ffcf7a}
#poi-card .x{position:absolute;top:6px;right:8px;width:22px;height:22px;border:0;border-radius:50%;
  background:rgba(0,0,0,.4);color:#ffe6b0;cursor:pointer;font-size:14px;line-height:1}
#poi-card .co{margin-top:6px;font-size:10.5px;color:#cbb994}
#poi-card .n2yo span{color:#9fb3c4}
#poi-card .media img{width:100%;margin-top:6px;border-radius:8px;border:1px solid rgba(255,214,140,.35)}`;

function layerIdFrom(styleLayerId) {
  const extra = typeof window !== 'undefined' ? window.__pickLayers : null;
  if (extra?.has?.(styleLayerId)) return extra.get(styleLayerId);
  return styleLayerId.replace(/-(icons|labels|clusters|counts|band)$/, '');
}

/* CCTV frame (refreshed while the card is open) and radio playback - the
 * Cesium app's /api/cctv/frame/:id endpoint and the station's own stream. */
let mediaTimer = 0;
function stopMedia(card) {
  clearInterval(mediaTimer); mediaTimer = 0;
  card.querySelectorAll('audio').forEach((a) => { try { a.pause(); a.removeAttribute('src'); a.load(); } catch { /* gone */ } });
}
function attachMedia(card, props, layerId, lngLat) {
  stopMedia(card);
  if (layerId === 'caregap-global-satellites' && lngLat && window.__feeds?.n2yoAbove) {
    const box = document.createElement('div');
    box.className = 'co n2yo';
    box.textContent = 'Querying N2YO…';
    card.append(box);
    window.__feeds.n2yoAbove(lngLat[1], lngLat[0])
      .then((n) => { if (box.isConnected) box.innerHTML = window.__n2yoHtml ? window.__n2yoHtml(n) : esc(`${n?.totalAbove ?? NOT_REPORTED} overhead`); })
      .catch((e) => { if (box.isConnected) box.textContent = 'N2YO unavailable: ' + e.message; });
  }
  if (layerId === 'live-cctv' && props.camera_id != null) {
    const wrap = document.createElement('div');
    wrap.className = 'media';
    const img = document.createElement('img');
    img.alt = 'Latest camera frame';
    const url = () => `/api/cctv/frame/${encodeURIComponent(props.camera_id)}?t=${Date.now()}`;
    img.src = url();
    img.onerror = () => { wrap.textContent = 'Camera frame not available right now.'; };
    wrap.append(img);
    const note = document.createElement('div'); note.className = 'co'; note.textContent = MEDIA_NOTE + ' Frame refreshes every 10 s.';
    card.append(wrap, note);
    mediaTimer = setInterval(() => { if (img.isConnected) img.src = url(); }, 10000);
  }
  if (layerId === 'live-radio' && props.stream_url && /^https?:\/\//.test(String(props.stream_url))) {
    const audio = document.createElement('audio');
    audio.controls = true; audio.preload = 'none'; audio.src = String(props.stream_url);
    audio.style.width = '100%';
    const note = document.createElement('div'); note.className = 'co'; note.textContent = MEDIA_NOTE;
    card.append(audio, note);
  }
}

export function attachCards(map) {
  if (!map || map.__poiCards) return;
  map.__poiCards = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const card = document.createElement('div');
  card.id = 'poi-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  map.getContainer().append(card);
  let anchor = null;

  const place = () => {
    if (!anchor || card.hidden) return;
    const p = map.project(anchor);
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
  };
  const close = () => { stopMedia(card); card.hidden = true; anchor = null; };
  map.on('move', place);

  const routeActive = () => [...document.querySelectorAll('.modeBtn.active')]
    .some((b) => /^Route:/.test(b.textContent || '') && !/off$/.test(b.textContent || ''));

  const pickable = () => (map.getStyle()?.layers || [])
    .filter((l) => (l.layout?.visibility ?? 'visible') !== 'none')
    .map((l) => l.id)
    .filter((id) => /-(icons|clusters)$/.test(id) || window.__pickLayers?.has?.(id));

  map.on('click', async (e) => {
    if (routeActive()) return;
    const layers = pickable();
    if (!layers.length) return;
    const pad = 6;
    const box = [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]];
    const hits = map.queryRenderedFeatures(box, { layers });
    if (!hits.length) { close(); return; }
    const hit = hits[0];
    const coords = hit.geometry?.type === 'Point' ? hit.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];

    // A grouped badge zooms in to split, as in the Cesium app.
    if (hit.properties?.point_count != null || /-clusters$/.test(hit.layer.id)) {
      const src = map.getSource(hit.source);
      const id = hit.properties?.cluster_id;
      let zoom = map.getZoom() + 2;
      try {
        if (src?.getClusterExpansionZoom) {
          const r = src.getClusterExpansionZoom(id);
          zoom = typeof r?.then === 'function' ? await r : await new Promise((res, rej) =>
            src.getClusterExpansionZoom(id, (err, z) => (err ? rej(err) : res(z))));
        }
      } catch { /* fall back to +2 */ }
      close();
      map.easeTo({ center: coords, zoom: Math.min(zoom, 18), duration: 700 });
      return;
    }

    const layerId = layerIdFrom(hit.layer.id);
    const { title, lines, layerName } = cardFor(hit.properties || {}, layerId);
    const more = hits.length > 1 ? `<div class="co">${hits.length - 1} more record(s) under the pointer - zoom in to separate.</div>` : '';
    card.innerHTML = `<button class="x" type="button" aria-label="Close">x</button>
      <h3>${esc(title)}</h3><div class="lyr">${esc(layerName)}</div>
      <ul>${lines.map((l) => `<li>${linkify(l)}</li>`).join('')}</ul>${more}`;
    card.querySelector('.x').addEventListener('click', (ev) => { ev.stopPropagation(); close(); });
    attachMedia(card, normaliseProperties(hit.properties || {}), layerId,
      hit.geometry?.type === 'Point' ? hit.geometry.coordinates : null);
    anchor = coords;
    card.hidden = false;
    place();
    window.__poiCardLast = { layerId, title, lines };
  });

  map.on('mousemove', (e) => {
    const layers = pickable();
    if (!layers.length) return;
    const hit = map.queryRenderedFeatures(e.point, { layers }).length > 0;
    map.getCanvas().style.cursor = hit ? 'pointer' : '';
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.__poiCards = { cardFor, close };
}

(function waitForMap(tries = 0) {
  if (typeof window === 'undefined') return;
  const map = window.__map;
  if (map && typeof map.on === 'function') { attachCards(map); return; }
  if (tries < 600) setTimeout(() => waitForMap(tries + 1), 100);
})();
