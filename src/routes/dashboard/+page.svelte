<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import DashboardStats from '$lib/components/dashboard/DashboardStats.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
	import TankMonitoring from '$lib/components/dashboard/TankMonitoring.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import dashboardStore, { 
		dashboardStats, 
		dashboardLoading, 
		dashboardError 
	} from '$lib/stores/dashboard';

	let refreshInterval: number | null = null;

	// Load dashboard data on mount
	onMount(async () => {
		await dashboardStore.loadDashboardData();
		
		// Set up auto-refresh every 5 minutes
		refreshInterval = window.setInterval(async () => {
			await dashboardStore.loadDashboardData();
		}, 5 * 60 * 1000);
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	async function handleRefresh() {
		await dashboardStore.loadDashboardData();
	}
</script>

<svelte:head>
	<title>Dashboard - FarmTrack</title>
	<meta name="description" content="FarmTrack dashboard with fuel consumption analytics, vehicle performance metrics, and tank monitoring" />
</svelte:head>

<div class="dashboard-page">
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Dashboard</h1>
			<p class="dashboard-subtitle">Farm operations overview and analytics</p>
		</div>
		<div class="header-actions">
			<Button variant="outline" onclick={handleRefresh} disabled={$dashboardLoading === 'loading'}>
				{$dashboardLoading === 'loading' ? 'Refreshing...' : 'Refresh'}
			</Button>
		</div>
	</div>

	{#if $dashboardError}
		<div class="error-banner">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<div>
					<p>Failed to load dashboard data</p>
					<small>{$dashboardError}</small>
				</div>
				<Button variant="outline" size="sm" onclick={handleRefresh}>
					Retry
				</Button>
			</div>
		</div>
	{/if}

	<!-- Key Statistics Overview -->
	<DashboardStats 
		stats={$dashboardStats} 
		loading={$dashboardLoading === 'loading'} 
	/>

	<!-- Main Dashboard Content -->
	<div class="dashboard-grid">
		<!-- Recent Activity Feed -->
		<div class="dashboard-section activity-section">
			<RecentActivity 
				entries={$dashboardStats?.recentEntries || []} 
				loading={$dashboardLoading === 'loading'} 
			/>
		</div>

		<!-- Tank Level Monitoring -->
		<div class="dashboard-section tanks-section">
			<TankMonitoring 
				bowsers={$dashboardStats?.bowserLevels || []} 
				loading={$dashboardLoading === 'loading'} 
			/>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="quick-actions">
		<h3>Quick Actions</h3>
		<div class="actions-grid">
			<Button href="/fuel" variant="primary" class="action-button">
				<span class="action-icon">⛽</span>
				Add Fuel Entry
			</Button>
			<Button href="/fleet/vehicles" variant="outline" class="action-button">
				<span class="action-icon">🚜</span>
				Manage Vehicles
			</Button>
			<Button href="/fleet/drivers" variant="outline" class="action-button">
				<span class="action-icon">👤</span>
				Manage Drivers
			</Button>
			<Button href="/fleet/bowsers" variant="outline" class="action-button">
				<span class="action-icon">🪣</span>
				Tank Management
			</Button>
		</div>
	</div>
</div>

<style>
	.dashboard-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.header-content h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.dashboard-subtitle {
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	/* Error Banner */
	.error-banner {
		background: var(--color-error-50);
		border: 1px solid var(--color-error-200);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-content > div {
		flex: 1;
	}

	.error-content p {
		font-weight: 600;
		color: var(--color-error-700);
		margin: 0 0 0.25rem 0;
	}

	.error-content small {
		color: var(--color-error-600);
		font-size: 0.875rem;
	}

	/* Dashboard Grid */
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.dashboard-section {
		min-height: 400px;
	}

	/* Quick Actions */
	.quick-actions {
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.quick-actions h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	:global(.action-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		text-decoration: none !important;
	}

	:global(.action-button:hover) {
		transform: translateY(-1px);
	}

	.action-icon {
		font-size: 1.125rem;
	}

	/* Mobile Responsiveness */
	@media (max-width: 640px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	@media (max-width: 768px) {
		.dashboard-page {
			padding: 0;
			gap: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0 0.5rem;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}

		.dashboard-subtitle {
			font-size: 0.9rem;
		}

		.dashboard-grid {
			padding: 0 0.5rem;
		}

		.actions-grid {
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 0.5rem;
		}

		:global(.action-button) {
			padding: 0.5rem 0.75rem;
			font-size: 0.875rem;
		}

		.error-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.actions-grid {
			grid-template-columns: 1fr;
		}
	}
</style>