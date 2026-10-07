<script lang="ts">
	/**
	 * One horizontal bar split into parts, with an inline legend: the shape of
	 * a total at a glance (claimable vs not, say) without a table.
	 */
	import { formatWholeLitres } from '$lib/utils/formatting';

	export interface Segment {
		label: string;
		value: number;
		tone: 'brand' | 'good' | 'muted' | 'warn' | 'bad';
	}

	interface Props {
		segments: Segment[];
		unit?: string;
	}

	let { segments, unit = 'L' }: Props = $props();

	let total = $derived(segments.reduce((sum, s) => sum + Math.max(0, s.value), 0));
	let shown = $derived(segments.filter((s) => s.value > 0));
</script>

<div class="stacked">
	<div
		class="bar"
		role="img"
		aria-label={shown.map((s) => `${s.label} ${formatWholeLitres(s.value)} ${unit}`).join(', ')}
	>
		{#each shown as s (s.label)}
			<span class="seg {s.tone}" style="flex-grow: {s.value}" title="{s.label}: {formatWholeLitres(s.value)} {unit}"></span>
		{/each}
	</div>
	<ul class="legend">
		{#each segments as s (s.label)}
			<li>
				<i class="dot {s.tone}"></i>
				<span class="k">{s.label}</span>
				<span class="v">{formatWholeLitres(s.value)}</span>
				<span class="p">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.bar {
		display: flex;
		gap: 2px;
		height: 12px;
		border-radius: 3px;
		overflow: hidden;
		background: var(--gray-100);
	}

	.seg {
		flex-basis: 0;
		min-width: 3px;
	}

	.legend {
		list-style: none;
		margin: 0.625rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
	}

	.legend li {
		display: grid;
		grid-template-columns: auto 1fr auto 2.5rem;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 2px;
	}

	.k {
		color: var(--gray-600);
	}

	.v {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.p {
		text-align: right;
		color: var(--gray-400);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.brand {
		background: var(--brand);
	}
	.good {
		background: var(--success);
	}
	.muted {
		background: var(--gray-300);
	}
	.warn {
		background: var(--warning);
	}
	.bad {
		background: var(--error);
	}
</style>
