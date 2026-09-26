// The app is a standalone HTML file, so it has to hardcode its own version.
// That makes two places to update, and nothing would catch a mismatch except
// this test.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../image2cad.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

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

if (failed) {
  console.log('\nFAILURES ' + failed + ' failed');
  process.exit(1);
}
console.log('\nall version checks passed');
