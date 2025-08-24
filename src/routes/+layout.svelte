<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Svelte 5 children prop
	let { children }: { children: any } = $props();

	// Safe pathname access
	const pathname = $derived($page?.url?.pathname || '/');

	// Progressive Web App Service Worker Registration
	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js')
				.then(() => console.log('Service Worker registered'))
				.catch(err => console.error('Service Worker registration failed:', err));
		}
	});
</script>

<svelte:head>
	<title>FarmTrack - Farm Management Platform</title>
</svelte:head>

<div class="app">
	<!-- Desktop Header -->
	<header class="header desktop-only">
		<div class="header-brand">
			<div class="brand-icon">🚜</div>
			<h1>FarmTrack</h1>
		</div>
		<nav class="nav">
			<a 
				href="/fuel" 
				class="nav-btn" 
				class:active={pathname === '/fuel' || pathname === '/'}
			>
				Fuel Management
			</a>
			<a 
				href="/fuel/summary" 
				class="nav-btn" 
				class:active={pathname === '/fuel/summary'}
			>
				Fuel Summary
			</a>
			<a 
				href="/dashboard" 
				class="nav-btn" 
				class:active={pathname === '/dashboard'}
			>
				Dashboard
			</a>
			<a 
				href="/fleet" 
				class="nav-btn" 
				class:active={pathname.startsWith('/fleet')}
			>
				Database
			</a>
		</nav>
	</header>

	<!-- Main Content -->
	<main class="main">
		{@render children()}
	</main>

	<!-- Mobile Bottom Navigation -->
	<nav class="mobile-nav">
		<a 
			href="/fuel" 
			class="mobile-nav-btn" 
			class:active={pathname === '/fuel' || pathname === '/'}
		>
			<span class="nav-icon">⛽</span>
			<span class="nav-label">Fuel</span>
		</a>
		<a 
			href="/fuel/summary" 
			class="mobile-nav-btn" 
			class:active={pathname === '/fuel/summary'}
		>
			<span class="nav-icon">📋</span>
			<span class="nav-label">Summary</span>
		</a>
		<a 
			href="/dashboard" 
			class="mobile-nav-btn" 
			class:active={pathname === '/dashboard'}
		>
			<span class="nav-icon">📊</span>
			<span class="nav-label">Dashboard</span>
		</a>
	</nav>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--gray-50);
		color: var(--gray-900);
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* Header Styles */
	.header {
		background: white;
		border-bottom: 1px solid var(--gray-200);
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.brand-icon {
		font-size: 1.5rem;
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--primary);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--gray-600);
		font-weight: 500;
		transition: all 0.2s;
	}

	.nav-btn:hover {
		background: var(--gray-100);
		color: var(--gray-900);
	}

	.nav-btn.active {
		background: var(--primary);
		color: white;
	}


	/* Main Content */
	.main {
		flex: 1;
		padding: 1rem;
		margin-bottom: 4rem; /* Space for mobile nav */
	}

	/* Mobile Navigation */
	.mobile-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid var(--gray-200);
		display: flex;
		height: 4rem;
		box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
	}

	.mobile-nav-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		color: var(--gray-600);
		font-size: 0.75rem;
		gap: 0.25rem;
		transition: color 0.2s;
	}

	.mobile-nav-btn:hover,
	.mobile-nav-btn.active {
		color: var(--primary);
	}

	.nav-icon {
		font-size: 1.2rem;
	}

	.nav-label {
		font-weight: 500;
	}

	/* Desktop only */
	.desktop-only {
		display: none;
	}

	@media (min-width: 768px) {
		.desktop-only {
			display: flex;
		}

		.mobile-nav {
			display: none;
		}

		.main {
			margin-bottom: 0;
		}
	}

</style>