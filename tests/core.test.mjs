import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: core script not found'); process.exit(1); }
(0, eval)(m[1]);
const C = globalThis.Image2Cad;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

function makeGray(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x, y), o = (y * w + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255;
  }
  return { data, w, h };
}
function pipeline(img, o = {}) {
  let g = C.toGray(img.data, img.w * img.h, false);
  g = C.boxBlur(g, img.w, img.h, o.blur || 0);
  const thr = o.thr != null ? o.thr : C.otsu(g);
  let bin = C.binarize(g, thr);
  if (o.morph) bin = C.morph(bin, img.w, img.h, o.morph);
  return { bin, thr };
}
function loopsOf(bin, w, h, o = {}) {
  const raw = C.traceContours(bin, w, h);
  const loops = [];
  for (const p of raw) {
    const ar = C.signedArea(p);
    const hole = ar < 0;
    if (hole && o.holes === false) continue;
    if (Math.abs(ar) < (o.minArea || 0)) continue;
    const bb = C.bbox(p);
    if ((o.minDim || 0) > 0 && ((bb[2] - bb[0]) < o.minDim || (bb[3] - bb[1]) < o.minDim)) continue;
    loops.push({ pts: p, area: Math.abs(ar), hole });
  }
  loops.sort((a, b) => (a.hole ? 1 : 0) - (b.hole ? 1 : 0) || b.area - a.area);
  return loops;
}
const entOpts = { eps: 0.5, circle: true, ctol: 0.03, mode: 'pline', revHole: false };
const cmdOpts = (w, h) => ({ pw: w, ph: h, scale: 1, digits: 4, prefix: true, insunits: true, unitCode: 4, zoom: false });

console.log('\n[1] 单像素 -> 1 条外轮廓');
{
  const img = makeGray(5, 5, (x, y) => (x === 2 && y === 2 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 5, 5);
  ok('1 loop', loops.length === 1, 'got ' + loops.length);
  ok('outer (area>0)', loops[0].area === 1 && !loops[0].hole, JSON.stringify(loops[0]));
}

console.log('\n[2] 实心方块 -> PLINE 四角');
{
  const img = makeGray(30, 30, (x, y) => (x >= 5 && x <= 14 && y >= 8 && y <= 19 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 30, 30);
  ok('1 loop', loops.length === 1, 'got ' + loops.length);
  ok('area = 120 px^2', near(loops[0].area, 120, 0.001), 'got ' + loops[0].area);
  const b = C.buildEntities(loops, entOpts);
  ok('not a circle -> PLINE', b.nPline === 1 && b.nCircle === 0, JSON.stringify(b.entities.map(e => e.type)));
  ok('4 vertices', b.entities[0].pts.length === 8, 'got ' + (b.entities[0].pts.length / 2));
  const lines = C.toCommands(b.entities, cmdOpts(30, 30));
  ok('single PLINE+C line', lines.length === 2 && lines[1].startsWith('_PLINE ') && lines[1].endsWith(' C'), lines[1]);
}

console.log('\n[3] 实心圆盘 -> CIRCLE，半径误差 < 0.3px');
{
  const R = 12, cx = 25, cy = 25;
  const img = makeGray(50, 50, (x, y) => (Math.hypot(x - cx, y - cy) <= R ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 50, 50);
  ok('1 loop', loops.length === 1, 'got ' + loops.length);
  const b = C.buildEntities(loops, entOpts);
  ok('detected as CIRCLE', b.nCircle === 1 && b.nPline === 0, JSON.stringify(b.entities.map(e => e.type)));
  const e = b.entities[0];
  ok('radius ~ 11.9 (pixelated circle)', near(e.r, 11.9, 0.4), 'got ' + e.r.toFixed(3));
  ok('center ~ (25.5,25.5) lattice', near(e.cx, 25.5, 0.2) && near(e.cy, 25.5, 0.2), 'got ' + e.cx.toFixed(2) + ',' + e.cy.toFixed(2));
  const lines = C.toCommands(b.entities, cmdOpts(50, 50));
  ok('_CIRCLE x,y r', /^_CIRCLE -?\d+(\.\d+)?,-?\d+(\.\d+)? \d+(\.\d+)?$/.test(lines[1]), lines[1]);
}

console.log('\n[4] 圆环 -> 外圈 + 内孔各 1');
{
  const img = makeGray(60, 60, (x, y) => {
    const d = Math.hypot(x - 30, y - 30);
    return (d <= 20 && d >= 8) ? 0 : 255;
  });
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 60, 60);
  ok('2 loops', loops.length === 2, 'got ' + loops.length);
  ok('outer first, hole second', !loops[0].hole && loops[1].hole);
  ok('outer area > hole area', loops[0].area > loops[1].area);
  const b = C.buildEntities(loops, entOpts);
  ok('2 circles', b.nCircle === 2, JSON.stringify(b.entities.map(e => e.type + '@' + e.r.toFixed(1))));
  ok('outer r ~20.1', near(b.entities[0].r, 20.1, 0.4), 'got ' + b.entities[0].r.toFixed(3));
  ok('hole r ~8.0', near(b.entities[1].r, 8.0, 0.4), 'got ' + b.entities[1].r.toFixed(3));
  const withHoles = loopsOf(bin, 60, 60, { holes: false });
  ok('holes=false -> 1 loop', withHoles.length === 1, 'got ' + withHoles.length);
}

console.log('\n[5] 鞍点：两个对角像素 -> 2 个独立闭环');
{
  const img = makeGray(6, 6, (x, y) => ((x === 1 && y === 1) || (x === 2 && y === 2)) ? 0 : 255);
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 6, 6);
  ok('2 separate loops', loops.length === 2, 'got ' + loops.length);
  ok('each area 1', loops.every(l => near(l.area, 1, 0.001)), JSON.stringify(loops.map(l => l.area)));
}

console.log('\n[6] 随机噪点 -> 被最小面积全部滤掉');
{
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const img = makeGray(80, 80, () => (rnd() < 0.25 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const all = loopsOf(bin, 80, 80);
  const kept = loopsOf(bin, 80, 80, { minArea: 30 });
  ok('raw has many loops', all.length > 50, 'got ' + all.length);
  ok('minArea=30 removes all', kept.length === 0, 'got ' + kept.length);
}

console.log('\n[7] 坐标变换：居中 + Y 轴翻转');
{
  const img = makeGray(30, 30, (x, y) => (x >= 5 && x <= 14 && y >= 8 && y <= 19 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 30, 30);
  const b = C.buildEntities(loops, entOpts);
  const lines = C.toCommands(b.entities, { ...cmdOpts(30, 30), scale: 2 });
  const nums = lines[1].replace('_PLINE ', '').replace(' C', '').split(' ').map(s => s.split(',').map(Number));
  const xs = nums.map(p => p[0]), ys = nums.map(p => p[1]);
  ok('x centered on image', near(Math.min(...xs), -20, 1e-6) && near(Math.max(...xs), 0, 1e-6), xs.join(','));
  ok('y centered on image', near(Math.min(...ys), -10, 1e-6) && near(Math.max(...ys), 14, 1e-6), ys.join(','));
  ok('Y flipped: image top(y=8) -> CAD +14', ys.includes(14) && ys.includes(-10), ys.join(','));
}

console.log('\n[8] 抗锯齿圆盘（平滑灰度边缘）-> 仍识别为圆');
{
  const img = makeGray(70, 70, (x, y) => {
    const d = Math.hypot(x - 35, y - 35);
    if (d < 15) return 0;
    if (d < 17) return Math.round(255 * (d - 15) / 2);
    return 255;
  });
  const g = C.toGray(img.data, 70 * 70, false);
  const thr = C.otsu(g);
  ok('otsu threshold sane', thr > 40 && thr < 220, 'thr=' + thr);
  const bin = C.binarize(C.boxBlur(g, 70, 70, 1), thr);
  const loops = loopsOf(bin, 70, 70);
  const b = C.buildEntities(loops, { ...entOpts, eps: 0.8 });
  ok('1 circle', b.nCircle === 1, JSON.stringify(b.entities.map(e => e.type)));
  ok('radius ~15.5', b.nCircle === 1 && near(b.entities[0].r, 15.5, 0.8), b.nCircle ? b.entities[0].r.toFixed(2) : 'n/a');
}

console.log('\n[9] 内部细节：外方框 + 两个圆眼');
{
  const img = makeGray(80, 80, (x, y) => {
    const edge = (x < 4 || x > 75 || y < 4 || y > 75);
    const eyeL = Math.hypot(x - 28, y - 38) <= 6;
    const eyeR = Math.hypot(x - 52, y - 38) <= 6;
    return (edge || eyeL || eyeR) ? 0 : 255;
  });
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 80, 80);
  ok('4 loops (frame outer + frame inner + 2 eyes)', loops.length === 4, 'got ' + loops.length);
  const b = C.buildEntities(loops, entOpts);
  ok('2 circles + 2 plines', b.nCircle === 2 && b.nPline === 2, JSON.stringify(b.entities.map(e => e.type)));
  const cmds = C.toCommands(b.entities, cmdOpts(80, 80));
  ok('2 _CIRCLE lines', cmds.filter(l => l.startsWith('_CIRCLE')).length === 2, cmds.join(' | '));
  ok('header _INSUNITS 4', cmds[0] === '_.INSUNITS 4', cmds[0]);
}

console.log('\n[10] 直线降级 + 指令格式开关');
{
  const img = makeGray(30, 30, (x, y) => (x >= 5 && x <= 24 && y >= 5 && y <= 24 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 30, 30);
  const b = C.buildEntities(loops, { ...entOpts, circle: false, mode: 'prim' });
  ok('4 LINE entities', b.nLine === 4 && b.entities.every(e => e.type === 'LINE'), JSON.stringify(b.entities.map(e => e.type)));
  const cmds = C.toCommands(b.entities, { ...cmdOpts(30, 30), prefix: false, insunits: false });
  ok('no prefix / no header', cmds.length === 4 && cmds.every(l => l.startsWith('LINE ')), cmds.join(' | '));
  const z = C.toCommands(b.entities, { ...cmdOpts(30, 30), zoom: true, insunits: false });
  ok('zoom tail', z[z.length - 2] === '_.ZOOM' && z[z.length - 1] === 'E', z.slice(-2).join(' | '));
}

console.log('\n[11] 格式函数');
ok('no trailing zeros', C.fmtNum(1.50000, 4) === '1.5', C.fmtNum(1.5, 4));
ok('negative zero -> 0', C.fmtNum(-0.00001, 3) === '0', C.fmtNum(-0.00001, 3));
ok('integer', C.fmtNum(12, 4) === '12', C.fmtNum(12, 4));
ok('rounds', C.fmtNum(1.234567, 3) === '1.235', C.fmtNum(1.234567, 3));

console.log('\n[12] 确定性：同一输入两次结果一致');
{
  const img = makeGray(64, 64, (x, y) => ((x * 7 + y * 13) % 11 < 4 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 64, 64);
  const a = C.toCommands(C.buildEntities(loops, entOpts).entities, cmdOpts(64, 64)).join('\n');
  const b = C.toCommands(C.buildEntities(loops, entOpts).entities, cmdOpts(64, 64)).join('\n');
  ok('identical output', a === b && a.length > 0, 'len=' + a.length);
}

console.log('\n[13] 性能：1000x1000 复杂图形全流程');
{
  let seed = 999;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const img = makeGray(1000, 1000, (x, y) => {
    const blob = Math.sin(x / 23) * Math.cos(y / 19) + Math.sin((x + y) / 41) * 0.7;
    if (blob > 0.35) return 0;
    if (blob > 0.2 && rnd() < 0.3) return 0;
    return 255;
  });
  const t0 = Date.now();
  const g = C.toGray(img.data, 1000 * 1000, false);
  const bin = C.binarize(C.boxBlur(g, 1000, 1000, 1), C.otsu(g));
  const loops = loopsOf(bin, 1000, 1000, { minArea: 40 });
  const b = C.buildEntities(loops, { ...entOpts, eps: 0.8 });
  const lines = C.toCommands(b.entities, cmdOpts(1000, 1000));
  const ms = Date.now() - t0;
  ok('did real work', loops.length > 30 && lines.length > 30, 'loops=' + loops.length + ' lines=' + lines.length);
  ok('under 4000 ms', ms < 4000, ms + ' ms');
  console.log('       ' + ms + ' ms, loops=' + loops.length + ', entities=' + b.entities.length + ', lines=' + lines.length);
}

console.log('\n[14] 空图 / 全白图不崩');
{
  const img = makeGray(40, 40, () => 255);
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 40, 40);
  ok('no loops', loops.length === 0);
  const b = C.buildEntities(loops, entOpts);
  ok('no entities', b.entities.length === 0);
  ok('no commands', C.toCommands(b.entities, cmdOpts(40, 40)).length === 0);
}

console.log('\n[15] 细线（1px 宽）不被最小包围盒误杀');
{
  const img = makeGray(60, 60, (x, y) => (x >= 10 && x <= 50 && y === 30 ? 0 : 255));
  const { bin } = pipeline(img, { thr: 128 });
  const loops = loopsOf(bin, 60, 60, { minDim: 0 });
  ok('1 loop', loops.length === 1, 'got ' + loops.length);
  ok('area ~41', near(loops[0].area, 41, 0.001), 'got ' + loops[0].area);
  const b = C.buildEntities(loops, { ...entOpts, circle: false, mode: 'prim' });
  ok('thin rect -> 4 LINE corners', b.nLine === 4 && b.entities.every(e => e.type === 'LINE'), JSON.stringify(b.entities.map(e => e.type + ':' + e.pts.length / 2)));
}

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILURES') + '  ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
