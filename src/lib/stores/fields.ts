// Field management store
// Handles CRUD operations and state for farm fields with offline support

import { writable, derived } from 'svelte/store';
import type { Field, LoadingState, SortDirection, ApiResponse } from '$lib/types';

interface FieldState {
	fields: Field[];
	selectedField: Field | null;
	loading: LoadingState;
	error: string | null;
	lastFetch: string | null;
	sortBy: keyof Field;
	sortDirection: SortDirection;
	searchTerm: string;
	filterType: string | null;
	filterActive: boolean | null;
}

// Initial state
const initialState: FieldState = {
	fields: [],
	selectedField: null,
	loading: 'idle',
	error: null,
	lastFetch: null,
	sortBy: 'name',
	sortDirection: 'asc',
	searchTerm: '',
	filterType: null,
	filterActive: null
};

// Create the fields store
function createFieldStore() {
	const { subscribe, update, set } = writable<FieldState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		// Field data management
		setFields: (fields: Field[]) => {
			update(state => ({ 
				...state, 
				fields, 
				loading: 'success', 
				error: null,
				lastFetch: new Date().toISOString()
			}));
		},
		
		addField: (field: Field) => {
			update(state => ({
				...state,
				fields: [field, ...state.fields] // Add to beginning
			}));
		},
		
		updateFieldLocal: (updatedField: Field) => {
			update(state => ({
				...state,
				fields: state.fields.map(field =>
					field.id === updatedField.id ? updatedField : field
				),
				selectedField: state.selectedField?.id === updatedField.id 
					? updatedField 
					: state.selectedField
			}));
		},
		
		removeField: (fieldId: string) => {
			update(state => ({
				...state,
				fields: state.fields.filter(field => field.id !== fieldId),
				selectedField: state.selectedField?.id === fieldId 
					? null 
					: state.selectedField
			}));
		},
		
		selectField: (field: Field | null) => {
			update(state => ({ ...state, selectedField: field }));
		},
		
		// Search and filtering
		setSearchTerm: (searchTerm: string) => {
			update(state => ({ ...state, searchTerm }));
		},
		
		setFilterType: (filterType: string | null) => {
			update(state => ({ ...state, filterType }));
		},
		
		setFilterActive: (filterActive: boolean | null) => {
			update(state => ({ ...state, filterActive }));
		},
		
		setSorting: (sortBy: keyof Field, sortDirection: SortDirection) => {
			update(state => ({ ...state, sortBy, sortDirection }));
		},
		
		// API operations
		loadFields: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getFields();
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						fields: result.data || [], 
						loading: 'success',
						error: null,
						lastFetch: new Date().toISOString()
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load fields';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		createField: async (fieldData: Omit<Field, 'id' | 'created_at' | 'updated_at'>) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.createField(fieldData);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						const tempId = `temp_${Date.now()}`;
						await offlineService.queueForSync('field', { ...fieldData, id: tempId });
						
						const tempField = {
							...fieldData,
							id: tempId,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						} as Field;
						
						update(state => ({ 
							...state, 
							fields: [tempField, ...state.fields],
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
						
						return { success: true, data: tempField, error: null };
					} else {
						update(state => ({ 
							...state, 
							fields: [result.data!, ...state.fields],
							loading: 'success',
							error: null
						}));
						
						return { success: true, data: result.data!, error: null };
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('field', { ...fieldData, id: tempId });
					
					const tempField = {
						...fieldData,
						id: tempId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					} as Field;
					
					update(state => ({ 
						...state, 
						fields: [tempField, ...state.fields],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
					
					return { success: true, data: tempField, error: null };
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to create field';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		updateField: async (field: Field) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !field.id.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.updateField(field.id, field);
					
					if (result.error) {
						// Queue for offline sync
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('field', field);
						
						update(state => ({ 
							...state, 
							fields: state.fields.map(f => f.id === field.id ? field : f),
							loading: 'success',
							error: 'Saved offline - will sync when connection restored'
						}));
					} else {
						update(state => ({ 
							...state, 
							fields: state.fields.map(f => f.id === field.id ? result.data! : f),
							selectedField: state.selectedField?.id === field.id ? result.data! : state.selectedField,
							loading: 'success',
							error: null
						}));
					}
				} else {
					// Save offline or update temp field
					const { default: offlineService } = await import('$lib/services/offline');
					await offlineService.queueForSync('field', field);
					
					update(state => ({ 
						...state, 
						fields: state.fields.map(f => f.id === field.id ? field : f),
						selectedField: state.selectedField?.id === field.id ? field : state.selectedField,
						loading: 'success',
						error: 'Saved offline - will sync when connection restored'
					}));
				}
				
				return { success: true, data: field, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to update field';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, data: null, error: errorMessage };
			}
		},
		
		deleteField: async (fieldId: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline && !fieldId.startsWith('temp_')) {
					const { default: supabaseService } = await import('$lib/services/supabase');
					await supabaseService.init();
					
					const result = await supabaseService.deleteField(fieldId);
					
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
					fields: state.fields.filter(field => field.id !== fieldId),
					selectedField: state.selectedField?.id === fieldId ? null : state.selectedField,
					loading: 'success',
					error: null
				}));
				
				return { success: true, error: null };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to delete field';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Utility methods
		getFieldById: (id: string): Field | null => {
			let result: Field | null = null;
			update(state => {
				result = state.fields.find(field => field.id === id) || null;
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

const fieldStore = createFieldStore();

export default fieldStore;

// Derived stores for computed values
export const fields = derived(fieldStore, $store => $store.fields);
export const selectedField = derived(fieldStore, $store => $store.selectedField);
export const fieldLoading = derived(fieldStore, $store => $store.loading);
export const fieldError = derived(fieldStore, $store => $store.error);

// Filtered and sorted fields
export const filteredFields = derived(fieldStore, $store => {
	let filtered = $store.fields;

	// Apply search filter
	if ($store.searchTerm) {
		const term = $store.searchTerm.toLowerCase();
		filtered = filtered.filter(field =>
			field.name.toLowerCase().includes(term) ||
			field.code.toLowerCase().includes(term) ||
			(field.location?.toLowerCase().includes(term) || false) ||
			(field.crop_type?.toLowerCase().includes(term) || false)
		);
	}

	// Apply type filter
	if ($store.filterType) {
		filtered = filtered.filter(field => field.type === $store.filterType);
	}

	// Apply active filter
	if ($store.filterActive !== null) {
		filtered = filtered.filter(field => field.active === $store.filterActive);
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

// Active fields only
export const activeFields = derived(fields, $fields => 
	$fields.filter(field => field.active)
);

// Fields grouped by type
export const fieldsByType = derived(fields, $fields => {
	const grouped = new Map<string, Field[]>();
	
	$fields.forEach(field => {
		const type = field.type;
		if (!grouped.has(type)) {
			grouped.set(type, []);
		}
		grouped.get(type)!.push(field);
	});
	
	return grouped;
});

// Field statistics
export const fieldStats = derived(fields, $fields => ({
	total: $fields.length,
	active: $fields.filter((f: Field) => f.active).length,
	inactive: $fields.filter((f: Field) => !f.active).length,
	totalArea: $fields.reduce((sum: number, f: Field) => sum + f.area, 0),
	averageArea: $fields.length > 0 
		? Math.round($fields.reduce((sum: number, f: Field) => sum + f.area, 0) / $fields.length * 10) / 10
		: 0,
	byType: {
		arable: $fields.filter((f: Field) => f.type === 'arable').length,
		pasture: $fields.filter((f: Field) => f.type === 'pasture').length,
		orchard: $fields.filter((f: Field) => f.type === 'orchard').length,
		greenhouse: $fields.filter((f: Field) => f.type === 'greenhouse').length,
		other: $fields.filter((f: Field) => f.type === 'other').length
	}
}));