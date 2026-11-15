/* Side-by-side resilience: two WebGL scenes starting at once can kill a pane on
 * a small GPU, so the Cesium pane loads a beat after the photoreal one, and
 * each pane gets a tiny reload button so a crashed half is one click away. */
const photoreal = document.getElementById('photoreal');
const cesium = document.getElementById('cesium');

// Stagger: start Cesium only after the photoreal globe has had its burst.
cesium.dataset.src = cesium.src;
cesium.removeAttribute('src');
setTimeout(() => {
  if (!cesium.src) cesium.src = cesium.dataset.src;
}, 8000);

// Auto-enter the Cesium app once its frame is up.
cesium.addEventListener('load', () => {
  const w = cesium.contentWindow;
  const tryEnter = (attempt) => {
    try {
      w.__gevStartApplication?.();
      const b = [...w.document.querySelectorAll('button')].find((x) => /enter/i.test(x.textContent || ''));
      if (b) { b.click(); return; }
    } catch { /* frame not ready */ }
    if (attempt < 60) setTimeout(() => tryEnter(attempt + 1), 1000);
  };
  tryEnter(0);
});

// Per-pane reload buttons.
for (const [frame, name] of [[photoreal, 'reload photoreal'], [cesium, 'reload cesium']]) {
  const btn = document.createElement('button');
  btn.textContent = '↻';
  btn.title = name;
  btn.style.cssText = 'position:absolute;z-index:20;right:10px;top:10px;width:30px;height:30px;border-radius:6px;border:1px solid #2a3a4a;background:#0b1420dd;color:#9fd;font-size:15px;cursor:pointer;';
  btn.addEventListener('click', () => { frame.src = frame.dataset.src || frame.src; });
  frame.parentElement.appendChild(btn);
}
