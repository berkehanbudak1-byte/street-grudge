import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

function extractCspDirectives(html, filename) {
  const matches = [
    ...html.matchAll(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]+)"\s*\/?>/gi)
  ];
  assert.equal(matches.length, 1, `${filename} must declare exactly one Content-Security-Policy meta tag`);
  const directives = new Map();
  for (const rawDirective of matches[0][1].split(';')) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const name = parts[0].toLowerCase();
    directives.set(name, parts.slice(1));
  }
  return directives;
}

function extractInlineScripts(html) {
  const normalized = html.replace(/\r\n?/g, '\n');
  const scripts = [...normalized.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  return scripts
    .filter((m) => !/\bsrc\s*=/i.test(m[1]))
    .map((m) => {
      const body = m[2];
      const digest = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
      return { body, hash: `'sha256-${digest}'` };
    });
}

function stripScriptAndStyleBodies(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

test('all JS/MJS files pass node --check syntax verification', () => {
  const dirs = [path.join(ROOT, 'src'), path.join(ROOT, 'tests')];
  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs')).sort();
    assert.ok(files.length > 0, `expected JS/MJS files in ${dir}`);
    for (const file of files) {
      execFileSync(process.execPath, ['--check', path.join(dir, file)], { stdio: 'pipe' });
    }
  }
});

test('inline script in street-grudge-tek-dosya.html parses cleanly as JS', () => {
  const html = read('street-grudge-tek-dosya.html');
  const inlineScripts = extractInlineScripts(html);
  assert.equal(inlineScripts.length, 1, 'street-grudge-tek-dosya.html must contain 1 inline <script> block');
  assert.doesNotThrow(() => new vm.Script(inlineScripts[0].body, { filename: 'street-grudge-tek-dosya.html#inline0' }));
});

test('index.html and street-grudge-tek-dosya.html enforce strict CSP with exact LF-normalized SHA-256 hashes', () => {
  const targets = [
    { file: 'index.html', expectedInlineCount: 0 },
    { file: 'street-grudge-tek-dosya.html', expectedInlineCount: 1 }
  ];

  for (const { file, expectedInlineCount } of targets) {
    const html = read(file);
    const directives = extractCspDirectives(html, file);
    const inlineScripts = extractInlineScripts(html);

    assert.equal(
      inlineScripts.length,
      expectedInlineCount,
      `${file} inline <script> count must equal ${expectedInlineCount}`
    );

    const defaultSrc = directives.get('default-src') || [];
    assert.ok(defaultSrc.includes("'self'"), `${file} default-src must include 'self'`);
    assert.ok(!defaultSrc.includes('*'), `${file} default-src must not allow wildcard *`);

    const scriptSrc = directives.get('script-src') || [];
    assert.ok(scriptSrc.includes("'self'"), `${file} script-src must include 'self'`);
    assert.ok(!scriptSrc.includes("'unsafe-inline'"), `${file} script-src must NOT contain 'unsafe-inline'`);
    assert.ok(!scriptSrc.includes("'unsafe-eval'"), `${file} script-src must NOT contain 'unsafe-eval'`);
    assert.ok(!scriptSrc.includes("'unsafe-hashes'"), `${file} script-src must NOT contain 'unsafe-hashes'`);
    assert.ok(!scriptSrc.includes('*'), `${file} script-src must NOT allow wildcard *`);

    const cspHashes = scriptSrc.filter((t) => /^'sha256-[A-Za-z0-9+/]+=*'$/.test(t));
    const expectedHashes = [...new Set(inlineScripts.map((s) => s.hash))];
    assert.deepEqual(
      [...cspHashes].sort(),
      [...expectedHashes].sort(),
      `${file} script-src SHA-256 hashes must match exact LF-normalized inline <script> blocks`
    );

    assert.deepEqual(directives.get('object-src'), ["'none'"], `${file} must set object-src 'none'`);
    assert.deepEqual(directives.get('base-uri'), ["'self'"], `${file} must set base-uri 'self'`);
    assert.deepEqual(directives.get('form-action'), ["'none'"], `${file} must set form-action 'none'`);

    const imgSrc = directives.get('img-src') || [];
    assert.ok(imgSrc.includes("'self'") && imgSrc.includes('data:') && imgSrc.includes('blob:'),
      `${file} img-src must preserve 'self', data:, and blob: for Canvas rendering`);
    const mediaSrc = directives.get('media-src') || [];
    assert.ok(mediaSrc.includes("'self'") && mediaSrc.includes('data:') && mediaSrc.includes('blob:'),
      `${file} media-src must preserve 'self', data:, and blob: for WebAudio`);

    const markupOnly = stripScriptAndStyleBodies(html);
    assert.doesNotMatch(
      markupOnly,
      /\son[a-z]+\s*=/i,
      `${file} must not contain inline on* HTML event handler attributes`
    );
  }
});

test('src/*.js and street-grudge-tek-dosya.html contain zero dangerous XSS or dynamic-eval sinks', () => {
  const srcDir = path.join(ROOT, 'src');
  const targets = fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => ({ name: `src/${f}`, content: read('src', f) }));
  targets.push({ name: 'street-grudge-tek-dosya.html', content: read('street-grudge-tek-dosya.html') });

  const forbidden = /\.(?:innerHTML|outerHTML)\s*=|\binsertAdjacentHTML\s*\(|\bdocument\.write\s*\(|\beval\s*\(|\bnew\s+Function\s*\(/;
  for (const { name, content } of targets) {
    assert.doesNotMatch(content, forbidden, `Dangerous XSS/eval sink detected in ${name}`);
  }
});
