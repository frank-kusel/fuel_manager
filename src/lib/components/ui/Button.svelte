<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
		size?: 'small' | 'medium' | 'large';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		target?: string;
		class?: string;
		onclick?: () => void;
		fullWidth?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'medium',
		disabled = false,
		loading = false,
		type = 'button',
		href,
		target,
		class: className = '',
		onclick,
		fullWidth = false,
		children
	}: Props = $props();

	const baseClasses = $derived([
		'btn',
		`btn-${variant}`,
		`btn-${size}`,
		fullWidth && 'btn-full-width',
		className
	].filter(Boolean).join(' '));

	const finalDisabled = $derived(disabled || loading);
</script>

{#if href}
	<a 
		{href}
		{target}
		class={baseClasses}
		class:disabled={finalDisabled}
		role="button"
		tabindex={finalDisabled ? -1 : 0}
	>
		{#if loading}
			<div class="loading-spinner"></div>
		{/if}
		{@render children()}
	</a>
{:else}
	<button
		{type}
		class={baseClasses}
		disabled={finalDisabled}
		onclick={onclick}
	>
		{#if loading}
			<div class="loading-spinner"></div>
		{/if}
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid transparent;
		border-radius: var(--border-radius);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
		background: transparent;
		color: inherit;
		white-space: nowrap;
		user-select: none;
	}

	.btn:focus {
		outline: none;
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.btn:disabled,
	.btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* Variants */
	.btn-primary {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-dark);
		border-color: var(--primary-dark);
	}

	.btn-secondary {
		background: var(--gray-100);
		color: var(--gray-700);
		border-color: var(--gray-300);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--gray-200);
		border-color: var(--gray-400);
	}

	.btn-success {
		background: var(--success);
		color: white;
		border-color: var(--success);
	}

	.btn-success:hover:not(:disabled) {
		background: #15803d;
		border-color: #15803d;
	}

	.btn-warning {
		background: var(--warning);
		color: white;
		border-color: var(--warning);
	}

	.btn-warning:hover:not(:disabled) {
		background: #d97706;
		border-color: #d97706;
	}

	.btn-error {
		background: var(--error);
		color: white;
		border-color: var(--error);
	}

	.btn-error:hover:not(:disabled) {
		background: #b91c1c;
		border-color: #b91c1c;
	}

	/* Sizes */
	.btn-small {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
	}

	.btn-medium {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-large {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	/* Full width */
	.btn-full-width {
		width: 100%;
	}

	/* Loading spinner */
	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>