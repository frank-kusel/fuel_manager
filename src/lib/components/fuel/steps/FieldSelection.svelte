<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Field } from '$lib/types';
	
	interface Props {
		selectedField: Field | null;
		onFieldSelect: (field: Field | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}
	
	let { selectedField, onFieldSelect, onAutoAdvance, errors }: Props = $props();
	
	let fields: Field[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	
	onMount(async () => {
		try {
			await supabaseService.init();
			const result = await supabaseService.getFields();
			if (result.error) {
				throw new Error(result.error);
			}
			fields = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load fields';
		} finally {
			loading = false;
		}
	});
	
	let filteredFields = $derived(fields.filter(field => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			field.name.toLowerCase().includes(search) ||
			field.location?.toLowerCase().includes(search) ||
			field.crop_type?.toLowerCase().includes(search)
		);
	}));
	
	function getFieldIcon(cropType: string | null): string {
		if (!cropType) return '🌾';
		const crop = cropType.toLowerCase();
		if (crop.includes('wheat')) return '🌾';
		if (crop.includes('corn') || crop.includes('maize')) return '🌽';
		if (crop.includes('soy')) return '🫘';
		if (crop.includes('barley')) return '🌾';
		if (crop.includes('oat')) return '🌾';
		if (crop.includes('rice')) return '🌾';
		if (crop.includes('cotton')) return '🤍';
		if (crop.includes('sunflower')) return '🌻';
		return '🌱';
	}
	
	function getFieldColor(cropType: string | null): string {
		if (!cropType) return '#10b981';
		const crop = cropType.toLowerCase();
		if (crop.includes('wheat')) return '#f59e0b';
		if (crop.includes('corn') || crop.includes('maize')) return '#eab308';
		if (crop.includes('soy')) return '#10b981';
		if (crop.includes('barley')) return '#d97706';
		if (crop.includes('oat')) return '#92400e';
		if (crop.includes('rice')) return '#059669';
		if (crop.includes('cotton')) return '#6b7280';
		if (crop.includes('sunflower')) return '#f59e0b';
		return '#10b981';
	}
	
	function formatArea(area: number | null): string {
		if (area === null) return 'Not specified';
		return `${new Intl.NumberFormat().format(area)} ha`;
	}
</script>

<div class="field-selection">
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
	
	<!-- Skip Option -->
	<div class="skip-option">
		<div class="skip-message" onclick={() => onFieldSelect(null)}>
			⏭️ Skip Field Selection
		</div>
	</div>
	
	{#if !loading && fields.length > 0}
		<div class="search-container">
			<div class="search-input">
				<span class="search-icon">🔍</span>
				<input 
					type="text" 
					placeholder="Search by field name, location, or crop type..."
					bind:value={searchTerm}
				/>
				{#if searchTerm}
					<button class="clear-search" onclick={() => searchTerm = ''}>×</button>
				{/if}
			</div>
		</div>
	{/if}
	
	{#if loading}
		<div class="loading-state">
			<div class="fields-grid">
				{#each Array(6) as _}
					<div class="field-card-skeleton">
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
			<p>Failed to load fields</p>
			<small>{error}</small>
		</div>
	{:else if fields.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🌾</div>
			<p>No fields configured</p>
			<small>Fields can be configured in the system settings. You can skip this step for now.</small>
		</div>
	{:else if filteredFields.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🔍</div>
			<p>No fields found</p>
			<small>Try adjusting your search terms or skip this step</small>
		</div>
	{:else}
		<div class="table-container">
			<table class="table field-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Crop</th>
						<th>Location</th>
						<th>Area (ha)</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredFields as field (field.id)}
						<tr 
							class="field-row clickable {selectedField?.id === field.id ? 'selected' : ''}"
							onclick={() => {
																onFieldSelect(field);
								// Auto-advance immediately
								if (onAutoAdvance) {
									setTimeout(() => {
										onAutoAdvance();
									}, 100);
								}
							}}
						>
							<td class="field-name">{field.name}</td>
							<td class="field-crop">{field.crop_type || '-'}</td>
							<td class="field-location">{field.location || '-'}</td>
							<td class="field-area">{formatArea(field.area_hectares)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	
	{#if selectedField}
		<div class="selected-summary">
			<div class="selected-item">
				<div class="selected-label">Selected Field</div>
				<div class="selected-name">{selectedField.name}</div>
				{#if selectedField.crop_type}
					<div class="selected-detail">{selectedField.crop_type}</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.field-selection {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Step Header - Following original design */
	.step-header {
		text-align: center;
		margin-bottom: 1rem;
		position: relative;
	}

	.step-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
		margin: 0;
	}

	.optional-badge {
		display: inline-block;
		background: #fef3c7;
		color: #92400e;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Consistent table styling */
	.table-container {
		background: white;
		border: 1px solid #f1f5f9;
		border-radius: 0.5rem;
		overflow: hidden;
		margin: 0;
	}

	:global(.field-table) {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	:global(.field-table th),
	:global(.field-table td) {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid #f1f5f9;
		font-size: 14px;
		vertical-align: top;
	}

	:global(.field-table th) {
		background: #f8fafc;
		font-size: 12px;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		height: 44px;
	}

	:global(.field-table tbody tr.clickable) {
		cursor: pointer;
		transition: background 0.2s ease;
		min-height: 48px;
	}

	:global(.field-table tbody tr.clickable:hover) {
		background: #f8fafc;
	}

	.field-row.selected {
		background: #2563eb;
		color: white;
	}

	/* Field cell styling */
	.field-name {
		font-weight: 600;
		color: #2563eb;
		font-size: 14px;
	}

	.field-crop,
	.field-location,
	.field-area {
		font-weight: 500;
		color: #111827;
		font-size: 14px;
	}

	.field-area {
		font-family: monospace;
		color: #6b7280;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.table-container {
			margin: 0;
		}

		:global(.field-table th),
		:global(.field-table td) {
			padding: 10px 12px;
		}
	}

	@media (max-width: 480px) {
		:global(.field-table th),
		:global(.field-table td) {
			padding: 8px 10px;
			font-size: 13px;
		}
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
	}

	:global(.field-table th) {
		background: var(--gray-50, #f8fafc);
		font-weight: 600;
		color: var(--gray-700, #334155);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.field-table tbody tr:hover) {
		background: var(--gray-50, #f8fafc);
	}

	:global(.field-table tbody tr.clickable) {
		cursor: pointer;
	}

	:global(.field-table tbody tr.clickable:hover) {
		background: var(--primary-light, #eff6ff);
	}

	/* Selected rows */
	:global(.field-table tbody tr.selected) {
		background: var(--primary, #2563eb);
		color: var(--white, #ffffff);
	}

	/* Skip Option */
	.skip-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.skip-message {
		padding: 0.75rem;
		background: #e0f2fe;
		border: 1px solid #b3e5fc;
		border-radius: 0.5rem;
		color: #0277bd;
		font-size: 0.875rem;
		text-align: center;
		margin-bottom: 0.75rem;
		font-weight: 500;
		cursor: pointer;
	}

	.skip-message:hover {
		background: #b3e5fc;
		color: #01579b;
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

	/* Search */
	.search-container {
		margin-bottom: 1rem;
	}

	.search-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-size: 0.875rem;
		background: var(--color-background);
		color: var(--color-text-primary);
	}

	.search-input input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: var(--color-text-secondary);
		pointer-events: none;
		font-size: 1rem;
	}

	.clear-search {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.clear-search:hover {
		background: var(--color-background-secondary);
		color: var(--color-text-primary);
	}

	/* Fields Grid */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	:global(.field-card) {
		cursor: pointer;
		border: 2px solid transparent;
		position: relative;
	}

	:global(.field-card:hover) {
		transform: translateY(-2px);
		border-color: var(--color-primary-200);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	:global(.field-card.selected) {
		border-color: var(--color-primary);
		background: var(--color-primary-50);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	/* Field Card Content */
	.field-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.field-icon {
		font-size: 1.5rem;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background-secondary);
		border-radius: 8px;
		flex-shrink: 0;
	}

	.field-info {
		flex: 1;
		min-width: 0;
	}

	.field-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.field-location {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.selected-icon {
		color: var(--color-primary);
		font-size: 1.25rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	/* Field Details */
	.field-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.detail-label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.detail-value {
		color: var(--color-text-primary);
		font-weight: 600;
	}

	.crop-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	/* Selection Summary */
	.selection-summary {
		margin-top: 1rem;
	}

	:global(.selected-field-summary) {
		border: 2px solid var(--color-success-200);
		background: var(--color-success-50);
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.summary-icon {
		background: var(--color-success);
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
		color: var(--color-success-700);
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.summary-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.summary-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.summary-field-icon {
		font-size: 1.25rem;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background);
		border-radius: 6px;
		flex-shrink: 0;
	}

	.summary-name {
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.summary-location {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.summary-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.summary-detail {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		font-size: 0.875rem;
		text-align: right;
	}

	.summary-detail span {
		color: var(--color-text-secondary);
	}

	.summary-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Loading, Empty, Error States */
	.field-card-skeleton {
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-background);
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
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 8px;
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

	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-text-secondary);
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
		color: var(--color-text-muted);
		max-width: 300px;
		line-height: 1.4;
	}

	/* Mobile Responsiveness - Following original design */
	@media (max-width: 768px) {
		.step-header h2 {
			font-size: 1.25rem;
			margin-bottom: 1rem;
		}

		.table-container {
			margin: 0;
			background: white;
			border-radius: 8px;
			border: 1px solid var(--gray-200, #e2e8f0);
			overflow: hidden;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		}

		:global(.field-table) {
			width: 100%;
			font-size: 13px;
			border-collapse: collapse;
			table-layout: fixed;
		}

		:global(.field-table th),
		:global(.field-table td) {
			padding: 0.25rem 0.5rem !important;
			border-bottom: 1px solid var(--gray-100, #f1f5f9);
		}

		:global(.field-table th) {
			background-color: var(--gray-50, #f8fafc);
			font-weight: 600;
			color: var(--gray-700, #334155);
			text-transform: uppercase;
			font-size: 0.75rem;
			letter-spacing: 0.05em;
		}

		:global(.field-table .clickable) {
			cursor: pointer;
		}

		:global(.field-table .clickable:hover) {
			background-color: var(--gray-100, #f1f5f9);
		}

		:global(.field-table .selected) {
			background: var(--primary, #2563eb);
			color: var(--gray-900, #0f172a);
			font-weight: 600;
		}

		/* Mobile Field Table Column Widths */
		:global(.field-table th:nth-child(1)),
		:global(.field-table td:nth-child(1)) { /* Name */
			width: 30%;
			font-weight: 500;
		}

		:global(.field-table th:nth-child(2)),
		:global(.field-table td:nth-child(2)) { /* Crop */
			width: 25%;
		}

		:global(.field-table th:nth-child(3)),
		:global(.field-table td:nth-child(3)) { /* Location */
			width: 25%;
		}

		:global(.field-table th:nth-child(4)),
		:global(.field-table td:nth-child(4)) { /* Area */
			width: 20%;
			text-align: right;
		}

		.search-input input {
			padding: 0.75rem 1rem 0.75rem 2.5rem;
			font-size: 0.875rem;
		}

		.summary-content {
			flex-direction: column;
			gap: 1rem;
		}

		.summary-details {
			align-items: flex-start;
		}

		.summary-detail {
			align-items: flex-start;
			text-align: left;
		}
	}

	/* Touch-friendly improvements */
	@media (max-width: 768px) {
		:global(.field-card) {
			padding: 1.25rem;
			min-height: 120px;
		}

		.field-icon {
			width: 3rem;
			height: 3rem;
			font-size: 1.75rem;
		}

		.field-name {
			font-size: 1.125rem;
		}

		.selected-icon {
			font-size: 1.5rem;
			padding: 0.25rem;
		}
	}
</style>