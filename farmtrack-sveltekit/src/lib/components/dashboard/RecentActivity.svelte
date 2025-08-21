<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface Props {
		entries: any[];
		loading?: boolean;
	}
	
	let { entries, loading = false }: Props = $props();
	
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		
		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-ZA', { 
				month: 'short', 
				day: 'numeric' 
			});
		}
	}
	
	function formatTime(timeStr: string): string {
		return timeStr.substring(0, 5); // HH:MM
	}
	
	function getActivityIcon(category: string): string {
		const icons = {
			planting: '🌱',
			harvesting: '🌾',
			spraying: '💨',
			fertilizing: '🧪',
			maintenance: '🔧',
			other: '⚡'
		};
		return icons[category] || icons.other;
	}
	
	function getActivityColor(category: string): string {
		const colors = {
			planting: '#10b981',
			harvesting: '#f59e0b', 
			spraying: '#3b82f6',
			fertilizing: '#8b5cf6',
			maintenance: '#ef4444',
			other: '#6b7280'
		};
		return colors[category] || colors.other;
	}
</script>

<Card class="recent-activity">
	<div class="activity-header">
		<h3>Recent Fuel Entries</h3>
		<Button variant="outline" size="sm">View All</Button>
	</div>
	
	{#if loading}
		<div class="loading-state">
			{#each Array(5) as _}
				<div class="activity-item-skeleton">
					<div class="skeleton-icon"></div>
					<div class="skeleton-content">
						<div class="skeleton-line"></div>
						<div class="skeleton-line short"></div>
					</div>
					<div class="skeleton-value"></div>
				</div>
			{/each}
		</div>
	{:else if entries.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📊</div>
			<p>No recent fuel entries</p>
			<small>Fuel entries will appear here once vehicles start logging fuel usage</small>
		</div>
	{:else}
		<div class="activity-list">
			{#each entries as entry (entry.id)}
				<div class="activity-item">
					<div class="activity-info">
						<div class="activity-primary">
							<span class="vehicle-name">{entry.vehicles?.name || 'Unknown Vehicle'}</span>
							<span class="activity-separator">•</span>
							<span class="activity-name">{entry.activities?.name || 'Unknown Activity'}</span>
						</div>
						<div class="activity-secondary">
							<span class="driver-name">{entry.drivers?.name || 'Unknown Driver'}</span>
							<span class="activity-separator">•</span>
							<span class="entry-time">{formatDate(entry.entry_date)} {formatTime(entry.time)}</span>
							{#if entry.odometer_start && entry.odometer_end}
								<span class="activity-separator">•</span>
								<span class="distance">{Math.round((entry.odometer_end - entry.odometer_start) * 10) / 10}km</span>
							{/if}
						</div>
					</div>
					
					<div class="activity-metrics">
						<div class="fuel-amount">
							{Math.round((entry.litres_used || 0) * 10) / 10}L
						</div>
						{#if entry.fuel_consumption_l_per_100km && entry.gauge_working}
							<!-- Use stored consumption value when available -->
							<div class="efficiency">
								{Math.round(entry.fuel_consumption_l_per_100km * 10) / 10} L/100km
							</div>
						{:else if entry.odometer_start && entry.odometer_end && entry.gauge_working !== false}
							<!-- Calculate consumption when stored value not available but we have valid odometer readings -->
							{@const distance = entry.odometer_end - entry.odometer_start}
							{@const efficiency = distance > 0 ? (entry.litres_used / distance * 100) : 0}
							{#if efficiency > 0}
								<div class="efficiency">
									{Math.round(efficiency * 10) / 10} L/100km
								</div>
							{/if}
						{:else if entry.odometer_start && entry.odometer_end && entry.gauge_working === false}
							<!-- Broken gauge fallback -->
							<div class="efficiency broken-gauge" title="Calculated from broken gauge - not reliable">
								~{Math.round(((entry.litres_used / (entry.odometer_end - entry.odometer_start)) * 100) * 10) / 10} L/100km
							</div>
						{:else if entry.gauge_working === false}
							<div class="efficiency broken-gauge">
								Gauge broken
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>

<style>
	:global(.recent-activity) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.activity-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.activity-list {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-background);
		transition: all 0.2s ease;
	}

	.activity-item:hover {
		background: var(--color-background-secondary);
		border-color: var(--color-primary-200);
	}

	.activity-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.activity-info {
		flex: 1;
		min-width: 0;
	}

	.activity-primary {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.25rem;
		font-weight: 500;
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.vehicle-name {
		font-weight: 600;
	}

	.activity-separator {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.activity-secondary {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.activity-metrics {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.fuel-amount {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-primary);
	}

	.efficiency {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	
	.efficiency.broken-gauge {
		color: var(--color-warning);
		font-style: italic;
		opacity: 0.8;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.activity-item-skeleton {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.skeleton-icon,
	.skeleton-value,
	.skeleton-line {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-icon {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.skeleton-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.skeleton-line {
		height: 0.875rem;
	}

	.skeleton-line.short {
		width: 60%;
		height: 0.75rem;
	}

	.skeleton-value {
		width: 3rem;
		height: 0.875rem;
		flex-shrink: 0;
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
		padding: 2rem 1rem;
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

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.activity-item {
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.activity-primary,
		.activity-secondary {
			flex-wrap: wrap;
		}

		.activity-metrics {
			align-items: center;
		}

		.activity-list {
			max-height: 300px;
		}
	}
</style>