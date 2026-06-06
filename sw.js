importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const APP_VERSION = '2026.06.07.1';
const CACHE_NAME = `vericard-gate-${APP_VERSION}`;
const APP_SHELL = [
  '/gate.html',
  '/css/portal.css',
  '/js/gate.js',
  '/js/pwa.js',
  '/assets/vericard-logo.jpeg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/gate.html')))
  );
});
