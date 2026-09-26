import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');

const probe = `
<div id="RESULT" style="display:none"></div>
<script>
window.__err = [];
window.addEventListener('error', function (e) { window.__err.push(String(e.message)); });
function box(sel) {
  var el = document.querySelector(sel);
  if (!el) return null;
  var r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}
setTimeout(function () {
  var canvas = document.getElementById('view');
  var groups = [].map.call(document.querySelectorAll('.group'), function (g) { return Math.round(g.getBoundingClientRect().height); });
  var sliders = document.querySelectorAll('input[type=range]').length;
  var checks = document.querySelectorAll('.check').length;
  var selects = document.querySelectorAll('select').length;
  var doc = document.documentElement;
  var res = {
    errors: window.__err,
    viewport: { w: innerWidth, h: innerHeight },
    docScrollW: doc.scrollWidth,
    horizontalOverflow: doc.scrollWidth > innerWidth + 1,
    header: box('header'),
    canvas: box('#view'),
    controls: box('.controls'),
    output: box('.output'),
    textarea: box('#out'),
    groups: groups,
    controlsOverflowX: document.querySelector('.controls').scrollWidth > document.querySelector('.controls').clientWidth + 1,
    canvasPixels: canvas.width + 'x' + canvas.height,
    counts: { sliders: sliders, checks: checks, selects: selects },
    stats: document.getElementById('stats').textContent,
    copyDisabled: document.getElementById('copy').disabled,
    labels: [].map.call(document.querySelectorAll('.gtitle'), function (g) { return g.textContent; })
  };
  document.getElementById('RESULT').textContent = JSON.stringify(res);
}, 900);
</script>
`;

writeFileSync('./layout-page.html', src.replace('</body>', probe + '</body>'));
console.log('ok');
