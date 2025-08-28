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

<div class="fuel-activity">
	<div class="activity-header">
		<h3>Recent Fuel Activity</h3>
		<Button variant="outline" size="sm" href="/summary">View All</Button>
	</div>
	
	{#if loading}
		<div class="loading-grid">
			{#each Array(6) as _}
				<div class="entry-skeleton">
					<div class="skeleton-header"></div>
					<div class="skeleton-content">
						<div class="skeleton-bar"></div>
						<div class="skeleton-text"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if entries.length === 0}
		<div class="empty-state">
			<div class="empty-visual">
				<div class="fuel-drop"></div>
			</div>
			<h4>No recent activity</h4>
			<p>Fuel entries will appear here once vehicles start logging usage</p>
		</div>
	{:else}
		<div class="entries-container">
			{#each dateGroups as dateGroup}
				<!-- Date Section -->
				<div class="date-section">
					<div class="date-header">
						<span class="date-badge">{dateGroup}</span>
					</div>
					
					<div class="entries-grid">
						{#each groupedEntries[dateGroup] as entry (entry.id)}
							<div class="entry-card">
								<div class="entry-header">
									<div class="vehicle-badge">
										{entry.vehicles?.code || 'N/A'}
									</div>
									<div class="fuel-amount">
										{Math.round((entry.litres_dispensed || 0) * 10) / 10}<span class="fuel-unit">L</span>
									</div>
								</div>
								
								<div class="entry-details">
									<div class="detail-row">
										<span class="detail-label">Vehicle</span>
										<span class="detail-value">{entry.vehicles?.name || '-'}</span>
									</div>
									<div class="detail-row">
										<span class="detail-label">Field</span>
										<span class="detail-value">{entry.fields?.code || '-'}</span>
									</div>
									<div class="detail-row">
										<span class="detail-label">Usage</span>
										<span class="detail-value usage-highlight">{getUsage(entry)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.fuel-activity {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding: 0 0.5rem;
	}

	.activity-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	/* Entries Container */
	.entries-container {
		flex: 1;
		overflow-y: auto;
		max-height: 600px;
		padding: 0 0.5rem;
	}

	/* Date Sections */
	.date-section {
		margin-bottom: 2rem;
	}

	.date-header {
		margin-bottom: 1rem;
	}

	.date-badge {
		display: inline-block;
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
		padding: 0.375rem 1rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);
	}

	/* Entries Grid */
	.entries-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	/* Entry Cards */
	.entry-card {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 12px;
		padding: 1rem;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.entry-card:hover {
		border-color: #f97316;
		box-shadow: 0 8px 24px rgba(249, 115, 22, 0.1);
		transform: translateY(-2px);
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.vehicle-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 600;
		font-family: monospace;
	}

	.fuel-amount {
		font-size: 1.25rem;
		font-weight: 700;
		color: #059669;
		display: flex;
		align-items: baseline;
		gap: 0.125rem;
	}

	.fuel-unit {
		font-size: 0.875rem;
		font-weight: 500;
		opacity: 0.8;
	}

	/* Entry Details */
	.entry-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.detail-label {
		color: #9ca3af;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;
	}

	.detail-value {
		color: #374151;
		font-weight: 500;
		text-align: right;
	}

	.usage-highlight {
		color: #f97316;
		font-weight: 600;
	}

	/* Loading State */
	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		padding: 0 0.5rem;
	}

	.entry-skeleton {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 12px;
		padding: 1rem;
	}

	.skeleton-header {
		height: 1.5rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 6px;
		margin-bottom: 0.75rem;
	}

	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-bar {
		height: 0.875rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-text {
		height: 0.75rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
		width: 70%;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		flex: 1;
	}

	.empty-visual {
		margin-bottom: 1.5rem;
	}

	.fuel-drop {
		width: 60px;
		height: 80px;
		background: linear-gradient(135deg, #f97316, #ea580c);
		border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
		position: relative;
		opacity: 0.6;
		animation: float 3s ease-in-out infinite;
	}

	.fuel-drop::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 20px;
		height: 20px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 50%;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
	}

	.empty-state h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
		max-width: 300px;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.entries-grid {
			grid-template-columns: 1fr;
		}

		.activity-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			margin-bottom: 1rem;
		}

		.activity-header h3 {
			text-align: center;
		}

		.entries-container {
			padding: 0;
		}

		.entry-card {
			padding: 0.875rem;
		}

		.fuel-amount {
			font-size: 1.125rem;
		}

		.detail-row {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.date-section {
			margin-bottom: 1.5rem;
		}

		.entry-card {
			padding: 0.75rem;
		}
	}
</style>