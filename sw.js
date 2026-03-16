/*
================================================================================
ARCHIVO: sw.js
DESCRIPCIÓN: Service Worker para BrayanSport&Variedades.
ESTADO: Producción. Configurado para arquitectura modular ES6.
================================================================================
*/

const CACHE_NAME = 'brayansport-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/api.js',
  './js/state.js',
  './js/ui/core.js',
  './js/ui/inventory.js',
  './js/ui/pos.js',
  './js/ui/finance.js',
  './js/ui/ecomm.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usamos map y catch individual para evitar que un 404 (como el de los iconos) aborte el cacheo del resto de la app
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
          }).catch(err => console.warn('Recurso no cacheado (esperado si falta logo):', url))
        )
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones a la API de Google Apps Script para evitar bloqueos de CORS en caché
  if (event.request.url.includes('script.google.com')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
