/* Fallback engine: globe-maplibre.html?engine=cesium opens the original
 * Cesium application (index.html, which itself only boots Cesium when the
 * URL carries ?engine=cesium - otherwise it hands over to this map).
 * Loaded as a file because the page's Content-Security-Policy does not allow
 * inline scripts. */
(function () {
  try {
    var q = new URLSearchParams(location.search);
    if ((q.get('engine') || '').toLowerCase() !== 'cesium') return;
    q.delete('cover'); // the Cesium page shows its own launch cover
    location.replace('/?' + q.toString() + location.hash);
  } catch (e) { /* stay on the map */ }
})();
