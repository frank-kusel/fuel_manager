import type { CacheEntry } from '$lib/types';

class CacheService {
	private readonly prefix = 'farmtrack_cache_';
	private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	// Store data in cache
	set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
		if (typeof window === 'undefined') return;

		const entry: CacheEntry<T> = {
			data,
			timestamp: new Date().toISOString(),
			expires: new Date(Date.now() + ttl).toISOString()
		};

		try {
			localStorage.setItem(this.prefix + key, JSON.stringify(entry));
		} catch (error) {
			console.warn('Failed to cache data:', error);
			// If localStorage is full, try to clear old entries
			this.clearExpired();
		}
	}

	// Get data from cache
	get<T>(key: string): T | null {
		if (typeof window === 'undefined') return null;

		try {
			const item = localStorage.getItem(this.prefix + key);
			if (!item) return null;

			const entry: CacheEntry<T> = JSON.parse(item);
			
			// Check if expired
			if (new Date() > new Date(entry.expires)) {
				this.delete(key);
				return null;
			}

			return entry.data;
		} catch (error) {
			console.warn('Failed to read from cache:', error);
			this.delete(key); // Remove corrupted entry
			return null;
		}
	}

	// Check if key exists and is not expired
	has(key: string): boolean {
		return this.get(key) !== null;
	}

	// Delete specific cache entry
	delete(key: string): void {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(this.prefix + key);
	}

	// Clear all cache entries
	clear(): void {
		if (typeof window === 'undefined') return;

		const keys = Object.keys(localStorage);
		keys.forEach(key => {
			if (key.startsWith(this.prefix)) {
				localStorage.removeItem(key);
			}
		});
	}

	// Clear only expired entries
	clearExpired(): void {
		if (typeof window === 'undefined') return;

		const keys = Object.keys(localStorage);
		const now = new Date();

		keys.forEach(key => {
			if (key.startsWith(this.prefix)) {
				try {
					const item = localStorage.getItem(key);
					if (item) {
						const entry: CacheEntry = JSON.parse(item);
						if (now > new Date(entry.expires)) {
							localStorage.removeItem(key);
						}
					}
				} catch (error) {
					// Remove corrupted entries
					localStorage.removeItem(key);
				}
			}
		});
	}

	// Get cache statistics
	getStats(): { total: number; expired: number; size: number } {
		if (typeof window === 'undefined') return { total: 0, expired: 0, size: 0 };

		const keys = Object.keys(localStorage);
		const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
		const now = new Date();
		let expired = 0;
		let totalSize = 0;

		cacheKeys.forEach(key => {
			const item = localStorage.getItem(key);
			if (item) {
				totalSize += item.length;
				try {
					const entry: CacheEntry = JSON.parse(item);
					if (now > new Date(entry.expires)) {
						expired++;
					}
				} catch (error) {
					expired++; // Count corrupted entries as expired
				}
			}
		});

		return {
			total: cacheKeys.length,
			expired,
			size: totalSize
		};
	}

	// Cache with automatic refresh function
	async getOrSet<T>(
		key: string,
		fetchFunction: () => Promise<T>,
		ttl: number = this.defaultTTL
	): Promise<T> {
		// Try to get from cache first
		const cached = this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		// Fetch fresh data and cache it
		try {
			const data = await fetchFunction();
			this.set(key, data, ttl);
			return data;
		} catch (error) {
			console.error('Failed to fetch data for cache:', error);
			throw error;
		}
	}

	// Cache data with versioning (for API responses)
	setVersioned<T>(key: string, data: T, version: string, ttl: number = this.defaultTTL): void {
		const versionedKey = `${key}_v${version}`;
		this.set(versionedKey, data, ttl);
		
		// Also store the current version
		this.set(`${key}_version`, version, ttl);
	}

	// Get versioned data
	getVersioned<T>(key: string, expectedVersion?: string): T | null {
		if (expectedVersion) {
			const versionedKey = `${key}_v${expectedVersion}`;
			return this.get<T>(versionedKey);
		}

		// Get current version and fetch that data
		const currentVersion = this.get<string>(`${key}_version`);
		if (!currentVersion) return null;

		const versionedKey = `${key}_v${currentVersion}`;
		return this.get<T>(versionedKey);
	}

	// Refresh cache entry by re-running fetch function
	async refresh<T>(
		key: string,
		fetchFunction: () => Promise<T>,
		ttl: number = this.defaultTTL
	): Promise<T> {
		this.delete(key);
		return this.getOrSet(key, fetchFunction, ttl);
	}

	// Preload data into cache
	async preload<T>(
		key: string,
		fetchFunction: () => Promise<T>,
		ttl: number = this.defaultTTL
	): Promise<void> {
		if (!this.has(key)) {
			try {
				const data = await fetchFunction();
				this.set(key, data, ttl);
			} catch (error) {
				console.warn('Failed to preload cache data:', error);
			}
		}
	}
}

// Export singleton instance
const cacheService = new CacheService();

// Auto-cleanup expired entries periodically
if (typeof window !== 'undefined') {
	// Clean up expired entries every hour
	setInterval(() => {
		cacheService.clearExpired();
	}, 60 * 60 * 1000);
}

export default cacheService;