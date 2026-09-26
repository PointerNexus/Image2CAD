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
const img = makeGray(200, 120, (x, y) => {
  const inY = y >= 55 && y <= 65, inX = x >= 30 && x <= 170;
  const capL = Math.hypot(x - 30, y - 60) <= 5, capR = Math.hypot(x - 170, y - 60) <= 5;
  return (inY && inX || capL || capR) ? 0 : 255;
});
const bin = C.binarize(C.toGray(img.data, img.w * img.h, false), 128);
const raw = C.traceContours(bin, img.w, img.h);
console.log('strokePaths(12) =', JSON.stringify((C.strokePaths(raw[0], 12) || []).map(p => p.length / 2)));
console.log('strokePaths(6)  =', JSON.stringify((C.strokePaths(raw[0], 6) || []).map(p => p.length / 2)));
const loops = raw.map(pts => {
  const ar = C.signedArea(pts);
  return { pts, area: Math.abs(ar), hole: ar < 0 };
});
console.log('loops:', loops.length, loops.map(l => l.area.toFixed(0)).join(','));
const built = C.buildEntities(loops, { mode: 'prim', thinWidth: 12, eps: 1, circle: true, ctol: 0.02 });
const ents = built.ents || built.entities || built.vecs;
console.log('keys:', Object.keys(built));
const byType = {};
for (const e of ents) {
  const k = e.type === 'PLINE' ? 'PLINE:' + ((e.pts.length >> 1) + 'pts') : e.type === 'CIRCLE' ? 'CIRCLE:r=' + e.r.toFixed(1) : e.type + ':' + (e.pts.length >> 1) + 'pts r=' + (e.r ? e.r.toFixed(1) : '-');
  byType[k] = (byType[k] || 0) + 1;
}
console.log(ents.length, 'entities', JSON.stringify({ nLine: built.nLine, nArc: built.nArc, nCircle: built.nCircle, nPline: built.nPline, nStroke: built.nStroke }));
for (const [k, v] of Object.entries(byType)) console.log('  ', k, 'x' + v);
