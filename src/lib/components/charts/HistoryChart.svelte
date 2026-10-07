<script lang="ts">
	/**
	 * The tank's history on two tracks that share one timeline.
	 *
	 * Top: the book balance — fuel out as a falling line, each delivery as a
	 * green step, each dip as a dot on a stem from the book line, so the gap
	 * between book and dipstick is a visible length.
	 *
	 * Bottom: the gap at every dip on its own scale, against the ±tolerance
	 * band. At a 20 000 L scale a 200 L gap is a couple of pixels; here it is
	 * the whole story — bars inside the band are dipstick noise, bars walking
	 * one way are a leak (or a recording error).
	 *
	 * The chosen span (3M / 6M / All) fits the width, ending today. A finger
	 * dragged across the chart (or a mouse) drives the readout row above it,
	 * which never covers the data; at rest it shows today.
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
	}

	let { points, dips, closes, capacity = null, toleranceL }: Props = $props();

	const RANGES = { '3M': 92, '6M': 183, All: Infinity } as const;
	type Range = keyof typeof RANGES;
	let range = $state<Range>('3M');

	// ---- Geometry: two tracks, one x axis ----
	const AXIS_W = 40;
	const MAIN = { top: 20, bottom: 176 };
	const GAP = { top: 192, bottom: 256 };
	const HEIGHT = 276;
	const gapMid = (GAP.top + GAP.bottom) / 2;
	const gradientId = `book-fill-${Math.random().toString(36).slice(2, 8)}`;

	let viewW = $state(600);

	/** The days in the chosen span, ending today. */
	let win = $derived(points.slice(Math.max(0, points.length - RANGES[range])));
	let fromDate = $derived(win[0]?.date ?? '');
	let winDips = $derived(dips.filter((d) => d.date >= fromDate));
	let pxPerDay = $derived(viewW / Math.max(win.length, 1));
	const xAt = (i: number) => (i + 0.5) * pxPerDay;

	/** A round step (1, 2 or 5 × 10ⁿ) giving about four gridlines. */
	function niceStep(span: number): number {
		const raw = Math.max(span, 1) / 4;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const norm = raw / mag;
		return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
	}

	// Main track: the top fits the span on screen.
	let yMax = $derived(
		Math.max(1, ...win.map((p) => p.litres), ...winDips.map((d) => d.dipLitres)) * 1.05
	);
	let step = $derived(niceStep(yMax));
	let yMin = $derived(Math.min(0, ...win.map((p) => p.litres)));
	const yAt = (litres: number) =>
		MAIN.top + (1 - (litres - yMin) / (yMax - yMin)) * (MAIN.bottom - MAIN.top);
	let gridValues = $derived(
		Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step).filter((g) => g > 0)
	);

	// Gap track: symmetric around zero, at least twice the tolerance, at most
	// six times it — one mis-dated entry (a dip recorded the day before its
	// delivery reads ~10 000 L out) must not flatten every other bar. Bars past
	// the cap run to the edge with an arrow and their value.
	let gapRange = $derived(
		Math.min(
			toleranceL * 6,
			Math.max(toleranceL * 2.2, ...winDips.map((d) => Math.abs(d.gapLitres) * 1.1))
		)
	);
	const gAt = (litres: number) =>
		gapMid - (Math.max(-gapRange, Math.min(gapRange, litres)) / gapRange) * ((GAP.bottom - GAP.top) / 2);
	const offScale = (litres: number) => Math.abs(litres) > gapRange;

	let indexOf = $derived(new Map(win.map((p, i) => [p.date, i])));

	let linePath = $derived(
		win.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.litres).toFixed(1)}`).join('')
	);
	let areaPath = $derived(
		win.length
			? `${linePath}L${xAt(win.length - 1).toFixed(1)},${yAt(0)}L${xAt(0).toFixed(1)},${yAt(0)}Z`
			: ''
	);

	/** Month starts: a faint tick through both tracks and a label under them. */
	let months = $derived.by(() => {
		const starts = win
			.map((p, i) => ({ p, i }))
			.filter(({ p, i }) => i === 0 || p.date.endsWith('-01'));
		return starts.map(({ p, i }, k) => {
			const end = starts[k + 1]?.i ?? win.length;
			const width = (end - i) * pxPerDay;
			const d = new Date(`${p.date}T12:00:00`);
			const label =
				width < 10
					? ''
					: width < 28
						? d.toLocaleDateString('en-ZA', { month: 'narrow' })
						: d.getMonth() === 0 || k === 0
							? d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
							: d.toLocaleDateString('en-ZA', { month: 'short' });
			return { i, label, tick: p.date.endsWith('-01') };
		});
	});

	/** Delivery steps; litre labels only where they will not collide. */
	let deliveries = $derived.by(() => {
		let lastLabelX = -Infinity;
		return win
			.map((p, i) => ({ p, i }))
			.filter(({ p }) => p.delivered > 0)
			.map(({ p, i }) => {
				const labelled = xAt(i) - lastLabelX > 48;
				if (labelled) lastLabelX = xAt(i);
				return { p, i, labelled };
			});
	});

	let rebaselines = $derived(
		closes
			.filter((c) => c.is_rebaseline && indexOf.has(c.reconciliation_date))
			.map((c) => indexOf.get(c.reconciliation_date)!)
	);
	let lowLine = $derived(capacity ? (capacity * LOW_TANK_PCT) / 100 : null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	// ---- Readout: drag a finger (or hover a mouse); at rest, today ----
	let hover = $state<number | null>(null);
	function track(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		let i = Math.max(0, Math.min(win.length - 1, Math.floor((event.clientX - rect.left) / pxPerDay)));
		// Snap to a dip within a fingertip's reach, so dips are easy to land on.
		const reach = Math.max(1, Math.round(10 / pxPerDay));
		let best: number | null = null;
		for (const d of winDips) {
			const di = indexOf.get(d.date);
			if (di !== undefined && Math.abs(di - i) <= reach && (best === null || Math.abs(di - i) < Math.abs(best - i)))
				best = di;
		}
		hover = best ?? i;
	}
	function onpointerleave(event: PointerEvent) {
		// A lifted finger leaves the readout on the chosen day; a mouse moving
		// off returns it to today.
		if (event.pointerType === 'mouse') hover = null;
	}
	$effect(() => {
		void range;
		hover = null;
	});

	let shownIndex = $derived(hover ?? win.length - 1);
	let shown = $derived(win[shownIndex] ?? null);
	let shownDip = $derived(shown ? winDips.find((d) => d.date === shown.date) : undefined);
	let latestDip = $derived(winDips.at(-1));
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

	<!-- Readout: never over the data -->
	<div class="readout" aria-live="polite">
		{#if shown}
			<span class="r-date">{hover === null ? 'Today' : fmtDayMonth(shown.date)}</span>
			<span class="r-book"><b>{formatWholeLitres(shown.litres)}</b> L</span>
			{#if shown.delivered > 0}<span class="r-in">+{formatWholeLitres(shown.delivered)}</span>{/if}
			{#if shown.dispensed > 0 && hover !== null}<span class="r-out">−{formatWholeLitres(shown.dispensed)}</span>{/if}
			{#if shownDip}
				<span class="r-gap {shownDip.band ? TONE[shownDip.band.key] : ''}">
					dip {formatWholeLitres(shownDip.dipLitres)} · gap {formatSigned(shownDip.gapLitres)}
				</span>
			{:else if hover === null && latestDip}
				<span class="r-gap {latestDip.band ? TONE[latestDip.band.key] : ''}">
					last gap {formatSigned(latestDip.gapLitres)} · {fmtDayMonth(latestDip.date)}
				</span>
			{/if}
		{/if}
	</div>

	<div class="frame" style="height: {HEIGHT}px">
		<div class="plot" bind:clientWidth={viewW} style="right: {AXIS_W}px">
			<svg
				width={viewW}
				height={HEIGHT}
				role="img"
				aria-label="Book balance from {win.length ? fmtFull(win[0].date) : ''}, with {deliveries.length} deliveries and {winDips.length} dips; gap at each dip below"
				onpointerdown={track}
				onpointermove={track}
				{onpointerleave}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stop-color="var(--brand)" stop-opacity="0.16" />
						<stop offset="100%" stop-color="var(--brand)" stop-opacity="0.01" />
					</linearGradient>
				</defs>

				<!-- Month ticks through both tracks -->
				{#each months as m (m.i)}
					{#if m.tick}
						<line class="tick" x1={m.i * pxPerDay} x2={m.i * pxPerDay} y1={MAIN.top} y2={GAP.bottom} />
					{/if}
					{#if m.label}<text class="month" x={m.i * pxPerDay + 3} y={HEIGHT - 6}>{m.label}</text>{/if}
				{/each}

				<!-- ===== Main track: the book ===== -->
				{#each gridValues as g (g)}
					<line class="grid" x1="0" x2={viewW} y1={yAt(g)} y2={yAt(g)} />
				{/each}
				<line class="base" x1="0" x2={viewW} y1={yAt(0)} y2={yAt(0)} />
				{#if lowLine !== null && lowLine < yMax}
					<line class="low" x1="0" x2={viewW} y1={yAt(lowLine)} y2={yAt(lowLine)} />
					<text class="low-label" x="3" y={yAt(lowLine) - 3}>low {LOW_TANK_PCT}%</text>
				{/if}

				<path d={areaPath} fill="url(#{gradientId})" />
				<path class="line" d={linePath} />

				{#each deliveries as { p, i, labelled } (p.date)}
					<line class="step" x1={xAt(i)} x2={xAt(i)} y1={yAt(p.litres - p.delivered)} y2={yAt(p.litres)} />
					{#if labelled}
						<text class="step-label" x={Math.min(Math.max(xAt(i), 22), viewW - 22)} y={yAt(p.litres) - 6}
							>+{formatWholeLitres(p.delivered)}</text
						>
					{/if}
				{/each}

				{#each rebaselines as i (i)}
					<path class="rebase" d="M{xAt(i)},{yAt(win[i].litres) - 5}l5,5l-5,5l-5,-5z" />
				{/each}

				{#each winDips as d, k (k)}
					{@const i = indexOf.get(d.date)!}
					<line class="stem {d.band ? TONE[d.band.key] : ''}" x1={xAt(i)} x2={xAt(i)} y1={yAt(d.bookLitres)} y2={yAt(d.dipLitres)} />
					<circle class="dip {d.band ? TONE[d.band.key] : ''}" cx={xAt(i)} cy={yAt(d.dipLitres)} r="3.5" />
				{/each}

				<!-- Today -->
				{#if win.length}
					<circle class="now" cx={xAt(win.length - 1)} cy={yAt(win[win.length - 1].litres)} r="3.5" />
				{/if}

				<!-- ===== Gap track: book − dip at each dip ===== -->
				<rect class="tol" x="0" width={viewW} y={gAt(toleranceL)} height={gAt(-toleranceL) - gAt(toleranceL)} />
				<line class="zero" x1="0" x2={viewW} y1={gapMid} y2={gapMid} />
				<text class="track-label" x="3" y={GAP.top - 3}>gap · book − dip</text>
				{#each winDips as d, k (k)}
					{@const i = indexOf.get(d.date)!}
					{@const w = Math.max(3, Math.min(6, pxPerDay * 1.2))}
					<rect
						class="gap-bar {d.band ? TONE[d.band.key] : ''}"
						x={xAt(i) - w / 2}
						width={w}
						y={Math.min(gAt(d.gapLitres), gapMid)}
						height={Math.max(1, Math.abs(gAt(d.gapLitres) - gapMid))}
						rx="1"
					/>
					{#if offScale(d.gapLitres)}
						{@const up = d.gapLitres > 0}
						<path
							class="gap-arrow {d.band ? TONE[d.band.key] : ''}"
							d="M{xAt(i) - 4},{up ? GAP.top + 4 : GAP.bottom - 4}l4,{up ? -6 : 6}l4,{up ? 6 : -6}z"
						/>
						<text
							class="gap-off"
							x={Math.min(Math.max(xAt(i), 26), viewW - 26)}
							y={up ? GAP.top + 14 : GAP.bottom - 9}>{formatSigned(d.gapLitres)}</text
						>
					{/if}
				{/each}

				<!-- Scrub line through both tracks -->
				{#if hover !== null && shown}
					<line class="cross" x1={xAt(hover)} x2={xAt(hover)} y1={MAIN.top - 6} y2={GAP.bottom} />
					<circle class="focus" cx={xAt(hover)} cy={yAt(shown.litres)} r="4" />
				{/if}
			</svg>
		</div>

		<div class="axis" style="width: {AXIS_W}px" aria-hidden="true">
			{#each gridValues as g (g)}
				<span style="top: {yAt(g)}px">{g >= 1000 ? `${g / 1000}k` : g}</span>
			{/each}
			<span class="g" style="top: {gapMid}px">±{toleranceL}</span>
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

	/* ---- Readout ---- */
	.readout {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem 0.625rem;
		min-height: 1.5rem;
		margin-bottom: 0.125rem;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--gray-600);
	}

	.r-date {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		min-width: 3.25rem;
	}

	.r-book b {
		font-size: 1rem;
		font-weight: 800;
		font-stretch: var(--figure-stretch);
		color: var(--brand);
	}

	.r-in {
		font-weight: 700;
		color: #1f6b3a;
	}

	.r-out {
		color: var(--gray-500);
	}

	.r-gap {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		padding: 0.0625rem 0.4375rem;
		border-radius: var(--radius-full);
		background: var(--gray-100);
	}

	.r-gap.good {
		background: #ecf6ef;
		color: #1f6b3a;
	}

	.r-gap.warn {
		background: #fdf3e2;
		color: #8a4b08;
	}

	.r-gap.bad {
		background: #fbeaea;
		color: #9b1c1c;
	}

	/* ---- Plot ---- */
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
	}

	.axis span {
		position: absolute;
		left: 6px;
		transform: translateY(-50%);
		font-size: 10px;
		color: var(--gray-400);
		font-variant-numeric: tabular-nums;
	}

	.axis span.g {
		color: #4b8a5e;
	}

	.tick {
		stroke: var(--gray-100);
	}

	.month {
		font-size: 10px;
		fill: var(--gray-500);
		font-weight: 600;
	}

	.grid {
		stroke: var(--gray-100);
		stroke-dasharray: 2 3;
	}

	.base {
		stroke: var(--gray-200);
	}

	.low {
		stroke: var(--error);
		stroke-opacity: 0.4;
		stroke-dasharray: 3 3;
	}

	.low-label {
		font-size: 9px;
		fill: var(--error);
		fill-opacity: 0.7;
	}

	.line {
		fill: none;
		stroke: var(--brand);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.step {
		stroke: var(--success);
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.step-label {
		font-size: 10px;
		font-weight: 700;
		fill: #1f6b3a;
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
	}

	.rebase {
		fill: var(--warning);
		stroke: var(--white);
		stroke-width: 1;
	}

	.stem {
		stroke-width: 1.5;
		stroke: var(--gray-500);
	}

	.dip {
		fill: var(--gray-700);
		stroke: var(--white);
		stroke-width: 1.5;
	}

	.stem.good {
		stroke: var(--success);
	}
	.stem.warn {
		stroke: var(--warning);
	}
	.stem.bad {
		stroke: var(--error);
	}

	.dip.good,
	.gap-bar.good {
		fill: var(--success);
	}
	.dip.warn,
	.gap-bar.warn {
		fill: var(--warning);
	}
	.dip.bad,
	.gap-bar.bad {
		fill: var(--error);
	}

	.now {
		fill: var(--brand);
		stroke: var(--white);
		stroke-width: 2;
	}

	.tol {
		fill: #e3f1e7;
		opacity: 0.8;
	}

	.zero {
		stroke: var(--gray-300);
	}

	.track-label {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		fill: var(--gray-400);
	}

	.gap-bar {
		fill: var(--gray-500);
	}

	.gap-arrow {
		fill: var(--gray-500);
	}
	.gap-arrow.good {
		fill: var(--success);
	}
	.gap-arrow.warn {
		fill: var(--warning);
	}
	.gap-arrow.bad {
		fill: var(--error);
	}

	.gap-off {
		font-size: 9px;
		font-weight: 700;
		fill: var(--error);
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
		paint-order: stroke;
		stroke: var(--white);
		stroke-width: 3px;
	}

	.cross {
		stroke: var(--gray-400);
		stroke-width: 1;
	}

	.focus {
		fill: var(--white);
		stroke: var(--brand);
		stroke-width: 2.5;
	}
</style>
