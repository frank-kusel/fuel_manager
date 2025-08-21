<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Zone } from '$lib/types';

	interface Props {
		onselect: (zone: Zone) => void;
		oncreate: () => void;
	}

	let { onselect, oncreate }: Props = $props();

	let zones: Zone[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		if (browser) {
			await loadZones();
		}
	});

	async function loadZones() {
		try {
			loading = true;
			await supabaseService.init();
			const result = await supabaseService.getZones();
			if (result.error) {
				throw new Error(result.error);
			}
			zones = result.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load zones';
		} finally {
			loading = false;
		}
	}

	function getZoneTypeLabel(type: string | undefined): string {
		const labels: Record<string, string> = {
			'farm_section': 'Farm Section',
			'infrastructure': 'Infrastructure', 
			'transport': 'Transport',
			'maintenance': 'Maintenance',
			'general': 'General'
		};
		return labels[type || 'general'] || 'General';
	}
</script>

<div class="zone-list">
	<div class="list-header">
		<h2>Zones</h2>
		<div class="header-actions">
			<Button variant="outline" onclick={() => window.open('/fleet/zones/print', '_blank')}>
				<span class="btn-icon">🖨️</span>
				Print Map
			</Button>
			<Button onclick={oncreate}>
				<span class="btn-icon">➕</span>
				Add Zone
			</Button>
		</div>
	</div>

	{#if error}
		<Card class="error-message">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<p>{error}</p>
			</div>
		</Card>
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading zones...</p>
		</div>
	{:else if zones.length === 0}
		<Card class="empty-state">
			<div class="empty-icon">📍</div>
			<h3>No Zones Yet</h3>
			<p>Create your first zone to track non-field locations</p>
			<Button onclick={oncreate}>Add First Zone</Button>
		</Card>
	{:else}
		<!-- Table View for Zones -->
		<div class="zones-table-container">
			<table class="zones-table">
				<thead>
					<tr>
						<th>Code</th>
						<th>Name</th>
						<th>Type</th>
						<th>Description</th>
						<th>Color</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each zones as zone (zone.id)}
						<tr class="zone-row" onclick={() => onselect(zone)}>
							<td>
								<div class="zone-badge" style="background-color: {zone.color || '#95A5A6'}">
									{zone.code}
								</div>
							</td>
							<td class="zone-name">{zone.name}</td>
							<td class="zone-type">{getZoneTypeLabel(zone.zone_type)}</td>
							<td class="zone-description">{zone.description || '-'}</td>
							<td>
								<div class="color-indicator" style="background-color: {zone.color || '#95A5A6'}"></div>
							</td>
							<td class="actions">
								<Button size="sm" variant="outline" onclick={(e) => { e.stopPropagation(); onselect(zone); }}>
									View
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.zone-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.list-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-icon {
		margin-right: 0.5rem;
	}

	.zones-table-container {
		flex: 1;
		overflow: auto;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: white;
	}

	.zones-table {
		width: 100%;
		border-collapse: collapse;
	}

	.zones-table th {
		background: #f8fafc;
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #475569;
		border-bottom: 2px solid #e2e8f0;
		position: sticky;
		top: 0;
	}

	.zones-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		font-size: 0.875rem;
	}

	.zone-row {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.zone-row:hover {
		background: #f8fafc;
	}

	.zone-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		color: white;
		font-weight: 600;
		font-size: 0.75rem;
		text-align: center;
		min-width: 60px;
	}

	.zone-name {
		font-weight: 500;
		color: #0f172a;
	}

	.zone-type {
		color: #64748b;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.zone-description {
		color: #64748b;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.color-indicator {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 1px solid #e2e8f0;
	}

	.actions {
		width: 100px;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #dc2626;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #0f172a;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		color: #64748b;
		margin: 0 0 1rem 0;
	}

	@media (max-width: 768px) {
		.list-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.header-actions {
			justify-content: center;
		}

		.zones-table-container {
			overflow-x: auto;
		}

		.zones-table {
			min-width: 600px;
		}
	}
</style>