// Service Worker: macht die App installierbar und laedt die Oberflaeche schnell.
// Bei Aenderungen an den Dateien die Versionsnummer erhoehen (v1 -> v2).
const CACHE = 'travels-v2';
const SHELL = ['./', './index.html', './style.css', './app.js', './config.js', './manifest.json', './assets/profilepic.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Nur eigene Dateien cachen. Supabase und Geocoding gehen immer direkt ins Netz.
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(r);
      const net = fetch(r)
        .then((res) => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
