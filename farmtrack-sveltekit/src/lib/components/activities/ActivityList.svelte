<script lang="ts">
	import { onMount } from 'svelte';
	import activityStore, { filteredActivities, activityLoading, activityError, activityStats } from '$lib/stores/activities';
	import type { Activity, ActivityCategory, SortDirection } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	
	interface Props {
		onselect?: (activity: Activity) => void;
		oncreate?: () => void;
	}
	
	let { onselect, oncreate }: Props = $props();
	
	let searchTerm = $state('');
	let filterCategory = $state<string | null>(null);
	let filterActive = $state<boolean | null>(null);
	let sortBy = $state<keyof Activity>('name');
	let sortDirection = $state<SortDirection>('asc');
	
	onMount(() => {
		activityStore.loadActivities();
	});
	
	const categoryOptions = [
		{ value: '', label: 'All Categories' },
		{ value: 'planting', label: 'Planting' },
		{ value: 'harvesting', label: 'Harvesting' },
		{ value: 'spraying', label: 'Spraying' },
		{ value: 'fertilizing', label: 'Fertilizing' },
		{ value: 'maintenance', label: 'Maintenance' },
		{ value: 'other', label: 'Other' }
	];
	
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'true', label: 'Active Only' },
		{ value: 'false', label: 'Inactive Only' }
	];
	
	function handleSearch(value: string) {
		searchTerm = value;
		activityStore.setSearchTerm(value);
	}
	
	function handleCategoryFilter(value: string) {
		filterCategory = value || null;
		activityStore.setFilterCategory(filterCategory);
	}
	
	function handleStatusFilter(value: string) {
		filterActive = value === '' ? null : value === 'true';
		activityStore.setFilterActive(filterActive);
	}
	
	function handleRefresh() {
		activityStore.loadActivities();
	}
	
	function getCategoryIcon(category: ActivityCategory): string {
		const icons = {
			planting: '🌱',
			harvesting: '🌾',
			spraying: '💧',
			fertilizing: '🌿',
			maintenance: '🔧',
			other: '📋'
		};
		return icons[category] || '📋';
	}
	
	function getCategoryColor(category: ActivityCategory): string {
		const colors = {
			planting: '#16a34a',
			harvesting: '#ca8a04',
			spraying: '#2563eb',
			fertilizing: '#059669',
			maintenance: '#dc2626',
			other: '#6b7280'
		};
		return colors[category] || '#6b7280';
	}
	
	function formatCategory(category: string): string {
		return category.charAt(0).toUpperCase() + category.slice(1);
	}
	
	// Sorting functionality
	function handleSort(column: keyof Activity) {
		if (sortBy === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortDirection = 'asc';
		}
		activityStore.setSorting(sortBy, sortDirection);
	}
</script>

<div class="activity-list">
	<div class="header">
		<div class="header-content">
			<h2>Activities</h2>
			<p class="subtitle">Manage farm activities and operational categories</p>
		</div>
		<div class="header-actions">
			{#if oncreate}
				<Button variant="primary" onclick={oncreate}>
					<span class="icon">➕</span>
					Add Activity
				</Button>
			{/if}
		</div>
	</div>
	
	{#if $activityLoading === 'loading'}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading activities...</p>
		</div>
	{:else if $activityError}
		<Card class="error-card">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<div>
					<h3>Failed to Load Activities</h3>
					<p>{$activityError}</p>
					<Button variant="secondary" onclick={() => activityStore.loadActivities()}>
						{#snippet children()}
							Retry
						{/snippet}
					</Button>
				</div>
			</div>
		</Card>
	{:else if $filteredActivities.length === 0 && !searchTerm && !filterCategory && filterActive === null}
		<Card class="empty-state">
			<div class="empty-content">
				<span class="empty-icon">⚙️</span>
				<h3>No Activities Found</h3>
				<p>Get started by adding your first activity.</p>
				{#if oncreate}
					<Button variant="primary" onclick={oncreate}>
						Add Your First Activity
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Stats Cards -->
		<div class="stats">
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$activityStats.total}</span>
					<span class="stat-label">Total Activities</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{$activityStats.active}</span>
					<span class="stat-label">Active</span>
				</div>
			</Card>
			<Card padding="small">
				<div class="stat">
					<span class="stat-value">{Object.keys($activityStats.byCategory).length}</span>
					<span class="stat-label">Categories</span>
				</div>
			</Card>
		</div>
		
		<!-- Search and Filters -->
		<div class="controls">
			<div class="search">
				<Input
					type="search"
					placeholder="Search activities..."
					value={searchTerm}
					oninput={(e) => handleSearch(e.currentTarget.value)}
				/>
			</div>
			
			<div class="filters">
				<Select
					options={categoryOptions}
					value={filterCategory || ''}
					placeholder="All Categories"
					onchange={(e) => handleCategoryFilter(e.currentTarget.value)}
				/>
				
				<Select
					options={statusOptions}
					value={filterActive === null ? '' : filterActive.toString()}
					placeholder="All Status"
					onchange={(e) => handleStatusFilter(e.currentTarget.value)}
				/>
			</div>
		</div>
		
		{#if $filteredActivities.length === 0}
			<div class="no-results">
				<p>No activities match your filters</p>
				<p class="hint">Try adjusting your search or filters</p>
			</div>
		{:else}
			<!-- Activity Table -->
			<div class="activity-table-container">
				<table class="activity-table">
					<thead>
						<tr>
							<th>Icon</th>
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
							<th class="sortable" onclick={() => handleSort('name_zulu')}>
								<div class="header-content">
									<span>Zulu Name</span>
									{#if sortBy === 'name_zulu'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('category')}>
								<div class="header-content">
									<span>Category</span>
									{#if sortBy === 'category'}
										<span class="sort-icon {sortDirection}">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
							<th class="sortable" onclick={() => handleSort('description')}>
								<div class="header-content">
									<span>Description</span>
									{#if sortBy === 'description'}
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
						{#each $filteredActivities as activity (activity.id)}
							<tr class="activity-row" onclick={() => onselect?.(activity)}>
								<td class="icon-cell">
									<span class="activity-icon" style="color: {getCategoryColor(activity.category)}">
										{activity.icon || getCategoryIcon(activity.category)}
									</span>
								</td>
								<td class="code-cell">{activity.code}</td>
								<td class="name-cell">{activity.name}</td>
								<td class="zulu-cell">{activity.name_zulu || '-'}</td>
								<td class="category-cell">
									<span class="category-badge" style="background-color: {getCategoryColor(activity.category)}20; color: {getCategoryColor(activity.category)}">
										{formatCategory(activity.category)}
									</span>
								</td>
								<td class="description-cell">
									<span class="description-text" title={activity.description}>
										{activity.description || '-'}
									</span>
								</td>
								<td class="status-cell">
									<span class="status {activity.active ? 'active' : 'inactive'}">
										{activity.active ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td class="actions-cell">
									<div class="action-buttons">
										<Button size="sm" variant="outline" onclick={(e) => { e.stopPropagation(); onselect?.(activity); }}>
											View
										</Button>
										<a href="/fleet/activities/{activity.id}" onclick={(e) => e.stopPropagation()}>
											<Button size="sm" variant="primary">
												Analytics
											</Button>
										</a>
									</div>
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
	.activity-list {
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

	/* Activity Table */
	.activity-table-container {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: auto;
		background: white;
	}

	.activity-table {
		width: 100%;
		border-collapse: collapse;
	}

	.activity-table th {
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

	.activity-table th.sortable {
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s;
	}

	.activity-table th.sortable:hover {
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

	.activity-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		font-size: 0.875rem;
		vertical-align: middle;
	}

	.activity-row {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.activity-row:hover {
		background: #f8fafc;
	}

	.icon-cell {
		width: 50px;
		text-align: center;
	}

	.activity-icon {
		font-size: 1.25rem;
		display: inline-block;
	}

	.code-cell {
		font-weight: 600;
		color: #0f172a;
		width: 100px;
	}

	.name-cell {
		font-weight: 500;
		color: #0f172a;
		min-width: 150px;
	}

	.zulu-cell {
		color: #64748b;
		min-width: 150px;
	}

	.category-cell {
		width: 120px;
	}

	.category-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		display: inline-block;
	}

	.description-cell {
		max-width: 300px;
	}

	.description-text {
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
		width: 180px;
	}
	
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	
	.action-buttons a {
		text-decoration: none;
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
			grid-template-columns: repeat(3, 1fr);
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

		.activity-table-container {
			overflow-x: auto;
		}

		.activity-table {
			min-width: 900px;
		}

		.activity-table th,
		.activity-table td {
			padding: 0.5rem;
		}
	}
</style>