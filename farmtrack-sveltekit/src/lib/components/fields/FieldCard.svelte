<script lang="ts">
	import type { Field } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	
	interface Props {
		field: Field;
		onclick?: () => void;
		selected?: boolean;
	}
	
	let { field, onclick, selected = false }: Props = $props();
	
	const formatArea = (area: number) => {
		return new Intl.NumberFormat('en-ZA', { 
			minimumFractionDigits: 1, 
			maximumFractionDigits: 2 
		}).format(area);
	};
	
	const formatType = (type: string) => {
		return type.charAt(0).toUpperCase() + type.slice(1);
	};
	
	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'arable':
				return '🌾';
			case 'pasture':
				return '🌿';
			case 'orchard':
				return '🌳';
			case 'greenhouse':
				return '🏠';
			case 'other':
				return '📍';
			default:
				return '📍';
		}
	};
</script>

<Card {onclick} hover shadow={selected}>
	<div class="field-card">
		<div class="header">
			<div class="title-row">
				<div class="title-section">
					<span class="type-icon">{getTypeIcon(field.type)}</span>
					<h3>{field.name}</h3>
				</div>
				<span class="code">{field.code}</span>
			</div>
			<div class="type-badge">
				<span class="type">{formatType(field.type)}</span>
			</div>
		</div>
		
		<div class="details">
			<div class="detail-item">
				<span class="label">Area:</span>
				<span class="value">{formatArea(field.area)} ha</span>
			</div>
			
			{#if field.crop_type}
				<div class="detail-item">
					<span class="label">Crop Type:</span>
					<span class="value">{field.crop_type}</span>
				</div>
			{/if}
			
			{#if field.location}
				<div class="detail-item">
					<span class="label">Location:</span>
					<span class="value">{field.location}</span>
				</div>
			{/if}
			
			<div class="detail-item">
				<span class="label">Status:</span>
				<span class="status" class:active={field.active} class:inactive={!field.active}>
					{field.active ? 'Active' : 'Inactive'}
				</span>
			</div>
		</div>
		
		{#if field.id.startsWith('temp_')}
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
	.field-card {
		position: relative;
	}
	
	.header {
		margin-bottom: 1rem;
	}
	
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}
	
	.title-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}
	
	.type-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	
	h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
	}
	
	.code {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
		background: var(--color-primary-light);
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}
	
	.type-badge {
		margin-top: 0.25rem;
	}
	
	.type {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: var(--color-background-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
		flex-shrink: 0;
	}
	
	.value {
		font-weight: 500;
		color: var(--color-text);
		text-align: right;
	}
	
	.status {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		flex-shrink: 0;
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
	
	@media (max-width: 768px) {
		.title-row {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-start;
		}
		
		.code {
			align-self: flex-start;
		}
		
		.detail-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
		
		.value {
			text-align: left;
		}
	}
</style>