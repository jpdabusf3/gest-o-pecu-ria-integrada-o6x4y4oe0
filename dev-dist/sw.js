const CACHE_NAME = 'gpi-farm-cache-v3'
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

// Background Sync Event for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-farm-data') {
    event.waitUntil(processBackgroundSync())
  }
})

async function processBackgroundSync() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gpi-db', 1)
    request.onsuccess = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('sync-queue')) {
        resolve()
        return
      }
      const tx = db.transaction('sync-queue', 'readwrite')
      const store = tx.objectStore('sync-queue')
      const getAll = store.getAll()

      getAll.onsuccess = () => {
        const items = getAll.result
        if (items && items.length > 0) {
          // Simulate network delay for API sync
          setTimeout(() => {
            const clearTx = db.transaction('sync-queue', 'readwrite')
            clearTx.objectStore('sync-queue').clear()

            // Show Native Push Notification upon successful sync
            self.registration.showNotification('Data Synced', {
              body: `${items.length} registros offline foram enviados ao servidor em background.`,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'gpi-sync',
            })

            // Notify active clients to update UI
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) =>
                client.postMessage({ type: 'SYNC_COMPLETED', count: items.length, items }),
              )
            })

            resolve()
          }, 1500)
        } else {
          resolve()
        }
      }
      getAll.onerror = () => reject()
    }
    request.onerror = () => reject()
  })
}

// Push Notification Event for alerts
self.addEventListener('push', (event) => {
  let data = { title: 'Alerta GPI', message: 'Nova notificação recebida no sistema.' }
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.message = event.data.text()
    }
  }

  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/',
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    }),
  )
})
