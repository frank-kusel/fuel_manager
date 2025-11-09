// Persistent store for fuel entry draft with auto-save
import { writable, derived, get } from 'svelte/store';
import type { FuelEntryData } from './fuel-entry-workflow';

interface DraftState {
	hasDraft: boolean;
	currentStep: number;
	data: FuelEntryData | null;
	timestamp: number;
}

const DRAFT_KEY = 'fuelEntryDraft';
const MAX_DRAFT_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Load draft from localStorage
function loadDraft(): DraftState {
	if (typeof window === 'undefined') {
		return { hasDraft: false, currentStep: 0, data: null, timestamp: 0 };
	}

	try {
		const saved = localStorage.getItem(DRAFT_KEY);
		if (saved) {
			const draft = JSON.parse(saved);
			const age = Date.now() - draft.timestamp;

			// Check if draft is still valid (less than 24 hours old)
			if (age < MAX_DRAFT_AGE && draft.currentStep > 0) {
				return {
					hasDraft: true,
					currentStep: draft.currentStep,
					data: draft.data,
					timestamp: draft.timestamp
				};
			}
		}
	} catch (e) {
		console.error('Failed to load fuel entry draft:', e);
	}

	return { hasDraft: false, currentStep: 0, data: null, timestamp: 0 };
}

// Save draft to localStorage
function saveDraft(state: DraftState) {
	if (typeof window === 'undefined') return;

	try {
		if (state.hasDraft && state.currentStep > 0) {
			localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
		} else {
			localStorage.removeItem(DRAFT_KEY);
		}
	} catch (e) {
		console.error('Failed to save fuel entry draft:', e);
	}
}

// Create the store
function createDraftStore() {
	const { subscribe, set, update } = writable<DraftState>(loadDraft());

	return {
		subscribe,

		// Save current workflow state as draft
		saveDraft: (step: number, data: FuelEntryData) => {
			const newState: DraftState = {
				hasDraft: step > 0,
				currentStep: step,
				data: step > 0 ? data : null,
				timestamp: Date.now()
			};
			set(newState);
			saveDraft(newState);
		},

		// Clear the draft
		clearDraft: () => {
			const emptyState: DraftState = {
				hasDraft: false,
				currentStep: 0,
				data: null,
				timestamp: 0
			};
			set(emptyState);
			saveDraft(emptyState);
		},

		// Get the current draft
		getDraft: () => {
			return get({ subscribe });
		},

		// Reload from localStorage (useful after navigation)
		reload: () => {
			set(loadDraft());
		}
	};
}

export const fuelEntryDraftStore = createDraftStore();

// Derived store for checking if draft exists
export const hasDraft = derived(
	fuelEntryDraftStore,
	$draft => $draft.hasDraft
);
