const CACHE_VERSION = '1.0.3';
const CACHE_NAME = `memory-game-${CACHE_VERSION}`;
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('memory-game-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          // Only check for updates on HTML and SW files
          if (event.request.url.endsWith('.html') || event.request.url.endsWith('sw.js')) {
            fetch(event.request)
              .then((freshResponse) => {
                if (freshResponse.status === 200) {
                  // Compare the content of the responses
                  return Promise.all([freshResponse.clone().text(), response.clone().text()])
                    .then(([freshText, cachedText]) => {
                      if (freshText !== cachedText) {
                        // Only notify if content has actually changed
                        caches.open(CACHE_NAME)
                          .then((cache) => cache.put(event.request, freshResponse));
                        
                        self.clients.matchAll().then((clients) => {
                          clients.forEach((client) => {
                            client.postMessage({
                              type: 'UPDATE_AVAILABLE'
                            });
                          });
                        });
                      }
                    });
                }
              });
          }
          return response;
        }
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 