<script lang="ts">
	import { drivers, referenceDataLoading, referenceDataError } from '$lib/stores/reference-data';
	import type { Driver } from '$lib/types';

	interface Props {
		selectedDriver: Driver | null;
		onDriverSelect: (driver: Driver | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}

	let { selectedDriver, onDriverSelect, onAutoAdvance, errors }: Props = $props();

	let searchQuery = $state('');

	function handleDriverSelect(driver: Driver) {
		onDriverSelect(driver);
		// Auto-advance immediately
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}

	function matchesSearch(driver: Driver, query: string): boolean {
		if (!query.trim()) return true;
		const q = query.toLowerCase();
		return [driver.name, driver.employee_code]
			.some((f) => (f || '').toLowerCase().includes(q));
	}

	let filteredDrivers = $derived(
		[...$drivers]
			.filter((d) => matchesSearch(d, searchQuery))
			.sort((a, b) => {
				const codeA = a.employee_code || 'ZZZ';
				const codeB = b.employee_code || 'ZZZ';
				return codeA.localeCompare(codeB);
			})
	);
</script>

<div class="driver-selection">
	
	
	{#if $referenceDataLoading}
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
	{:else if $referenceDataError}
		<div class="error-state">
			<div class="error-icon">🚨</div>
			<p>Failed to load drivers</p>
			<small>{$referenceDataError}</small>
		</div>
	{:else if $drivers.length === 0}
		<div class="empty-state">No drivers available</div>
	{:else}
		<div class="search-bar">
			<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
			</svg>
			<input
				type="search"
				class="search-input"
				placeholder="Search drivers…"
				bind:value={searchQuery}
				aria-label="Search drivers"
			/>
			{#if searchQuery}
				<button class="search-clear" onclick={() => (searchQuery = '')} aria-label="Clear search">×</button>
			{/if}
		</div>

		{#if filteredDrivers.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🔍</div>
				<p>No matches for "{searchQuery}"</p>
				<small>Try a different name or employee code</small>
			</div>
		{:else}
		<div class="driver-table-container">
			<table class="driver-table">
				<colgroup>
					<col class="col-code">
					<col class="col-name">
				</colgroup>
				<tbody>
					{#each filteredDrivers as driver (driver.id)}
						<tr 
							class="driver-row {selectedDriver?.id === driver.id ? 'selected' : ''}"
							onclick={() => handleDriverSelect(driver)}
						>
							<td class="driver-code">{driver.employee_code || 'DRV'}</td>
							<td class="driver-name">{driver.name}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}
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

	/* Search bar */
	.search-bar {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.search-icon {
		position: absolute;
		left: 0.875rem;
		color: var(--gray-400);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.625rem 2.5rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-lg);
		font-size: var(--text-base);
		color: var(--gray-900);
		background: var(--white);
		box-sizing: border-box;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		-webkit-appearance: none;
		appearance: none;
	}

	.search-input::placeholder {
		color: var(--gray-400);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		background: var(--gray-100);
		color: var(--gray-600);
		border-radius: var(--radius-full);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.search-clear:hover {
		background: var(--gray-200);
	}

	@media (max-width: 768px) {
		.search-input {
			font-size: 16px; /* prevents iOS zoom on focus */
		}
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


	/* Clean table container */
	.driver-table-container {
		background: transparent;
		margin: 0;
	}

	/* Clean table design */
	.driver-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		table-layout: fixed;
	}

	/* Column widths using colgroup - Desktop */
	.col-code { width: 20%; }
	.col-name { width: 80%; }

	.driver-table td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border: none;
		font-size: 1rem;
		vertical-align: middle;
		border-bottom: 1px solid rgba(248, 250, 252, 0.8);
	}

	.driver-table tbody tr.driver-row {
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.driver-table tbody tr.driver-row:hover {
		background: rgba(0, 0, 0, 0.02);
		border-bottom-color: rgba(203, 213, 225, 0.4);
	}

	.driver-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* Selected driver row */
	.driver-table tbody tr.driver-row.selected {
		background: rgba(13, 148, 136, 0.08);
		border-radius: 0.5rem;
	}

	.driver-table tbody tr.driver-row.selected .driver-code {
		color: var(--brand-hover);
		font-weight: 600;
	}

	.driver-table tbody tr.driver-row.selected .driver-name {
		color: #1e293b;
		font-weight: 500;
	}

	/* Cell styling */
	.driver-code {
		font-weight: 600;
		color: #374151;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		text-align: left;
		padding-left: 0.5rem;
	}

	.driver-name {
		font-weight: 400;
		color: #111827;
		font-size: 0.875rem;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.driver-table-container {
			margin: 0;
		}

		.driver-code,
		.driver-name {
			font-size: 14px;
		}

		/* Mobile column widths - match vehicle table code column */
		.col-code { width: 20%; }
		.col-name { width: 80%; }
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


	/* Default Vehicle Styling */
	.default-vehicle {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.vehicle-code {
		font-weight: 600;
		color: var(--brand);
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