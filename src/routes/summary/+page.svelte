<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import supabaseService from '$lib/services/supabase';
	import { summaryCacheStore } from '$lib/stores/summary-cache';

	interface FuelSummaryEntry {
		id: string;
		entry_date: string;
		time: string;
		field_selection_mode?: 'single' | 'multiple';
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
	let fieldNamesMap = $state<Record<string, string>>({}); // entryId -> comma-separated field names
	let actionMessage = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let actingEntryId = $state<string | null>(null);

	onMount(() => {
		if (browser) {
			// Check if we have valid cached data
			const cachedData = summaryCacheStore.getCachedData();
			if (cachedData) {
				// Use cached data for instant load
				entries = cachedData.entries;
				fieldNamesMap = cachedData.fieldNamesMap;
				loading = false;
			} else {
				// Load fresh data
				loadEntries();
			}
		}
	});

	function getLocalDateKey(date = new Date()): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function isToday(entryDate: string): boolean {
		return entryDate === getLocalDateKey();
	}

	function setActionStatus(message: string | null, errorMessage: string | null = null) {
		actionMessage = message;
		actionError = errorMessage;

		if (message && !errorMessage) {
			setTimeout(() => {
				if (actionMessage === message) {
					actionMessage = null;
				}
			}, 3000);
		}
	}

	// Helper function to fetch field names for ALL entries (field_id is deprecated, all fields now in junction table)
	// OPTIMIZED: Single batched query instead of N queries (fixes N+1 problem)
	async function fetchFieldNamesForEntries(entries: FuelSummaryEntry[]) {
		// Only fetch for entries we don't have cached
		const entryIds = entries.map(e => e.id).filter(id => !fieldNamesMap[id]);
		if (entryIds.length === 0) return;

		try {
			const client = supabaseService.getClient();

			// Single query for all entries using IN clause
			const result = await client
				.from('fuel_entry_fields')
				.select(`
					fuel_entry_id,
					field_id,
					fields!inner(name, code)
				`)
				.in('fuel_entry_id', entryIds);

			if (result.data && result.data.length > 0) {
				// Group field names by entry_id
				const grouped = result.data.reduce((acc: Record<string, string[]>, row: any) => {
					if (!acc[row.fuel_entry_id]) {
						acc[row.fuel_entry_id] = [];
					}
					acc[row.fuel_entry_id].push(row.fields.name || row.fields.code);
					return acc;
				}, {});

				// Convert to comma-separated strings
				const newMap: Record<string, string> = {};
				for (const [entryId, fields] of Object.entries(grouped)) {
					newMap[entryId] = fields.join(', ');
				}

				// Merge with existing map to trigger reactivity
				fieldNamesMap = { ...fieldNamesMap, ...newMap };
			}
		} catch (error) {
			console.error('Failed to fetch fields for entries:', error);
		}
	}

	async function loadEntries() {
		try {
			loading = true;
			summaryCacheStore.setLoading(true);
			await supabaseService.init();
			const client = supabaseService.getClient();

			// Get date range for last 30 days
			const endDate = new Date().toISOString().split('T')[0];
			const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

			// OPTIMIZED: Fetch entries and field names in parallel
			const [entriesResult, fieldNamesResult] = await Promise.all([
				// Query 1: Fetch entries
				client
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
					.is('deleted_at', null)
					.gte('entry_date', startDate)
					.lte('entry_date', endDate)
					.order('entry_date', { ascending: false })
					.order('time', { ascending: false }),

				// Query 2: Fetch field names for all entries in date range (parallel)
				client
					.from('fuel_entry_fields')
					.select(`
						fuel_entry_id,
						field_id,
						fields!inner(name, code),
						fuel_entries!inner(entry_date, deleted_at)
					`)
					.gte('fuel_entries.entry_date', startDate)
					.lte('fuel_entries.entry_date', endDate)
					.is('fuel_entries.deleted_at', null)
			]);

			if (entriesResult.error) throw entriesResult.error;

			entries = entriesResult.data || [];

			// Process field names result (if available)
			if (fieldNamesResult.data && fieldNamesResult.data.length > 0) {
				const grouped = fieldNamesResult.data.reduce((acc: Record<string, string[]>, row: any) => {
					if (!acc[row.fuel_entry_id]) {
						acc[row.fuel_entry_id] = [];
					}
					acc[row.fuel_entry_id].push(row.fields.name || row.fields.code);
					return acc;
				}, {});

				const newMap: Record<string, string> = {};
				for (const [entryId, fields] of Object.entries(grouped)) {
					newMap[entryId] = fields.join(', ');
				}

				fieldNamesMap = newMap;
			}

			// Update cache with loaded data
			summaryCacheStore.updateCache(entries, fieldNamesMap);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to load entries';
			error = errorMsg;
			summaryCacheStore.setError(errorMsg);
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

	// Get location display for an entry (prioritizes junction table since field_id is deprecated)
	function getLocationDisplay(entry: FuelSummaryEntry): string {
		// Priority 1: Check junction table (field_id column is deprecated, all fields now in junction table)
		if (fieldNamesMap[entry.id]) {
			return fieldNamesMap[entry.id];
		}

		// Priority 2: Check zone
		if (entry.zones?.name || entry.zones?.code) {
			return entry.zones.name || entry.zones.code;
		}

		// Priority 3: Legacy field_id for old entries (backward compatibility)
		if (entry.fields?.name || entry.fields?.code) {
			return entry.fields.name || entry.fields.code;
		}

		// No location selected
		return 'No location';
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

	// Manual refresh - invalidate cache and reload
	async function handleRefresh() {
		summaryCacheStore.invalidate();
		await loadEntries();
	}

	async function handleMoveEntry(entryId: string, direction: 'up' | 'down') {
		try {
			setActionStatus(null, null);
			actingEntryId = entryId;
			await supabaseService.init();

			const result = await supabaseService.moveFuelEntryWithinDay(entryId, direction);
			if (result.error) {
				throw new Error(result.error);
			}

			summaryCacheStore.invalidate();
			await loadEntries();
			setActionStatus(`Entry moved ${direction}.`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to move entry';
			setActionStatus(null, message);
		} finally {
			actingEntryId = null;
		}
	}

	async function handleDeleteEntry(entry: FuelSummaryEntry) {
		const vehicleLabel = entry.vehicles?.code || entry.vehicles?.name || 'this entry';
		const confirmed = window.confirm(`Delete ${vehicleLabel}? This will remove it from Summary but keep it for audit history.`);

		if (!confirmed) {
			return;
		}

		try {
			setActionStatus(null, null);
			actingEntryId = entry.id;
			await supabaseService.init();

			const result = await supabaseService.softDeleteFuelEntry(entry.id);
			if (result.error) {
				throw new Error(result.error);
			}

			if (expandedEntry === entry.id) {
				expandedEntry = null;
			}

			summaryCacheStore.invalidate();
			await loadEntries();
			setActionStatus('Entry deleted.');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete entry';
			setActionStatus(null, message);
		} finally {
			actingEntryId = null;
		}
	}

	// ---- Drag-to-reorder within a day (Todoist-style) ----
	// The dragged card follows the pointer 1:1; the other cards in the day
	// slide up/down in real time to open the gap where it will land. On drop,
	// reorder_fuel_entry positionally reassigns the day's times and rebuilds
	// the bowser chains.
	let dragging = $state<{ entryId: string; date: string } | null>(null);
	let dragTransforms = $state<Record<string, number>>({}); // px translateY per entry id
	let dropSlot = $state<number | null>(null); // insertion slot among the OTHER cards (0..n-1)

	// Non-reactive drag geometry, cached at drag start (visual DOM order)
	let dragCards: { id: string; top: number; height: number; mid: number }[] = [];
	let dragIndex = 0;
	let dragStartPointerY = 0;
	let dragShift = 0; // distance neighbours slide: card height + list gap

	function startDrag(e: PointerEvent, entryId: string, date: string) {
		if (actingEntryId) return;
		e.preventDefault();
		e.stopPropagation();
		const listEl = (e.currentTarget as HTMLElement).closest('.entries-list') as HTMLElement | null;
		if (!listEl) return;

		const els = [...listEl.querySelectorAll<HTMLElement>('.entry-card')];
		dragCards = els.map((el) => {
			const r = el.getBoundingClientRect();
			return { id: el.dataset.entryId || '', top: r.top, height: r.height, mid: r.top + r.height / 2 };
		});
		dragIndex = dragCards.findIndex((c) => c.id === entryId);
		if (dragIndex === -1) return;

		const self = dragCards[dragIndex];
		const neighbour = dragCards[dragIndex + 1] ?? dragCards[dragIndex - 1];
		const gap = neighbour ? Math.max(Math.abs(neighbour.top - self.top) - self.height, 0) : 8;
		dragShift = self.height + gap;
		dragStartPointerY = e.clientY;

		dragging = { entryId, date };
		dropSlot = null;
		dragTransforms = {};
		window.addEventListener('pointermove', onDragMove);
		window.addEventListener('pointerup', onDragEnd);
		window.addEventListener('pointercancel', cancelDrag);
	}

	function onDragMove(e: PointerEvent) {
		if (!dragging) return;
		e.preventDefault();
		const dy = e.clientY - dragStartPointerY;
		const center = dragCards[dragIndex].mid + dy;

		const next: Record<string, number> = { [dragging.entryId]: dy };
		let slot = 0;
		for (let i = 0; i < dragCards.length; i++) {
			if (i === dragIndex) continue;
			const card = dragCards[i];
			// A card below slides up once the dragged centre passes its midpoint;
			// a card above slides down once the centre rises past its midpoint.
			if (i > dragIndex && center > card.mid) next[card.id] = -dragShift;
			if (i < dragIndex && center < card.mid) next[card.id] = dragShift;
			// Others that remain visually above the dragged card define the slot
			if (card.mid < center) slot++;
		}
		dragTransforms = next;
		dropSlot = slot;
	}

	function teardownDragListeners() {
		window.removeEventListener('pointermove', onDragMove);
		window.removeEventListener('pointerup', onDragEnd);
		window.removeEventListener('pointercancel', cancelDrag);
	}

	function cancelDrag() {
		teardownDragListeners();
		dragging = null;
		dropSlot = null;
		dragTransforms = {};
	}

	async function onDragEnd() {
		teardownDragListeners();
		const drag = dragging;
		const slot = dropSlot;

		if (!drag || slot === null) {
			cancelDrag();
			return;
		}

		const day = dailySummaries.find((d) => d.date === drag.date);
		const count = day?.entries.length ?? 0;
		const currentVisual = day?.entries.findIndex((en) => en.id === drag.entryId) ?? -1;
		if (!day || currentVisual === -1 || slot === currentVisual) {
			cancelDrag();
			return;
		}

		// Insertion at slot s among the other cards = final visual index s.
		// Visual list is newest-first, so chronological position = count - s.
		const chronologicalPos = count - slot;

		try {
			setActionStatus(null, null);
			actingEntryId = drag.entryId;
			await supabaseService.init();

			const result = await supabaseService.reorderFuelEntry(drag.entryId, chronologicalPos);
			if (result.error) {
				throw new Error(result.error);
			}

			summaryCacheStore.invalidate();
			await loadEntries();
			// Clear transforms only once the DOM holds the new order, so the
			// cards the user arranged never visibly snap back.
			cancelDrag();

			const info = result.data;
			if (info?.moved) {
				const chains = info.bowsers_recalculated || 0;
				setActionStatus(
					`Entry moved to #${chronologicalPos} — ${chains} bowser chain${chains === 1 ? '' : 's'} recalculated.`
				);
			} else {
				setActionStatus('Entry already in that position.');
			}
		} catch (err) {
			cancelDrag();
			const message = err instanceof Error ? err.message : 'Failed to move entry';
			setActionStatus(null, message);
		} finally {
			actingEntryId = null;
		}
	}
</script>

<svelte:head>
	<title>Fuel Summary</title>
</svelte:head>

<div class="container">
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Summary</h1>
		</div>
		<button class="refresh-btn" onclick={handleRefresh} disabled={loading} title="Refresh data" aria-label="Refresh summary">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
			</svg>
		</button>
	</div>

	{#if actionMessage}
		<div class="action-feedback success">{actionMessage}</div>
	{:else if actionError}
		<div class="action-feedback error">{actionError}</div>
	{/if}

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
					</div>

					<!-- Daily summary stats -->
					<div class="daily-summary">
						<div class="entry-count-circle">{daySummary.entries.length}</div>
						<div class="total-fuel-value">
							<div class="fuel-amount-container">
								<span class="total-fuel-amount">{daySummary.totalFuel.toFixed(1)}</span>
								<span class="total-fuel-unit">L</span>
							</div>
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
					<div class="entries-list" class:reordering={dragging?.date === daySummary.date}>
						{#each daySummary.entries as entry, index (entry.id)}
							<div
								class="entry-card"
								class:expanded={expandedEntry === entry.id}
								class:drag-active={dragging?.entryId === entry.id}
								style:transform={dragTransforms[entry.id] ? `translateY(${dragTransforms[entry.id]}px)` : undefined}
								data-entry-id={entry.id}
							>
								<div class="entry-card-header" onclick={() => expandedEntry = expandedEntry === entry.id ? null : entry.id}>
									<div class="entry-vehicle-info">
										<div class="vehicle-code-container">
											<button
												class="drag-handle"
												title="Drag to reorder"
												aria-label="Drag to reorder entry"
												onpointerdown={(e) => startDrag(e, entry.id, daySummary.date)}
												onclick={(e) => e.stopPropagation()}
											>
												<svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true"><circle cx="4" cy="3" r="1.5"/><circle cx="10" cy="3" r="1.5"/><circle cx="4" cy="9" r="1.5"/><circle cx="10" cy="9" r="1.5"/><circle cx="4" cy="15" r="1.5"/><circle cx="10" cy="15" r="1.5"/></svg>
											</button>
											<span class="entry-number">#{daySummary.entries.length - index}</span>
											<div class="vehicle-info-main">
												<p class="entry-vehicle-name">{entry.vehicles?.name || 'Vehicle'}</p>
												<p class="entry-vehicle-code">{entry.vehicles?.code || 'N/A'}</p>
											</div>
										</div>
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
											<span class="context-value">{getLocationDisplay(entry)}</span>
										</div>
										<div class="entry-time-expanded">{entry.time}</div>
									</div>
									<div class="entry-actions">
										<button
											class="entry-action-btn"
											disabled={index === 0 || actingEntryId === entry.id}
											onclick={(e) => {
												e.stopPropagation();
												handleMoveEntry(entry.id, 'up');
											}}
										>
											Move Up
										</button>
										<button
											class="entry-action-btn"
											disabled={index === daySummary.entries.length - 1 || actingEntryId === entry.id}
											onclick={(e) => {
												e.stopPropagation();
												handleMoveEntry(entry.id, 'down');
											}}
										>
											Move Down
										</button>
										{#if isToday(daySummary.date)}
											<button
												class="entry-action-btn danger"
												disabled={actingEntryId === entry.id}
												onclick={(e) => {
													e.stopPropagation();
													handleDeleteEntry(entry);
												}}
											>
												Delete
											</button>
										{/if}
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

	.refresh-btn {
		padding: 0.625rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #f9fafb;
		border-color: var(--brand);
		color: var(--brand);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.refresh-btn:active:not(:disabled) {
		transform: rotate(180deg);
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

	.action-feedback {
		padding: 0.875rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.95rem;
		font-weight: 500;
	}

	.action-feedback.success {
		background: #ecfdf3;
		color: #166534;
		border: 1px solid #86efac;
	}

	.action-feedback.error {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fca5a5;
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
		position: sticky;
		top: 0;
		z-index: 10;
		/* Matches the page background so it reads as transparent, while
		   staying opaque under sticky scroll so the title remains legible. */
		background: var(--gray-100);
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem 0;
	}

	.day-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-800);
		margin: 0;
	}

	.daily-summary {
		position: relative;
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 1rem;
	}

	.entry-count-circle {
		position: absolute;
		top: 1rem;
		left: 1rem;
		width: 2rem;
		height: 2rem;
		background: var(--brand);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}


	.total-fuel-value {
		margin: 0.5rem 0;
	}
	
	.fuel-amount-container {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.5rem;
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
		background-color: #f1f5f9;
		border-radius: 1rem;
		transition: all 0.3s ease;
	}

	/* Drag-to-reorder */
	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0.35rem 0.3rem;
		margin: -0.25rem 0 0 -0.35rem;
		color: var(--gray-300);
		cursor: grab;
		touch-action: none; /* the handle is the drag surface — never scroll from it */
	}

	.drag-handle:hover {
		color: var(--gray-500);
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	/* While a drag is live, neighbours animate into their new slots… */
	.entries-list.reordering .entry-card {
		transition: transform 160ms ease;
	}

	/* …but the dragged card itself tracks the pointer 1:1 (no easing lag) */
	.entries-list.reordering .entry-card.drag-active {
		transition: none;
		position: relative;
		z-index: 30;
		scale: 1.02;
		background-color: var(--white);
		box-shadow: var(--shadow-xl);
		cursor: grabbing;
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
	
	.vehicle-code-container {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	
	.entry-number {
		font-size: 0.75rem;
		font-weight: 600;
		color: #9ca3af;
		opacity: 0.8;
		line-height: 1.2;
		margin-top: 0.1rem;
	}
	
	.vehicle-info-main {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.entry-vehicle-code {
		font-size: 0.8rem;
		color: #6b7280;
		margin: 0;
	}
	
	.entry-vehicle-name {

		font-weight: 700;
		font-size: 1rem;
		margin: 0;
		line-height: 1.2;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-variant-numeric: tabular-nums;
	}
	
	.entry-time-expanded {
		font-size: 0.8rem;
		color: #9ca3af;
		font-weight: 500;
		opacity: 0.8;
	}

	.entry-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.875rem;
		flex-wrap: wrap;
	}

	.entry-action-btn {
		border: 1px solid #d1d5db;
		background: white;
		color: #374151;
		border-radius: 999px;
		padding: 0.45rem 0.8rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.entry-action-btn:hover:not(:disabled) {
		border-color: #f97316;
		color: #ea580c;
	}

	.entry-action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.entry-action-btn.danger:hover:not(:disabled) {
		border-color: #ef4444;
		color: #dc2626;
	}

	.entry-header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.entry-fuel-amount {
		font-weight: 700;
		font-size: 1.125rem;
		color: var(--brand-hover);
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
		max-height: 520px;
		padding: 1rem;
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
		margin-top: 0.25rem;
	}

	.context-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
		border-radius: 0.5rem;
		background-color: var(--gray-50);
		padding: 0.5rem;
	}

	.context-value {
		font-weight: 600;
		color: #374151;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-variant-numeric: tabular-nums;
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
			padding: 0.75rem 1rem;
			margin-bottom: 1rem;
		}

		.day-title {
			font-size: 1.125rem;
		}

		.daily-summary {
			padding: 1rem;
			margin-bottom: 1rem;
		}

		.entry-actions {
			width: 100%;
		}

		.entry-action-btn {
			flex: 1 1 calc(33.33% - 0.35rem);
			text-align: center;
		}
	}
</style>
