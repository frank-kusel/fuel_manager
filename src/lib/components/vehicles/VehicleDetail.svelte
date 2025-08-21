<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { Vehicle, VehicleType } from '$lib/types';

	interface Props {
		vehicle: Vehicle;
	}

	let { vehicle }: Props = $props();

	const dispatch = createEventDispatcher<{
		edit: Vehicle;
		delete: Vehicle;
		close: void;
	}>();

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

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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

	function handleEdit() {
		dispatch('edit', vehicle);
	}

	function handleDelete() {
		if (confirm(`Are you sure you want to delete vehicle "${vehicle.name}" (${vehicle.code})? This action cannot be undone.`)) {
			dispatch('delete', vehicle);
		}
	}

	function handleClose() {
		dispatch('close');
	}
</script>

<Card class="vehicle-detail-card">
	<div class="detail-header">
		<div class="vehicle-title">
			<div class="vehicle-icon">
				{getVehicleTypeIcon(vehicle.type)}
			</div>
			<div class="title-info">
				<h2>{vehicle.name}</h2>
				<div class="vehicle-code">Code: {vehicle.code}</div>
			</div>
		</div>
		
		<div class="status-badge">
			<span class="status {vehicle.active ? 'active' : 'inactive'}">
				{vehicle.active ? 'Active' : 'Inactive'}
			</span>
		</div>
	</div>

	<div class="detail-content">
		<div class="detail-section">
			<h3>Basic Information</h3>
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">Vehicle Type:</span>
					<span class="value type-value">{vehicle.type}</span>
				</div>
				<div class="detail-item">
					<span class="label">Registration:</span>
					<span class="value registration">{vehicle.registration}</span>
				</div>
				<div class="detail-item">
					<span class="label">Fuel Type:</span>
					<span class="value fuel-type">{vehicle.fuel_type || 'diesel'}</span>
				</div>
				<div class="detail-item">
					<span class="label">Current Odometer:</span>
					<span class="value odometer">{formatOdometer(vehicle)}</span>
				</div>
			</div>
		</div>

		{#if vehicle.make || vehicle.model || vehicle.year}
			<div class="detail-section">
				<h3>Vehicle Specifications</h3>
				<div class="detail-grid">
					{#if vehicle.make}
						<div class="detail-item">
							<span class="label">Make:</span>
							<span class="value">{vehicle.make}</span>
						</div>
					{/if}
					{#if vehicle.model}
						<div class="detail-item">
							<span class="label">Model:</span>
							<span class="value">{vehicle.model}</span>
						</div>
					{/if}
					{#if vehicle.year}
						<div class="detail-item">
							<span class="label">Year:</span>
							<span class="value">{vehicle.year}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="detail-section">
			<h3>System Information</h3>
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">Created:</span>
					<span class="value">{formatDate(vehicle.created_at)}</span>
				</div>
				<div class="detail-item">
					<span class="label">Last Updated:</span>
					<span class="value">{formatDate(vehicle.updated_at)}</span>
				</div>
			</div>
		</div>

		<!-- Future: Add fuel usage statistics, maintenance records, etc. -->
		<div class="detail-section">
			<h3>Usage Statistics</h3>
			<div class="stats-placeholder">
				<p>📊 Fuel usage statistics and maintenance records will be available here once data is collected.</p>
			</div>
		</div>
	</div>

	<div class="detail-actions">
		<Button variant="secondary" onclick={handleClose}>
			{#snippet children()}
				Close
			{/snippet}
		</Button>
		
		<div class="action-group">
			<Button variant="primary" onclick={handleEdit}>
				{#snippet children()}
					<span class="action-icon">✏️</span>
					Edit
				{/snippet}
			</Button>
			
			<Button variant="error" onclick={handleDelete}>
				{#snippet children()}
					<span class="action-icon">🗑️</span>
					Delete
				{/snippet}
			</Button>
		</div>
	</div>
</Card>

<style>
	.vehicle-detail-card {
		max-width: 700px;
		margin: 0 auto;
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--gray-200);
	}

	.vehicle-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.vehicle-icon {
		font-size: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		background: var(--gray-100);
		border-radius: 50%;
	}

	.title-info h2 {
		margin: 0 0 0.25rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--gray-900);
	}

	.vehicle-code {
		font-size: 0.9rem;
		color: var(--gray-600);
		font-weight: 500;
	}

	.status-badge {
		display: flex;
		align-items: center;
	}

	.status {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status.active {
		background: var(--green-100);
		color: var(--green-800);
		border: 1px solid var(--green-200);
	}

	.status.inactive {
		background: var(--gray-100);
		color: var(--gray-600);
		border: 1px solid var(--gray-300);
	}

	.detail-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.detail-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-800);
		border-bottom: 1px solid var(--gray-200);
		padding-bottom: 0.5rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--gray-50);
		border-radius: var(--border-radius);
		border: 1px solid var(--gray-200);
	}

	.detail-item .label {
		font-weight: 500;
		color: var(--gray-600);
		font-size: 0.9rem;
	}

	.detail-item .value {
		font-weight: 600;
		color: var(--gray-900);
		text-align: right;
	}

	.type-value {
		text-transform: capitalize;
	}

	.registration {
		text-transform: uppercase;
		font-family: monospace;
		background: var(--gray-200);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.fuel-type {
		text-transform: capitalize;
	}

	.odometer {
		font-family: monospace;
	}

	.stats-placeholder {
		padding: 2rem;
		text-align: center;
		background: var(--gray-50);
		border: 2px dashed var(--gray-300);
		border-radius: var(--border-radius);
		color: var(--gray-600);
	}

	.stats-placeholder p {
		margin: 0;
		font-style: italic;
	}

	.detail-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid var(--gray-200);
		padding-top: 1.5rem;
		margin-top: 2rem;
	}

	.action-group {
		display: flex;
		gap: 0.75rem;
	}

	.action-icon {
		font-size: 1rem;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.vehicle-detail-card {
			margin: 0;
		}

		.detail-header {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.vehicle-title {
			flex-direction: column;
			text-align: center;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}

		.detail-item {
			flex-direction: column;
			gap: 0.25rem;
			text-align: center;
		}

		.detail-item .value {
			text-align: center;
		}

		.detail-actions {
			flex-direction: column;
			gap: 1rem;
		}

		.action-group {
			width: 100%;
			justify-content: stretch;
		}

		.action-group :global(.btn) {
			flex: 1;
		}
	}
</style>