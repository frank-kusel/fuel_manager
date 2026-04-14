<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FuelEntryEditModal from '$lib/components/fuel/FuelEntryEditModal.svelte';

	interface Props {
		entries: any[];
		loading?: boolean;
	}

	let { entries: initialEntries, loading = false }: Props = $props();

	const DEFAULT_RANGE_DAYS = 30;
	const RANGE_PRESETS = [
		{ label: '7D', days: 7 },
		{ label: '30D', days: 30 },
		{ label: '90D', days: 90 }
	] as const;

	function formatDateInputValue(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getDateDaysAgo(daysAgo: number): string {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() - daysAgo);
		return formatDateInputValue(date);
	}

	function getDefaultDateRange() {
		return {
			start: getDateDaysAgo(DEFAULT_RANGE_DAYS - 1),
			end: getDateDaysAgo(0)
		};
	}

	function formatRangeDate(dateString: string): string {
		const [year, month, day] = dateString.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const initialRange = getDefaultDateRange();

	// Edit modal state
	let isEditModalOpen = $state(false);
	let selectedEntry = $state<any>(null);
	
	// Local state for expanded entries
	let allEntries = $state<any[]>([]);
	let isRangeLoading = $state(false);
	let rangeError = $state<string | null>(null);
	let hasLoadedRange = $state(false);
	let startDate = $state(initialRange.start);
	let endDate = $state(initialRange.end);
	let appliedRange = $state({ ...initialRange });

	// Filter states
	let showMissingData = $state(false);
	let showOutsideRange = $state(false);

	// Store field names for multi-field entries
	let fieldNamesMap = $state<Record<string, string>>({}); // entryId -> comma-separated field names
	
	// Helper function to fetch field names for ALL entries (field_id is deprecated, all fields now in junction table)
	// OPTIMIZED: Single batched query instead of N queries (fixes N+1 problem)
	async function fetchFieldNamesForEntries(entries: any[]) {
		const { default: supabaseService } = await import('$lib/services/supabase');
		const client = supabaseService.getClient();

		// Only fetch for entries we don't have cached
		const entryIds = entries.map(e => e.id).filter(id => !fieldNamesMap[id]);
		if (entryIds.length === 0) return;

		try {
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
				for (const [entryId, fields] of Object.entries(grouped) as Array<[string, string[]]>) {
					newMap[entryId] = fields.join(', ');
				}

				// Merge with existing map to trigger reactivity
				fieldNamesMap = { ...fieldNamesMap, ...newMap };
			}
		} catch (error) {
			console.error('Failed to fetch fields for entries:', error);
		}
	}

	// Initialize allEntries when initialEntries change
	$effect(() => {
		if (!hasLoadedRange && initialEntries && initialEntries.length > 0) {
			allEntries = [...initialEntries];
			void fetchFieldNamesForEntries(initialEntries);
		}
	});

	onMount(async () => {
		await applyDateRange(initialRange.start, initialRange.end);
	});

	async function applyDateRange(nextStart = startDate, nextEnd = endDate) {
		if (!nextStart || !nextEnd) {
			rangeError = 'Select both a start and end date.';
			return;
		}

		if (nextStart > nextEnd) {
			rangeError = 'The start date must be before the end date.';
			return;
		}

		isRangeLoading = true;
		rangeError = null;

		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();

			const result = await supabaseService.getRecentActivityEntries(nextStart, nextEnd);
			if (result.error) {
				rangeError = result.error;
				return;
			}

			allEntries = result.data || [];
			appliedRange = { start: nextStart, end: nextEnd };
			hasLoadedRange = true;
			await fetchFieldNamesForEntries(allEntries);
		} catch (error) {
			rangeError = error instanceof Error ? error.message : 'Failed to load activity for the selected date range.';
		} finally {
			isRangeLoading = false;
		}
	}

	async function applyPreset(days: number) {
		const nextRange = {
			start: getDateDaysAgo(days - 1),
			end: getDateDaysAgo(0)
		};

		startDate = nextRange.start;
		endDate = nextRange.end;
		await applyDateRange(nextRange.start, nextRange.end);
	}

	async function resetDateRange() {
		const nextRange = getDefaultDateRange();
		startDate = nextRange.start;
		endDate = nextRange.end;
		await applyDateRange(nextRange.start, nextRange.end);
	}

	async function clearAllFilters() {
		showMissingData = false;
		showOutsideRange = false;
		await resetDateRange();
	}
	
	// Group entries by date
	function groupEntriesByDate(entries: any[]) {
		const groups: Record<string, any[]> = {};
		
		if (!Array.isArray(entries)) {
			return groups;
		}
		
		entries.forEach((entry, index) => {
			try {
				if (!entry || !entry.entry_date) {
					console.warn('Entry missing entry_date:', entry);
					return;
				}
				
				const date = new Date(entry.entry_date);
				const dateKey = formatDateGroup(date);
				
				if (!groups[dateKey]) {
					groups[dateKey] = [];
				}
				groups[dateKey].push(entry);
			} catch (error) {
				console.error('Error processing entry', index, entry, error);
			}
		});
		
		return groups;
	}
	
	function formatDateGroup(date: Date): string {
		if (!date || isNaN(date.getTime())) {
			return 'Invalid Date';
		}
		
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		
		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			// Format as "Monday, 15 January 2025"
			return date.toLocaleDateString('en-ZA', { 
				weekday: 'long', 
				day: 'numeric', 
				month: 'long', 
				year: 'numeric' 
			});
		}
	}
	
	function formatTime(timeStr: string): string {
		return timeStr.substring(0, 5); // HH:MM
	}

	// Get location display for an entry (prioritizes junction table since field_id is deprecated)
	function getLocationDisplay(entry: any): string {
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
		return 'No field';
	}

	// Check if entry has location data
	function hasLocationData(entry: any): boolean {
		// Check junction table first (field_id column is deprecated)
		if (fieldNamesMap[entry.id]) {
			return true;
		}
		// Check zone
		if (entry.zones?.name || entry.zones?.code) {
			return true;
		}
		// Check legacy field_id for old entries
		if (entry.fields?.name || entry.fields?.code) {
			return true;
		}
		// No location data
		return false;
	}
	
	// Calculate hours or km used
	function getUsage(entry: any): string {
		if (entry.gauge_working === false) {
			return '-';
		}
		
		if (entry.odometer_start && entry.odometer_end) {
			const diff = entry.odometer_end - entry.odometer_start;
			const unit = entry.vehicles?.odometer_unit || 'km';
			if (unit === 'hours' || unit === 'hr') {
				return `${Math.round(diff * 10) / 10}hr`;
			} else {
				return `${Math.round(diff * 10) / 10}km`;
			}
		}
		return '-';
	}

	// Get fuel consumption with average  
	function getFuelConsumptionWithAverage(entry: any) {
		if (entry.fuel_consumption_l_per_100km) {
			const unit = entry.vehicles?.odometer_unit || 'km';
			const currentValue = Math.round(entry.fuel_consumption_l_per_100km * 10) / 10;
			const unitSuffix = unit === 'hr' ? 'L/hr' : 'L/100km';
			
			// Return object with parts for styling
			if (entry.vehicles?.average_consumption_l_per_100km) {
				const avgValue = Math.round(entry.vehicles.average_consumption_l_per_100km * 10) / 10;
				const difference = Math.abs(currentValue - avgValue);
				
				// Only show red when outside tolerance, neutral otherwise
				let colorClass = 'consumption-neutral'; // Default neutral
				if (difference > 2) {
					colorClass = 'consumption-bad'; // Red when outside tolerance
				}
				
				return {
					current: currentValue,
					average: avgValue,
					unit: unitSuffix,
					hasAverage: true,
					colorClass: colorClass
				};
			} else {
				return {
					current: currentValue,
					unit: unitSuffix,
					hasAverage: false,
					colorClass: 'consumption-neutral' // No color
				};
			}
		}
		return { current: '-', hasAverage: false, colorClass: 'consumption-neutral' };
	}
	
	// Filter entries based on active filters
	const filteredEntries = $derived.by(() => {
		if (!Array.isArray(allEntries)) {
			return [];
		}

		let filtered = [...allEntries];


		// Apply quality filters only when active
		// IMPORTANT: Only filter when the filter is explicitly enabled
		// Don't filter by default since field data loads asynchronously
		if (showMissingData) {
			filtered = filtered.filter(entry => !hasLocationData(entry) || !entry.activities?.name);
		}

		if (showOutsideRange) {
			filtered = filtered.filter(entry => {
				if (!entry.fuel_consumption_l_per_100km || !entry.vehicles?.average_consumption_l_per_100km) {
					return false;
				}
				const current = entry.fuel_consumption_l_per_100km;
				const average = entry.vehicles.average_consumption_l_per_100km;
				const difference = Math.abs(current - average);
				return difference > 2;
			});
		}

		return filtered;
	});
	
	const groupedEntries = $derived(groupEntriesByDate(filteredEntries));
	const dateGroups = $derived(Object.keys(groupedEntries));

	// Edit modal functions
	function openEditModal(entry: any) {
		selectedEntry = entry;
		isEditModalOpen = true;
	}

	function closeEditModal() {
		isEditModalOpen = false;
		selectedEntry = null;
	}

	async function handleEntrySaved() {
		// Reload entries to reflect changes
		closeEditModal();
		// Trigger a refresh by reloading the first page of entries
		window.location.reload(); // Simple approach - you could optimize this
	}
</script>

<div class="fuel-activity">
	<div class="activity-header">
		<h3>Recent Fuel Activity</h3>
		<div class="activity-controls">
			<div class="date-range-panel">
				<div class="date-range-fields">
					<label class="date-field">
						<span>From</span>
						<input type="date" bind:value={startDate} max={endDate} />
					</label>
					<label class="date-field">
						<span>To</span>
						<input type="date" bind:value={endDate} min={startDate} max={getDateDaysAgo(0)} />
					</label>
				</div>

				<div class="date-range-actions">
					<div class="preset-buttons">
						{#each RANGE_PRESETS as preset}
							<button class="preset-btn" onclick={() => applyPreset(preset.days)} disabled={isRangeLoading}>
								{preset.label}
							</button>
						{/each}
					</div>

					<div class="range-action-buttons">
						<button class="secondary-btn" onclick={resetDateRange} disabled={isRangeLoading}>
							Reset
						</button>
						<button class="primary-btn" onclick={() => applyDateRange()} disabled={isRangeLoading}>
							Apply Range
						</button>
					</div>
				</div>
			</div>

			<div class="filter-buttons">
				<button 
					class="filter-btn" 
					class:active={showMissingData}
					onclick={() => showMissingData = !showMissingData}
				>
					Missing Data
				</button>
				<button 
					class="filter-btn" 
					class:active={showOutsideRange}
					onclick={() => showOutsideRange = !showOutsideRange}
				>
					Outside Range
				</button>
			</div>
		</div>
	</div>

	<div class="range-summary">
		<span>
			Showing {filteredEntries.length} of {allEntries.length} entries from {formatRangeDate(appliedRange.start)} to {formatRangeDate(appliedRange.end)}
		</span>
	</div>

	{#if rangeError}
		<div class="range-error">{rangeError}</div>
	{/if}
	
	{#if (loading && !hasLoadedRange) || isRangeLoading}
		<div class="loading-grid">
			{#each Array(6) as _}
				<div class="entry-skeleton">
					<div class="skeleton-header"></div>
					<div class="skeleton-content">
						<div class="skeleton-bar"></div>
						<div class="skeleton-text"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if allEntries.length === 0}
		<div class="empty-state">
			<div class="empty-visual">
				<div class="fuel-drop"></div>
			</div>
			<h4>No activity in this range</h4>
			<p>No fuel entries were found between {formatRangeDate(appliedRange.start)} and {formatRangeDate(appliedRange.end)}</p>
			<button class="clear-filters-btn" onclick={resetDateRange}>
				Reset to Last 30 Days
			</button>
		</div>
	{:else if filteredEntries.length === 0}
		<div class="empty-state">
			<div class="empty-visual">
				<div class="fuel-drop"></div>
			</div>
			<h4>No entries match filters</h4>
			<p>Try adjusting the date range or clear the active filters to see entries</p>
			<button class="clear-filters-btn" onclick={clearAllFilters}>
				Clear Filters
			</button>
		</div>
	{:else}
		<div class="entries-container">
			{#each dateGroups as dateGroup}
				<!-- Date Section -->
				<div class="date-section">
					<div class="day-header">
						<h2 class="day-title">{dateGroup}</h2>
					</div>
					
					<div class="entries-grid">
						{#each groupedEntries[dateGroup] as entry (entry.id)}
							{@const consumption = getFuelConsumptionWithAverage(entry)}
							{@const hasWarning = !hasLocationData(entry) || !entry.activities?.name}
							<div class="fuel-card" class:warning={hasWarning} onclick={() => openEditModal(entry)}>
								<div class="card-row">
									<div class="vehicle-info">
										<span class="vehicle-name">{entry.vehicles?.name || 'Unknown Vehicle'}</span>
										<span class="vehicle-code">({entry.vehicles?.code || 'N/A'})</span>
										{#if consumption.hasAverage}<span class="vehicle-avg">{consumption.average}<span class="avg-unit">{consumption.unit}</span></span>{/if}
									</div>
									<div class="fuel-amount">{Math.round((entry.litres_dispensed || 0) * 10) / 10}<span class="unit">L</span></div>
								</div>

								<div class="card-row">
									<div class="activity-info">
										{getLocationDisplay(entry)} <span class="separator">•</span> {entry.activities?.name || 'Unknown activity'} <span class="separator">•</span> {getUsage(entry)}
									</div>
									<div class="consumption-info">
										<span class="{consumption.colorClass}">{consumption.current}</span><span class="consumption-unit">{consumption.unit}</span>
									</div>
								</div>
								<div class="edit-indicator">
									<span>✏️ Tap to edit</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit Modal -->
<FuelEntryEditModal
	entry={selectedEntry}
	isOpen={isEditModalOpen}
	on:close={closeEditModal}
	on:saved={handleEntrySaved}
/>

<style>
	.fuel-activity {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		border-radius: 1.5rem;
		background: var(--gray-100);
		margin: -0.5rem;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.activity-header {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem 0.5rem;
		position: sticky;
		top: 0;
		background: var(--gray-100);
		z-index: 20;
		border-bottom: 1px solid #e5e7eb;
	}

	.activity-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.activity-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: flex-end;
		justify-content: space-between;
	}

	.date-range-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1 1 520px;
	}

	.date-range-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.date-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: #4b5563;
	}

	.date-field input {
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		background: white;
		color: #111827;
	}

	.date-field input:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
	}

	.date-range-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
	}

	.preset-buttons,
	.range-action-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preset-btn,
	.secondary-btn,
	.primary-btn {
		padding: 0.55rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 600;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-btn,
	.secondary-btn {
		background: white;
		border: 1px solid #d1d5db;
		color: #4b5563;
	}

	.primary-btn {
		background: #f97316;
		border: 1px solid #f97316;
		color: white;
	}

	.preset-btn:hover:not(:disabled),
	.secondary-btn:hover:not(:disabled) {
		border-color: #f97316;
		color: #f97316;
	}

	.primary-btn:hover:not(:disabled) {
		background: #ea580c;
		border-color: #ea580c;
	}

	.filter-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.filter-btn {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
	}

	.filter-btn:hover {
		border-color: #f97316;
		color: #f97316;
	}

	.filter-btn.active {
		background: #f97316;
		border-color: #f97316;
		color: white;
	}

	.range-summary {
		padding: 0 0.5rem 1rem;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.range-error {
		margin: 0 0.5rem 1rem;
		padding: 0.75rem 1rem;
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.clear-filters-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #f97316;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.clear-filters-btn:hover {
		background: #ea580c;
	}

	/* Entries Container */
	.entries-container {
		flex: 1;
		overflow-y: auto;
		max-height: 900px;
		padding: 0 0.5rem;
	}

	/* Date Sections - Match Summary Page */
	.date-section {
		margin-bottom: 1.5rem;
	}

	.day-header {
		backdrop-filter: blur(8px);
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem 0;
	}

	.day-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	/* Entries Grid */
	.entries-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Compact Fuel Cards - Similar to Summary Page */
	.fuel-card {
		background: var(--white);
		border-radius: 1rem;
		padding: 1rem;
		transition: all 0.3s ease;
		border: none;
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	.fuel-card:hover {
		background: #e2e8f0;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.fuel-card.warning {
		background: #fef3c7;
	}

	.fuel-card.warning:hover {
		background: #fde68a;
		border-color: #d97706;
	}

	.edit-indicator {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
		opacity: 0;
		transition: opacity 0.2s ease;
		background: rgba(255, 255, 255, 0.9);
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		pointer-events: none;
	}

	.fuel-card:hover .edit-indicator {
		opacity: 1;
	}

	/* Card Rows */
	.card-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		margin-bottom: 0.25rem;
		gap: 1rem;
	}

	.card-row:last-child {
		margin-bottom: 0;
	}

	/* Vehicle Info (Row 1 Left) - Similar to Summary */
	.vehicle-info {
		font-size: 1rem;
		font-weight: 700;
		color: #111827;
		display: flex;
		align-items: bottom;
		gap: 0.5rem;
	}

	.vehicle-name {
		font-weight: 700;
	}

	.vehicle-code {
		color: #9ca3af;
		font-weight: 400;
	}

	.vehicle-avg {
		color: var(--gray-900);
		font-size: 0.875rem;
		font-weight: 400;
	}

	.avg-unit {
		font-size: 0.75rem;
		margin-left: 0.125rem;
	}

	/* Fuel Amount (Row 1 Right) */
	.fuel-amount {
		font-size: 1.125rem;
		font-weight: 700;
		color: #2563eb;
		font-family: inherit; /* Use same font as rest of card */
	}

	.unit {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		margin-left: 0.125rem;
	}

	/* Activity Info (Row 2 Left) - Similar to Summary */
	.activity-info {
		font-size: 0.8rem;
		color: #6b7280;
		font-weight: 500;
		position: relative;
		white-space: normal;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.separator {
		color: #d1d5db;
		font-weight: 300;
	}

	/* Consumption Info (Row 2 Right) */
	.consumption-info {
		font-size: 1rem;
		font-weight: 600;
		font-family: inherit; /* Use same font as rest of card */
		text-align: right;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	/* Consumption Color Classes */
	.consumption-good {
		color: #059669; /* Green - good efficiency */
	}

	.consumption-bad {
		color: #dc2626; /* Red - poor efficiency */
	}

	.consumption-neutral {
		color: var(--gray-900); /* Gray - no comparison available */
	}


	.consumption-unit {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		margin-left: 0.125rem;
	}


	/* Loading State */
	.loading-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0 0.5rem;
	}

	.entry-skeleton {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 8px;
		padding: 0.75rem;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.skeleton-header {
		height: 1.5rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 6px;
		margin-bottom: 0.75rem;
	}

	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-bar {
		height: 0.875rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-text {
		height: 0.75rem;
		background: linear-gradient(90deg, #f9fafb 25%, #f3f4f6 50%, #f9fafb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
		width: 70%;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		flex: 1;
	}

	.empty-visual {
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

	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
	}

	.empty-state h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
		max-width: 300px;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.activity-header h3 {
			text-align: center;
		}

		.activity-controls,
		.date-range-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.date-range-fields {
			grid-template-columns: 1fr;
		}

		.preset-buttons,
		.range-action-buttons,
		.filter-buttons {
			width: 100%;
		}

		.preset-btn,
		.secondary-btn,
		.primary-btn,
		.filter-btn {
			flex: 1;
		}

		.entries-container {
			padding: 0;
		}

		.fuel-card {
			padding: 0.625rem;
		}

		.vehicle-info {
			font-size: 1rem;
		}

		.fuel-amount {
			font-size: 1rem;
		}

		.activity-info {
			font-size: 0.85rem;
		}

		.consumption-info {
			font-size: 1rem;
		}
	}

	@media (max-width: 480px) {
		.date-section {
			margin-bottom: 1.5rem;
		}

		.entry-card {
			padding: 0.75rem;
		}
	}

	.preset-btn:disabled,
	.secondary-btn:disabled,
	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
