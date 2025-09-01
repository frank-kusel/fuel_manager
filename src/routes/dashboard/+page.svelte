<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardStats from '$lib/components/dashboard/DashboardStats.svelte';
	import RecentActivity from '$lib/components/dashboard/RecentActivity.svelte';
	import TankManagement from '$lib/components/dashboard/TankManagement.svelte';
	import TankStatus from '$lib/components/dashboard/TankStatus.svelte';
	import FuelChart from '$lib/components/dashboard/FuelChart.svelte';
	import DataExport from '$lib/components/dashboard/DataExport.svelte';
	import VehicleHistory from '$lib/components/dashboard/VehicleHistory.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import dashboardStore, { 
		dashboardStats, 
		dashboardLoading, 
		dashboardError 
	} from '$lib/stores/dashboard';

	// Load dashboard data on mount
	onMount(async () => {
		await dashboardStore.loadDashboardData();
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

	<!-- Tank Status -->
	<TankStatus />

	<!-- Fuel Usage Chart -->
	<FuelChart />

	<!-- Main Dashboard Content -->
	<div class="dashboard-content">
		<!-- Recent Activity Feed -->
		<div class="dashboard-section activity-section">
			<RecentActivity 
				entries={$dashboardStats?.recentEntries || []} 
				loading={$dashboardLoading === 'loading'} 
			/>
		</div>
	</div>

	<!-- Tank Management -->
	<TankManagement />

	<!-- Data Export -->
	<DataExport />

	<!-- Vehicle History -->
	<VehicleHistory />

</div>

<style>
	.dashboard-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-content h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
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

	/* Dashboard Content */
	.dashboard-content {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.dashboard-section {
		min-height: 400px;
	}


	/* Mobile Responsiveness */

	@media (max-width: 768px) {
		.dashboard-page {
			padding: 0;
			gap: 0.5rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem;
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

		.dashboard-content {
			padding: 0;
		}


		.error-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}

</style>