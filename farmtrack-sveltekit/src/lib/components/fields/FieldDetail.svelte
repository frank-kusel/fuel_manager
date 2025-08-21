<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Field } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import fieldStore from '$lib/stores/fields';

	interface Props {
		field: Field;
		loading?: boolean;
		readonly?: boolean;
	}

	let { field, loading = false, readonly = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		edit: Field;
		delete: Field;
		close: void;
	}>();

	let deleteConfirm = $state(false);
	let deleting = $state(false);

	function handleEdit() {
		dispatch('edit', field);
	}

	function handleDelete() {
		if (!deleteConfirm) {
			deleteConfirm = true;
			return;
		}

		performDelete();
	}

	function cancelDelete() {
		deleteConfirm = false;
	}

	async function performDelete() {
		deleting = true;
		try {
			const result = await fieldStore.deleteField(field.id);
			if (result.success) {
				dispatch('delete', field);
			} else {
				// Handle error - you might want to show a toast or alert
				console.error('Failed to delete field:', result.error);
			}
		} catch (error) {
			console.error('Failed to delete field:', error);
		} finally {
			deleting = false;
			deleteConfirm = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	const formatArea = (area: number) => {
		return new Intl.NumberFormat('en-ZA', { 
			minimumFractionDigits: 2, 
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

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};
</script>

<Card class="field-detail-card">
	<div class="detail-header">
		<div class="title-section">
			<div class="field-icon">
				{getTypeIcon(field.type)}
			</div>
			<div class="title-info">
				<h2>{field.name}</h2>
				<div class="meta">
					<span class="code">{field.code}</span>
					<span class="type">{formatType(field.type)}</span>
					<span class="area">{formatArea(field.area)} ha</span>
					<span class="status" class:active={field.active} class:inactive={!field.active}>
						{field.active ? 'Active' : 'Inactive'}
					</span>
				</div>
			</div>
		</div>
		
		{#if !readonly}
			<div class="actions">
				<Button onclick={handleEdit} variant="secondary" size="sm" disabled={loading}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
					</svg>
					Edit
				</Button>
				
				{#if !deleteConfirm}
					<Button onclick={handleDelete} variant="danger" size="sm" disabled={loading}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3,6 5,6 21,6"></polyline>
							<path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
						</svg>
						Delete
					</Button>
				{:else}
					<div class="delete-confirm">
						<span class="confirm-text">Delete this field?</span>
						<Button onclick={performDelete} variant="danger" size="sm" loading={deleting}>
							{deleting ? 'Deleting...' : 'Yes, Delete'}
						</Button>
						<Button onclick={cancelDelete} variant="secondary" size="sm" disabled={deleting}>
							Cancel
						</Button>
					</div>
				{/if}
			</div>
		{/if}

		<Button onclick={handleClose} variant="ghost" size="sm" class="close-btn">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</Button>
	</div>

	{#if field.id.startsWith('temp_')}
		<div class="offline-notice">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 2v20M2 12h20"/>
			</svg>
			<span>This field is saved offline and will sync when connection is restored</span>
		</div>
	{/if}

	<div class="detail-content">
		<div class="info-section">
			<h3>Field Information</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Code:</span>
					<span class="value">{field.code}</span>
				</div>
				
				<div class="info-item">
					<span class="label">Name:</span>
					<span class="value">{field.name}</span>
				</div>
				
				<div class="info-item">
					<span class="label">Type:</span>
					<span class="value type-value">
						{getTypeIcon(field.type)}
						{formatType(field.type)}
					</span>
				</div>
				
				<div class="info-item">
					<span class="label">Area:</span>
					<span class="value area-value">{formatArea(field.area)} hectares</span>
				</div>
				
				{#if field.location}
					<div class="info-item">
						<span class="label">Location:</span>
						<span class="value">{field.location}</span>
					</div>
				{/if}
				
				{#if field.crop_type}
					<div class="info-item">
						<span class="label">Crop Type:</span>
						<span class="value">{field.crop_type}</span>
					</div>
				{/if}
				
				<div class="info-item">
					<span class="label">Status:</span>
					<span class="value">
						<span class="status-indicator" class:active={field.active} class:inactive={!field.active}>
							{field.active ? 'Active' : 'Inactive'}
						</span>
					</span>
				</div>
			</div>
		</div>

		<div class="info-section">
			<h3>Area Calculations</h3>
			<div class="calculations-grid">
				<div class="calc-item">
					<span class="calc-label">Area in Hectares:</span>
					<span class="calc-value">{formatArea(field.area)} ha</span>
				</div>
				
				<div class="calc-item">
					<span class="calc-label">Area in Acres:</span>
					<span class="calc-value">{formatArea(field.area * 2.471)} acres</span>
				</div>
				
				<div class="calc-item">
					<span class="calc-label">Area in Square Meters:</span>
					<span class="calc-value">{new Intl.NumberFormat('en-ZA').format(field.area * 10000)} m²</span>
				</div>
			</div>
		</div>

		<div class="info-section">
			<h3>System Information</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Created:</span>
					<span class="value date">{formatDate(field.created_at)}</span>
				</div>
				
				<div class="info-item">
					<span class="label">Last Updated:</span>
					<span class="value date">{formatDate(field.updated_at)}</span>
				</div>
			</div>
		</div>
	</div>
</Card>

<style>
	.field-detail-card {
		max-width: 800px;
		margin: 0 auto;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--gray-200);
		margin-bottom: 1.5rem;
		position: relative;
	}

	.title-section {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		flex: 1;
	}

	.field-icon {
		font-size: 3rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.title-info {
		flex: 1;
	}

	.title-info h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--gray-900);
		line-height: 1.2;
	}

	.meta {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.code {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
		background: var(--color-primary-light);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.type {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-600);
		background: var(--gray-100);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: capitalize;
	}

	.area {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--blue-600);
		background: var(--blue-50);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.status {
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.status.active {
		background: var(--color-success-light);
		color: var(--color-success);
	}

	.status.inactive {
		background: var(--color-error-light);
		color: var(--color-error);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.close-btn {
		position: absolute;
		top: 0;
		right: 0;
	}

	.delete-confirm {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--red-50);
		border: 1px solid var(--red-200);
		border-radius: 0.5rem;
	}

	.confirm-text {
		font-size: 0.875rem;
		color: var(--red-700);
		white-space: nowrap;
	}

	.offline-notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-warning-light);
		color: var(--color-warning);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.detail-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.info-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--gray-800);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-600);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value {
		font-size: 1rem;
		color: var(--gray-900);
		font-weight: 500;
	}

	.value.date {
		font-family: monospace;
		font-weight: normal;
	}

	.type-value {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.area-value {
		color: var(--blue-600);
		font-weight: 600;
	}

	.status-indicator {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-indicator.active {
		background: var(--color-success-light);
		color: var(--color-success);
	}

	.status-indicator.inactive {
		background: var(--color-error-light);
		color: var(--color-error);
	}

	.calculations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		padding: 1rem;
		background: var(--gray-50);
		border-radius: 0.5rem;
		border-left: 4px solid var(--blue-500);
	}

	.calc-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.calc-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-600);
	}

	.calc-value {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--blue-600);
		font-family: monospace;
	}

	@media (max-width: 768px) {
		.detail-header {
			flex-direction: column;
			align-items: stretch;
		}

		.title-section {
			flex-direction: column;
			text-align: center;
		}

		.field-icon {
			align-self: center;
			font-size: 2.5rem;
		}

		.meta {
			justify-content: center;
		}

		.actions {
			align-self: center;
		}

		.close-btn {
			position: static;
			align-self: center;
		}

		.delete-confirm {
			flex-direction: column;
			text-align: center;
		}

		.info-grid {
			grid-template-columns: 1fr;
		}

		.calculations-grid {
			grid-template-columns: 1fr;
		}
	}
</style>