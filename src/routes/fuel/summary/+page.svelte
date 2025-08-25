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
		gauge_working: boolean | null;
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
					activities!left(name, code),
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
					activities!left(name, code),
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
				// Debug vehicle data structure
				console.log(`Entry ${index + 1} VEHICLE DEBUG:`, {
					vehicles_raw: entry.vehicles,
					vehicles_keys: entry.vehicles ? Object.keys(entry.vehicles) : 'null',
					vehicles_code: entry.vehicles?.code,
					vehicles_name: entry.vehicles?.name,
					vehicles_stringified: JSON.stringify(entry.vehicles)
				});
				
				console.log(`Entry ${index + 1} USAGE DEBUG:`, {
					odometer_start: entry.odometer_start,
					odometer_start_type: typeof entry.odometer_start,
					odometer_end: entry.odometer_end,
					odometer_end_type: typeof entry.odometer_end,
					gauge_working: entry.gauge_working,
					gauge_working_type: typeof entry.gauge_working,
					calculation: entry.odometer_start !== null && entry.odometer_end !== null && entry.gauge_working !== false,
					result: (entry.odometer_start !== null && entry.odometer_end !== null && entry.gauge_working !== false) ? (entry.odometer_end - entry.odometer_start) : 'N/A'
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

	function formatOdometerValue(value: number | null, gaugeWorking: boolean | null): string {
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

	<div class="dashboard-header">
		<div class="header-content">
			<h1>Fuel Summary</h1>
		</div>
	</div>
	
	<div class="header-controls">
		<div class="date-control">
			<label for="date">Date</label>
			<input 
				id="date"
				type="date" 
				bind:value={selectedDate}
				onchange={loadEntries}
				class="date-input"
			/>
		</div>
		
		<div class="action-controls desktop-only">
			<Button size="sm" variant="outline" onclick={loadEntries}>
				Refresh
			</Button>
			<Button size="sm" variant="outline" onclick={() => window.print()}>
				Print
			</Button>
			<Button size="sm" onclick={exportToCSV}>
				Export
			</Button>
		</div>
	</div>
	
	{#if loading}
		<div class="loading-state">
			<div class="loading-grid">
				{#each Array(6) as _}
					<div class="entry-skeleton">
						<div class="skeleton-header"></div>
						<div class="skeleton-body">
							<div class="skeleton-line"></div>
							<div class="skeleton-line short"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if error}
		<div class="error-state">
			<div class="error-visual">
				<div class="error-icon">⚠</div>
			</div>
			<h4>Failed to load entries</h4>
			<p>{error}</p>
		</div>
	{:else if entries.length === 0}
		<div class="empty-state">
			<div class="empty-visual">
				<div class="fuel-drop"></div>
			</div>
			<h4>No entries found</h4>
			<p>No fuel entries recorded for {selectedDate}</p>
		</div>
	{:else}
		
		<!-- Desktop Card Grid -->
		<div class="entries-container desktop-only">
			<div class="entries-grid">
				{#each entries as entry}
					<div class="fuel-entry-card">
						<!-- Primary Info Header -->
						<div class="card-header">
							<div class="vehicle-primary">
								<div class="vehicle-code">
									{entry.vehicles?.code || 'N/A'} • {entry.vehicles?.name || 'Vehicle'}
								</div>
							</div>
							<div class="fuel-primary">
								<div class="fuel-amount">{entry.litres_dispensed.toFixed(1)}L</div>
								<div class="time-stamp">{entry.time}</div>
							</div>
						</div>

						<!-- Key Metrics Row -->
						<div class="metrics-row">
							<div class="metric-item recorded">
								<div class="metric-value recorded-value">{formatOdometerValue(entry.odometer_start, entry.gauge_working)}</div>
								<div class="metric-label">Start ODO</div>
							</div>
							<div class="metric-item recorded">
								<div class="metric-value recorded-value">{formatOdometerValue(entry.odometer_end, entry.gauge_working)}</div>
								<div class="metric-label">End ODO</div>
							</div>
							<div class="metric-item calculated">
								<div class="metric-value calculated-value">{(typeof entry.odometer_start === 'number' && typeof entry.odometer_end === 'number' && entry.gauge_working !== false) ? (entry.odometer_end - entry.odometer_start).toFixed(1) : '-'}</div>
								<div class="metric-label">Usage</div>
							</div>
						</div>

						<!-- Details Grid -->
						<div class="details-grid">
							<div class="detail-group">
								<div class="detail-row">
									<span class="detail-label">Driver</span>
									<span class="detail-value">{entry.drivers?.name || 'N/A'}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Activity</span>
									<span class="detail-value activity-value">{entry.activities?.code || entry.activities?.name || 'N/A'}</span>
								</div>
							</div>
							<div class="detail-group">
								<div class="detail-row">
									<span class="detail-label">Field</span>
									<span class="detail-value field-value">{getLocation(entry)}</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">Bowser</span>
									<span class="detail-value bowser-value">{entry.bowser_reading_end || '-'}</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
		
		<!-- Mobile Logbook View -->
		<div class="logbook-container mobile-only">
			{#each entries as entry}
				<div class="mobile-fuel-card">
					<!-- Mobile Header -->
					<div class="mobile-header">
						<div class="mobile-vehicle-info">
							<div class="mobile-vehicle-code">{entry.vehicles?.code || 'N/A'}</div>
							<div class="mobile-vehicle-name">{entry.vehicles?.name || 'Vehicle'}</div>
						</div>
						<div class="mobile-fuel-info">
							<div class="mobile-fuel">{entry.litres_dispensed.toFixed(1)}L</div>
							<div class="mobile-time">{entry.time}</div>
						</div>
					</div>

					<!-- Mobile Odometer Row -->
					<div class="mobile-odo-row">
						<div class="mobile-odo-item recorded">
							<div class="mobile-odo-value">{formatOdometerValue(entry.odometer_start, entry.gauge_working)}</div>
							<div class="mobile-odo-label">Start</div>
						</div>
						<div class="mobile-odo-item recorded">
							<div class="mobile-odo-value">{formatOdometerValue(entry.odometer_end, entry.gauge_working)}</div>
							<div class="mobile-odo-label">End</div>
						</div>
						<div class="mobile-odo-item calculated">
							<div class="mobile-odo-value">{(typeof entry.odometer_start === 'number' && typeof entry.odometer_end === 'number' && entry.gauge_working !== false) ? (entry.odometer_end - entry.odometer_start).toFixed(1) : '-'}</div>
							<div class="mobile-odo-label">Usage</div>
						</div>
					</div>

					<!-- Mobile Details -->
					<div class="mobile-details">
						<div class="mobile-detail">
							<span>{entry.activities?.code || entry.activities?.name || 'Activity'}</span>
						</div>
						<div class="mobile-detail">
							<span>{entry.fields?.code || 'Field'}</span>
						</div>
						<div class="mobile-detail">
							<span>B: {entry.bowser_reading_end || '-'}</span>
						</div>
					</div>
				</div>
			{/each}
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
		background: rgba(249, 115, 22, 0.1);
		border-radius: 50%;
		backdrop-filter: blur(10px);
	}

	.pull-arrow,
	.refresh-ready {
		font-size: 1.25rem;
		color: #f97316;
		font-weight: bold;
	}

	.refresh-ready {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Main Container */
	.fuel-summary {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		min-height: 100vh;
	}
	
	/* Header - matching Dashboard style */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.header-content h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.header-controls {
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		color: white;
		padding: 1.5rem;
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(249, 115, 22, 0.2);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
	}

	.date-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.date-control label {
		font-size: 0.875rem;
		font-weight: 500;
		opacity: 0.9;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.date-input {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		padding: 0.75rem;
		color: white;
		font-size: 1rem;
		font-weight: 500;
		backdrop-filter: blur(10px);
	}

	.date-input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
	}

	.action-controls {
		display: flex;
		gap: 0.75rem;
	}

	/* Desktop Card Grid */
	.entries-container {
		padding: 0;
	}

	.entries-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.fuel-entry-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.25rem;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.fuel-entry-card:hover {
		border-color: #f97316;
		box-shadow: 0 8px 25px rgba(249, 115, 22, 0.12);
		transform: translateY(-2px);
	}

	/* Primary Header */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.vehicle-primary {
		flex: 1;
		min-width: 0;
	}

	.vehicle-code {
		font-size: 0.95rem;
		font-weight: 700;
		color: #111827;
		line-height: 1.3;
		word-break: break-word;
	}

	.fuel-primary {
		text-align: right;
		flex-shrink: 0;
	}

	.fuel-amount {
		font-size: 1.75rem;
		font-weight: 800;
		color: #059669;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.time-stamp {
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 600;
		font-family: monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Metrics Row */
	.metrics-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
		margin-bottom: 1rem;
		justify-content: space-between;
	}

	.metric-item {
		text-align: center;
		flex: 1;
	}

	.metric-value {
		font-size: 1.375rem;
		font-weight: 700;
		color: #111827;
		font-family: monospace;
		margin-bottom: 0.25rem;
		line-height: 1;
	}

	/* Recorded vs Calculated Value Styling */
	.recorded-value {
		border-bottom: 2px solid #e2e8f0;
	}

	.calculated-value {
		font-style: italic;
		color: #6b7280;
	}

	.metric-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-separator {
		font-size: 1.25rem;
		color: #9ca3af;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* Details Grid */
	.details-grid {
		display: grid;
		grid-template-columns: 0.7fr 1.3fr;
		gap: 1rem;
	}

	.detail-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #111827;
		font-weight: 600;
		text-align: right;
		font-family: monospace;
	}

	/* Activity and Field styling */
	.activity-value,
	.field-value {
		font-size: 1rem !important;
		font-weight: 700 !important;
	}

	/* Bowser reading styling */
	.bowser-value {
		font-size: 1rem !important;
		font-weight: 700 !important;
	}

	/* Activity display styling */
	.activity-display {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
	}

	.activity-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.activity-codes {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
	}

	.activity-code {
		font-family: monospace;
		font-weight: 600;
		color: #374151;
	}

	.activity-legacy {
		font-family: monospace;
		font-size: 0.625rem;
		color: #9ca3af;
		font-weight: 400;
	}

	/* Mobile activity display styling */
	.mobile-activity-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.mobile-activity-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: #374151;
		line-height: 1.2;
	}

	.mobile-activity-codes {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.625rem;
	}

	.mobile-activity-code {
		font-family: monospace;
		font-weight: 600;
		color: #4b5563;
	}

	.mobile-activity-legacy {
		font-family: monospace;
		font-size: 0.5rem;
		color: #9ca3af;
		font-weight: 400;
	}


	/* Mobile Logbook View */
	/* Mobile Cards */
	.logbook-container {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.mobile-fuel-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.mobile-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.mobile-vehicle-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.mobile-vehicle-code {
		font-size: 1rem;
		font-weight: 700;
		color: #111827;
		font-family: monospace;
	}

	.mobile-vehicle-name {
		font-size: 1rem;
		font-weight: 600;
		color: #4b5563;
		line-height: 1.2;
		word-break: break-word;
	}

	.mobile-fuel-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.mobile-time {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		font-family: monospace;
	}

	.mobile-fuel {
		font-size: 1.25rem;
		font-weight: 800;
		color: #059669;
		line-height: 1;
	}

	.mobile-odo-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 6px;
		margin-bottom: 0.75rem;
		gap: 0.5rem;
	}

	.mobile-odo-item {
		text-align: center;
		flex: 1;
	}

	.mobile-odo-value {
		font-size: 1rem;
		font-weight: 700;
		color: #111827;
		font-family: monospace;
		margin-bottom: 0.125rem;
	}

	/* Mobile Recorded vs Calculated Styling */
	.mobile-odo-item.recorded .mobile-odo-value {
		border-bottom: 2px solid #e2e8f0;
	}

	.mobile-odo-item.calculated .mobile-odo-value {
		font-style: italic;
		color: #6b7280;
	}

	.mobile-odo-label {
		font-size: 0.625rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mobile-arrow {
		font-size: 0.875rem;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.mobile-details {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.mobile-detail {
		text-align: center;
		padding: 0.375rem;
		background: #f1f5f9;
		border-radius: 4px;
	}

	/* Activity and Field mobile details - smaller width */
	.mobile-detail:nth-child(1),
	.mobile-detail:nth-child(2) {
		flex: 0.8;
	}

	/* Bowser mobile detail - larger width */
	.mobile-detail:nth-child(3) {
		flex: 1.4;
	}

	.mobile-detail span {
		font-size: 0.75rem;
		color: #374151;
		font-weight: 500;
	}

	/* Activity and Field mobile text - larger font */
	.mobile-detail:nth-child(1) span,
	.mobile-detail:nth-child(2) span {
		font-size: 0.875rem;
		font-weight: 600;
	}

	/* Bowser mobile text - larger font */
	.mobile-detail:nth-child(3) span {
		font-size: 0.875rem;
		font-weight: 600;
		font-family: monospace;
	}


	/* Loading States */
	.loading-state {
		padding: 2rem;
	}

	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.entry-skeleton {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.skeleton-header {
		height: 2rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.skeleton-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-line {
		height: 1rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 6px;
	}

	.skeleton-line.short {
		width: 60%;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty & Error States */
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		min-height: 300px;
	}

	.empty-visual,
	.error-visual {
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

	.error-icon {
		width: 60px;
		height: 60px;
		background: linear-gradient(135deg, #ef4444, #dc2626);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
	}

	.empty-state h4,
	.error-state h4 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p,
	.error-state p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
		max-width: 350px;
	}

	/* Responsive Design */
	.desktop-only {
		display: block;
	}
	
	.mobile-only {
		display: none;
	}
	
	@media (max-width: 768px) {
		.fuel-summary {
			padding: 0;
			gap: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}

		.header-controls {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.action-controls {
			justify-content: center;
		}
		
		.desktop-only {
			display: none;
		}
		
		.mobile-only {
			display: block;
		}

		.entries-container {
			padding: 0;
		}

		.entries-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.metrics-row {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
	
	/* Print Styles */
	@media print {
		.summary-header {
			background: none;
			color: #111827;
			border-bottom: 2px solid #e5e7eb;
			box-shadow: none;
		}
		
		.header-controls {
			display: none;
		}
		
		.mobile-only {
			display: none;
		}
		
		.desktop-only {
			display: block !important;
		}

		.fuel-entry-card {
			page-break-inside: avoid;
			margin-bottom: 1rem;
		}
	}
</style>