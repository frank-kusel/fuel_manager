<script lang="ts">
	import { fields, referenceDataLoading, referenceDataError } from '$lib/stores/reference-data';
	import type { Field, FieldSelectionState } from '$lib/types';

	interface Props {
		selectionState: FieldSelectionState;
		onSelectionChange: (state: FieldSelectionState) => void;
		onAutoAdvance?: () => void;
		errors: string[];
		maxSelections?: number;
	}

	let { selectionState, onSelectionChange, onAutoAdvance, errors, maxSelections = 10 }: Props = $props();

	let searchTerm = $state('');

	// Track collapsed state for each crop group
	let collapsedGroups = $state<Record<string, boolean>>({});

	// Derived states
	let selectedFieldIds = $derived(selectionState.selectedFields.map(f => f.id));
	let hasSelections = $derived(selectedFieldIds.length > 0);
	let isMaxReached = $derived(selectedFieldIds.length >= maxSelections);

	// Toggle group collapse state
	function toggleGroupCollapse(cropType: string) {
		collapsedGroups[cropType] = !collapsedGroups[cropType];
	}

	// Check if a group is collapsed (default is true unless searching)
	function isGroupCollapsed(cropType: string): boolean {
		// If there's a search term, auto-expand all groups
		if (searchTerm) {
			return false;
		}
		return collapsedGroups[cropType] !== false; // Collapsed by default
	}

	// Group fields by crop type
	let groupedFields = $derived.by(() => {
		const groups: Record<string, Field[]> = {};

		// Filter fields first
		const filtered = $fields.filter(field => {
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
	{#if !$referenceDataLoading && $fields.length > 0}
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

	{#if $referenceDataLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading fields...</p>
		</div>
	{:else if $referenceDataError}
		<div class="error-state">
			<div class="error-icon">🚨</div>
			<p>Failed to load fields</p>
			<small>{$referenceDataError}</small>
		</div>
	{:else if $fields.length === 0}
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
				{@const isCollapsed = isGroupCollapsed(cropType)}
				<div class="crop-group">
					<!-- Group Header -->
					<button class="group-header" onclick={() => toggleGroupCollapse(cropType)}>
						<div class="group-info">
							<span class="expand-icon {isCollapsed ? '' : 'expanded'}">▶</span>
							<span class="group-icon">{getFieldIcon(cropType)}</span>
							<h3 class="group-title">{cropType}</h3>
							<span class="group-count">({fieldList.length} field{fieldList.length !== 1 ? 's' : ''})</span>
						</div>
					</button>

					<!-- Fields in Group -->
					{#if !isCollapsed}
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
										<div class="field-info-row">
											<span class="field-name">{field.name}</span>
											<span class="field-area">{formatArea(field.area)}</span>
										</div>
									</div>
								</label>
							{/each}
						</div>
					{/if}
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
		gap: 1rem;
	}

	.crop-group {
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
	}

	.group-header {
		width: 100%;
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border: none;
		border-bottom: 1px solid #e5e7eb;
		cursor: pointer;
		transition: background 0.2s;
		text-align: left;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}

	.group-header:hover {
		background: #f3f4f6;
	}

	.group-header:active {
		background: #e5e7eb;
	}

	.group-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.expand-icon {
		font-size: 0.75rem;
		color: #6b7280;
		transition: transform 0.2s;
		display: inline-block;
		width: 1rem;
	}

	.expand-icon.expanded {
		transform: rotate(90deg);
	}

	.group-icon {
		font-size: 1rem;
	}

	.group-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.group-count {
		font-size: 0.75rem;
		color: #6b7280;
	}

	/* Field Cards */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.field-checkbox-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
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

	.field-info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.field-checkbox-card .field-name {
		font-weight: 600;
		color: #111827;
		font-size: 0.875rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.field-area {
		font-size: 0.75rem;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		flex-shrink: 0;
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
	}
</style>