/*
 * Service Worker für Belegwächter.
 *  1. Offline-Betrieb: speichert die App-Dateien (nicht deine Daten).
 *  2. Benachrichtigungen: Bei der regelmäßigen Hintergrundprüfung (Periodic Background Sync) werden die
 *     Produkte direkt aus dem Gerätespeicher (IndexedDB) gelesen und fällige Erinnerungen angezeigt.
 *     Es wird nichts an einen Server gesendet.
 * Neue Version veröffentlichen: VERSION erhöhen.
 */
const VERSION = 'bw-1.0.0';
const SHELL = `${VERSION}-shell`;
const OCR = 'gb-ocr-5.1.1';
const STATE = 'bw-notify-state';           // welche Erinnerungen schon gemeldet wurden
const SYNC_TAG = 'belegwaechter-reminders';
const SHELL_FILES = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png'];
const OCR_FILES = ['ocr/tesseract.min.js', 'ocr/worker.min.js', 'ocr/core/tesseract-core-simd-lstm.wasm.js', 'ocr/core/tesseract-core-lstm.wasm.js', 'ocr/lang/deu.traineddata.gz'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== SHELL && key !== OCR && key !== STATE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const t = event.data && event.data.type;
  if (t === 'warm-ocr') event.waitUntil(warmOcr());
  if (t === 'check-reminders') event.waitUntil(checkReminders());
});

async function warmOcr() {
  const cache = await caches.open(OCR);
  for (const f of OCR_FILES) {
    try {
      if (await cache.match(f)) continue;
      const res = await fetch(f, { cache: 'no-cache' });
      if (res.ok) await cache.put(f, res);
    } catch (e) { /* offline oder nicht vorhanden */ }
  }
}

/* ---------- Erinnerungen ---------- */
self.addEventListener('periodicsync', event => {
  if (event.tag === SYNC_TAG) event.waitUntil(checkReminders());
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('garantiebox');
    // Gibt es die Datenbank noch nicht, nichts anlegen (das macht nur die App selbst).
    req.onupgradeneeded = () => { req.transaction.abort(); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function allProducts(db) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('products')) return resolve([]);
    const r = db.transaction('products', 'readonly').objectStore('products').getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
const pad = n => String(n).padStart(2, '0');
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function diffDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
function fmt(iso) { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; }
/** Gleiche Regel wie in der App: engste überschrittene Erinnerung, solange nicht als erledigt markiert. */
function dueFor(p, today) {
  if (!p || !p.warrantyEnd) return null;
  const days = diffDays(today, p.warrantyEnd);
  if (days < 0) return null;
  const crossed = (p.reminders || []).filter(r => days <= r).sort((a, b) => a - b);
  if (!crossed.length) return null;
  const threshold = crossed[0];
  if ((p.reminderAcks || []).includes(threshold)) return null;
  return { p, days, threshold };
}
async function readState() {
  const c = await caches.open(STATE), r = await c.match('state.json');
  try { return r ? await r.json() : {}; } catch (e) { return {}; }
}
async function writeState(st) {
  const c = await caches.open(STATE);
  await c.put('state.json', new Response(JSON.stringify(st), { headers: { 'Content-Type': 'application/json' } }));
}
async function checkReminders() {
  if (self.Notification && Notification.permission !== 'granted') return;
  let db;
  try { db = await openDb(); } catch (e) { return; }
  const products = await allProducts(db).catch(() => []);
  db.close();
  const today = todayIso();
  const state = await readState();
  const due = products.map(p => dueFor(p, today)).filter(Boolean)
    .filter(d => !state[`${d.p.id}:${d.threshold}`]).sort((a, b) => a.days - b.days);
  if (!due.length) return;
  const show = due.slice(0, 4);
  for (const d of show) {
    const title = d.days === 0 ? 'Garantie endet heute' : d.days === 1 ? 'Garantie endet morgen' : `Garantie endet in ${d.days} Tagen`;
    await self.registration.showNotification(title, {
      body: `${d.p.name} – Garantie bis ${fmt(d.p.warrantyEnd)}`,
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      tag: 'bw-' + d.p.id, data: { url: './#/product/' + encodeURIComponent(d.p.id) }
    });
  }
  if (due.length > show.length) {
    await self.registration.showNotification('Weitere Garantien laufen bald ab', {
      body: `${due.length - show.length} weitere Erinnerungen in Belegwächter`, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      tag: 'bw-more', data: { url: './#/dashboard' }
    });
  }
  for (const d of due) state[`${d.p.id}:${d.threshold}`] = today;
  await writeState(state);
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if ('focus' in w) { await w.focus(); if ('navigate' in w) await w.navigate(url).catch(() => {}); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

/* ---------- Dateien ausliefern ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
        if (res && res.ok) { cache.put('index.html', res.clone()); return res; }
        throw new Error('bad response');
      } catch (e) {
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  if (url.pathname.includes('/ocr/')) {
    event.respondWith((async () => {
      const cache = await caches.open(OCR);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
