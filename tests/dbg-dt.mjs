import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
(0, eval)(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1]);
const C = globalThis.Image2Cad;

// DT unit test: solid horizontal bar of ink, w x h, inside a (w+2) x (h+2) patch
for (const [w, h] of [[140, 10], [140, 4], [8, 8], [4, 140], [20, 20]]) {
  const pw = w + 2, ph = h + 2;
  const data = new Uint8Array(pw * ph);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[(y + 1) * pw + (x + 1)] = 1;
  const dt = C.distanceTransform(pw, ph, data);
  let mx = 0, cnt = 0;
  for (let i = 0; i < dt.length; i++) { if (dt[i] > mx && dt[i] < 1e9) mx = dt[i]; if (dt[i] > 1.5) cnt++; }
  console.log(`bar ${w}x${h}: expect ~${(Math.min(w, h) / 2).toFixed(2)}  got max=${mx.toFixed(2)} (count>1.5: ${cnt})`);
}
// annulus
{
  const pw = 90, ph = 90, data = new Uint8Array(pw * ph);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const d = Math.hypot(x - 44.5, y - 44.5);
    if (d >= 37 && d <= 43) data[y * pw + x] = 1;
  }
  const dt = C.distanceTransform(pw, ph, data);
  let mx = 0;
  for (let i = 0; i < dt.length; i++) if (dt[i] > mx && dt[i] < 1e9) mx = dt[i];
  console.log(`annulus 37..43: expect ~3  got max=${mx.toFixed(2)}`);
}
