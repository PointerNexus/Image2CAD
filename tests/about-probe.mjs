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

  // WCAG relative luminance, so 'does it stand out' becomes a number.
  function lum(c) {
    var m = (c.match(/[0-9]+(\.[0-9]+)?/g) || []).slice(0, 3).map(Number);
    if (m.length < 3) return NaN;
    var f = m.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function bgOf(el) {
    for (var n = el; n; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    return 'rgb(255, 255, 255)';
  }
  var bs = getComputedStyle(btn);
  var crText = ratio(bs.color, bs.backgroundColor);
  var crVsPage = ratio(bs.backgroundColor, bgOf(btn.parentElement));
  ok('button text contrast >= 4.5:1 (WCAG AA)', crText >= 4.5, crText.toFixed(2) + ':1');
  ok('button fill stands off the page by >= 4.5:1', crVsPage >= 4.5, crVsPage.toFixed(2) + ':1');
  ok('button fill is not transparent', bs.backgroundColor !== 'rgba(0, 0, 0, 0)', bs.backgroundColor);
  ok('button border-radius is a pill', parseFloat(bs.borderTopLeftRadius) >= parseFloat(bs.height) / 2,
     bs.borderTopLeftRadius + ' vs height ' + bs.height);
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
