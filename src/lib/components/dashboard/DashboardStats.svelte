<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { onMount } from 'svelte';
	
	interface Props {
		stats: any | null;
		loading?: boolean;
	}
	
	let { stats, loading = false }: Props = $props();
	
	function formatNumber(num: number): string {
		return new Intl.NumberFormat('en-ZA').format(num);
	}
	
	function formatDecimal(num: number, decimals: number = 1): string {
		return num.toFixed(decimals);
	}
	
	function getTankLevelClass(percentage: number): string {
		if (percentage > 75) return 'high';
		if (percentage > 25) return 'medium';
		return 'low';
	}
</script>

<div class="dashboard-stats">
	<div class="stats-grid">
		<!-- Today's Fuel -->
		<div class="stat-card">
			<div class="stat-header">Today's Fuel</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.dailyFuel || 0)}L</div>
			{/if}
		</div>

		<!-- This Week -->
		<div class="stat-card">
			<div class="stat-header">This Week</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.weeklyFuel || 0)}L</div>
			{/if}
		</div>

		<!-- This Month -->
		<div class="stat-card">
			<div class="stat-header">This Month</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.monthlyFuel || 0)}L</div>
				<div class="stat-subtitle">{formatNumber(stats?.monthlyDistance || 0)} km</div>
			{/if}
		</div>

		<!-- Tank Level -->
		<div class="stat-card">
			<div class="stat-header">Tank Level</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.tankPercentage || 0)}%</div>
				<div class="stat-subtitle">{formatDecimal(stats?.tankLevel || 0)}L / {formatNumber(stats?.tankCapacity || 0)}L</div>
				<div class="tank-bar">
					<div 
						class="tank-fill {getTankLevelClass(stats?.tankPercentage || 0)}" 
						style="width: {Math.min(stats?.tankPercentage || 0, 100)}%"
					></div>
				</div>
			{/if}
		</div>

		<!-- Fleet Status -->
		<div class="stat-card">
			<div class="stat-header">Active Vehicles</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{stats?.activeVehicles || 0}</div>
				<div class="stat-subtitle">{stats?.vehiclesWithOdometer || 0} with odometer data</div>
			{/if}
		</div>

		<!-- Fuel Efficiency -->
		<div class="stat-card">
			<div class="stat-header">Fuel Efficiency</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.averageEfficiency || 0)}</div>
				<div class="stat-subtitle">L/100km fleet average</div>
			{/if}
		</div>

		<!-- Weekly Activity -->
		<div class="stat-card">
			<div class="stat-header">Weekly Activity</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{stats?.entriesThisWeek || 0}</div>
				<div class="stat-subtitle">{stats?.entriesThisMonth || 0} this month</div>
			{/if}
		</div>

		<!-- Daily Average -->
		<div class="stat-card">
			<div class="stat-header">Daily Average</div>
			{#if loading}
				<div class="loading-skeleton"></div>
			{:else}
				<div class="stat-value">{formatDecimal(stats?.avgDailyUsage || 0)}L</div>
				<div class="stat-subtitle">Per day this month</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.dashboard-stats {
		width: 100%;
		margin-bottom: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		transition: all 0.2s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.stat-card:hover {
		border-color: #d1d5db;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.stat-header {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.stat-value {
		font-size: 2.25rem;
		font-weight: 600;
		color: #111827;
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.stat-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 400;
	}

	/* Tank level specific styles */
	.tank-bar {
		width: 100%;
		height: 6px;
		background: #f3f4f6;
		border-radius: 3px;
		overflow: hidden;
		margin-top: 0.75rem;
	}

	.tank-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.tank-fill.high {
		background: #059669;
	}

	.tank-fill.medium {
		background: #f59e0b;
	}

	.tank-fill.low {
		background: #dc2626;
	}

	/* Loading skeleton */
	.loading-skeleton {
		height: 2.25rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 6px;
		margin-bottom: 0.5rem;
	}

	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.stat-card {
			padding: 1rem;
		}

		.stat-header {
			font-size: 0.75rem;
			margin-bottom: 0.5rem;
		}

		.stat-value {
			font-size: 1.75rem;
		}

		.stat-subtitle {
			font-size: 0.8rem;
		}
	}
</style>