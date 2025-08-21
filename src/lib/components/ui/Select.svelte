<script lang="ts">
	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		options: Option[];
		value?: string | number;
		placeholder?: string;
		label?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		id?: string;
		name?: string;
	}

	let {
		options,
		value = $bindable(''),
		placeholder = 'Select an option...',
		label,
		error,
		required = false,
		disabled = false,
		class: className = '',
		id,
		name
	}: Props = $props();

	const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
	const classes = [
		'select',
		error && 'select-error',
		disabled && 'select-disabled',
		className
	].filter(Boolean).join(' ');
</script>

<div class="select-group">
	{#if label}
		<label for={selectId} class="select-label">
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}
	
	<select
		id={selectId}
		{name}
		bind:value
		{required}
		{disabled}
		class={classes}
		aria-invalid={!!error}
		aria-describedby={error ? `${selectId}-error` : undefined}
	>
		{#if placeholder}
			<option value="" disabled selected={!value}>
				{placeholder}
			</option>
		{/if}
		
		{#each options as option}
			<option 
				value={option.value} 
				disabled={option.disabled}
			>
				{option.label}
			</option>
		{/each}
	</select>
	
	{#if error}
		<div id="{selectId}-error" class="select-error-message">
			{error}
		</div>
	{/if}
</div>

<style>
	.select-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.select-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.required {
		color: var(--error);
	}

	.select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--border-radius);
		font-size: 1rem;
		line-height: 1.5;
		transition: all 0.2s ease;
		background: white;
		color: var(--gray-900);
		cursor: pointer;
		box-sizing: border-box;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 0.75rem;
		padding-right: 2.5rem;
	}

	.select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.select:hover:not(:disabled) {
		border-color: var(--gray-400);
	}

	.select-error {
		border-color: var(--error);
	}

	.select-error:focus {
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}

	.select-disabled {
		background: var(--gray-100);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.select-error-message {
		font-size: 0.875rem;
		color: var(--error);
		margin-top: -0.25rem;
	}

	/* Dark mode support */
	:global([data-theme="dark"]) .select {
		background: var(--gray-800);
		border-color: var(--gray-600);
		color: var(--gray-100);
		background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23ccc' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
	}

	:global([data-theme="dark"]) .select:focus {
		border-color: var(--primary);
	}

	:global([data-theme="dark"]) .select-disabled {
		background: var(--gray-700);
		color: var(--gray-400);
	}

	:global([data-theme="dark"]) .select-label {
		color: var(--gray-300);
	}
</style>