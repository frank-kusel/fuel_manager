<script lang="ts">
	/**
	 * The book balance day by day since the anchor: a falling line as fuel is
	 * dispensed, a step up at each delivery, and any dips plotted against it —
	 * each with a ±tolerance whisker, so whether the book and the dipstick agree
	 * is a glance, not a sentence.
	 */
	import { fmtDayMonth } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import { LOW_TANK_PCT, type BalancePoint } from '$lib/utils/tank-balance';

	interface Props {
		series: BalancePoint[];
		dips?: { date: string; litres: number }[];
		capacity?: number | null;
		toleranceL?: number;
		height?: number;
	}

	let { series, dips = [], capacity = null, toleranceL = 200, height = 168 }: Props = $props();

	let width = $state(600);
	const PAD = { top: 10, right: 44, bottom: 22, left: 4 };

	let plotW = $derived(Math.max(1, width - PAD.left - PAD.right));
	let plotH = $derived(height - PAD.top - PAD.bottom);

	let byDate = $derived(new Map(series.map((p, i) => [p.date, i])));
	let visibleDips = $derived(dips.filter((d) => byDate.has(d.date)));

	function niceCeil(value: number): number {
		if (value <= 0) return 1000;
		const step = 10 ** Math.floor(Math.log10(value));
		return Math.ceil(value / (step / 2)) * (step / 2);
	}

	let yMax = $derived(
		niceCeil(
			Math.max(
				...series.map((p) => p.litres),
				...visibleDips.map((d) => d.litres + toleranceL),
				1
			) * 1.08
		)
	);
	let yMin = $derived(Math.min(0, ...series.map((p) => p.litres)));

	const xAt = (i: number) =>
		PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
	const yAt = (litres: number) => PAD.top + (1 - (litres - yMin) / (yMax - yMin)) * plotH;

	let linePath = $derived(
		series.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.litres).toFixed(1)}`).join('')
	);
	let areaPath = $derived(
		series.length
			? `${linePath}L${xAt(series.length - 1).toFixed(1)},${yAt(Math.max(0, yMin)).toFixed(1)}L${xAt(0).toFixed(1)},${yAt(Math.max(0, yMin)).toFixed(1)}Z`
			: ''
	);

	let gridValues = $derived([0, yMax / 2, yMax]);
	let lowLine = $derived(capacity ? (capacity * LOW_TANK_PCT) / 100 : null);

	/** Month starts inside the window, labelled on the axis. */
	let monthTicks = $derived(
		series
			.map((p, i) => ({ i, date: p.date }))
			.filter(({ date }, idx) => idx > 0 && date.endsWith('-01'))
	);

	let hover = $state<number | null>(null);

	function onpointermove(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const x = event.clientX - rect.left - PAD.left;
		const i = Math.round((x / plotW) * (series.length - 1));
		hover = Math.max(0, Math.min(series.length - 1, i));
	}

	let hovered = $derived(hover === null ? null : series[hover]);
	let hoveredDip = $derived(hovered ? visibleDips.find((d) => d.date === hovered.date) : undefined);

	let summary = $derived(
		series.length
			? `Book balance from ${formatWholeLitres(series[0].litres)} litres on ${fmtDayMonth(series[0].date)} to ${formatWholeLitres(series[series.length - 1].litres)} litres on ${fmtDayMonth(series[series.length - 1].date)}`
			: 'No balance history'
	);
</script>

<div class="chart" bind:clientWidth={width}>
	{#if series.length > 1}
		<svg
			{width}
			{height}
			role="img"
			aria-label={summary}
			onpointermove={onpointermove}
			onpointerleave={() => (hover = null)}
		>
			{#each gridValues as g (g)}
				<line class="grid" x1={PAD.left} x2={PAD.left + plotW} y1={yAt(g)} y2={yAt(g)} />
				<text class="axis" x={PAD.left + plotW + 6} y={yAt(g) + 3.5}>{formatWholeLitres(g)}</text>
			{/each}

			{#if lowLine !== null && lowLine < yMax}
				<line class="low" x1={PAD.left} x2={PAD.left + plotW} y1={yAt(lowLine)} y2={yAt(lowLine)} />
			{/if}

			<path class="area" d={areaPath} />
			<path class="line" d={linePath} />

			{#each series as p, i (p.date)}
				{#if p.delivered > 0}
					<path
						class="delivery"
						d="M{xAt(i)},{yAt(p.litres) - 9}l-4,6h8z"
						aria-hidden="true"
					/>
				{/if}
			{/each}

			{#each visibleDips as d (d.date)}
				{@const i = byDate.get(d.date)!}
				<line
					class="whisker"
					x1={xAt(i)}
					x2={xAt(i)}
					y1={yAt(d.litres + toleranceL)}
					y2={yAt(d.litres - toleranceL)}
				/>
				<circle class="dip" cx={xAt(i)} cy={yAt(d.litres)} r="4" />
			{/each}

			<text class="axis" x={PAD.left} y={height - 6}>{fmtDayMonth(series[0].date)}</text>
			{#each monthTicks as t (t.date)}
				<line class="tick" x1={xAt(t.i)} x2={xAt(t.i)} y1={PAD.top + plotH} y2={PAD.top + plotH + 4} />
				{#if xAt(t.i) > PAD.left + 48 && xAt(t.i) < PAD.left + plotW - 56}
					<text class="axis mid" x={xAt(t.i)} y={height - 6}>{fmtDayMonth(t.date)}</text>
				{/if}
			{/each}
			<text class="axis end" x={PAD.left + plotW} y={height - 6}
				>{fmtDayMonth(series[series.length - 1].date)}</text
			>

			{#if hover !== null && hovered}
				<line class="cross" x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + plotH} />
				<circle class="focus" cx={xAt(hover)} cy={yAt(hovered.litres)} r="3.5" />
			{/if}
		</svg>

		{#if hovered && hover !== null}
			<div
				class="tip"
				style="left: {Math.min(Math.max(xAt(hover), 70), width - 70)}px"
				aria-hidden="true"
			>
				<strong>{fmtDayMonth(hovered.date)}</strong>
				<span>{formatWholeLitres(hovered.litres)} L book</span>
				{#if hovered.delivered > 0}<span class="in">+{formatWholeLitres(hovered.delivered)} delivered</span>{/if}
				{#if hovered.dispensed > 0}<span>−{formatWholeLitres(hovered.dispensed)} dispensed</span>{/if}
				{#if hoveredDip}
					<span class="dipline">
						Dip {formatWholeLitres(hoveredDip.litres)} · gap {formatSigned(hovered.litres - hoveredDip.litres)}
					</span>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="empty">Not enough history yet.</p>
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		touch-action: pan-y;
	}

	.grid {
		stroke: var(--gray-100);
		stroke-width: 1;
	}

	.low {
		stroke: var(--error);
		stroke-opacity: 0.35;
		stroke-dasharray: 3 3;
	}

	.area {
		fill: var(--brand-tint);
	}

	.line {
		fill: none;
		stroke: var(--brand);
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.delivery {
		fill: var(--success);
	}

	.whisker {
		stroke: var(--gray-800);
		stroke-width: 1.5;
	}

	.dip {
		fill: var(--white);
		stroke: var(--gray-900);
		stroke-width: 2;
	}

	.axis {
		font-size: 10px;
		fill: var(--gray-400);
		font-variant-numeric: tabular-nums;
	}

	.axis.mid {
		text-anchor: middle;
	}

	.axis.end {
		text-anchor: end;
	}

	.tick {
		stroke: var(--gray-300);
	}

	.cross {
		stroke: var(--gray-300);
		stroke-dasharray: 2 2;
	}

	.focus {
		fill: var(--brand);
		stroke: var(--white);
		stroke-width: 2;
	}

	.tip {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: grid;
		gap: 0.125rem;
		padding: 0.375rem 0.5rem;
		background: var(--gray-900);
		color: var(--white);
		border-radius: var(--radius-md);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		pointer-events: none;
	}

	.tip .in {
		color: #86efac;
	}

	.tip .dipline {
		color: #fde68a;
	}

	.empty {
		margin: 0;
		padding: 2rem 0;
		text-align: center;
		color: var(--gray-400);
		font-size: var(--text-sm);
	}
</style>
