<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import vehicleStore from '$lib/stores/vehicles';
	import type { Vehicle, VehicleType } from '$lib/types';

	interface Props {
		vehicle?: Vehicle | null;
		loading?: boolean;
	}

	let { vehicle = null, loading = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		save: Vehicle;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		code: vehicle?.code || '',
		name: vehicle?.name || '',
		type: vehicle?.type || 'tractor' as VehicleType,
		registration: vehicle?.registration || '',
		odometer: vehicle?.odometer || 0,
		odometerUnit: vehicle?.odometerUnit || 'km' as 'km' | 'hours',
		fuelType: vehicle?.fuelType || 'diesel' as 'diesel' | 'petrol',
		make: vehicle?.make || '',
		model: vehicle?.model || '',
		year: vehicle?.year || new Date().getFullYear(),
		active: vehicle?.active ?? true
	});

	// Form validation
	let errors = $state<Record<string, string>>({});

	const vehicleTypeOptions = [
		{ value: 'tractor', label: 'Tractor' },
		{ value: 'bakkie', label: 'Bakkie' },
		{ value: 'truck', label: 'Truck' },
		{ value: 'loader', label: 'Loader' },
		{ value: 'harvester', label: 'Harvester' },
		{ value: 'sprayer', label: 'Sprayer' },
		{ value: 'other', label: 'Other' }
	];

	const odometerUnitOptions = [
		{ value: 'km', label: 'Kilometers' },
		{ value: 'hours', label: 'Hours' }
	];

	const fuelTypeOptions = [
		{ value: 'diesel', label: 'Diesel' },
		{ value: 'petrol', label: 'Petrol' }
	];

	function validateForm(): boolean {
		errors = {};

		if (!formData.code.trim()) {
			errors.code = 'Vehicle code is required';
		}
		
		if (!formData.name.trim()) {
			errors.name = 'Vehicle name is required';
		}
		
		if (!formData.registration.trim()) {
			errors.registration = 'Registration number is required';
		}
		
		if (formData.odometer < 0) {
			errors.odometer = 'Odometer reading cannot be negative';
		}
		
		if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 2)) {
			errors.year = 'Please enter a valid year';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Create vehicle object
		const vehicleData: Partial<Vehicle> = {
			...formData,
			make: formData.make.trim() || undefined,
			model: formData.model.trim() || undefined,
			year: formData.year || undefined
		};

		// If editing existing vehicle, include ID
		if (vehicle) {
			vehicleData.id = vehicle.id;
		}

		try {
			let result;
			if (vehicle) {
				// Update existing vehicle
				result = await vehicleStore.updateVehicle(vehicleData as Vehicle);
			} else {
				// Create new vehicle
				result = await vehicleStore.createVehicle(vehicleData as Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>);
			}

			if (result.success && result.data) {
				dispatch('save', result.data);
			} else {
				// Handle error - show in form
				errors.submit = result.error || 'Failed to save vehicle';
			}
		} catch (error) {
			errors.submit = error instanceof Error ? error.message : 'Failed to save vehicle';
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

	// Generate vehicle code based on type
	function generateCode() {
		const typePrefix = {
			tractor: 'TR',
			bakkie: 'BK',
			truck: 'TK',
			loader: 'LD',
			harvester: 'HV',
			sprayer: 'SP',
			other: 'VH'
		}[formData.type] || 'VH';
		
		const timestamp = Date.now().toString().slice(-4);
		formData.code = `${typePrefix}${timestamp}`;
		clearFieldError('code');
	}

	const isEditing = $derived(!!vehicle);
	const formTitle = $derived(isEditing ? 'Edit Vehicle' : 'Add New Vehicle');
	const submitLabel = $derived(isEditing ? 'Update Vehicle' : 'Create Vehicle');
</script>

<Card class="vehicle-form-card">
	<div class="form-header">
		<h2>{formTitle}</h2>
		<p class="form-subtitle">
			{isEditing ? 'Update vehicle information' : 'Add a new vehicle to your fleet'}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="vehicle-form">
		{#if errors.submit}
			<div class="form-error">
				<span class="error-icon">⚠️</span>
				{errors.submit}
			</div>
		{/if}

		<div class="form-row">
			<div class="form-group">
				<Input
					bind:value={formData.code}
					label="Vehicle Code"
					placeholder="e.g., TR001"
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
				label="Vehicle Type"
				options={vehicleTypeOptions}
				required
				error={errors.type}
			/>
		</div>

		<Input
			bind:value={formData.name}
			label="Vehicle Name"
			placeholder="e.g., John Deere 6120"
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

		<div class="form-row">
			<Input
				bind:value={formData.odometer}
				type="number"
				label="Current Odometer Reading"
				min={0}
				step="0.1"
				required
				error={errors.odometer}
				oninput={() => clearFieldError('odometer')}
			/>
			
			<Select
				bind:value={formData.odometerUnit}
				label="Odometer Unit"
				options={odometerUnitOptions}
				required
			/>
		</div>

		<Select
			bind:value={formData.fuelType}
			label="Fuel Type"
			options={fuelTypeOptions}
			required
		/>

		<div class="form-section">
			<h3>Optional Information</h3>
			
			<div class="form-row">
				<Input
					bind:value={formData.make}
					label="Make"
					placeholder="e.g., John Deere"
					error={errors.make}
				/>
				
				<Input
					bind:value={formData.model}
					label="Model"
					placeholder="e.g., 6120"
					error={errors.model}
				/>
			</div>

			<Input
				bind:value={formData.year}
				type="number"
				label="Year"
				min={1900}
				max={new Date().getFullYear() + 2}
				placeholder={new Date().getFullYear().toString()}
				error={errors.year}
				oninput={() => clearFieldError('year')}
			/>
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
	.vehicle-form-card {
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

	.vehicle-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
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

	.form-section {
		border-top: 1px solid var(--gray-200);
		padding-top: 1.5rem;
	}

	.form-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--gray-800);
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
		.vehicle-form-card {
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