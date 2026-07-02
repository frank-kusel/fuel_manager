<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';

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

	// Count today's entries
	let todaysEntries = $derived.by(() => {
		if (!stats?.recentEntries) return 0;
		const today = new Date().toISOString().split('T')[0];
		return stats.recentEntries.filter((entry: any) => {
			return entry.entry_date === today;
		}).length;
	});

	// Calculate today's fuel usage
	let todaysFuel = $derived.by(() => {
		if (!stats?.recentEntries) return 0;
		const today = new Date().toISOString().split('T')[0];
		return stats.recentEntries
			.filter((entry: any) => entry.entry_date === today)
			.reduce((sum: number, entry: any) => sum + (entry.litres_dispensed || 0), 0);
	});

	// Get today's activities and fields
	let todaysActivities = $derived.by(() => {
		if (!stats?.recentEntries) return [];
		const today = new Date().toISOString().split('T')[0];
		const todayEntries = stats.recentEntries.filter((entry: any) => entry.entry_date === today);

		// Create unique activity-field combinations
		const activities = new Map<string, Set<string>>();

		todayEntries.forEach((entry: any) => {
			const activityName = entry.activities?.name || entry.activities?.code || 'Unknown';

			// Get field names from various sources
			let fieldNames: string[] = [];

			// Check for multiple fields via fuel_entry_fields junction table
			if (entry.fuel_entry_fields && entry.fuel_entry_fields.length > 0) {
				fieldNames = entry.fuel_entry_fields.map((fef: any) => fef.fields?.name).filter(Boolean);
			}
			// Check for single field (legacy)
			else if (entry.fields?.name) {
				fieldNames = [entry.fields.name];
			}
			// Check for zone
			else if (entry.zones?.name) {
				fieldNames = [entry.zones.name];
			}

			// Default to 'No location' if no fields found
			if (fieldNames.length === 0) {
				fieldNames = ['No location'];
			}

			if (!activities.has(activityName)) {
				activities.set(activityName, new Set());
			}

			// Add all field names for this activity
			fieldNames.forEach(fieldName => {
				activities.get(activityName)?.add(fieldName);
			});
		});

		return Array.from(activities.entries()).map(([activity, fields]) => ({
			activity,
			fields: Array.from(fields)
		}));
	});

</script>

<div class="dashboard-overview">
	<!-- Key Metrics Grid -->
	<div class="key-metrics">
		<!-- Today's Fuel Usage (primary) -->
		<div class="metric-card metric-primary">
			<div class="metric-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s5.5 5.9 5.5 10.5a5.5 5.5 0 0 1-11 0C6.5 8.9 12 3 12 3Z"/></svg>
			</div>
			<div class="metric-body">
				<div class="metric-header">Today's Fuel</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatDecimal(todaysFuel)}<span class="metric-unit">L</span></div>
					<div class="metric-subtitle">{todaysEntries} {todaysEntries === 1 ? 'entry' : 'entries'} logged</div>
				{/if}
			</div>
		</div>

		<!-- Tank Level -->
		<div class="metric-card">
			<div class="metric-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M5 13h14"/></svg>
			</div>
			<div class="metric-body">
				<div class="metric-header">Tank Level</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatDecimal(stats?.tankLevel || 0)}<span class="metric-unit">L</span></div>
					<div class="metric-subtitle">Last dip {formatDecimal(stats?.lastDipReading || 0)} L</div>
				{/if}
			</div>
		</div>

		<!-- Today's Activities -->
		<div class="metric-card activity-card">
			<div class="metric-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/></svg>
			</div>
			<div class="metric-body">
				<div class="metric-header">Today's Activities</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else if todaysActivities.length === 0}
					<div class="no-activities">No entries today</div>
				{:else}
					<div class="compact-list">
						{#each todaysActivities as { activity, fields }, i}
							{#each fields as field, j}
								<span class="compact-item">{field}-{activity}{i < todaysActivities.length - 1 || j < fields.length - 1 ? ', ' : ''}</span>
							{/each}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard-overview {
		width: 100%;
		margin-bottom: 1.25rem;
	}

	/* Key Metrics Grid */
	.key-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr 2fr;
		gap: 0.875rem;
	}

	.metric-card {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		border-radius: var(--radius-lg);
		padding: 1.125rem;
		background: var(--white);
		border: 1px solid var(--gray-200);
		box-shadow: var(--shadow-sm);
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.metric-card:hover {
		border-color: var(--gray-300);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	/* Primary (featured) metric */
	.metric-primary {
		background: #faf1f2;
		border-color: #e9ccd0;
	}

	.metric-icon {
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: var(--gray-100);
		color: var(--gray-500);
	}

	.metric-icon svg {
		width: 1.375rem;
		height: 1.375rem;
	}

	.metric-primary .metric-icon {
		background: var(--brand);
		color: #fff;
		box-shadow: 0 2px 8px var(--brand-glow);
	}

	.metric-body {
		flex: 1;
		min-width: 0;
	}

	.metric-header {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--gray-500);
		margin-bottom: 0.375rem;
	}

	.metric-value {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		font-size: 1.75rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	.metric-primary .metric-value {
		color: var(--brand-hover);
	}

	.metric-unit {
		font-size: 0.9rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-400);
	}

	.metric-subtitle {
		margin-top: 0.375rem;
		font-size: var(--text-sm);
		color: var(--gray-500);
		font-weight: 500;
	}

	.metric-skeleton {
		height: 1.75rem;
		width: 60%;
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: var(--radius-sm);
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.no-activities {
		font-size: var(--text-sm);
		color: var(--gray-400);
		font-style: italic;
		padding: 0.25rem 0;
	}

	.compact-list {
		font-size: var(--text-sm);
		color: var(--gray-700);
		line-height: 1.6;
	}

	.compact-item {
		white-space: nowrap;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.key-metrics {
			grid-template-columns: 1fr 1fr;
		}

		.activity-card {
			grid-column: span 2;
		}
	}

	@media (max-width: 768px) {
		.key-metrics {
			grid-template-columns: 1fr 1fr;
			gap: 0.625rem;
		}

		.activity-card {
			grid-column: span 2;
		}

		.metric-card {
			padding: 0.875rem;
			gap: 0.625rem;
		}

		.metric-icon {
			width: 2.25rem;
			height: 2.25rem;
		}

		.metric-header {
			font-size: 0.6875rem;
			margin-bottom: 0.375rem;
		}

		.metric-value {
			font-size: 1.5rem;
		}
	}

	@media (max-width: 480px) {
		.key-metrics {
			gap: 0.5rem;
		}

		.metric-card {
			padding: 0.75rem;
		}

		.metric-icon {
			width: 2rem;
			height: 2rem;
		}

		.metric-icon svg {
			width: 1.125rem;
			height: 1.125rem;
		}

		.metric-header {
			font-size: 0.625rem;
		}

		.metric-value {
			font-size: 1.35rem;
		}
	}
</style>
