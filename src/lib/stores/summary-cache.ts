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
	loading: boolean;
	error: string | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const initialState: SummaryCacheState = {
	entries: [],
	fieldNamesMap: {},
	timestamp: null,
	loading: false,
	error: null
};

function createSummaryCacheStore() {
	const { subscribe, set, update } = writable<SummaryCacheState>(initialState);

	return {
		subscribe,

		// Check if cache is still valid
		isCacheValid: (): boolean => {
			let isValid = false;
			subscribe(state => {
				if (!state.timestamp) {
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
				if (!state.timestamp) {
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

		// Update cache with new data
		updateCache: (entries: FuelSummaryEntry[], fieldNamesMap: Record<string, string>) => {
			update(state => ({
				...state,
				entries,
				fieldNamesMap,
				timestamp: Date.now(),
				loading: false,
				error: null
			}));
		},

		// Update field names map only (for incremental updates)
		updateFieldNamesMap: (newFieldNames: Record<string, string>) => {
			update(state => ({
				...state,
				fieldNamesMap: { ...state.fieldNamesMap, ...newFieldNames }
			}));
		},

		// Invalidate cache (force reload)
		invalidate: () => {
			update(state => ({
				...state,
				timestamp: null
			}));
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
