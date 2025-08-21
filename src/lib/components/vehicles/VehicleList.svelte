<script lang="ts">
	import { onMount } from 'svelte';
	import vehicleStore, { vehicles, vehicleLoading, vehicleError } from '$lib/stores/vehicles';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { Vehicle, VehicleType } from '$lib/types';
	
	interface Props {
		onselect?: (vehicle: Vehicle) => void;
		oncreate?: () => void;
	}

	let { onselect, oncreate }: Props = $props();

	onMount(() => {
		vehicleStore.loadVehicles();
	});

	function getVehicleTypeIcon(type: VehicleType): string {
		const icons = {
			tractor: '🚜',
			bakkie: '🛻',
			truck: '🚛',
			loader: '🚧',
			harvester: '🌾',
			sprayer: '🌿',
			other: '🚗'
		};
		return icons[type] || icons.other;
	}

	function getVehicleTypeColor(type: VehicleType): string {
		const colors = {
			tractor: '#16a34a',
			bakkie: '#2563eb',
			truck: '#dc2626',
			loader: '#ea580c',
			harvester: '#65a30d',
			sprayer: '#059669',
			other: '#6b7280'
		};
		return colors[type] || colors.other;
	}

	function formatOdometer(vehicle: Vehicle): string {
		// Use new current_odometer field from database
		const odometer = vehicle.current_odometer;
		const unit = vehicle.odometer_unit || 'km';
		
		if (odometer == null || odometer === undefined) {
			return 'N/A';
		}
		
		return `${odometer.toLocaleString()} ${unit}`;
	}
</script>

<div class="vehicle-list">
	<div class="header">
		<div class="header-content">
			<h2>Vehicles</h2>
			<p class="subtitle">Manage your fleet vehicles, registration, and maintenance information</p>
		</div>
		<div class="header-actions">
			{#if oncreate}
				<Button variant="primary" onclick={oncreate}>
					<span class="icon">➕</span>
					Add Vehicle
				</Button>
			{/if}
		</div>
	</div>

	{#if $vehicleLoading === 'loading'}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading vehicles...</p>
		</div>
	{:else if $vehicleError}
		<Card class="error-card">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<div>
					<h3>Failed to Load Vehicles</h3>
					<p>{$vehicleError}</p>
					<Button variant="secondary" onclick={() => vehicleStore.loadVehicles()}>
						{#snippet children()}
							Retry
						{/snippet}
					</Button>
				</div>
			</div>
		</Card>
	{:else if $vehicles.length === 0}
		<Card class="empty-state">
			<div class="empty-content">
				<span class="empty-icon">🚜</span>
				<h3>No Vehicles Found</h3>
				<p>Get started by adding your first vehicle to the fleet.</p>
				{#if oncreate}
					<Button variant="primary" onclick={oncreate}>
						Add Your First Vehicle
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<div class="stats">
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$vehicles.length}</span>
					<span class="stat-label">Total Vehicles</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$vehicles.filter(v => v.active).length}</span>
					<span class="stat-label">Active</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$vehicles.filter(v => !v.active).length}</span>
					<span class="stat-label">Inactive</span>
				</div>
			</Card>
		</div>

		<!-- Vehicle Table -->
		<div class="vehicle-table-container">
			<table class="vehicle-table">
				<thead>
					<tr>
						<th>Type</th>
						<th>Code</th>
						<th>Name</th>
						<th>Registration</th>
						<th>Make/Model</th>
						<th>Year</th>
						<th>Fuel Type</th>
						<th>Odometer</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each $vehicles as vehicle (vehicle.id)}
						<tr class="vehicle-row" onclick={() => onselect?.(vehicle)}>
							<td class="type-cell">
								<div class="vehicle-type" style="color: {getVehicleTypeColor(vehicle.type)}">
									<span class="type-icon">{getVehicleTypeIcon(vehicle.type)}</span>
									<span class="type-label">{vehicle.type}</span>
								</div>
							</td>
							<td class="code-cell">{vehicle.code}</td>
							<td class="name-cell">{vehicle.name}</td>
							<td class="registration-cell">{vehicle.registration}</td>
							<td class="make-model-cell">
								{vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : '-'}
							</td>
							<td class="year-cell">{vehicle.year || '-'}</td>
							<td class="fuel-type-cell">
								<span class="fuel-badge {vehicle.fuel_type || 'diesel'}">
									{vehicle.fuel_type || 'diesel'}
								</span>
							</td>
							<td class="odometer-cell">{formatOdometer(vehicle)}</td>
							<td class="status-cell">
								<span class="status {vehicle.active ? 'active' : 'inactive'}">
									{vehicle.active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="actions-cell">
								<div class="action-buttons">
									<Button size="sm" variant="outline" onclick={(e) => { e.stopPropagation(); onselect?.(vehicle); }}>
										View
									</Button>
									<a href="/fleet/vehicles/{vehicle.id}" onclick={(e) => e.stopPropagation()}>
										<Button size="sm" variant="primary">
											Analytics
										</Button>
									</a>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.vehicle-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-content h2 {
		margin: 0 0 0.5rem 0;
		color: var(--gray-900);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.subtitle {
		margin: 0;
		color: var(--gray-600);
		font-size: 0.9rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.icon {
		font-size: 1rem;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		gap: 1rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--gray-200);
		border-top: 3px solid var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Error state */
	.error-card {
		border-color: var(--error);
		background: var(--red-50);
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		font-size: 2rem;
	}

	.error-content h3 {
		margin: 0 0 0.5rem 0;
		color: var(--error);
	}

	.error-content p {
		margin: 0 0 1rem 0;
		color: var(--gray-600);
	}

	/* Empty state */
	.empty-state {
		border: 2px dashed var(--gray-300);
		background: var(--gray-50);
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		opacity: 0.5;
	}

	.empty-content h3 {
		margin: 0;
		color: var(--gray-700);
	}

	.empty-content p {
		margin: 0;
		color: var(--gray-600);
	}

	/* Stats */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--primary);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--gray-600);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Vehicle Table */
	.vehicle-table-container {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: auto;
		background: white;
	}

	.vehicle-table {
		width: 100%;
		border-collapse: collapse;
	}

	.vehicle-table th {
		background: #f8fafc;
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
		position: sticky;
		top: 0;
		white-space: nowrap;
	}

	.vehicle-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		font-size: 0.875rem;
		vertical-align: middle;
	}

	.vehicle-row {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.vehicle-row:hover {
		background: #f8fafc;
	}

	.type-cell .vehicle-type {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.type-icon {
		font-size: 1.125rem;
	}

	.type-label {
		text-transform: capitalize;
		font-size: 0.75rem;
	}

	.code-cell {
		font-weight: 600;
		color: #0f172a;
	}

	.name-cell {
		font-weight: 500;
		color: #0f172a;
	}

	.fuel-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.fuel-badge.diesel {
		background: #fef3c7;
		color: #92400e;
	}

	.fuel-badge.petrol {
		background: #fee2e2;
		color: #991b1b;
	}

	.actions-cell {
		width: 180px;
	}
	
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	
	.action-buttons a {
		text-decoration: none;
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status.active {
		background: var(--green-100);
		color: var(--green-800);
	}

	.status.inactive {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.header-actions {
			justify-content: stretch;
		}

		.stats {
			grid-template-columns: repeat(3, 1fr);
		}

		.vehicle-table-container {
			overflow-x: auto;
		}

		.vehicle-table {
			min-width: 800px;
		}

		.vehicle-table th,
		.vehicle-table td {
			padding: 0.5rem;
		}
	}
</style>