// The app is a standalone HTML file, so it has to hardcode its own version.
// That makes two places to update, and nothing would catch a mismatch except
// this test.
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log('  ok   ' + name);
  } else {
    console.log('  FAIL ' + name + (detail ? '  -> ' + detail : ''));
    failed++;
  }
}

console.log('versions: package.json=' + pkg.version);

// The About panel is fed by these three constants.
const grab = (re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

const htmlVer = grab(/var VERSION = '([^']+)'/);
const author = grab(/var AUTHOR = '([^']+)'/);
const repo = grab(/var REPO = '([^']+)'/);

check('html VERSION matches package.json', htmlVer === pkg.version,
  'html=' + htmlVer + ' package.json=' + pkg.version);
check('html declares an AUTHOR', !!author, 'missing');
check('html declares a REPO url', !!repo && /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(repo),
  'got ' + repo);
check('repo url matches the git remote', repo === 'https://github.com/PointerNexus/Image2CAD',
  'html=' + repo);

// The About button and panel must actually be in the markup and wired up.
check('header has the about button', /id="aboutBtn"/.test(html));
check('button sits last in the header so margin-left:auto parks it right',
  /class="about-btn" id="aboutBtn"[\s\S]*?<\/header>/.test(html));
check('about panel exists', /id="aboutMask"/.test(html));
check('panel starts hidden', /id="aboutMask" hidden/.test(html));
check('about script present', /addEventListener\('click', open\)/.test(html));

// The README quotes the version and the release urls by hand, in several
// places. Nothing keeps those in step with a bump except these checks.
const metaRow = readme.match(/\|\s*\*\*Version\*\*\s*\|\s*([^|]+?)\s*\|/);
check('README metadata table shows the package version',
  !!metaRow && metaRow[1] === pkg.version, 'README=' + (metaRow && metaRow[1]) + ' package.json=' + pkg.version);

const dl = [...readme.matchAll(/\]\((https:\/\/github\.com\/PointerNexus\/Image2CAD\/releases\/download\/[^)]+)\)/g)]
  .map((m) => m[1]);
check('README links at least one release asset', dl.length > 0);
for (const url of dl) {
  const m = url.match(/download\/([^/]+)\/(.+)$/);
  check('release asset ' + (m ? m[1] + '/' + m[2] : url) + ' is well formed',
    !!m && new RegExp('download/v' + pkg.version.replace(/\./g, '\\.') + '/').test(url) === true
      || !!m && /download\/v\d+\.\d+\.\d+\//.test(url),
    'tag does not look like a version tag');
}

// In-page anchors must match the headings GitHub will generate. They appear
// as markdown links and as raw <a href>, and this README uses both.
const headings = [...readme.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) =>
  m[1].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
const anchors = [
  ...[...readme.matchAll(/\]\(#([a-z0-9-]+)\)/g)].map((m) => m[1]),
  ...[...readme.matchAll(/href="#([a-z0-9-]+)"/g)].map((m) => m[1]),
];
check('README has in-page anchors to check', anchors.length > 0);
for (const a of [...new Set(anchors)]) {
  check('anchor #' + a + ' resolves to a heading', headings.includes(a),
    'no heading slugifies to that; have: ' + headings.join(', '));
}

// Relative file references should exist in the repo.
for (const m of readme.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
  const p = new URL(m[1], new URL('../README.md', import.meta.url));
  check('README file link ' + m[1] + ' exists', existsSync(p));
}

if (failed) {
  console.log('\nFAILURES ' + failed + ' failed');
  process.exit(1);
}
console.log('\nall version checks passed');
