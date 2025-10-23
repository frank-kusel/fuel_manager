<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface Props {
		entries: any[];
		loading?: boolean;
	}
	
	let { entries: initialEntries, loading = false }: Props = $props();
	
	// Local state for expanded entries
	let allEntries = $state<any[]>([]);
	let isLoadingMore = $state(false);

	// Filter states
	let showMissingData = $state(false);
	let showOutsideRange = $state(false);

	// Load more functionality - start with 4 weeks (1 month)
	let weeksToShow = $state(4);

	// Store field names for multi-field entries
	let fieldNamesMap = $state<Record<string, string>>({}); // entryId -> comma-separated field names
	
	// Helper function to fetch field names for ALL entries (field_id is deprecated, all fields now in junction table)
	// OPTIMIZED: Single batched query instead of N queries (fixes N+1 problem)
	async function fetchFieldNamesForEntries(entries: any[]) {
		const { default: supabaseService } = await import('$lib/services/supabase');
		const client = (supabaseService as any).client;

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

	// Initialize allEntries when initialEntries change
	$effect(() => {
		if (initialEntries && initialEntries.length > 0) {
			allEntries = [...initialEntries];
			fetchFieldNamesForEntries(initialEntries);
		}
	});
	
	// Function to load more entries from the database
	async function loadMoreEntries() {
		if (isLoadingMore) return;

		isLoadingMore = true;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();

			// Calculate the offset and limit
			const offset = allEntries.length;
			const limit = 10;

			const client = (supabaseService as any).client;

			const result = await client
				.from('fuel_entries')
				.select(`
					*,
					vehicles!left(code, name, type, odometer_unit, average_consumption_l_per_100km),
					drivers!left(employee_code, name),
					activities!left(name, category),
					fields!left(name, code),
					zones!left(name, code)
				`)
				.order('entry_date', { ascending: false })
				.order('time', { ascending: false })
				.range(offset, offset + limit - 1);

			if (result.data && result.data.length > 0) {
				allEntries = [...allEntries, ...result.data];
				// Fetch field names for multi-field entries
				await fetchFieldNamesForEntries(result.data);
			}
		} catch (error) {
			console.error('Failed to load more entries:', error);
		} finally {
			isLoadingMore = false;
		}
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

		// First, filter by date range (weeks)
		const weeksAgo = new Date();
		weeksAgo.setDate(weeksAgo.getDate() - (weeksToShow * 7));

		let filtered = allEntries.filter(entry => {
			if (!entry.entry_date) return false;
			const entryDate = new Date(entry.entry_date);
			return entryDate >= weeksAgo;
		});


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
	
	// Check if there are more entries beyond current week range
	const hasMoreEntries = $derived.by(() => {
		if (!Array.isArray(allEntries)) return false;
		
		const currentWeeksAgo = new Date();
		currentWeeksAgo.setDate(currentWeeksAgo.getDate() - (weeksToShow * 7));
		
		return allEntries.some(entry => {
			if (!entry.entry_date) return false;
			const entryDate = new Date(entry.entry_date);
			return entryDate < currentWeeksAgo;
		});
	});
	
	// Function to load more weeks
	async function loadMoreWeeks() {
		// First, check if we need more data from the database
		const currentWeeksAgo = new Date();
		currentWeeksAgo.setDate(currentWeeksAgo.getDate() - ((weeksToShow + 1) * 7));
		
		const hasOlderEntriesInMemory = allEntries.some(entry => {
			if (!entry.entry_date) return false;
			const entryDate = new Date(entry.entry_date);
			return entryDate < currentWeeksAgo;
		});
		
		// If we don't have older entries in memory, try to load more from the database
		if (!hasOlderEntriesInMemory) {
			await loadMoreEntries();
		}
		
		// Then increase the weeks to show
		weeksToShow += 1;
	}
</script>

<div class="fuel-activity">
	<div class="activity-header">
		<h3>Recent Fuel Activity</h3>
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
	
	{#if loading}
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
			<h4>No recent activity</h4>
			<p>Fuel entries will appear here once vehicles start logging usage</p>
		</div>
	{:else if filteredEntries.length === 0}
		<div class="empty-state">
			<div class="empty-visual">
				<div class="fuel-drop"></div>
			</div>
			<h4>No entries match filters</h4>
			<p>Try adjusting your filter settings or clear all filters to see entries</p>
			<button class="clear-filters-btn" onclick={() => { showMissingData = false; showOutsideRange = false; }}>
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
							<div class="fuel-card" class:warning={hasWarning}>
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
							</div>
						{/each}
					</div>
				</div>
			{/each}
			
			<!-- Load More Button -->
			<div class="load-more-container">
				<button class="load-more-btn" onclick={loadMoreWeeks} disabled={isLoadingMore}>
					{#if isLoadingMore}
						Loading...
					{:else}
						Load More ({weeksToShow} week{weeksToShow > 1 ? 's' : ''})
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

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
		justify-content: space-between;
		align-items: center;
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

	.filter-buttons {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		max-width: 400px;
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
		max-height: 600px;
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
	}

	.fuel-card:hover {
		background: #e2e8f0;
		transform: translateY(-1px);
	}

	.fuel-card.warning {
		background: #fef3c7;
	}

	.fuel-card.warning:hover {
		background: #fde68a;
		border-color: #d97706;
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
		.activity-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			margin-bottom: 1rem;
		}

		.activity-header h3 {
			text-align: center;
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

	/* Load More Button */
	.load-more-container {
		display: flex;
		justify-content: center;
	}

	.load-more-btn {
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--secondary);
		background: white;
		border: 1px solid var(--secondary);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.load-more-btn:hover:not(:disabled) {
		background: #f97316;
		color: white;
		transform: translateY(-1px);
	}

	.load-more-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}
</style>