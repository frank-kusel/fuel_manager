<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import TankRefillModal from '$lib/components/modals/TankRefillModal.svelte';
	import FuelEntryModal from '$lib/components/modals/FuelEntryModal.svelte';
	import { hasDraft } from '$lib/stores/fuel-entry-draft';
	import { dashboardInsightsStore, insightsData } from '$lib/stores/dashboard-insights';

	// Svelte 5 children prop
	let { children }: { children: any } = $props();

	// Safe pathname access
	const pathname = $derived($page?.url?.pathname || '/');

	// ---- Desktop sidebar (≥1024px) ----
	const SIDEBAR_KEY = 'farmtrack_sidebar_v1';
	let sidebarCollapsed = $state(false);

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		try {
			localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'open');
		} catch {
			/* private mode */
		}
	}

	const nfSidebar = new Intl.NumberFormat('en-ZA');
	let tankStrip = $derived.by(() => {
		const t = $insightsData?.tank;
		if (!t || t.derivedLevel === null) return null;
		return { name: t.name, litres: Math.round(t.derivedLevel), runway: t.runwayDays };
	});

	// Action menu state
	let showActionMenu = $state(false);
	let showFuelEntryModal = $state(false);
	let showDipstickModal = $state(false);
	let showRefillModal = $state(false);

	// Toggle action menu
	function toggleActionMenu() {
		showActionMenu = !showActionMenu;
	}

	// Close action menu
	function closeActionMenu() {
		showActionMenu = false;
	}

	// Handle action selection
	function handleAction(action: 'fuel' | 'dipstick' | 'refill' | 'quick') {
		closeActionMenu();

		if (action === 'fuel') {
			showFuelEntryModal = true;
		} else if (action === 'dipstick') {
			showDipstickModal = true;
		} else if (action === 'refill') {
			showRefillModal = true;
		} else if (action === 'quick') {
			goto('/fuel/quick');
		}
	}

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

		// Prefetch reference data (vehicles/drivers/activities/fields/zones/
		// bowsers) while the user is on their first screen, so the fuel-entry
		// wizard and quick entry open instantly instead of waiting ~1s for
		// Supabase in London. The store caches for 5 minutes.
		const idle = (cb: () => void) =>
			'requestIdleCallback' in window
				? (window as any).requestIdleCallback(cb, { timeout: 4000 })
				: setTimeout(cb, 1500);
		idle(() => {
			import('$lib/stores/reference-data').then(({ referenceDataStore }) =>
				referenceDataStore.loadAllData()
			);
		});

		// Desktop sidebar: restore collapse state, and only fetch the tank
		// strip's data when the sidebar can actually be seen — phones pay nothing.
		try {
			sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
		} catch {
			/* private mode */
		}
		if (window.matchMedia('(min-width: 1024px)').matches) {
			dashboardInsightsStore.load(); // 5-min cached, shared with Dashboard/Tank
		}
	});
</script>

<svelte:head>
	<title>FarmTrack - Farm Management Platform</title>
</svelte:head>

<div class="app" class:sb-collapsed={sidebarCollapsed}>
	<!-- Desktop Sidebar (≥1024px) -->
	<aside class="sidebar">
		<div class="sb-brand">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M12 2.5C12 2.5 5.5 9.8 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.5 12 2.5Z" fill="currentColor"/>
			</svg>
			<span class="sb-label sb-brand-name">FarmTrack</span>
		</div>

		<div class="sb-group">
			<button class="sb-primary" title="Log fuel entry (quick form)" onclick={() => goto('/fuel/quick')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
				<span class="sb-label">Log fuel entry</span>
			</button>
			<button class="sb-item" title="Dipstick reading" onclick={() => handleAction('dipstick')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg>
				<span class="sb-label">Dipstick reading</span>
			</button>
			<button class="sb-item" title="Tank delivery" onclick={() => handleAction('refill')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="m3 15 6-6 3 3 6-6"/></svg>
				<span class="sb-label">Tank delivery</span>
			</button>
			<button class="sb-item" title="Full entry workflow" onclick={() => handleAction('fuel')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
				<span class="sb-label">Full workflow</span>
				{#if $hasDraft}<span class="sb-draft-dot" title="Draft in progress"></span>{/if}
			</button>
		</div>

		<div class="sb-group">
			<div class="sb-group-label"><span class="sb-label">Navigate</span></div>
			<a href="/entries" class="sb-item" title="Log" class:active={pathname === '/summary' || pathname === '/' || pathname.startsWith('/entries')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
				<span class="sb-label">Log</span>
			</a>
			<a href="/dashboard" class="sb-item" title="Dashboard" class:active={pathname === '/dashboard'}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>
				<span class="sb-label">Dashboard</span>
			</a>
			<a href="/tank" class="sb-item" title="Tank" class:active={pathname.startsWith('/tank')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 13h14"/><path d="M9 7h6"/></svg>
				<span class="sb-label">Tank</span>
			</a>
			<a href="/audit" class="sb-item" title="Audit" class:active={pathname.startsWith('/audit') || pathname.startsWith('/menu') || pathname.startsWith('/reports')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>
				<span class="sb-label">Audit</span>
			</a>
		</div>

		<div class="sb-group">
			<div class="sb-group-label"><span class="sb-label">Admin</span></div>
			<a href="/tools/reconciliations" class="sb-item" title="Month-end close" class:active={pathname.startsWith('/tools/reconciliations')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
				<span class="sb-label">Month-end close</span>
			</a>
			<a href="/tools/database" class="sb-item" title="Database" class:active={pathname.startsWith('/tools/database')}>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
				<span class="sb-label">Database</span>
			</a>
		</div>

		<div class="sb-spacer"></div>

		{#if tankStrip}
			<a class="sb-tank" href="/tank" title="{tankStrip.name}: {nfSidebar.format(tankStrip.litres)} L{tankStrip.runway !== null ? ` · ~${tankStrip.runway} days` : ''}">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5C12 2.5 5.5 9.8 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.5 12 2.5Z"/></svg>
				<span class="sb-label">
					{nfSidebar.format(tankStrip.litres)} L{tankStrip.runway !== null ? ` · ~${tankStrip.runway}d` : ''}
				</span>
			</a>
		{/if}

		<button class="sb-collapse" onclick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			<svg class="sb-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
			<span class="sb-label">Collapse</span>
		</button>
	</aside>

	<!-- Desktop Header -->
	<header class="header desktop-only">
		<div class="header-brand">
			<div class="brand-icon">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
					<path d="M12 2.5C12 2.5 5.5 9.8 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.5 12 2.5Z" fill="currentColor"/>
					<path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.85"/>
				</svg>
			</div>
			<h1>FarmTrack</h1>
		</div>
		<nav class="nav">
			<a
				href="/summary"
				class="nav-btn"
				class:active={pathname === '/summary' || pathname === '/'}
			>
				Log
			</a>
			<a
				href="/dashboard"
				class="nav-btn"
				class:active={pathname === '/dashboard'}
			>
				Dashboard
			</a>
			<a
				href="/tank"
				class="nav-btn"
				class:active={pathname.startsWith('/tank')}
			>
				Tank
			</a>
			<a
				href="/audit"
				class="nav-btn"
				class:active={pathname.startsWith('/audit') || pathname.startsWith('/reports') || pathname.startsWith('/menu') || pathname.startsWith('/tools')}
			>
				Audit
			</a>
			<button class="nav-btn action-btn" onclick={toggleActionMenu}>
				<span>+ New Entry</span>
			</button>
		</nav>
	</header>

	<!-- Main Content -->
	<main class="main">
		{@render children()}
	</main>

	<!-- Mobile Bottom Navigation -->
	<nav class="mobile-nav">
		<a
			href="/summary"
			class="mobile-nav-btn"
			class:active={pathname === '/summary' || pathname === '/'}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
			<span class="nav-label">Log</span>
		</a>
		<a
			href="/dashboard"
			class="mobile-nav-btn"
			class:active={pathname === '/dashboard'}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>
			<span class="nav-label">Dash</span>
		</a>

		<!-- Central Action Button -->
		<button class="mobile-nav-btn central-action" class:has-draft={$hasDraft} onclick={toggleActionMenu}>
			<div class="action-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			</div>
		</button>

		<a
			href="/tank"
			class="mobile-nav-btn"
			class:active={pathname.startsWith('/tank')}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 13h14"/><path d="M9 7h6"/></svg>
			<span class="nav-label">Tank</span>
		</a>

		<a
			href="/audit"
			class="mobile-nav-btn"
			class:active={pathname.startsWith('/audit') || pathname.startsWith('/reports') || pathname.startsWith('/menu') || pathname.startsWith('/tools')}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>
			<span class="nav-label">Audit</span>
		</a>
	</nav>

	<!-- Action Menu Overlay -->
	{#if showActionMenu}
		<div class="action-overlay" onclick={closeActionMenu}></div>
		<div class="action-menu">
			<button class="action-menu-item primary" onclick={() => handleAction('fuel')}>
				<div class="action-menu-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
				</div>
				<div class="action-menu-content">
					<div class="action-menu-title">Log Fuel Entry</div>
					<div class="action-menu-desc">Record fuel dispensed to vehicles</div>
				</div>
			</button>
			<button class="action-menu-item" onclick={() => handleAction('dipstick')}>
				<div class="action-menu-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg>
				</div>
				<div class="action-menu-content">
					<div class="action-menu-title">Log Dipstick Reading</div>
					<div class="action-menu-desc">Record tank dipstick measurement</div>
				</div>
			</button>
			<button class="action-menu-item" onclick={() => handleAction('refill')}>
				<div class="action-menu-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="m3 15 6-6 3 3 6-6"/></svg>
				</div>
				<div class="action-menu-content">
					<div class="action-menu-title">Tank Refill</div>
					<div class="action-menu-desc">Record tank delivery and refill</div>
				</div>
			</button>
			<button class="action-menu-item" onclick={() => handleAction('quick')}>
				<div class="action-menu-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
				</div>
				<div class="action-menu-content">
					<div class="action-menu-title">Quick entry</div>
					<div class="action-menu-desc">Single-page form for experienced users</div>
				</div>
			</button>
		</div>
	{/if}

	<!-- Modals -->
	<FuelEntryModal
		bind:show={showFuelEntryModal}
		onClose={() => showFuelEntryModal = false}
	/>
	<DipstickModal
		bind:show={showDipstickModal}
		onClose={() => showDipstickModal = false}
	/>
	<TankRefillModal
		bind:show={showRefillModal}
		onClose={() => showRefillModal = false}
	/>
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
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-lg);
		background: var(--brand);
		color: #ffffff;
		box-shadow: 0 2px 8px var(--brand-glow);
	}

	.header h1 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--gray-900);
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
		background: var(--brand-tint-weak);
		color: var(--brand);
		border-color: rgba(142, 43, 52, 0.2);
	}

	.nav-btn.active {
		background: var(--brand-tint);
		color: var(--brand);
		border-color: var(--brand-ring);
		font-weight: 600;
	}

	.action-btn {
		background: var(--brand);
		color: white;
		border: none;
		font-weight: 600;
	}

	.action-btn:hover {
		background: var(--brand-hover);
		color: white;
		border-color: transparent;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px var(--brand-ring);
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
		z-index: 100;
	}

	.mobile-nav-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		color: var(--gray-500);
		font-size: 0.75rem;
		gap: 0.25rem;
		transition: all 0.2s ease;
		position: relative;
		border-radius: 12px;
		margin: 0.5rem 0.25rem;
	}

	.mobile-nav-btn:hover {
		color: var(--brand);
		background: var(--brand-tint-weak);
	}

	.mobile-nav-btn.active {
		color: var(--brand);
		background: var(--brand-tint);
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
		background: var(--brand);
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

	/* Central Action Button */
	.central-action {
		position: relative;
		margin: 0;
		background: var(--brand);
		color: white;
		border-radius: 50%;
		width: 56px;
		height: 56px;
		min-width: 56px;
		min-height: 56px;
		flex: 0 0 auto;
		bottom: 0.75rem;
		box-shadow: 0 4px 16px var(--brand-glow);
		border: none;
		padding: 0;
		transition: all 0.3s ease;
	}

	.central-action:hover {
		background: var(--brand-hover);
		transform: scale(1.05);
		box-shadow: 0 6px 20px var(--brand-glow-strong);
	}

	/* Draft in progress state */
	.central-action.has-draft {
		background: var(--accent);
		box-shadow: 0 4px 16px var(--accent-glow);
		animation: pulse-button 2s ease-in-out infinite;
	}

	.central-action.has-draft:hover {
		background: var(--accent-hover);
		box-shadow: 0 6px 20px var(--accent-glow-strong);
	}

	@keyframes pulse-button {
		0%, 100% {
			box-shadow: 0 4px 16px var(--accent-glow);
		}
		50% {
			box-shadow: 0 6px 24px var(--accent-glow-max);
		}
	}

	.central-action::before {
		display: none;
	}

	.action-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-icon svg {
		color: white;
	}

	.mobile-nav-placeholder {
		flex: 1;
		visibility: hidden;
	}

	/* Action Menu Overlay */
	.action-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
		z-index: 998;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.action-menu {
		position: fixed;
		bottom: 5rem;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		z-index: 999;
		width: calc(100% - 2rem);
		max-width: 400px;
		overflow: hidden;
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.action-menu-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border: none;
		background: white;
		width: 100%;
		text-align: left;
		transition: all 0.2s ease;
		border-bottom: 1px solid #f3f4f6;
		cursor: pointer;
	}

	.action-menu-item:last-child {
		border-bottom: none;
	}

	.action-menu-item:hover {
		background: #faf1f2;
	}

	.action-menu-item:active {
		background: #f3dee1;
	}

	/* Primary workflow: flat maroon block, colour weight carries the hierarchy */
	.action-menu-item.primary {
		background: var(--brand);
		border-bottom: none;
	}

	.action-menu-item.primary:hover {
		background: var(--brand-hover);
	}

	.action-menu-item.primary:active {
		background: var(--brand-active);
	}

	.action-menu-item.primary .action-menu-icon {
		background: rgba(255, 255, 255, 0.15);
	}

	.action-menu-item.primary .action-menu-icon svg {
		color: white;
	}

	.action-menu-item.primary .action-menu-title {
		color: white;
	}

	.action-menu-item.primary .action-menu-desc {
		color: rgba(255, 255, 255, 0.85);
	}

	.action-menu-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: #faf1f2;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.action-menu-icon svg {
		color: var(--brand);
		width: 24px;
		height: 24px;
	}

	.action-menu-content {
		flex: 1;
	}

	.action-menu-title {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.125rem;
	}

	.action-menu-desc {
		font-size: 0.8125rem;
		color: #6b7280;
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

	/* ---- Desktop sidebar (≥1024px) ---- */
	.sidebar {
		display: none;
	}

	@media (min-width: 1024px) {
		.app {
			--sidebar-w: 220px;
		}

		.app.sb-collapsed {
			--sidebar-w: 56px;
		}

		.header.desktop-only {
			display: none;
		}

		.sidebar {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: var(--sidebar-w);
			background: var(--white);
			border-right: 1px solid var(--gray-200);
			padding: 0.875rem 0.5rem;
			z-index: 100;
			overflow: hidden;
			transition: width 0.15s ease;
		}

		.main {
			margin-left: var(--sidebar-w);
			padding: 1rem 1.5rem;
			transition: margin-left 0.15s ease;
		}
	}

	.sb-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.625rem 0.75rem;
		color: var(--brand);
		white-space: nowrap;
	}

	.sb-brand-name {
		font-size: var(--text-base);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
	}

	.sb-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-bottom: 0.625rem;
	}

	.sb-group-label {
		font-size: 0.625rem;
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--gray-400);
		padding: 0.25rem 0.625rem;
		white-space: nowrap;
		min-height: 1.2rem;
	}

	.sb-item,
	.sb-primary,
	.sb-collapse,
	.sb-tank {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius-md);
		border: none;
		background: none;
		width: 100%;
		text-align: left;
		text-decoration: none;
		font-family: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-600);
		cursor: pointer;
		white-space: nowrap;
	}

	.sb-item svg,
	.sb-primary svg,
	.sb-tank svg,
	.sb-collapse svg {
		flex-shrink: 0;
	}

	.sb-item:hover {
		background: var(--gray-50);
		color: var(--gray-800);
	}

	.sb-item.active {
		background: var(--brand-tint-weak);
		color: var(--brand);
		box-shadow: inset 2px 0 0 var(--brand);
	}

	.sb-primary {
		background: var(--brand);
		color: #fff;
		font-weight: var(--font-weight-semibold);
		margin-bottom: 0.25rem;
	}

	.sb-primary:hover {
		background: var(--brand-hover);
	}

	.sb-draft-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--warning, #d97706);
		margin-left: auto;
		flex-shrink: 0;
	}

	.sb-spacer {
		flex: 1;
	}

	.sb-tank {
		background: var(--gray-50);
		font-size: var(--text-xs);
		color: var(--gray-600);
		font-variant-numeric: tabular-nums;
	}

	.sb-tank:hover {
		background: var(--gray-100);
	}

	.sb-collapse {
		color: var(--gray-400);
		font-size: var(--text-xs);
	}

	.sb-collapse:hover {
		color: var(--gray-600);
		background: var(--gray-50);
	}

	.sb-chevron {
		transition: transform 0.15s ease;
	}

	.app.sb-collapsed .sb-chevron {
		transform: rotate(180deg);
	}

	/* Collapsed rail: icons only, centred */
	.app.sb-collapsed .sb-label {
		display: none;
	}

	.app.sb-collapsed .sb-group-label {
		min-height: 0;
		padding: 0;
		border-top: 1px solid var(--gray-100);
		margin: 0.25rem 0.375rem;
	}

	.app.sb-collapsed .sb-item,
	.app.sb-collapsed .sb-primary,
	.app.sb-collapsed .sb-collapse,
	.app.sb-collapsed .sb-tank,
	.app.sb-collapsed .sb-brand {
		justify-content: center;
		padding-left: 0;
		padding-right: 0;
	}

	.app.sb-collapsed .sb-draft-dot {
		position: absolute;
		margin: 0;
		transform: translate(10px, -8px);
	}

	.app.sb-collapsed .sb-item {
		position: relative;
	}

</style>