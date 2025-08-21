// Activity management store
// Handles CRUD operations and state for farm activities with offline support

import { writable, derived } from 'svelte/store';
import type { Activity, LoadingState, SortDirection, ApiResponse } from '$lib/types';

interface ActivityState {
	activities: Activity[];
	selectedActivity: Activity | null;
	loading: LoadingState;
	error: string | null;
	lastFetch: string | null;
	sortBy: keyof Activity;
	sortDirection: SortDirection;
	searchTerm: string;
	filterCategory: string | null;
	filterActive: boolean | null;
}

// Initial state
const initialState: ActivityState = {
	activities: [],
	selectedActivity: null,
	loading: 'idle',
	error: null,
	lastFetch: null,
	sortBy: 'name',
	sortDirection: 'asc',
	searchTerm: '',
	filterCategory: null,
	filterActive: null
};

// Create the activities store
function createActivityStore() {
	const { subscribe, update, set } = writable<ActivityState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		// Activity data management
		setActivities: (activities: Activity[]) => {
			update(state => ({ 
				...state, 
				activities, 
				loading: 'success', 
				error: null,
				lastFetch: new Date().toISOString()
			}));
		},
		
		addActivity: (activity: Activity) => {
			update(state => ({
				...state,
				activities: [activity, ...state.activities] // Add to beginning
			}));
		},
		
		updateActivityLocal: (updatedActivity: Activity) => {
			update(state => ({
				...state,
				activities: state.activities.map(activity =>
					activity.id === updatedActivity.id ? updatedActivity : activity
				),
				selectedActivity: state.selectedActivity?.id === updatedActivity.id 
					? updatedActivity 
					: state.selectedActivity
			}));
		},
		
		removeActivity: (activityId: string) => {
			update(state => ({
				...state,
				activities: state.activities.filter(activity => activity.id !== activityId),
				selectedActivity: state.selectedActivity?.id === activityId 
					? null 
					: state.selectedActivity
			}));
		},
		
		selectActivity: (activity: Activity | null) => {
			update(state => ({ ...state, selectedActivity: activity }));
		},
		
		// Search and filtering
		setSearchTerm: (searchTerm: string) => {
			update(state => ({ ...state, searchTerm }));
		},
		
		setFilterCategory: (filterCategory: string | null) => {
			update(state => ({ ...state, filterCategory }));
		},
		
		setFilterActive: (filterActive: boolean | null) => {
			update(state => ({ ...state, filterActive }));
		},
		
		setSorting: (sortBy: keyof Activity, sortDirection: SortDirection) => {
			update(state => ({ ...state, sortBy, sortDirection }));
		},
		
		// API operations
		loadActivities: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getActivities();
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						activities: result.data || [], 
						loading: 'success',
						error: null,
						lastFetch: new Date().toISOString()
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load activities';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		createActivity: async (activityData: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.createActivity(activityData);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						const tempId = `temp_${Date.now()}`;
						await offlineService.queueForSync('activity', { ...activityData, id: tempId });
						
						const tempActivity = {
							...activityData,
							id: tempId,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						} as Activity;
						
						update(state => ({ 
							...state, 
							activities: [tempActivity, ...state.activities],
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
						
						return { success: true, data: tempActivity, error: null };
					} else {
						update(state => ({ 
							...state, 
							activities: [result.data!, ...state.activities],
							loading: 'success',
							error: null
						}));
						
						return { success: true, data: result.data!, error: null };
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('activity', { ...activityData, id: tempId });
					
					const tempActivity = {
						...activityData,
						id: tempId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					} as Activity;
					
					update(state => ({ 
						...state, 
						activities: [tempActivity, ...state.activities],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
					
					return { success: true, data: tempActivity, error: null };
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create activity';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		updateActivity: async (activity: Activity) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !activity.id.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.updateActivity(activity.id, activity);
					
					if (result.error) {
						// Queue for offline sync
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('activity', activity);
						
						update(state => ({ 
							...state, 
							activities: state.activities.map(a => a.id === activity.id ? activity : a),
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
					} else {
						update(state => ({ 
							...state, 
							activities: state.activities.map(a => a.id === activity.id ? result.data! : a),
							selectedActivity: state.selectedActivity?.id === activity.id ? result.data! : state.selectedActivity,
							loading: 'success',
							error: null
						}));
					}
				} else {
					// Save offline or update temp activity
					const { default: offlineService } = await import('$lib/services/offline');
					await offlineService.queueForSync('activity', activity);
					
					update(state => ({ 
						...state, 
						activities: state.activities.map(a => a.id === activity.id ? activity : a),
						selectedActivity: state.selectedActivity?.id === activity.id ? activity : state.selectedActivity,
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
				}
				
				return { success: true, data: activity, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update activity';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		deleteActivity: async (activityId: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !activityId.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.deleteActivity(activityId);
					
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
					activities: state.activities.filter(activity => activity.id !== activityId),
					selectedActivity: state.selectedActivity?.id === activityId ? null : state.selectedActivity,
					loading: 'success',
					error: null
				}));
				
				return { success: true, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete activity';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Utility methods
		getActivityById: (id: string): Activity | null => {
			let result: Activity | null = null;
			update(state => {
				result = state.activities.find(activity => activity.id === id) || null;
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

const activityStore = createActivityStore();

export default activityStore;

// Derived stores for computed values
export const activities = derived(activityStore, $store => $store.activities);
export const selectedActivity = derived(activityStore, $store => $store.selectedActivity);
export const activityLoading = derived(activityStore, $store => $store.loading);
export const activityError = derived(activityStore, $store => $store.error);

// Filtered and sorted activities
export const filteredActivities = derived(activityStore, $store => {
	let filtered = $store.activities;

	// Apply search filter
	if ($store.searchTerm) {
		const term = $store.searchTerm.toLowerCase();
		filtered = filtered.filter(activity =>
			activity.name.toLowerCase().includes(term) ||
			activity.code.toLowerCase().includes(term) ||
			(activity.description?.toLowerCase().includes(term) || false)
		);
	}

	// Apply category filter
	if ($store.filterCategory) {
		filtered = filtered.filter(activity => activity.category === $store.filterCategory);
	}

	// Apply active filter
	if ($store.filterActive !== null) {
		filtered = filtered.filter(activity => activity.active === $store.filterActive);
	}

	// Apply sorting
	filtered.sort((a, b) => {
		const aVal = a[$store.sortBy];
		const bVal = b[$store.sortBy];
		
		if (aVal === null || aVal === undefined) return 1;
		if (bVal === null || bVal === undefined) return -1;
		
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

// Active activities only
export const activeActivities = derived(activities, $activities => 
	$activities.filter(activity => activity.active)
);

// Activities grouped by category
export const activitiesByCategory = derived(activities, $activities => {
	const grouped = new Map<string, Activity[]>();
	
	$activities.forEach(activity => {
		const category = activity.category;
		if (!grouped.has(category)) {
			grouped.set(category, []);
		}
		grouped.get(category)!.push(activity);
	});
	
	return grouped;
});

// Activity statistics
export const activityStats = derived(activities, $activities => ({
	total: $activities.length,
	active: $activities.filter((a: Activity) => a.active).length,
	inactive: $activities.filter((a: Activity) => !a.active).length,
	byCategory: {
		planting: $activities.filter((a: Activity) => a.category === 'planting').length,
		harvesting: $activities.filter((a: Activity) => a.category === 'harvesting').length,
		spraying: $activities.filter((a: Activity) => a.category === 'spraying').length,
		fertilizing: $activities.filter((a: Activity) => a.category === 'fertilizing').length,
		maintenance: $activities.filter((a: Activity) => a.category === 'maintenance').length,
		other: $activities.filter((a: Activity) => a.category === 'other').length
	}
}));