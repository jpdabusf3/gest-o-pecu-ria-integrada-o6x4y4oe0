const CACHE_NAME = 'gpi-farm-cache-v2'
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json']

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    }),
  )
  self.skipWaiting()
})

// Activate event: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event: Network first, fallback to cache for offline capabilities
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Don't cache extension requests or non-http
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response and save it to the cache if it's a valid successful response
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // If network fails, try to return the cached response
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // If the request is for a navigation page and not cached, return the root index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
          return new Response('Offline - Rede Indisponível', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        })
      }),
  )
})
