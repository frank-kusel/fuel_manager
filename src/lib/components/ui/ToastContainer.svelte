<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

{#if $toast.length}
	<div class="toast-stack" role="status" aria-live="polite">
		{#each $toast as t (t.id)}
			<button class="toast {t.kind}" onclick={() => toast.dismiss(t.id)}>{t.text}</button>
		{/each}
	</div>
{/if}

<style>
	.toast-stack {
		position: fixed;
		bottom: 5.5rem;
		right: 1rem;
		z-index: 1100;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.toast {
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}

	.toast.ok {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--success-dark);
	}

	.toast.err {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}
</style>
