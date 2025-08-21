<script lang="ts">
	import { onMount } from 'svelte';
	import bowserStore, { filteredBowsers, bowserLoading, bowserError, bowserStats } from '$lib/stores/bowsers';
	import type { Bowser } from '$lib/types';
	import BowserCard from './BowserCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	
	interface Props {
		onselect?: (bowser: Bowser) => void;
		oncreate?: () => void;
	}
	
	let { onselect, oncreate }: Props = $props();
	
	let searchTerm = $state('');
	let filterActive = $state<boolean | null>(null);
	
	onMount(() => {
		bowserStore.loadBowsers();
	});
	
	function handleSearch(value: string) {
		searchTerm = value;
		bowserStore.setSearchTerm(value);
	}
	
	function toggleActiveFilter() {
		if (filterActive === null) {
			filterActive = true;
		} else if (filterActive === true) {
			filterActive = false;
		} else {
			filterActive = null;
		}
		bowserStore.setFilterActive(filterActive);
	}
	
	function handleRefresh() {
		bowserStore.loadBowsers();
	}
	
	const formatCapacity = (capacity: number) => {
		return new Intl.NumberFormat('en-ZA').format(capacity);
	};
</script>

<div class="bowser-list">
	<div class="header">
		<div class="title-section">
			<h2>Bowsers</h2>
			<div class="stats">
				<span class="stat">
					<span class="stat-value">{$bowserStats.total}</span>
					<span class="stat-label">Total</span>
				</span>
				<span class="stat">
					<span class="stat-value">{$bowserStats.active}</span>
					<span class="stat-label">Active</span>
				</span>
				<span class="stat">
					<span class="stat-value">{formatCapacity($bowserStats.totalCapacity)}</span>
					<span class="stat-label">Total Capacity (L)</span>
				</span>
			</div>
		</div>
		
		<div class="actions">
			<Button onclick={handleRefresh} variant="secondary" size="sm">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
				</svg>
				Refresh
			</Button>
			{#if oncreate}
				<Button onclick={oncreate} variant="primary" size="sm">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
					Add Bowser
				</Button>
			{/if}
		</div>
	</div>
	
	<div class="controls">
		<div class="search">
			<Input
				type="search"
				placeholder="Search bowsers..."
				value={searchTerm}
				oninput={(e) => handleSearch(e.currentTarget.value)}
			/>
		</div>
		
		<div class="filters">
			<Button
				onclick={toggleActiveFilter}
				variant={filterActive !== null ? 'primary' : 'secondary'}
				size="sm"
			>
				{#if filterActive === true}
					Active Only
				{:else if filterActive === false}
					Inactive Only
				{:else}
					All Status
				{/if}
			</Button>
		</div>
	</div>
	
	{#if $bowserError}
		<div class="error">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			{$bowserError}
		</div>
	{/if}
	
	{#if $bowserLoading === 'loading'}
		<div class="loading">
			<div class="spinner"></div>
			Loading bowsers...
		</div>
	{:else if $filteredBowsers.length === 0}
		<div class="empty">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="9" y1="9" x2="15" y2="15"></line>
				<line x1="15" y1="9" x2="9" y2="15"></line>
			</svg>
			<p>No bowsers found</p>
			{#if searchTerm || filterActive !== null}
				<p class="hint">Try adjusting your filters</p>
			{:else if oncreate}
				<Button onclick={oncreate} variant="primary" size="sm">
					Add Your First Bowser
				</Button>
			{/if}
		</div>
	{:else}
		<div class="grid">
			{#each $filteredBowsers as bowser (bowser.id)}
				<BowserCard 
					{bowser} 
					onclick={() => onselect?.(bowser)}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.bowser-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		height: 100%;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.title-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}
	
	.stats {
		display: flex;
		gap: 1.5rem;
	}
	
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	
	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-primary);
	}
	
	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.search {
		flex: 1;
		min-width: 200px;
	}
	
	.filters {
		display: flex;
		gap: 0.5rem;
	}
	
	.error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-error-light);
		color: var(--color-error);
		border-radius: 0.5rem;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 3rem;
		color: var(--color-text-secondary);
	}
	
	.spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 3rem;
		text-align: center;
	}
	
	.empty svg {
		color: var(--color-text-secondary);
		opacity: 0.5;
	}
	
	.empty p {
		margin: 0;
		color: var(--color-text-secondary);
	}
	
	.empty .hint {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
	}
	
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}
	
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
		}
		
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>