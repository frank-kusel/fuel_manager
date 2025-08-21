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
		<!-- Fuel Usage Today -->
		<Card class="stat-card fuel-daily">
			<div class="stat-content">
				<div class="stat-icon">⛽</div>
				<div class="stat-info">
					<h3>Today's Fuel</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{formatDecimal(stats?.dailyFuel || 0)}L</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Weekly Fuel Usage -->
		<Card class="stat-card fuel-weekly">
			<div class="stat-content">
				<div class="stat-icon">📊</div>
				<div class="stat-info">
					<h3>This Week</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{formatDecimal(stats?.weeklyFuel || 0)}L</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Monthly Fuel Usage -->
		<Card class="stat-card fuel-monthly">
			<div class="stat-content">
				<div class="stat-icon">📈</div>
				<div class="stat-info">
					<h3>This Month</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{formatDecimal(stats?.monthlyFuel || 0)}L</div>
						<div class="stat-subtitle">{formatNumber(stats?.monthlyDistance || 0)} km</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Tank Level -->
		<Card class="stat-card tank-level">
			<div class="stat-content">
				<div class="stat-icon">🪣</div>
				<div class="stat-info">
					<h3>Tank Level</h3>
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
			</div>
		</Card>

		<!-- Fleet Status -->
		<Card class="stat-card fleet-status">
			<div class="stat-content">
				<div class="stat-icon">🚜</div>
				<div class="stat-info">
					<h3>Fleet Status</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{stats?.activeVehicles || 0}</div>
						<div class="stat-subtitle">Active Vehicles</div>
						<div class="fleet-detail">
							{stats?.vehiclesWithOdometer || 0} with odometer data
						</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Average Efficiency -->
		<Card class="stat-card efficiency">
			<div class="stat-content">
				<div class="stat-icon">⚡</div>
				<div class="stat-info">
					<h3>Fuel Efficiency</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{formatDecimal(stats?.averageEfficiency || 0)}</div>
						<div class="stat-subtitle">
							L/100km fleet average
							{#if stats?.consumptionDataQuality}
								<span class="data-quality {stats.consumptionDataQuality >= 70 ? 'good' : stats.consumptionDataQuality >= 40 ? 'fair' : 'poor'}">
									({stats.consumptionDataQuality}% reliable)
								</span>
							{/if}
						</div>
						{#if stats?.validConsumptionEntries}
							<div class="efficiency-detail">
								{stats.validConsumptionEntries} entries this month
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</Card>

		<!-- Activity Summary -->
		<Card class="stat-card activity-summary">
			<div class="stat-content">
				<div class="stat-icon">📋</div>
				<div class="stat-info">
					<h3>Activity</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{stats?.entriesThisWeek || 0}</div>
						<div class="stat-subtitle">Entries this week</div>
						<div class="activity-detail">
							{stats?.entriesThisMonth || 0} this month
						</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Daily Average -->
		<Card class="stat-card daily-average">
			<div class="stat-content">
				<div class="stat-icon">📊</div>
				<div class="stat-info">
					<h3>Daily Average</h3>
					{#if loading}
						<div class="loading-skeleton"></div>
					{:else}
						<div class="stat-value">{formatDecimal(stats?.avgDailyUsage || 0)}L</div>
						<div class="stat-subtitle">Per day this month</div>
					{/if}
				</div>
			</div>
		</Card>
	</div>
</div>

<style>
	.dashboard-stats {
		width: 100%;
		margin-bottom: 1rem;
		padding: 0 0.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	:global(.stat-card) {
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		height: 100%;
	}

	:global(.stat-card:hover) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.stat-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.25rem;
	}

	.stat-icon {
		font-size: 2rem;
		flex-shrink: 0;
		opacity: 0.8;
	}

	.stat-info {
		flex: 1;
		min-width: 0;
	}

	.stat-info h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin: 0 0 0.25rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.2;
		margin-bottom: 0.25rem;
	}

	.stat-subtitle {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.5rem;
	}

	.fleet-detail,
	.activity-detail,
	.efficiency-detail,
	.efficiency-spread {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
	
	.data-quality {
		display: block;
		font-size: 0.65rem;
		margin-top: 0.125rem;
		font-weight: 500;
	}
	
	.data-quality.good {
		color: var(--color-success);
	}
	
	.data-quality.fair {
		color: var(--color-warning);
	}
	
	.data-quality.poor {
		color: var(--color-error);
	}
	
	.efficiency-best {
		color: var(--color-success) !important;
	}

	/* Tank level specific styles */
	.tank-bar {
		width: 100%;
		height: 4px;
		background: var(--color-background-secondary);
		border-radius: 2px;
		overflow: hidden;
		margin-top: 0.5rem;
	}

	.tank-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.tank-fill.high {
		background: var(--color-success);
	}

	.tank-fill.medium {
		background: var(--color-warning);
	}

	.tank-fill.low {
		background: var(--color-error);
	}

	/* Loading skeleton */
	.loading-skeleton {
		height: 2rem;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
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

	/* Card color themes */
	:global(.fuel-daily .stat-icon) { color: #3b82f6; }
	:global(.fuel-weekly .stat-icon) { color: #8b5cf6; }
	:global(.fuel-monthly .stat-icon) { color: #06b6d4; }
	:global(.tank-level .stat-icon) { color: #f59e0b; }
	:global(.fleet-status .stat-icon) { color: #10b981; }
	:global(.efficiency .stat-icon) { color: #ef4444; }
	:global(.activity-summary .stat-icon) { color: #6366f1; }
	:global(.daily-average .stat-icon) { color: #8b5cf6; }

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.dashboard-stats {
			padding: 0;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.stat-content {
			gap: 0.5rem;
			padding: 0.125rem;
			flex-direction: column;
			text-align: center;
		}

		.stat-icon {
			font-size: 1.25rem;
		}

		.stat-value {
			font-size: 1.25rem;
		}

		.stat-info h3 {
			font-size: 0.75rem;
		}

		.stat-subtitle {
			font-size: 0.7rem;
		}
	}
</style>