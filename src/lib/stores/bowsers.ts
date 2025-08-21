// Bowser management store
// Handles CRUD operations and state for fuel bowsers with offline support

import { writable, derived } from 'svelte/store';
import type { Bowser, LoadingState, SortDirection, ApiResponse } from '$lib/types';

interface BowserState {
	bowsers: Bowser[];
	selectedBowser: Bowser | null;
	loading: LoadingState;
	error: string | null;
	lastFetch: string | null;
	sortBy: keyof Bowser;
	sortDirection: SortDirection;
	searchTerm: string;
	filterActive: boolean | null;
}

// Initial state
const initialState: BowserState = {
	bowsers: [],
	selectedBowser: null,
	loading: 'idle',
	error: null,
	lastFetch: null,
	sortBy: 'code',
	sortDirection: 'asc',
	searchTerm: '',
	filterActive: null
};

// Create the bowsers store
function createBowserStore() {
	const { subscribe, update, set } = writable<BowserState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		// Bowser data management
		setBowsers: (bowsers: Bowser[]) => {
			update(state => ({ 
				...state, 
				bowsers, 
				loading: 'success', 
				error: null,
				lastFetch: new Date().toISOString()
			}));
		},
		
		addBowser: (bowser: Bowser) => {
			update(state => ({
				...state,
				bowsers: [bowser, ...state.bowsers] // Add to beginning
			}));
		},
		
		updateBowserLocal: (updatedBowser: Bowser) => {
			update(state => ({
				...state,
				bowsers: state.bowsers.map(bowser =>
					bowser.id === updatedBowser.id ? updatedBowser : bowser
				),
				selectedBowser: state.selectedBowser?.id === updatedBowser.id 
					? updatedBowser 
					: state.selectedBowser
			}));
		},
		
		removeBowser: (bowserId: string) => {
			update(state => ({
				...state,
				bowsers: state.bowsers.filter(bowser => bowser.id !== bowserId),
				selectedBowser: state.selectedBowser?.id === bowserId 
					? null 
					: state.selectedBowser
			}));
		},
		
		selectBowser: (bowser: Bowser | null) => {
			update(state => ({ ...state, selectedBowser: bowser }));
		},
		
		// Search and filtering
		setSearchTerm: (searchTerm: string) => {
			update(state => ({ ...state, searchTerm }));
		},
		
		setFilterActive: (filterActive: boolean | null) => {
			update(state => ({ ...state, filterActive }));
		},
		
		setSorting: (sortBy: keyof Bowser, sortDirection: SortDirection) => {
			update(state => ({ ...state, sortBy, sortDirection }));
		},
		
		// API operations
		loadBowsers: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getBowsers();
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						bowsers: result.data || [], 
						loading: 'success',
						error: null,
						lastFetch: new Date().toISOString()
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load bowsers';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		createBowser: async (bowserData: Omit<Bowser, 'id' | 'created_at' | 'updated_at'>) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.createBowser(bowserData);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						const tempId = `temp_${Date.now()}`;
						await offlineService.queueForSync('bowser', { ...bowserData, id: tempId });
						
						const tempBowser = {
							...bowserData,
							id: tempId,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						} as Bowser;
						
						update(state => ({ 
							...state, 
							bowsers: [tempBowser, ...state.bowsers],
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
						
						return { success: true, data: tempBowser, error: null };
					} else {
						update(state => ({ 
							...state, 
							bowsers: [result.data!, ...state.bowsers],
							loading: 'success',
							error: null
						}));
						
						return { success: true, data: result.data!, error: null };
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('bowser', { ...bowserData, id: tempId });
					
					const tempBowser = {
						...bowserData,
						id: tempId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					} as Bowser;
					
					update(state => ({ 
						...state, 
						bowsers: [tempBowser, ...state.bowsers],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
					
					return { success: true, data: tempBowser, error: null };
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create bowser';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		updateBowser: async (bowser: Bowser) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !bowser.id.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.updateBowser(bowser.id, bowser);
					
					if (result.error) {
						// Queue for offline sync
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('bowser', bowser);
						
						update(state => ({ 
							...state, 
							bowsers: state.bowsers.map(b => b.id === bowser.id ? bowser : b),
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
					} else {
						update(state => ({ 
							...state, 
							bowsers: state.bowsers.map(b => b.id === bowser.id ? result.data! : b),
							selectedBowser: state.selectedBowser?.id === bowser.id ? result.data! : state.selectedBowser,
							loading: 'success',
							error: null
						}));
					}
				} else {
					// Save offline or update temp bowser
					const { default: offlineService } = await import('$lib/services/offline');
					await offlineService.queueForSync('bowser', bowser);
					
					update(state => ({ 
						...state, 
						bowsers: state.bowsers.map(b => b.id === bowser.id ? bowser : b),
						selectedBowser: state.selectedBowser?.id === bowser.id ? bowser : state.selectedBowser,
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
				}
				
				return { success: true, data: bowser, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update bowser';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		deleteBowser: async (bowserId: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !bowserId.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.deleteBowser(bowserId);
					
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
					bowsers: state.bowsers.filter(bowser => bowser.id !== bowserId),
					selectedBowser: state.selectedBowser?.id === bowserId ? null : state.selectedBowser,
					loading: 'success',
					error: null
				}));
				
				return { success: true, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete bowser';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Utility methods
		getBowserById: (id: string): Bowser | null => {
			let result: Bowser | null = null;
			update(state => {
				result = state.bowsers.find(bowser => bowser.id === id) || null;
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

const bowserStore = createBowserStore();

export default bowserStore;

// Derived stores for computed values
export const bowsers = derived(bowserStore, $store => $store.bowsers);
export const selectedBowser = derived(bowserStore, $store => $store.selectedBowser);
export const bowserLoading = derived(bowserStore, $store => $store.loading);
export const bowserError = derived(bowserStore, $store => $store.error);

// Filtered and sorted bowsers
export const filteredBowsers = derived(bowserStore, $store => {
	let filtered = $store.bowsers;

	// Apply search filter
	if ($store.searchTerm) {
		const term = $store.searchTerm.toLowerCase();
		filtered = filtered.filter(bowser =>
			bowser.code.toLowerCase().includes(term) ||
			bowser.name.toLowerCase().includes(term) ||
			bowser.registration.toLowerCase().includes(term)
		);
	}

	// Apply active filter
	if ($store.filterActive !== null) {
		filtered = filtered.filter(bowser => bowser.active === $store.filterActive);
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

// Active bowsers only
export const activeBowsers = derived(bowsers, $bowsers => 
	$bowsers.filter(bowser => bowser.active)
);

// Bowser statistics
export const bowserStats = derived(bowsers, $bowsers => ({
	total: $bowsers.length,
	active: $bowsers.filter((b: Bowser) => b.active).length,
	inactive: $bowsers.filter((b: Bowser) => !b.active).length,
	totalCapacity: $bowsers.reduce((sum: number, b: Bowser) => sum + b.capacity, 0),
	averageCapacity: $bowsers.length > 0 
		? Math.round($bowsers.reduce((sum: number, b: Bowser) => sum + b.capacity, 0) / $bowsers.length)
		: 0
}));