const CACHE_NAME = 'fpfs-atletas-v1';
const urlsToCache = [
  '/Atletas/',
  '/Atletas/index.html',
  '/Atletas/style.css',
  '/Atletas/script.js',
  '/Atletas/manifest.json',
  '/Atletas/icon-192.png',
  '/Atletas/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});