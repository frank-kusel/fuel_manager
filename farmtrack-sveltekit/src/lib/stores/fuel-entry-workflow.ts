// Complex 7-step fuel entry workflow store
// Manages the complete fuel entry process with validation and state persistence

import { writable, derived } from 'svelte/store';
import type { FuelEntry, Vehicle, Driver, Activity, Field, Zone, Bowser, LoadingState } from '$lib/types';

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
	
	// Step 4: Location Selection (optional) - either field or zone
	field: Field | null;
	zone: Zone | null;
	
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
		valid: true, // Optional step
		required: false
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
	odometerStart: null,
	odometerEnd: null,
	gaugeWorking: true,
	bowser: null,
	bowserReadingStart: null,
	bowserReadingEnd: null,
	litresDispensed: null,
	notes: '',
	timestamp: new Date()
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
				// Optional step - always valid (can have field, zone, or neither)
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
				data: { ...state.data, field, zone: null }
			}));
			updateStepValidation();
		},
		
		setLocation: (field: Field | null, zone: Zone | null) => {
			update(state => ({
				...state,
				data: { ...state.data, field, zone }
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
					entry_date: new Date().toISOString().split('T')[0],
					time: new Date().toTimeString().substring(0, 5),
					vehicle_id: currentData!.vehicle!.id,
					driver_id: currentData!.driver!.id,
					activity_id: currentData!.activity!.id,
					field_id: currentData!.field?.id || null,
					zone_id: currentData!.zone?.id || null,
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
				
				// Submit to database
				const result = await supabaseService.createFuelEntry(fuelEntryData);
				
				if (result.error) {
					throw new Error(result.error);
				}
				
				// Update vehicle's current odometer
				if (currentData!.odometerEnd && currentData!.gaugeWorking) {
					await supabaseService.updateVehicleOdometer(
						currentData!.vehicle!.id, 
						currentData!.odometerEnd
					);
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