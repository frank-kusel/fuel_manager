<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Vehicle } from '$lib/types';
	
	interface Props {
		selectedVehicle: Vehicle | null;
		onVehicleSelect: (vehicle: Vehicle | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}
	
	let { selectedVehicle, onVehicleSelect, onAutoAdvance, errors }: Props = $props();
	
	function handleVehicleSelect(vehicle: Vehicle) {
		onVehicleSelect(vehicle);
		// Auto-advance immediately
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	let vehicles: Vehicle[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	onMount(async () => {
		try {
			await supabaseService.init();
			const result = await supabaseService.getVehicles();
			if (result.error) {
				throw new Error(result.error);
			}
			vehicles = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load vehicles';
		} finally {
			loading = false;
		}
	});
	
	function formatOdometer(reading: number | null, unit: string | null): string {
		if (reading === null) return 'Not set';
		return `${new Intl.NumberFormat().format(reading)} ${unit || 'km'}`;
	}
	
	function getFuelTypeIcon(fuelType: string): string {
		return fuelType === 'petrol' ? '⛽' : '🛢️';
	}
	
	function getFuelTypeColor(fuelType: string): string {
		return fuelType === 'petrol' ? '#ef4444' : '#059669';
	}

	function getVehicleTypeIcon(vehicleType: string): string {
		switch (vehicleType?.toLowerCase()) {
			case 'tractor': return '🚜';
			case 'truck': return '🚛';
			case 'utility': return '🚐';
			case 'loader': return '🏗️';
			case 'excavator': return '🚧';
			default: return '🚗';
		}
	}
</script>

<div class="vehicle-selection">
	<div class="step-header">
		<h2>Vehicle</h2>
	</div>
	
	{#if errors.length > 0}
		<div class="error-messages">
			{#each errors as error}
				<div class="error-message">
					<span class="error-icon">⚠️</span>
					{error}
				</div>
			{/each}
		</div>
	{/if}
	
	{#if loading}
		<div class="loading-state">
			<div class="vehicles-grid">
				{#each Array(6) as _}
					<div class="vehicle-card-skeleton">
						<div class="skeleton-header">
							<div class="skeleton-icon"></div>
							<div class="skeleton-content">
								<div class="skeleton-line"></div>
								<div class="skeleton-line short"></div>
							</div>
						</div>
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
			<div class="error-icon">🚨</div>
			<p>Failed to load vehicles</p>
			<small>{error}</small>
		</div>
	{:else if vehicles.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🚜</div>
			<p>No vehicles available</p>
			<small>Add vehicles to your fleet to begin fuel entries</small>
		</div>
	{:else}
		<div class="table-container">
			<table class="table" id="vehicle-table">
				<thead>
					<tr>
						<th>Code</th>
						<th>Name</th>
						<th>Type</th>
						<th>Reg</th>
					</tr>
				</thead>
				<tbody>
					{#each vehicles as vehicle (vehicle.id)}
						<tr 
							class="vehicle-row clickable {selectedVehicle?.id === vehicle.id ? 'selected' : ''}"
							onclick={() => {
								console.log('=== VEHICLE ROW CLICK DETECTED ===');
								console.log('Vehicle clicked:', vehicle.name, vehicle.code);
								handleVehicleSelect(vehicle);
							}}
						>
							<td class="vehicle-code vehicle-code-colored vehicle-type-{vehicle.type?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}">{vehicle.code || 'VEH'}</td>
							<td class="vehicle-name">{vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`.trim()}</td>
							<td class="vehicle-type">
								<span class="vehicle-type-icon">{getVehicleTypeIcon(vehicle.type || '')}</span>
							</td>
							<td class="vehicle-reg">{vehicle.registration || ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	
	{#if selectedVehicle}
		<div class="selection-summary">
			<Card class="selected-vehicle-summary">
				<div class="summary-header">
					<span class="summary-icon">✓</span>
					<h3>Selected Vehicle</h3>
				</div>
				<div class="summary-content">
					<div class="summary-vehicle">
						<div class="summary-name">{selectedVehicle.name || `${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim()}</div>
						<div class="summary-reg">{selectedVehicle.registration || ''}</div>
					</div>
					<div class="summary-details">
						<div class="summary-detail">
							<span>Current Odometer:</span>
							<strong>{formatOdometer(selectedVehicle.current_odometer, selectedVehicle.odometer_unit)}</strong>
						</div>
					</div>
				</div>
				<div class="summary-actions">
					<Button variant="outline" size="sm" onclick={() => onVehicleSelect(null)}>
						Change Vehicle
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.vehicle-selection {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Step Header */
	.step-header {
		text-align: center;
		margin-bottom: 1rem;
	}

	.step-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
		margin: 0;
	}

	/* Error Messages */
	.error-messages {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	/* Table Container */
	.table-container {
		background: var(--white, #ffffff);
		border: 1px solid var(--gray-200, #e2e8f0);
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 0;
	}

	/* Table Styling - Original Design */
	:global(.table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	:global(.table th),
	:global(.table td) {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--gray-200, #e2e8f0);
	}

	:global(.table th) {
		background: var(--gray-50, #f8fafc);
		font-weight: 600;
		color: var(--gray-700, #334155);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.table tbody tr:hover) {
		background: var(--gray-50, #f8fafc);
	}

	:global(.table tbody tr.clickable) {
		cursor: pointer;
	}

	:global(.table tbody tr.clickable:hover) {
		background: var(--primary-light, #eff6ff);
	}

	/* Selected rows */
	:global(.table tbody tr.selected) {
		background: var(--primary, #2563eb);
		color: var(--white, #ffffff);
	}

	/* Vehicle Types - Based on original design */
	.vehicle-type-excavator { --type-color: #dc2626; }
	.vehicle-type-ldv-4wd { --type-color: #2563eb; }
	.vehicle-type-loaders { --type-color: #7c3aed; }
	.vehicle-type-lorry-d-axle { --type-color: #ea580c; }
	.vehicle-type-lorry-s-axle { --type-color: #d97706; }
	.vehicle-type-tractor-2-wd { --type-color: #16a34a; }
	.vehicle-type-tractor-4-wd { --type-color: #15803d; }
	.vehicle-type-d-axle-lorry { --type-color: #c2410c; }
	.vehicle-type-other { --type-color: var(--gray-500, #64748b); }

	/* Standard vehicle type colors */
	.vehicle-type-tractor { --type-color: #16a34a; }
	.vehicle-type-bakkie { --type-color: #2563eb; }
	.vehicle-type-truck { --type-color: #ea580c; }
	.vehicle-type-loader { --type-color: #7c3aed; }
	.vehicle-type-utility { --type-color: #059669; }

	.vehicle-type-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--type-color);
		display: inline-block;
		margin-right: 0.5rem;
	}

	/* Vehicle code colors for mobile */
	.vehicle-code-colored {
		font-weight: 700;
		color: var(--type-color);
	}

	/* Selection Summary */
	.selection-summary {
		margin-top: 1rem;
	}

	:global(.selected-vehicle-summary) {
		border: 2px solid #a7f3d0;
		background: #ecfdf5;
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.summary-icon {
		background: #10b981;
		color: white;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.summary-header h3 {
		color: #047857;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.summary-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.summary-name {
		font-weight: 600;
		color: var(--gray-900, #0f172a);
	}

	.summary-reg {
		font-size: 0.875rem;
		color: var(--gray-600, #475569);
		font-family: monospace;
	}

	.summary-detail {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		font-size: 0.875rem;
	}

	.summary-detail span {
		color: var(--gray-600, #475569);
	}

	.summary-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Loading State */
	.vehicle-card-skeleton {
		padding: 1rem;
		border: 1px solid var(--gray-200, #e2e8f0);
		border-radius: 8px;
		background: var(--white, #ffffff);
	}

	.skeleton-header,
	.skeleton-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.skeleton-header {
		flex-direction: row;
		align-items: center;
		gap: 1rem;
	}

	.skeleton-icon,
	.skeleton-line {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-icon {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.skeleton-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-line {
		height: 1rem;
	}

	.skeleton-line.short {
		width: 60%;
		height: 0.875rem;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty/Error States */
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--gray-600, #475569);
	}

	.empty-icon,
	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state p,
	.error-state p {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
	}

	.empty-state small,
	.error-state small {
		font-size: 0.875rem;
		color: var(--gray-500, #64748b);
		max-width: 300px;
	}

	/* Vehicle Type Icon */
	.vehicle-type-icon {
		font-size: 1.2rem;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.vehicle-selection {
			gap: 0.5rem;
			padding: 0;
		}

		.step-header {
			margin-bottom: 0.5rem;
		}

		.step-header h2 {
			font-size: 1.125rem;
			margin: 0;
		}

		.table-container {
			margin: 0 -0.5rem;
			background: white;
			border-radius: 0.5rem;
			border: 1px solid var(--gray-200, #e2e8f0);
			overflow: hidden;
		}

		:global(.table) {
			width: 100%;
			font-size: 14px;
			border-collapse: collapse;
			table-layout: fixed;
		}

		:global(.table th),
		:global(.table td) {
			padding: 0.5rem 0.375rem !important;
			border-bottom: 1px solid var(--gray-100, #f1f5f9);
		}

		:global(.table th) {
			background-color: var(--gray-50, #f8fafc);
			font-weight: 600;
			color: var(--gray-700, #334155);
			text-transform: uppercase;
			font-size: 0.75rem;
			height: 40px;
		}

		:global(.table .clickable) {
			cursor: pointer;
			height: 48px;
		}

		:global(.table .clickable:hover) {
			background-color: var(--gray-50, #f8fafc);
		}

		:global(.table .selected) {
			background: var(--primary, #2563eb);
			color: white;
			font-weight: 600;
		}

		/* Mobile table column widths - Optimized */
		:global(#vehicle-table th:nth-child(1)),
		:global(#vehicle-table td:nth-child(1)) { /* Code - Made narrower */
			width: 15%;
			font-weight: 600;
			color: var(--primary, #2563eb);
			font-size: 13px;
		}

		:global(#vehicle-table th:nth-child(2)),
		:global(#vehicle-table td:nth-child(2)) { /* Name */
			width: 40%;
			font-weight: 500;
		}

		:global(#vehicle-table th:nth-child(3)),
		:global(#vehicle-table td:nth-child(3)) { /* Type - Just icon, narrower */
			width: 15%;
			text-align: center;
		}

		:global(#vehicle-table th:nth-child(4)),
		:global(#vehicle-table td:nth-child(4)) { /* Registration - More space */
			width: 30%;
			font-size: 13px;
			font-family: monospace;
			font-weight: 500;
		}

		:global(#vehicle-table .selected td:nth-child(1)) {
			color: white;
		}

		.summary-content {
			flex-direction: column;
			gap: 0.75rem;
		}

		.summary-detail {
			align-items: flex-start;
		}
	}

	/* Extra small mobile devices */
	@media (max-width: 480px) {
		:global(.table th),
		:global(.table td) {
			padding: 0.5rem 0.375rem !important;
			font-size: 13px;
		}
	}
</style>