<script lang="ts">
	import { onMount } from 'svelte';
	
	interface DailyFuel {
		date: string;
		total: number;
		label: string;
	}
	
	let fuelData = $state<DailyFuel[]>([]);
	let loading = $state(true);
	let maxValue = $derived(Math.max(...fuelData.map(d => d.total), 1));
	
	// Generate past 10 days of data
	function generatePast10Days() {
		const days: DailyFuel[] = [];
		const today = new Date();
		
		for (let i = 9; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(today.getDate() - i);
			
			const dateStr = date.toISOString().split('T')[0];
			const label = i === 0 ? 'Today' : 
			             i === 1 ? 'Yesterday' : 
			             date.toLocaleDateString('en', { weekday: 'short' });
			
			days.push({
				date: dateStr,
				total: 0,
				label
			});
		}
		
		return days;
	}
	
	// Load fuel data for the past 10 days
	async function loadFuelData() {
		loading = true;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			
			const client = (supabaseService as any).client;
			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);
			const startDate = tenDaysAgo.toISOString().split('T')[0];
			
			const result = await client
				.from('fuel_entries')
				.select('entry_date, litres_dispensed')
				.gte('entry_date', startDate)
				.order('entry_date', { ascending: true });
			
			if (result.data) {
				// Initialize with past 10 days
				const days = generatePast10Days();
				
				// Aggregate fuel by date
				const dailyTotals = result.data.reduce((acc: Record<string, number>, entry: any) => {
					const date = entry.entry_date;
					const fuel = entry.litres_dispensed || 0;
					acc[date] = (acc[date] || 0) + fuel;
					return acc;
				}, {});
				
				// Update days with actual data
				days.forEach(day => {
					day.total = dailyTotals[day.date] || 0;
				});
				
				fuelData = days;
			}
		} catch (error) {
			console.error('Failed to load fuel chart data:', error);
			fuelData = generatePast10Days(); // Fallback to empty data
		} finally {
			loading = false;
		}
	}
	
	onMount(() => {
		loadFuelData();
	});
</script>

<div class="fuel-chart">
	<div class="chart-header">
		<h4>Daily Fuel Usage</h4>
		<span class="chart-subtitle">Past 10 days</span>
	</div>
	
	{#if loading}
		<div class="chart-loading">
			<div class="loading-bars">
				{#each Array(10) as _}
					<div class="loading-bar"></div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="chart-container">
			<div class="chart-bars">
				{#each fuelData as day}
					<div class="bar-container">
						<div 
							class="bar" 
							style="height: {day.total > 0 ? (day.total / maxValue) * 100 : 2}%"
							title="{day.label}: {Math.round(day.total * 10) / 10}L"
						></div>
						<span class="bar-label">{day.label}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.fuel-chart {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		margin-top: 0.5rem;
	}
	
	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 1.5rem;
	}
	
	.chart-header h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}
	
	.chart-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
	}
	
	.chart-loading {
		height: 120px;
		display: flex;
		align-items: end;
		padding-bottom: 1.5rem;
	}
	
	.loading-bars {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		height: 100%;
		align-items: end;
	}
	
	.loading-bar {
		flex: 1;
		background: #f3f4f6;
		border-radius: 0.25rem 0.25rem 0 0;
		animation: pulse 1.5s ease-in-out infinite;
	}
	
	.loading-bar:nth-child(1) { height: 60%; animation-delay: 0s; }
	.loading-bar:nth-child(2) { height: 40%; animation-delay: 0.1s; }
	.loading-bar:nth-child(3) { height: 80%; animation-delay: 0.2s; }
	.loading-bar:nth-child(4) { height: 50%; animation-delay: 0.3s; }
	.loading-bar:nth-child(5) { height: 70%; animation-delay: 0.4s; }
	.loading-bar:nth-child(6) { height: 30%; animation-delay: 0.5s; }
	.loading-bar:nth-child(7) { height: 90%; animation-delay: 0.6s; }
	.loading-bar:nth-child(8) { height: 45%; animation-delay: 0.7s; }
	.loading-bar:nth-child(9) { height: 65%; animation-delay: 0.8s; }
	.loading-bar:nth-child(10) { height: 55%; animation-delay: 0.9s; }
	
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
	
	.chart-container {
		height: 120px;
	}
	
	.chart-bars {
		display: flex;
		gap: 0.5rem;
		height: 100%;
		align-items: end;
		padding-bottom: 1.5rem;
	}
	
	.bar-container {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: end;
	}
	
	.bar {
		width: 100%;
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		border-radius: 0.25rem 0.25rem 0 0;
		min-height: 2px;
		transition: all 0.3s ease;
		cursor: pointer;
		position: relative;
	}
	
	.bar:hover {
		opacity: 0.8;
		transform: translateY(-2px);
	}
	
	.bar-label {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.5rem;
		text-align: center;
		font-weight: 500;
	}
	
	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.fuel-chart {
			padding: 1rem;
		}
		
		.chart-header {
			flex-direction: column;
			gap: 0.25rem;
			align-items: flex-start;
			margin-bottom: 1rem;
		}
		
		.chart-bars {
			gap: 0.25rem;
		}
		
		.bar-label {
			font-size: 0.625rem;
		}
	}
</style>