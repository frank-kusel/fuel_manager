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
	
	// Group vehicles by type for better organization (active vehicles only)
	let groupedVehicles = $derived.by(() => {
		const groups: Record<string, Vehicle[]> = {};
		
		// Filter for active vehicles only, then sort
		const activeVehicles = vehicles.filter(v => v.is_active !== false);
		const sorted = [...activeVehicles].sort((a, b) => {
			const typeA = a.type || 'Other';
			const typeB = b.type || 'Other';
			if (typeA < typeB) return -1;
			if (typeA > typeB) return 1;
			// If same type, sort by name
			const nameA = a.name || '';
			const nameB = b.name || '';
			if (nameA < nameB) return -1;
			if (nameA > nameB) return 1;
			return 0;
		});
		
		// Group by type
		sorted.forEach(vehicle => {
			const type = vehicle.type || 'Other';
			if (!groups[type]) {
				groups[type] = [];
			}
			groups[type].push(vehicle);
		});
		
		return groups;
	});

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
						<th>Reg</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(groupedVehicles) as [type, vehicleList]}
						<!-- Type Group Header -->
						<tr class="group-header">
							<td colspan="3" class="group-title vehicle-type-{type.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}">
								<div class="group-content">
									<span class="group-dot"></span>
									<span class="group-label">{type}</span>
									<span class="group-count">{vehicleList.length}</span>
								</div>
							</td>
						</tr>
						
						<!-- Vehicles in this type group -->
						{#each vehicleList as vehicle (vehicle.id)}
							<tr 
								class="vehicle-row clickable vehicle-type-{(vehicle.type || 'other').toLowerCase().replace(/\\s+/g, '-').replace(/[()]/g, '')} {selectedVehicle?.id === vehicle.id ? 'selected' : ''}"
								onclick={() => {
									handleVehicleSelect(vehicle);
								}}
							>
								<td class="vehicle-code">{vehicle.code || 'VEH'}</td>
								<td class="vehicle-name">{vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`.trim()}</td>
								<td class="vehicle-reg">{vehicle.registration || ''}</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	
	{#if selectedVehicle}
		<div class="selected-summary">
			<div class="selected-item">
				<div class="selected-label">Selected Vehicle</div>
				<div class="selected-name">{selectedVehicle.name || `${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim()}</div>
				<div class="selected-detail">{selectedVehicle.registration || ''}</div>
			</div>
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

	/* Consistent table styling */
	.table-container {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 0.5rem;
		overflow: hidden;
		margin: 0;
	}

	:global(.table) {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	:global(.table th),
	:global(.table td) {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid #f1f5f9;
		font-size: 14px;
		vertical-align: top;
	}

	:global(.table th) {
		background: #f8fafc;
		font-size: 12px;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		height: 44px;
	}

	:global(.table tbody tr.clickable) {
		cursor: pointer;
		transition: background 0.2s ease;
		min-height: 48px;
	}

	:global(.table tbody tr.clickable:hover) {
		background: #f8fafc;
	}

	/* Group Headers */
	.group-header {
		background: #f1f5f9 !important;
	}
	
	.group-title {
		padding: 0.5rem 0.75rem !important;
		font-size: 0.75rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.group-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.group-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #9ca3af;
		flex-shrink: 0;
	}
	
	.group-label {
		flex: 1;
	}
	
	.group-count {
		color: #6b7280;
		font-size: 0.7rem;
	}

	/* Vehicle rows */
	.vehicle-row.selected {
		background: #2563eb;
		color: white;
	}

	.vehicle-row.selected .vehicle-code,
	.vehicle-row.selected .vehicle-name,
	.vehicle-row.selected .vehicle-reg {
		color: white;
	}

	/* Vehicle styling */
	.vehicle-code {
		font-weight: 600;
		color: #2563eb;
		font-size: 14px;
	}
	
	.vehicle-name {
		font-weight: 500;
		color: #111827;
		font-size: 14px;
	}
	
	.vehicle-reg {
		font-size: 12px;
		color: #6b7280;
		font-family: monospace;
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
		color: var(--gray-900, #0f172a);
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

	/* Selected summary */
	.selected-summary {
		margin-top: 1rem;
		padding: 1rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 0.5rem;
	}

	.selected-item {
		text-align: center;
	}

	.selected-label {
		font-size: 0.75rem;
		color: #059669;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.selected-name {
		font-size: 1rem;
		font-weight: 700;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.selected-detail {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: monospace;
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
		.table-container {
			margin: 0;
			border-radius: 0.5rem;
		}

		:global(.table th),
		:global(.table td) {
			padding: 10px 12px;
			font-size: 14px;
		}

		:global(.table th) {
			font-size: 11px;
			height: 40px;
		}

		:global(.table tbody tr) {
			min-height: 52px;
		}

		.vehicle-code,
		.vehicle-name,
		.vehicle-reg {
			font-size: 14px;
		}

		/* Mobile table column widths */
		:global(#vehicle-table th:nth-child(1)),
		:global(#vehicle-table td:nth-child(1)) { /* Code - Narrower */
			width: 18%;
		}

		:global(#vehicle-table th:nth-child(2)),
		:global(#vehicle-table td:nth-child(2)) { /* Name */
			width: 45%;
		}

		:global(#vehicle-table th:nth-child(3)),
		:global(#vehicle-table td:nth-child(3)) { /* Registration - Wider */
			width: 37%;
		}

		:global(#vehicle-table .selected td:nth-child(1)) {
			color: var(--gray-900, #0f172a);
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
			padding: 8px 10px;
			font-size: 13px;
		}
	}
</style>