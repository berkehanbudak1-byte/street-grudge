import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const Security = require(path.join(ROOT, 'src', 'security.js'));
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const normalizeEol = (text) => text.replace(/\r\n/g, '\n');

test('all JS files in src/ pass Node syntax check', () => {
  const srcDir = path.join(ROOT, 'src');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
  assert.ok(files.length >= 8, `expected at least 8 modular scripts in src/, got ${files.length}`);
  for (const file of files) {
    execFileSync(process.execPath, ['--check', path.join(srcDir, file)], { stdio: 'pipe' });
  }
});

test('zero unguarded localStorage calls exist across src/*.js', () => {
  const srcDir = path.join(ROOT, 'src');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();

  for (const file of files) {
    const content = read('src', file);
    if (file !== 'security.js') {
      assert.doesNotMatch(
        content,
        /\blocalStorage\b/,
        `Direct localStorage reference found in src/${file}; use Security storage helpers instead`
      );
      assert.doesNotMatch(
        content,
        /\b(?:getItem|setItem|removeItem)\s*\(/,
        `Direct storage method call found in src/${file}; use Security storage helpers instead`
      );
    }
  }

  // Inside src/security.js, localStorage and getItem/setItem/removeItem must only appear inside try { ... } catch blocks
  const secSrc = read('src', 'security.js');
  const directStorageHits = [...secSrc.matchAll(/\blocalStorage\b|\.\s*(?:getItem|setItem|removeItem)\s*\(/g)];
  assert.ok(directStorageHits.length >= 4, 'expected guarded storage helpers in src/security.js');

  for (const match of directStorageHits) {
    const idx = match.index;
    const before = secSrc.slice(Math.max(0, idx - 220), idx);
    const after = secSrc.slice(idx, Math.min(secSrc.length, idx + 260));
    assert.match(before, /\btry\s*\{/, `Storage access at offset ${idx} in src/security.js is not preceded by try {`);
    assert.match(after, /\}\s*catch\s*\(/, `Storage access at offset ${idx} in src/security.js is not closed by catch (...)`);
  }
});

test('storage helpers never throw in strict file://, private, or sandboxed iframe environments', () => {
  // Simulate window.localStorage getter throwing SecurityError (sandboxed iframe / strict file://)
  const sandbox = { window: {} };
  Object.defineProperty(sandbox.window, 'localStorage', {
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
    configurable: true,
  });
  vm.runInNewContext(read('src', 'security.js'), sandbox);
  const isolatedSec = sandbox.window.StreetGrudge.Security;

  assert.equal(isolatedSec.getSafeStorage(), null);
  assert.equal(isolatedSec.safeGetItem(null, 'street_grudge_hi', '0'), '0');
  assert.equal(isolatedSec.safeSetItem(null, 'street_grudge_hi', '100'), false);
  assert.equal(isolatedSec.safeRemoveItem(null, 'street_grudge_hi'), false);
  assert.equal(isolatedSec.readBoundedInt(null, 'street_grudge_hi', 0, 0, 999999999), 0);
  assert.equal(isolatedSec.writeBoundedInt(null, 'street_grudge_hi', 500, 0, 999999999), false);

  // Storage object whose property getters themselves throw
  const hostileStorage = {};
  for (const prop of ['getItem', 'setItem', 'removeItem']) {
    Object.defineProperty(hostileStorage, prop, {
      get() {
        throw new Error('SecurityError');
      },
    });
  }
  assert.equal(Security.safeGetItem(hostileStorage, 'k', 'fallback'), 'fallback');
  assert.equal(Security.safeSetItem(hostileStorage, 'k', '1'), false);
  assert.equal(Security.safeRemoveItem(hostileStorage, 'k'), false);
  assert.equal(Security.readBoundedInt(hostileStorage, 'k', 12, 0, 100), 12);
  assert.equal(Security.writeBoundedInt(hostileStorage, 'k', 50, 0, 100), false);

  // Working in-memory mock storage round-trip including removeItem
  const backing = new Map();
  const mockStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
  };
  assert.equal(Security.safeSetItem(mockStorage, 'street_grudge_hi', '4200'), true);
  assert.equal(Security.safeGetItem(mockStorage, 'street_grudge_hi', null), '4200');
  assert.equal(Security.readBoundedInt(mockStorage, 'street_grudge_hi', 0, 0, 999999999), 4200);
  assert.equal(Security.safeRemoveItem(mockStorage, 'street_grudge_hi'), true);
  assert.equal(Security.safeGetItem(mockStorage, 'street_grudge_hi', null), null);
});

test('street-grudge-tek-dosya.html is 100% synchronized with index.html script order, styles.css, and every src/*.js file', () => {
  const indexHtml = read('index.html');
  const bundleHtml = read('street-grudge-tek-dosya.html');

  // Verify styles.css sync
  const styleMatch = bundleHtml.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch, 'expected <style> block in street-grudge-tek-dosya.html');
  const cssContent = normalizeEol(read('styles.css')).trim();
  assert.equal(
    normalizeEol(styleMatch[1]).trim(),
    cssContent,
    'Embedded <style> in street-grudge-tek-dosya.html drifted from styles.css'
  );

  // Extract script load order from index.html
  const indexScripts = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="(src\/[^"]+\.js)"[^>]*><\/script>/g)].map((m) => m[1]);
  const srcFilesOnDisk = fs
    .readdirSync(path.join(ROOT, 'src'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `src/${f}`)
    .sort();
  assert.deepEqual([...indexScripts].sort(), srcFilesOnDisk, 'index.html must load every src/*.js file');

  // Extract inline <script> from single-file bundle and validate syntax
  const scriptMatch = bundleHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'expected inline <script> block in street-grudge-tek-dosya.html');
  const bundleJs = normalizeEol(scriptMatch[1]);
  assert.doesNotThrow(() => new vm.Script(bundleJs, { filename: 'street-grudge-tek-dosya.html' }));

  // Parse /* === src/<file>.js === */ sections and verify exact byte-for-byte match in exact order
  const headerRe = /^\/\* === (src\/[^\s*]+\.js) === \*\/$/gm;
  const headers = [...bundleJs.matchAll(headerRe)];
  assert.deepEqual(
    headers.map((h) => h[1]),
    indexScripts,
    'Embedded module order in street-grudge-tek-dosya.html must match index.html'
  );

  for (let i = 0; i < headers.length; i++) {
    const relPath = headers[i][1];
    const start = headers[i].index + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : bundleJs.length;
    const embeddedBody = bundleJs.slice(start, end).trim();
    const diskBody = normalizeEol(read(...relPath.split('/'))).trim();
    assert.equal(
      embeddedBody,
      diskBody,
      `Embedded ${relPath} in street-grudge-tek-dosya.html is out of sync with ${relPath}`
    );
  }
});

test('README.md documents v3 Director\'s Cut architecture, modes, fighters, and desktop launchers', () => {
  const readme = read('README.md');
  const requiredTokens = [
    "v3",
    "Director's Cut",
    'src/sidefighter.js',
    'street-grudge-tek-dosya.html',
    'OYUNU_BASLAT.bat',
    'OYUNU_BASLAT.command',
    'Street_Grudge_Oyna.url',
    'Parry',
    'Super',
    'KEREM',
    'DEMİR',
    'ZEYNEP',
    'KADİR',
  ];
  for (const token of requiredTokens) {
    assert.ok(readme.includes(token), `README.md is missing v3 documentation token: ${token}`);
  }
  for (const rel of ['index.html', 'street-grudge-tek-dosya.html', 'OYUNU_BASLAT.bat', 'OYUNU_BASLAT.command', 'Street_Grudge_Oyna.url']) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Referenced asset missing on disk: ${rel}`);
  }
});
