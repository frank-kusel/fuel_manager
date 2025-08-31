<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Activity } from '$lib/types';
	
	interface Props {
		selectedActivity: Activity | null;
		onActivitySelect: (activity: Activity | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}
	
	let { selectedActivity, onActivitySelect, onAutoAdvance, errors }: Props = $props();
	
	
	function handleActivitySelect(activity: Activity) {
		onActivitySelect(activity);
		// Auto-advance immediately
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	let activities: Activity[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	
	onMount(async () => {
		try {
			await supabaseService.init();
			// Get activities with legacy field
			const { data, error: fetchError } = await supabaseService['client']
				.from('activities')
				.select('*')
				.order('name', { ascending: true });
			
			const result = { data, error: fetchError?.message };
			if (result.error) {
				throw new Error(result.error);
			}
			activities = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load activities';
		} finally {
			loading = false;
		}
	});
	
	// Group activities by category
	let groupedActivities = $derived.by(() => {
		const groups: Record<string, Activity[]> = {};
		
		// Filter activities first
		const filtered = activities.filter(activity => {
			if (!searchTerm) return true;
			const search = searchTerm.toLowerCase();
			return (
				activity.name.toLowerCase().includes(search) ||
				activity.name_zulu?.toLowerCase().includes(search) ||
				activity.description?.toLowerCase().includes(search) ||
				activity.code.toLowerCase().includes(search) ||
				activity.category?.toLowerCase().includes(search)
			);
		});
		
		// Sort and group by category
		const sorted = [...filtered].sort((a, b) => {
			const categoryA = a.category || 'Other';
			const categoryB = b.category || 'Other';
			if (categoryA < categoryB) return -1;
			if (categoryA > categoryB) return 1;
			// If same category, sort by name
			const nameA = a.name || '';
			const nameB = b.name || '';
			if (nameA < nameB) return -1;
			if (nameA > nameB) return 1;
			return 0;
		});
		
		// Group by category
		sorted.forEach(activity => {
			const category = activity.category || 'Other';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(activity);
		});
		
		return groups;
	});
	
	let filteredActivitiesCount = $derived(Object.values(groupedActivities).flat().length);
	
	// Use the actual icon from database, fallback to generic icon
	function getActivityIcon(activity: Activity): string {
		return activity.icon || '⚙️';
	}
	
	function getActivityColor(activityName: string): string {
		const name = activityName.toLowerCase();
		if (name.includes('plowing') || name.includes('plough')) return '#8b5cf6';
		if (name.includes('seeding') || name.includes('planting')) return '#10b981';
		if (name.includes('harvesting') || name.includes('harvest')) return '#f59e0b';
		if (name.includes('spraying') || name.includes('spray')) return '#06b6d4';
		if (name.includes('cultivation') || name.includes('cultivat')) return '#84cc16';
		if (name.includes('transport') || name.includes('hauling')) return '#6b7280';
		if (name.includes('mowing') || name.includes('cutting')) return '#ef4444';
		if (name.includes('irrigation') || name.includes('watering')) return '#3b82f6';
		return '#6366f1';
	}
</script>

<div class="activity-selection">
	
	{#if !loading && activities.length > 0}
		<div class="search-container">
			<div class="search-input">
				<span class="search-icon">🔍</span>
				<input 
					type="text" 
					placeholder="Search activities..."
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
			<div class="activities-grid">
				{#each Array(8) as _}
					<div class="activity-card-skeleton">
						<div class="skeleton-header">
							<div class="skeleton-icon"></div>
							<div class="skeleton-content">
								<div class="skeleton-line"></div>
								<div class="skeleton-line short"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if error}
		<div class="error-state">
			<div class="error-icon">🚨</div>
			<p>Failed to load activities</p>
			<small>{error}</small>
		</div>
	{:else if activities.length === 0}
		<div class="empty-state">No activities available</div>
	{:else if filteredActivitiesCount === 0}
		<div class="empty-state">No activities found</div>
	{:else}
		<div class="activities-container">
			{#each Object.entries(groupedActivities) as [category, activityList]}
				<!-- Category Header -->
				<div class="category-section">
					<h3 class="category-title">{category}</h3>
					
					<!-- Activities Grid -->
					<div class="activities-grid">
						{#each activityList as activity (activity.id)}
							<button 
								class="activity-card {selectedActivity?.id === activity.id ? 'selected' : ''}"
								onclick={() => handleActivitySelect(activity)}
							>
								<div class="activity-main">
									<span class="activity-icon" style="color: {getActivityColor(activity.name)}">
										{getActivityIcon(activity)}
									</span>
									<div class="activity-info">
										<div class="activity-name">{activity.name}</div>
										<div class="activity-meta">
											<span class="activity-code">{activity.code}</span>
											{#if activity.name_zulu}
												<span class="activity-zulu">{activity.name_zulu}</span>
											{/if}
										</div>
									</div>
								</div>
								{#if selectedActivity?.id === activity.id}
									<div class="selection-indicator">✓</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	{#if selectedActivity}
		<div class="selected-summary">
			<div class="selected-item">
				<div class="selected-label">Selected Activity</div>
				<div class="selected-name">{selectedActivity.name}</div>
				<div class="selected-detail">{selectedActivity.code}</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.activity-selection {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Activities container */
	.activities-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Category sections */
	.category-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-title {
		font-size: 1rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
		padding: 1rem;
		text-align: center;
		background: var(--background-200, #f9fafb);
		border-radius: 8px;
	}

	/* Activities grid - two columns */
	.activities-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	/* Activity cards */
	.activity-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: var(--gray-50);
		border: 1px solid var(--gray-200);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		width: 100%;
	}

	.activity-card:hover {
		background: rgba(0, 0, 0, 0.02);
		border-color: #e2e8f0;
	}

	.activity-card.selected {
		background: rgba(37, 99, 235, 0.06);
		border-color: rgba(37, 99, 235, 0.2);
	}

	.activity-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.activity-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
		width: 1.5rem;
		text-align: center;
	}

	.activity-info {
		flex: 1;
		min-width: 0;
	}

	.activity-name {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
		line-height: 1.3;
		margin-bottom: 0.25rem;
	}

	.activity-card.selected .activity-name {
		color: #2563eb;
		font-weight: 600;
	}

	.activity-meta {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.activity-code {
		font-family: 'Inter', monospace;
		font-weight: 500;
		color: #6b7280;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.activity-zulu {
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selection-indicator {
		color: #2563eb;
		font-size: 1rem;
		font-weight: bold;
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		background: rgba(37, 99, 235, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Clean selected summary - matches other tables */
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

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.activities-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.375rem;
		}

		.activity-card {
			padding: 0.625rem;
		}

		.activity-name {
			font-size: 0.8125rem;
		}

		.activity-code {
			font-size: 0.625rem;
		}

		.activity-zulu {
			font-size: 0.6875rem;
		}
	}

	@media (max-width: 480px) {
		.activities-container {
			gap: 1.5rem;
		}

		.category-section {
			gap: 0.75rem;
		}

		.activity-card {
			padding: 0.5rem;
		}

		.activity-main {
			gap: 0.5rem;
		}

		.activity-icon {
			font-size: 1rem;
		}

		.activity-name {
			font-size: 0.75rem;
		}
	}

	/* Step Header */
	.step-header {
		text-align: center;
		margin-bottom: 1rem;
	}

	.step-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
		margin: 0;
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


	/* Activity Card Content */
	.activity-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.activity-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-background-secondary);
		border-radius: 8px;
		margin-top: 0.125rem;
	}

	.activity-info {
		flex: 1;
		min-width: 0;
	}

	.activity-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.activity-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.selected-icon {
		color: var(--color-success);
		font-size: 1.5rem;
		font-weight: bold;
		flex-shrink: 0;
		background: var(--color-success-100);
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		/* animation: check-bounce 0.6s ease-out; */ /* Removed for faster performance */
	}

	/* Removed check-bounce animation for faster performance
	@keyframes check-bounce {
		0% { 
			transform: scale(0);
			opacity: 0;
		}
		50% { 
			transform: scale(1.2);
			opacity: 0.8;
		}
		100% { 
			transform: scale(1);
			opacity: 1;
		}
	} */

	/* Selection Summary */
	.selection-summary {
		margin-top: 1rem;
	}

	:global(.selected-activity-summary) {
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
		margin-bottom: 1rem;
	}

	.summary-activity {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.summary-activity-icon {
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
		margin-bottom: 0.125rem;
	}

	.summary-name-zulu {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-style: italic;
		margin-bottom: 0.25rem;
	}

	.summary-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.summary-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Loading State */
	.activity-card-skeleton {
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-background);
		min-height: 80px;
	}

	.skeleton-header {
		display: flex;
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
		width: 70%;
		height: 0.875rem;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty/Error States */
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
	}

</style>