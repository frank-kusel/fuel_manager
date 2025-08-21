import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import type { User, ApiResponse } from '$lib/types';
import supabaseService from './supabase';

class AuthService {
	private client: SupabaseClient | null = null;
	private initialized = false;

	// Initialize with the same client as SupabaseService
	async init(): Promise<void> {
		if (this.initialized) return;

		try {
			// Use the same initialization as the supabase service
			await supabaseService.init();
			// Access the private client through reflection (not ideal but works for now)
			this.client = (supabaseService as any).client;
			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize auth service:', error);
			throw error;
		}
	}

	private ensureInitialized(): SupabaseClient {
		if (!this.client || !this.initialized) {
			throw new Error('Auth service not initialized. Call init() first.');
		}
		return this.client;
	}

	// Convert Supabase user to our User type
	private mapSupabaseUser(supabaseUser: SupabaseUser, profile?: any): User {
		return {
			id: supabaseUser.id,
			email: supabaseUser.email || '',
			name: profile?.name || supabaseUser.email?.split('@')[0] || 'User',
			role: profile?.role || 'operator',
			active: profile?.active ?? true,
			created_at: supabaseUser.created_at,
			updated_at: profile?.updated_at || supabaseUser.updated_at || new Date().toISOString()
		};
	}

	// Login with email and password
	async login(email: string, password: string): Promise<ApiResponse<User>> {
		try {
			const client = this.ensureInitialized();
			
			const { data, error } = await client.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				return { data: null, error: error.message };
			}

			if (!data.user) {
				return { data: null, error: 'Login failed - no user returned' };
			}

			// Get user profile if it exists
			const { data: profile } = await client
				.from('user_profiles')
				.select('*')
				.eq('id', data.user.id)
				.single();

			const user = this.mapSupabaseUser(data.user, profile);
			return { data: user, error: null };

		} catch (error) {
			console.error('Login error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Login failed' 
			};
		}
	}

	// Register new user
	async register(email: string, password: string, name: string): Promise<ApiResponse<User>> {
		try {
			const client = this.ensureInitialized();
			
			const { data, error } = await client.auth.signUp({
				email,
				password,
				options: {
					data: {
						name: name
					}
				}
			});

			if (error) {
				return { data: null, error: error.message };
			}

			if (!data.user) {
				return { data: null, error: 'Registration failed - no user returned' };
			}

			// Create user profile
			const { error: profileError } = await client
				.from('user_profiles')
				.insert({
					id: data.user.id,
					name: name,
					email: email,
					role: 'operator',
					active: true
				});

			if (profileError) {
				console.warn('Failed to create user profile:', profileError);
			}

			const user = this.mapSupabaseUser(data.user, { name, role: 'operator', active: true });
			return { data: user, error: null };

		} catch (error) {
			console.error('Registration error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Registration failed' 
			};
		}
	}

	// Logout
	async logout(): Promise<ApiResponse<null>> {
		try {
			const client = this.ensureInitialized();
			
			const { error } = await client.auth.signOut();
			
			if (error) {
				return { data: null, error: error.message };
			}

			return { data: null, error: null };

		} catch (error) {
			console.error('Logout error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Logout failed' 
			};
		}
	}

	// Get current user
	async getCurrentUser(): Promise<ApiResponse<User | null>> {
		try {
			const client = this.ensureInitialized();
			
			const { data: { user }, error } = await client.auth.getUser();

			if (error) {
				return { data: null, error: error.message };
			}

			if (!user) {
				return { data: null, error: null };
			}

			// Get user profile
			const { data: profile } = await client
				.from('user_profiles')
				.select('*')
				.eq('id', user.id)
				.single();

			const mappedUser = this.mapSupabaseUser(user, profile);
			return { data: mappedUser, error: null };

		} catch (error) {
			console.error('Get current user error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Failed to get current user' 
			};
		}
	}

	// Reset password
	async resetPassword(email: string): Promise<ApiResponse<null>> {
		try {
			const client = this.ensureInitialized();
			
			const { error } = await client.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`
			});

			if (error) {
				return { data: null, error: error.message };
			}

			return { data: null, error: null };

		} catch (error) {
			console.error('Reset password error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Password reset failed' 
			};
		}
	}

	// Update password
	async updatePassword(newPassword: string): Promise<ApiResponse<null>> {
		try {
			const client = this.ensureInitialized();
			
			const { error } = await client.auth.updateUser({
				password: newPassword
			});

			if (error) {
				return { data: null, error: error.message };
			}

			return { data: null, error: null };

		} catch (error) {
			console.error('Update password error:', error);
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Password update failed' 
			};
		}
	}

	// Listen to auth state changes
	onAuthStateChange(callback: (user: User | null) => void) {
		const client = this.ensureInitialized();
		
		return client.auth.onAuthStateChange(async (event, session) => {
			if (session?.user) {
				// Get user profile
				const { data: profile } = await client
					.from('user_profiles')
					.select('*')
					.eq('id', session.user.id)
					.single();

				const user = this.mapSupabaseUser(session.user, profile);
				callback(user);
			} else {
				callback(null);
			}
		});
	}
}

// Export singleton instance
const authService = new AuthService();
export default authService;