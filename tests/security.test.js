'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const Security = require(path.join(ROOT, 'src', 'security.js'));

const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

test('all JS files in src/ pass Node syntax check', () => {
  const srcDir = path.join(ROOT, 'src');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
  assert.ok(files.length >= 7, 'expected modular game scripts in src/');
  for (const file of files) {
    execFileSync(process.execPath, ['--check', path.join(srcDir, file)], { stdio: 'pipe' });
  }
});

test('inline script in street-grudge-tek-dosya.html is syntactically valid JS', () => {
  const html = read('street-grudge-tek-dosya.html');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected inline <script> block in street-grudge-tek-dosya.html');
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: 'street-grudge-tek-dosya.html' }));
});

test('index.html enforces Referrer-Policy, strict CSP, and loads src/security.js first', () => {
  const html = read('index.html');
  assert.match(html, /<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/i);
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i);
  assert.ok(cspMatch, 'index.html must define a Content-Security-Policy meta tag');
  const csp = cspMatch[1];
  assert.match(csp, /default-src\s+'self'/);
  assert.match(csp, /script-src\s+'self';/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-eval'/);
  assert.match(csp, /object-src\s+'none'/);
  assert.match(csp, /base-uri\s+'self'/);
  assert.match(csp, /form-action\s+'self'/);
  assert.doesNotMatch(html, /\son(?:click|load|error|change|input|submit|keydown|keyup|mouseover)=/i);

  const secPos = html.indexOf('src="src/security.js"');
  const gamePos = html.indexOf('src="src/game.js"');
  assert.ok(secPos > -1 && gamePos > secPos, 'src/security.js must be loaded before src/game.js');
});

test('street-grudge-tek-dosya.html enforces Referrer-Policy and safe CSP', () => {
  const html = read('street-grudge-tek-dosya.html');
  assert.match(html, /<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/i);
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i);
  assert.ok(cspMatch, 'street-grudge-tek-dosya.html must define a CSP meta tag');
  assert.match(cspMatch[1], /object-src\s+'none'/);
  assert.match(cspMatch[1], /base-uri\s+'self'/);
  assert.doesNotMatch(cspMatch[1], /'unsafe-eval'/);
});

test('no unsafe DOM HTML sinks or dynamic code execution in src/ or single-file bundle', () => {
  const srcDir = path.join(ROOT, 'src');
  const targets = fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: `src/${f}`, content: read('src', f) }));
  targets.push({ name: 'street-grudge-tek-dosya.html', content: read('street-grudge-tek-dosya.html') });

  const forbidden = /\.(?:innerHTML|outerHTML)\s*=|\binsertAdjacentHTML\s*\(|\bdocument\.write\s*\(|\beval\s*\(|\bnew\s+Function\s*\(/;
  for (const { name, content } of targets) {
    assert.doesNotMatch(content, forbidden, `Unsafe sink detected in ${name}`);
  }
});

test('Security.escapeHtml and sanitizeHexColor neutralize injections', () => {
  assert.equal(
    Security.escapeHtml('<img src=x onerror="alert(\'xss\')">&'),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
  );
  assert.equal(Security.escapeHtml(null), '');
  assert.equal(Security.sanitizeHexColor('#f97316'), '#f97316');
  assert.equal(Security.sanitizeHexColor('#abc'), '#abc');
  assert.equal(Security.sanitizeHexColor('red; background:url(javascript:alert(1))', '#111111'), '#111111');
  assert.equal(Security.sanitizeHexColor('#12345g', '#000000'), '#000000');
});

test('Security.safeJsonParse strips prototype-pollution keys and enforces size limits', () => {
  const malicious = '{"score":42,"__proto__":{"polluted":true},"constructor":{"prototype":{"pwn":1}},"nested":{"prototype":{"bad":true},"ok":"yes"}}';
  const parsed = Security.safeJsonParse(malicious, null);
  assert.equal(parsed.score, 42);
  assert.equal(parsed.nested.ok, 'yes');
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.prototype.pwn, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.nested, 'prototype'), false);

  assert.equal(Security.safeJsonParse('{not-json', 'fallback'), 'fallback');
  assert.equal(Security.safeJsonParse('{"a":"' + 'x'.repeat(200) + '"}', null, 64), null);
});

test('Security.readBoundedInt and writeBoundedInt handle corrupt/throwing storage safely', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v))
  };

  assert.equal(Security.readBoundedInt(mockStorage, 'missing', 7, 0, 100), 7);
  store.set('hi', '12345');
  assert.equal(Security.readBoundedInt(mockStorage, 'hi', 0, 0, 999999), 12345);
  store.set('neg', '-500');
  assert.equal(Security.readBoundedInt(mockStorage, 'neg', 0, 0, 1000), 0);
  store.set('huge', '99999999999999999999');
  assert.equal(Security.readBoundedInt(mockStorage, 'huge', 0, 0, 999999), 999999);
  store.set('nan', 'NaN');
  assert.equal(Security.readBoundedInt(mockStorage, 'nan', 10, 0, 1000), 10);
  store.set('xss', '<script>alert(1)</script>');
  assert.equal(Security.readBoundedInt(mockStorage, 'xss', 0, 0, 1000), 0);

  assert.equal(Security.writeBoundedInt(mockStorage, 'hi', 999999999999, 0, 5000), true);
  assert.equal(store.get('hi'), '5000');

  const throwingStorage = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); }
  };
  assert.equal(Security.readBoundedInt(throwingStorage, 'hi', 42, 0, 100), 42);
  assert.equal(Security.writeBoundedInt(throwingStorage, 'hi', 50, 0, 100), false);
});

test('Security.setSafeFormattedText renders only <b> tags and neutralizes arbitrary HTML', () => {
  const makeNode = (tag) => {
    const node = {
      tag,
      children: [],
      textContent: '',
      get firstChild() { return this.children[0] || null; },
      removeChild(ch) {
        const idx = this.children.indexOf(ch);
        if (idx >= 0) this.children.splice(idx, 1);
      },
      appendChild(ch) {
        this.children.push(ch);
        return ch;
      }
    };
    return node;
  };
  const fakeDoc = {
    createTextNode: (text) => ({ type: 'text', textContent: text }),
    createElement: (tag) => makeNode(tag)
  };
  const host = makeNode('div');

  Security.setSafeFormattedText(
    host,
    'Hello <b>Downtown &amp; Uptown</b> <img src=x onerror=alert(1)> <b>[E]</b>',
    fakeDoc
  );

  assert.equal(host.children.length, 4);
  assert.deepEqual(host.children[0], { type: 'text', textContent: 'Hello ' });
  assert.equal(host.children[1].tag, 'b');
  assert.equal(host.children[1].textContent, 'Downtown & Uptown');
  assert.deepEqual(host.children[2], { type: 'text', textContent: ' <img src=x onerror=alert(1)> ' });
  assert.equal(host.children[3].tag, 'b');
  assert.equal(host.children[3].textContent, '[E]');
});

test('launcher scripts use safe quoting and HTTPS shortcut', () => {
  const cmdScript = read('OYUNU_BASLAT.command');
  assert.match(cmdScript, /^#!\/usr\/bin\/env bash/m);
  assert.match(cmdScript, /set -euo pipefail/);
  assert.match(cmdScript, /cd -- "\$\(dirname -- "\$0"\)"/);
  assert.match(cmdScript, /open -- "\$\{TARGET_FILE\}"/);
  execFileSync('bash', ['-n', path.join(ROOT, 'OYUNU_BASLAT.command')], { stdio: 'pipe' });

  const batScript = read('OYUNU_BASLAT.bat');
  assert.match(batScript, /DisableDelayedExpansion/);
  assert.match(batScript, /start "" "%TARGET_FILE%"/);
  assert.match(batScript, /exit \/b 0/);

  const urlFile = read('Street_Grudge_Oyna.url');
  assert.match(urlFile, /^URL=https:\/\//m);
  assert.doesNotMatch(urlFile, /URL=(?:http|file|javascript):/i);
});
