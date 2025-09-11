<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import supabaseService from '$lib/services/supabase';
	import type { Field, FieldSelectionState } from '$lib/types';

	interface Props {
		selectionState: FieldSelectionState;
		onSelectionChange: (state: FieldSelectionState) => void;
		onAutoAdvance?: () => void;
		errors: string[];
		maxSelections?: number;
	}

	let { selectionState, onSelectionChange, onAutoAdvance, errors, maxSelections = 10 }: Props = $props();

	let fields: Field[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');

	// Derived states
	let selectedFieldIds = $derived(selectionState.selectedFields.map(f => f.id));
	let hasSelections = $derived(selectedFieldIds.length > 0);
	let isMaxReached = $derived(selectedFieldIds.length >= maxSelections);

	onMount(async () => {
		if (!browser) return;
		
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

	// Group fields by crop type
	let groupedFields = $derived.by(() => {
		const groups: Record<string, Field[]> = {};
		
		// Filter fields first
		const filtered = fields.filter(field => {
			if (!searchTerm) return true;
			const search = searchTerm.toLowerCase();
			return (
				field.name.toLowerCase().includes(search) ||
				field.code.toLowerCase().includes(search) ||
				field.location?.toLowerCase().includes(search) ||
				field.crop_type?.toLowerCase().includes(search)
			);
		});
		
		// Sort and group by crop type
		const sorted = [...filtered].sort((a, b) => {
			const cropA = a.crop_type || 'Other';
			const cropB = b.crop_type || 'Other';
			if (cropA < cropB) return -1;
			if (cropA > cropB) return 1;
			// If same crop, sort by name
			return a.name.localeCompare(b.name);
		});
		
		// Group by crop type
		sorted.forEach(field => {
			const crop = field.crop_type || 'Other';
			if (!groups[crop]) {
				groups[crop] = [];
			}
			groups[crop].push(field);
		});
		
		return groups;
	});

	let filteredFieldsCount = $derived(Object.values(groupedFields).flat().length);

	function toggleFieldSelection(field: Field) {
		const isSelected = selectedFieldIds.includes(field.id);
		
		if (isSelected) {
			// Remove field
			const newSelection = {
				...selectionState,
				selectedFields: selectionState.selectedFields.filter(f => f.id !== field.id)
			};
			onSelectionChange(newSelection);
		} else if (!isMaxReached) {
			// Add field
			const newSelection = {
				...selectionState,
				selectedFields: [...selectionState.selectedFields, field]
			};
			onSelectionChange(newSelection);
		}
	}

	function selectAllInGroup(groupFields: Field[]) {
		const availableFields = groupFields.filter(f => !selectedFieldIds.includes(f.id));
		const canSelect = Math.min(availableFields.length, maxSelections - selectedFieldIds.length);
		
		if (canSelect > 0) {
			const fieldsToAdd = availableFields.slice(0, canSelect);
			const newSelection = {
				...selectionState,
				selectedFields: [...selectionState.selectedFields, ...fieldsToAdd]
			};
			onSelectionChange(newSelection);
		}
	}

	function deselectAllInGroup(groupFields: Field[]) {
		const newSelection = {
			...selectionState,
			selectedFields: selectionState.selectedFields.filter(
				selected => !groupFields.some(group => group.id === selected.id)
			)
		};
		onSelectionChange(newSelection);
	}

	function clearAllSelections() {
		const newSelection = {
			...selectionState,
			selectedFields: []
		};
		onSelectionChange(newSelection);
	}

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

	function formatArea(area: number | null): string {
		if (area === null) return 'Not specified';
		return `${new Intl.NumberFormat('en-US').format(area)} ha`;
	}
</script>

<div class="multi-field-selection">
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

	<!-- Selection Summary -->
	{#if hasSelections}
		<div class="selection-summary">
			<div class="summary-header">
				<div class="summary-info">
					<span class="selection-count">{selectedFieldIds.length}</span>
					<span class="selection-label">field{selectedFieldIds.length !== 1 ? 's' : ''} selected</span>
				</div>
				<button class="clear-all" onclick={clearAllSelections}>
					Clear All
				</button>
			</div>
			<div class="selected-fields-list">
				{#each selectionState.selectedFields as field (field.id)}
					<div class="selected-field-chip">
						<span class="field-icon">{getFieldIcon(field.crop_type)}</span>
						<span class="field-name">{field.name}</span>
						<button 
							class="remove-field" 
							onclick={() => toggleFieldSelection(field)}
							aria-label="Remove {field.name}"
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if !loading && fields.length > 0}
		<!-- Search -->
		<div class="search-container">
			<div class="search-input">
				<span class="search-icon">🔍</span>
				<input 
					type="text" 
					placeholder="Search fields by name, location, or crop type..."
					bind:value={searchTerm}
				/>
				{#if searchTerm}
					<button class="clear-search" onclick={() => searchTerm = ''}>×</button>
				{/if}
			</div>
		</div>

		<!-- Selection Limit Warning -->
		{#if isMaxReached}
			<div class="max-limit-warning">
				<span class="warning-icon">⚠️</span>
				Maximum of {maxSelections} fields can be selected
			</div>
		{/if}
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading fields...</p>
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
			<small>Fields can be configured in the system settings</small>
		</div>
	{:else if filteredFieldsCount === 0}
		<div class="empty-state">
			<div class="empty-icon">🔍</div>
			<p>No fields found</p>
			<small>Try adjusting your search terms</small>
		</div>
	{:else}
		<div class="fields-container">
			{#each Object.entries(groupedFields) as [cropType, fieldList]}
				<div class="crop-group">
					<!-- Group Header -->
					<div class="group-header">
						<div class="group-info">
							<span class="group-icon">{getFieldIcon(cropType)}</span>
							<h3 class="group-title">{cropType}</h3>
							<span class="group-count">({fieldList.length} field{fieldList.length !== 1 ? 's' : ''})</span>
						</div>
						<div class="group-actions">
							<button 
								class="group-action-btn"
								onclick={() => selectAllInGroup(fieldList)}
								disabled={isMaxReached}
							>
								Select All
							</button>
							<button 
								class="group-action-btn"
								onclick={() => deselectAllInGroup(fieldList)}
							>
								Clear
							</button>
						</div>
					</div>

					<!-- Fields in Group -->
					<div class="fields-grid">
						{#each fieldList as field (field.id)}
							{@const isSelected = selectedFieldIds.includes(field.id)}
							{@const isDisabled = !isSelected && isMaxReached}
							
							<label 
								class="field-checkbox-card {isSelected ? 'selected' : ''} {isDisabled ? 'disabled' : ''}"
								for="field-{field.id}"
							>
								<input
									id="field-{field.id}"
									type="checkbox"
									checked={isSelected}
									disabled={isDisabled}
									onchange={() => toggleFieldSelection(field)}
								/>
								<div class="field-content">
									<div class="field-header">
										<span class="field-name">{field.name}</span>
										<span class="field-code">{field.code}</span>
									</div>
									<div class="field-details">
										{#if field.location}
											<span class="field-location">{field.location}</span>
										{/if}
										<span class="field-area">{formatArea(field.area)}</span>
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.multi-field-selection {
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	/* Selection Summary */
	.selection-summary {
		background: #f0fdf4;
		border: 2px solid #10b981;
		border-radius: 12px;
		padding: 1rem;
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.summary-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.selection-count {
		background: #10b981;
		color: white;
		font-weight: 700;
		font-size: 1.25rem;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		min-width: 2rem;
		text-align: center;
	}

	.selection-label {
		font-weight: 600;
		color: #065f46;
	}

	.clear-all {
		background: none;
		border: 1px solid #10b981;
		color: #10b981;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.clear-all:hover {
		background: #10b981;
		color: white;
	}

	.selected-fields-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.selected-field-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: white;
		border: 1px solid #10b981;
		border-radius: 20px;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}

	.field-icon {
		font-size: 1rem;
	}

	.field-name {
		font-weight: 500;
		color: #065f46;
	}

	.remove-field {
		background: none;
		border: none;
		color: #10b981;
		font-size: 1.125rem;
		cursor: pointer;
		padding: 0;
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.remove-field:hover {
		background: #ef4444;
		color: white;
	}

	/* Search */
	.search-container {
		margin-bottom: 0.5rem;
	}

	.search-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
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
		background: #f3f4f6;
		color: #374151;
	}

	/* Max Limit Warning */
	.max-limit-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fef3c7;
		border: 1px solid #fbbf24;
		border-radius: 6px;
		color: #92400e;
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Crop Groups */
	.fields-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.crop-group {
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.group-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.group-icon {
		font-size: 1.25rem;
	}

	.group-title {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.group-count {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.group-actions {
		display: flex;
		gap: 0.5rem;
	}

	.group-action-btn {
		background: none;
		border: 1px solid #d1d5db;
		color: #374151;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.group-action-btn:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.group-action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Field Cards */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
		padding: 1rem;
	}

	.field-checkbox-card {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.field-checkbox-card:hover:not(.disabled) {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.field-checkbox-card.selected {
		border-color: #10b981;
		background: #f0fdf4;
	}

	.field-checkbox-card.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f9fafb;
	}

	.field-checkbox-card input[type="checkbox"] {
		margin: 0;
		width: 1.25rem;
		height: 1.25rem;
		accent-color: #10b981;
		cursor: pointer;
	}

	.field-checkbox-card.disabled input[type="checkbox"] {
		cursor: not-allowed;
	}

	.field-content {
		flex: 1;
		min-width: 0;
	}

	.field-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 0.5rem;
	}

	.field-checkbox-card .field-name {
		font-weight: 600;
		color: #111827;
		font-size: 0.875rem;
	}

	.field-code {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.field-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.field-location {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.field-area {
		font-size: 0.75rem;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
	}

	/* States */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-state .error-icon,
	.empty-state .empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.error-state p,
	.empty-state p {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
	}

	.error-state small,
	.empty-state small {
		font-size: 0.875rem;
		color: #9ca3af;
		max-width: 300px;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.fields-grid {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.group-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.group-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.summary-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.selected-fields-list {
			gap: 0.375rem;
		}

		.selected-field-chip {
			font-size: 0.8125rem;
		}
	}
</style>