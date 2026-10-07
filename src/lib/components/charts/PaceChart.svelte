<script lang="ts">
	/**
	 * This month's running total against last month's, by day of the month.
	 * Above the grey line means burning faster than last month; the dashed tail
	 * projects the month at the current daily rate.
	 */
	import { formatWholeLitres } from '$lib/utils/formatting';

	interface DayPoint {
		date: string;
		litres: number;
	}

	interface Props {
		/** This month, day 1 through today. */
		current: DayPoint[];
		/** All of last month. */
		previous: DayPoint[];
		height?: number;
	}

	let { current, previous, height = 120 }: Props = $props();

	function cumulative(points: DayPoint[]): number[] {
		let total = 0;
		return points.map((p) => (total += p.litres));
	}

	let cur = $derived(cumulative(current));
	let prev = $derived(cumulative(previous));
	let monthDays = $derived.by(() => {
		const last = current.at(-1)?.date;
		if (!last) return 31;
		const [y, m] = last.split('-').map(Number);
		return new Date(y, m, 0).getDate();
	});
	let projected = $derived(
		cur.length > 0 && cur.length < monthDays ? (cur.at(-1)! / cur.length) * monthDays : null
	);

	let width = $state(320);
	const PAD = { top: 8, right: 8, bottom: 16, left: 4 };
	let plotW = $derived(Math.max(1, width - PAD.left - PAD.right));
	let plotH = $derived(height - PAD.top - PAD.bottom);
	let days = $derived(Math.max(monthDays, previous.length, 1));
	let yMax = $derived(Math.max(1, prev.at(-1) ?? 0, projected ?? 0, cur.at(-1) ?? 0) * 1.05);

	const xAt = (day: number) => PAD.left + ((day - 1) / Math.max(1, days - 1)) * plotW;
	const yAt = (litres: number) => PAD.top + (1 - litres / yMax) * plotH;
	const line = (values: number[]) =>
		values.map((v, i) => `${i ? 'L' : 'M'}${xAt(i + 1).toFixed(1)},${yAt(v).toFixed(1)}`).join('');
</script>

<div class="pace" bind:clientWidth={width}>
	<svg
		{width}
		{height}
		role="img"
		aria-label="{formatWholeLitres(cur.at(-1) ?? 0)} litres so far this month against {formatWholeLitres(prev.at(-1) ?? 0)} last month"
	>
		<line class="base" x1={PAD.left} x2={PAD.left + plotW} y1={yAt(0)} y2={yAt(0)} />
		{#if prev.length > 1}
			<path class="prev" d={line(prev)} />
		{/if}
		{#if projected !== null}
			<line
				class="proj"
				x1={xAt(cur.length)}
				y1={yAt(cur.at(-1)!)}
				x2={xAt(monthDays)}
				y2={yAt(projected)}
			/>
		{/if}
		{#if cur.length > 0}
			<path class="cur" d={line(cur)} />
			<circle class="now" cx={xAt(cur.length)} cy={yAt(cur.at(-1)!)} r="3.5" />
		{/if}
		<text class="axis" x={PAD.left} y={height - 3}>1</text>
		<text class="axis end" x={PAD.left + plotW} y={height - 3}>{days}</text>
	</svg>
	<div class="key" aria-hidden="true">
		<span><i class="k-cur"></i>This month</span>
		<span><i class="k-prev"></i>Last month {formatWholeLitres(prev.at(-1) ?? 0)}</span>
		{#if projected !== null}<span><i class="k-proj"></i>≈ {formatWholeLitres(projected)} at this rate</span>{/if}
	</div>
</div>

<style>
	.pace {
		width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	svg {
		display: block;
	}

	.base {
		stroke: var(--gray-200);
	}

	.prev {
		fill: none;
		stroke: var(--gray-300);
		stroke-width: 2;
	}

	.cur {
		fill: none;
		stroke: var(--brand);
		stroke-width: 2.5;
		stroke-linejoin: round;
	}

	.proj {
		stroke: var(--brand);
		stroke-width: 1.5;
		stroke-dasharray: 3 4;
		opacity: 0.6;
	}

	.now {
		fill: var(--brand);
		stroke: var(--white);
		stroke-width: 2;
	}

	.axis {
		font-size: 10px;
		fill: var(--gray-400);
	}

	.axis.end {
		text-anchor: end;
	}

	.key {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.875rem;
		font-size: 0.6875rem;
		color: var(--gray-500);
		margin-top: 0.25rem;
	}

	.key i {
		display: inline-block;
		width: 12px;
		height: 2px;
		margin-right: 0.375rem;
		vertical-align: middle;
	}

	.k-cur {
		background: var(--brand);
	}

	.k-prev {
		background: var(--gray-300);
	}

	.k-proj {
		background: repeating-linear-gradient(90deg, var(--brand) 0 3px, transparent 3px 6px);
	}
</style>
