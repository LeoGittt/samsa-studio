// Samsa Studio — Service Worker
// Cachea assets de Threedium CDN para carga instantánea en visitas repetidas

var CACHE_NAME = 'samsa-3d-v1';

// Assets que pre-cacheamos en el install
var PRECACHE = [
    'https://distcdn.unlimited3d.com/pres/v/2.10.0/unlimited3d.min.js'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(PRECACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    // Limpia caches viejas si cambiamos CACHE_NAME
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    var url = e.request.url;

    // Solo interceptamos requests a los CDNs de Threedium
    if(url.indexOf('unlimited3d.com') === -1 && url.indexOf('threedium.com') === -1) {
        return;
    }

    // Estrategia: Cache first → red como fallback
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if(cached) {
                // Actualizamos la caché en segundo plano (stale-while-revalidate)
                var update = fetch(e.request).then(function(response) {
                    if(response && response.ok) {
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(e.request, response.clone());
                        });
                    }
                    return response;
                }).catch(function() {});
                return cached;
            }
            // No está en caché: descargamos y guardamos
            return fetch(e.request).then(function(response) {
                if(!response || !response.ok) return response;
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(e.request, clone);
                });
                return response;
            });
        })
    );
});
