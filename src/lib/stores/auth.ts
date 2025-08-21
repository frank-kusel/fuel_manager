import { writable, derived } from 'svelte/store';
import type { User, LoadingState } from '$lib/types';

// Auth state interface
interface AuthState {
	user: User | null;
	loading: LoadingState;
	error: string | null;
	isAuthenticated: boolean;
}

// Initial auth state
const initialState: AuthState = {
	user: null,
	loading: 'idle',
	error: null,
	isAuthenticated: false
};

// Create the auth store
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		
		// Actions
		setLoading: (loading: LoadingState) => {
			update(state => ({ ...state, loading }));
		},
		
		setUser: (user: User | null) => {
			update(state => ({
				...state,
				user,
				isAuthenticated: !!user,
				loading: 'idle',
				error: null
			}));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: 'idle' }));
		},
		
		login: async (email: string, password: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				// Import auth service dynamically to avoid circular dependencies
				const { default: authService } = await import('$lib/services/auth');
				const result = await authService.login(email, password);
				
				if (result.error) {
					update(state => ({ ...state, error: result.error, loading: 'error' }));
					return { success: false, error: result.error };
				}
				
				update(state => ({
					...state,
					user: result.data,
					isAuthenticated: true,
					loading: 'success',
					error: null
				}));
				
				return { success: true, user: result.data };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Login failed';
				update(state => ({ ...state, error: errorMessage, loading: 'error' }));
				return { success: false, error: errorMessage };
			}
		},
		
		logout: async () => {
			update(state => ({ ...state, loading: 'loading' }));
			
			try {
				const { default: authService } = await import('$lib/services/auth');
				await authService.logout();
				
				set(initialState);
				return { success: true };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Logout failed';
				update(state => ({ ...state, error: errorMessage, loading: 'error' }));
				return { success: false, error: errorMessage };
			}
		},
		
		register: async (email: string, password: string, name: string) => {
			update(state => ({ ...state, loading: 'loading', error: null }));
			
			try {
				const { default: authService } = await import('$lib/services/auth');
				const result = await authService.register(email, password, name);
				
				if (result.error) {
					update(state => ({ ...state, error: result.error, loading: 'error' }));
					return { success: false, error: result.error };
				}
				
				update(state => ({
					...state,
					user: result.data,
					isAuthenticated: true,
					loading: 'success',
					error: null
				}));
				
				return { success: true, user: result.data };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Registration failed';
				update(state => ({ ...state, error: errorMessage, loading: 'error' }));
				return { success: false, error: errorMessage };
			}
		},
		
		checkSession: async () => {
			update(state => ({ ...state, loading: 'loading' }));
			
			try {
				const { default: authService } = await import('$lib/services/auth');
				const result = await authService.getCurrentUser();
				
				if (result.data) {
					update(state => ({
						...state,
						user: result.data,
						isAuthenticated: true,
						loading: 'success',
						error: null
					}));
				} else {
					update(state => ({ ...state, loading: 'idle' }));
				}
				
				return result.data;
			} catch (error) {
				update(state => ({ ...state, loading: 'idle' }));
				return null;
			}
		},
		
		clearError: () => {
			update(state => ({ ...state, error: null }));
		},
		
		reset: () => {
			set(initialState);
		}
	};
}

// Create and export the store
const authStore = createAuthStore();
export default authStore;

// Derived stores for convenience
export const user = derived(authStore, $auth => $auth.user);
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
export const authLoading = derived(authStore, $auth => $auth.loading);
export const authError = derived(authStore, $auth => $auth.error);