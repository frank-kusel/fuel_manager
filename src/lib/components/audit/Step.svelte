<script lang="ts">
	/**
	 * One step of the month-end sequence. Collapsed, it is a single line: its
	 * state, its name and what it comes to. The body stays mounted when
	 * collapsed, so a half-typed close note or classifier figure survives.
	 */
	import type { Snippet } from 'svelte';
	import type { StepState } from '$lib/utils/audit-readiness';

	interface Props {
		n: number;
		id: string;
		title: string;
		state: StepState;
		/** One line: the result when done, the first problem when not. */
		summary: string;
		open: boolean;
		ontoggle: () => void;
		children: Snippet;
	}

	let { n, id, title, state, summary, open, ontoggle, children }: Props = $props();
</script>

<section class="step {state}" class:open id="step-{id}">
	<button class="head" onclick={ontoggle} aria-expanded={open} aria-controls="step-body-{id}">
		<span class="mark" aria-hidden="true">
			{#if state === 'done'}✓{:else if state === 'warn'}!{:else}{n}{/if}
		</span>
		<span class="title">{title}</span>
		<span class="summary">{summary}</span>
		<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
	</button>
	<div class="body" id="step-body-{id}" hidden={!open}>
		{@render children()}
	</div>
</section>

<style>
	.step {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		min-width: 0;
	}

	.step.open {
		border-color: var(--gray-300);
		box-shadow: var(--shadow-md);
	}

	.head {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1rem;
		border: 0;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
		color: inherit;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 50%;
		border: 1.5px solid var(--gray-300);
		color: var(--gray-500);
		font-size: var(--text-xs);
		font-weight: 800;
	}

	.todo .mark {
		border-color: var(--brand);
		color: var(--brand);
	}

	.ready .mark {
		border-color: var(--success);
		color: var(--success);
	}

	.done .mark {
		border-color: var(--success);
		background: var(--success);
		color: var(--white);
	}

	.warn .mark {
		border-color: var(--warning);
		background: var(--warning);
		color: var(--white);
	}

	.title {
		font-weight: 700;
		font-size: var(--text-base);
	}

	.summary {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-sm);
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
	}

	.todo .summary {
		color: var(--brand);
	}

	.warn .summary {
		color: #8a4b08;
	}

	.chev {
		width: 1rem;
		height: 1rem;
		color: var(--gray-400);
		transition: transform 0.15s ease;
	}

	.open .chev {
		transform: rotate(180deg);
	}

	.body {
		padding: 0 1rem 1rem;
	}

	@media (min-width: 640px) {
		.body {
			padding-left: 3.375rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chev {
			transition: none;
		}
	}
</style>
