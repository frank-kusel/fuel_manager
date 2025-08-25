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
		background: var(--gray-50);
		border-bottom: none;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.brand-icon {
		font-size: 1.5rem;
		color: #f97316;
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-btn {
		padding: 0.5rem 1rem;
		border-radius: 12px;
		text-decoration: none;
		color: #6b7280;
		font-weight: 500;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.nav-btn:hover {
		background: rgba(249, 115, 22, 0.05);
		color: #f97316;
		border-color: rgba(249, 115, 22, 0.2);
	}

	.nav-btn.active {
		background: rgba(249, 115, 22, 0.1);
		color: #f97316;
		border-color: rgba(249, 115, 22, 0.3);
		font-weight: 600;
	}


	/* Main Content */
	.main {
		flex: 1;
		padding: 0.5rem;
		margin-bottom: 4rem; /* Space for mobile nav */
	}

	/* Mobile Navigation */
	.mobile-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid #f1f5f9;
		display: flex;
		height: 4rem;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(10px);
	}

	.mobile-nav-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		color: #9ca3af;
		font-size: 0.75rem;
		gap: 0.25rem;
		transition: all 0.2s ease;
		position: relative;
		border-radius: 12px;
		margin: 0.5rem 0.25rem;
	}

	.mobile-nav-btn:hover {
		color: #f97316;
		background: rgba(249, 115, 22, 0.05);
	}

	.mobile-nav-btn.active {
		color: #f97316;
		background: rgba(249, 115, 22, 0.1);
		font-weight: 600;
	}

	.mobile-nav-btn.active::before {
		content: '';
		position: absolute;
		top: -0.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 24px;
		height: 3px;
		background: linear-gradient(135deg, #f97316, #ea580c);
		border-radius: 0 0 6px 6px;
	}

	.nav-icon {
		font-size: 1.25rem;
		transition: transform 0.2s ease;
	}

	.mobile-nav-btn.active .nav-icon {
		transform: scale(1.1);
	}

	.nav-label {
		font-weight: 500;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
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