import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');

const probe = `
<div id="RESULT" style="display:none"></div>
<script>
window.__err = [];
window.addEventListener('error', function (e) { window.__err.push(String(e.message)); });
var out = [];
function snap(tag) {
  var o = document.getElementById('out').value;
  out.push({ tag: tag, stats: document.getElementById('stats').textContent, lines: o ? o.split('\\n').length : 0,
             head: o.split('\\n').slice(1, 4) });
}
function photo() {
  var c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  var g = c.getContext('2d');
  var grad = g.createLinearGradient(0, 0, 640, 480);
  grad.addColorStop(0, '#c8b89a'); grad.addColorStop(0.5, '#a89880'); grad.addColorStop(1, '#d8ccb4');
  g.fillStyle = grad; g.fillRect(0, 0, 640, 480);
  for (var i = 0; i < 5200; i++) {
    g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.05) + ')';
    g.fillRect(Math.random() * 640, Math.random() * 480, 2, 2);
  }
  g.fillStyle = '#f2c33c';
  g.beginPath(); g.ellipse(300, 250, 170, 150, 0.1, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e8a020';
  g.beginPath(); g.ellipse(300, 330, 120, 95, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2b2b2b';
  g.beginPath(); g.ellipse(255, 215, 26, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(350, 215, 26, 30, 0, 0, Math.PI * 2); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#2b2b2b';
  g.beginPath(); g.arc(302, 300, 45, 0.2, Math.PI - 0.2); g.stroke();
  g.lineWidth = 7;
  g.beginPath(); g.moveTo(300, 180); g.lineTo(300, 130); g.stroke();
  g.fillStyle = '#2b2b2b';
  g.beginPath(); g.arc(300, 118, 18, 0, Math.PI * 2); g.fill();
  return c;
}
function drop(canvas, name, done) {
  canvas.toBlob(function (b) {
    var f = new File([b], name, { type: 'image/png' });
    var dt = new DataTransfer(); dt.items.add(f);
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    setTimeout(done, 1200);
  }, 'image/png');
}
function set(id, v) {
  var el = document.getElementById(id);
  if (el.type === 'checkbox') { if (el.checked !== v) el.click(); }
  else { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
}
setTimeout(function () {
  drop(photo(), 'photo.png', function () {
    snap('default');
    set('minArea', 60); setTimeout(function () {
      snap('minArea=60');
      set('blur', 2); set('morph', '3'); setTimeout(function () {
        snap('blur2+morph3');
        set('eps', 2); setTimeout(function () {
          snap('eps2');
          document.getElementById('RESULT').textContent = JSON.stringify({ errors: window.__err, steps: out });
        }, 1200);
      }, 1200);
    }, 1200);
  });
}, 400);
</script>
`;

writeFileSync('./photo-page.html', src.replace('</body>', probe + '</body>'));
console.log('ok');
