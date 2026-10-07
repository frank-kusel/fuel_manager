<script lang="ts">
	/**
	 * The leak signal: the gap between book and dip at each close.
	 *
	 * Each gap is a LEVEL, not a monthly increment — a close carries the book
	 * forward instead of resetting it to the dip, so every point already
	 * contains all earlier months' unexplained difference. Drawn as a line:
	 * wandering inside the tolerance band is dipstick noise; a steady walk one
	 * way is a real loss. Never summed. See $lib/utils/tank-balance.
	 */
	import { fmtMonthYear } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import { bandVariance, varianceTrend, type CloseRow } from '$lib/utils/tank-balance';

	interface Props {
		rows: CloseRow[];
		toleranceL: number;
	}

	let { rows, toleranceL }: Props = $props();

	let trend = $derived(varianceTrend(rows));
	/** Oldest → newest for drawing. */
	let points = $derived(
		[...trend.points].reverse().map((p) => {
			const row = rows.find((r) => r.reconciliation_date === p.date);
			return {
				...p,
				row,
				band: bandVariance(p.gapLitres, Math.abs(row?.measured_level ?? 0), toleranceL)
			};
		})
	);
	let latestBand = $derived(points.at(-1)?.band ?? null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	let width = $state(600);
	const height = 150;
	const PAD = { top: 12, right: 40, bottom: 20, left: 6 };
	let plotW = $derived(Math.max(1, width - PAD.left - PAD.right));
	const plotH = height - PAD.top - PAD.bottom;

	let range = $derived(
		Math.max(toleranceL * 2.5, ...points.map((p) => Math.abs(p.gapLitres) * 1.15))
	);
	const xAt = (i: number) =>
		PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
	const yAt = (litres: number) => PAD.top + plotH / 2 - (litres / range) * (plotH / 2);

	let path = $derived(
		points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.gapLitres).toFixed(1)}`).join('')
	);

	let hover = $state<number | null>(null);
	function onpointermove(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const i = Math.round(((event.clientX - rect.left - PAD.left) / plotW) * (points.length - 1));
		hover = Math.max(0, Math.min(points.length - 1, i));
	}
</script>

<section class="ui-panel" id="leak-trend">
	<div class="ui-panel-head">
		<p class="ui-label">Leak trend</p>
		{#if trend.sinceDate}
			<span class="ui-pill plain">since the {fmtMonthYear(trend.sinceDate)} re-baseline</span>
		{/if}
	</div>

	{#if trend.months === 0}
		<p class="ui-muted none">No months closed yet.</p>
	{:else}
		<div class="figures">
			<div>
				<p class="ui-label">Gap now</p>
				<p class="ui-figure fig {latestBand ? TONE[latestBand.key] : ''}">
					{formatSigned(trend.latestGapLitres)}<small>L</small>
				</p>
			</div>
			<div>
				<p class="ui-label">Drift</p>
				<p class="ui-figure fig">{formatSigned(trend.driftLitres)}<small>L</small></p>
			</div>
			<div>
				<p class="ui-label">Closes</p>
				<p class="ui-figure fig">{trend.months}</p>
			</div>
		</div>

		{#if points.length > 1}
			<div class="chart" bind:clientWidth={width}>
				<svg
					{width}
					{height}
					role="img"
					aria-label="Gap at each close from {fmtMonthYear(points[0].date)} to {fmtMonthYear(points.at(-1)!.date)}; latest {formatSigned(trend.latestGapLitres)} litres"
					{onpointermove}
					onpointerleave={() => (hover = null)}
				>
					<rect
						class="band"
						x={PAD.left}
						width={plotW}
						y={yAt(toleranceL)}
						height={yAt(-toleranceL) - yAt(toleranceL)}
					/>
					<line class="zero" x1={PAD.left} x2={PAD.left + plotW} y1={yAt(0)} y2={yAt(0)} />
					<text class="axis" x={PAD.left + plotW + 4} y={yAt(toleranceL) + 3}>+{toleranceL}</text>
					<text class="axis" x={PAD.left + plotW + 4} y={yAt(0) + 3}>0</text>
					<text class="axis" x={PAD.left + plotW + 4} y={yAt(-toleranceL) + 3}>−{toleranceL}</text>

					<path class="walk" d={path} />
					{#each points as p, i (p.date)}
						<circle
							class="pt {p.band ? TONE[p.band.key] : ''}"
							class:approx={p.approximate}
							cx={xAt(i)}
							cy={yAt(p.gapLitres)}
							r={hover === i ? 5 : 3.5}
						/>
					{/each}

					<text class="axis" x={PAD.left} y={height - 4}>{fmtMonthYear(points[0].date)}</text>
					<text class="axis end" x={PAD.left + plotW} y={height - 4}
						>{fmtMonthYear(points.at(-1)!.date)}</text
					>
				</svg>
				{#if hover !== null}
					{@const p = points[hover]}
					<div class="tip" style="left: {Math.min(Math.max(xAt(hover), 60), width - 60)}px">
						<strong>{fmtMonthYear(p.date)}</strong>
						<span>gap {formatSigned(p.gapLitres)} L{p.approximate ? ' (approx.)' : ''}</span>
					</div>
				{/if}
			</div>
		{/if}

		<details class="ui-details">
			<summary>Details</summary>
			<table class="history">
				<thead>
					<tr>
						<th>Month</th>
						<th class="num">Carried fwd</th>
						<th class="num">Dip</th>
						<th class="num">Gap</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each [...points].reverse() as p (p.date)}
						<tr>
							<td>{fmtMonthYear(p.date)}</td>
							<td class="num">{formatWholeLitres(p.row?.calculated_level)}</td>
							<td class="num">{formatWholeLitres(p.row?.measured_level)}</td>
							<td class="num" class:approx={p.approximate}>{formatSigned(p.gapLitres)}</td>
							<td class="mark {p.row?.accepted ? 'good' : 'warn'}">{p.row?.accepted ? '✓' : '!'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if trend.anyApproximate}
				<p class="note">Italic gaps predate migration 020 and include movements after the dip.</p>
			{/if}
		</details>
	{/if}
</section>

<style>
	.none {
		margin: 0;
		font-size: var(--text-sm);
	}

	.figures {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.figures p {
		margin: 0;
	}

	.fig {
		font-size: 1.625rem;
		margin-top: 0.25rem !important;
	}

	.fig.good {
		color: #1f6b3a;
	}
	.fig.warn {
		color: #8a4b08;
	}
	.fig.bad {
		color: var(--error);
	}

	.chart {
		position: relative;
		width: 100%;
		min-width: 0;
		/* The svg is drawn at the measured width; without this it would hold
		   the container open at its first width instead of letting it shrink. */
		overflow: hidden;
	}

	svg {
		display: block;
		touch-action: pan-y;
	}

	.band {
		fill: #e3f1e7;
		opacity: 0.7;
	}

	.zero {
		stroke: var(--gray-300);
	}

	.walk {
		fill: none;
		stroke: var(--gray-500);
		stroke-width: 1.5;
	}

	.pt {
		fill: var(--gray-500);
		stroke: var(--white);
		stroke-width: 1.5;
	}
	.pt.good {
		fill: var(--success);
	}
	.pt.warn {
		fill: var(--warning);
	}
	.pt.bad {
		fill: var(--error);
	}
	.pt.approx {
		fill-opacity: 0.45;
	}

	.axis {
		font-size: 10px;
		fill: var(--gray-400);
		font-variant-numeric: tabular-nums;
	}

	.axis.end {
		text-anchor: end;
	}

	.tip {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: grid;
		padding: 0.375rem 0.5rem;
		background: var(--gray-900);
		color: var(--white);
		border-radius: var(--radius-md);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		pointer-events: none;
	}

	.history {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.history th {
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		padding: 0.25rem 0;
	}

	.history td {
		padding: 0.375rem 0;
		border-top: 1px solid var(--gray-100);
	}

	.num {
		text-align: right;
	}

	.approx {
		font-style: italic;
		color: var(--gray-500);
	}

	.mark {
		text-align: right;
		width: 1.5rem;
		font-weight: 700;
	}
	.mark.good {
		color: var(--success);
	}
	.mark.warn {
		color: var(--warning);
	}

	.note {
		margin: 0.5rem 0 0;
		font-size: var(--text-xs);
		color: var(--gray-500);
	}
</style>
