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
	
</script>

<div class="dashboard-overview">

	<!-- Secondary Metrics Grid -->
	<div class="secondary-metrics">
		<!-- Weekly Summary -->
		<div class="metric-card compact">
			<div class="compact-header">Past 7 Days</div>
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

		<!-- Previous Month -->
		<div class="metric-card compact">
			<div class="compact-header">Previous Month</div>
			{#if loading}
				<div class="compact-skeleton"></div>
			{:else}
				<div class="compact-value">{formatDecimal(stats?.previousMonthFuel || 0)}L</div>
				<div class="compact-subtitle">fuel used</div>
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



	/* Secondary Metrics - Compact Cards */
	.secondary-metrics {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.metric-card.compact {
		border-radius: 12px;
		padding: 1em;
		text-align: left;
		background: var(--gray-50);
		border: 1px solid transparent;
		transition: all 0.2s ease;
	}

	.metric-card.compact:hover {
		border-color: #f97316;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.compact-header {
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: 0.025em;
		color: var(--gray-500);
	}

	.compact-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.compact-subtitle {
		font-size: 1rem;
		color: var(--gray-400);
		font-weight: 600;
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
		.secondary-metrics {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.metric-card.compact {
			padding: 0.875rem;
			background: var(--primary-light);
			border-radius: 10px;
		}

		.compact-header {
			font-size: 0.875rem;
			margin-bottom: 0.5rem;
		}

		.compact-value {
			font-size: 1.75rem;
			margin-bottom: 0.375rem;
		}

		.compact-subtitle {
			font-size: 0.875rem;
		}
	}

	@media (max-width: 480px) {
		.secondary-metrics {
			gap: 0.5rem;
		}

		.metric-card.compact {
			padding: 0.75rem;
		}

		.compact-header {
			font-size: 0.8rem;
		}

		.compact-value {
			font-size: 1.5rem;
		}

		.compact-subtitle {
			font-size: 0.8rem;
		}
	}

</style>