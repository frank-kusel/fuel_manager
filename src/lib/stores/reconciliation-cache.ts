// Reconciliation data caching store
// Provides intelligent caching for reconciliation data to improve performance

import { writable, derived } from 'svelte/store';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expires: number;
}

interface ReconciliationCacheState {
	fuelData: Map<string, CacheEntry<any>>;
	tankData: Map<string, CacheEntry<any>>;
	history: CacheEntry<any[]> | null;
	isLoading: Set<string>;
}

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
	FUEL_DATA: 5 * 60 * 1000, // 5 minutes
	TANK_DATA: 10 * 60 * 1000, // 10 minutes
	HISTORY: 2 * 60 * 1000, // 2 minutes
};

// Initial state
const initialState: ReconciliationCacheState = {
	fuelData: new Map(),
	tankData: new Map(),
	history: null,
	isLoading: new Set()
};

// Create the main store
export const reconciliationCache = writable<ReconciliationCacheState>(initialState);

// Helper functions
function createCacheKey(startDate: string, endDate: string): string {
	return `${startDate}_${endDate}`;
}

function isExpired(entry: CacheEntry<any>): boolean {
	return Date.now() > entry.expires;
}

function createCacheEntry<T>(data: T, ttl: number): CacheEntry<T> {
	const now = Date.now();
	return {
		data,
		timestamp: now,
		expires: now + ttl
	};
}

// Cache management functions
export const cacheActions = {
	// Fuel data caching
	getFuelData(startDate: string, endDate: string): any | null {
		let result: any | null = null;
		
		reconciliationCache.update(state => {
			const key = createCacheKey(startDate, endDate);
			const entry = state.fuelData.get(key);
			
			if (entry && !isExpired(entry)) {
				result = entry.data;
			}
			
			return state;
		});
		
		return result;
	},

	setFuelData(startDate: string, endDate: string, data: any): void {
		reconciliationCache.update(state => {
			const key = createCacheKey(startDate, endDate);
			state.fuelData.set(key, createCacheEntry(data, CACHE_TTL.FUEL_DATA));
			return state;
		});
	},

	// Tank data caching
	getTankData(date: string): any | null {
		let result: any | null = null;
		
		reconciliationCache.update(state => {
			const entry = state.tankData.get(date);
			
			if (entry && !isExpired(entry)) {
				result = entry.data;
			}
			
			return state;
		});
		
		return result;
	},

	setTankData(date: string, data: any): void {
		reconciliationCache.update(state => {
			state.tankData.set(date, createCacheEntry(data, CACHE_TTL.TANK_DATA));
			return state;
		});
	},

	// History caching
	getHistory(): any[] | null {
		let result: any[] | null = null;
		
		reconciliationCache.update(state => {
			if (state.history && !isExpired(state.history)) {
				result = state.history.data;
			}
			
			return state;
		});
		
		return result;
	},

	setHistory(data: any[]): void {
		reconciliationCache.update(state => {
			state.history = createCacheEntry(data, CACHE_TTL.HISTORY);
			return state;
		});
	},

	// Loading state management
	setLoading(key: string, loading: boolean): void {
		reconciliationCache.update(state => {
			if (loading) {
				state.isLoading.add(key);
			} else {
				state.isLoading.delete(key);
			}
			return state;
		});
	},

	isLoading(key: string): boolean {
		let result = false;
		
		reconciliationCache.update(state => {
			result = state.isLoading.has(key);
			return state;
		});
		
		return result;
	},

	// Cache invalidation
	invalidateFuelData(startDate?: string, endDate?: string): void {
		reconciliationCache.update(state => {
			if (startDate && endDate) {
				// Invalidate specific entry
				const key = createCacheKey(startDate, endDate);
				state.fuelData.delete(key);
			} else {
				// Invalidate all fuel data
				state.fuelData.clear();
			}
			return state;
		});
	},

	invalidateTankData(date?: string): void {
		reconciliationCache.update(state => {
			if (date) {
				// Invalidate specific entry
				state.tankData.delete(date);
			} else {
				// Invalidate all tank data
				state.tankData.clear();
			}
			return state;
		});
	},

	invalidateHistory(): void {
		reconciliationCache.update(state => {
			state.history = null;
			return state;
		});
	},

	// Clear all cache
	clearAll(): void {
		reconciliationCache.set(initialState);
	},

	// Cleanup expired entries
	cleanup(): void {
		reconciliationCache.update(state => {
			// Clean expired fuel data
			for (const [key, entry] of state.fuelData.entries()) {
				if (isExpired(entry)) {
					state.fuelData.delete(key);
				}
			}

			// Clean expired tank data
			for (const [key, entry] of state.tankData.entries()) {
				if (isExpired(entry)) {
					state.tankData.delete(key);
				}
			}

			// Clean expired history
			if (state.history && isExpired(state.history)) {
				state.history = null;
			}

			return state;
		});
	}
};

// Derived stores for convenience
export const fuelDataCache = derived(
	reconciliationCache,
	$cache => $cache.fuelData
);

export const tankDataCache = derived(
	reconciliationCache,
	$cache => $cache.tankData
);

export const historyCache = derived(
	reconciliationCache,
	$cache => $cache.history
);

export const loadingStates = derived(
	reconciliationCache,
	$cache => $cache.isLoading
);

// Cache statistics for debugging
export const cacheStats = derived(
	reconciliationCache,
	$cache => ({
		fuelDataEntries: $cache.fuelData.size,
		tankDataEntries: $cache.tankData.size,
		hasHistory: !!$cache.history,
		loadingOperations: $cache.isLoading.size
	})
);

// Auto-cleanup timer (runs every 5 minutes)
if (typeof window !== 'undefined') {
	setInterval(() => {
		cacheActions.cleanup();
	}, 5 * 60 * 1000);
}