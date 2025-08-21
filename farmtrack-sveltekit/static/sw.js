// FarmTrack Service Worker
// Provides offline functionality and caching for the farm management platform

const CACHE_NAME = 'farmtrack-v1.0.0';
const CACHE_URLS = [
  '/',
  '/fuel',
  '/dashboard', 
  '/fleet',
  '/manifest.json'
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/',
  'supabase.co'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (except API)
  if (url.origin !== self.location.origin && !isApiRoute(url.href)) {
    return;
  }

  // Handle API routes with network-first strategy
  if (isApiRoute(url.href)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle app routes with cache-first strategy
  event.respondWith(cacheFirstStrategy(request));
});

// Check if URL is an API route
function isApiRoute(url) {
  return API_ROUTES.some(route => url.includes(route));
}

// Cache-first strategy for app shell and static resources
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Fetch failed, serving offline page:', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/') || new Response(
        '<h1>Offline</h1><p>FarmTrack is offline. Please check your connection.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses for offline use
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network request failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return meaningful error for API failures
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for offline data submission
self.addEventListener('sync', (event) => {
  if (event.tag === 'fuel-entry-sync') {
    console.log('[ServiceWorker] Background sync: fuel-entry-sync');
    event.waitUntil(syncOfflineFuelEntries());
  }
});

// Sync offline fuel entries when back online
async function syncOfflineFuelEntries() {
  try {
    // This will be implemented when we add IndexedDB integration
    console.log('[ServiceWorker] Syncing offline fuel entries...');
    
    // TODO: Implement actual sync logic with IndexedDB
    // 1. Get offline entries from IndexedDB
    // 2. Send to Supabase API
    // 3. Remove from offline storage on success
    
  } catch (error) {
    console.error('[ServiceWorker] Failed to sync offline entries:', error);
  }
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  const options = {
    body: 'FarmTrack notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'farmtrack-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('FarmTrack', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});