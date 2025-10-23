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
	loading: boolean;
	error: string | null;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (reference data rarely changes)

const initialState: ReferenceDataState = {
	vehicles: [],
	drivers: [],
	activities: [],
	fields: [],
	zones: [],
	bowsers: [],
	timestamp: null,
	loading: false,
	error: null
};

function createReferenceDataStore() {
	const { subscribe, set, update } = writable<ReferenceDataState>(initialState);

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

		// Load all reference data in parallel
		loadAllData: async () => {
			// Check if we have valid cached data
			let currentState: ReferenceDataState = initialState;
			subscribe(state => { currentState = state; })();

			if (currentState.timestamp) {
				const now = Date.now();
				const age = now - currentState.timestamp;
				if (age < CACHE_DURATION) {
					// Cache is still valid, no need to reload
					return;
				}
			}

			update(state => ({ ...state, loading: true, error: null }));

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
			}
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

		// Invalidate cache (force reload on next access)
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
	$vehicles.filter(v => v.is_active !== false)
);

// Helper: Get active drivers only
export const activeDrivers = derived(drivers, $drivers =>
	$drivers.filter(d => d.is_active !== false)
);

// Helper: Get active bowsers only
export const activeBowsers = derived(bowsers, $bowsers =>
	$bowsers.filter(b => b.active !== false)
);
