<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import fieldStore from '$lib/stores/fields';
	import type { Field, FieldType } from '$lib/types';

	interface Props {
		field?: Field | null;
		loading?: boolean;
	}

	let { field = null, loading = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		save: Field;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		code: field?.code || '',
		name: field?.name || '',
		type: field?.type || 'arable' as FieldType,
		area: field?.area || 0,
		location: field?.location || '',
		crop_type: field?.crop_type || '',
		active: field?.active ?? true
	});

	// Form validation
	let errors = $state<Record<string, string>>({});

	const typeOptions = [
		{ value: 'arable', label: 'Arable' },
		{ value: 'pasture', label: 'Pasture' },
		{ value: 'orchard', label: 'Orchard' },
		{ value: 'greenhouse', label: 'Greenhouse' },
		{ value: 'other', label: 'Other' }
	];

	function validateForm(): boolean {
		errors = {};

		if (!formData.code.trim()) {
			errors.code = 'Field code is required';
		}
		
		if (!formData.name.trim()) {
			errors.name = 'Field name is required';
		}

		if (formData.name.length > 100) {
			errors.name = 'Field name must be less than 100 characters';
		}

		if (formData.area <= 0) {
			errors.area = 'Area must be greater than 0 hectares';
		}

		if (formData.area > 10000) {
			errors.area = 'Area seems unrealistically high (max 10,000 hectares)';
		}

		if (formData.location && formData.location.length > 200) {
			errors.location = 'Location must be less than 200 characters';
		}

		if (formData.crop_type && formData.crop_type.length > 100) {
			errors.crop_type = 'Crop type must be less than 100 characters';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Create field object
		const fieldData: Partial<Field> = {
			...formData,
			location: formData.location.trim() || undefined,
			crop_type: formData.crop_type.trim() || undefined
		};

		// If editing existing field, include ID
		if (field) {
			fieldData.id = field.id;
		}

		try {
			let result;
			if (field) {
				// Update existing field
				result = await fieldStore.updateField(fieldData as Field);
			} else {
				// Create new field
				result = await fieldStore.createField(fieldData as Omit<Field, 'id' | 'created_at' | 'updated_at'>);
			}

			if (result.success && result.data) {
				dispatch('save', result.data);
			} else {
				// Handle error - show in form
				errors.submit = result.error || 'Failed to save field';
			}
		} catch (error) {
			errors.submit = error instanceof Error ? error.message : 'Failed to save field';
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	// Clear specific field error when user starts typing
	function clearFieldError(field: string) {
		if (errors[field]) {
			errors = { ...errors };
			delete errors[field];
		}
	}

	// Generate field code based on type
	function generateCode() {
		const typePrefixes = {
			arable: 'AR',
			pasture: 'PA',
			orchard: 'OR',
			greenhouse: 'GH',
			other: 'OT'
		};
		
		const prefix = typePrefixes[formData.type];
		const timestamp = Date.now().toString().slice(-4);
		formData.code = `${prefix}${timestamp}`;
		clearFieldError('code');
	}

	const isEditing = $derived(!!field);
	const formTitle = $derived(isEditing ? 'Edit Field' : 'Add New Field');
	const submitLabel = $derived(isEditing ? 'Update Field' : 'Create Field');
</script>

<Card class="field-form-card">
	<div class="form-header">
		<h2>{formTitle}</h2>
		<p class="form-subtitle">
			{isEditing ? 'Update field information' : 'Add a new field to your farm operation'}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="field-form">
		{#if errors.submit}
			<div class="form-error">
				<span class="error-icon">⚠️</span>
				{errors.submit}
			</div>
		{/if}

		<!-- Basic Information Section -->
		<div class="form-section">
			<h3>Basic Information</h3>
			
			<div class="form-row">
				<div class="form-group">
					<Input
						bind:value={formData.code}
						label="Field Code"
						placeholder="e.g., AR001"
						required
						error={errors.code}
						oninput={() => clearFieldError('code')}
					/>
					<Button 
						type="button" 
						variant="secondary" 
						size="small" 
						class="code-generate-btn"
						onclick={generateCode}
					>
						{#snippet children()}
							Generate
						{/snippet}
					</Button>
				</div>
				
				<Select
					bind:value={formData.type}
					label="Field Type"
					options={typeOptions}
					required
					error={errors.type}
				/>
			</div>

			<Input
				bind:value={formData.name}
				label="Field Name"
				placeholder="e.g., North Corn Field"
				required
				error={errors.name}
				oninput={() => clearFieldError('name')}
			/>

			<div class="form-row">
				<Input
					bind:value={formData.area}
					type="number"
					label="Area (Hectares)"
					placeholder="e.g., 25.5"
					min={0.01}
					max={10000}
					step="0.01"
					required
					error={errors.area}
					oninput={() => clearFieldError('area')}
				/>
				
				<Input
					bind:value={formData.location}
					label="Location"
					placeholder="e.g., North Sector, Block A"
					error={errors.location}
					oninput={() => clearFieldError('location')}
				/>
			</div>
		</div>

		<!-- Crop Information Section -->
		<div class="form-section">
			<h3>Crop Information</h3>
			
			<Input
				bind:value={formData.crop_type}
				label="Crop Type"
				placeholder="e.g., Maize, Soybeans, Wheat"
				error={errors.crop_type}
				oninput={() => clearFieldError('crop_type')}
			/>
		</div>

		<!-- Status Section -->
		<div class="form-section">
			<h3>Status</h3>
			<div class="checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						bind:checked={formData.active}
						class="checkbox-input"
					/>
					<span class="checkbox-text">Active Field</span>
				</label>
				<p class="checkbox-help">
					Inactive fields won't appear in fuel entry and activity forms
				</p>
			</div>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={handleCancel} disabled={loading}>
				{#snippet children()}
					Cancel
				{/snippet}
			</Button>
			
			<Button type="submit" variant="primary" {loading} disabled={loading}>
				{#snippet children()}
					{loading ? 'Saving...' : submitLabel}
				{/snippet}
			</Button>
		</div>
	</form>
</Card>

<style>
	.field-form-card {
		max-width: 600px;
		margin: 0 auto;
	}

	.form-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--gray-200);
	}

	.form-header h2 {
		margin: 0 0 0.5rem 0;
		color: var(--gray-900);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.form-subtitle {
		margin: 0;
		color: var(--gray-600);
		font-size: 0.9rem;
	}

	.field-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--red-50);
		border: 1px solid var(--red-200);
		border-radius: var(--border-radius);
		color: var(--red-700);
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
	}

	.form-section {
		border-top: 1px solid var(--gray-200);
		padding-top: 1.5rem;
	}

	.form-section:first-of-type {
		border-top: none;
		padding-top: 0;
	}

	.form-section h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--gray-800);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.form-row:last-child {
		margin-bottom: 0;
	}

	.form-group {
		position: relative;
		display: flex;
		gap: 0.5rem;
		align-items: end;
	}

	.form-group :global(.input-group) {
		flex: 1;
	}

	.code-generate-btn {
		white-space: nowrap;
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		color: var(--gray-800);
	}

	.checkbox-input {
		width: 1.2rem;
		height: 1.2rem;
		accent-color: var(--primary);
	}

	.checkbox-text {
		font-size: 1rem;
	}

	.checkbox-help {
		margin: 0;
		font-size: 0.875rem;
		color: var(--gray-600);
		margin-left: 1.7rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		border-top: 1px solid var(--gray-200);
		padding-top: 1.5rem;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.field-form-card {
			margin: 0;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.form-group {
			flex-direction: column;
			align-items: stretch;
		}

		.form-actions {
			flex-direction: column-reverse;
		}

		.form-actions :global(.btn) {
			width: 100%;
		}
	}
</style>