<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		padding?: 'none' | 'small' | 'medium' | 'large';
		shadow?: boolean;
		hover?: boolean;
		children: Snippet;
	}

	let {
		class: className = '',
		padding = 'medium',
		shadow = true,
		hover = false,
		children
	}: Props = $props();

	const classes = [
		'card',
		`card-padding-${padding}`,
		shadow && 'card-shadow',
		hover && 'card-hover',
		className
	].filter(Boolean).join(' ');
</script>

<div class={classes}>
	{@render children()}
</div>

<style>
	.card {
		background: white;
		border-radius: var(--border-radius);
		border: 1px solid var(--gray-200);
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.card-shadow {
		box-shadow: var(--shadow);
	}

	.card-hover:hover {
		box-shadow: var(--shadow-lg);
		transform: translateY(-2px);
		cursor: pointer;
	}

	.card-padding-none {
		padding: 0;
	}

	.card-padding-small {
		padding: 0.75rem;
	}

	.card-padding-medium {
		padding: 1rem;
	}

	.card-padding-large {
		padding: 1.5rem;
	}

	/* Dark mode support */
	:global([data-theme="dark"]) .card {
		background: var(--gray-800);
		border-color: var(--gray-700);
	}
</style>