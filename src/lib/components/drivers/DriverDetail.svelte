<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { Driver } from '$lib/types';

	interface Props {
		driver: Driver;
	}

	let { driver }: Props = $props();

	const dispatch = createEventDispatcher<{
		edit: Driver;
		delete: Driver;
		close: void;
	}>();

	function getDriverInitials(driver: Driver): string {
		const names = driver.name.split(' ').filter(n => n.length > 0);
		if (names.length >= 2) {
			return (names[0][0] + names[names.length - 1][0]).toUpperCase();
		} else if (names.length === 1) {
			return names[0][0].toUpperCase();
		}
		return 'D';
	}

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	function handleEdit() {
		dispatch('edit', driver);
	}

	function handleDelete() {
		if (confirm(`Are you sure you want to delete driver "${driver.name}" (${driver.employee_code})? This action cannot be undone.`)) {
			dispatch('delete', driver);
		}
	}

	function handleClose() {
		dispatch('close');
	}
</script>

<Card class="driver-detail-card">
	<div class="detail-header">
		<div class="driver-title">
			<div class="driver-avatar">
				{getDriverInitials(driver)}
			</div>
			<div class="title-info">
				<h2>{driver.name}</h2>
				<div class="driver-code">Code: {driver.employee_code}</div>
			</div>
		</div>
		
		<div class="status-badge">
			<span class="status {driver.active ? 'active' : 'inactive'}">
				{driver.active ? 'Active' : 'Inactive'}
			</span>
		</div>
	</div>

	<div class="detail-content">
		<div class="detail-section">
			<h3>Contact Information</h3>
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">Phone:</span>
					<span class="value">{driver.phone || 'N/A'}</span>
				</div>
				<div class="detail-item">
					<span class="label">Email:</span>
					<span class="value">{driver.email || 'N/A'}</span>
				</div>
			</div>
		</div>

		<div class="detail-section">
			<h3>License Details</h3>
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">License Number:</span>
					<span class="value license-number">{driver.license_number || 'N/A'}</span>
				</div>
				<div class="detail-item">
					<span class="label">License Expiry:</span>
					<span class="value">{formatDate(driver.license_expiry)}</span>
				</div>
			</div>
		</div>

		<div class="detail-section">
			<h3>System Information</h3>
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">Default Vehicle:</span>
					<span class="value">{driver.defaultVehicle || 'Not set'}</span>
				</div>
				<div class="detail-item">
					<span class="label">Created:</span>
					<span class="value">{formatDate(driver.created_at)}</span>
				</div>
				<div class="detail-item">
					<span class="label">Last Updated:</span>
					<span class="value">{formatDate(driver.updated_at)}</span>
				</div>
			</div>
		</div>
	</div>

	<div class="detail-actions">
		<Button variant="secondary" onclick={handleClose}>Close</Button>
		
		<div class="action-group">
			<Button variant="primary" onclick={handleEdit}>
				<span class="action-icon">✏️</span>
				Edit
			</Button>
			
			<Button variant="error" onclick={handleDelete}>
				<span class="action-icon">🗑️</span>
				Delete
			</Button>
		</div>
	</div>
</Card>

<style>
	.driver-detail-card {
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

	.driver-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.driver-avatar {
		font-size: 2rem;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		background: var(--primary-light);
		color: var(--primary);
		border-radius: 50%;
	}

	.title-info h2 {
		margin: 0 0 0.25rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--gray-900);
	}

	.driver-code {
		font-size: 0.9rem;
		color: var(--gray-600);
		font-weight: 500;
	}

	.status-badge .status {
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

	.license-number {
		font-family: monospace;
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
		margin-right: 0.5rem;
	}

	@media (max-width: 768px) {
		.detail-header {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.driver-title {
			flex-direction: column;
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
