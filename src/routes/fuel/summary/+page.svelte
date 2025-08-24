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

	<div class="summary-header">
		<div class="header-content">
			<h1>Fuel Summary</h1>
			<p class="header-subtitle">Logbook transcription ready</p>
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
						<div class="card-header">
							<div class="time-badge">{entry.time}</div>
							<div class="fuel-display">
								{entry.litres_dispensed.toFixed(1)}<span class="fuel-unit">L</span>
							</div>
						</div>
						
						<div class="card-body">
							<div class="vehicle-info">
								<div class="vehicle-code">{entry.vehicles?.code || 'N/A'}</div>
								<div class="vehicle-name">{entry.vehicles?.name || 'N/A'}</div>
							</div>
							
							<div class="operation-details">
								<div class="detail-item">
									<span class="detail-label">Driver</span>
									<span class="detail-value">{entry.drivers?.name || 'N/A'}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Activity</span>
									<span class="detail-value">{entry.activities?.name || 'N/A'}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Location</span>
									<span class="detail-value">{getLocation(entry)}</span>
								</div>
							</div>
							
							<div class="odometer-section">
								<div class="odo-reading">
									<span class="odo-label">Start</span>
									<span class="odo-value">{formatOdometerValue(entry.odometer_start, entry.gauge_working)}</span>
								</div>
								<div class="odo-arrow">→</div>
								<div class="odo-reading">
									<span class="odo-label">End</span>
									<span class="odo-value">{formatOdometerValue(entry.odometer_end, entry.gauge_working)}</span>
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
				<div class="logbook-entry">
					<div class="logbook-header">
						<div class="vehicle-badge">{entry.vehicles?.code || 'N/A'}</div>
						<div class="vehicle-title">{entry.vehicles?.name || 'N/A'}</div>
						<div class="fuel-badge">{entry.litres_dispensed.toFixed(1)}L</div>
					</div>
					
					<div class="odometer-grid">
						<div class="odo-item">
							<div class="odo-label">Start</div>
							<div class="odo-value">{formatOdometerValue(entry.odometer_start, entry.gauge_working)}</div>
						</div>
						<div class="odo-item">
							<div class="odo-label">End</div>
							<div class="odo-value">{formatOdometerValue(entry.odometer_end, entry.gauge_working)}</div>
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
		position: relative;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		min-height: 100vh;
	}
	
	/* Header */
	.summary-header {
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		color: white;
		padding: 2rem;
		margin-bottom: 2rem;
		border-radius: 0 0 24px 24px;
		box-shadow: 0 8px 32px rgba(249, 115, 22, 0.2);
	}

	.header-content h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		line-height: 1.1;
	}

	.header-subtitle {
		font-size: 1rem;
		opacity: 0.9;
		margin: 0;
		font-weight: 400;
	}

	.header-controls {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-top: 1.5rem;
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
		padding: 0 2rem;
	}

	.entries-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.fuel-entry-card {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 16px;
		padding: 1.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
	}

	.fuel-entry-card:hover {
		border-color: #f97316;
		box-shadow: 0 12px 32px rgba(249, 115, 22, 0.15);
		transform: translateY(-4px);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.time-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.375rem 0.875rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: monospace;
	}

	.fuel-display {
		font-size: 1.5rem;
		font-weight: 700;
		color: #059669;
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
	}

	.fuel-unit {
		font-size: 1rem;
		font-weight: 500;
		opacity: 0.8;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.vehicle-info {
		text-align: center;
		padding: 0.75rem;
		background: #fafbfc;
		border-radius: 12px;
	}

	.vehicle-code {
		font-size: 1rem;
		font-weight: 700;
		color: #2563eb;
		margin-bottom: 0.25rem;
		font-family: monospace;
	}

	.vehicle-name {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.operation-details {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		font-size: 0.875rem;
		border-bottom: 1px solid #f9fafb;
	}

	.detail-item:last-child {
		border-bottom: none;
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

	.odometer-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(135deg, #fef3e2, #fed7aa);
		padding: 1rem;
		border-radius: 12px;
		gap: 1rem;
	}

	.odo-reading {
		text-align: center;
		flex: 1;
	}

	.odo-reading .odo-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.odo-reading .odo-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #92400e;
		font-family: monospace;
	}

	.odo-arrow {
		font-size: 1.5rem;
		color: #f97316;
		font-weight: bold;
	}

	/* Mobile Logbook View */
	.logbook-container {
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.logbook-entry {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 16px;
		padding: 1.25rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.logbook-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.vehicle-badge {
		background: #f3f4f6;
		color: #374151;
		padding: 0.5rem 0.875rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 700;
		font-family: monospace;
		flex-shrink: 0;
	}

	.vehicle-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.fuel-badge {
		background: linear-gradient(135deg, #059669, #047857);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 1rem;
		font-weight: 700;
		box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
	}

	.odometer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.odo-item {
		background: linear-gradient(135deg, #fef3e2, #fed7aa);
		padding: 1rem;
		border-radius: 12px;
		text-align: center;
	}

	.odo-item .odo-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.odo-item .odo-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #92400e;
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
		.summary-header {
			padding: 1.5rem 1rem;
			border-radius: 0 0 16px 16px;
		}

		.header-content h1 {
			font-size: 2rem;
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
			padding: 0 1rem;
		}

		.entries-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
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