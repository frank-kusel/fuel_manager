import { writable, derived } from 'svelte/store';
import type { FuelEntry, FuelEntryStep, LoadingState, ValidationError } from '$lib/types';

interface FuelState {
	entries: FuelEntry[];
	currentEntry: Partial<FuelEntry>;
	steps: FuelEntryStep[];
	currentStep: number;
	loading: LoadingState;
	error: string | null;
	validationErrors: ValidationError[];
	isOffline: boolean;
}

const initialSteps: FuelEntryStep[] = [
	{ id: 'vehicle', label: 'Vehicle', icon: '🚛', component: 'VehicleStep', completed: false },
	{ id: 'driver', label: 'Driver', icon: '👨‍💼', component: 'DriverStep', completed: false },
	{ id: 'activity', label: 'Activity', icon: '⚙️', component: 'ActivityStep', completed: false },
	{ id: 'field', label: 'Field', icon: '🌾', component: 'FieldStep', completed: false },
	{ id: 'odometer', label: 'Odometer', icon: '📏', component: 'OdometerStep', completed: false },
	{ id: 'fuel', label: 'Fuel Data', icon: '⛽', component: 'FuelStep', completed: false },
	{ id: 'review', label: 'Review', icon: '✅', component: 'ReviewStep', completed: false }
];

const initialState: FuelState = {
	entries: [],
	currentEntry: {},
	steps: initialSteps,
	currentStep: 0,
	loading: 'idle',
	error: null,
	validationErrors: [],
	isOffline: false
};

function createFuelStore() {
	const { subscribe, set, update } = writable<FuelState>(initialState);

	return {
		subscribe,
		
		// Loading and error management
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: error ? 'error' : state.loading }));
		},
		
		setValidationErrors: (errors: ValidationError[]) => {
			update(state => ({ ...state, validationErrors: errors }));
		},
		
		// Entry management
		setEntries: (entries: FuelEntry[]) => {
			update(state => ({ 
				...state, 
				entries, 
				loading: 'success', 
				error: null 
			}));
		},
		
		addEntry: (entry: FuelEntry) => {
			update(state => ({
				...state,
				entries: [entry, ...state.entries] // Add to beginning
			}));
		},
		
		updateEntry: (updatedEntry: FuelEntry) => {
			update(state => ({
				...state,
				entries: state.entries.map(entry =>
					entry.id === updatedEntry.id ? updatedEntry : entry
				)
			}));
		},
		
		// Current entry (fuel entry form) management
		setCurrentEntryData: (field: keyof FuelEntry, value: any) => {
			update(state => ({
				...state,
				currentEntry: { ...state.currentEntry, [field]: value }
			}));
		},
		
		updateCurrentEntry: (data: Partial<FuelEntry>) => {
			update(state => ({
				...state,
				currentEntry: { ...state.currentEntry, ...data }
			}));
		},
		
		clearCurrentEntry: () => {
			update(state => ({ 
				...state, 
				currentEntry: {}, 
				currentStep: 0,
				steps: initialSteps.map(step => ({ ...step, completed: false })),
				validationErrors: []
			}));
		},
		
		// Step management
		setCurrentStep: (stepIndex: number) => {
			update(state => ({ ...state, currentStep: stepIndex }));
		},
		
		nextStep: () => {
			update(state => {
				const newStep = Math.min(state.currentStep + 1, state.steps.length - 1);
				return { ...state, currentStep: newStep };
			});
		},
		
		prevStep: () => {
			update(state => {
				const newStep = Math.max(state.currentStep - 1, 0);
				return { ...state, currentStep: newStep };
			});
		},
		
		markStepCompleted: (stepId: string, completed = true) => {
			update(state => ({
				...state,
				steps: state.steps.map(step =>
					step.id === stepId ? { ...step, completed } : step
				)
			}));
		},
		
		// Data loading
		loadEntries: async (startDate?: string, endDate?: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				const result = await supabaseService.getFuelEntries(startDate, endDate);
				
				if (result.error) {
					update(state => ({ 
						...state, 
						error: result.error, 
						loading: 'error' 
					}));
				} else {
					update(state => ({ 
						...state, 
						entries: result.data || [], 
						loading: 'success',
						error: null
					}));
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to load fuel entries';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
			}
		},
		
		// Submit current entry
		submitEntry: async () => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const state = derived({ subscribe }, $store => $store.currentEntry);
				const currentEntry = await new Promise(resolve => {
					const unsubscribe = state.subscribe(resolve);
					unsubscribe();
				}) as Partial<FuelEntry>;
				
				// Validate entry
				const validationErrors = validateFuelEntry(currentEntry);
				if (validationErrors.length > 0) {
					update(state => ({ 
						...state, 
						validationErrors, 
						loading: 'error',
						error: 'Please fix validation errors'
					}));
					return { success: false, error: 'Validation failed' };
				}
				
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				
				// Check if online
				const isOnline = navigator?.onLine ?? true;
				
				if (isOnline) {
					const result = await supabaseService.createFuelEntry(currentEntry as Omit<FuelEntry, 'id' | 'created_at' | 'updated_at'>);
					
					if (result.error) {
						// Try offline queue
						const { default: offlineService } = await import('$lib/services/offline');
						await offlineService.queueForSync('fuel_entry', currentEntry);
						
						update(state => ({ 
							...state, 
							error: 'Saved offline - will sync when connection restored', 
							loading: 'success',
							isOffline: true
						}));
					} else {
						update(state => ({ 
							...state, 
							entries: [result.data!, ...state.entries],
							loading: 'success',
							error: null
						}));
						
						// Clear current entry
						update(state => ({ 
							...state, 
							currentEntry: {}, 
							currentStep: 0,
							steps: initialSteps.map(step => ({ ...step, completed: false }))
						}));
					}
				} else {
					// Save offline
					const { default: offlineService } = await import('$lib/services/offline');
					const tempId = `temp_${Date.now()}`;
					await offlineService.queueForSync('fuel_entry', { ...currentEntry, id: tempId });
					
					// Add to local state with temp ID
					update(state => ({ 
						...state, 
						entries: [{ ...currentEntry, id: tempId } as FuelEntry, ...state.entries],
						loading: 'success',
						error: 'Saved offline - will sync when connection restored',
						isOffline: true
					}));
					
					// Clear current entry
					update(state => ({ 
						...state, 
						currentEntry: {}, 
						currentStep: 0,
						steps: initialSteps.map(step => ({ ...step, completed: false }))
					}));
				}
				
				return { success: true };
				
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to save fuel entry';
				update(state => ({ 
					...state, 
					error: errorMessage, 
					loading: 'error' 
				}));
				return { success: false, error: errorMessage };
			}
		},
		
		// Offline status
		setOfflineStatus: (isOffline: boolean) => {
			update(state => ({ ...state, isOffline }));
		},
		
		reset: () => set(initialState)
	};
}

// Validation function
function validateFuelEntry(entry: Partial<FuelEntry>): ValidationError[] {
	const errors: ValidationError[] = [];
	
	if (!entry.vehicleId) {
		errors.push({ field: 'vehicleId', message: 'Vehicle is required', type: 'error' });
	}
	
	if (!entry.driverId) {
		errors.push({ field: 'driverId', message: 'Driver is required', type: 'error' });
	}
	
	if (!entry.activityId) {
		errors.push({ field: 'activityId', message: 'Activity is required', type: 'error' });
	}
	
	if (!entry.bowserId) {
		errors.push({ field: 'bowserId', message: 'Bowser is required', type: 'error' });
	}
	
	if (!entry.date) {
		errors.push({ field: 'date', message: 'Date is required', type: 'error' });
	}
	
	if (entry.odometerStart !== undefined && entry.odometerEnd !== undefined) {
		if (entry.odometerEnd < entry.odometerStart) {
			errors.push({ 
				field: 'odometerEnd', 
				message: 'End odometer must be greater than start odometer', 
				type: 'error' 
			});
		}
	}
	
	if (entry.bowserStart !== undefined && entry.bowserEnd !== undefined) {
		if (entry.bowserEnd > entry.bowserStart) {
			errors.push({ 
				field: 'bowserEnd', 
				message: 'End bowser reading should be less than start reading', 
				type: 'warning' 
			});
		}
	}
	
	return errors;
}

const fuelStore = createFuelStore();
export default fuelStore;

// Derived stores
export const fuelEntries = derived(fuelStore, $store => $store.entries);
export const currentFuelEntry = derived(fuelStore, $store => $store.currentEntry);
export const currentStep = derived(fuelStore, $store => $store.currentStep);
export const fuelSteps = derived(fuelStore, $store => $store.steps);
export const fuelLoading = derived(fuelStore, $store => $store.loading);
export const fuelError = derived(fuelStore, $store => $store.error);
export const fuelValidationErrors = derived(fuelStore, $store => $store.validationErrors);
export const isOfflineFuel = derived(fuelStore, $store => $store.isOffline);