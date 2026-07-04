import { writable, derived } from 'svelte/store';

interface FuelSummaryEntry {
	id: string;
	entry_date: string;
	time: string;
	field_selection_mode?: 'single' | 'multiple';
	vehicles?: { code: string; name: string };
	drivers?: { employee_code: string; name: string };
	activities?: { name: string; code?: string };
	fields?: { code: string; name: string };
	zones?: { code: string; name: string };
	litres_dispensed: number;
	odometer_start: number | null;
	odometer_end: number | null;
	gauge_working: boolean | null;
	bowser_reading_start: number | null;
	bowser_reading_end: number | null;
}

interface SummaryCacheState {
	entries: FuelSummaryEntry[];
	fieldNamesMap: Record<string, string>;
	timestamp: number | null;
	/** Set by mutations: data is outdated but still renderable (SWR) —
	 * pages keep showing it and refresh silently. */
	stale: boolean;
	loading: boolean;
	error: string | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'farmtrack_summary_cache_v1';

const initialState: SummaryCacheState = {
	entries: [],
	fieldNamesMap: {},
	timestamp: null,
	stale: false,
	loading: false,
	error: null
};

// Hydrate from localStorage so a cold app-open renders the last-known log
// instantly (stale-while-revalidate) instead of waiting ~1s for Supabase
// in London. Fresh data replaces it silently in the background.
function loadPersisted(): SummaryCacheState {
	try {
		if (typeof localStorage === 'undefined') return initialState;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return initialState;
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed.entries)) return initialState;
		return {
			...initialState,
			entries: parsed.entries,
			fieldNamesMap: parsed.fieldNamesMap || {},
			timestamp: parsed.timestamp || null,
			stale: !!parsed.stale
		};
	} catch {
		return initialState;
	}
}

function persist(state: SummaryCacheState) {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				entries: state.entries,
				fieldNamesMap: state.fieldNamesMap,
				timestamp: state.timestamp,
				stale: state.stale
			})
		);
	} catch {
		// Quota/private mode — cache stays in-memory only.
	}
}

function createSummaryCacheStore() {
	const { subscribe, set, update } = writable<SummaryCacheState>(loadPersisted());

	return {
		subscribe,

		// Check if cache is still valid (fresh and not marked stale by a mutation)
		isCacheValid: (): boolean => {
			let isValid = false;
			subscribe(state => {
				if (!state.timestamp || state.stale) {
					isValid = false;
					return;
				}
				const now = Date.now();
				const age = now - state.timestamp;
				isValid = age < CACHE_DURATION;
			})();
			return isValid;
		},

		// Get cached data (only if valid)
		getCachedData: (): { entries: FuelSummaryEntry[]; fieldNamesMap: Record<string, string> } | null => {
			let result: { entries: FuelSummaryEntry[]; fieldNamesMap: Record<string, string> } | null = null;
			subscribe(state => {
				if (!state.timestamp || state.stale) {
					result = null;
					return;
				}
				const now = Date.now();
				const age = now - state.timestamp;
				if (age < CACHE_DURATION) {
					result = {
						entries: state.entries,
						fieldNamesMap: state.fieldNamesMap
					};
				}
			})();
			return result;
		},

		// Set loading state
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},

		// Set error
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: false }));
		},

		// Get cached data regardless of age, flagged with freshness — for
		// stale-while-revalidate rendering.
		getAnyCachedData: (): {
			entries: FuelSummaryEntry[];
			fieldNamesMap: Record<string, string>;
			fresh: boolean;
		} | null => {
			let result: {
				entries: FuelSummaryEntry[];
				fieldNamesMap: Record<string, string>;
				fresh: boolean;
			} | null = null;
			subscribe(state => {
				if (!state.timestamp || state.entries.length === 0) {
					result = null;
					return;
				}
				result = {
					entries: state.entries,
					fieldNamesMap: state.fieldNamesMap,
					fresh: !state.stale && Date.now() - state.timestamp < CACHE_DURATION
				};
			})();
			return result;
		},

		// Update cache with new data
		updateCache: (entries: FuelSummaryEntry[], fieldNamesMap: Record<string, string>) => {
			update(state => {
				const next = {
					...state,
					entries,
					fieldNamesMap,
					timestamp: Date.now(),
					stale: false,
					loading: false,
					error: null
				};
				persist(next);
				return next;
			});
		},

		// Update field names map only (for incremental updates)
		updateFieldNamesMap: (newFieldNames: Record<string, string>) => {
			update(state => ({
				...state,
				fieldNamesMap: { ...state.fieldNamesMap, ...newFieldNames }
			}));
		},

		// Mark stale: the next load refetches, but pages keep rendering the
		// old data meanwhile (never a spinner over a populated list).
		invalidate: () => {
			update(state => {
				const next = { ...state, stale: true };
				persist(next);
				return next;
			});
		},

		// Clear all data
		clear: () => {
			set(initialState);
		}
	};
}

export const summaryCacheStore = createSummaryCacheStore();

// Derived stores for convenient access
export const summaryEntries = derived(summaryCacheStore, $store => $store.entries);
export const summaryFieldNamesMap = derived(summaryCacheStore, $store => $store.fieldNamesMap);
export const summaryLoading = derived(summaryCacheStore, $store => $store.loading);
export const summaryError = derived(summaryCacheStore, $store => $store.error);
export const summaryCacheTimestamp = derived(summaryCacheStore, $store => $store.timestamp);
