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
function pipeline(img, thin) {
  const g = C.toGray(img.data, img.w * img.h, false);
  const blurred = C.boxBlur(g, img.w, img.h, 1);
  const bin = C.binarize(blurred, C.otsu(blurred));
  const raw = C.traceContours(bin, img.w, img.h);
  return raw.map(pts => { const ar = C.signedArea(pts); return { pts, area: Math.abs(ar), hole: ar < 0 }; })
    .filter(l => l.area >= 24).sort((a, b) => (a.hole ? 1 : 0) - (b.hole ? 1 : 0) || b.area - a.area);
}

// diagonal bar of given width and angle, centered
function diag(w, h, thick, deg) {
  const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const nx = -dy, ny = dx, L = Math.hypot(w, h), cx = w / 2, cy = h / 2;
  return makeGray(w, h, (x, y) => {
    const px = x - cx, py = y - cy;
    const t = px * dx + py * dy, s = px * nx + py * ny;
    return (Math.abs(t) < L / 2 - thick && Math.abs(s) < thick / 2) ? 0 : 255;
  });
}

console.log('--- diagonal bars through FULL buildEntities (eps=1 default, mode=prim) ---');
for (const deg of [0, 15, 30, 45, 60, 75, 90]) {
  for (const th of [2, 4, 6, 8, 10]) {
    const img = diag(260, 260, th, deg);
    const loops = pipeline(img);
    const b = C.buildEntities(loops, { eps: 1, mode: 'prim', thinWidth: 12, circle: true, ctol: 0.02, revHole: false });
    const kinds = {};
    for (const e of b.entities) kinds[e.type] = (kinds[e.type] || 0) + 1;
    const onlyLine = b.entities.length && b.entities.every(e => e.type === 'LINE');
    const flag = onlyLine ? 'OK  ' : 'BAD ';
    console.log(`${flag}deg=${String(deg).padStart(2)} w=${String(th).padStart(2)} loops=${loops.length} strokes=${b.nStroke} ents=${b.entities.length} ${JSON.stringify(kinds)}`);
  }
}
