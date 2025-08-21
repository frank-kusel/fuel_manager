<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface Props {
		bowsers: any[];
		loading?: boolean;
	}
	
	let { bowsers, loading = false }: Props = $props();
	
	// Get the primary/main tank (first one or diesel tank)
	let mainTank = $derived(bowsers.find(b => b.fuel_type === 'diesel') || bowsers[0] || null);
	
	
	function getPercentage(current: number, capacity: number): number {
		return capacity > 0 ? Math.round((current / capacity) * 100 * 10) / 10 : 0;
	}
	
	function getLevelStatus(percentage: number): string {
		if (percentage > 75) return 'high';
		if (percentage > 50) return 'medium';
		if (percentage > 25) return 'low';
		return 'critical';
	}
	
	function formatLitres(amount: number): string {
		return new Intl.NumberFormat('en-ZA', {
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<Card class="tank-monitoring">
	<div class="tank-header">
		<h3>Fuel Tank</h3>
		<Button variant="outline" size="sm" href="/fleet/bowsers">Manage</Button>
	</div>
	
	{#if loading}
		<div class="loading-state">
			<div class="skeleton-tank"></div>
		</div>
	{:else if !mainTank}
		<div class="empty-state">
			<div class="empty-icon">🪣</div>
			<p>No fuel tank configured</p>
		</div>
	{:else}
		{@const percentage = getPercentage(mainTank.current_reading, mainTank.capacity)}
		{@const status = getLevelStatus(percentage)}
		
		<div class="tank-display">
			<!-- Vertical Bar Chart -->
			<div class="bar-chart-container">
				<!-- Capacity Label -->
				<div class="capacity-label">{formatLitres(mainTank.capacity)}L</div>
				
				<!-- Vertical Bar -->
				<div class="tank-bar">
					<div 
						class="tank-fill {status}" 
						style="height: {Math.min(percentage, 100)}%"
					>
						<!-- Percentage in middle of bar -->
						<div class="percentage-overlay">{percentage}%</div>
					</div>
				</div>
				
				<!-- Current Level Label Below Tank -->
				<div class="current-level-below">{formatLitres(mainTank.current_reading)}L</div>
			</div>
		</div>
	{/if}
</Card>

<style>
	:global(.tank-monitoring) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.tank-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.tank-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	/* Tank Display */
	.tank-display {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
	}

	.tank-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-align: center;
	}

	/* Bar Chart */
	.bar-chart-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		justify-content: center;
		min-height: 200px;
	}

	.capacity-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.tank-bar {
		position: relative;
		width: 100%;
		height: 180px;
		background: #f3f4f6;
		border: 2px solid #d1d5db;
		border-radius: 8px;
		display: flex;
		align-items: flex-end;
		overflow: hidden;
	}

	.tank-fill {
		width: 100%;
		border-radius: 4px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 24px;
		transition: height 0.8s ease;
	}

	.tank-fill.high {
		background: linear-gradient(180deg, #86efac 0%, #16a34a 100%);
	}

	.tank-fill.medium {
		background: linear-gradient(180deg, #fde047 0%, #eab308 100%);
	}

	.tank-fill.low {
		background: linear-gradient(180deg, #fca5a5 0%, #dc2626 100%);
	}

	.tank-fill.critical {
		background: linear-gradient(180deg, #fca5a5 0%, #dc2626 100%);
		animation: pulse 2s infinite;
	}

	.percentage-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.875rem;
		font-weight: 700;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}

	.current-level-below {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		text-align: center;
		margin-top: 1rem;
	}

	/* Loading state */
	.loading-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.skeleton-tank {
		width: 80px;
		height: 180px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 8px;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.8; }
	}

	/* Empty state */
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state p {
		font-size: 1rem;
		font-weight: 500;
		margin: 0;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.tank-display {
			padding: 0.5rem 0;
		}

		.bar-chart-container {
			min-height: 140px;
		}

		.tank-bar {
			height: 140px;
		}

		.percentage-overlay {
			font-size: 0.75rem;
		}

		.current-level-below {
			font-size: 0.875rem;
			margin-top: 0.75rem;
		}

		.capacity-label {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.tank-bar {
			height: 120px;
		}

		.percentage-overlay {
			font-size: 0.7rem;
		}

		.current-level-below {
			font-size: 0.8rem;
			margin-top: 0.5rem;
		}
	}
</style>