<script lang="ts">
	import type { Activity } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	
	interface Props {
		activity: Activity;
		onclick?: () => void;
		selected?: boolean;
	}
	
	let { activity, onclick, selected = false }: Props = $props();
	
	const formatCategory = (category: string) => {
		return category.charAt(0).toUpperCase() + category.slice(1);
	};
	
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case 'planting':
				return '🌱';
			case 'harvesting':
				return '🌾';
			case 'spraying':
				return '💧';
			case 'fertilizing':
				return '🌿';
			case 'maintenance':
				return '🔧';
			case 'other':
				return '📋';
			default:
				return '📋';
		}
	};
</script>

<Card {onclick} hover shadow={selected}>
	<div class="activity-card">
		<div class="header">
			<div class="title-row">
				<div class="title-section">
					<span class="category-icon">{getCategoryIcon(activity.category)}</span>
					<h3>{activity.name}</h3>
				</div>
				<span class="code">{activity.code}</span>
			</div>
			<div class="category-badge">
				<span class="category">{formatCategory(activity.category)}</span>
			</div>
		</div>
		
		<div class="details">
			{#if activity.description}
				<div class="detail-item description">
					<span class="value">{activity.description}</span>
				</div>
			{/if}
			
			<div class="detail-item">
				<span class="label">Status:</span>
				<span class="status" class:active={activity.active} class:inactive={!activity.active}>
					{activity.active ? 'Active' : 'Inactive'}
				</span>
			</div>
		</div>
		
		{#if activity.id.startsWith('temp_')}
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
	.activity-card {
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
	
	.category-icon {
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
	
	.category-badge {
		margin-top: 0.25rem;
	}
	
	.category {
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
		align-items: flex-start;
		font-size: 0.875rem;
		gap: 0.5rem;
	}
	
	.detail-item.description {
		flex-direction: column;
		align-items: stretch;
	}
	
	.detail-item:not(.description) {
		justify-content: space-between;
	}
	
	.label {
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}
	
	.value {
		font-weight: 400;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}
	
	.description .value {
		font-size: 0.8rem;
		padding: 0.5rem;
		background: var(--color-background-secondary);
		border-radius: 0.25rem;
		border-left: 3px solid var(--color-primary-light);
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
	}
</style>