// Vehicle management store
// Handles CRUD operations and state for fleet vehicles

import { writable, derived } from 'svelte/store';
import type { Vehicle, LoadingState, SortDirection, ApiResponse } from '$lib/types';

interface VehicleState {
	vehicles: Vehicle[];
	selectedVehicle: Vehicle | null;
	loading: LoadingState;
	error: string | null;
	lastFetch: string | null;
	sortBy: keyof Vehicle;
	sortDirection: SortDirection;
	searchTerm: string;
	filterType: string | null;
}

// Initial state
const initialState: VehicleState = {
	vehicles: [],
	selectedVehicle: null,
	loading: 'idle',
	error: null,
	lastFetch: null,
	sortBy: 'code',
	sortDirection: 'asc',
	searchTerm: '',
	filterType: null
};

// Create the vehicles store
function createVehicleStore() {
	const { subscribe, update, set } = writable<VehicleState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		// Vehicle data management
		setVehicles: (vehicles: Vehicle[]) => {
			update(state => ({ 
				...state, 
				vehicles, 
				loading: 'success', 
				error: null,
				lastFetch: new Date().toISOString()
			}));
		},
		
		addVehicle: (vehicle: Vehicle) => {
			update(state => ({
				...state,
				vehicles: [vehicle, ...state.vehicles] // Add to beginning
			}));
		},
		
		updateVehicleLocal: (updatedVehicle: Vehicle) => {
			update(state => ({
				...state,
				vehicles: state.vehicles.map(vehicle =>
					vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
				),
				selectedVehicle: state.selectedVehicle?.id === updatedVehicle.id 
					? updatedVehicle 
					: state.selectedVehicle
			}));
		},
		
		removeVehicle: (vehicleId: string) => {
			update(state => ({
				...state,
				vehicles: state.vehicles.filter(vehicle => vehicle.id !== vehicleId),
				selectedVehicle: state.selectedVehicle?.id === vehicleId 
					? null 
					: state.selectedVehicle
			}));
		},
		
		selectVehicle: (vehicle: Vehicle | null) => {
			update(state => ({ ...state, selectedVehicle: vehicle }));
		},
		
		// Search and filtering
		setSearchTerm: (searchTerm: string) => {
			update(state => ({ ...state, searchTerm }));
		},
		
		setFilterType: (filterType: string | null) => {
			update(state => ({ ...state, filterType }));
		},
		
		setSorting: (sortBy: keyof Vehicle, sortDirection: SortDirection) => {
			update(state => ({ ...state, sortBy, sortDirection }));
		},
		
		// API operations
		loadVehicles: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getVehicles();
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						vehicles: result.data || [], 
						loading: 'success',
						error: null,
						lastFetch: new Date().toISOString()
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load vehicles';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		createVehicle: async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.createVehicle(vehicleData);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						const tempId = `temp_${Date.now()}`;
						await offlineService.queueForSync('vehicle', { ...vehicleData, id: tempId });
						
						const tempVehicle = {
							...vehicleData,
							id: tempId,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						} as Vehicle;
						
						update(state => ({ 
							...state, 
							vehicles: [tempVehicle, ...state.vehicles],
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
						
						return { success: true, data: tempVehicle, error: null };
					} else {
						update(state => ({ 
							...state, 
							vehicles: [result.data!, ...state.vehicles],
							loading: 'success',
							error: null
						}));
						
						return { success: true, data: result.data!, error: null };
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('vehicle', { ...vehicleData, id: tempId });
					
					const tempVehicle = {
						...vehicleData,
						id: tempId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					} as Vehicle;
					
					update(state => ({ 
						...state, 
						vehicles: [tempVehicle, ...state.vehicles],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
					
					return { success: true, data: tempVehicle, error: null };
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create vehicle';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		updateVehicle: async (vehicle: Vehicle) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !vehicle.id.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.updateVehicle(vehicle.id, vehicle);
					
					if (result.error) {
						// Queue for offline sync
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('vehicle', vehicle);
						
						update(state => ({ 
							...state, 
							vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v),
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
					} else {
						update(state => ({ 
							...state, 
							vehicles: state.vehicles.map(v => v.id === vehicle.id ? result.data! : v),
							selectedVehicle: state.selectedVehicle?.id === vehicle.id ? result.data! : state.selectedVehicle,
							loading: 'success',
							error: null
						}));
					}
				} else {
					// Save offline or update temp vehicle
					const { default: offlineService } = await import('$lib/services/offline');
					await offlineService.queueForSync('vehicle', vehicle);
					
					update(state => ({ 
						...state, 
						vehicles: state.vehicles.map(v => v.id === vehicle.id ? vehicle : v),
						selectedVehicle: state.selectedVehicle?.id === vehicle.id ? vehicle : state.selectedVehicle,
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
				}
				
				return { success: true, data: vehicle, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update vehicle';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		deleteVehicle: async (vehicleId: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !vehicleId.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.deleteVehicle(vehicleId);
					
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
					vehicles: state.vehicles.filter(vehicle => vehicle.id !== vehicleId),
					selectedVehicle: state.selectedVehicle?.id === vehicleId ? null : state.selectedVehicle,
					loading: 'success',
					error: null
				}));
				
				return { success: true, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete vehicle';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Utility methods
		getVehicleById: (id: string): Vehicle | null => {
			let result: Vehicle | null = null;
			update(state => {
				result = state.vehicles.find(vehicle => vehicle.id === id) || null;
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

const vehicleStore = createVehicleStore();

export default vehicleStore;

// Derived stores for computed values
export const vehicles = derived(vehicleStore, $store => $store.vehicles);
export const selectedVehicle = derived(vehicleStore, $store => $store.selectedVehicle);
export const vehicleLoading = derived(vehicleStore, $store => $store.loading);
export const vehicleError = derived(vehicleStore, $store => $store.error);

// Filtered and sorted vehicles
export const filteredVehicles = derived(vehicleStore, $store => {
	let filtered = $store.vehicles;

	// Apply search filter
	if ($store.searchTerm) {
		const term = $store.searchTerm.toLowerCase();
		filtered = filtered.filter(vehicle =>
			vehicle.code.toLowerCase().includes(term) ||
			vehicle.name.toLowerCase().includes(term) ||
			vehicle.registration.toLowerCase().includes(term)
		);
	}

	// Apply type filter
	if ($store.filterType) {
		filtered = filtered.filter(vehicle => vehicle.type === $store.filterType);
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
		
		return 0;
	});

	return filtered;
});

// Vehicle statistics
export const vehicleStats = derived(vehicles, $vehicles => ({
	total: $vehicles.length,
	active: $vehicles.filter((v: Vehicle) => v.active).length,
	byType: $vehicles.reduce((acc: Record<string, number>, vehicle: Vehicle) => {
		acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
		return acc;
	}, {} as Record<string, number>)
}));