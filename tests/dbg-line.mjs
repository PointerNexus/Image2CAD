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
function run(img, eps = 1, thin = 8) {
  const bin = C.binarize(C.toGray(img.data, img.w * img.h, false), 128);
  const raw = C.traceContours(bin, img.w, img.h);
  const loops = [];
  for (const p of raw) {
    const ar = C.signedArea(p);
    const bb = C.bbox(p);
    loops.push({ pts: p, area: Math.abs(ar), hole: ar < 0, bw: bb[2] - bb[0], bh: bb[3] - bb[1] });
  }
  const b = C.buildEntities(loops, { eps, mode: 'prim', thinWidth: thin, circle: true, ctol: 0.03, revHole: false });
  return { loops, b };
}

console.log('=== 斜粗线 8px 宽 ===');
{
  const img = makeGray(160, 160, (x, y) => {
    const yy = Math.round(80 + (x - 80) * 0.5);
    return (Math.abs(y - yy) <= 4 && x >= 20 && x <= 120) ? 0 : 255;
  });
  const { loops, b } = run(img);
  const L = loops[0];
  console.log('loop bbox', L.bw.toFixed(0) + 'x' + L.bh.toFixed(0), 'area', L.area.toFixed(0));
  console.log('entities:', b.entities.map(e => e.type + (e.pts ? ':' + (e.pts.length / 2) + 'pts' : ':r' + e.r.toFixed(1))).join(' '));
  console.log('nStroke', b.nStroke);
  console.log('perimeter-2A/P mean width =', (2 * L.area / (2 * (L.bw + L.bh))).toFixed(2));
}

console.log('\n=== 斜细线 2px 宽 ===');
{
  const img = makeGray(160, 160, (x, y) => {
    const yy = Math.round(80 + (x - 80) * 0.5);
    return (Math.abs(y - yy) <= 1 && x >= 20 && x <= 130) ? 0 : 255;
  });
  const { loops, b } = run(img);
  console.log('loops', loops.length, 'entities:', b.entities.map(e => e.type).join(' '));
}

console.log('\n=== 圆弧笔画 (r=60, 宽 6) ===');
{
  const img = makeGray(200, 200, (x, y) => {
    const d = Math.hypot(x - 100, y - 100);
    const inArc = d >= 57 && d <= 63;
    const ang = Math.atan2(y - 100, x - 100);
    return (inArc && ang > -1.2 && ang < 1.2) ? 0 : 255;
  });
  const { loops, b } = run(img);
  console.log('loops', loops.length, 'bbox', loops[0].bw.toFixed(0) + 'x' + loops[0].bh.toFixed(0));
  console.log('entities:', b.entities.map(e => e.type).join(' '), '| nPline', b.nPline);
}
