const CACHE_NAME = 'hybrelete-pwa-v1';

// Core static assets required for full offline play
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap'
];

// 1. INSTALL EVENT - Pre-cache critical app shell files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching offline app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting()) // Activate new service worker immediately
    );
});

// 2. ACTIVATE EVENT - Clean up outdated cache versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// 3. FETCH EVENT - Stale-While-Revalidate with Navigation Fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Fetch fresh asset from network in background to update cache
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return index.html on navigation fetch failures (offline fallback)
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });

            // Return cached version immediately if present, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
