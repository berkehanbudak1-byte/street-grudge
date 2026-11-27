/**
 * Street Grudge v3 — Frontend Security & Safe Storage Helpers
 * Zero external dependencies; safe for both browser and Node.js testing.
 */
(function (root) {
  'use strict';

  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const HEX_COLOR_RE = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;
  const MAX_DEPTH = 12;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeHexColor(color, fallback = '#111111') {
    if (typeof color === 'string' && HEX_COLOR_RE.test(color.trim())) {
      return color.trim();
    }
    return fallback;
  }

  function stripDangerousKeys(value, depth = 0) {
    if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => stripDangerousKeys(item, depth + 1));
    }
    const clean = Object.create(null);
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      clean[key] = stripDangerousKeys(value[key], depth + 1);
    }
    return clean;
  }

  function safeJsonParse(raw, fallback = null, maxBytes = 65536) {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > maxBytes) {
      return fallback;
    }
    try {
      const parsed = JSON.parse(raw);
      return stripDangerousKeys(parsed, 0);
    } catch (_) {
      return fallback;
    }
  }

  function clampInt(value, fallback = 0, min = 0, max = 999999999) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
      return fallback;
    }
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.trunc(n);
    if (i < min) return min;
    if (i > max) return max;
    return i;
  }

  function getSafeStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function readBoundedInt(storage, key, fallback = 0, min = 0, max = 999999999) {
    if (!storage || typeof storage.getItem !== 'function') return fallback;
    try {
      const raw = storage.getItem(key);
      if (raw == null || raw === '') return fallback;
      const trimmed = String(raw).trim();
      if (trimmed.length > 64) return fallback;
      if (trimmed.startsWith('{')) {
        const parsed = safeJsonParse(trimmed, null, 256);
        if (!parsed || typeof parsed !== 'object') return fallback;
        return clampInt(parsed.value, fallback, min, max);
      }
      if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return fallback;
      return clampInt(trimmed, fallback, min, max);
    } catch (_) {
      return fallback;
    }
  }

  function writeBoundedInt(storage, key, value, min = 0, max = 999999999) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      const safe = clampInt(value, min, min, max);
      storage.setItem(key, String(safe));
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Safely renders localized text containing only literal `<b>...</b>` emphasis
   * tags (and `&amp;` entities) using DOM nodes + textContent (zero innerHTML).
   */
  function setSafeFormattedText(el, rawText, doc) {
    if (!el) return;
    const ownerDoc = doc || el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!ownerDoc) return;

    while (el.firstChild) el.removeChild(el.firstChild);

    const text = String(rawText == null ? '' : rawText).replace(/&amp;/g, '&');
    const tokenRe = /<b>([\s\S]*?)<\/b>/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRe.exec(text)) !== null) {
      if (match.index > lastIndex) {
        el.appendChild(ownerDoc.createTextNode(text.slice(lastIndex, match.index)));
      }
      const b = ownerDoc.createElement('b');
      b.textContent = match[1];
      el.appendChild(b);
      lastIndex = tokenRe.lastIndex;
    }

    if (lastIndex < text.length) {
      el.appendChild(ownerDoc.createTextNode(text.slice(lastIndex)));
    }
  }

  const Security = Object.freeze({
    DANGEROUS_KEYS,
    escapeHtml,
    sanitizeHexColor,
    stripDangerousKeys,
    safeJsonParse,
    clampInt,
    getSafeStorage,
    readBoundedInt,
    writeBoundedInt,
    setSafeFormattedText
  });

  if (typeof root !== 'undefined' && root) {
    root.StreetGrudge = root.StreetGrudge || {};
    root.StreetGrudge.Security = Security;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
  }
})(typeof window !== 'undefined' ? window : globalThis);
