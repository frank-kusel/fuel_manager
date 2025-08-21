<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import driverStore from '$lib/stores/drivers';
	import type { Driver } from '$lib/types';

	interface Props {
		driver?: Driver | null;
		loading?: boolean;
	}

	let { driver = null, loading = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		save: Driver;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		code: driver?.code || '',
		name: driver?.name || '',
		employeeId: driver?.employeeId || '',
		phone: driver?.phone || '',
		email: driver?.email || '',
		address: driver?.address || '',
		licenseNumber: driver?.licenseNumber || '',
		licenseClass: driver?.licenseClass || '',
		licenseIssueDate: driver?.licenseIssueDate || '',
		licenseExpiry: driver?.licenseExpiry || '',
		emergencyContact: driver?.emergencyContact || '',
		emergencyPhone: driver?.emergencyPhone || '',
		dateOfBirth: driver?.dateOfBirth || '',
		active: driver?.active ?? true
	});

	// Form validation
	let errors = $state<Record<string, string>>({});

	const licenseClassOptions = [
		{ value: '', label: 'No License' },
		{ value: 'A', label: 'Class A (Motorcycles)' },
		{ value: 'B', label: 'Class B (Light Motor Vehicles)' },
		{ value: 'C', label: 'Class C (Heavy Motor Vehicles)' },
		{ value: 'EB', label: 'Class EB (Light Motor Vehicle + Trailer)' },
		{ value: 'EC', label: 'Class EC (Heavy Motor Vehicle + Trailer)' }
	];

	function validateForm(): boolean {
		errors = {};

		if (!formData.code.trim()) {
			errors.code = 'Driver code is required';
		}
		
		if (!formData.name.trim()) {
			errors.name = 'Driver name is required';
		}

		if (formData.email && !isValidEmail(formData.email)) {
			errors.email = 'Please enter a valid email address';
		}

		if (formData.phone && !isValidPhone(formData.phone)) {
			errors.phone = 'Please enter a valid phone number';
		}

		if (formData.licenseExpiry && formData.licenseIssueDate) {
			const issueDate = new Date(formData.licenseIssueDate);
			const expiryDate = new Date(formData.licenseExpiry);
			if (expiryDate <= issueDate) {
				errors.licenseExpiry = 'Expiry date must be after issue date';
			}
		}

		if (formData.licenseExpiry && !formData.licenseNumber) {
			errors.licenseExpiry = 'License number is required when expiry date is set';
		}

		if (formData.licenseNumber && !formData.licenseExpiry) {
			errors.licenseNumber = 'Expiry date is required when license number is set';
		}

		if (formData.dateOfBirth) {
			const birthDate = new Date(formData.dateOfBirth);
			const today = new Date();
			const age = today.getFullYear() - birthDate.getFullYear();
			if (age < 16 || age > 80) {
				errors.dateOfBirth = 'Driver must be between 16 and 80 years old';
			}
		}

		return Object.keys(errors).length === 0;
	}

	function isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function isValidPhone(phone: string): boolean {
		const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
		return phoneRegex.test(phone);
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Create driver object
		const driverData: Partial<Driver> = {
			...formData,
			employeeId: formData.employeeId.trim() || undefined,
			phone: formData.phone.trim() || undefined,
			email: formData.email.trim() || undefined,
			address: formData.address.trim() || undefined,
			licenseNumber: formData.licenseNumber.trim() || undefined,
			licenseClass: formData.licenseClass.trim() || undefined,
			licenseIssueDate: formData.licenseIssueDate || undefined,
			licenseExpiry: formData.licenseExpiry || undefined,
			emergencyContact: formData.emergencyContact.trim() || undefined,
			emergencyPhone: formData.emergencyPhone.trim() || undefined,
			dateOfBirth: formData.dateOfBirth || undefined
		};

		// If editing existing driver, include ID
		if (driver) {
			driverData.id = driver.id;
		}

		try {
			let result;
			if (driver) {
				// Update existing driver
				result = await driverStore.updateDriver(driverData as Driver);
			} else {
				// Create new driver
				result = await driverStore.createDriver(driverData as Omit<Driver, 'id' | 'created_at' | 'updated_at'>);
			}

			if (result.success && result.data) {
				dispatch('save', result.data);
			} else {
				// Handle error - show in form
				errors.submit = result.error || 'Failed to save driver';
			}
		} catch (error) {
			errors.submit = error instanceof Error ? error.message : 'Failed to save driver';
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

	// Generate driver code based on name
	function generateCode() {
		const nameParts = formData.name.trim().split(' ').filter(p => p.length > 0);
		let codeBase = '';
		
		if (nameParts.length >= 2) {
			// Use first letter of first name + first 3 letters of last name
			codeBase = (nameParts[0][0] + nameParts[nameParts.length - 1].substring(0, 3)).toUpperCase();
		} else if (nameParts.length === 1) {
			// Use first 4 letters of single name
			codeBase = nameParts[0].substring(0, 4).toUpperCase();
		} else {
			codeBase = 'DRV';
		}
		
		const timestamp = Date.now().toString().slice(-3);
		formData.code = `${codeBase}${timestamp}`;
		clearFieldError('code');
	}

	const isEditing = $derived(!!driver);
	const formTitle = $derived(isEditing ? 'Edit Driver' : 'Add New Driver');
	const submitLabel = $derived(isEditing ? 'Update Driver' : 'Create Driver');
</script>

<Card class="driver-form-card">
	<div class="form-header">
		<h2>{formTitle}</h2>
		<p class="form-subtitle">
			{isEditing ? 'Update driver information' : 'Add a new driver to your team'}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="driver-form">
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
						label="Driver Code"
						placeholder="e.g., JDOE123"
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
						disabled={!formData.name.trim()}
					>
						{#snippet children()}
							Generate
						{/snippet}
					</Button>
				</div>
				
				<Input
					bind:value={formData.employeeId}
					label="Employee ID"
					placeholder="e.g., EMP001"
					error={errors.employeeId}
					oninput={() => clearFieldError('employeeId')}
				/>
			</div>

			<Input
				bind:value={formData.name}
				label="Full Name"
				placeholder="e.g., John Doe"
				required
				error={errors.name}
				oninput={() => clearFieldError('name')}
			/>

			<div class="form-row">
				<Input
					bind:value={formData.phone}
					type="tel"
					label="Phone Number"
					placeholder="e.g., +27 12 345 6789"
					error={errors.phone}
					oninput={() => clearFieldError('phone')}
				/>
				
				<Input
					bind:value={formData.email}
					type="email"
					label="Email Address"
					placeholder="e.g., john.doe@farm.com"
					error={errors.email}
					oninput={() => clearFieldError('email')}
				/>
			</div>

			<Input
				bind:value={formData.address}
				label="Address"
				placeholder="Physical address"
				error={errors.address}
			/>

			<Input
				bind:value={formData.dateOfBirth}
				type="date"
				label="Date of Birth"
				error={errors.dateOfBirth}
				oninput={() => clearFieldError('dateOfBirth')}
			/>
		</div>

		<!-- License Information Section -->
		<div class="form-section">
			<h3>License Information</h3>
			
			<div class="form-row">
				<Input
					bind:value={formData.licenseNumber}
					label="License Number"
					placeholder="e.g., 12345678901234"
					error={errors.licenseNumber}
					oninput={() => clearFieldError('licenseNumber')}
				/>
				
				<Select
					bind:value={formData.licenseClass}
					label="License Class"
					options={licenseClassOptions}
					error={errors.licenseClass}
				/>
			</div>

			{#if formData.licenseNumber}
				<div class="form-row">
					<Input
						bind:value={formData.licenseIssueDate}
						type="date"
						label="Issue Date"
						error={errors.licenseIssueDate}
						oninput={() => clearFieldError('licenseIssueDate')}
					/>
					
					<Input
						bind:value={formData.licenseExpiry}
						type="date"
						label="Expiry Date"
						required
						error={errors.licenseExpiry}
						oninput={() => clearFieldError('licenseExpiry')}
					/>
				</div>
			{/if}
		</div>

		<!-- Emergency Contact Section -->
		<div class="form-section">
			<h3>Emergency Contact</h3>
			
			<div class="form-row">
				<Input
					bind:value={formData.emergencyContact}
					label="Contact Name"
					placeholder="e.g., Jane Doe"
					error={errors.emergencyContact}
				/>
				
				<Input
					bind:value={formData.emergencyPhone}
					type="tel"
					label="Contact Phone"
					placeholder="e.g., +27 12 345 6789"
					error={errors.emergencyPhone}
				/>
			</div>
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
					<span class="checkbox-text">Active Driver</span>
				</label>
				<p class="checkbox-help">
					Inactive drivers won't appear in vehicle assignment lists
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
	.driver-form-card {
		max-width: 700px;
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

	.driver-form {
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
		.driver-form-card {
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