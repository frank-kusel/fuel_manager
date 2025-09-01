<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Vehicle {
		id: string;
		code: string;
		name: string;
	}

	interface FuelRecord {
		id: string;
		entry_date: string;
		litres_dispensed: number;
		litres_used?: number;
		time?: string;
		vehicle_id: string;
	}

	interface MonthlySubtotal {
		month: string;
		year: number;
		total_fuel: number;
		record_count: number;
	}

	let vehicles: Vehicle[] = [];
	let selectedVehicle: Vehicle | null = null;
	let isExpanded = false;
	let fuelRecords: FuelRecord[] = [];
	let monthlySubtotals: MonthlySubtotal[] = [];
	let currentMonth = new Date().getMonth();
	let currentYear = new Date().getFullYear();
	let loading = false;
	let error: string | null = null;

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

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

	async function loadVehicleHistory(vehicle: Vehicle) {
		if (!vehicle) return;
		
		loading = true;
		error = null;

		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			
			// Load records for the past 6 months by default
			const startDate = new Date(currentYear, currentMonth - 5, 1).toISOString().split('T')[0];
			const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

			const result = await supabaseService.getVehicleFuelRecords(vehicle.id, startDate, endDate);
			
			if (result.error) {
				error = result.error;
				return;
			}

			fuelRecords = result.data || [];
			calculateMonthlySubtotals();
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load vehicle history';
		} finally {
			loading = false;
		}
	}

	function calculateMonthlySubtotals() {
		const subtotals = new Map<string, MonthlySubtotal>();

		fuelRecords.forEach(record => {
			const date = new Date(record.entry_date);
			const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
			
			if (!subtotals.has(monthKey)) {
				subtotals.set(monthKey, {
					month: monthNames[date.getMonth()],
					year: date.getFullYear(),
					total_fuel: 0,
					record_count: 0
				});
			}

			const subtotal = subtotals.get(monthKey)!;
			subtotal.total_fuel += record.litres_dispensed || 0;
			subtotal.record_count += 1;
		});

		monthlySubtotals = Array.from(subtotals.values()).sort((a, b) => {
			if (a.year !== b.year) return b.year - a.year;
			return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
		});
	}

	async function handleVehicleSelect(vehicle: Vehicle) {
		selectedVehicle = vehicle;
		isExpanded = true;
		await loadVehicleHistory(vehicle);
	}

	function toggleExpanded() {
		if (!selectedVehicle) return;
		isExpanded = !isExpanded;
		if (isExpanded) {
			loadVehicleHistory(selectedVehicle);
		}
	}

	async function loadPreviousMonths() {
		if (!selectedVehicle) return;
		
		// Load 6 more months back
		currentMonth -= 6;
		if (currentMonth < 0) {
			currentYear--;
			currentMonth += 12;
		}
		
		await loadVehicleHistory(selectedVehicle);
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-ZA', { 
			day: '2-digit', 
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatFuel(litres: number): string {
		return `${litres.toFixed(1)}L`;
	}
</script>

<div class="vehicle-history">
	<div class="section-header">
		<h3>Vehicle Fuel History</h3>
		<p>View detailed fuel consumption records for individual vehicles</p>
	</div>

	{#if !selectedVehicle}
		<div class="vehicle-selector">
			<h4>Select a Vehicle</h4>
			<div class="vehicle-grid">
				{#each vehicles as vehicle (vehicle.id)}
					<button 
						class="vehicle-card"
						onclick={() => handleVehicleSelect(vehicle)}
					>
						<div class="vehicle-code">{vehicle.code}</div>
						<div class="vehicle-name">{vehicle.name}</div>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<div class="selected-vehicle">
			<div class="vehicle-header">
				<div class="vehicle-info">
					<h4>{selectedVehicle.code} - {selectedVehicle.name}</h4>
					<div class="selected-badge">Selected</div>
				</div>
				
				<div class="vehicle-actions">
					<Button 
						variant="outline" 
						size="sm" 
						onclick={() => { selectedVehicle = null; isExpanded = false; }}
					>
						Change Vehicle
					</Button>
					<Button 
						variant="primary" 
						size="sm" 
						onclick={toggleExpanded}
					>
						{isExpanded ? 'Hide' : 'Show'} History
					</Button>
				</div>
			</div>

			{#if isExpanded}
				<div class="history-content">
					{#if loading}
						<div class="loading">Loading fuel records...</div>
					{:else if error}
						<div class="error">Error: {error}</div>
					{:else if fuelRecords.length === 0}
						<div class="no-records">No fuel records found for this vehicle.</div>
					{:else}
						<!-- Monthly Subtotals -->
						<div class="monthly-subtotals">
							<h5>Monthly Summary</h5>
							<div class="subtotals-grid">
								{#each monthlySubtotals as subtotal (subtotal.month + subtotal.year)}
									<div class="subtotal-card">
										<div class="subtotal-month">{subtotal.month} {subtotal.year}</div>
										<div class="subtotal-amount">{formatFuel(subtotal.total_fuel)}</div>
										<div class="subtotal-records">{subtotal.record_count} entries</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Detailed Records -->
						<div class="detailed-records">
							<h5>Detailed Records</h5>
							<div class="records-table">
								<div class="table-header">
									<div class="col-date">Date & Time</div>
									<div class="col-fuel">Fuel Used</div>
								</div>
								
								{#each fuelRecords as record (record.id)}
									<div class="table-row">
										<div class="col-date">
											<div class="date-main">{formatDate(record.entry_date)}</div>
											{#if record.time}
												<div class="time-sub">{record.time}</div>
											{/if}
										</div>
										<div class="col-fuel">{formatFuel(record.litres_dispensed)}</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Load More -->
						<div class="load-more">
							<Button 
								variant="outline" 
								onclick={loadPreviousMonths}
								disabled={loading}
							>
								{loading ? 'Loading...' : 'Load Previous Months'}
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.vehicle-history {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		margin-top: 2rem;
		border: 1px solid var(--gray-200);
	}

	.section-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--gray-900);
		margin: 0 0 0.5rem 0;
	}

	.section-header p {
		color: var(--gray-600);
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
	}

	/* Vehicle Selector */
	.vehicle-selector h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-700);
		margin: 0 0 1rem 0;
	}

	.vehicle-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.vehicle-card {
		background: var(--gray-50);
		border: 1px solid var(--gray-200);
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.vehicle-card:hover {
		background: var(--gray-100);
		border-color: #f97316;
		transform: translateY(-1px);
	}

	.vehicle-code {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--gray-900);
		margin-bottom: 0.25rem;
	}

	.vehicle-name {
		font-size: 0.875rem;
		color: var(--gray-600);
	}

	.vehicle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--gray-200);
	}

	.vehicle-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.vehicle-info h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0;
	}

	.selected-badge {
		background: #f97316;
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.vehicle-actions {
		display: flex;
		gap: 0.5rem;
	}

	.history-content {
		margin-top: 1rem;
	}

	/* Monthly Subtotals */
	.monthly-subtotals {
		margin-bottom: 2rem;
	}

	.monthly-subtotals h5 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-700);
		margin: 0 0 1rem 0;
	}

	.subtotals-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.subtotal-card {
		background: var(--gray-50);
		border-radius: 8px;
		padding: 0.875rem;
		text-align: center;
	}

	.subtotal-month {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--gray-700);
		margin-bottom: 0.25rem;
	}

	.subtotal-amount {
		font-size: 1.25rem;
		font-weight: 700;
		color: #f97316;
		margin-bottom: 0.125rem;
	}

	.subtotal-records {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	/* Detailed Records */
	.detailed-records h5 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-700);
		margin: 0 0 1rem 0;
	}

	.records-table {
		border: 1px solid var(--gray-200);
		border-radius: 8px;
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: var(--gray-100);
		font-weight: 600;
		color: var(--gray-700);
		font-size: 0.875rem;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-top: 1px solid var(--gray-200);
	}

	.table-row:nth-child(even) {
		background: var(--gray-50);
	}

	.col-date,
	.col-fuel {
		padding: 0.75rem 1rem;
	}

	.col-fuel {
		text-align: right;
		font-weight: 600;
		color: #f97316;
	}

	.date-main {
		font-weight: 600;
		color: var(--gray-900);
	}

	.time-sub {
		font-size: 0.75rem;
		color: var(--gray-500);
		margin-top: 0.125rem;
	}

	/* Utilities */
	.loading,
	.error,
	.no-records {
		text-align: center;
		padding: 2rem;
		color: var(--gray-600);
	}

	.error {
		color: var(--red-600);
	}

	.load-more {
		margin-top: 1.5rem;
		text-align: center;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.vehicle-history {
			padding: 1rem;
		}

		.vehicle-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.vehicle-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.vehicle-actions {
			width: 100%;
		}

		.vehicle-actions :global(button) {
			flex: 1;
		}

		.vehicle-grid {
			grid-template-columns: 1fr;
		}

		.table-header,
		.table-row {
			font-size: 0.8rem;
		}

		.col-date,
		.col-fuel {
			padding: 0.5rem;
		}
	}
</style>