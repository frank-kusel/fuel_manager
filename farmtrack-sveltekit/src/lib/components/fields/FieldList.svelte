<script lang="ts">
	import { onMount } from 'svelte';
	import fieldStore, { filteredFields, fieldLoading, fieldError, fieldStats, fields } from '$lib/stores/fields';
	import type { Field, FieldType, SortDirection } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	
	interface Props {
		onselect?: (field: Field) => void;
		oncreate?: () => void;
	}
	
	let { onselect, oncreate }: Props = $props();
	
	let searchTerm = $state('');
	let filterType = $state<string | null>(null);
	let filterActive = $state<boolean | null>(null);
	let sortBy = $state<keyof Field>('name');
	let sortDirection = $state<SortDirection>('asc');
	
	onMount(() => {
		fieldStore.loadFields();
	});
	
	const typeOptions = [
		{ value: '', label: 'All Types' },
		{ value: 'arable', label: 'Arable' },
		{ value: 'pasture', label: 'Pasture' },
		{ value: 'orchard', label: 'Orchard' },
		{ value: 'greenhouse', label: 'Greenhouse' },
		{ value: 'other', label: 'Other' }
	];
	
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'true', label: 'Active Only' },
		{ value: 'false', label: 'Inactive Only' }
	];
	
	function handleSearch(value: string) {
		searchTerm = value;
		fieldStore.setSearchTerm(value);
	}
	
	function handleTypeFilter(value: string) {
		filterType = value || null;
		fieldStore.setFilterType(filterType);
	}
	
	function handleStatusFilter(value: string) {
		filterActive = value === '' ? null : value === 'true';
		fieldStore.setFilterActive(filterActive);
	}
	
	function handleRefresh() {
		fieldStore.loadFields();
	}
	
	const formatArea = (area: number) => {
		return new Intl.NumberFormat('en-ZA', { 
			minimumFractionDigits: 1, 
			maximumFractionDigits: 1 
		}).format(area);
	};
	
	function getFieldTypeIcon(type: FieldType): string {
		const icons = {
			arable: '🌾',
			pasture: '🌿',
			orchard: '🌳',
			greenhouse: '🏠',
			other: '📍'
		};
		return icons[type] || '📍';
	}
	
	function getFieldTypeColor(type: FieldType): string {
		const colors = {
			arable: '#ca8a04',
			pasture: '#16a34a',
			orchard: '#dc2626',
			greenhouse: '#2563eb',
			other: '#6b7280'
		};
		return colors[type] || '#6b7280';
	}
	
	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}
	
	// Sorting functionality
	function handleSort(column: keyof Field) {
		if (sortBy === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortDirection = 'asc';
		}
		fieldStore.setSorting(sortBy, sortDirection);
	}
	
	// Crop type area calculations
	const cropAreaStats = $derived($fields.reduce((acc, field) => {
		if (field.name && field.active) {
			const cropName = field.name.toLowerCase();
			if (!acc[cropName]) {
				acc[cropName] = 0;
			}
			acc[cropName] += field.area;
		}
		return acc;
	}, {} as Record<string, number>));
	
	const sortedCropStats = $derived(Object.entries(cropAreaStats)
		.sort(([,a], [,b]) => b - a)
		.slice(0, 6)); // Show top 6 crops
</script>

<div class="field-list">
	<div class="header">
		<div class="header-content">
			<h2>Fields</h2>
			<p class="subtitle">Manage farm fields and their locations</p>
		</div>
		<div class="header-actions">
			{#if oncreate}
				<Button variant="primary" onclick={oncreate}>
					<span class="icon">➕</span>
					Add Field
				</Button>
			{/if}
		</div>
	</div>
	
	{#if $fieldLoading === 'loading'}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading fields...</p>
		</div>
	{:else if $fieldError}
		<Card class="error-card">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<div>
					<h3>Failed to Load Fields</h3>
					<p>{$fieldError}</p>
					<Button variant="secondary" onclick={() => fieldStore.loadFields()}>
						{#snippet children()}
							Retry
						{/snippet}
					</Button>
				</div>
			</div>
		</Card>
	{:else if $filteredFields.length === 0 && !searchTerm && !filterType && filterActive === null}
		<Card class="empty-state">
			<div class="empty-content">
				<span class="empty-icon">🌾</span>
				<h3>No Fields Found</h3>
				<p>Get started by adding your first field.</p>
				{#if oncreate}
					<Button variant="primary" onclick={oncreate}>
						Add Your First Field
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Stats Cards -->
		<div class="stats">
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$fieldStats.total}</span>
					<span class="stat-label">Total Fields</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$fieldStats.active}</span>
					<span class="stat-label">Active</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{formatArea($fieldStats.totalArea)}</span>
					<span class="stat-label">Total Area (ha)</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{formatArea($fieldStats.averageArea)}</span>
					<span class="stat-label">Avg Area (ha)</span>
				</div>
			</Card>
		</div>
		
		<!-- Crop Type Area Summary -->
		{#if sortedCropStats.length > 0}
			<Card>
				<h3>Crop Area Summary</h3>
				<div class="crop-stats">
					{#each sortedCropStats as [cropName, totalArea]}
						<div class="crop-stat">
							<span class="crop-name">{cropName}</span>
							<span class="crop-area">{formatArea(totalArea)} ha</span>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
		
		<!-- Search and Filters -->
		<div class="controls">
			<div class="search">
				<Input
					type="search"
					placeholder="Search fields..."
					value={searchTerm}
					oninput={(e) => handleSearch(e.currentTarget.value)}
				/>
			</div>
			
			<div class="filters">
				<Select
					options={typeOptions}
					value={filterType || ''}
					placeholder="All Types"
					onchange={(e) => handleTypeFilter(e.currentTarget.value)}
				/>
				
				<Select
					options={statusOptions}
					value={filterActive === null ? '' : filterActive.toString()}
					placeholder="All Status"
					onchange={(e) => handleStatusFilter(e.currentTarget.value)}
				/>
			</div>
		</div>
		
		{#if $filteredFields.length === 0}
			<div class="no-results">
				<p>No fields match your filters</p>
				<p class="hint">Try adjusting your search or filters</p>
			</div>
		{:else}
			<!-- Field Table -->
			<div class="field-table-container">
				<table class="field-table">
					<thead>
						<tr>
							<th class="sortable" onclick={() => handleSort('type')}>
								<div class="header-content">
									<span>Type</span>
									{#if sortBy === 'type'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('code')}>
								<div class="header-content">
									<span>Code</span>
									{#if sortBy === 'code'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('name')}>
								<div class="header-content">
									<span>Name</span>
									{#if sortBy === 'name'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('area')}>
								<div class="header-content">
									<span>Area (ha)</span>
									{#if sortBy === 'area'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('crop_type')}>
								<div class="header-content">
									<span>Crop Type</span>
									{#if sortBy === 'crop_type'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('location')}>
								<div class="header-content">
									<span>Location</span>
									{#if sortBy === 'location'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('active')}>
								<div class="header-content">
									<span>Status</span>
									{#if sortBy === 'active'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each $filteredFields as field (field.id)}
							<tr class="field-row" onclick={() => onselect?.(field)}>
								<td class="type-cell">
									<div class="field-type" style="color: {getFieldTypeColor(field.type)}">
										<span class="type-icon">{getFieldTypeIcon(field.type)}</span>
										<span class="type-label">{formatType(field.type)}</span>
									</div>
								</td>
								<td class="code-cell">{field.code}</td>
								<td class="name-cell">{field.name}</td>
								<td class="area-cell">{formatArea(field.area)}</td>
								<td class="crop-cell">{field.crop_type || '-'}</td>
								<td class="location-cell">
									<span class="location-text" title={field.location}>
										{field.location || '-'}
									</span>
								</td>
								<td class="status-cell">
									<span class="status {field.active ? 'active' : 'inactive'}">
										{field.active ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td class="actions-cell">
									<Button size="sm" variant="outline" onclick={(e) => { e.stopPropagation(); onselect?.(field); }}>
										View
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<style>
	.field-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-content h2 {
		margin: 0 0 0.5rem 0;
		color: var(--gray-900);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.subtitle {
		margin: 0;
		color: var(--gray-600);
		font-size: 0.9rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.icon {
		font-size: 1rem;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		gap: 1rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--gray-200);
		border-top: 3px solid var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Error state */
	.error-card {
		border-color: var(--error);
		background: var(--red-50);
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		font-size: 2rem;
	}

	.error-content h3 {
		margin: 0 0 0.5rem 0;
		color: var(--error);
	}

	.error-content p {
		margin: 0 0 1rem 0;
		color: var(--gray-600);
	}

	/* Empty state */
	.empty-state {
		border: 2px dashed var(--gray-300);
		background: var(--gray-50);
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		opacity: 0.5;
	}

	.empty-content h3 {
		margin: 0;
		color: var(--gray-700);
	}

	.empty-content p {
		margin: 0;
		color: var(--gray-600);
	}

	/* Stats */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--primary);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--gray-600);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Controls */
	.controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.search {
		flex: 1;
		min-width: 200px;
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filters :global(.select-group) {
		min-width: 140px;
	}

	/* No results */
	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		text-align: center;
	}

	.no-results p {
		margin: 0;
		color: var(--gray-600);
	}

	.no-results .hint {
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	/* Crop Area Summary */
	.crop-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		padding: 0.5rem 0;
	}

	.crop-stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--gray-50);
		border-radius: 0.375rem;
		border: 1px solid var(--gray-200);
	}

	.crop-name {
		font-weight: 500;
		color: var(--gray-900);
		text-transform: capitalize;
	}

	.crop-area {
		font-weight: 600;
		color: var(--primary);
		font-size: 0.875rem;
	}

	/* Field Table */
	.field-table-container {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: auto;
		background: white;
	}

	.field-table {
		width: 100%;
		border-collapse: collapse;
	}

	.field-table th {
		background: #f8fafc;
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
		position: sticky;
		top: 0;
		white-space: nowrap;
	}

	.field-table th.sortable {
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s;
	}

	.field-table th.sortable:hover {
		background: #f1f5f9;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.sort-icon {
		font-weight: bold;
		color: var(--primary);
		font-size: 0.75rem;
	}

	.field-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		font-size: 0.875rem;
		vertical-align: middle;
	}

	.field-row {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.field-row:hover {
		background: #f8fafc;
	}

	.type-cell .field-type {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.type-icon {
		font-size: 1.125rem;
	}

	.type-label {
		text-transform: capitalize;
		font-size: 0.75rem;
	}

	.code-cell {
		font-weight: 600;
		color: #0f172a;
	}

	.name-cell {
		font-weight: 500;
		color: #0f172a;
		min-width: 150px;
	}

	.area-cell {
		text-align: right;
		font-weight: 500;
	}

	.crop-cell {
		color: #64748b;
	}

	.location-cell {
		max-width: 200px;
	}

	.location-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #64748b;
		font-size: 0.8rem;
	}

	.status-cell {
		width: 100px;
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status.active {
		background: var(--green-100);
		color: var(--green-800);
	}

	.status.inactive {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	.actions-cell {
		width: 100px;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.header-actions {
			justify-content: stretch;
		}

		.stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.controls {
			flex-direction: column;
			align-items: stretch;
		}

		.filters {
			justify-content: stretch;
		}

		.filters :global(.select-group) {
			flex: 1;
			min-width: unset;
		}

		.field-table-container {
			overflow-x: auto;
		}

		.field-table {
			min-width: 800px;
		}

		.field-table th,
		.field-table td {
			padding: 0.5rem;
		}
	}
</style>