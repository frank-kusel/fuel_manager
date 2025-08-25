<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Driver } from '$lib/types';
	
	interface Props {
		selectedDriver: Driver | null;
		onDriverSelect: (driver: Driver | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}
	
	let { selectedDriver, onDriverSelect, onAutoAdvance, errors }: Props = $props();
	
	
	function handleDriverSelect(driver: Driver) {
		onDriverSelect(driver);
		// Auto-advance immediately
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	let drivers: Driver[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	
	onMount(async () => {
		try {
			await supabaseService.init();
			const result = await supabaseService.getDrivers();
			if (result.error) {
				throw new Error(result.error);
			}
			drivers = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load drivers';
		} finally {
			loading = false;
		}
	});
	
	let filteredDrivers = $derived(drivers.filter(driver => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			driver.name.toLowerCase().includes(search) ||
			driver.employee_code?.toLowerCase().includes(search) ||
			driver.license_number?.toLowerCase().includes(search)
		);
	}));
</script>

<div class="driver-selection">
	
	{#if !loading && drivers.length > 0}
		<div class="search-container">
			<div class="search-input">
				<span class="search-icon">🔍</span>
				<input 
					type="text" 
					placeholder="Search by name, employee code, or license number..."
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
			<div class="drivers-grid">
				{#each Array(6) as _}
					<div class="driver-card-skeleton">
						<div class="skeleton-header">
							<div class="skeleton-avatar"></div>
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
			<p>Failed to load drivers</p>
			<small>{error}</small>
		</div>
	{:else if drivers.length === 0}
		<div class="empty-state">No drivers available</div>
	{:else if filteredDrivers.length === 0}
		<div class="empty-state">No drivers found</div>
	{:else}
		<div class="table-container">
			<table class="table" id="driver-table">
				<thead>
					<tr>
						<th>Code</th>
						<th>Name</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredDrivers as driver (driver.id)}
						<tr 
							class="driver-row clickable {selectedDriver?.id === driver.id ? 'selected' : ''}"
							onclick={() => {
																handleDriverSelect(driver);
							}}
						>
							<td class="driver-code">{driver.employee_code || 'DRV'}</td>
							<td class="driver-name">{driver.name}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	
	{#if selectedDriver}
		<div class="selection-summary">
			<Card class="selected-driver-summary">
				<div class="summary-header">
					<span class="summary-icon">✓</span>
					<h3>Selected Driver</h3>
				</div>
				<div class="summary-content">
					<div class="summary-driver">
						<div class="summary-avatar">
							{selectedDriver.name.charAt(0).toUpperCase()}
						</div>
						<div class="summary-info">
							<div class="summary-name">{selectedDriver.name}</div>
							{#if selectedDriver.employee_code}
								<div class="summary-code">#{selectedDriver.employee_code}</div>
							{/if}
						</div>
					</div>
					{#if selectedDriver.license_number}
						<div class="summary-details">
							<div class="summary-detail">
								<span>License:</span>
								<strong>{selectedDriver.license_number}</strong>
							</div>
						</div>
					{/if}
				</div>
				<div class="summary-actions">
					<Button variant="outline" size="sm" onclick={() => onDriverSelect(null)}>
						Change Driver
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.driver-selection {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0;
	}

	/* Step Header - Following original design */
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

	/* Table Container - Original Design */
	.table-container {
		background: var(--white, #ffffff);
		border: 1px solid var(--gray-200, #e2e8f0);
		border-radius: 0.75rem;
		overflow-x: auto;
		margin: 0.5rem 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	/* Table Styling - Original Design */
	:global(.table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	:global(.table th),
	:global(.table td) {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--gray-200, #e2e8f0);
	}

	:global(.table th) {
		background: var(--gray-50, #f8fafc);
		font-weight: 600;
		color: var(--gray-700, #334155);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.table tbody tr:hover) {
		background: var(--gray-50, #f8fafc);
	}

	:global(.table tbody tr.clickable) {
		cursor: pointer;
	}

	:global(.table tbody tr.clickable:hover) {
		background: var(--primary-light, #eff6ff);
	}

	/* Selected rows */
	:global(.table tbody tr.selected) {
		background: var(--primary, #2563eb);
		color: var(--white, #ffffff);
	}

	/* Selection Summary */
	.selection-summary {
		margin-top: 1rem;
	}

	:global(.selected-driver-summary) {
		border: 2px solid #a7f3d0;
		background: #ecfdf5;
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.summary-icon {
		background: #10b981;
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
		color: #047857;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.summary-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.summary-driver {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.summary-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: #10b981;
		color: var(--gray-900, #0f172a);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	.summary-name {
		font-weight: 600;
		color: var(--gray-900, #0f172a);
	}

	.summary-code {
		font-size: 0.875rem;
		color: var(--gray-600, #475569);
		font-family: monospace;
	}

	.summary-detail {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		font-size: 0.875rem;
	}

	.summary-detail span {
		color: var(--gray-600, #475569);
	}

	.summary-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Loading State */
	.driver-card-skeleton {
		padding: 1rem;
		border: 1px solid var(--gray-200, #e2e8f0);
		border-radius: 8px;
		background: var(--white, #ffffff);
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

	.skeleton-avatar,
	.skeleton-line {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-avatar {
		width: 2.5rem;
		height: 2.5rem;
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

	/* Empty/Error States */
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--gray-600, #475569);
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
		color: var(--gray-500, #64748b);
		max-width: 300px;
	}

	/* Mobile Responsiveness - Following original design */
	@media (max-width: 768px) {
		.step-header h2 {
			font-size: 1.125rem;
			margin: 0;
		}

		.table-container {
			margin: 0;
			background: white;
			border-radius: 8px;
			border: 1px solid var(--gray-200, #e2e8f0);
			overflow: hidden;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		}

		:global(.table) {
			width: 100%;
			font-size: 13px;
			border-collapse: collapse;
			table-layout: fixed;
		}

		:global(.table th),
		:global(.table td) {
			padding: 0.75rem 1rem !important;
			border-bottom: 1px solid var(--gray-100, #f1f5f9);
			font-size: 0.95rem; /* Increased for mobile readability */
		}

		:global(.table th) {
			background-color: var(--gray-50, #f8fafc);
			font-weight: 600;
			color: var(--gray-700, #334155);
			text-transform: uppercase;
			font-size: 0.75rem;
			letter-spacing: 0.05em;
		}

		:global(.table .clickable) {
			cursor: pointer;
		}

		:global(.table .clickable) {
			min-height: 56px; /* Touch-friendly */
		}

		:global(.table .selected) {
			background: var(--primary, #2563eb);
			color: var(--gray-900, #0f172a);
			font-weight: 600;
		}

		/* Mobile Driver Table Column Widths */
		:global(#driver-table th:nth-child(1)),
		:global(#driver-table td:nth-child(1)) { /* Code */
			width: 30%;
			font-weight: 600;
			color: var(--primary, #2563eb);
		}

		:global(#driver-table th:nth-child(2)),
		:global(#driver-table td:nth-child(2)) { /* Name */
			width: 70%;
			font-weight: 500;
		}

		.summary-content {
			flex-direction: column;
			gap: 1rem;
		}

		.summary-detail {
			align-items: flex-start;
		}
	}

	/* Default Vehicle Styling */
	.default-vehicle {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.vehicle-code {
		font-weight: 600;
		color: var(--primary, #2563eb);
		font-size: 0.75rem;
	}

	.vehicle-name {
		font-size: 0.7rem;
		color: var(--gray-600, #475569);
		line-height: 1.2;
	}

	.no-default {
		color: var(--gray-400, #9ca3af);
		font-style: italic;
		font-size: 0.875rem;
	}
</style>