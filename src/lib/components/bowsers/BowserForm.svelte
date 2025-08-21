<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import bowserStore from '$lib/stores/bowsers';
	import type { Bowser } from '$lib/types';

	interface Props {
		bowser?: Bowser | null;
		loading?: boolean;
	}

	let { bowser = null, loading = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		save: Bowser;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		code: bowser?.code || '',
		name: bowser?.name || '',
		registration: bowser?.registration || '',
		fuel_type: bowser?.fuel_type || 'diesel' as 'diesel' | 'petrol',
		capacity: bowser?.capacity || 0,
		notes: bowser?.notes || '',
		active: bowser?.active ?? true
	});

	// Form validation
	let errors = $state<Record<string, string>>({});

	const fuelTypeOptions = [
		{ value: 'diesel', label: 'Diesel' },
		{ value: 'petrol', label: 'Petrol' }
	];

	function validateForm(): boolean {
		errors = {};

		if (!formData.code.trim()) {
			errors.code = 'Bowser code is required';
		}
		
		if (!formData.name.trim()) {
			errors.name = 'Bowser name is required';
		}
		
		if (!formData.registration.trim()) {
			errors.registration = 'Registration number is required';
		}
		
		if (formData.capacity <= 0) {
			errors.capacity = 'Capacity must be greater than 0';
		}

		if (formData.capacity > 50000) {
			errors.capacity = 'Capacity seems unrealistically high (max 50,000 liters)';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Create bowser object
		const bowserData: Partial<Bowser> = {
			...formData,
			notes: formData.notes.trim() || undefined,
			// Map currentReading and location from existing data if editing
			currentReading: bowser?.currentReading || 0,
			location: bowser?.location
		};

		// If editing existing bowser, include ID
		if (bowser) {
			bowserData.id = bowser.id;
		}

		try {
			let result;
			if (bowser) {
				// Update existing bowser
				result = await bowserStore.updateBowser(bowserData as Bowser);
			} else {
				// Create new bowser
				result = await bowserStore.createBowser(bowserData as Omit<Bowser, 'id' | 'created_at' | 'updated_at'>);
			}

			if (result.success && result.data) {
				dispatch('save', result.data);
			} else {
				// Handle error - show in form
				errors.submit = result.error || 'Failed to save bowser';
			}
		} catch (error) {
			errors.submit = error instanceof Error ? error.message : 'Failed to save bowser';
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

	// Generate bowser code if not provided
	function generateCode() {
		const fuelPrefix = formData.fuel_type === 'diesel' ? 'BD' : 'BP'; // Bowser Diesel / Bowser Petrol
		const timestamp = Date.now().toString().slice(-4);
		formData.code = `${fuelPrefix}${timestamp}`;
		clearFieldError('code');
	}

	const isEditing = $derived(!!bowser);
	const formTitle = $derived(isEditing ? 'Edit Bowser' : 'Add New Bowser');
	const submitLabel = $derived(isEditing ? 'Update Bowser' : 'Create Bowser');
</script>

<Card class="bowser-form-card">
	<div class="form-header">
		<h2>{formTitle}</h2>
		<p class="form-subtitle">
			{isEditing ? 'Update bowser information' : 'Add a new fuel bowser to your fleet'}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="bowser-form">
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
						label="Bowser Code"
						placeholder="e.g., BD001"
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
					bind:value={formData.fuel_type}
					label="Fuel Type"
					options={fuelTypeOptions}
					required
					error={errors.fuel_type}
				/>
			</div>

			<Input
				bind:value={formData.name}
				label="Bowser Name"
				placeholder="e.g., Main Fuel Truck"
				required
				error={errors.name}
				oninput={() => clearFieldError('name')}
			/>

			<Input
				bind:value={formData.registration}
				label="Registration Number"
				placeholder="e.g., ABC123GP"
				required
				error={errors.registration}
				oninput={() => clearFieldError('registration')}
			/>
		</div>

		<!-- Specifications Section -->
		<div class="form-section">
			<h3>Specifications</h3>
			
			<Input
				bind:value={formData.capacity}
				type="number"
				label="Capacity (Liters)"
				placeholder="e.g., 5000"
				min={1}
				max={50000}
				step="1"
				required
				error={errors.capacity}
				oninput={() => clearFieldError('capacity')}
			/>

			<Input
				bind:value={formData.notes}
				label="Notes"
				placeholder="Additional information about this bowser"
				error={errors.notes}
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
					<span class="checkbox-text">Active Bowser</span>
				</label>
				<p class="checkbox-help">
					Inactive bowsers won't appear in fuel entry forms
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
	.bowser-form-card {
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

	.bowser-form {
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
		.bowser-form-card {
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