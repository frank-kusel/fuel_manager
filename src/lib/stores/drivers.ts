// Driver management store
// Handles CRUD operations and state for drivers with offline support

import { writable, derived } from 'svelte/store';
import type { Driver, LoadingState, SortDirection, ApiResponse } from '$lib/types';

interface DriverState {
	drivers: Driver[];
	selectedDriver: Driver | null;
	loading: LoadingState;
	error: string | null;
	lastFetch: string | null;
	sortBy: keyof Driver;
	sortDirection: SortDirection;
	searchTerm: string;
	filterActive: boolean | null;
}

// Initial state
const initialState: DriverState = {
	drivers: [],
	selectedDriver: null,
	loading: 'idle',
	error: null,
	lastFetch: null,
	sortBy: 'name',
	sortDirection: 'asc',
	searchTerm: '',
	filterActive: null
};

// Create the drivers store
function createDriverStore() {
	const { subscribe, update, set } = writable<DriverState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		// Driver data management
		setDrivers: (drivers: Driver[]) => {
			update(state => ({ 
				...state, 
				drivers, 
				loading: 'success', 
				error: null,
				lastFetch: new Date().toISOString()
			}));
		},
		
		addDriver: (driver: Driver) => {
			update(state => ({
				...state,
				drivers: [driver, ...state.drivers] // Add to beginning
			}));
		},
		
		updateDriverLocal: (updatedDriver: Driver) => {
			update(state => ({
				...state,
				drivers: state.drivers.map(driver =>
					driver.id === updatedDriver.id ? updatedDriver : driver
				),
				selectedDriver: state.selectedDriver?.id === updatedDriver.id 
					? updatedDriver 
					: state.selectedDriver
			}));
		},
		
		removeDriver: (driverId: string) => {
			update(state => ({
				...state,
				drivers: state.drivers.filter(driver => driver.id !== driverId),
				selectedDriver: state.selectedDriver?.id === driverId 
					? null 
					: state.selectedDriver
			}));
		},
		
		selectDriver: (driver: Driver | null) => {
			update(state => ({ ...state, selectedDriver: driver }));
		},
		
		// Search and filtering
		setSearchTerm: (searchTerm: string) => {
			update(state => ({ ...state, searchTerm }));
		},
		
		setFilterActive: (filterActive: boolean | null) => {
			update(state => ({ ...state, filterActive }));
		},
		
		setSorting: (sortBy: keyof Driver, sortDirection: SortDirection) => {
			update(state => ({ ...state, sortBy, sortDirection }));
		},
		
		// API operations
		loadDrivers: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getDrivers();
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						drivers: result.data || [], 
						loading: 'success',
						error: null,
						lastFetch: new Date().toISOString()
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load drivers';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		createDriver: async (driverData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.createDriver(driverData);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						const tempId = `temp_${Date.now()}`;
						await offlineService.queueForSync('driver', { ...driverData, id: tempId });
						
						const tempDriver = {
							...driverData,
							id: tempId,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						} as Driver;
						
						update(state => ({ 
							...state, 
							drivers: [tempDriver, ...state.drivers],
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
						
						return { success: true, data: tempDriver, error: null };
					} else {
						update(state => ({ 
							...state, 
							drivers: [result.data!, ...state.drivers],
							loading: 'success',
							error: null
						}));
						
						return { success: true, data: result.data!, error: null };
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('driver', { ...driverData, id: tempId });
					
					const tempDriver = {
						...driverData,
						id: tempId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					} as Driver;
					
					update(state => ({ 
						...state, 
						drivers: [tempDriver, ...state.drivers],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
					
					return { success: true, data: tempDriver, error: null };
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create driver';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		updateDriver: async (driver: Driver) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !driver.id.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.updateDriver(driver.id, driver);
					
					if (result.error) {
						// Queue for offline sync
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('driver', driver);
						
						update(state => ({ 
							...state, 
							drivers: state.drivers.map(d => d.id === driver.id ? driver : d),
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
					} else {
						update(state => ({ 
							...state, 
							drivers: state.drivers.map(d => d.id === driver.id ? result.data! : d),
							selectedDriver: state.selectedDriver?.id === driver.id ? result.data! : state.selectedDriver,
							loading: 'success',
							error: null
						}));
					}
				} else {
					// Save offline or update temp driver
					const { default: offlineService } = await import('$lib/services/offline');
					await offlineService.queueForSync('driver', driver);
					
					update(state => ({ 
						...state, 
						drivers: state.drivers.map(d => d.id === driver.id ? driver : d),
						selectedDriver: state.selectedDriver?.id === driver.id ? driver : state.selectedDriver,
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
				}
				
				return { success: true, data: driver, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update driver';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		deleteDriver: async (driverId: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !driverId.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.deleteDriver(driverId);
					
					if (result.error) {
						update(state => ({ 
							...state, 
							error: result.error, 
							loading: 'error' 
						}));
						return { success: false, error: result.error };
					}
				}
				
				// Remove from local state (whether online or offline)
				update(state => ({
					...state,
					drivers: state.drivers.filter(driver => driver.id !== driverId),
					selectedDriver: state.selectedDriver?.id === driverId ? null : state.selectedDriver,
					loading: 'success',
					error: null
				}));
				
				return { success: true, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete driver';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Utility methods
		getDriverById: (id: string): Driver | null => {
			let result: Driver | null = null;
			update(state => {
				result = state.drivers.find(driver => driver.id === id) || null;
				return state; // Don't change state
			});
			return result;
		},
		
		clearError: () => {
			update(state => ({ ...state, error: null }));
		},
		
		reset: () => set(initialState)
	};
}

const driverStore = createDriverStore();

export default driverStore;

// Derived stores for computed values
export const drivers = derived(driverStore, $store => $store.drivers);
export const selectedDriver = derived(driverStore, $store => $store.selectedDriver);
export const driverLoading = derived(driverStore, $store => $store.loading);
export const driverError = derived(driverStore, $store => $store.error);

// Filtered and sorted drivers
export const filteredDrivers = derived(driverStore, $store => {
	let filtered = $store.drivers;

	// Apply search filter
	if ($store.searchTerm) {
		const term = $store.searchTerm.toLowerCase();
		filtered = filtered.filter(driver =>
			driver.name.toLowerCase().includes(term) ||
			driver.employee_code.toLowerCase().includes(term) ||
			driver.phone.toLowerCase().includes(term) ||
			driver.email.toLowerCase().includes(term)
		);
	}

	// Apply active filter
	if ($store.filterActive !== null) {
		filtered = filtered.filter(driver => driver.active === $store.filterActive);
	}

	// Apply sorting
	filtered.sort((a, b) => {
		const aVal = a[$store.sortBy];
		const bVal = b[$store.sortBy];
		
		if (typeof aVal === 'string' && typeof bVal === 'string') {
			const result = aVal.localeCompare(bVal);
			return $store.sortDirection === 'asc' ? result : -result;
		}
		
		if (typeof aVal === 'number' && typeof bVal === 'number') {
			const result = aVal - bVal;
			return $store.sortDirection === 'asc' ? result : -result;
		}
		
		if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
			const result = aVal === bVal ? 0 : aVal ? 1 : -1;
			return $store.sortDirection === 'asc' ? result : -result;
		}
		
		return 0;
	});

	return filtered;
});

// Active drivers only
export const activeDrivers = derived(drivers, $drivers => 
	$drivers.filter(driver => driver.active)
);

// Driver statistics
export const driverStats = derived(drivers, $drivers => ({
	total: $drivers.length,
	active: $drivers.filter((d: Driver) => d.active).length,
	inactive: $drivers.filter((d: Driver) => !d.active).length,
	withValidLicense: $drivers.filter((d: Driver) => {
		if (!d.license_expiry) return false;
		return new Date(d.license_expiry) > new Date();
	}).length
}));