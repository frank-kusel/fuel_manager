<script lang="ts">
	import type { Driver } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		driver: Driver;
	}

	let { driver }: Props = $props();

	const dispatch = createEventDispatcher<{ view: void; edit: void }>();

	function getDriverInitials(driver: Driver): string {
		const names = driver.name.split(' ').filter(n => n.length > 0);
		if (names.length >= 2) {
			return (names[0][0] + names[names.length - 1][0]).toUpperCase();
		} else if (names.length === 1) {
			return names[0][0].toUpperCase();
		}
		return 'D';
	}
</script>

<Card class="driver-card" padding="none">
	<div class="driver-content">
		<div class="driver-header">
			<div class="driver-avatar">
				{getDriverInitials(driver)}
			</div>
			<div class="driver-info">
				<h3>{driver.name}</h3>
				<p class="driver-code">{driver.employee_code}</p>
			</div>
			<div class="status-indicator">
				<span class="status {driver.active ? 'active' : 'inactive'}">
					{driver.active ? 'Active' : 'Inactive'}
				</span>
			</div>
		</div>
		
		<div class="driver-details">
			<div class="detail-item">
				<span class="detail-label">Employee ID:</span>
				<span class="detail-value">{driver.employee_code || 'N/A'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">License:</span>
				<span class="detail-value {driver.license_number ? 'has-license' : 'no-license'}">
					{driver.license_number || 'No License'}
				</span>
			</div>
			{#if driver.license_expiry}
				<div class="detail-item">
					<span class="detail-label">Expires:</span>
					<span class="detail-value expiry-date">
						{new Date(driver.license_expiry).toLocaleDateString()}
					</span>
				</div>
			{/if}
			{#if driver.phone}
				<div class="detail-item">
					<span class="detail-label">Phone:</span>
					<span class="detail-value">{driver.phone}</span>
				</div>
			{/if}
		</div>
		
		<div class="driver-actions">
			<Button variant="secondary" size="small" onclick={() => dispatch('view')}>
				View
			</Button>
			<Button variant="primary" size="small" onclick={() => dispatch('edit')}>
				Edit
			</Button>
			<a href="/fleet/drivers/{driver.id}">
				<Button variant="primary" size="small">
					Analytics
				</Button>
			</a>
		</div>
	</div>
</Card>

<style>
	.driver-card {
		transition: all 0.2s ease-in-out;
		border: 2px solid transparent;
	}

	.driver-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lg);
		border-color: var(--primary);
	}

	.driver-content {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.driver-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--gray-50);
		border-bottom: 1px solid var(--gray-200);
	}

	.driver-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.driver-info {
		line-height: 1.2;
	}

	.driver-info h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.driver-code {
		margin: 0;
		font-size: 0.875rem;
		color: var(--gray-500);
		font-family: var(--font-mono);
	}

	.status-indicator .status {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status.active {
		background-color: var(--green-100);
		color: var(--green-800);
	}

	.status.inactive {
		background-color: var(--gray-200);
		color: var(--gray-700);
	}

	.driver-details {
		padding: 1rem;
		display: grid;
		gap: 0.75rem;
		flex-grow: 1;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.detail-label {
		color: var(--gray-600);
		font-weight: 500;
	}

	.detail-value {
		color: var(--gray-800);
		font-weight: 500;
	}

	.detail-value.has-license {
		color: var(--blue-600);
	}
	.detail-value.no-license {
		color: var(--red-600);
	}
	.detail-value.expiry-date {
		font-weight: 600;
	}

	.driver-actions {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0 1rem 1rem;
		border-top: 1px solid var(--gray-200);
		padding-top: 1rem;
	}
	
	.driver-actions a {
		text-decoration: none;
	}

	.driver-actions :global(.btn) {
		width: 100%;
	}
</style>
