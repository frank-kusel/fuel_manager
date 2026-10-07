<script lang="ts">
	/**
	 * The tank's history: the book balance line, every delivery as a green
	 * jump with its litres, every dip as a dot with a ±tolerance bar — so
	 * whether the book and the dipstick agree, and whether the gap is
	 * drifting, reads straight off the chart. Closes are small squares.
	 *
	 * The chosen span (3M / 6M / All) always fits the width, ending today —
	 * no sideways scrolling, so a finger dragged across the chart moves the
	 * readout instead of the timeline. Vertical swipes still scroll the page.
	 */
	import { fmtDayMonth, fmtFull } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import {
		LOW_TANK_PCT,
		type BalancePoint,
		type CloseRow,
		type DipCheckPoint
	} from '$lib/utils/tank-balance';

	interface Props {
		points: BalancePoint[];
		dips: DipCheckPoint[];
		closes: CloseRow[];
		capacity?: number | null;
		toleranceL: number;
		height?: number;
	}

	let { points, dips, closes, capacity = null, toleranceL, height = 240 }: Props = $props();

	const RANGES = { '3M': 92, '6M': 183, All: Infinity } as const;
	type Range = keyof typeof RANGES;
	let range = $state<Range>('3M');

	let viewW = $state(600);
	const PAD = { top: 26, bottom: 24 };
	const AXIS_W = 44;
	let plotH = $derived(height - PAD.top - PAD.bottom);

	/** The days in the chosen span, ending today. */
	let win = $derived(points.slice(Math.max(0, points.length - RANGES[range])));
	let fromDate = $derived(win[0]?.date ?? '');
	let winDips = $derived(dips.filter((d) => d.date >= fromDate));
	let pxPerDay = $derived(viewW / Math.max(win.length, 1));

	/** A round step (1, 2 or 5 × 10ⁿ) giving about four gridlines. */
	function niceStep(span: number): number {
		const raw = Math.max(span, 1) / 4;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const norm = raw / mag;
		return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
	}
	// The vertical scale fits the span on screen, so the line uses the full
	// height of the chart.
	let dataMax = $derived(
		Math.max(1, ...win.map((p) => p.litres), ...winDips.map((d) => d.dipLitres + toleranceL))
	);
	let yMax = $derived(dataMax * 1.04);
	let step = $derived(niceStep(yMax));
	let yMin = $derived(Math.min(0, ...win.map((p) => p.litres)));
	const yAt = (litres: number) => PAD.top + (1 - (litres - yMin) / (yMax - yMin)) * plotH;
	const xAt = (i: number) => (i + 0.5) * pxPerDay;

	let indexOf = $derived(new Map(win.map((p, i) => [p.date, i])));

	let linePath = $derived(
		win.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.litres).toFixed(1)}`).join('')
	);
	let areaPath = $derived(
		win.length
			? `${linePath}L${xAt(win.length - 1).toFixed(1)},${yAt(0)}L${xAt(0).toFixed(1)},${yAt(0)}Z`
			: ''
	);

	/** Month bands: alternate shading, labelled as fully as the width allows. */
	let months = $derived.by(() => {
		const out: { i: number; end: number; label: string; odd: boolean }[] = [];
		win.forEach((p, i) => {
			if (i === 0 || p.date.endsWith('-01')) {
				if (out.length) out[out.length - 1].end = i;
				out.push({ i, end: win.length, label: p.date, odd: out.length % 2 === 1 });
			}
		});
		return out.map((m, k) => {
			const width = (m.end - m.i) * pxPerDay;
			const d = new Date(`${m.label}T12:00:00`);
			const label =
				width < 10
					? ''
					: width < 28
						? d.toLocaleDateString('en-ZA', { month: 'narrow' })
						: d.getMonth() === 0 || k === 0
							? d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
							: d.toLocaleDateString('en-ZA', { month: 'short' });
			return { ...m, label };
		});
	});

	/** Delivery jumps; labels are dropped where they would collide. */
	let deliveries = $derived.by(() => {
		let lastLabelX = -Infinity;
		return win
			.map((p, i) => ({ p, i }))
			.filter(({ p }) => p.delivered > 0)
			.map(({ p, i }) => {
				const labelled = xAt(i) - lastLabelX > 46;
				if (labelled) lastLabelX = xAt(i);
				return { p, i, labelled };
			});
	});
	let closeMarks = $derived(
		closes
			.filter((c) => indexOf.has(c.reconciliation_date))
			.map((c) => ({ c, i: indexOf.get(c.reconciliation_date)! }))
	);
	let gridValues = $derived(
		Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step)
	);
	let lowLine = $derived(capacity ? (capacity * LOW_TANK_PCT) / 100 : null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	// ---- Readout: hover with a mouse, drag a finger on a phone ----
	let hover = $state<number | null>(null);
	function track(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const i = Math.floor((event.clientX - rect.left) / pxPerDay);
		hover = Math.max(0, Math.min(win.length - 1, i));
	}
	function onpointerleave(event: PointerEvent) {
		// A lifted finger leaves the readout up to read; a mouse moving off clears it.
		if (event.pointerType === 'mouse') hover = null;
	}
	$effect(() => {
		void range;
		hover = null;
	});
	let hovered = $derived(hover === null ? null : win[hover]);
	let hoveredDip = $derived(hovered ? winDips.find((d) => d.date === hovered.date) : undefined);
</script>

<div class="history">
	<div class="ranges" role="radiogroup" aria-label="Time span">
		{#each Object.keys(RANGES) as r (r)}
			<button
				role="radio"
				aria-checked={range === r}
				class:on={range === r}
				onclick={() => (range = r as Range)}>{r}</button
			>
		{/each}
	</div>

	<div class="frame" style="height: {height}px">
		<div class="plot" bind:clientWidth={viewW} style="right: {AXIS_W}px">
			<svg
				width={viewW}
				{height}
				role="img"
				aria-label="Book balance from {win.length ? fmtFull(win[0].date) : ''}: {deliveries.length} deliveries, {winDips.length} dips"
				onpointerdown={track}
				onpointermove={track}
				{onpointerleave}
			>
				{#each months as m (m.i)}
					{#if m.odd}
						<rect class="band" x={m.i * pxPerDay} y={PAD.top} width={(m.end - m.i) * pxPerDay} height={plotH} />
					{/if}
					{#if m.label}<text class="month" x={m.i * pxPerDay + 3} y={height - 7}>{m.label}</text>{/if}
				{/each}

				{#each gridValues as g (g)}
					<line class="grid" x1="0" x2={viewW} y1={yAt(g)} y2={yAt(g)} />
				{/each}
				{#if lowLine !== null && lowLine < yMax}
					<line class="low" x1="0" x2={viewW} y1={yAt(lowLine)} y2={yAt(lowLine)} />
				{/if}

				<path class="area" d={areaPath} />
				<path class="line" d={linePath} />

				{#each deliveries as { p, i, labelled } (p.date)}
					<line class="jump" x1={xAt(i)} x2={xAt(i)} y1={yAt(p.litres - p.delivered)} y2={yAt(p.litres)} />
					{#if labelled}
						<text class="jump-label" x={Math.min(Math.max(xAt(i), 22), viewW - 22)} y={yAt(p.litres) - 6}
							>+{formatWholeLitres(p.delivered)}</text
						>
					{/if}
				{/each}

				{#each closeMarks as { c, i }, k (k)}
					<rect
						class="close"
						class:rebased={c.is_rebaseline}
						x={xAt(i) - 3}
						y={yAt(win[i].litres) - 3}
						width="6"
						height="6"
					/>
				{/each}

				{#each winDips as d, k (k)}
					{@const i = indexOf.get(d.date)!}
					<line class="err {d.band ? TONE[d.band.key] : ''}" x1={xAt(i)} x2={xAt(i)} y1={yAt(d.dipLitres + toleranceL)} y2={yAt(d.dipLitres - toleranceL)} />
					<line class="cap {d.band ? TONE[d.band.key] : ''}" x1={xAt(i) - 3} x2={xAt(i) + 3} y1={yAt(d.dipLitres + toleranceL)} y2={yAt(d.dipLitres + toleranceL)} />
					<line class="cap {d.band ? TONE[d.band.key] : ''}" x1={xAt(i) - 3} x2={xAt(i) + 3} y1={yAt(d.dipLitres - toleranceL)} y2={yAt(d.dipLitres - toleranceL)} />
					<circle class="dip {d.band ? TONE[d.band.key] : ''}" cx={xAt(i)} cy={yAt(d.dipLitres)} r="4" />
				{/each}

				{#if hover !== null && hovered}
					<line class="cross" x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + plotH} />
					<circle class="focus" cx={xAt(hover)} cy={yAt(hovered.litres)} r="3.5" />
				{/if}
			</svg>

			{#if hovered && hover !== null}
				<div class="tip" style="left: {Math.min(Math.max(xAt(hover), 80), viewW - 80)}px">
					<strong>{fmtDayMonth(hovered.date)}</strong>
					<span>Book {formatWholeLitres(hovered.litres)} L</span>
					{#if hovered.delivered > 0}<span class="in">+{formatWholeLitres(hovered.delivered)} delivered</span>{/if}
					{#if hovered.dispensed > 0}<span>−{formatWholeLitres(hovered.dispensed)} used</span>{/if}
					{#if hoveredDip}
						<span class="dipline">
							Dip {formatWholeLitres(hoveredDip.dipLitres)} · gap {formatSigned(hoveredDip.gapLitres)}
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="axis" style="width: {AXIS_W}px" aria-hidden="true">
			{#each gridValues as g (g)}
				<span style="top: {yAt(g)}px">{g >= 1000 ? `${Math.round(g / 1000)}k` : Math.round(g)}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.history {
		position: relative;
		min-width: 0;
	}

	.ranges {
		position: absolute;
		top: -2.125rem;
		right: 0;
		display: inline-flex;
		padding: 2px;
		border-radius: var(--radius-md);
		background: var(--gray-100);
	}

	.ranges button {
		padding: 0.1875rem 0.5rem;
		border: 0;
		border-radius: 4px;
		background: none;
		font: inherit;
		font-size: 0.6875rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		cursor: pointer;
	}

	.ranges button.on {
		background: var(--white);
		color: var(--gray-900);
		box-shadow: var(--shadow-sm);
	}

	.frame {
		position: relative;
	}

	.plot {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	svg {
		display: block;
		/* Horizontal drags drive the readout; vertical swipes scroll the page. */
		touch-action: pan-y;
		cursor: crosshair;
		user-select: none;
		-webkit-user-select: none;
	}

	.axis {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		border-left: 1px solid var(--gray-100);
	}

	.axis span {
		position: absolute;
		left: 6px;
		transform: translateY(-50%);
		font-size: 10px;
		color: var(--gray-400);
		font-variant-numeric: tabular-nums;
	}

	.band {
		fill: var(--gray-50);
	}

	.month {
		font-size: 10px;
		fill: var(--gray-500);
		font-weight: 600;
	}

	.grid {
		stroke: var(--gray-100);
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
		stroke-width: 1.75;
		stroke-linejoin: round;
	}

	.jump {
		stroke: var(--success);
		stroke-width: 4;
		stroke-linecap: round;
	}

	.jump-label {
		font-size: 10px;
		font-weight: 700;
		fill: #1f6b3a;
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
	}

	.close {
		fill: var(--white);
		stroke: var(--gray-700);
		stroke-width: 1.5;
	}

	.close.rebased {
		fill: var(--warning);
	}

	.err,
	.cap {
		stroke: var(--gray-700);
		stroke-width: 1.5;
	}

	.dip {
		fill: var(--white);
		stroke: var(--gray-900);
		stroke-width: 2;
	}

	.good {
		stroke: #1f6b3a;
	}

	.warn {
		stroke: var(--warning-dark);
	}

	.bad {
		stroke: var(--error);
	}

	.dip.good {
		fill: #e3f1e7;
	}

	.dip.warn {
		fill: #fdf3e2;
	}

	.dip.bad {
		fill: #fbeaea;
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
		z-index: 2;
	}

	.tip .in {
		color: #86efac;
	}

	.tip .dipline {
		color: #fde68a;
	}
</style>
