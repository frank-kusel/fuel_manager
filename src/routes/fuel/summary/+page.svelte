<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import supabaseService from '$lib/services/supabase';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface FuelSummaryEntry {
		id: string;
		entry_date: string;
		time: string;
		vehicles?: { code: string; name: string };
		drivers?: { employee_code: string; name: string };
		activities?: { name: string };
		fields?: { code: string; name: string };
		zones?: { code: string; name: string };
		litres_dispensed: number;
		odometer_start: number | null;
		odometer_end: number | null;
		gauge_working: boolean;
		bowser_reading_start: number | null;
		bowser_reading_end: number | null;
	}
	
	let entries: FuelSummaryEntry[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedDate = $state(new Date().toISOString().split('T')[0]);
	let autoRefresh = $state(true);
	let refreshInterval: number | null = null;
	
	onMount(() => {
		if (browser) {
			loadEntries();
			
			// Auto-refresh every 15 seconds
			if (autoRefresh) {
				refreshInterval = setInterval(() => {
					loadEntries();
				}, 15000);
			}
		}
		
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});
	
	async function loadEntries() {
		try {
			loading = true;
			await supabaseService.init();
			
			// Use direct client access like before but with proper error handling
			const { data, error: fetchError } = await supabaseService['client']
				.from('fuel_entries')
				.select(`
					*,
					vehicles!inner(code, name),
					drivers!inner(employee_code, name),
					activities!inner(name),
					fields(code, name),
					zones(code, name)
				`)
				.eq('entry_date', selectedDate)
				.order('time', { ascending: false });
			
			if (fetchError) throw fetchError;
			
			entries = data || [];
			console.log('Loaded entries:', $state.snapshot(entries));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load entries';
		} finally {
			loading = false;
		}
	}
	
	function getLocation(entry: any): string {
		// Handle different data structures from Supabase joins
		const field = entry.fields || entry.field;
		const zone = entry.zones || entry.zone;
		
		if (field && field.code && field.name) {
			return `${field.code} - ${field.name}`;
		}
		if (zone && zone.code && zone.name) {
			return `${zone.code} - ${zone.name}`;
		}
		return '-';
	}
	
	function formatOdometer(start: number | null, end: number | null, gaugeWorking: boolean): string {
		if (!gaugeWorking) return 'Broken';
		if (start === null || end === null) return '-';
		return `${start} → ${end}`;
	}
	
	function formatBowserReading(start: number | null, end: number | null): string {
		if (start === null || end === null) return '-';
		return `${start} → ${end}`;
	}
	
	function exportToCSV() {
		const headers = ['Date', 'Time', 'Vehicle', 'Driver', 'Activity', 'Location', 'Fuel (L)', 'Odometer', 'Bowser'];
		const rows = entries.map(entry => [
			entry.entry_date,
			entry.time,
			`${entry.vehicles?.code || 'N/A'} - ${entry.vehicles?.name || 'N/A'}`,
			`${entry.drivers?.employee_code || 'N/A'} - ${entry.drivers?.name || 'N/A'}`,
			entry.activities?.name || 'N/A',
			getLocation(entry),
			entry.litres_dispensed.toString(),
			formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working),
			formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end)
		]);
		
		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${cell}"`).join(','))
		].join('\n');
		
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `fuel-summary-${selectedDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
	
	// Group entries by vehicle for easier transcription
	let groupedEntries = $derived(() => {
		const grouped: Record<string, FuelSummaryEntry[]> = {};
		entries.forEach(entry => {
			const vehicleKey = `${entry.vehicles?.code || 'N/A'} - ${entry.vehicles?.name || 'N/A'}`;
			if (!grouped[vehicleKey]) {
				grouped[vehicleKey] = [];
			}
			grouped[vehicleKey].push(entry);
		});
		return grouped;
	});
	
	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			refreshInterval = setInterval(() => {
				loadEntries();
			}, 15000);
		} else if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}
</script>

<svelte:head>
	<title>Fuel Summary - {selectedDate}</title>
</svelte:head>

<div class="fuel-summary">
	<div class="header">
		<h1>Fuel Entry Summary</h1>
		<p class="subtitle">For manual book transcription</p>
	</div>
	
	<div class="controls">
		<div class="date-selector">
			<label for="date">Date:</label>
			<input 
				id="date"
				type="date" 
				bind:value={selectedDate}
				onchange={loadEntries}
			/>
		</div>
		
		<div class="action-buttons">
			<Button size="sm" variant="outline" onclick={toggleAutoRefresh}>
				{autoRefresh ? '⏸️ Pause' : '▶️ Auto-refresh'}
			</Button>
			<Button size="sm" variant="outline" onclick={loadEntries}>
				🔄 Refresh
			</Button>
			<Button size="sm" variant="outline" onclick={() => window.print()}>
				🖨️ Print
			</Button>
			<Button size="sm" onclick={exportToCSV}>
				📥 Export CSV
			</Button>
		</div>
	</div>
	
	{#if loading}
		<div class="loading">Loading entries...</div>
	{:else if error}
		<div class="error">
			<span class="error-icon">⚠️</span>
			{error}
		</div>
	{:else if entries.length === 0}
		<div class="empty">
			<span class="empty-icon">📭</span>
			<p>No fuel entries for {selectedDate}</p>
		</div>
	{:else}
		<div class="summary-stats">
			<div class="stat">
				<span class="stat-label">Total Entries:</span>
				<span class="stat-value">{entries.length}</span>
			</div>
			<div class="stat">
				<span class="stat-label">Total Fuel:</span>
				<span class="stat-value">{entries.reduce((sum, e) => sum + e.litres_dispensed, 0).toFixed(1)} L</span>
			</div>
			<div class="stat">
				<span class="stat-label">Vehicles:</span>
				<span class="stat-value">{Object.keys(groupedEntries()).length}</span>
			</div>
		</div>
		
		<!-- Desktop Table View -->
		<div class="table-container desktop-only">
			<table class="summary-table">
				<thead>
					<tr>
						<th>Time</th>
						<th>Vehicle</th>
						<th>Driver</th>
						<th>Activity</th>
						<th>Location</th>
						<th>Fuel (L)</th>
						<th>Odometer</th>
						<th>Bowser</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as entry}
						<tr>
							<td>{entry.time}</td>
							<td class="vehicle-cell">
								<span class="code">{entry.vehicles?.code || 'N/A'}</span>
								<span class="name">{entry.vehicles?.name || 'N/A'}</span>
							</td>
							<td>
								<span class="code">{entry.drivers?.employee_code || 'N/A'}</span>
								<span class="name">{entry.drivers?.name || 'N/A'}</span>
							</td>
							<td>{entry.activities?.name || 'N/A'}</td>
							<td>{getLocation(entry)}</td>
							<td class="fuel-cell">{entry.litres_dispensed.toFixed(1)}</td>
							<td class="odo-cell">{formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working)}</td>
							<td class="bowser-cell">{formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Mobile Card View (Grouped by Vehicle) -->
		<div class="mobile-cards mobile-only">
			{#each Object.entries(groupedEntries()) as [vehicle, vehicleEntries]}
				<div class="vehicle-group">
					<h3 class="vehicle-header">{vehicle}</h3>
					{#each vehicleEntries as entry}
						<div class="entry-card">
							<div class="entry-row">
								<span class="label">Time:</span>
								<span class="value">{entry.time}</span>
							</div>
							<div class="entry-row">
								<span class="label">Driver:</span>
								<span class="value">{entry.drivers?.employee_code || 'N/A'} - {entry.drivers?.name || 'N/A'}</span>
							</div>
							<div class="entry-row">
								<span class="label">Activity:</span>
								<span class="value">{entry.activities?.name || 'N/A'}</span>
							</div>
							<div class="entry-row">
								<span class="label">Location:</span>
								<span class="value">{getLocation(entry)}</span>
							</div>
							<div class="entry-row highlight">
								<span class="label">Fuel:</span>
								<span class="value">{entry.litres_dispensed.toFixed(1)} L</span>
							</div>
							<div class="entry-row">
								<span class="label">Odometer:</span>
								<span class="value">{formatOdometer(entry.odometer_start, entry.odometer_end, entry.gauge_working)}</span>
							</div>
							<div class="entry-row">
								<span class="label">Bowser:</span>
								<span class="value">{formatBowserReading(entry.bowser_reading_start, entry.bowser_reading_end)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.fuel-summary {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
		background: white;
		min-height: 100vh;
	}
	
	.header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
	}
	
	.header h1 {
		font-size: 1.875rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 0.25rem 0;
	}
	
	.subtitle {
		color: #64748b;
		font-size: 0.875rem;
		margin: 0;
	}
	
	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.date-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.date-selector label {
		font-weight: 600;
		color: #334155;
	}
	
	.date-selector input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}
	
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
	}
	
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	
	.stat-label {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
	}
	
	/* Desktop Table */
	.table-container {
		overflow-x: auto;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
	}
	
	.summary-table {
		width: 100%;
		border-collapse: collapse;
	}
	
	.summary-table th {
		background: #f1f5f9;
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
	}
	
	.summary-table td {
		padding: 0.75rem;
		font-size: 0.875rem;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.summary-table tbody tr:hover {
		background: #f8fafc;
	}
	
	.vehicle-cell,
	.driver-cell {
		display: flex;
		flex-direction: column;
	}
	
	.code {
		font-weight: 600;
		color: #0f172a;
	}
	
	.name {
		font-size: 0.75rem;
		color: #64748b;
	}
	
	.fuel-cell {
		font-weight: 600;
		color: #059669;
	}
	
	.odo-cell,
	.bowser-cell {
		font-family: monospace;
		font-size: 0.8125rem;
	}
	
	/* Mobile Cards */
	.mobile-cards {
		display: none;
	}
	
	.vehicle-group {
		margin-bottom: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}
	
	.vehicle-header {
		background: #f1f5f9;
		padding: 0.75rem 1rem;
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #0f172a;
		border-bottom: 2px solid #e2e8f0;
	}
	
	.entry-card {
		padding: 1rem;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.entry-card:last-child {
		border-bottom: none;
	}
	
	.entry-row {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0;
		font-size: 0.875rem;
	}
	
	.entry-row.highlight {
		background: #f0fdf4;
		padding: 0.5rem;
		margin: 0.25rem -0.5rem;
		border-radius: 4px;
	}
	
	.entry-row .label {
		color: #64748b;
	}
	
	.entry-row .value {
		font-weight: 500;
		color: #0f172a;
		text-align: right;
	}
	
	/* Loading, Error, Empty states */
	.loading,
	.error,
	.empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #64748b;
	}
	
	.error {
		color: #dc2626;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
	}
	
	.error-icon,
	.empty-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		display: block;
	}
	
	/* Mobile Responsive */
	.desktop-only {
		display: block;
	}
	
	.mobile-only {
		display: none;
	}
	
	@media (max-width: 768px) {
		.fuel-summary {
			padding: 0.5rem;
		}
		
		.controls {
			flex-direction: column;
			align-items: stretch;
		}
		
		.action-buttons {
			justify-content: center;
		}
		
		.desktop-only {
			display: none;
		}
		
		.mobile-only {
			display: block;
		}
		
		.mobile-cards {
			display: block;
		}
	}
	
	/* Print Styles */
	@media print {
		.fuel-summary {
			padding: 0;
		}
		
		.controls {
			display: none;
		}
		
		.header {
			page-break-after: avoid;
		}
		
		.summary-table {
			font-size: 0.75rem;
		}
		
		.summary-table th,
		.summary-table td {
			padding: 0.5rem;
		}
		
		.vehicle-group {
			page-break-inside: avoid;
		}
		
		.mobile-only {
			display: none;
		}
		
		.desktop-only {
			display: block !important;
		}
	}
</style>