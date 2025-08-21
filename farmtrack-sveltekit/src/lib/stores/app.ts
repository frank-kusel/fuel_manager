// Main application store
// Manages global app state, authentication, and configuration

import { writable, derived } from 'svelte/stores';
import type { User, LoadingState, Theme } from '$lib/types';

interface AppState {
	isOnline: boolean;
	theme: Theme;
	currentUser: User | null;
	loadingState: LoadingState;
	error: string | null;
	isInitialized: boolean;
	lastSync: string | null;
	version: string;
}

// Initial state
const initialState: AppState = {
	isOnline: navigator.onLine,
	theme: 'light',
	currentUser: null,
	loadingState: 'idle',
	error: null,
	isInitialized: false,
	lastSync: null,
	version: '2.0.0-beta'
};

// Create the main app store
const appStore = writable<AppState>(initialState);

// Helper functions for updating state
const appActions = {
	// Initialize the application
	async init() {
		appStore.update(state => ({ ...state, loadingState: 'loading' }));
		
		try {
			// Load user preferences from localStorage
			const savedTheme = localStorage.getItem('farmtrack-theme') as Theme;
			if (savedTheme) {
				appActions.setTheme(savedTheme);
			}
			
			// Check for saved user session
			// TODO: Implement authentication check
			
			// Mark as initialized
			appStore.update(state => ({
				...state,
				isInitialized: true,
				loadingState: 'success'
			}));
		} catch (error) {
			console.error('Failed to initialize app:', error);
			appStore.update(state => ({
				...state,
				error: 'Failed to initialize application',
				loadingState: 'error'
			}));
		}
	},

	// Set online/offline status
	setOnlineStatus(isOnline: boolean) {
		appStore.update(state => ({ ...state, isOnline }));
	},

	// Set theme
	setTheme(theme: Theme) {
		appStore.update(state => ({ ...state, theme }));
		localStorage.setItem('farmtrack-theme', theme);
		
		// Apply theme to document
		if (theme === 'dark') {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else if (theme === 'light') {
			document.documentElement.setAttribute('data-theme', 'light');
		} else {
			// Auto theme - detect system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
		}
	},

	// Set current user
	setUser(user: User | null) {
		appStore.update(state => ({ ...state, currentUser: user }));
	},

	// Set loading state
	setLoadingState(loadingState: LoadingState) {
		appStore.update(state => ({ ...state, loadingState }));
	},

	// Set error
	setError(error: string | null) {
		appStore.update(state => ({ ...state, error }));
	},

	// Update last sync timestamp
	updateLastSync() {
		const now = new Date().toISOString();
		appStore.update(state => ({ ...state, lastSync: now }));
	},

	// Clear error
	clearError() {
		appStore.update(state => ({ ...state, error: null }));
	}
};

// Derived stores for computed values
export const isOnline = derived(appStore, $app => $app.isOnline);
export const currentTheme = derived(appStore, $app => $app.theme);
export const currentUser = derived(appStore, $app => $app.currentUser);
export const isLoading = derived(appStore, $app => $app.loadingState === 'loading');
export const appError = derived(appStore, $app => $app.error);
export const isAuthenticated = derived(appStore, $app => $app.currentUser !== null);

// Listen for online/offline events
if (typeof window !== 'undefined') {
	window.addEventListener('online', () => appActions.setOnlineStatus(true));
	window.addEventListener('offline', () => appActions.setOnlineStatus(false));
	
	// Listen for system theme changes
	if (window.matchMedia) {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			// Only update if theme is set to auto
			appStore.subscribe(state => {
				if (state.theme === 'auto') {
					appActions.setTheme('auto');
				}
			})();
		});
	}
}

// Export the store and actions
export default {
	subscribe: appStore.subscribe,
	...appActions
};