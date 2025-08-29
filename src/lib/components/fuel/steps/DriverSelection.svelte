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
	
	let filteredDrivers = $derived([...drivers].sort((a, b) => {
		const codeA = a.employee_code || 'ZZZ';
		const codeB = b.employee_code || 'ZZZ';
		return codeA.localeCompare(codeB);
	}));
</script>

<div class="driver-selection">
	
	
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
			<table id="driver-table">
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
		<div class="selected-summary">
			<div class="selected-item">
				<div class="selected-label">Selected Driver</div>
				<div class="selected-name">{selectedDriver.name}</div>
				{#if selectedDriver.employee_code}
					<div class="selected-detail">#{selectedDriver.employee_code}</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.driver-selection {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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


	/* Ultra-clean table container */
	.table-container {
		background: transparent;
		margin: 0;
	}

	/* Ultra-clean table design with subtle row lines */
	:global(#driver-table) {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		table-layout: fixed;
	}

	:global(#driver-table th) {
		padding: 0.75rem 0;
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

	:global(#driver-table td) {
		padding: 1rem 0.5rem;
		text-align: left;
		border: none;
		font-size: 0.875rem;
		vertical-align: middle;
	}

	/* Add left padding to first column */
	:global(#driver-table th:nth-child(1)),
	:global(#driver-table td:nth-child(1)) {
		padding-left: 1rem;
	}

	/* Subtle row lines for all rows */
	:global(#driver-table tbody tr) {
		border-bottom: 1px solid rgba(248, 250, 252, 0.8);
	}

	:global(#driver-table tbody tr.clickable) {
		cursor: pointer;
		transition: all 0.15s ease;
		border-bottom-color: rgba(241, 245, 249, 0.6);
	}

	:global(#driver-table tbody tr.clickable:hover) {
		background: rgba(0, 0, 0, 0.02);
		border-bottom-color: rgba(203, 213, 225, 0.4);
	}

	:global(#driver-table tbody tr:last-child) {
		border-bottom: none;
	}

	/* Clean selected state */
	:global(#driver-table tbody tr.selected) {
		background: rgba(37, 99, 235, 0.08);
		border-radius: 0.5rem;
		border-bottom-color: rgba(37, 99, 235, 0.2);
	}

	/* Clean driver cell styling */
	:global(#driver-table .driver-code) {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		width: 4rem;
		min-width: 4rem;
		max-width: 4rem;
		text-align: center;
	}

	:global(#driver-table .driver-name) {
		font-weight: 400;
		color: #111827;
		font-size: 0.875rem;
	}

	/* Selected state text colors */
	:global(#driver-table tbody tr.selected .driver-code) {
		color: #2563eb;
		font-weight: 600;
	}

	:global(#driver-table tbody tr.selected .driver-name) {
		color: #1e293b;
		font-weight: 500;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.table-container {
			margin: 0;
		}

		:global(.table th),
		:global(.table td) {
			padding: 10px 12px;
		}
	}

	@media (max-width: 480px) {
		:global(.table th),
		:global(.table td) {
			padding: 8px 10px;
			font-size: 13px;
		}
	}

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
		}

		:global(#driver-table th) {
			padding: 0.625rem 0;
			font-size: 0.625rem;
		}

		:global(#driver-table td) {
			padding: 0.875rem 0;
			font-size: 0.8125rem;
		}

		/* Mobile Driver Table Column Widths */
		:global(#driver-table th:nth-child(1)),
		:global(#driver-table td:nth-child(1)) { /* Code */
			width: 30%;
		}

		:global(#driver-table th:nth-child(2)),
		:global(#driver-table td:nth-child(2)) { /* Name */
			width: 70%;
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