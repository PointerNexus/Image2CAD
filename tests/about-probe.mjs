import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
const probe = `
<div id="RESULT" style="display:none"></div>
<script>
window.addEventListener('error', function (e) { document.title = 'JSERR ' + e.message; });
window.addEventListener('load', function () {
  var out = [];
  function q(s) { return document.querySelector(s); }
  function ok(n, c, d) { out.push((c ? 'ok   ' : 'FAIL ') + n + (d ? '  -> ' + d : '')); }
  var btn = q('#aboutBtn'), mask = q('#aboutMask');
  ok('about button exists', !!btn);
  ok('button is last child of header', btn && btn.parentElement.lastElementChild === btn);
  ok('mask hidden initially', mask && mask.hidden === true);
  var r = btn.getBoundingClientRect(), h = q('header').getBoundingClientRect();
  ok('button on the right half of the header', r.left > h.left + h.width * 0.6,
     'btn.left=' + Math.round(r.left) + ' header.width=' + Math.round(h.width));
  ok('button vertically in header', r.top >= h.top - 1 && r.bottom <= h.bottom + 1);
  btn.click();
  ok('click opens panel', !mask.hidden && mask.classList.contains('on'));
  ok('panel is visible', getComputedStyle(mask).display === 'flex');
  ok('version rendered', q('#aboutVer').textContent === '0.1.0', q('#aboutVer').textContent);
  ok('author rendered', q('#aboutAuthor').textContent === 'PointerNexus', q('#aboutAuthor').textContent);
  ok('repo text rendered', q('#aboutRepo').textContent === 'https://github.com/PointerNexus/Image2CAD', q('#aboutRepo').textContent);
  ok('repo href correct', q('#aboutRepo').href === 'https://github.com/PointerNexus/Image2CAD', q('#aboutRepo').href);
  var p = q('.about').getBoundingClientRect();
  var vw = document.documentElement.clientWidth;  // excludes the scrollbar; flexbox centres against this
  ok('panel horizontally centred', Math.abs((p.left + p.width/2) - vw/2) < 2, 'off by ' + Math.round(Math.abs((p.left+p.width/2)-vw/2)) + ' (clientWidth=' + vw + ' innerWidth=' + innerWidth + ')');
  q('#aboutClose').click();
  ok('close button hides panel', mask.hidden === true);
  btn.click();
  mask.click();
  ok('backdrop click hides panel', mask.hidden === true);
  btn.click();
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  ok('Escape hides panel', mask.hidden === true);
  document.getElementById('RESULT').textContent = out.join(' | ');
  document.title = 'DONE';
});
<\/script>`;
writeFileSync(new URL('./about-probe.html', import.meta.url), src.replace('</body>', probe + '</body>'));
console.log('probe written');
