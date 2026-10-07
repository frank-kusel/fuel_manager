<script lang="ts">
	/**
	 * The tank as a dipstick: the wet length is the book balance, graduated in
	 * 24ths of capacity with a labelled mark every quarter. A faint line marks
	 * the low-stock threshold.
	 */
	import { formatWholeLitres } from '$lib/utils/formatting';
	import { LOW_TANK_PCT, pctFull } from '$lib/utils/tank-balance';

	interface Props {
		litres: number;
		capacity: number;
	}

	let { litres, capacity }: Props = $props();

	let pct = $derived(pctFull(litres, capacity) ?? 0);
	let ticks = $derived(
		Array.from({ length: 25 }, (_, i) => ({
			pct: (i / 24) * 100,
			major: i % 6 === 0,
			litres: Math.round((capacity * i) / 24)
		}))
	);
</script>

<div
	class="gauge"
	role="img"
	aria-label="{Math.round(pct)}% of {formatWholeLitres(capacity)} litres"
>
	<div class="stick">
		<div class="wet" class:low={pct < LOW_TANK_PCT} style="width: {pct}%"></div>
		<div class="low-mark" style="left: {LOW_TANK_PCT}%" title="Low stock: {LOW_TANK_PCT}%"></div>
	</div>
	<div class="grads" aria-hidden="true">
		{#each ticks as t (t.pct)}
			<span class="grad" class:major={t.major} style="left: {t.pct}%">
				{#if t.major}<span class="grad-label">{formatWholeLitres(t.litres)}</span>{/if}
			</span>
		{/each}
	</div>
</div>

<style>
	.gauge {
		position: relative;
		padding-bottom: 1.4rem;
	}

	.stick {
		position: relative;
		height: 14px;
		background: var(--gray-100);
		border: 1px solid var(--gray-300);
		border-radius: 3px;
		overflow: hidden;
	}

	.wet {
		height: 100%;
		background: var(--brand);
		transition: width 0.5s ease;
	}

	.wet.low {
		background: var(--error);
	}

	.low-mark {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 0;
		border-left: 1px dashed rgba(255, 255, 255, 0.7);
		mix-blend-mode: difference;
	}

	.grads {
		position: absolute;
		left: 0;
		right: 0;
		top: 14px;
		height: 1.4rem;
	}

	.grad {
		position: absolute;
		top: 0;
		width: 1px;
		height: 5px;
		background: var(--gray-400);
		transform: translateX(-0.5px);
	}

	.grad.major {
		height: 9px;
		background: var(--gray-700);
	}

	.grad-label {
		position: absolute;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.6875rem;
		font-stretch: var(--figure-stretch);
		color: var(--gray-500);
		white-space: nowrap;
	}

	.grad:first-child .grad-label {
		left: 0;
		transform: none;
	}

	.grad:last-child .grad-label {
		left: auto;
		right: 0;
		transform: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.wet {
			transition: none;
		}
	}
</style>
