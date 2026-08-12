import { writable, derived } from 'svelte/store';
import type { Vehicle, Driver, Activity, Field, Zone, Bowser } from '$lib/types';

interface ReferenceDataState {
	vehicles: Vehicle[];
	drivers: Driver[];
	activities: Activity[];
	fields: Field[];
	zones: Zone[];
	bowsers: Bowser[];
	timestamp: number | null;
	/** Set by mutations: data is outdated but still renderable (SWR) —
	 * pickers keep showing it and refresh silently. */
	stale: boolean;
	loading: boolean;
	error: string | null;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (reference data rarely changes)
const STORAGE_KEY = 'farmtrack_reference_cache_v1';

const initialState: ReferenceDataState = {
	vehicles: [],
	drivers: [],
	activities: [],
	fields: [],
	zones: [],
	bowsers: [],
	timestamp: null,
	stale: false,
	loading: false,
	error: null
};

// Hydrate from localStorage so a cold app-open has populated pickers instantly
// instead of waiting on 8 round trips to Supabase in Frankfurt. Fresh data
// replaces it silently in the background. Mirrors summary-cache.ts.
function loadPersisted(): ReferenceDataState {
	try {
		if (typeof localStorage === 'undefined') return initialState;
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return initialState;
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed.vehicles)) return initialState;
		return {
			...initialState,
			vehicles: parsed.vehicles || [],
			drivers: parsed.drivers || [],
			activities: parsed.activities || [],
			fields: parsed.fields || [],
			zones: parsed.zones || [],
			bowsers: parsed.bowsers || [],
			timestamp: parsed.timestamp || null,
			stale: !!parsed.stale
		};
	} catch {
		return initialState;
	}
}

function persist(state: ReferenceDataState) {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				vehicles: state.vehicles,
				drivers: state.drivers,
				activities: state.activities,
				fields: state.fields,
				zones: state.zones,
				bowsers: state.bowsers,
				timestamp: state.timestamp,
				stale: state.stale
			})
		);
	} catch {
		// Quota/private mode — cache stays in-memory only.
	}
}

/** True when nothing worth persisting changed — lets loading/error flips skip
 * a ~80KB JSON.stringify on every state transition. */
function sameCachedPayload(a: ReferenceDataState, b: ReferenceDataState): boolean {
	return (
		a.vehicles === b.vehicles &&
		a.drivers === b.drivers &&
		a.activities === b.activities &&
		a.fields === b.fields &&
		a.zones === b.zones &&
		a.bowsers === b.bowsers &&
		a.timestamp === b.timestamp &&
		a.stale === b.stale
	);
}

function createReferenceDataStore() {
	const { subscribe, set: rawSet, update: rawUpdate } = writable<ReferenceDataState>(loadPersisted());

	// Wrap set/update so every mutation persists automatically — no call site
	// has to remember to write through.
	const set = (value: ReferenceDataState) => {
		rawSet(value);
		persist(value);
	};
	const update = (fn: (state: ReferenceDataState) => ReferenceDataState) => {
		rawUpdate(prev => {
			const next = fn(prev);
			if (!sameCachedPayload(prev, next)) persist(next);
			return next;
		});
	};

	/** In-flight loadAllData, shared so the five concurrent callers on a cold
	 * navigation don't each fire the full 8-request burst. */
	let inFlight: Promise<void> | null = null;

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

		// Load all reference data in parallel. force=true bypasses the cache —
		// used after CRUD edits so pickers refresh immediately.
		//
		// Stale-while-revalidate: whatever was persisted from the last session is
		// already in the store (hydrated at construction), so pickers render
		// immediately and the refetch below runs silently. `loading` is only set
		// when there is genuinely nothing to show.
		loadAllData: async (force = false) => {
			// Check if we have valid cached data
			let currentState: ReferenceDataState = initialState;
			subscribe(state => { currentState = state; })();

			if (!force && currentState.timestamp && !currentState.stale) {
				const now = Date.now();
				const age = now - currentState.timestamp;
				if (age < CACHE_DURATION) {
					// Cache is still valid, no need to reload
					return;
				}
			}

			// Share one in-flight request across concurrent callers.
			if (inFlight) return inFlight;

			const hasRenderableData = currentState.timestamp !== null;
			update(state => ({ ...state, loading: !hasRenderableData, error: null }));

			inFlight = (async () => {
				try {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();

					// Load all reference data in parallel
					const [
						vehiclesResult,
						driversResult,
						activitiesResult,
						fieldsResult,
						zonesResult,
						bowsersResult
					] = await Promise.all([
						supabaseService.getVehicles(),
						supabaseService.getDrivers(),
						supabaseService.getActivities(),
						supabaseService.getFields(),
						supabaseService.getZones(),
						supabaseService.getBowsers()
					]);

					// Check for errors
					if (vehiclesResult.error) throw new Error(vehiclesResult.error);
					if (driversResult.error) throw new Error(driversResult.error);
					if (activitiesResult.error) throw new Error(activitiesResult.error);
					if (fieldsResult.error) throw new Error(fieldsResult.error);
					if (zonesResult.error) throw new Error(zonesResult.error);
					if (bowsersResult.error) throw new Error(bowsersResult.error);

					update(state => ({
						...state,
						vehicles: vehiclesResult.data || [],
						drivers: driversResult.data || [],
						activities: activitiesResult.data || [],
						fields: fieldsResult.data || [],
						zones: zonesResult.data || [],
						bowsers: bowsersResult.data || [],
						timestamp: Date.now(),
						stale: false,
						loading: false,
						error: null
					}));
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : 'Failed to load reference data';
					update(state => ({
						...state,
						loading: false,
						error: errorMsg
					}));
				} finally {
					inFlight = null;
				}
			})();

			return inFlight;
		},

		// Load specific data type (for individual updates)
		loadVehicles: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getVehicles();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					vehicles: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load vehicles:', err);
			}
		},

		loadDrivers: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getDrivers();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					drivers: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load drivers:', err);
			}
		},

		loadActivities: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getActivities();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					activities: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load activities:', err);
			}
		},

		loadFields: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getFields();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					fields: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load fields:', err);
			}
		},

		loadZones: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getZones();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					zones: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load zones:', err);
			}
		},

		loadBowsers: async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getBowsers();
				if (result.error) throw new Error(result.error);
				update(state => ({
					...state,
					bowsers: result.data || [],
					timestamp: Date.now()
				}));
			} catch (err) {
				console.error('Failed to load bowsers:', err);
			}
		},

		// Mark stale: data is kept and keeps rendering, but the next loadAllData
		// refetches instead of returning early. Nulling the timestamp here would
		// throw the cached pickers away and put a spinner over them.
		invalidate: () => {
			update(state => ({
				...state,
				stale: true
			}));
		},

		// Clear all data
		clear: () => {
			set(initialState);
			try {
				if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Private mode — nothing persisted to remove.
			}
		}
	};
}

export const referenceDataStore = createReferenceDataStore();

// Derived stores for convenient access
export const vehicles = derived(referenceDataStore, $store => $store.vehicles);
export const drivers = derived(referenceDataStore, $store => $store.drivers);
export const activities = derived(referenceDataStore, $store => $store.activities);
export const fields = derived(referenceDataStore, $store => $store.fields);
export const zones = derived(referenceDataStore, $store => $store.zones);
export const bowsers = derived(referenceDataStore, $store => $store.bowsers);
export const referenceDataLoading = derived(referenceDataStore, $store => $store.loading);
export const referenceDataError = derived(referenceDataStore, $store => $store.error);
export const referenceDataTimestamp = derived(referenceDataStore, $store => $store.timestamp);

// Helper: Get active vehicles only
export const activeVehicles = derived(vehicles, $vehicles =>
	$vehicles.filter(v => v.active !== false)
);

// Helper: Get active drivers only
export const activeDrivers = derived(drivers, $drivers =>
	$drivers.filter(d => d.active !== false)
);

// Helper: Get active bowsers only
export const activeBowsers = derived(bowsers, $bowsers =>
	$bowsers.filter(b => b.active !== false)
);
