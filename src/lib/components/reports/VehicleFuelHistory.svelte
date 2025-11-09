<script lang="ts">
	import { onMount } from 'svelte';

	interface Vehicle {
		id: string;
		code: string;
		name: string;
	}

	interface FuelEntry {
		id: string;
		entry_date: string;
		time: string;
		litres_dispensed: number;
		odometer_start: number | null;
		odometer_end: number | null;
		gauge_working: boolean;
		bowser_reading_start: number | null;
		bowser_reading_end: number | null;
		activities: { code: string; name: string } | null;
		fields: { code: string; name: string } | null;
		vehicles: { odometer_unit: string } | null;
	}

	let vehicles: Vehicle[] = $state([]);
	let selectedVehicleId: string = $state('');
	let fuelEntries: FuelEntry[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);

	onMount(async () => {
		await loadVehicles();
	});

	async function loadVehicles() {
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const result = await supabaseService.getVehicles();

			if (result.error) {
				error = result.error;
				return;
			}

			vehicles = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load vehicles';
		}
	}

	async function loadVehicleFuelHistory(vehicleId: string) {
		if (!vehicleId) return;

		loading = true;
		error = null;
		fuelEntries = [];

		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();

			// Load all fuel entries for the vehicle (no date limit for now)
			const result = await supabaseService.getDetailedVehicleFuelRecords(vehicleId);

			if (result.error) {
				error = result.error;
				return;
			}

			fuelEntries = result.data || [];

			// Fetch field names for entries from junction table
			await fetchFieldNamesForEntries(fuelEntries);

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load fuel history';
		} finally {
			loading = false;
		}
	}

	// Map to store field names for each entry
	let fieldNamesMap = $state<Record<string, string>>({});

	// Fetch field names from junction table for multi-field entries
	async function fetchFieldNamesForEntries(entries: FuelEntry[]) {
		if (entries.length === 0) return;

		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			const client = (supabaseService as any).client;

			const entryIds = entries.map(e => e.id);

			const result = await client
				.from('fuel_entry_fields')
				.select(`
					fuel_entry_id,
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

				fieldNamesMap = newMap;
			}
		} catch (err) {
			console.error('Failed to fetch field names:', err);
		}
	}

	function getFieldDisplay(entry: FuelEntry): string {
		// Priority 1: Check junction table (multi-field support)
		if (fieldNamesMap[entry.id]) {
			return fieldNamesMap[entry.id];
		}

		// Priority 2: Legacy single field
		if (entry.fields?.name || entry.fields?.code) {
			return entry.fields.name || entry.fields.code;
		}

		return '-';
	}

	function handleVehicleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedVehicleId = target.value;
		if (selectedVehicleId) {
			loadVehicleFuelHistory(selectedVehicleId);
		} else {
			fuelEntries = [];
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatNumber(num: number | null): string {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-US').format(num);
	}

	function formatDecimal(num: number | null, decimals: number = 1): string {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(num);
	}

	function getHoursOrDistance(entry: FuelEntry): string {
		if (!entry.gauge_working || entry.odometer_start === null || entry.odometer_end === null) {
			return '-';
		}

		const diff = entry.odometer_end - entry.odometer_start;
		const unit = entry.vehicles?.odometer_unit || 'km';

		if (unit === 'hours' || unit === 'hr') {
			return formatDecimal(diff, 1);
		} else {
			return formatNumber(diff);
		}
	}
</script>

<div class="vehicle-fuel-history">
	<div class="header">
		<h2>Vehicle Fuel History</h2>
		<p>Detailed fuel consumption records by vehicle</p>
	</div>

	<!-- Vehicle Dropdown -->
	<div class="vehicle-selector">
		<label for="vehicle-select" class="select-label">Select Vehicle</label>
		<select
			id="vehicle-select"
			class="vehicle-dropdown"
			value={selectedVehicleId}
			onchange={handleVehicleChange}
		>
			<option value="">Choose a vehicle...</option>
			{#each vehicles as vehicle (vehicle.id)}
				<option value={vehicle.id}>{vehicle.code} - {vehicle.name}</option>
			{/each}
		</select>
	</div>

	<!-- Loading / Error States -->
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading fuel history...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>Error: {error}</p>
		</div>
	{:else if selectedVehicleId && fuelEntries.length === 0}
		<div class="empty-state">
			<p>No fuel entries found for this vehicle</p>
		</div>
	{:else if fuelEntries.length > 0}
		<!-- Fuel Entries - Compact Card Layout -->
		<div class="entries-container">
			{#each fuelEntries as entry (entry.id)}
				<div class="entry-card">
					<!-- Row 1: Date, Fuel, Activity, Field -->
					<div class="card-row primary-row">
						<div class="date-badge">{formatDate(entry.entry_date)}</div>
						<div class="fuel-badge">{formatDecimal(entry.litres_dispensed)}L</div>
						<div class="info-text">{entry.activities?.code || '-'}</div>
						<div class="info-text field-text">{getFieldDisplay(entry)}</div>
					</div>

					<!-- Row 2: ODO readings -->
					<div class="card-row secondary-row">
						<div class="data-group">
							<span class="label">ODO Start</span>
							<span class="value">
								{#if entry.odometer_start !== null}
									{formatNumber(entry.odometer_start)}
								{:else}
									-
								{/if}
							</span>
						</div>
						<div class="data-group">
							<span class="label">ODO End</span>
							<span class="value">
								{#if entry.odometer_end !== null}
									{formatNumber(entry.odometer_end)}
								{:else}
									-
								{/if}
							</span>
						</div>
						<div class="data-group">
							<span class="label">Usage</span>
							<span class="value">{getHoursOrDistance(entry)}</span>
						</div>
					</div>
				</div>
			{/each}

			<div class="table-footer">
				<p>{fuelEntries.length} {fuelEntries.length === 1 ? 'entry' : 'entries'}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.vehicle-fuel-history {
		background: white;
		border-radius: 12px;
		padding: 0rem;
	}

	.header h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.25rem 0;
	}

	.header p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
	}

	/* Vehicle Selector */
	.vehicle-selector {
		margin-bottom: 1rem;
		padding: 0 rem;
	}

	.select-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.vehicle-dropdown {
		width: 100%;
		max-width: 400px;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
		font-size: 1rem;
		color: #111827;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.vehicle-dropdown:hover {
		border-color: #d1d5db;
	}

	.vehicle-dropdown:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
	}

	/* States */
	.loading-state,
	.error-state,
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		margin: 0 1rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top-color: #f97316;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-state p,
	.empty-state p {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.error-state p {
		color: #dc2626;
		font-size: 0.875rem;
	}

	/* Entries Container - Card Layout */
	.entries-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.entry-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.entry-card:hover {
		border-color: #f97316;
		box-shadow: 0 2px 8px rgba(249, 115, 22, 0.1);
	}

	.card-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
	}

	.primary-row {
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		justify-content: space-between;
	}

	.secondary-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.75rem;
	}

	/* Date Badge */
	.date-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		white-space: nowrap;
	}

	/* Fuel Badge */
	.fuel-badge {
		font-size: 0.875rem;
		font-weight: 700;
		color: #f97316;
		background: #fff7ed;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		white-space: nowrap;
	}

	/* Info Text */
	.info-text {
		font-size: 0.8125rem;
		color: #374151;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.field-text {
		flex: 1;
		text-align: right;
		color: #059669;
	}

	/* Data Groups */
	.data-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.data-group .label {
		font-size: 0.625rem;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.data-group .value {
		font-size: 0.75rem;
		font-weight: 600;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Table Footer */
	.table-footer {
		padding: 0.75rem 1rem;
		text-align: center;
	}

	.table-footer p {
		margin: 0;
		font-size: 0.8125rem;
		color: #9ca3af;
		font-weight: 500;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.vehicle-fuel-history {
			padding: 0rem;
		}

		.header h2 {
			font-size: 1.25rem;
		}

		.vehicle-dropdown {
			max-width: 100%;
		}

		.card-row {
			padding: 0.5rem 0.5rem;
		}

		.secondary-row {
			gap: 0.5rem;
		}

		.data-group .value {
			font-size: 0.8rem;
		}
	}
</style>
