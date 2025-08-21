<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Zone } from '$lib/types';

	let zones: Zone[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editingZone = $state<Zone | null>(null);
	let showAddForm = $state(false);

	// Form state
	let formData = $state({
		code: '',
		name: '',
		description: '',
		zone_type: 'general' as Zone['zone_type'],
		color: '#95A5A6',
		display_order: 0
	});

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

	function startEdit(zone: Zone) {
		editingZone = zone;
		formData = {
			code: zone.code,
			name: zone.name,
			description: zone.description || '',
			zone_type: zone.zone_type || 'general',
			color: zone.color || '#95A5A6',
			display_order: zone.display_order || 0
		};
		showAddForm = false;
	}

	function startAdd() {
		showAddForm = true;
		editingZone = null;
		formData = {
			code: '',
			name: '',
			description: '',
			zone_type: 'general',
			color: '#95A5A6',
			display_order: zones.length
		};
	}

	function cancelEdit() {
		editingZone = null;
		showAddForm = false;
	}

	async function saveZone() {
		try {
			if (editingZone) {
				// Update existing zone
				const result = await supabaseService.updateZone(editingZone.id, formData);
				if (result.error) throw new Error(result.error);
			} else {
				// Create new zone
				const result = await supabaseService.createZone(formData);
				if (result.error) throw new Error(result.error);
			}
			await loadZones();
			cancelEdit();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save zone';
		}
	}

	async function deleteZone(zone: Zone) {
		if (!confirm(`Are you sure you want to delete zone "${zone.name}"?`)) return;
		
		try {
			const result = await supabaseService.deleteZone(zone.id);
			if (result.error) throw new Error(result.error);
			await loadZones();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete zone';
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

<div class="zones-page">
	<div class="page-header">
		<h1>Zone Management</h1>
		<p>Manage location zones for operations that don't occur in specific fields</p>
	</div>

	{#if error}
		<Card class="error-message">
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<p>{error}</p>
			</div>
		</Card>
	{/if}

	<div class="zones-header">
		<Button variant="outline" onclick={() => window.open('/fleet/zones/print', '_blank')}>
			<span class="btn-icon">🖨️</span>
			Print Zone Map
		</Button>
		<Button onclick={startAdd} disabled={showAddForm}>
			<span class="btn-icon">➕</span>
			Add New Zone
		</Button>
	</div>

	{#if showAddForm || editingZone}
		<Card class="zone-form">
			<h3>{editingZone ? 'Edit Zone' : 'Add New Zone'}</h3>
			<div class="form-grid">
				<div class="form-group">
					<label for="code">Code *</label>
					<input 
						id="code"
						type="text" 
						bind:value={formData.code}
						placeholder="e.g., Z-A1"
						required
					/>
				</div>
				<div class="form-group">
					<label for="name">Name *</label>
					<input 
						id="name"
						type="text" 
						bind:value={formData.name}
						placeholder="e.g., Zone A1 - North Section"
						required
					/>
				</div>
				<div class="form-group">
					<label for="type">Zone Type</label>
					<select id="type" bind:value={formData.zone_type}>
						<option value="farm_section">Farm Section</option>
						<option value="infrastructure">Infrastructure</option>
						<option value="transport">Transport</option>
						<option value="maintenance">Maintenance</option>
						<option value="general">General</option>
					</select>
				</div>
				<div class="form-group">
					<label for="color">Color</label>
					<div class="color-input">
						<input 
							id="color"
							type="color" 
							bind:value={formData.color}
						/>
						<span class="color-preview" style="background-color: {formData.color}"></span>
					</div>
				</div>
				<div class="form-group full-width">
					<label for="description">Description</label>
					<textarea 
						id="description"
						bind:value={formData.description}
						placeholder="Describe this zone's location and purpose"
						rows="3"
					></textarea>
				</div>
			</div>
			<div class="form-actions">
				<Button variant="outline" onclick={cancelEdit}>Cancel</Button>
				<Button onclick={saveZone}>
					{editingZone ? 'Update Zone' : 'Create Zone'}
				</Button>
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
		</Card>
	{:else}
		<div class="zones-grid">
			{#each zones as zone (zone.id)}
				<Card class="zone-card">
					<div class="zone-header">
						<div class="zone-badge" style="background-color: {zone.color || '#95A5A6'}">
							{zone.code}
						</div>
						<div class="zone-type">
							{getZoneTypeLabel(zone.zone_type)}
						</div>
					</div>
					<h3>{zone.name}</h3>
					{#if zone.description}
						<p class="zone-description">{zone.description}</p>
					{/if}
					<div class="zone-actions">
						<Button size="sm" variant="outline" onclick={() => startEdit(zone)}>
							Edit
						</Button>
						<Button size="sm" variant="outline" onclick={() => deleteZone(zone)}>
							Delete
						</Button>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style>
	.zones-page {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--gray-900, #0f172a);
		margin: 0 0 0.5rem 0;
	}

	.page-header p {
		color: var(--gray-600, #475569);
		margin: 0;
	}

	.zones-header {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.btn-icon {
		margin-right: 0.5rem;
	}

	.zone-form {
		margin-bottom: 2rem;
	}

	.zone-form h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700, #334155);
		margin-bottom: 0.5rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--gray-300, #d1d5db);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: white;
		color: var(--gray-900, #0f172a);
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--blue-500, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.color-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.color-input input[type="color"] {
		width: 50px;
		height: 36px;
		padding: 0.25rem;
		cursor: pointer;
	}

	.color-preview {
		width: 100%;
		height: 36px;
		border: 1px solid var(--gray-300, #d1d5db);
		border-radius: 0.375rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.zones-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.zone-card {
		display: flex;
		flex-direction: column;
		padding: 1.25rem;
	}

	.zone-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.zone-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.zone-type {
		font-size: 0.75rem;
		color: var(--gray-500, #64748b);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.zone-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
	}

	.zone-description {
		color: var(--gray-600, #475569);
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
		flex: 1;
	}

	.zone-actions {
		display: flex;
		gap: 0.5rem;
	}

	.error-message {
		margin-bottom: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #dc2626;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
	}

	.spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--gray-200, #e5e7eb);
		border-top-color: var(--blue-500, #3b82f6);
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
		color: var(--gray-900, #0f172a);
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		color: var(--gray-600, #475569);
		margin: 0;
	}

	@media (max-width: 768px) {
		.zones-page {
			padding: 1rem;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.zones-grid {
			grid-template-columns: 1fr;
		}
	}
</style>