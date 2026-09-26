import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
(0, eval)(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1]);
const C = globalThis.Image2Cad;

function makeGray(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x, y), o = (y * w + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
  }
  return { data: d, w, h };
}
function run(img, w, h, thin) {
  let g = C.toGray(img.data, w * h, false);
  g = C.boxBlur(g, w, h, 1);
  const bin = C.binarize(g, C.otsu(g));
  const raw = C.traceContours(bin, w, h);
  const loops = raw.map(p => { const ar = C.signedArea(p); return { pts: p, area: Math.abs(ar), hole: ar < 0 }; })
    .filter(l => l.area >= 24).sort((a, b) => (a.hole ? 1 : 0) - (b.hole ? 1 : 0) || b.area - a.area);
  return { loops, built: C.buildEntities(loops, { eps: 1, mode: 'prim', thinWidth: thin, circle: true, ctol: 0.02, revHole: false }) };
}
// Measure the largest gap between consecutive LINE endpoints in a chain
function gaps(ents) {
  const L = ents.filter(e => e.type === 'LINE');
  let worst = 0, pairs = 0;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i].pts, b = L[j].pts;
    const d = Math.min(
      Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(a[0] - b[2], a[1] - b[3]),
      Math.hypot(a[2] - b[0], a[3] - b[1]), Math.hypot(a[2] - b[2], a[3] - b[3]));
    if (d < 6) { pairs++; if (d > worst) worst = d; }
  }
  return { worst, pairs, n: L.length };
}

console.log('--- closed frame (rect outline stroke) ---');
{
  const W = 300, H = 300, t = 6;
  const img = makeGray(W, H, (x, y) => {
    const on = (x >= 60 && x <= 240 && y >= 60 && y <= 240);
    const inner = (x > 60 + t && x < 240 - t && y > 60 + t && y < 240 - t);
    return (on && !inner) ? 0 : 255;
  });
  const { loops, built } = run(img, W, H, 12);
  console.log('loops', loops.length, 'ents', built.entities.map(e => e.type).join(','));
  console.log('gaps', JSON.stringify(gaps(built.entities)));
}
console.log('--- right angle: two crossing bars ---');
{
  const W = 300, H = 300;
  const img = makeGray(W, H, (x, y) => {
    const h = (x >= 50 && x <= 250 && y >= 145 && y <= 155);
    const v = (y >= 50 && y <= 250 && x >= 145 && x <= 155);
    return (h || v) ? 0 : 255;
  });
  const { loops, built } = run(img, W, H, 12);
  console.log('loops', loops.length, 'ents', built.entities.map(e => e.type).join(','));
  console.log('gaps', JSON.stringify(gaps(built.entities)));
}
console.log('--- triangle outline (sharp corners) ---');
{
  const W = 400, H = 400;
  // exact triangle: (80,80) (320,80) (200,330)
  const tri = [[80, 80], [320, 80], [200, 330]];
  const inside = (x, y) => {
    const s = (a, b, c) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    const d1 = s(tri[0], tri[1], [x, y]), d2 = s(tri[1], tri[2], [x, y]), d3 = s(tri[2], tri[0], [x, y]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  };
  const img = makeGray(W, H, (x, y) => {
    let d = 1e9;
    for (let i = 0; i < 3; i++) {
      const a = tri[i], b = tri[(i + 1) % 3];
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy)));
      d = Math.min(d, Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy));
    }
    return (inside(x, y) && d > 5) ? 0 : 255;
  });
  const { loops, built } = run(img, W, H, 12);
  console.log('loops', loops.length, 'ents', built.entities.map(e => e.type).join(','));
  console.log('gaps', JSON.stringify(gaps(built.entities)));
  for (const e of built.entities.filter(e => e.type === 'LINE')) {
    console.log('   (' + e.pts.map(v => v.toFixed(1)).join(',') + ') len=' + Math.hypot(e.pts[2] - e.pts[0], e.pts[3] - e.pts[1]).toFixed(1));
  }
}
