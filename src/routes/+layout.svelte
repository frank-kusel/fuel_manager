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

	// Svelte 5 children prop
	let { children }: { children: any } = $props();

	// Safe pathname access
	const pathname = $derived($page?.url?.pathname || '/');

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
	function handleAction(action: 'fuel' | 'dipstick' | 'refill') {
		closeActionMenu();

		if (action === 'fuel') {
			showFuelEntryModal = true;
		} else if (action === 'dipstick') {
			showDipstickModal = true;
		} else if (action === 'refill') {
			showRefillModal = true;
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
				href="/summary"
				class="nav-btn"
				class:active={pathname === '/summary' || pathname === '/'}
			>
				Summary
			</a>
			<a
				href="/dashboard"
				class="nav-btn"
				class:active={pathname === '/dashboard'}
			>
				Dashboard
			</a>
			<a
				href="/reports"
				class="nav-btn"
				class:active={pathname.startsWith('/reports')}
			>
				Reports
			</a>
			<a
				href="/menu"
				class="nav-btn"
				class:active={pathname.startsWith('/menu') || pathname.startsWith('/tools')}
			>
				Menu
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

		<!-- Central Action Button -->
		<button class="mobile-nav-btn central-action" class:has-draft={$hasDraft} onclick={toggleActionMenu}>
			<div class="action-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			</div>
		</button>

		<a
			href="/reports"
			class="mobile-nav-btn"
			class:active={pathname.startsWith('/reports')}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
			<span class="nav-label">Reports</span>
		</a>

		<a
			href="/menu"
			class="mobile-nav-btn"
			class:active={pathname.startsWith('/menu') || pathname.startsWith('/tools')}
		>
			<svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
			<span class="nav-label">Menu</span>
		</a>
	</nav>

	<!-- Action Menu Overlay -->
	{#if showActionMenu}
		<div class="action-overlay" onclick={closeActionMenu}></div>
		<div class="action-menu">
			<button class="action-menu-item" onclick={() => handleAction('fuel')}>
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

	.action-btn {
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
		border: none;
		font-weight: 600;
	}

	.action-btn:hover {
		background: linear-gradient(135deg, #ea580c, #dc2626);
		color: white;
		border-color: transparent;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
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

	/* Central Action Button */
	.central-action {
		position: relative;
		margin: 0;
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
		border-radius: 50%;
		width: 56px;
		height: 56px;
		min-width: 56px;
		min-height: 56px;
		flex: 0 0 auto;
		bottom: 0.75rem;
		box-shadow: 0 4px 16px rgba(249, 115, 22, 0.4);
		border: none;
		padding: 0;
		transition: all 0.3s ease;
	}

	.central-action:hover {
		background: linear-gradient(135deg, #ea580c, #dc2626);
		transform: scale(1.05);
		box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
	}

	/* Draft in progress state */
	.central-action.has-draft {
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
		animation: pulse-button 2s ease-in-out infinite;
	}

	.central-action.has-draft:hover {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
	}

	@keyframes pulse-button {
		0%, 100% {
			box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
		}
		50% {
			box-shadow: 0 6px 24px rgba(59, 130, 246, 0.6);
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
		background: #fef3f2;
	}

	.action-menu-item:active {
		background: #fee2e2;
	}

	.action-menu-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: linear-gradient(135deg, #fff7ed, #ffedd5);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.action-menu-icon svg {
		color: #f97316;
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

</style>