import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');

const probe = `
<div id="RESULT" style="display:none"></div>
<script>
window.__err = [];
window.addEventListener('error', function (e) { window.__err.push(String(e.message)); });
window.addEventListener('unhandledrejection', function (e) { window.__err.push('rej:' + e.reason); });
function report(tag) {
  var el = document.getElementById('RESULT');
  var out = document.getElementById('out').value;
  el.textContent = JSON.stringify({
    tag: tag,
    errors: window.__err,
    stats: document.getElementById('stats').textContent,
    lines: out ? out.split('\\n').length : 0,
    firstLines: out.split('\\n').slice(0, 8),
    copyDisabled: document.getElementById('copy').disabled,
    meta: document.getElementById('imgMeta').textContent
  });
}
setTimeout(function () {
  var c = document.createElement('canvas');
  c.width = 420; c.height = 420;
  var g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 420, 420);
  g.fillStyle = '#101010';
  g.beginPath(); g.ellipse(210, 215, 160, 130, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(210, 300, 95, 80, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(155, 180, 30, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(265, 180, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#101010';
  g.beginPath(); g.arc(210, 275, 42, 0, Math.PI * 2); g.fill();
  g.lineWidth = 9; g.strokeStyle = '#101010';
  g.beginPath(); g.arc(210, 275, 42, 0, Math.PI * 2); g.stroke();
  c.toBlob(function (b) {
    var f = new File([b], 'cartoon.png', { type: 'image/png' });
    var dt = new DataTransfer();
    dt.items.add(f);
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    setTimeout(function () { report('after-drop'); }, 2500);
  }, 'image/png');
}, 400);
</script>
`;

const out = src.replace('</body>', probe + '</body>');
const dest = process.argv[2] || fileURLToPath(new URL('./e2e-page.html', import.meta.url));
writeFileSync(dest, out);
console.log('wrote ' + dest);
