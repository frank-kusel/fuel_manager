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

	// Get today and yesterday's activities and fields
	let todaysActivities = $derived.by(() => {
		if (!stats?.recentEntries) return [];
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);

		const todayStr = today.toISOString().split('T')[0];
		const yesterdayStr = yesterday.toISOString().split('T')[0];

		const todayEntries = stats.recentEntries.filter((entry: any) =>
			entry.entry_date === todayStr || entry.entry_date === yesterdayStr
		);

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
		<!-- Today's Fuel Usage -->
		<div class="metric-card">
			<div class="metric-content">
				<div class="metric-header">Today's Fuel</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatDecimal(todaysFuel)} L</div>
					<div class="metric-subtitle">{todaysEntries} {todaysEntries === 1 ? 'entry' : 'entries'}</div>
				{/if}
			</div>
		</div>

		<!-- Tank Level -->
		<div class="metric-card">
			<div class="metric-content">
				<div class="metric-header">Tank Level</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else}
					<div class="metric-value">{formatDecimal(stats?.tankLevel || 0)} L</div>
					<div class="metric-subtitle">Last dip: {formatDecimal(stats?.lastDipReading || 0)} L</div>
				{/if}
			</div>
		</div>

		<!-- Today & Yesterday's Activities -->
		<div class="metric-card activity-card">
			<div class="metric-content">
				<div class="metric-header">Today & Yesterday</div>
				{#if loading}
					<div class="metric-skeleton"></div>
				{:else if todaysActivities.length === 0}
					<div class="no-activities">No entries</div>
				{:else}
					<div class="activity-chips">
						{#each todaysActivities as { activity, fields }}
							{#each fields as field}
								<div class="activity-chip">
									<span class="chip-field">{field}</span>
									<span class="chip-separator">•</span>
									<span class="chip-activity">{activity}</span>
								</div>
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
		margin-bottom: 1.5rem;
	}

	/* Key Metrics Grid */
	.key-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr 2fr;
		gap: 1rem;
	}

	.metric-card {
		border-radius: 8px;
		padding: 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		transition: all 0.2s ease;
	}

	.metric-card:hover {
		border-color: #d1d5db;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.metric-content {
		width: 100%;
	}

	.metric-header {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.metric-subtitle {
		font-size: 0.8125rem;
		color: #9ca3af;
		font-weight: 500;
	}

	.metric-skeleton {
		height: 1.75rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
		margin-bottom: 0.25rem;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Activity Card */
	.activity-card {
		grid-column: span 1;
	}

	.no-activities {
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
		padding: 0.5rem 0;
	}

	/* Activity Chips - Modern Card Design */
	.activity-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.activity-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.75rem;
		transition: all 0.2s ease;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.activity-chip:hover {
		border-color: #d1d5db;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.chip-field {
		font-weight: 600;
		color: #1f2937;
		font-size: 0.75rem;
	}

	.chip-separator {
		color: #9ca3af;
		font-weight: 400;
		font-size: 0.875rem;
	}

	.chip-activity {
		color: #6b7280;
		font-weight: 500;
		font-size: 0.75rem;
	}

	/* Mobile Responsiveness */
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
			gap: 0.75rem;
		}

		.activity-card {
			grid-column: span 2;
		}

		.metric-card {
			padding: 0.875rem;
		}

		.metric-header {
			font-size: 0.6875rem;
			margin-bottom: 0.375rem;
		}

		.metric-value {
			font-size: 1.5rem;
		}

		.metric-subtitle {
			font-size: 0.75rem;
		}

		.activity-chips {
			gap: 0.375rem;
		}

		.activity-chip {
			padding: 0.3125rem 0.5rem;
			font-size: 0.6875rem;
		}

		.chip-field,
		.chip-activity {
			font-size: 0.6875rem;
		}

		.chip-separator {
			font-size: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.key-metrics {
			gap: 0.5rem;
		}

		.metric-card {
			padding: 0.75rem;
		}

		.metric-header {
			font-size: 0.625rem;
		}

		.metric-value {
			font-size: 1.25rem;
		}

		.metric-subtitle {
			font-size: 0.6875rem;
		}

		.activity-chips {
			gap: 0.25rem;
		}

		.activity-chip {
			padding: 0.25rem 0.4375rem;
			font-size: 0.625rem;
		}

		.chip-field,
		.chip-activity {
			font-size: 0.625rem;
		}

		.chip-separator {
			font-size: 0.6875rem;
		}
	}
</style>
