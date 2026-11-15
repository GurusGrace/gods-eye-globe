/* A/B test for the two globe engines, measured strictly one at a time.
 *
 * Running both at once measures contention, not engines: with the Cesium app
 * alive in a second iframe the MapLibre globe fell from 37 fps to 2.5. So each
 * pass loads exactly one engine, stores its numbers, and the bare page prints
 * the comparison.
 *
 *   /globe-test.html?engine=ml   MapLibre only
 *   /globe-test.html?engine=cz   Cesium only
 *   /globe-test.html             comparison table
 */

const KEY = 'gev-globe-ab';
const frame = document.getElementById('frame');
const panel = document.getElementById('panel');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (m) => { statusEl.textContent = m; };
const engine = new URL(location.href).searchParams.get('engine');

const readStore = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const writeStore = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* blocked */ } };

async function waitFor(check, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (check()) return true; } catch { /* not ready */ }
    await sleep(400);
  }
  say('timed out waiting for ' + label);
  return false;
}

/* Frame-rate of whatever the frame is doing, counted in the frame's own rAF. */
function fpsMeter(w) {
  return (ms) => new Promise((resolve) => {
    let frames = 0;
    const t0 = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - t0 < ms) w.requestAnimationFrame(tick);
      else resolve(frames / (ms / 1000));
    };
    w.requestAnimationFrame(tick);
  });
}

async function measureMapLibre(w) {
  const map = w.__map;
  const fps = fpsMeter(w);
  const z0 = map.getZoom();
  const zp = fps(4000);
  map.easeTo({ zoom: z0 + 2, duration: 4000, essential: true });
  const zoom = await zp;
  await sleep(700);

  const sp = fps(4000);
  const b0 = map.getBearing();
  const t0 = performance.now();
  const spin = () => {
    const k = (performance.now() - t0) / 4000;
    map.setBearing(b0 + k * 90);
    if (k < 1) w.requestAnimationFrame(spin);
  };
  w.requestAnimationFrame(spin);
  const spinFps = await sp;

  const c = map.getCanvas();
  return { zoom, spin: spinFps, sharp: c.width / c.clientWidth, note: 'globe projection, imagery + clustered records' };
}

async function measureCesium(w) {
  const viewer = w.__gevViewer;
  const scene = viewer.scene;
  const fps = fpsMeter(w);

  const zp = fps(4000);
  const t0 = performance.now();
  const zoom = () => {
    const k = (performance.now() - t0) / 4000;
    try { viewer.camera.zoomOut(90000); } catch { /* mid-tween */ }
    if (k < 1) w.requestAnimationFrame(zoom);
  };
  w.requestAnimationFrame(zoom);
  const zoomFps = await zp;
  await sleep(900);

  const sp = fps(4000);
  const t1 = performance.now();
  const spin = () => {
    const k = (performance.now() - t1) / 4000;
    try { viewer.camera.rotate({ x: 0, y: 0, z: 1 }, 0.004); } catch { /* ignored */ }
    if (k < 1) w.requestAnimationFrame(spin);
  };
  w.requestAnimationFrame(spin);
  const spinFps = await sp;

  const c = w.document.querySelector('canvas');
  return {
    zoom: zoomFps,
    spin: spinFps,
    sharp: c.width / c.clientWidth,
    note: `${scene.primitives.length} primitives, resolutionScale ${viewer.resolutionScale.toFixed(2)}`,
  };
}

async function runOne(which) {
  const isMl = which === 'ml';
  const f = document.createElement('iframe');
  f.src = isMl ? './globe-maplibre.html?embed=1' : './index.html?embed=1';
  f.title = isMl ? 'MapLibre globe' : 'Cesium app';
  frame.appendChild(f);
  say(`loading ${isMl ? 'MapLibre globe' : 'Cesium app'}…`);
  const w = await waitFor(() => f.contentWindow, 20000, 'frame') ? f.contentWindow : null;
  if (!w) return;

  if (!isMl) {
    await waitFor(() => w.document && w.document.querySelectorAll('button').length > 0, 60000, 'Cesium UI');
    try {
      w.eval(`(() => {
        try { window.__gevStartApplication && window.__gevStartApplication(); } catch (e) {}
        const b = [...document.querySelectorAll('button')].find(x => /enter/i.test(x.textContent || ''));
        if (b) b.click();
      })()`);
    } catch { /* already started */ }
    const ok = await waitFor(() => w.__gevViewer && w.__gevViewer.scene, 180000, 'Cesium viewer');
    if (!ok) return;
  } else {
    const ok = await waitFor(() => w.__map && w.__map.loaded(), 120000, 'MapLibre map');
    if (!ok) return;
  }

  say('warming up…');
  await sleep(18000);
  say(`measuring ${isMl ? 'MapLibre' : 'Cesium'}…`);
  const result = isMl ? await measureMapLibre(w) : await measureCesium(w);

  const all = readStore();
  all[which] = result;
  all[which + 'At'] = new Date().toISOString();
  writeStore(all);

  say('done — numbers saved');
  resultsEl.innerHTML = `<table>
    <tr><th>${isMl ? 'MapLibre globe' : 'Cesium app'}</th><th>value</th></tr>
    <tr><td>zoom fps</td><td>${result.zoom.toFixed(1)}</td></tr>
    <tr><td>spin fps</td><td>${result.spin.toFixed(1)}</td></tr>
    <tr><td>sharpness (buffer px / CSS px)</td><td>${result.sharp.toFixed(2)}</td></tr>
  </table>
  <div style="margin-top:8px"><a href="./globe-test.html">→ open the comparison table</a></div>`;
  window.__abOne = result;
}

function showComparison() {
  document.body.classList.add('compare');
  const all = readStore();
  const ml = all.ml, cz = all.cz;
  if (!ml || !cz) {
    say('not enough measurements yet — run both passes:');
    resultsEl.innerHTML = `
      <div style="margin-top:8px"><a href="./globe-test.html?engine=ml">1. measure MapLibre globe</a></div>
      <div><a href="./globe-test.html?engine=cz">2. measure Cesium app</a></div>
      <div style="margin-top:6px;color:#8aa">have: ${ml ? 'MapLibre' : ''} ${cz ? 'Cesium' : ''}</div>`;
    return;
  }
  const win = (a, b) => (a > b ? 'win' : 'lose');
  say('measured one engine at a time; higher fps is better, sharpness 1.00 = native pixels');
  const gain = (ml.zoom / cz.zoom).toFixed(1);
  resultsEl.innerHTML = `
    <table>
      <tr><th>metric</th><th>MapLibre globe</th><th>Cesium app</th></tr>
      <tr><td>zoom fps</td><td class="${win(ml.zoom, cz.zoom)}">${ml.zoom.toFixed(1)}</td><td class="${win(cz.zoom, ml.zoom)}">${cz.zoom.toFixed(1)}</td></tr>
      <tr><td>spin fps</td><td class="${win(ml.spin, cz.spin)}">${ml.spin.toFixed(1)}</td><td class="${win(cz.spin, ml.spin)}">${cz.spin.toFixed(1)}</td></tr>
      <tr><td>sharpness</td><td class="${win(ml.sharp, cz.sharp)}">${ml.sharp.toFixed(2)}</td><td class="${win(cz.sharp, ml.sharp)}">${cz.sharp.toFixed(2)}</td></tr>
      <tr><td>content</td><td>${ml.note}</td><td>${cz.note}</td></tr>
    </table>
    <div style="margin-top:8px">MapLibre is <b>${gain}×</b> the zoom frame rate at the same sharpness.</div>
    <div style="margin-top:6px"><a href="./globe-test.html?engine=ml">re-measure MapLibre</a> · <a href="./globe-test.html?engine=cz">re-measure Cesium</a> · <a href="./globe-compare.html">side-by-side view</a></div>`;
  window.__abResult = { maplibre: ml, cesium: cz, gain: Number(gain) };
}

if (engine === 'ml' || engine === 'cz') runOne(engine);
else showComparison();
