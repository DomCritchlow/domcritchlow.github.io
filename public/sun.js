// Today's sun as a pixel grid, drawn from NOAA's active-region feed.
// Same idea as Helio (web): each region sits at its real heliographic
// position, sized by its area. North is up and solar west is on the right,
// as seen from Earth.
(function () {
  const canvas = document.getElementById('sun');
  if (!canvas) return;
  const caption = document.getElementById('sun-caption');
  const ctx = canvas.getContext('2d');

  const GRID = 56;
  const RADIUS = 27;
  const C = GRID / 2;
  // Whole device pixels per cell so the pixels stay crisp
  const dpr = window.devicePixelRatio || 1;
  const SCALE = Math.max(4, Math.round(4.5 * dpr));
  canvas.width = canvas.height = GRID * SCALE;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Limb darkening: the disk dims toward the edge, I = 1 - u(1 - mu)
  function diskColor(r2) {
    const mu = Math.sqrt(Math.max(0, 1 - r2 / (RADIUS * RADIUS)));
    const i = 1 - 0.7 * (1 - mu);
    return `rgb(${Math.round(225 + 30 * i)}, ${Math.round(70 + 150 * i)}, ${Math.round(20 + 100 * i * i)})`;
  }

  function spotMap(regions) {
    const spots = new Map();
    for (const r of regions) {
      const lat = (r.latitude * Math.PI) / 180;
      const lon = (r.longitude * Math.PI) / 180;
      if (Math.abs(r.longitude) >= 90) continue; // behind the limb
      // NOAA gives west longitudes as negative; west is on the right
      const x = C - Math.cos(lat) * Math.sin(lon) * RADIUS;
      const y = C - Math.sin(lat) * RADIUS;
      const spotR = Math.max(1.5, Math.sqrt(r.area ?? 20) * 0.2);
      for (let gy = Math.floor(y - spotR); gy <= Math.ceil(y + spotR); gy++) {
        for (let gx = Math.floor(x - spotR); gx <= Math.ceil(x + spotR); gx++) {
          const d = Math.hypot(gx - x, gy - y);
          if (d > spotR) continue;
          const key = gy * GRID + gx;
          const type = d / spotR < 0.5 ? 'umbra' : 'penumbra';
          if (spots.get(key) !== 'umbra') spots.set(key, type);
        }
      }
    }
    return spots;
  }

  function draw(regions) {
    const spots = spotMap(regions);
    const cells = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const r2 = (gx + 0.5 - C) ** 2 + (gy + 0.5 - C) ** 2;
        if (r2 > RADIUS * RADIUS) continue;
        const spot = spots.get(gy * GRID + gx);
        const color = spot === 'umbra' ? '#1f0c04' : spot === 'penumbra' ? '#7a2e0c' : diskColor(r2);
        cells.push({ gx, gy, color, order: Math.sqrt(r2) });
      }
    }
    // Fill from the center out
    cells.sort((a, b) => a.order - b.order);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const paint = (c) => {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.gx * SCALE, c.gy * SCALE, SCALE, SCALE);
    };
    if (reduceMotion) return cells.forEach(paint);

    const start = performance.now();
    const duration = 700;
    let i = 0;
    (function frame(now) {
      const target = Math.min(cells.length, Math.ceil(((now - start) / duration) * cells.length));
      for (; i < target; i++) paint(cells[i]);
      if (i < cells.length) requestAnimationFrame(frame);
    })(start);
  }

  function setCaption(date, count) {
    if (!caption || !date) return;
    const d = new Date(date + 'T00:00:00Z');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    caption.textContent = `The sun on ${label} · ${count} active region${count === 1 ? '' : 's'}`;
  }

  fetch('https://services.swpc.noaa.gov/json/solar_regions.json')
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((all) => {
      const latest = all.reduce((m, r) => (r.observed_date > m ? r.observed_date : m), '');
      const today = all.filter((r) => r.observed_date === latest);
      draw(today);
      setCaption(latest, today.length);
    })
    .catch(() => draw([]));
})();
