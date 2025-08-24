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
	let isPulling = $state(false);
	let pullDistance = $state(0);
	let startY = 0;
	let pullThreshold = 60;
	
	onMount(() => {
		if (browser) {
			loadEntries();
			
			// Removed auto-refresh - user will manually refresh or pull-to-refresh
		}
		
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	// Pull-to-refresh functionality
	function handleTouchStart(e: TouchEvent) {
		if (window.scrollY === 0) {
			startY = e.touches[0].clientY;
			isPulling = true;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPulling || loading) return;
		
		const currentY = e.touches[0].clientY;
		const distance = currentY - startY;
		
		if (distance > 0 && window.scrollY === 0) {
			e.preventDefault();
			pullDistance = Math.min(distance * 0.5, pullThreshold + 20);
		}
	}

	async function handleTouchEnd() {
		if (!isPulling) return;
		
		if (pullDistance >= pullThreshold) {
			await loadEntries();
		}
		
		isPulling = false;
		pullDistance = 0;
		startY = 0;
	}
	
	async function loadEntries() {
		try {
			loading = true;
			await supabaseService.init();
			
			// First get all entries to see what we have - using LEFT JOINs to include entries with missing relationships
			const { data: allData, error: allError } = await supabaseService['client']
				.from('fuel_entries')
				.select(`
					*,
					vehicles!left(code, name),
					drivers!left(employee_code, name),
					activities!left(name),
					fields!left(code, name),
					zones!left(code, name)
				`)
				.order('entry_date', { ascending: false })
				.order('time', { ascending: false });
			
			console.log('=== ALL FUEL ENTRIES ===');
			console.log('Total entries in database:', allData?.length || 0);
			console.log('All entries:', allData);
			
			// Now filter for selected date - using LEFT JOINs to include entries with missing relationships
			const { data, error: fetchError } = await supabaseService['client']
				.from('fuel_entries')
				.select(`
					*,
					vehicles!left(code, name),
					drivers!left(employee_code, name),
					activities!left(name),
					fields!left(code, name),
					zones!left(code, name)
				`)
				.eq('entry_date', selectedDate)
				.order('time', { ascending: false });
			
			if (fetchError) throw fetchError;
			
			entries = data || [];
			console.log('=== FILTERED ENTRIES FOR', selectedDate, '===');
			console.log('Filtered entries count:', entries.length);
			console.log('Filtered entries:', entries);
			
			// Check for missing data
			entries.forEach((entry, index) => {
				console.log(`Entry ${index + 1}:`, {
					id: entry.id,
					date: entry.entry_date,
					time: entry.time,
					vehicle: entry.vehicles,
					driver: entry.drivers,
					activity: entry.activities,
					field: entry.fields,
					fuel: entry.litres_dispensed,
					missingVehicle: !entry.vehicles,
					missingDriver: !entry.drivers,
					missingActivity: !entry.activities
				});
			});
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

	function formatOdometerValue(value: number | null, gaugeWorking: boolean): string {
		if (value === null || value === undefined) return '-';
		if (gaugeWorking === false) return 'Broken';
		// Format number with spaces between thousands
		return value.toLocaleString('en-US', { 
			minimumFractionDigits: 1, 
			maximumFractionDigits: 1 
		}).replace(/,/g, ' ');
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
	
</script>

<svelte:head>
	<title>Fuel Summary - {selectedDate}</title>
</svelte:head>

<div class="fuel-summary" 
	ontouchstart={handleTouchStart} 
	ontouchmove={handleTouchMove} 
	ontouchend={handleTouchEnd}
>
	<!-- Pull-to-refresh indicator -->
	{#if isPulling}
		<div class="pull-indicator" style="transform: translateY({pullDistance - 40}px)">
			<div class="pull-icon" style="opacity: {Math.min(pullDistance / pullThreshold, 1)}">
				{#if pullDistance >= pullThreshold}
					<span class="refresh-ready">↻</span>
				{:else}
					<span class="pull-arrow">↓</span>
				{/if}
			</div>
		</div>
	{/if}

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
		
		<div class="action-buttons desktop-only">
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
		
		<!-- Mobile Simple Table View (Simplified for logbook transcription) -->
		<div class="simple-table-container mobile-only">
			<table class="simple-summary-table">
				<tbody>
					{#each entries as entry}
						<!-- Vehicle and Fuel Row -->
						<tr class="vehicle-row">
							<td class="vehicle-code">{entry.vehicles?.code || 'N/A'}</td>
							<td class="vehicle-name">{entry.vehicles?.name || 'N/A'}</td>
							<td class="fuel-amount">{entry.litres_dispensed.toFixed(1)}L</td>
						</tr>
						<!-- Odometer Start Row -->
						<tr class="odo-row">
							<td class="odo-label">Start</td>
							<td class="odo-value" colspan="2">
								{formatOdometerValue(entry.odometer_start, entry.gauge_working)}
							</td>
						</tr>
						<!-- Odometer End Row -->
						<tr class="odo-row">
							<td class="odo-label">End</td>
							<td class="odo-value" colspan="2">
								{formatOdometerValue(entry.odometer_end, entry.gauge_working)}
							</td>
						</tr>
						<tr class="spacer-row">
							<td colspan="3"></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	/* Pull-to-refresh styles */
	.pull-indicator {
		position: absolute;
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		transition: opacity 0.2s ease;
	}

	.pull-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 50%;
		backdrop-filter: blur(10px);
	}

	.pull-arrow,
	.refresh-ready {
		font-size: 1.25rem;
		color: #059669;
		font-weight: bold;
	}

	.refresh-ready {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.fuel-summary {
		position: relative;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
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
	
	/* Mobile Simple Table */
	.simple-table-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		background: white;
	}

	.simple-summary-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.vehicle-row {
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	.vehicle-row td {
		padding: 0.75rem;
		font-weight: 600;
		border-right: 1px solid #e5e7eb;
	}

	.vehicle-row td:last-child {
		border-right: none;
	}

	.vehicle-code {
		color: #2563eb;
		font-size: 1rem;
		width: 25%;
	}

	.vehicle-name {
		color: #0f172a;
		font-size: 1rem;
		width: 50%;
	}

	.fuel-amount {
		color: #059669;
		font-size: 1rem;
		text-align: right;
		width: 25%;
	}

	.odo-row td {
		padding: 0.5rem 0.75rem;
		border-right: 1px solid #f1f5f9;
	}

	.odo-row td:last-child {
		border-right: none;
	}

	.odo-label {
		color: #64748b;
		font-weight: 600;
		font-size: 1rem;
		width: 25%;
	}

	.odo-value {
		color: #374151;
		font-family: monospace;
		font-size: 1rem;
		font-weight: 600;
	}

	.spacer-row td {
		padding: 0.5rem;
		border-bottom: 2px solid #e5e7eb;
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
			padding: 0;
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
		
		.simple-table-container {
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
		
		.simple-table-container {
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