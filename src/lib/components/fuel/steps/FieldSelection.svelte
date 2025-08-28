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
		console.log('FieldSelection: onMount called');
		try {
			await supabaseService.init();
			const result = await supabaseService.getFields();
			console.log('FieldSelection: getFields result:', result);
			if (result.error) {
				throw new Error(result.error);
			}
			fields = result.data || [];
			console.log('FieldSelection: fields loaded:', fields.length);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load fields';
			console.log('FieldSelection: error:', error);
		} finally {
			loading = false;
			console.log('FieldSelection: loading complete, fields.length:', fields.length);
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
			<table id="field-table">
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

	/* Ultra-clean table container */
	.table-container {
		background: transparent;
		margin: 0;
	}

	/* Ultra-clean table design with subtle row lines */
	:global(#field-table) {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		table-layout: fixed;
	}

	:global(#field-table th) {
		padding: 0.5rem;
		text-align: left;
		border: none;
		background: transparent;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		line-height: 1;
	}

	:global(#field-table td) {
		padding: 0.5rem;
		text-align: left;
		border: none;
		font-size: 0.875rem;
		vertical-align: middle;
	}

	/* Add left padding to first column */
	:global(#field-table th:nth-child(1)),
	:global(#field-table td:nth-child(1)) {
		padding-left: 1rem;
	}

	/* Subtle row lines for all rows */
	:global(#field-table tbody tr) {
		border-bottom: 1px solid rgba(248, 250, 252, 0.8);
	}

	:global(#field-table tbody tr.clickable) {
		cursor: pointer;
		transition: all 0.15s ease;
		border-bottom-color: rgba(241, 245, 249, 0.6);
	}

	:global(#field-table tbody tr.clickable:hover) {
		background: rgba(0, 0, 0, 0.02);
		border-bottom-color: rgba(203, 213, 225, 0.4);
	}

	:global(#field-table tbody tr:last-child) {
		border-bottom: none;
	}

	/* Clean selected state */
	:global(#field-table tbody tr.selected) {
		background: rgba(37, 99, 235, 0.08);
		border-radius: 0.5rem;
		border-bottom-color: rgba(37, 99, 235, 0.2);
	}

	/* Clean field cell styling */
	:global(#field-table .field-name) {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	:global(#field-table .field-crop),
	:global(#field-table .field-location) {
		font-weight: 400;
		color: #111827;
		font-size: 0.875rem;
	}

	:global(#field-table .field-area) {
		font-variant-numeric: tabular-nums;
		color: #6b7280;
		font-size: 0.8125rem;
		font-weight: 400;
	}

	/* Selected state text colors */
	:global(#field-table tbody tr.selected .field-name) {
		color: #2563eb;
		font-weight: 600;
	}

	:global(#field-table tbody tr.selected .field-crop),
	:global(#field-table tbody tr.selected .field-location) {
		color: #1e293b;
		font-weight: 500;
	}

	:global(#field-table tbody tr.selected .field-area) {
		color: #475569;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.table-container {
			margin: 0;
		}

		:global(#field-table th) {
			padding: 0.625rem 0;
			font-size: 0.625rem;
		}

		:global(#field-table td) {
			padding: 0.875rem 0;
			font-size: 0.8125rem;
		}

		/* Mobile Field Table Column Widths */
		:global(#field-table th:nth-child(1)),
		:global(#field-table td:nth-child(1)) { /* Name */
			width: 35%;
			padding-left: 1rem;
		}

		:global(#field-table th:nth-child(2)),
		:global(#field-table td:nth-child(2)) { /* Crop */
			width: 25%;
		}

		:global(#field-table th:nth-child(3)),
		:global(#field-table td:nth-child(3)) { /* Location */
			width: 25%;
		}

		:global(#field-table th:nth-child(4)),
		:global(#field-table td:nth-child(4)) { /* Area */
			width: 15%;
			text-align: right;
		}
	}

	@media (max-width: 480px) {
		:global(#field-table th) {
			padding: 0.5rem 0;
		}

		:global(#field-table td) {
			padding: 0.75rem 0;
			font-size: 0.75rem;
		}

		:global(#field-table th:nth-child(1)),
		:global(#field-table td:nth-child(1)) {
			padding-left: 1rem;
		}
	}

	/* Selected summary */
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

	/* Old conflicting styles removed - using ultra-clean styling above */

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
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.875rem;
		background: #ffffff;
		color: #111827;
	}

	.search-input input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: #6b7280;
		pointer-events: none;
		font-size: 1rem;
	}

	.clear-search {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: #6b7280;
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
		background: #f8fafc;
		color: #111827;
	}


	/* Loading States - Simplified for table layout */
	.field-card-skeleton {
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
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

	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
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
		color: #9ca3af;
		max-width: 300px;
		line-height: 1.4;
	}


</style>