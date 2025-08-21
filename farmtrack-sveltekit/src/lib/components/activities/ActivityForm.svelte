<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import activityStore from '$lib/stores/activities';
	import type { Activity, ActivityCategory } from '$lib/types';

	interface Props {
		activity?: Activity | null;
		loading?: boolean;
	}

	let { activity = null, loading = false }: Props = $props();
	
	const dispatch = createEventDispatcher<{
		save: Activity;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		code: activity?.code || '',
		name: activity?.name || '',
		category: activity?.category || 'other' as ActivityCategory,
		description: activity?.description || '',
		active: activity?.active ?? true
	});

	// Form validation
	let errors = $state<Record<string, string>>({});

	const categoryOptions = [
		{ value: 'planting', label: 'Planting' },
		{ value: 'harvesting', label: 'Harvesting' },
		{ value: 'spraying', label: 'Spraying' },
		{ value: 'fertilizing', label: 'Fertilizing' },
		{ value: 'maintenance', label: 'Maintenance' },
		{ value: 'other', label: 'Other' }
	];

	function validateForm(): boolean {
		errors = {};

		if (!formData.code.trim()) {
			errors.code = 'Activity code is required';
		}
		
		if (!formData.name.trim()) {
			errors.name = 'Activity name is required';
		}

		if (formData.name.length > 100) {
			errors.name = 'Activity name must be less than 100 characters';
		}

		if (formData.description && formData.description.length > 500) {
			errors.description = 'Description must be less than 500 characters';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Create activity object
		const activityData: Partial<Activity> = {
			...formData,
			description: formData.description.trim() || undefined
		};

		// If editing existing activity, include ID
		if (activity) {
			activityData.id = activity.id;
		}

		try {
			let result;
			if (activity) {
				// Update existing activity
				result = await activityStore.updateActivity(activityData as Activity);
			} else {
				// Create new activity
				result = await activityStore.createActivity(activityData as Omit<Activity, 'id' | 'created_at' | 'updated_at'>);
			}

			if (result.success && result.data) {
				dispatch('save', result.data);
			} else {
				// Handle error - show in form
				errors.submit = result.error || 'Failed to save activity';
			}
		} catch (error) {
			errors.submit = error instanceof Error ? error.message : 'Failed to save activity';
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

	// Generate activity code based on category
	function generateCode() {
		const categoryPrefixes = {
			planting: 'PL',
			harvesting: 'HA',
			spraying: 'SP',
			fertilizing: 'FE',
			maintenance: 'MA',
			other: 'OT'
		};
		
		const prefix = categoryPrefixes[formData.category];
		const timestamp = Date.now().toString().slice(-4);
		formData.code = `${prefix}${timestamp}`;
		clearFieldError('code');
	}

	const isEditing = $derived(!!activity);
	const formTitle = $derived(isEditing ? 'Edit Activity' : 'Add New Activity');
	const submitLabel = $derived(isEditing ? 'Update Activity' : 'Create Activity');
</script>

<Card class="activity-form-card">
	<div class="form-header">
		<h2>{formTitle}</h2>
		<p class="form-subtitle">
			{isEditing ? 'Update activity information' : 'Add a new farming activity to your operation'}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="activity-form">
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
						label="Activity Code"
						placeholder="e.g., PL001"
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
					bind:value={formData.category}
					label="Category"
					options={categoryOptions}
					required
					error={errors.category}
				/>
			</div>

			<Input
				bind:value={formData.name}
				label="Activity Name"
				placeholder="e.g., Plant Corn Seeds"
				required
				error={errors.name}
				oninput={() => clearFieldError('name')}
			/>

			<div class="textarea-group">
				<label for="description" class="textarea-label">Description</label>
				<textarea
					id="description"
					bind:value={formData.description}
					placeholder="Describe this activity (optional)"
					rows="4"
					class="textarea"
					class:error={errors.description}
					on:input={() => clearFieldError('description')}
				></textarea>
				{#if errors.description}
					<div class="error-message">{errors.description}</div>
				{/if}
				<div class="char-count">
					{formData.description.length}/500 characters
				</div>
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
					<span class="checkbox-text">Active Activity</span>
				</label>
				<p class="checkbox-help">
					Inactive activities won't appear in fuel entry forms
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
	.activity-form-card {
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

	.activity-form {
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

	.textarea-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.textarea-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--border-radius);
		font-size: 1rem;
		line-height: 1.5;
		transition: all 0.2s ease;
		resize: vertical;
		min-height: 100px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.textarea:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.textarea.error {
		border-color: var(--error);
	}

	.textarea.error:focus {
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}

	.char-count {
		font-size: 0.75rem;
		color: var(--gray-500);
		text-align: right;
	}

	.error-message {
		font-size: 0.875rem;
		color: var(--error);
		margin-top: -0.25rem;
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
		.activity-form-card {
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