<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
		value?: string | number;
		placeholder?: string;
		label?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		min?: number;
		max?: number;
		step?: number;
		class?: string;
		id?: string;
		name?: string;
		autocomplete?: string;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder,
		label,
		error,
		required = false,
		disabled = false,
		readonly = false,
		min,
		max,
		step,
		class: className = '',
		id,
		name,
		autocomplete
	}: Props = $props();

	const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
	const classes = [
		'input',
		error && 'input-error',
		disabled && 'input-disabled',
		readonly && 'input-readonly',
		className
	].filter(Boolean).join(' ');
</script>

<div class="input-group">
	{#if label}
		<label for={inputId} class="input-label">
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}
	
	<input
		{type}
		id={inputId}
		{name}
		bind:value
		{placeholder}
		{required}
		{disabled}
		{readonly}
		{min}
		{max}
		{step}
		{autocomplete}
		class={classes}
		aria-invalid={!!error}
		aria-describedby={error ? `${inputId}-error` : undefined}
	/>
	
	{#if error}
		<div id="{inputId}-error" class="input-error-message">
			{error}
		</div>
	{/if}
</div>

<style>
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.input-label {
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

	.input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--border-radius);
		font-size: var(--text-base);
		line-height: 1.5;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		background: white;
		color: var(--gray-900);
		box-sizing: border-box;
	}

	.input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: var(--focus-ring);
	}

	.input:hover:not(:disabled):not(:readonly) {
		border-color: var(--gray-400);
	}

	.input-error {
		border-color: var(--error);
	}

	.input-error:focus {
		box-shadow: var(--focus-ring-error);
	}

	.input-disabled {
		background: var(--gray-100);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.input-readonly {
		background: var(--gray-50);
		cursor: default;
	}

	.input-error-message {
		font-size: 0.875rem;
		color: var(--error);
		margin-top: -0.25rem;
	}

	/* Dark mode support */
	:global([data-theme="dark"]) .input {
		background: var(--gray-800);
		border-color: var(--gray-600);
		color: var(--gray-100);
	}

	:global([data-theme="dark"]) .input:focus {
		border-color: var(--primary);
	}

	:global([data-theme="dark"]) .input-disabled {
		background: var(--gray-700);
		color: var(--gray-400);
	}

	:global([data-theme="dark"]) .input-readonly {
		background: var(--gray-750);
	}

	:global([data-theme="dark"]) .input-label {
		color: var(--gray-300);
	}
</style>