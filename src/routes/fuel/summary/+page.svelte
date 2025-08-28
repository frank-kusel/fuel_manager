<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import supabaseService from '$lib/services/supabase';

	interface FuelSummaryEntry {
		id: string;
		entry_date: string;
		time: string;
		vehicles?: { code: string; name: string };
		drivers?: { employee_code: string; name: string };
		activities?: { name: string; code?: string };
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
	let expandedEntry = $state<string | null>(null);

	onMount(() => {
		if (browser) {
			loadEntries();
		}
	});

	async function loadEntries() {
		try {
			loading = true;
			await supabaseService.init();

			const { data, error: fetchError } = await supabaseService['client']
				.from('fuel_entries')
				.select(
					`
					*,
					vehicles!left(code, name),
					drivers!left(employee_code, name),
					activities!left(name, code),
					fields!left(code, name),
					zones!left(code, name)
				`
				)
				.eq('entry_date', selectedDate)
				.order('time', { ascending: false });

			if (fetchError) throw fetchError;

			entries = data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load entries';
		} finally {
			loading = false;
		}
	}

	function formatOdometerValue(value: number | null, gaugeWorking: boolean | null): string {
		if (gaugeWorking === false) return 'Broken';
		if (value === null || value === undefined) return 'N/A';
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).replace(/,/g, ' ');
	}

	function formatNumber(value: number | null): string {
		if (value === null || value === undefined) return '-';
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}).replace(/,/g, ' ');
	}

	let summaryStats = $derived.by(() => {
		if (!entries || entries.length === 0) {
			return {
				totalFuel: 0,
				openingReading: null,
				closingReading: null
			};
		}
		
		const sortedEntries = [...entries].sort((a, b) => a.time.localeCompare(b.time));
		const totalFuel = entries.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
		const firstEntry = sortedEntries[0];
		const lastEntry = sortedEntries[sortedEntries.length - 1];
		const openingReading = firstEntry?.bowser_reading_start || null;
		const closingReading = lastEntry?.bowser_reading_end || null;
		
		return {
			totalFuel,
			openingReading,
			closingReading
		};
	});
</script>

<svelte:head>
	<title>Fuel Summary - {selectedDate}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="container">
	<header class="header">
		<h1 class="header-title">Summary</h1>
		<input type="date" bind:value={selectedDate} on:change={loadEntries} class="date-picker" />
	</header>

	{#if loading}
		<div class="state-container">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="state-container">
			<p class="error-message">{error}</p>
		</div>
	{:else if entries.length === 0}
		<div class="state-container">
			<p>No entries for {selectedDate}.</p>
		</div>
	{:else}
		<div class="content">
			<section class="total-fuel-section">
				<div class="total-fuel-value">
					<span class="total-fuel-amount">{summaryStats.totalFuel.toFixed(1)}</span>
					<span class="total-fuel-unit">L</span>
				</div>
				{#if summaryStats.openingReading !== null && summaryStats.closingReading !== null}
					<div class="bowser-readings">
						<div class="bowser-reading">
							<span class="bowser-label">Opening</span>
							<span class="bowser-value">{summaryStats.openingReading.toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, ' ')}</span>
						</div>
						<div class="bowser-reading">
							<span class="bowser-label">Closing</span>
							<span class="bowser-value">{summaryStats.closingReading.toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, ' ')}</span>
						</div>
					</div>
				{/if}
			</section>

			<section class="entries-section">
				<div class="entries-list">
					{#each entries as entry (entry.id)}
						<div class="entry-card" class:expanded={expandedEntry === entry.id}>
							<div class="entry-card-header" on:click={() => expandedEntry = expandedEntry === entry.id ? null : entry.id}>
								<div class="entry-vehicle-info">
									<p class="entry-vehicle-code">{entry.vehicles?.code || 'N/A'}</p>
									<p class="entry-vehicle-name">{entry.vehicles?.name || 'Vehicle'}</p>
								</div>
								<div class="entry-header-right">
									<p class="entry-fuel-amount">+ {entry.litres_dispensed.toFixed(1)} L</p>
									<span class="expand-arrow" class:expanded={expandedEntry === entry.id}>›</span>
								</div>
							</div>
							<div class="entry-card-details">
								<!-- Compact metrics layout -->
								<div class="metrics-compact">
									<!-- Odometer row -->
									<div class="metric-row">
										<div class="metric-label">Odometer</div>
										<div class="metric-value">{formatOdometerValue(entry.odometer_start, entry.gauge_working)}</div>
										<div class="metric-value">{formatOdometerValue(entry.odometer_end, entry.gauge_working)}</div>
									</div>
									
									<!-- Bowser row -->
									<div class="metric-row">
										<div class="metric-label">Bowser</div>
										<div class="metric-value">{formatNumber(entry.bowser_reading_start)}</div>
										<div class="metric-value">{formatNumber(entry.bowser_reading_end)}</div>
									</div>
								</div>
								
								<!-- Context info with usage - compact -->
								<div class="context-bar">
									<div class="context-info">
										{#if (entry.odometer_end && entry.odometer_start)}
											<span class="context-value usage">{formatNumber(entry.odometer_end - entry.odometer_start)} km</span>
											<span class="context-separator">•</span>
										{/if}
										<span class="context-value">{entry.activities?.code || entry.activities?.name || 'N/A'}</span>
										<span class="context-separator">•</span>
										<span class="context-value">{entry.fields?.code || entry.zones?.code || 'N/A'}</span>
									</div>
									<div class="entry-time">{entry.time}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		font-family: 'Inter', sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		background-color: #ffffff;
	}

	.container {
		max-width: 420px;
		margin: 0 auto;
		background-color: #ffffff;
		min-height: 100vh;
	}

	.header {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.date-picker {
		font-size: 0.875rem;
		border: 1px solid #f1f5f9;
		border-radius: 4px;
		padding: 0.375rem 0.5rem;
		background: #fafafa;
		color: #374151;
		font-weight: 500;
	}

	.date-picker:focus {
		outline: none;
		border-color: #e5e7eb;
		background: white;
	}

	.state-container {
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.error-message {
		color: #ef4444;
	}

	.content {
		padding: 0 1rem 1.5rem;
	}

	.total-fuel-section {
		text-align: center;
		margin-bottom: 2rem;
	}

	.total-fuel-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.total-fuel-value {
		margin: 0.5rem 0;
	}

	.total-fuel-amount {
		font-size: 3.75rem;
		font-weight: 800;
	}

	.total-fuel-unit {
		font-size: 1.5rem;
		font-weight: 700;
		color: #9ca3af;
		margin-left: 0.25rem;
	}

	.bowser-readings {
		display: flex;
		gap: 3rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.bowser-reading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.bowser-label {
		font-size: 0.7rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.bowser-value {
		font-size: 1.125rem;
		color: #374151;
		font-weight: 700;
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.entry-card {
		background-color: #f9fafb;
		border-radius: 1rem;
		transition: all 0.3s ease;
	}

	.entry-card-header {
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		cursor: pointer;
	}

	.entry-vehicle-info {
		flex-grow: 1;
	}

	.entry-vehicle-code {
		font-weight: 700;
		margin: 0;
	}

	.entry-vehicle-name {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
	}

	.entry-header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.entry-fuel-amount {
		font-weight: 700;
		font-size: 1.125rem;
		color: #2563eb;
		margin: 0;
	}

	.expand-arrow {
		font-size: 1.25rem;
		color: #9ca3af;
		transition: transform 0.2s ease, color 0.2s ease;
		font-weight: 600;
	}

	.expand-arrow.expanded {
		transform: rotate(90deg);
		color: #6b7280;
	}

	.entry-card-details {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.15s ease-out, padding 0.15s ease-out;
		padding: 0 1rem;
	}

	.entry-card.expanded .entry-card-details {
		max-height: 400px;
		padding: 1rem 1rem 0.5rem;
		border-top: 1px solid #e5e7eb;
	}

	/* Ultra-compact metrics layout */
	.metrics-compact {
		margin-bottom: 0.5rem;
	}

	.metric-row {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 0.25rem;
		padding: 0.125rem 0;
	}

	.metric-row:last-child {
		margin-bottom: 0;
	}

	.metric-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		min-width: 70px;
	}

	.metric-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
		font-variant-numeric: tabular-nums;
		text-align: right;
		min-width: 80px;
	}

	.context-value.usage {
		color: #059669;
		font-weight: 600;
	}

	/* Context bar */
	.context-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		margin-top: 0.25rem;
	}

	.context-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.context-value {
		font-weight: 600;
		color: #374151;
	}

	.context-separator {
		color: #d1d5db;
		font-weight: 400;
	}

	.entry-time {
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 500;
	}
</style>