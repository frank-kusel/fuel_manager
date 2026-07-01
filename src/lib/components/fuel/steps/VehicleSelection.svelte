<script lang="ts">
	import { vehicles, referenceDataLoading, referenceDataError } from '$lib/stores/reference-data';
	import type { Vehicle } from '$lib/types';

	interface Props {
		selectedVehicle: Vehicle | null;
		onVehicleSelect: (vehicle: Vehicle | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}

	let { selectedVehicle, onVehicleSelect, onAutoAdvance, errors }: Props = $props();

	let searchQuery = $state('');

	function matchesSearch(vehicle: Vehicle, query: string): boolean {
		if (!query.trim()) return true;
		const q = query.toLowerCase();
		return [vehicle.code, vehicle.name, vehicle.make, vehicle.model, vehicle.registration]
			.some((f) => (f || '').toLowerCase().includes(q));
	}

	function handleVehicleSelect(vehicle: Vehicle) {
		onVehicleSelect(vehicle);
		// Auto-advance immediately
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}

	// Group vehicles by type for better organization (active vehicles only)
	let groupedVehicles = $derived.by(() => {
		const groups: Record<string, Vehicle[]> = {};

		// Filter for active vehicles only (and matching the search query), then sort
		const activeVehicles = $vehicles.filter(v => v.is_active !== false && matchesSearch(v, searchQuery));
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
	
	function formatOdometer(reading: number | null, unit: string | null): string {
		if (reading === null) return 'Not set';
		return `${new Intl.NumberFormat('en-US').format(reading)} ${unit || 'km'}`;
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
	
	{#if $referenceDataLoading}
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
	{:else if $referenceDataError}
		<div class="error-state">
			<div class="error-icon">🚨</div>
			<p>Failed to load vehicles</p>
			<small>{$referenceDataError}</small>
		</div>
	{:else if $vehicles.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🚜</div>
			<p>No vehicles available</p>
			<small>Add vehicles to your fleet to begin fuel entries</small>
		</div>
	{:else}
		<div class="search-bar">
			<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
			</svg>
			<input
				type="search"
				class="search-input"
				placeholder="Search vehicles…"
				bind:value={searchQuery}
				aria-label="Search vehicles"
			/>
			{#if searchQuery}
				<button class="search-clear" onclick={() => (searchQuery = '')} aria-label="Clear search">×</button>
			{/if}
		</div>

		{#if Object.keys(groupedVehicles).length === 0}
			<div class="empty-state">
				<div class="empty-icon">🔍</div>
				<p>No matches for "{searchQuery}"</p>
				<small>Try a different code, name, or registration</small>
			</div>
		{:else}
		<div class="vehicle-table-container">
			<table class="vehicle-table">
				<colgroup>
					<col class="col-code">
					<col class="col-name">
					<col class="col-reg">
				</colgroup>
				<tbody>
					{#each Object.entries(groupedVehicles) as [type, vehicleList]}
						<!-- Type Group Header -->
						<tr class="group-header">
							<td colspan="3" class="group-title">
								<span class="group-label">{type}</span>
							</td>
						</tr>
						
						<!-- Vehicles in this type group -->
						{#each vehicleList as vehicle (vehicle.id)}
							<tr 
								class="vehicle-row {selectedVehicle?.id === vehicle.id ? 'selected' : ''}"
								onclick={() => handleVehicleSelect(vehicle)}
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

	/* Search bar */
	.search-bar {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.875rem;
		color: var(--gray-400);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.625rem 2.5rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-lg);
		font-size: var(--text-base);
		color: var(--gray-900);
		background: var(--white);
		box-sizing: border-box;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		-webkit-appearance: none;
		appearance: none;
	}

	.search-input::placeholder {
		color: var(--gray-400);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		background: var(--gray-100);
		color: var(--gray-600);
		border-radius: var(--radius-full);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.search-clear:hover {
		background: var(--gray-200);
	}

	@media (max-width: 768px) {
		.search-input {
			font-size: 16px; /* prevents iOS zoom on focus */
		}
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

	/* Clean table container */
	.vehicle-table-container {
		background: transparent;
		margin: 0;
	}

	/* Clean table design */
	.vehicle-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		table-layout: fixed;
	}

	/* Column widths using colgroup - Desktop */
	.col-code { width: 15%; }
	.col-name { width: 60%; }
	.col-reg { width: 25%; }

	.vehicle-table td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border: none;
		font-size: 1rem;
		vertical-align: middle;
		border-bottom: 1px solid rgba(248, 250, 252, 0.8);
	}

	.vehicle-table tbody tr.vehicle-row {
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.vehicle-table tbody tr.vehicle-row:hover {
		background: rgba(0, 0, 0, 0.02);
		border-bottom-color: rgba(203, 213, 225, 0.4);
	}

	.vehicle-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* Group headers */
	.vehicle-table tbody tr.group-header td {
		background: var(--gray-100, #f9fafb);
	}
	
	.group-title {
		padding: 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		border: none;
		text-align: center;
		border-radius: 1rem;
	}
	
	.group-label {
		font-weight: 600;
		color: #6b7280;
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		display: block;
		text-align: center;
		width: 100%;
	}

	/* Selected vehicle row */
	.vehicle-table tbody tr.vehicle-row.selected {
		background: rgba(13, 148, 136, 0.08);
		border-radius: 0.5rem;
	}

	.vehicle-table tbody tr.vehicle-row.selected .vehicle-code {
		color: var(--brand-hover);
		font-weight: 600;
	}

	.vehicle-table tbody tr.vehicle-row.selected .vehicle-name {
		color: #1e293b;
		font-weight: 500;
	}

	.vehicle-table tbody tr.vehicle-row.selected .vehicle-reg {
		color: #475569;
	}

	/* Cell styling */
	.vehicle-code {
		font-weight: 600;
		color: #374151;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		text-align: left;
		padding-left: 0.5rem;
	}
	
	.vehicle-name {
		font-weight: 400;
		color: #111827;
		font-size: 0.875rem;
	}
	
	.vehicle-reg {
		font-size: 0.75rem;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	/* Clean selected summary */
	.selected-summary {
		margin-top: 2rem;
		padding: 1.5rem 0;
		background: transparent;
		border-top: 1px solid #f1f5f9;
	}

	.selected-item {
		text-align: center;
	}

	.selected-label {
		font-size: 0.6875rem;
		color: #9ca3af;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.5rem;
	}

	.selected-name {
		font-size: 1rem;
		font-weight: 500;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.selected-detail {
		font-size: 0.8125rem;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
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

		/* Mobile column widths */
		.col-code { width: 20%; }
		.col-name { width: 45%; }
		.col-reg { width: 35%; }

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