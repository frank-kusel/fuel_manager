// Service Worker for Fuel Manager App
// Provides offline functionality and background sync

const CACHE_NAME = 'fuel-manager-v1';
const OFFLINE_CACHE_NAME = 'fuel-manager-offline-v1';

// Files to cache for offline functionality
const CACHE_FILES = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/config.local.js',
    '/manifest.json',
    // External dependencies
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated successfully');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Handle Supabase API requests
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // If online, cache the response and return it
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(OFFLINE_CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If offline, try to serve from cache
                    console.log('Service Worker: Serving Supabase request from cache');
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return empty response for failed requests
                        return new Response(JSON.stringify([]), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }

    // Handle app files
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Try to fetch from network
                return fetch(request)
                    .then((response) => {
                        // Cache successful responses
                        if (response.ok && request.method === 'GET') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page or appropriate fallback
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Background Sync event - handle offline fuel entries
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'fuel-entry-sync') {
        event.waitUntil(
            syncOfflineFuelEntries()
        );
    }
});

// Function to sync offline fuel entries
async function syncOfflineFuelEntries() {
    try {
        console.log('Service Worker: Starting fuel entry sync...');
        
        // Get offline entries from IndexedDB
        const offlineEntries = await getOfflineFuelEntries();
        
        if (offlineEntries.length === 0) {
            console.log('Service Worker: No offline entries to sync');
            return;
        }

        console.log(`Service Worker: Found ${offlineEntries.length} offline entries to sync`);

        // Try to sync each entry
        for (const entry of offlineEntries) {
            try {
                await syncSingleFuelEntry(entry);
                await removeOfflineFuelEntry(entry.id);
                console.log('Service Worker: Successfully synced entry:', entry.id);
            } catch (error) {
                console.error('Service Worker: Failed to sync entry:', entry.id, error);
                // Keep entry for next sync attempt
            }
        }

        // Notify the main app that sync completed
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                syncedCount: offlineEntries.length
            });
        });

    } catch (error) {
        console.error('Service Worker: Background sync failed:', error);
    }
}

// Function to sync a single fuel entry
async function syncSingleFuelEntry(entry) {
    const response = await fetch('https://szskplrwmeuahwvicyos.supabase.co/rest/v1/fuel_entries', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDkzMTEsImV4cCI6MjA2OTI4NTMxMX0.phbhjcVVF-ENJn167Pd0XxlF_VicDcJW7id5K8Vy7Mc',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDkzMTEsImV4cCI6MjA2OTI4NTMxMX0.phbhjcVVF-ENJn167Pd0XxlF_VicDcJW7id5K8Vy7Mc',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(entry.data)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// IndexedDB helper functions for offline storage
async function getOfflineFuelEntries() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FuelManagerDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['offlineFuelEntries'], 'readonly');
            const store = transaction.objectStore('offlineFuelEntries');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('offlineFuelEntries')) {
                db.createObjectStore('offlineFuelEntries', { keyPath: 'id' });
            }
        };
    });
}

async function removeOfflineFuelEntry(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FuelManagerDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['offlineFuelEntries'], 'readwrite');
            const store = transaction.objectStore('offlineFuelEntries');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}