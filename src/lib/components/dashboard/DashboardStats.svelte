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

<div class="dashboard-overview">
	<!-- Primary Metrics Row -->
	<div class="primary-metrics">
		<!-- Today's Fuel Consumption -->
		<div class="metric-card primary">
			<div class="metric-content">
				<div class="metric-label">Today's Fuel</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatDecimal(stats?.dailyFuel || 0)}<span class="unit">L</span></div>
				{/if}
			</div>
		</div>

		<!-- Tank Status -->
		<div class="metric-card tank-status">
			<div class="metric-content">
				<div class="metric-label">Fuel Tank</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatNumber(stats?.tankLevel || 0)}<span class="unit">L</span></div>
					<div class="tank-visual">
						<div class="tank-indicator {getTankLevelClass(stats?.tankPercentage || 0)}">
							<div class="tank-level" style="height: {Math.min(stats?.tankPercentage || 0, 100)}%"></div>
						</div>
						<div class="tank-info">{formatDecimal(stats?.tankPercentage || 0)}%</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Secondary Metrics Grid -->
	<div class="secondary-metrics">
		<!-- Weekly Summary -->
		<div class="metric-card compact">
			<div class="compact-header">This Week</div>
			{#if loading}
				<div class="compact-skeleton"></div>
			{:else}
				<div class="compact-value">{formatDecimal(stats?.weeklyFuel || 0)}L</div>
				<div class="compact-subtitle">{stats?.entriesThisWeek || 0} entries</div>
			{/if}
		</div>

		<!-- Monthly Summary -->
		<div class="metric-card compact">
			<div class="compact-header">This Month</div>
			{#if loading}
				<div class="compact-skeleton"></div>
			{:else}
				<div class="compact-value">{formatDecimal(stats?.monthlyFuel || 0)}L</div>
				<div class="compact-subtitle">{formatNumber(stats?.monthlyDistance || 0)} km</div>
			{/if}
		</div>

		<!-- Fleet Efficiency -->
		<div class="metric-card compact">
			<div class="compact-header">Fleet Average</div>
			{#if loading}
				<div class="compact-skeleton"></div>
			{:else}
				<div class="compact-value">{formatDecimal(stats?.averageEfficiency || 0)}</div>
				<div class="compact-subtitle">L/100km</div>
			{/if}
		</div>

		<!-- Bowser Reading -->
		<div class="metric-card compact">
			<div class="compact-header">Bowser Reading</div>
			{#if loading}
				<div class="compact-skeleton"></div>
			{:else}
				<div class="compact-value">{formatDecimal(stats?.bowserReading || 0)}</div>
				<div class="compact-subtitle">litres</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.dashboard-overview {
		width: 100%;
		margin-bottom: 2rem;
	}

	/* Primary Metrics - Large Hero Cards */
	.primary-metrics {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.metric-card.primary {
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		color: white;
		border-radius: 16px;
		padding: 2rem;
		box-shadow: 0 8px 32px rgba(249, 115, 22, 0.3);
		transition: all 0.3s ease;
	}

	.metric-card.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px rgba(249, 115, 22, 0.4);
	}

	.metric-card.tank-status {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		transition: all 0.3s ease;
	}

	.metric-card.tank-status:hover {
		border-color: #f97316;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}

	.metric-label {
		font-size: 0.875rem;
		font-weight: 500;
		opacity: 0.9;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: 3rem;
		font-weight: 700;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.primary .metric-value {
		color: white;
	}

	.tank-status .metric-value {
		color: #111827;
	}

	.unit {
		font-size: 1.5rem;
		font-weight: 500;
		opacity: 0.8;
		margin-left: 0.25rem;
	}

	/* Tank Visual Indicator */
	.tank-visual {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.tank-indicator {
		width: 24px;
		height: 60px;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		position: relative;
		background: #f9fafb;
		overflow: hidden;
	}

	.tank-level {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		border-radius: 3px;
		transition: height 0.5s ease;
	}

	.tank-indicator.high .tank-level {
		background: linear-gradient(180deg, #22c55e, #16a34a);
	}

	.tank-indicator.medium .tank-level {
		background: linear-gradient(180deg, #f59e0b, #d97706);
	}

	.tank-indicator.low .tank-level {
		background: linear-gradient(180deg, #ef4444, #dc2626);
	}

	.tank-info {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	/* Secondary Metrics - Compact Cards */
	.secondary-metrics {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.metric-card.compact {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 12px;
		padding: 1.25rem;
		text-align: center;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.metric-card.compact:hover {
		border-color: #f97316;
		box-shadow: 0 4px 16px rgba(249, 115, 22, 0.1);
		transform: translateY(-1px);
	}

	.compact-header {
		font-size: 0.75rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.compact-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.compact-subtitle {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	/* Loading States */
	.metric-skeleton {
		height: 3rem;
		background: linear-gradient(90deg, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 8px;
		margin-bottom: 0.25rem;
	}

	.compact-skeleton {
		height: 1.5rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 6px;
		margin-bottom: 0.25rem;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Mobile Responsiveness */
	@media (max-width: 1024px) {
		.secondary-metrics {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.primary-metrics {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.metric-card.primary {
			padding: 1.5rem;
		}

		.metric-value {
			font-size: 2.5rem;
		}

		.secondary-metrics {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.metric-card.compact {
			padding: 1rem;
		}

		.compact-value {
			font-size: 1.25rem;
		}
	}

</style>