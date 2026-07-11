/// <reference types="@sveltejs/kit" />
// FarmTrack service worker.
//
// Strategy:
// - Hashed build assets + static files: precached, served cache-first.
// - Navigations (HTML documents): network-first so a new deploy is picked up
//   immediately; cached copy (then the app shell) only when offline.
// - Supabase GETs: network-first with cache fallback for offline reads.
//
// `version` changes on every build, so old caches are purged on activate —
// no manual version bumping.
import { build, files, version } from '$service-worker';

const APP_CACHE = `farmtrack-app-${version}`;
const API_CACHE = `farmtrack-api-${version}`;
const PRECACHE = [...build, ...files, '/'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(APP_CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== APP_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	const isSupabase = url.hostname.endsWith('supabase.co');

	if (url.origin !== self.location.origin && !isSupabase) return;

	if (isSupabase) {
		event.respondWith(networkFirst(request, API_CACHE));
		return;
	}

	if (request.destination === 'document') {
		event.respondWith(networkFirst(request, APP_CACHE, '/'));
		return;
	}

	// Hashed build assets and static files never change under the same URL.
	event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	if (response.ok) {
		const cache = await caches.open(APP_CACHE);
		cache.put(request, response.clone());
	}
	return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		const cached = await caches.match(request);
		if (cached) return cached;

		if (fallbackUrl) {
			const fallback = await caches.match(fallbackUrl);
			if (fallback) return fallback;
		}
		if (request.destination === 'document') {
			return new Response(
				'<h1>Offline</h1><p>FarmTrack is offline. Please check your connection.</p>',
				{ headers: { 'Content-Type': 'text/html' } }
			);
		}
		throw error;
	}
}
