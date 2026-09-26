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
// A "face": rounded-square frame drawn as a THICK STROKE (not a filled rect),
// plus two ring eyes. This is the double-line-frame complaint.
const W = 300, H = 300;
const img = makeGray(W, H, (x, y) => {
  // thick rounded-rect stroke, width ~8, centered on a 220x180 rounded rect
  const rx = Math.abs(x - 150) - 100, ry = Math.abs(y - 150) - 80;
  const d = Math.hypot(Math.max(rx, 0), Math.max(ry, 0)) + Math.min(Math.max(rx, ry), 0);
  const frame = Math.abs(d) <= 4;
  // two ring eyes
  const eL = Math.abs(Math.hypot(x - 110, y - 140) - 18) <= 3;
  const eR = Math.abs(Math.hypot(x - 190, y - 140) - 18) <= 3;
  return (frame || eL || eR) ? 0 : 255;
});

const gray = C.boxBlur(C.toGray(img.data, W * H, false), W, H, 1);
const bin = C.binarize(gray, C.otsu(gray));
const raw = C.traceContours(bin, W, H);
const loops = raw.map(pts => {
  const ar = C.signedArea(pts);
  return { pts, area: Math.abs(ar), hole: ar < 0 };
}).filter(l => l.area >= 24)
  .sort((a, b) => (a.hole ? 1 : 0) - (b.hole ? 1 : 0) || b.area - a.area);
console.log('loops:', loops.length, loops.map(l => (l.hole ? 'hole ' : 'outer ') + l.area.toFixed(0)).join(' | '));

for (const thin of [0, 6, 8, 10, 12]) {
  const built = C.buildEntities(loops, { eps: 1, mode: 'prim', thinWidth: thin, circle: true, ctol: 0.02, revHole: false });
  const kinds = {};
  for (const e of built.entities) {
    const k = e.type === 'PLINE' ? 'PLINE:' + (e.pts.length >> 1) : e.type === 'CIRCLE' ? 'CIRCLE' : e.type + ':' + (e.pts.length >> 1) + 'pts';
    kinds[k] = (kinds[k] || 0) + 1;
  }
  console.log(`thin=${String(thin).padStart(2)} strokes=${built.nStroke} lines=${built.nLine} arcs=${built.nArc} circles=${built.nCircle} plines=${built.nPline}  ${JSON.stringify(kinds)}`);
  if (thin === 8) {
    for (const e of built.entities) {
      if (e.type === 'CIRCLE') console.log('   CIRCLE c=(' + e.cx.toFixed(1) + ',' + e.cy.toFixed(1) + ') r=' + e.r.toFixed(1));
      else if (e.type === 'LINE') console.log('   LINE (' + e.pts[0].toFixed(1) + ',' + e.pts[1].toFixed(1) + ')->(' + e.pts[2].toFixed(1) + ',' + e.pts[3].toFixed(1) + ')');
      else if (e.type === 'ARC') console.log('   ARC  c=(' + e.cx.toFixed(1) + ',' + e.cy.toFixed(1) + ') r=' + e.r.toFixed(1));
      else console.log('   PLINE ' + (e.pts.length >> 1) + 'pts');
    }
  }
}
