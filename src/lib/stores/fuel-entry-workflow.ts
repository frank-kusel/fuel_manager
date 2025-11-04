// Complex 7-step fuel entry workflow store
// Manages the complete fuel entry process with validation and state persistence

import { writable, derived } from 'svelte/store';
import type { FuelEntry, Vehicle, Driver, Activity, Field, Zone, Bowser, LoadingState, FieldSelectionState } from '$lib/types';

export interface FuelEntryWorkflowStep {
	id: string;
	title: string;
	icon: string;
	completed: boolean;
	valid: boolean;
	required: boolean;
}

export interface FuelEntryData {
	// Step 1: Vehicle Selection
	vehicle: Vehicle | null;
	
	// Step 2: Driver Selection  
	driver: Driver | null;
	
	// Step 3: Activity Selection
	activity: Activity | null;
	
	// Step 4: Location Selection (optional) - field, zone, or multiple fields
	field: Field | null; // Single field (backward compatibility)
	zone: Zone | null;
	selectedFields: Field[]; // Multiple fields
	fieldSelectionMode: 'single' | 'multiple';
	
	// Step 5: Odometer Reading
	odometerStart: number | null;
	odometerEnd: number | null;
	gaugeWorking: boolean;
	
	// Step 6: Fuel Data
	bowser: Bowser | null;
	bowserReadingStart: number | null;
	bowserReadingEnd: number | null;
	litresDispensed: number | null;
	
	// Step 7: Review & Notes
	notes: string;
	timestamp: Date;
	entryDate: string; // YYYY-MM-DD format
	entryTime: string; // HH:mm:ss format (includes seconds)
}

interface WorkflowState {
	currentStep: number;
	steps: FuelEntryWorkflowStep[];
	data: FuelEntryData;
	validationErrors: Record<string, string[]>;
	loading: LoadingState;
	error: string | null;
	isSubmitting: boolean;
	canProceed: boolean;
	canGoBack: boolean;
	progress: number; // 0-100%
}

const defaultSteps: FuelEntryWorkflowStep[] = [
	{
		id: 'vehicle',
		title: 'Select Vehicle',
		icon: '🚜',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'driver', 
		title: 'Select Driver',
		icon: '👤',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'activity',
		title: 'Select Activity',
		icon: '⚙️',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'location',
		title: 'Select Location',
		icon: '📍',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'odometer',
		title: 'Odometer Reading',
		icon: '📏',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'fuel',
		title: 'Fuel Data',
		icon: '⛽',
		completed: false,
		valid: false,
		required: true
	},
	{
		id: 'review',
		title: 'Review & Submit',
		icon: '✅',
		completed: false,
		valid: false,
		required: true
	}
];

const initialData: FuelEntryData = {
	vehicle: null,
	driver: null,
	activity: null,
	field: null,
	zone: null,
	selectedFields: [],
	fieldSelectionMode: 'single',
	odometerStart: null,
	odometerEnd: null,
	gaugeWorking: true,
	bowser: null,
	bowserReadingStart: null,
	bowserReadingEnd: null,
	litresDispensed: null,
	notes: '',
	timestamp: new Date(),
	entryDate: new Date().toISOString().split('T')[0], // Default to today
	entryTime: new Date().toTimeString().substring(0, 8) // Default to current time with seconds (HH:mm:ss)
};

const initialState: WorkflowState = {
	currentStep: 0,
	steps: [...defaultSteps],
	data: { ...initialData },
	validationErrors: {},
	loading: 'idle',
	error: null,
	isSubmitting: false,
	canProceed: false,
	canGoBack: false,
	progress: 0
};

function createFuelEntryWorkflowStore() {
	const { subscribe, set, update } = writable<WorkflowState>(initialState);

	// Validation functions
	const validateStep = (stepId: string, data: FuelEntryData): { valid: boolean; errors: string[] } => {
		const errors: string[] = [];
		
		switch (stepId) {
			case 'vehicle':
				if (!data.vehicle) errors.push('Please select a vehicle');
				break;
				
			case 'driver':
				if (!data.driver) errors.push('Please select a driver');
				break;
				
			case 'activity':
				if (!data.activity) errors.push('Please select an activity');
				break;
				
			case 'location':
				// Require at least one field or zone to be selected
				if (!data.zone && data.selectedFields.length === 0) {
					errors.push('Please select at least one field or zone');
				}
				break;
				
			case 'odometer':
				// Odometer validation: either broken gauge or valid reading increase
				if (!data.gaugeWorking) {
					// Broken gauge is always valid
					break;
				}
				// For working gauge, require new reading higher than current
				if (data.odometerStart === null || data.odometerEnd === null) {
					errors.push('Please enter odometer reading');
				} else if (data.odometerEnd <= data.odometerStart) {
					errors.push('New odometer reading must be higher than current reading');
				}
				break;
				
			case 'fuel':
				// Validate that fuel amount is entered and bowser is selected
				if (!data.bowser) {
					errors.push('Please select a bowser');
				}
				if (data.litresDispensed === null || data.litresDispensed <= 0) {
					errors.push('Litres dispensed must be greater than zero');
				}
				break;
				
			case 'review':
				// Validate all previous steps
				const allStepErrors: string[] = [];
				['vehicle', 'driver', 'activity', 'odometer', 'fuel'].forEach(step => {
					const stepValidation = validateStep(step, data);
					allStepErrors.push(...stepValidation.errors);
				});
				errors.push(...allStepErrors);
				break;
		}
		
		return { valid: errors.length === 0, errors };
	};

	const updateStepValidation = () => {
		update(state => {
			const newSteps = state.steps.map(step => {
				const validation = validateStep(step.id, state.data);
				return {
					...step,
					valid: validation.valid,
					completed: validation.valid
				};
			});
			
			const newValidationErrors: Record<string, string[]> = {};
			newSteps.forEach(step => {
				const validation = validateStep(step.id, state.data);
				if (validation.errors.length > 0) {
					newValidationErrors[step.id] = validation.errors;
				}
			});
			
			const currentStepValid = newSteps[state.currentStep]?.valid || false;
			const isLastStep = state.currentStep === newSteps.length - 1;
			const canProceed = currentStepValid && (isLastStep || state.currentStep < newSteps.length - 1);
			const canGoBack = state.currentStep > 0;
			
			
			const progress = Math.round((state.currentStep + (currentStepValid ? 1 : 0)) / newSteps.length * 100);
			
			return {
				...state,
				steps: newSteps,
				validationErrors: newValidationErrors,
				canProceed,
				canGoBack,
				progress
			};
		});
	};

	return {
		subscribe,
		
		// Navigation
		nextStep: () => {
			update(state => {
				if (state.canProceed) {
					const newStep = Math.min(state.currentStep + 1, state.steps.length - 1);
					return { ...state, currentStep: newStep };
				}
				return state;
			});
			updateStepValidation();
		},
		
		forceNextStep: () => {
			update(state => {
				const newStep = Math.min(state.currentStep + 1, state.steps.length - 1);
				return { ...state, currentStep: newStep };
			});
			updateStepValidation();
		},
		
		previousStep: () => {
			update(state => {
				if (state.canGoBack) {
					const newStep = Math.max(state.currentStep - 1, 0);
					return { ...state, currentStep: newStep };
				}
				return state;
			});
			updateStepValidation();
		},
		
		goToStep: (stepIndex: number) => {
			update(state => {
				if (stepIndex >= 0 && stepIndex < state.steps.length) {
					return { ...state, currentStep: stepIndex };
				}
				return state;
			});
			updateStepValidation();
		},
		
		// Data updates
		setVehicle: (vehicle: Vehicle | null) => {
			update(state => ({
				...state,
				data: { ...state.data, vehicle, odometerStart: vehicle?.current_odometer || null }
			}));
			updateStepValidation();
		},
		
		setDriver: (driver: Driver | null) => {
			update(state => ({
				...state,
				data: { ...state.data, driver }
			}));
			updateStepValidation();
		},
		
		setActivity: (activity: Activity | null) => {
			update(state => ({
				...state,
				data: { ...state.data, activity }
			}));
			updateStepValidation();
		},
		
		setField: (field: Field | null) => {
			update(state => ({
				...state,
				data: { 
					...state.data, 
					field, 
					zone: null,
					selectedFields: [],
					fieldSelectionMode: 'single'
				}
			}));
			updateStepValidation();
		},
		
		setLocation: (field: Field | null, zone: Zone | null, selectedFields: Field[] = []) => {
			const mode = selectedFields.length > 0 ? 'multiple' : 'single';
			update(state => ({
				...state,
				data: { 
					...state.data, 
					field: mode === 'single' ? field : null,
					zone, 
					selectedFields,
					fieldSelectionMode: mode
				}
			}));
			updateStepValidation();
		},

		setFieldSelectionMode: (mode: 'single' | 'multiple') => {
			update(state => ({
				...state,
				data: {
					...state.data,
					fieldSelectionMode: mode,
					field: mode === 'multiple' ? null : state.data.field,
					selectedFields: mode === 'single' ? [] : state.data.selectedFields
				}
			}));
			updateStepValidation();
		},

		setMultipleFields: (fields: Field[]) => {
			update(state => ({
				...state,
				data: {
					...state.data,
					selectedFields: fields,
					field: null,
					zone: null,
					fieldSelectionMode: 'multiple'
				}
			}));
			updateStepValidation();
		},
		
		setOdometerData: (start: number | null, end: number | null, gaugeWorking: boolean) => {
			update(state => ({
				...state,
				data: { 
					...state.data, 
					odometerStart: start,
					odometerEnd: end,
					gaugeWorking
				}
			}));
			updateStepValidation();
		},
		
		setBowser: (bowser: Bowser | null) => {
			update(state => ({
				...state,
				data: {
					...state.data,
					bowser,
					// Pre-populate start reading with bowser's current reading
					bowserReadingStart: bowser?.current_reading || state.data.bowserReadingStart
				}
			}));
			updateStepValidation();
		},
		
		setFuelData: (bowser: Bowser | null, startReading: number | null, endReading: number | null, litres: number | null) => {
			update(state => ({
				...state,
				data: {
					...state.data,
					bowser,
					bowserReadingStart: startReading,
					bowserReadingEnd: endReading,
					litresDispensed: litres
				}
			}));
			updateStepValidation();
		},
		
		setNotes: (notes: string) => {
			update(state => ({
				...state,
				data: { ...state.data, notes }
			}));
			updateStepValidation();
		},

		setEntryDate: (entryDate: string) => {
			update(state => ({
				...state,
				data: { ...state.data, entryDate }
			}));
			updateStepValidation();
		},

		setEntryTime: (entryTime: string) => {
			update(state => ({
				...state,
				data: { ...state.data, entryTime }
			}));
			updateStepValidation();
		},

		// Workflow control
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error }));
		},
		
		// Submit workflow
		submitFuelEntry: async () => {
			update(state => ({ ...state, isSubmitting: true, error: null }));
			
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				const { offlineSyncService } = await import('$lib/services/offline-sync');
				
				await supabaseService.init();
				
				// Get current state for submission
				let currentData: FuelEntryData;
				const unsubscribe = subscribe(state => {
					currentData = state.data;
				});
				unsubscribe();
				
				// Validate all data before submission
				const finalValidation = validateStep('review', currentData!);
				if (!finalValidation.valid) {
					throw new Error(`Validation failed: ${finalValidation.errors.join(', ')}`);
				}
				
				// Calculate derived values
				const litresUsed = currentData!.litresDispensed || 0;
				
				// Create fuel entry data matching the database schema
				const fuelEntryData = {
					entry_date: currentData!.entryDate,
					time: currentData!.entryTime,
					vehicle_id: currentData!.vehicle!.id,
					driver_id: currentData!.driver!.id,
					activity_id: currentData!.activity!.id,
					field_id: currentData!.fieldSelectionMode === 'single' ? (currentData!.field?.id || null) : null,
					zone_id: currentData!.zone?.id || null,
					field_selection_mode: currentData!.fieldSelectionMode,
					bowser_id: currentData!.bowser!.id,
					odometer_start: currentData!.odometerStart || null,
					odometer_end: currentData!.odometerEnd || null,
					gauge_working: currentData!.gaugeWorking,
					bowser_reading_start: currentData!.bowserReadingStart || null,
					bowser_reading_end: currentData!.bowserReadingEnd || null,
					litres_dispensed: currentData!.litresDispensed || 0,
					litres_used: litresUsed,
					cost_per_litre: null, // Not collected in UI yet
					total_cost: null, // Not calculated without cost_per_litre
					notes: currentData!.notes || null
				};
				
				console.log('Submitting fuel entry data:', fuelEntryData);
				
				let result;
				let isOffline = false;
				
				// Try to submit online first
				try {
					// Determine which fields to associate
					const fieldIds: string[] = [];
					if (currentData!.fieldSelectionMode === 'multiple' && currentData!.selectedFields.length > 0) {
						fieldIds.push(...currentData!.selectedFields.map(f => f.id));
					}

					// Use new multi-field method if fields are selected, otherwise use legacy method
					if (fieldIds.length > 0) {
						result = await supabaseService.createFuelEntryWithFields(fuelEntryData, fieldIds);
					} else {
						result = await supabaseService.createFuelEntry(fuelEntryData);
					}
					
					if (result.error) {
						throw new Error(result.error);
					}
				} catch (error) {
					// If network error or offline, store for later sync
					if (!navigator.onLine || error instanceof Error && (
						error.message.includes('fetch') || 
						error.message.includes('network') ||
						error.message.includes('Failed to fetch')
					)) {
						console.log('Storing fuel entry offline for later sync');
						const offlineId = await offlineSyncService.storeOfflineEntry('fuel_entry', fuelEntryData);
						isOffline = true;
						result = { data: { id: offlineId }, error: null };
					} else {
						throw error;
					}
				}
				
				// Update vehicle's current odometer (online only for now)
				if (!isOffline && currentData!.odometerEnd && currentData!.gaugeWorking) {
					try {
						await supabaseService.updateVehicleOdometer(
							currentData!.vehicle!.id, 
							currentData!.odometerEnd
						);
					} catch (error) {
						console.warn('Failed to update vehicle odometer:', error);
					}
				}
				
				// Update bowser's current reading
				if (currentData!.bowserReadingEnd !== null && currentData!.bowser) {
					if (isOffline) {
						// Store bowser reading update for later sync
						await offlineSyncService.storeOfflineEntry('bowser_reading', {
							bowser_id: currentData!.bowser.id,
							new_reading: currentData!.bowserReadingEnd,
							fuel_entry_id: result.data?.id
						});
					} else {
						try {
							await supabaseService.updateBowserReading(
								currentData!.bowser.id,
								currentData!.bowserReadingEnd,
								result.data?.id
							);
						} catch (error) {
							console.warn('Failed to update bowser reading:', error);
						}
					}
				}
				
				update(state => ({ 
					...state, 
					isSubmitting: false, 
					loading: 'success',
					error: null
				}));
				
				// Return success result
				return { success: true, data: result.data };
				
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to submit fuel entry';
				update(state => ({ 
					...state, 
					isSubmitting: false, 
					loading: 'error',
					error: errorMessage
				}));
				
				return { success: false, error: errorMessage };
			}
		},
		
		// Reset workflow
		reset: () => {
			set({ ...initialState, steps: [...defaultSteps], data: { ...initialData } });
		},
		
		// Manual validation trigger
		validateCurrentStep: () => {
			updateStepValidation();
		}
	};
}

// Export the store instance
export const fuelEntryWorkflowStore = createFuelEntryWorkflowStore();

// Derived stores for easy access to specific parts of the state
export const currentStep = derived(fuelEntryWorkflowStore, $store => $store.currentStep);
export const currentStepData = derived(fuelEntryWorkflowStore, $store => $store.steps[$store.currentStep]);
export const workflowProgress = derived(fuelEntryWorkflowStore, $store => $store.progress);
export const workflowData = derived(fuelEntryWorkflowStore, $store => $store.data);
export const workflowErrors = derived(fuelEntryWorkflowStore, $store => $store.validationErrors);
export const canProceedToNext = derived(fuelEntryWorkflowStore, $store => $store.canProceed);
export const canGoBackToPrevious = derived(fuelEntryWorkflowStore, $store => $store.canGoBack);
export const isSubmittingEntry = derived(fuelEntryWorkflowStore, $store => $store.isSubmitting);