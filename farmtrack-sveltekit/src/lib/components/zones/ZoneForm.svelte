<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Zone } from '$lib/types';

	interface Props {
		zone?: Zone | null;
		onback: () => void;
	}

	let { zone = null, onback }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let formData = $state({
		code: zone?.code || '',
		name: zone?.name || '',
		description: zone?.description || '',
		zone_type: (zone?.zone_type || 'general') as Zone['zone_type'],
		color: zone?.color || '#95A5A6',
		display_order: zone?.display_order || 0
	});

	const isEditing = !!zone;

	async function handleSubmit() {
		if (!formData.code.trim() || !formData.name.trim()) {
			error = 'Code and name are required';
			return;
		}

		try {
			loading = true;
			error = null;
			await supabaseService.init();

			if (isEditing && zone) {
				const result = await supabaseService.updateZone(zone.id, formData);
				if (result.error) throw new Error(result.error);
			} else {
				const result = await supabaseService.createZone(formData);
				if (result.error) throw new Error(result.error);
			}

			onback();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save zone';
		} finally {
			loading = false;
		}
	}
</script>

<div class="zone-form">
	<Card>
		<div class="form-header">
			<h2>{isEditing ? 'Edit Zone' : 'Create New Zone'}</h2>
			<Button variant="outline" onclick={onback}>
				← Back
			</Button>
		</div>

		{#if error}
			<div class="error-message">
				<span class="error-icon">⚠️</span>
				<p>{error}</p>
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="form-grid">
				<div class="form-group">
					<label for="code">Code *</label>
					<input 
						id="code"
						type="text" 
						bind:value={formData.code}
						placeholder="e.g., A1, B2, C1"
						required
					/>
				</div>

				<div class="form-group">
					<label for="name">Name *</label>
					<input 
						id="name"
						type="text" 
						bind:value={formData.name}
						placeholder="e.g., North Section, Transport Zone"
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
						<div class="color-preview" style="background-color: {formData.color}"></div>
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

				<div class="form-group">
					<label for="display_order">Display Order</label>
					<input 
						id="display_order"
						type="number" 
						bind:value={formData.display_order}
						min="0"
						placeholder="0"
					/>
				</div>
			</div>

			<div class="form-actions">
				<Button type="button" variant="outline" onclick={onback}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Saving...' : (isEditing ? 'Update Zone' : 'Create Zone')}
				</Button>
			</div>
		</form>
	</Card>
</div>

<style>
	.zone-form {
		max-width: 800px;
		margin: 0 auto;
	}

	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.form-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;
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
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		font-size: 0.875rem;
		background: var(--color-background);
		color: var(--color-text);
		transition: border-color 0.2s;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
	}

	.color-input {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.color-input input[type="color"] {
		width: 60px;
		height: 40px;
		padding: 0.25rem;
		cursor: pointer;
		border-radius: 6px;
	}

	.color-preview {
		flex: 1;
		height: 40px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		margin-bottom: 1.5rem;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.form-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.form-actions {
			flex-direction: column;
			gap: 0.75rem;
		}
	}
</style>