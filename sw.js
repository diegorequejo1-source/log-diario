/* ════════════════════════════════════════
   Service Worker — Log Diario
   Estrategia: cache-first para archivos
   propios, network-first para fuentes.
════════════════════════════════════════ */
const CACHE_NAME = 'log-diario-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './sw.js',
];

/* ── Instalación: cachear assets core ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activación: limpiar cachés viejos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first para assets propios,
         network-first para fuentes y API ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* No interceptar llamadas a la API de Anthropic ni a Google Fonts */
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    return; /* dejar que el browser lo maneje */
  }

  /* Cache-first para el resto */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          /* Cachear respuestas válidas de mismo origen */
          if (
            response.ok &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, clone)
            );
          }
          return response;
        })
        .catch(() => caches.match('./index.html')); /* fallback offline */
    })
  );
});

/* ── Mensaje de versión para debug ── */
self.addEventListener('message', event => {
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
