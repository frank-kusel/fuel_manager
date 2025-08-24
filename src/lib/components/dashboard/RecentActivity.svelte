<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface Props {
		entries: any[];
		loading?: boolean;
	}
	
	let { entries, loading = false }: Props = $props();
	
	// Group entries by date
	function groupEntriesByDate(entries: any[]) {
		const groups: Record<string, any[]> = {};
		
		entries.forEach(entry => {
			const date = new Date(entry.entry_date);
			const dateKey = formatDateGroup(date);
			
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(entry);
		});
		
		return groups;
	}
	
	function formatDateGroup(date: Date): string {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		
		// Calculate days difference
		const diffTime = today.getTime() - date.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		
		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return date.toLocaleDateString('en-ZA', { weekday: 'long' });
		} else if (diffDays < 14) {
			return 'Last Week';
		} else if (diffDays < 21) {
			return '2 Weeks Ago';
		} else if (diffDays < 28) {
			return '3 Weeks Ago';
		} else {
			return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
		}
	}
	
	function formatTime(timeStr: string): string {
		return timeStr.substring(0, 5); // HH:MM
	}
	
	// Calculate hours or km used
	function getUsage(entry: any): string {
		if (entry.gauge_working === false) {
			return '-';
		}
		
		if (entry.odometer_start && entry.odometer_end) {
			const diff = entry.odometer_end - entry.odometer_start;
			const unit = entry.vehicles?.odometer_unit || 'km';
			if (unit === 'hours' || unit === 'hr') {
				return `${Math.round(diff * 10) / 10}hr`;
			} else {
				return `${Math.round(diff * 10) / 10}km`;
			}
		}
		return '-';
	}
	
	const groupedEntries = $derived(groupEntriesByDate(entries));
	const dateGroups = $derived(Object.keys(groupedEntries));
</script>

<div class="recent-activity">
	<div class="activity-header">
		<h3>Recent Fuel Entries</h3>
		<Button variant="outline" size="sm" href="/fuel/summary">View All</Button>
	</div>
	
	{#if loading}
		<div class="loading-state">
			{#each Array(5) as _}
				<div class="skeleton-row">
					<div class="skeleton-cell"></div>
					<div class="skeleton-cell"></div>
					<div class="skeleton-cell"></div>
					<div class="skeleton-cell"></div>
					<div class="skeleton-cell"></div>
					<div class="skeleton-cell"></div>
				</div>
			{/each}
		</div>
	{:else if entries.length === 0}
		<div class="empty-state">
			<div class="empty-icon">⛽</div>
			<p>No recent fuel entries</p>
			<small>Fuel entries will appear here once vehicles start logging fuel usage</small>
		</div>
	{:else}
		<div class="table-container">
			<table class="fuel-table">
				<thead>
					<tr>
						<th>Vehicle</th>
						<th>Field</th>
						<th>Activity</th>
						<th>Driver</th>
						<th>Fuel</th>
						<th>Usage</th>
					</tr>
				</thead>
				<tbody>
					{#each dateGroups as dateGroup}
						<!-- Date Group Header -->
						<tr class="date-header">
							<td colspan="6">
								<div class="date-label">{dateGroup}</div>
							</td>
						</tr>
						
						<!-- Entries for this date -->
						{#each groupedEntries[dateGroup] as entry (entry.id)}
							<tr class="entry-row">
								<td class="vehicle-cell">
									<div class="vehicle-info">
										<span class="vehicle-code">{entry.vehicles?.code || '-'}</span>
										<span class="vehicle-name">{entry.vehicles?.name || '-'}</span>
									</div>
								</td>
								<td class="field-cell">
									{entry.fields?.code || '-'}
								</td>
								<td class="activity-cell">
									{entry.activities?.name || '-'}
								</td>
								<td class="driver-cell">
									{entry.drivers?.name?.split(' ')[0] || '-'}
								</td>
								<td class="fuel-cell">
									<strong>{Math.round((entry.litres_dispensed || 0) * 10) / 10}L</strong>
								</td>
								<td class="usage-cell">
									{getUsage(entry)}
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.recent-activity {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 0;
		margin: 0;
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		padding: 0 0 0.25rem 0;
		border-bottom: 1px solid #e5e7eb;
	}

	.activity-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	/* Table Container */
	.table-container {
		flex: 1;
		overflow: auto;
		max-height: 500px;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	/* Table Styling */
	.fuel-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	.fuel-table thead {
		position: sticky;
		top: 0;
		background: #f8fafc;
		z-index: 10;
	}

	.fuel-table th {
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-weight: 500;
		color: #6b7280;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid #e5e7eb;
	}

	.fuel-table td {
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		color: #1f2937;
		vertical-align: middle;
	}

	/* Date Headers */
	.date-header td {
		background: #f9fafb;
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid #e5e7eb;
		border-top: 1px solid #e5e7eb;
	}

	.date-label {
		font-weight: 600;
		color: #374151;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Cell Specific Styling */
	.vehicle-cell {
		min-width: 120px;
	}

	.vehicle-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.vehicle-code {
		font-weight: 600;
		color: #2563eb;
		font-size: 0.75rem;
	}

	.vehicle-name {
		font-size: 0.85rem;
		color: #6b7280;
		line-height: 1;
		font-weight: 500;
	}

	.field-cell {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.activity-cell {
		color: #374151;
		font-size: 0.75rem;
	}

	.driver-cell {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.fuel-cell {
		color: #059669;
		font-weight: 600;
		text-align: right;
	}

	.usage-cell {
		color: #6b7280;
		font-size: 0.75rem;
		text-align: right;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
	}

	.skeleton-row {
		display: grid;
		grid-template-columns: 1fr 0.75fr 1.25fr 1fr 0.75fr 0.75fr;
		gap: 0.5rem;
		padding: 0.375rem 0;
	}

	.skeleton-cell {
		height: 0.875rem;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-text-secondary);
		flex: 1;
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state p {
		font-size: 1rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
	}

	.empty-state small {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		max-width: 280px;
	}

	/* Hover Effects */
	.entry-row:hover {
		background: #fafafa;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.recent-activity {
			padding: 0;
		}

		.table-container {
			max-height: 400px;
		}

		.fuel-table {
			font-size: 0.75rem;
		}

		.fuel-table th,
		.fuel-table td {
			padding: 0.375rem 0.5rem;
		}

		.fuel-table th {
			font-size: 0.65rem;
		}

		.vehicle-info {
			gap: 0.075rem;
		}

		.vehicle-code {
			font-size: 0.7rem;
		}

		.vehicle-name {
			font-size: 0.8rem;
		}

		/* Hide some columns on very small screens */
		@media (max-width: 480px) {
			.field-cell,
			.fuel-table th:nth-child(2) {
				display: none;
			}
		}
	}
</style>