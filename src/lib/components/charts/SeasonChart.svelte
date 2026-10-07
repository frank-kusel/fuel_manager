<script lang="ts">
	/**
	 * The season month by month: this season's litres as solid bars over last
	 * season's as pale ones behind, so each month reads against its own month
	 * a year ago. The current month is hatched — it is not finished.
	 */
	import { formatWholeLitres } from '$lib/utils/formatting';
	import type { SeasonMonth } from '$lib/stores/dashboard-insights';

	interface Props {
		months: SeasonMonth[];
		height?: number;
	}

	let { months, height = 150 }: Props = $props();

	const thisMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
	let max = $derived(Math.max(1, ...months.map((m) => Math.max(m.current ?? 0, m.previous))));
	let selected = $state<number | null>(null);
	let shown = $derived(selected === null ? null : months[selected]);
</script>

<div class="season">
	<div class="bars" style="height: {height}px" role="img" aria-label="Litres per month this season against last season">
		{#each months as m, i (m.key)}
			<button
				class="slot"
				class:on={selected === i}
				onclick={() => (selected = selected === i ? null : i)}
				onmouseenter={() => (selected = i)}
				onmouseleave={() => (selected = null)}
				aria-label="{m.label}: {m.current === null ? 'not yet' : `${formatWholeLitres(m.current)} L`}, last season {formatWholeLitres(m.previous)} L"
			>
				<span class="prev" style="height: {(m.previous / max) * 100}%"></span>
				{#if m.current !== null}
					<span
						class="cur"
						class:partial={m.key === thisMonth}
						style="height: {(m.current / max) * 100}%"
					></span>
				{/if}
			</button>
		{/each}
	</div>
	<div class="labels" aria-hidden="true">
		{#each months as m (m.key)}
			<span class:now={m.key === thisMonth}>{m.label.slice(0, 1)}</span>
		{/each}
	</div>
	<p class="readout">
		{#if shown}
			<strong>{shown.label}</strong>
			{shown.current === null ? 'not yet' : `${formatWholeLitres(shown.current)} L`}
			<span class="ui-muted">· last season {formatWholeLitres(shown.previous)} L</span>
		{:else}
			<span class="key"><i class="k-cur"></i>This season</span>
			<span class="key"><i class="k-prev"></i>Last season</span>
		{/if}
	</p>
</div>

<style>
	.season {
		min-width: 0;
	}

	.bars {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 4px;
		align-items: end;
		border-bottom: 1px solid var(--gray-200);
	}

	.slot {
		position: relative;
		height: 100%;
		border: 0;
		padding: 0;
		background: none;
		cursor: pointer;
	}

	.prev,
	.cur {
		position: absolute;
		bottom: 0;
		border-radius: 2px 2px 0 0;
	}

	.prev {
		left: 0;
		right: 0;
		background: var(--gray-200);
	}

	.cur {
		left: 22%;
		right: 22%;
		background: var(--brand);
	}

	.cur.partial {
		background: repeating-linear-gradient(
			135deg,
			var(--brand) 0 3px,
			var(--brand-tint) 3px 6px
		);
		outline: 1px solid var(--brand);
		outline-offset: -1px;
	}

	.slot.on .prev {
		background: var(--gray-300);
	}

	.labels {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 4px;
		margin-top: 0.25rem;
		font-size: 10px;
		color: var(--gray-400);
		text-align: center;
	}

	.labels .now {
		color: var(--brand);
		font-weight: 700;
	}

	.readout {
		margin: 0.375rem 0 0;
		min-height: 1.25rem;
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.key {
		margin-right: 0.875rem;
		color: var(--gray-500);
	}

	.key i {
		display: inline-block;
		width: 0.625rem;
		height: 0.625rem;
		margin-right: 0.375rem;
		border-radius: 2px;
		vertical-align: -1px;
	}

	.k-cur {
		background: var(--brand);
	}

	.k-prev {
		background: var(--gray-200);
	}
</style>
