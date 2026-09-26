import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
(0, eval)(core);
const C = globalThis.Image2Cad;

function makeGray(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x, y), o = (y * w + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
  }
  return { data: d, w, h };
}
function analyze(name, img, cx, cy) {
  const bin = C.binarize(C.toGray(img.data, img.w * img.h, false), 128);
  const L = C.traceContours(bin, img.w, img.h)[0];
  const p = C.rasterizeLoop(L);
  const dt = C.distanceTransform(p.w, p.h, p.data);
  let D = 0;
  for (let i = 0; i < dt.length; i++) if (dt[i] > D && dt[i] < 1e9) D = dt[i];
  const r = C.strokeCenterline(L, p, dt, D);
  if (!r) { console.log(name, '-> null'); return; }
  const n = r.length / 2;
  const rdp = C.rdpRange(r, 0, n - 1, 0.6);
  const rn = rdp.length / 2;
  const fit = C.arcFitRange(rdp, 0, rn - 1);
  const line = C.lineErr(rdp, 0, rn - 1);
  let extra = '';
  if (cx !== null) {
    let rmin = 1e9, rmax = 0;
    for (let i = 0; i < n; i++) {
      const rr = Math.hypot(r[i * 2] - cx, r[i * 2 + 1] - cy);
      rmin = Math.min(rmin, rr); rmax = Math.max(rmax, rr);
    }
    extra = ' r=' + rmin.toFixed(2) + '..' + rmax.toFixed(2);
  }
  console.log(name, 'n=' + n, 'rdp=' + rn, 'lineErr=' + line.toFixed(3),
    'arcFit=' + (fit ? 'r=' + fit.r.toFixed(2) + ' err=' + fit.err.toFixed(2) + ' sweep=' + (fit.sweep !== undefined ? fit.sweep.toFixed(2) : '-') : 'NULL') + extra);
  return { r, rdp, fit, n };
}

const cases = {
  'diag 8px': [makeGray(160, 60, (x, y) => { const yy = Math.round(30 + (x - 30) * 0.5); return (Math.abs(y - yy) <= 4 && x >= 10 && x <= 130) ? 0 : 255; }), null, null],
  'diag 2px': [makeGray(160, 60, (x, y) => { const yy = Math.round(30 + (x - 30) * 0.5); return (Math.abs(y - yy) <= 1 && x >= 10 && x <= 130) ? 0 : 255; }), null, null],
  'horiz 4px': [makeGray(160, 20, (x, y) => ((y >= 8 && y <= 11 && x >= 10 && x <= 130) ? 0 : 255)), null, null],
  'vert 6px': [makeGray(40, 160, (x, y) => ((x >= 17 && x <= 22 && y >= 10 && y <= 130) ? 0 : 255)), null, null],
  'arc r60 w6': [makeGray(200, 200, (x, y) => { const d = Math.hypot(x - 100, y - 100), a = Math.atan2(y - 100, x - 100); return (d >= 57 && d <= 63 && a > -1.2 && a < 1.2) ? 0 : 255; }), 100, 100],
  'racetrack': [makeGray(200, 120, (x, y) => { const inY = y >= 55 && y <= 65, inX = x >= 30 && x <= 170; const capL = Math.hypot(x - 30, y - 60) <= 5, capR = Math.hypot(x - 170, y - 60) <= 5; const bar = inY && inX; return (bar || capL || capR) ? 0 : 255; }), null, null],
  'ring r40 w6': [makeGray(160, 160, (x, y) => { const d = Math.hypot(x - 80, y - 80); return (d >= 37 && d <= 43) ? 0 : 255; }), null, null],
  'blob r25': [makeGray(120, 120, (x, y) => (Math.hypot(x - 60, y - 60) <= 25 ? 0 : 255)), null, null],
  'rect 60x30': [makeGray(120, 80, (x, y) => (x >= 20 && x <= 80 && y >= 20 && y <= 50 ? 0 : 255)), null, null],
};
for (const [nm, [img, cx, cy]] of Object.entries(cases)) analyze(nm, img, cx, cy);
