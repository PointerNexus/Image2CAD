import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
let core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
core = core.replace('  if (!brs.length) { brs.push({ f: 0, g: m - 1, len: total }); }',
  '  if (!brs.length) { brs.push({ f: 0, g: m - 1, len: total }); }\n' +
  '  console.log("DBG m=" + m + " total=" + total.toFixed(0) + " nturns=" + turns.length + " turncum=" + turns.map(function(t){return cum[t].toFixed(0);}).join(","));');
core = core.replace('  brs.sort(function (a, b) { return b.len - a.len; });',
  '  brs.sort(function (a, b) { return b.len - a.len; });\n' +
  '  console.log("DBG brs=" + JSON.stringify(brs.map(function(b){return [b.f, b.g, +b.len.toFixed(0)];})));');
core = core.replace('  var res = [], rel = [], q, N = Math.max(8, Math.round(B1.len));',
  '  console.log("DBG B1.len=" + B1.len.toFixed(0) + " B2=" + (B2 ? B2.len.toFixed(0) : "none"));\n' +
  '  var res = [], rel = [], q, N = Math.max(8, Math.round(B1.len));');
core = core.replace('  if (Math.sqrt(dx * dx + dy * dy) < 1.5 && med > 2) return null;',
  '  console.log("DBG enddist=" + Math.sqrt(dx*dx+dy*dy).toFixed(2) + " med=" + med.toFixed(2) + " nres=" + (res.length/2));\n' +
  '  if (Math.sqrt(dx * dx + dy * dy) < 1.5 && med > 2) { console.log("DBG rejected as ring/closed"); return null; }');
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
const which = process.argv[2] || 'racetrack';
const cases = {
  racetrack: [makeGray(200, 120, (x, y) => {
    const inY = y >= 55 && y <= 65, inX = x >= 30 && x <= 170;
    const capL = Math.hypot(x - 30, y - 60) <= 5, capR = Math.hypot(x - 170, y - 60) <= 5;
    return (inY && inX || capL || capR) ? 0 : 255;
  }), null],
  arc: [makeGray(200, 200, (x, y) => {
    const d = Math.hypot(x - 100, y - 100), ang = Math.atan2(y - 100, x - 100);
    return (d >= 57 && d <= 63 && ang > -1.2 && ang < 1.2) ? 0 : 255;
  }), 100],
  ring: [makeGray(160, 160, (x, y) => (Math.hypot(x - 80, y - 80) >= 37 && Math.hypot(x - 80, y - 80) <= 43) ? 0 : 255), null],
};
const [img, cx] = cases[which];
const bin = C.binarize(C.toGray(img.data, img.w * img.h, false), 128);
const L = C.traceContours(bin, img.w, img.h)[0];
const p = C.rasterizeLoop(L);
const dt = C.distanceTransform(p.w, p.h, p.data);
let D = 0;
for (let i = 0; i < dt.length; i++) if (dt[i] > D && dt[i] < 1e9) D = dt[i];
console.log('== ' + which + ' D=' + D.toFixed(2) + ' cw=' + JSON.stringify(C.caliperWidths(L).map(v => +v.toFixed(1))));
const r = C.strokeCenterline(L, p, dt, D);
if (!r) { console.log('  => null'); process.exit(0); }
const n = r.length / 2;
const rdp = C.rdpRange(r, 0, n - 1, 0.6);
console.log('  => n=' + n + ' rdp=' + (rdp.length / 2) + ' lineErr=' + C.lineErr(rdp, 0, rdp.length / 2 - 1).toFixed(3) +
  ' arcFit=' + JSON.stringify(C.arcFitRange(rdp, 0, rdp.length / 2 - 1)));
if (cx) {
  let rmin = 1e9, rmax = 0;
  for (let i = 0; i < n; i++) { const rr = Math.hypot(r[i * 2] - cx, r[i * 2 + 1] - cx); rmin = Math.min(rmin, rr); rmax = Math.max(rmax, rr); }
  console.log('  r=' + rmin.toFixed(2) + '..' + rmax.toFixed(2));
}
