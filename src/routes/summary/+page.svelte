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

			// Get date range for last 30 days
			const endDate = new Date().toISOString().split('T')[0];
			const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
				.gte('entry_date', startDate)
				.lte('entry_date', endDate)
				.order('entry_date', { ascending: false })
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

	// Group entries by date and calculate daily summaries
	let dailySummaries = $derived.by(() => {
		if (!entries || entries.length === 0) {
			return [];
		}

		// Group entries by date
		const grouped = entries.reduce((acc, entry) => {
			if (!acc[entry.entry_date]) {
				acc[entry.entry_date] = [];
			}
			acc[entry.entry_date].push(entry);
			return acc;
		}, {} as Record<string, FuelSummaryEntry[]>);

		// Create daily summaries
		return Object.entries(grouped).map(([date, dayEntries]) => {
			const sortedEntries = [...dayEntries].sort((a, b) => a.time.localeCompare(b.time));
			const totalFuel = dayEntries.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
			const firstEntry = sortedEntries[0];
			const lastEntry = sortedEntries[sortedEntries.length - 1];
			const openingReading = firstEntry?.bowser_reading_start || null;
			const closingReading = lastEntry?.bowser_reading_end || null;

			return {
				date,
				totalFuel,
				openingReading,
				closingReading,
				entries: dayEntries.sort((a, b) => b.time.localeCompare(a.time)) // Most recent first
			};
		}).sort((a, b) => b.date.localeCompare(a.date)); // Most recent date first
	});

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-ZA', { 
				weekday: 'long', 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			});
		}
	}
</script>

<svelte:head>
	<title>Fuel Summary</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="container">
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Summary</h1>
		</div>
	</div>

	{#if loading}
		<div class="state-container">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="state-container">
			<p class="error-message">{error}</p>
		</div>
	{:else if dailySummaries.length === 0}
		<div class="state-container">
			<p>No fuel entries found in the last 30 days.</p>
		</div>
	{:else}
		<div class="content">
			<!-- Timeline of daily summaries -->
			{#each dailySummaries as daySummary (daySummary.date)}
				<section class="day-section">
					<!-- Date header -->
					<div class="day-header">
						<h2 class="day-title">{formatDate(daySummary.date)}</h2>
						<div class="day-date">{daySummary.date}</div>
					</div>

					<!-- Daily summary stats -->
					<div class="daily-summary">
						<div class="total-fuel-value">
							<span class="total-fuel-amount">{daySummary.totalFuel.toFixed(1)}</span>
							<span class="total-fuel-unit">L</span>
						</div>
						{#if daySummary.openingReading !== null && daySummary.closingReading !== null}
							<div class="bowser-readings">
								<div class="bowser-reading">
									<span class="bowser-label">Opening</span>
									<span class="bowser-value">{daySummary.openingReading.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/,/g, ' ')}</span>
								</div>
								<div class="bowser-reading">
									<span class="bowser-label">Closing</span>
									<span class="bowser-value">{daySummary.closingReading.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/,/g, ' ')}</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Entries for this day -->
					<div class="entries-list">
						{#each daySummary.entries as entry (entry.id)}
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
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Body styles now handled globally in app.css */

	.container {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

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

	.header-actions {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
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
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Day sections */
	.day-section {
		margin-bottom: 1.5rem;
	}

	.day-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem 0;
	}

	.day-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
	}

	.day-date {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.daily-summary {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 1rem;
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
		gap: 4rem;
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
		font-size: 1rem;
		margin: 0;
	}

	.entry-vehicle-name {
		font-size: 0.875rem;
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

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.container {
			padding: 0;
			gap: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}

		.content {
			padding: 0;
			gap: 1.5rem;
		}

		.day-header {
			padding: 0.75rem 0;
			margin-bottom: 1rem;
		}

		.day-title {
			font-size: 1.125rem;
		}

		.daily-summary {
			padding: 1rem;
			margin-bottom: 1rem;
		}
	}
</style>