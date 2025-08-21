<script lang="ts">
	import type { Bowser } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	
	interface Props {
		bowser: Bowser;
		onclick?: () => void;
		selected?: boolean;
	}
	
	let { bowser, onclick, selected = false }: Props = $props();
	
	const formatCapacity = (capacity: number) => {
		return new Intl.NumberFormat('en-ZA').format(capacity);
	};
</script>

<Card {onclick} hover shadow={selected}>
	<div class="bowser-card">
		<div class="header">
			<div class="title-row">
				<h3>{bowser.name}</h3>
				<span class="code">{bowser.code}</span>
			</div>
			{#if bowser.registration}
				<span class="registration">{bowser.registration}</span>
			{/if}
		</div>
		
		<div class="details">
			<div class="detail-item">
				<span class="label">Capacity:</span>
				<span class="value">{formatCapacity(bowser.capacity)} L</span>
			</div>
			
			{#if bowser.fuel_type}
				<div class="detail-item">
					<span class="label">Fuel Type:</span>
					<span class="value capitalize">{bowser.fuel_type}</span>
				</div>
			{/if}
			
			<div class="detail-item">
				<span class="label">Status:</span>
				<span class="status" class:active={bowser.active} class:inactive={!bowser.active}>
					{bowser.active ? 'Active' : 'Inactive'}
				</span>
			</div>
		</div>
		
		{#if bowser.id.startsWith('temp_')}
			<div class="offline-badge">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2v20M2 12h20"/>
				</svg>
				Pending sync
			</div>
		{/if}
	</div>
</Card>

<style>
	.bowser-card {
		position: relative;
	}
	
	.header {
		margin-bottom: 1rem;
	}
	
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}
	
	h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
	}
	
	.code {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
		background: var(--color-primary-light);
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}
	
	.registration {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}
	
	.details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}
	
	.label {
		color: var(--color-text-secondary);
	}
	
	.value {
		font-weight: 500;
		color: var(--color-text);
	}
	
	.capitalize {
		text-transform: capitalize;
	}
	
	.status {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.status.active {
		background: var(--color-success-light);
		color: var(--color-success);
	}
	
	.status.inactive {
		background: var(--color-error-light);
		color: var(--color-error);
	}
	
	.offline-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-warning-light);
		color: var(--color-warning);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.offline-badge svg {
		width: 12px;
		height: 12px;
	}
</style>