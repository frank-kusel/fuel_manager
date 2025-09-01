<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	// Svelte 5 children prop
	let { children }: { children: any } = $props();

	// Safe pathname access
	const pathname = $derived($page?.url?.pathname || '/');

	// Router-level scroll management - ensures all navigation starts at top
	afterNavigate(() => {
		window.scrollTo(0, 0);
	});

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
				href="/summary" 
				class="nav-btn" 
				class:active={pathname === '/summary'}
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
				href="/tools" 
				class="nav-btn" 
				class:active={pathname.startsWith('/tools')}
			>
				Tools
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
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11h1.5a2.5 2.5 0 0 0 0-5h-11a2.5 2.5 0 0 0 0 5H4"/><path d="M14 11v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11"/><path d="M14 4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2"/></svg>
			<span class="nav-label">Fuel</span>
		</a>
		<a 
			href="/summary" 
			class="mobile-nav-btn" 
			class:active={pathname === '/summary'}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
			<span class="nav-label">Summary</span>
		</a>
		<a 
			href="/dashboard" 
			class="mobile-nav-btn" 
			class:active={pathname === '/dashboard'}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>
			<span class="nav-label">Dashboard</span>
		</a>
		<a 
			href="/tools" 
			class="mobile-nav-btn" 
			class:active={pathname.startsWith('/tools')}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
			<span class="nav-label">Tools</span>
		</a>
	</nav>
</div>

<style>
	/* Body styles moved to app.css to avoid conflicts */

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
		width: 24px;
		height: 24px;
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