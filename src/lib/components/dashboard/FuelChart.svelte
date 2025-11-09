<script lang="ts">
	import { onMount } from 'svelte';

	interface DailyFuel {
		date: string;
		total: number;
		label: string;
		dayOfMonth: number;
	}

	let fuelData = $state<DailyFuel[]>([]);
	let loading = $state(true);
	let maxValue = $derived(Math.max(...fuelData.map((d) => d.total), 1));

	// Generate past 14 days of data
	function generatePast14Days() {
		const days: DailyFuel[] = [];
		const today = new Date();

		for (let i = 13; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(today.getDate() - i);

			const dateStr = date.toISOString().split('T')[0];
			const dayOfMonth = date.getDate();
			const label =
				i === 0
					? 'Today'
					: i === 1
					? 'Yesterday'
					: date.toLocaleDateString('en', { weekday: 'short' });

			days.push({
				date: dateStr,
				total: 0,
				label,
				dayOfMonth
			});
		}

		return days;
	}

	// Load fuel data for the past 14 days
	async function loadFuelData() {
		loading = true;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();

			const client = (supabaseService as any).client;
			const fourteenDaysAgo = new Date();
			fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
			const startDate = fourteenDaysAgo.toISOString().split('T')[0];

			const result = await client
				.from('fuel_entries')
				.select('entry_date, litres_dispensed')
				.gte('entry_date', startDate)
				.order('entry_date', { ascending: true });

			if (result.data) {
				// Initialize with past 14 days
				const days = generatePast14Days();

				// Aggregate fuel by date
				const dailyTotals = result.data.reduce((acc: Record<string, number>, entry: any) => {
					const date = entry.entry_date;
					const fuel = entry.litres_dispensed || 0;
					acc[date] = (acc[date] || 0) + fuel;
					return acc;
				}, {});

				// Update days with actual data
				days.forEach((day) => {
					day.total = dailyTotals[day.date] || 0;
				});

				fuelData = days;
			}
		} catch (error) {
			console.error('Failed to load fuel chart data:', error);
			fuelData = generatePast14Days(); // Fallback to empty data
		} finally {
			loading = false;
		}
	}

	// Calculate dot size based on fuel amount
	function getDotSize(value: number): number {
		if (value === 0) return 0;
		const minSize = 6;
		const maxSize = 32;
		const normalized = value / maxValue;
		return minSize + normalized * (maxSize - minSize);
	}

	// Get intensity class based on value
	function getIntensity(value: number): string {
		if (value === 0) return 'none';
		const normalized = value / maxValue;
		if (normalized < 0.25) return 'low';
		if (normalized < 0.5) return 'medium';
		if (normalized < 0.75) return 'high';
		return 'very-high';
	}

	onMount(() => {
		loadFuelData();
	});
</script>

<div class="fuel-chart">
	<div class="chart-header">
		<h4>Fuel Usage</h4>
		<span class="chart-subtitle">Past 14 days</span>
	</div>

	{#if loading}
		<div class="chart-loading">
			<div class="dot-grid">
				{#each Array(14) as _, i}
					<div class="dot-container">
						<div class="dot skeleton"></div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="chart-container">
			<div class="dot-grid">
				{#each fuelData as day}
					<div class="dot-container">
						<div
							class="dot {getIntensity(day.total)}"
							style="width: {getDotSize(day.total)}px; height: {getDotSize(day.total)}px;"
							title="{day.label} ({day.dayOfMonth}): {Math.round(day.total * 10) / 10}L"
						></div>
						<span class="day-number">{day.dayOfMonth}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.fuel-chart {
		background: white;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 1rem;
	}

	.chart-header h4 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin: 0;
	}

	.chart-subtitle {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.chart-loading,
	.chart-container {
		padding: 0.5rem 0;
	}

	.dot-grid {
		display: grid;
		grid-template-columns: repeat(14, 1fr);
		gap: 0.5rem;
		align-items: center;
	}

	.dot-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
	}

	.dot {
		border-radius: 50%;
		transition: all 0.3s ease;
		cursor: pointer;
	}

	.dot.skeleton {
		width: 16px;
		height: 16px;
		background: #f3f4f6;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}

	.dot.none {
		width: 4px;
		height: 4px;
		background: #e5e7eb;
		opacity: 0.4;
	}

	.dot.low {
		background: #dbeafe;
		border: 2px solid #93c5fd;
	}

	.dot.medium {
		background: #bfdbfe;
		border: 2px solid #60a5fa;
	}

	.dot.high {
		background: #3b82f6;
		border: 2px solid #2563eb;
	}

	.dot.very-high {
		background: #1d4ed8;
		border: 2px solid #1e40af;
		box-shadow: 0 0 8px rgba(29, 78, 216, 0.4);
	}

	.dot:not(.skeleton):hover {
		transform: scale(1.15);
		filter: brightness(1.1);
	}

	.day-number {
		font-size: 0.625rem;
		color: #9ca3af;
		font-weight: 500;
		min-width: 1.25rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.fuel-chart {
			padding: 0.875rem;
		}

		.chart-header {
			margin-bottom: 0.75rem;
		}

		.chart-header h4 {
			font-size: 0.6875rem;
		}

		.chart-subtitle {
			font-size: 0.6875rem;
		}

		.dot-grid {
			gap: 0.375rem;
		}

		.dot-container {
			gap: 0.25rem;
		}

		.day-number {
			font-size: 0.5625rem;
		}
	}

	@media (max-width: 480px) {
		.fuel-chart {
			padding: 0.75rem;
		}

		.dot-grid {
			gap: 0.25rem;
		}

		.day-number {
			font-size: 0.5rem;
		}
	}
</style>
