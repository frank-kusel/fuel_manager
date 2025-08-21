<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import authStore from '$lib/stores/auth';
	import authService from '$lib/services/auth';
	import Button from '$lib/components/ui/Button.svelte';

	let mode: 'login' | 'register' = 'login';
	let email = '';
	let password = '';
	let name = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';

	$: authState = $authStore;

	onMount(async () => {
		// Initialize auth service
		try {
			await authService.init();
			// Check if user is already logged in
			await authStore.checkSession();
			
			if (authState.isAuthenticated) {
				goto('/fuel');
			}
		} catch (err) {
			console.error('Auth initialization failed:', err);
		}
	});

	async function handleSubmit() {
		if (loading) return;
		
		error = '';
		
		// Basic validation
		if (!email || !password) {
			error = 'Email and password are required';
			return;
		}
		
		if (mode === 'register') {
			if (!name) {
				error = 'Name is required for registration';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}
			if (password.length < 6) {
				error = 'Password must be at least 6 characters';
				return;
			}
		}
		
		loading = true;
		
		try {
			let result;
			if (mode === 'login') {
				result = await authStore.login(email, password);
			} else {
				result = await authStore.register(email, password, name);
			}
			
			if (result.success) {
				goto('/fuel');
			} else {
				error = result.error || 'Authentication failed';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Authentication failed';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'login' ? 'register' : 'login';
		error = '';
		password = '';
		confirmPassword = '';
	}
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Login' : 'Register'} - FarmTrack</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<div class="auth-header">
			<div class="brand-icon">🚜</div>
			<h1>FarmTrack</h1>
			<p class="tagline">Farm Management Platform</p>
		</div>

		<form class="auth-form" on:submit|preventDefault={handleSubmit}>
			<h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
			
			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			{#if mode === 'register'}
				<div class="form-group">
					<label for="name">Full Name</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="Enter your full name"
						disabled={loading}
						required
					>
				</div>
			{/if}

			<div class="form-group">
				<label for="email">Email Address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					disabled={loading}
					required
				>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter your password"
					disabled={loading}
					required
				>
			</div>

			{#if mode === 'register'}
				<div class="form-group">
					<label for="confirmPassword">Confirm Password</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						placeholder="Confirm your password"
						disabled={loading}
						required
					>
				</div>
			{/if}

			<Button 
				type="submit" 
				variant="primary" 
				fullWidth={true}
				{loading}
				disabled={loading || !email || !password || (mode === 'register' && (!name || password !== confirmPassword))}
			>
				{loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
			</Button>
		</form>

		<div class="auth-footer">
			<p>
				{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
				<button class="link-button" on:click={toggleMode} disabled={loading}>
					{mode === 'login' ? 'Create Account' : 'Sign In'}
				</button>
			</p>
		</div>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		padding: 1rem;
	}

	.auth-card {
		background: white;
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-lg);
		padding: 2rem;
		width: 100%;
		max-width: 400px;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.brand-icon {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	.auth-header h1 {
		color: var(--primary);
		font-size: 2rem;
		margin-bottom: 0.25rem;
	}

	.tagline {
		color: var(--gray-600);
		font-size: 0.9rem;
		margin: 0;
	}

	.auth-form {
		margin-bottom: 1.5rem;
	}

	.auth-form h2 {
		color: var(--gray-800);
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		color: var(--gray-700);
		font-weight: 500;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--border-radius);
		font-size: 1rem;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.form-group input:disabled {
		background-color: var(--gray-100);
		cursor: not-allowed;
	}

	.error-message {
		background: var(--red-50);
		border: 1px solid var(--red-200);
		border-radius: var(--border-radius);
		color: var(--red-700);
		padding: 0.75rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.auth-footer {
		text-align: center;
		padding-top: 1rem;
		border-top: 1px solid var(--gray-200);
	}

	.auth-footer p {
		color: var(--gray-600);
		margin: 0;
		font-size: 0.9rem;
	}

	.link-button {
		background: none;
		border: none;
		color: var(--primary);
		cursor: pointer;
		font-size: 0.9rem;
		text-decoration: underline;
		padding: 0;
		margin-left: 0.25rem;
	}

	.link-button:hover:not(:disabled) {
		color: var(--primary-dark);
	}

	.link-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	/* Mobile responsive */
	@media (max-width: 480px) {
		.auth-card {
			padding: 1.5rem;
		}
		
		.auth-header h1 {
			font-size: 1.75rem;
		}
		
		.auth-form h2 {
			font-size: 1.25rem;
		}
	}
</style>