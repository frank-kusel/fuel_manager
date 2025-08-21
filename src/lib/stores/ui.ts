import { writable, derived } from 'svelte/store';
import type { Theme, LoadingState } from '$lib/types';

interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title: string;
	message?: string;
	duration?: number;
	actions?: Array<{ label: string; action: () => void }>;
}

interface Modal {
	id: string;
	title: string;
	content: string;
	actions: Array<{ label: string; action: () => void; variant?: string }>;
	closeable: boolean;
}

interface UIState {
	theme: Theme;
	sidebarOpen: boolean;
	mobileMenuOpen: boolean;
	toasts: ToastMessage[];
	modals: Modal[];
	loading: boolean;
	connectionStatus: 'online' | 'offline' | 'checking';
	syncStatus: {
		syncing: boolean;
		progress: number;
		error: string | null;
	};
	preferences: {
		autoSync: boolean;
		notifications: boolean;
		compactView: boolean;
		darkMode: boolean;
	};
}

const initialState: UIState = {
	theme: 'light',
	sidebarOpen: false,
	mobileMenuOpen: false,
	toasts: [],
	modals: [],
	loading: false,
	connectionStatus: 'online',
	syncStatus: {
		syncing: false,
		progress: 0,
		error: null
	},
	preferences: {
		autoSync: true,
		notifications: true,
		compactView: false,
		darkMode: false
	}
};

function createUIStore() {
	const { subscribe, set, update } = writable<UIState>(initialState);

	// Load preferences from localStorage
	if (typeof window !== 'undefined') {
		const savedPreferences = localStorage.getItem('farmtrack_ui_preferences');
		if (savedPreferences) {
			try {
				const preferences = JSON.parse(savedPreferences);
				update(state => ({ ...state, preferences: { ...state.preferences, ...preferences } }));
			} catch (error) {
				console.warn('Failed to load UI preferences:', error);
			}
		}
	}

	return {
		subscribe,
		
		// Theme management
		setTheme: (theme: Theme) => {
			update(state => ({ ...state, theme }));
			if (typeof window !== 'undefined') {
				document.documentElement.setAttribute('data-theme', theme);
			}
		},
		
		toggleTheme: () => {
			update(state => {
				const newTheme = state.theme === 'light' ? 'dark' : 'light';
				if (typeof window !== 'undefined') {
					document.documentElement.setAttribute('data-theme', newTheme);
				}
				return { ...state, theme: newTheme };
			});
		},
		
		// Sidebar and mobile menu
		setSidebarOpen: (open: boolean) => {
			update(state => ({ ...state, sidebarOpen: open }));
		},
		
		toggleSidebar: () => {
			update(state => ({ ...state, sidebarOpen: !state.sidebarOpen }));
		},
		
		setMobileMenuOpen: (open: boolean) => {
			update(state => ({ ...state, mobileMenuOpen: open }));
		},
		
		toggleMobileMenu: () => {
			update(state => ({ ...state, mobileMenuOpen: !state.mobileMenuOpen }));
		},
		
		// Toast notifications
		showToast: (toast: Omit<ToastMessage, 'id'>) => {
			const id = crypto.randomUUID();
			const duration = toast.duration || (toast.type === 'error' ? 8000 : 4000);
			
			update(state => ({
				...state,
				toasts: [...state.toasts, { ...toast, id }]
			}));
			
			// Auto-remove toast after duration
			if (duration > 0) {
				setTimeout(() => {
					update(state => ({
						...state,
						toasts: state.toasts.filter(t => t.id !== id)
					}));
				}, duration);
			}
			
			return id;
		},
		
		removeToast: (id: string) => {
			update(state => ({
				...state,
				toasts: state.toasts.filter(t => t.id !== id)
			}));
		},
		
		clearToasts: () => {
			update(state => ({ ...state, toasts: [] }));
		},
		
		// Modal management
		showModal: (modal: Omit<Modal, 'id'>) => {
			const id = crypto.randomUUID();
			update(state => ({
				...state,
				modals: [...state.modals, { ...modal, id }]
			}));
			return id;
		},
		
		removeModal: (id: string) => {
			update(state => ({
				...state,
				modals: state.modals.filter(m => m.id !== id)
			}));
		},
		
		clearModals: () => {
			update(state => ({ ...state, modals: [] }));
		},
		
		// Loading state
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		
		// Connection status
		setConnectionStatus: (status: 'online' | 'offline' | 'checking') => {
			update(state => ({ ...state, connectionStatus: status }));
		},
		
		// Sync status
		setSyncStatus: (syncing: boolean, progress = 0, error: string | null = null) => {
			update(state => ({
				...state,
				syncStatus: { syncing, progress, error }
			}));
		},
		
		// Preferences
		updatePreference: <K extends keyof UIState['preferences']>(
			key: K,
			value: UIState['preferences'][K]
		) => {
			update(state => {
				const newPreferences = { ...state.preferences, [key]: value };
				
				// Save to localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('farmtrack_ui_preferences', JSON.stringify(newPreferences));
				}
				
				return { ...state, preferences: newPreferences };
			});
		},
		
		resetPreferences: () => {
			const defaultPreferences = initialState.preferences;
			update(state => ({ ...state, preferences: defaultPreferences }));
			
			if (typeof window !== 'undefined') {
				localStorage.setItem('farmtrack_ui_preferences', JSON.stringify(defaultPreferences));
			}
		},
		
		// Utility methods
		showSuccess: (title: string, message?: string) => {
			const { showToast } = createUIStore();
			return showToast({ type: 'success', title, message });
		},
		
		showError: (title: string, message?: string) => {
			const { showToast } = createUIStore();
			return showToast({ type: 'error', title, message });
		},
		
		showWarning: (title: string, message?: string) => {
			const { showToast } = createUIStore();
			return showToast({ type: 'warning', title, message });
		},
		
		showInfo: (title: string, message?: string) => {
			const { showToast } = createUIStore();
			return showToast({ type: 'info', title, message });
		},
		
		confirm: (title: string, message: string, confirmLabel = 'Confirm', cancelLabel = 'Cancel'): Promise<boolean> => {
			return new Promise((resolve) => {
				const { showModal } = createUIStore();
				showModal({
					title,
					content: message,
					closeable: false,
					actions: [
						{
							label: cancelLabel,
							action: () => {
								resolve(false);
							}
						},
						{
							label: confirmLabel,
							action: () => {
								resolve(true);
							},
							variant: 'primary'
						}
					]
				});
			});
		},
		
		reset: () => set(initialState)
	};
}

const uiStore = createUIStore();

// Set up online/offline listeners
if (typeof window !== 'undefined') {
	window.addEventListener('online', () => {
		uiStore.setConnectionStatus('online');
		uiStore.showSuccess('Connection Restored', 'You are now online');
	});
	
	window.addEventListener('offline', () => {
		uiStore.setConnectionStatus('offline');
		uiStore.showWarning('Connection Lost', 'You are now offline. Changes will be saved locally.');
	});
	
	// Initial connection status
	uiStore.setConnectionStatus(navigator.onLine ? 'online' : 'offline');
}

export default uiStore;

// Derived stores
export const theme = derived(uiStore, $store => $store.theme);
export const sidebarOpen = derived(uiStore, $store => $store.sidebarOpen);
export const mobileMenuOpen = derived(uiStore, $store => $store.mobileMenuOpen);
export const toasts = derived(uiStore, $store => $store.toasts);
export const modals = derived(uiStore, $store => $store.modals);
export const uiLoading = derived(uiStore, $store => $store.loading);
export const connectionStatus = derived(uiStore, $store => $store.connectionStatus);
export const syncStatus = derived(uiStore, $store => $store.syncStatus);
export const preferences = derived(uiStore, $store => $store.preferences);
export const isOnline = derived(uiStore, $store => $store.connectionStatus === 'online');
export const isOfflineUI = derived(uiStore, $store => $store.connectionStatus === 'offline');