<script lang="ts">
	/**
	 * The tank's history on two tracks that share one timeline, edge to edge.
	 *
	 * Top: the book balance — fuel out as a falling line, each delivery as a
	 * green rise with its litres, each dip as a dot on a fine stem from the
	 * line, so the gap between book and dipstick is a visible length.
	 *
	 * Bottom: the gap at every dip on its own scale against the ±tolerance
	 * band — inside the band is dipstick noise; a run of lollipops leaning one
	 * way is a leak (or a recording error).
	 *
	 * There is no value axis. A scrub line, always on screen, picks a day: the
	 * date and book ride on a label at its top, and the day's in / out / dip /
	 * gap sit in fixed slots above the chart, so nothing jumps as it moves. It
	 * starts on today, stays where it is left, and is dragged with a finger or
	 * the mouse. The chosen span (3M / 6M / All) fits the width, ending today.
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

	// ---- Geometry: two tracks, one timeline, no axis column ----
	const PAD_X = 10;
	const LABEL_H = 20; // the scrub label rides in a band above the plot
	const MAIN = { top: 48, bottom: 200 };
	const GAP = { top: 216, bottom: 272 };
	const MONTHS_Y = 294;
	const HEIGHT = 306;
	const gapMid = (GAP.top + GAP.bottom) / 2;
	const uid = Math.random().toString(36).slice(2, 8);

	let viewW = $state(600);

	/** The days in the chosen span, ending today. */
	let win = $derived(points.slice(Math.max(0, points.length - RANGES[range])));
	let fromDate = $derived(win[0]?.date ?? '');
	let winDips = $derived(dips.filter((d) => d.date >= fromDate));
	let stepX = $derived((viewW - PAD_X * 2) / Math.max(win.length - 1, 1));
	const xAt = (i: number) => PAD_X + i * stepX;

	// Book track: from empty to just above the span's highest point.
	let hi = $derived(
		Math.max(1, ...win.map((p) => p.litres), ...winDips.map((d) => d.dipLitres))
	);
	let lo = $derived(Math.min(0, ...win.map((p) => p.litres)));
	let yMax = $derived(hi + (hi - lo) * 0.04);
	const yAt = (litres: number) =>
		MAIN.top + (1 - (litres - lo) / (yMax - lo)) * (MAIN.bottom - MAIN.top);

	// Gap track: symmetric around zero, at least 2.2× the tolerance and at most
	// 6× — one mis-dated entry must not flatten every other gap. Gaps past the
	// cap run to the edge with an arrow and their value.
	let gapRange = $derived(
		Math.min(
			toleranceL * 6,
			Math.max(toleranceL * 2.2, ...winDips.map((d) => Math.abs(d.gapLitres) * 1.1))
		)
	);
	const gAt = (litres: number) =>
		gapMid -
		(Math.max(-gapRange, Math.min(gapRange, litres)) / gapRange) * ((GAP.bottom - GAP.top) / 2);
	const offScale = (litres: number) => Math.abs(litres) > gapRange;

	let indexOf = $derived(new Map(win.map((p, i) => [p.date, i])));

	/** The book line, broken at deliveries so each rise is drawn green. */
	let bookPath = $derived(
		win
			.map((p, i) => {
				const move = i === 0 || p.delivered > 0 ? 'M' : 'L';
				return `${move}${xAt(i).toFixed(1)},${yAt(p.litres).toFixed(1)}`;
			})
			.join('')
	);
	let areaPath = $derived(
		win.length
			? win.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.litres).toFixed(1)}`).join('') +
					`L${xAt(win.length - 1)},${MAIN.bottom}L${xAt(0)},${MAIN.bottom}Z`
			: ''
	);

	/** Months: a faint separator and a small label centred on each month. */
	let months = $derived.by(() => {
		const starts = win
			.map((p, i) => ({ p, i }))
			.filter(({ p, i }) => i === 0 || p.date.endsWith('-01'));
		return starts.map(({ p, i }, k) => {
			const end = starts[k + 1]?.i ?? win.length - 1;
			const width = (end - i) * stepX;
			const d = new Date(`${p.date}T12:00:00`);
			const label =
				width < 12
					? ''
					: width < 32
						? d.toLocaleDateString('en-ZA', { month: 'narrow' })
						: d.getMonth() === 0
							? `${d.toLocaleDateString('en-ZA', { month: 'short' })} ’${String(d.getFullYear()).slice(2)}`
							: d.toLocaleDateString('en-ZA', { month: 'short' });
			return { x: xAt(i), mid: xAt((i + end) / 2), label, edge: p.date.endsWith('-01') };
		});
	});

	/** Delivery rises, each with a litres pill where it will not collide. */
	let deliveries = $derived.by(() => {
		let lastPillRight = -Infinity;
		return win
			.map((p, i) => ({ p, i }))
			.filter(({ p, i }) => p.delivered > 0 && i > 0)
			.map(({ p, i }) => {
				const text = `+${formatWholeLitres(p.delivered)}`;
				const w = text.length * 5.6 + 12;
				const cx = Math.min(Math.max(xAt(i), w / 2 + 2), viewW - w / 2 - 2);
				const pill = cx - w / 2 > lastPillRight + 4;
				if (pill) lastPillRight = cx + w / 2;
				return { p, i, from: win[i - 1].litres, text, w, cx, pill };
			});
	});

	let rebaselines = $derived(
		closes
			.filter((c) => c.is_rebaseline && indexOf.has(c.reconciliation_date))
			.map((c) => indexOf.get(c.reconciliation_date)!)
	);
	let lowLine = $derived(capacity ? (capacity * LOW_TANK_PCT) / 100 : null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	// ---- The scrub line: starts on today, stays where it is left ----
	let picked = $state<number | null>(null); // null = today
	let dragging = $state(false);
	let at = $derived(Math.min(picked ?? win.length - 1, win.length - 1));

	function pick(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		let i = Math.round((event.clientX - rect.left - PAD_X) / stepX);
		i = Math.max(0, Math.min(win.length - 1, i));
		// Snap to a dip within a fingertip's reach, so dips are easy to land on.
		const reach = Math.max(1, Math.round(12 / stepX));
		let best: number | null = null;
		for (const d of winDips) {
			const di = indexOf.get(d.date);
			if (
				di !== undefined &&
				Math.abs(di - i) <= reach &&
				(best === null || Math.abs(di - i) < Math.abs(best - i))
			)
				best = di;
		}
		const next = best ?? i;
		picked = next === win.length - 1 ? null : next;
	}
	function onpointerdown(event: PointerEvent) {
		dragging = true;
		pick(event);
	}
	function onpointermove(event: PointerEvent) {
		// A mouse scrubs on hover; a finger only while it is down.
		if (event.pointerType === 'mouse' || dragging) pick(event);
	}
	function endDrag() {
		dragging = false;
	}
	$effect(() => {
		void range;
		picked = null;
	});

	let shown = $derived(win[at] ?? null);
	let shownDip = $derived(shown ? winDips.find((d) => d.date === shown.date) : undefined);
	let latestDip = $derived(winDips.at(-1));
	let isToday = $derived(picked === null);
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

	<!-- The day's details, each in a fixed slot: nothing moves as the line does -->
	<div class="slots" aria-live="polite">
		{#if shown}
			{@const dip = shownDip ?? (isToday ? latestDip : undefined)}
			<div class="slot">
				<span class="s-k">In</span>
				<span class="s-v" class:in={shown.delivered > 0}
					>{shown.delivered > 0 ? `+${formatWholeLitres(shown.delivered)}` : '—'}</span
				>
			</div>
			<div class="slot">
				<span class="s-k">Out</span>
				<span class="s-v">{shown.dispensed > 0 ? `−${formatWholeLitres(shown.dispensed)}` : '—'}</span>
			</div>
			<div class="slot">
				<span class="s-k">{dip && !shownDip ? `Last dip ${fmtDayMonth(dip.date)}` : 'Dip'}</span>
				<span class="s-v">{dip ? formatWholeLitres(dip.dipLitres) : '—'}</span>
			</div>
			<div class="slot">
				<span class="s-k">Gap</span>
				<span class="s-v {dip?.band ? TONE[dip.band.key] : ''}">{dip ? formatSigned(dip.gapLitres) : '—'}</span>
			</div>
			<button class="to-today" class:hidden={isToday} onclick={() => (picked = null)} tabindex={isToday ? -1 : 0}
				>Today</button
			>
		{/if}
	</div>

	<div class="plot" bind:clientWidth={viewW}>
		<svg
			width={viewW}
			height={HEIGHT}
			role="img"
			aria-label="Book balance from {win.length ? fmtFull(win[0].date) : ''}, with {deliveries.length} deliveries and {winDips.length} dips; gap at each dip below"
			{onpointerdown}
			{onpointermove}
			onpointerup={endDrag}
			onpointercancel={endDrag}
			onpointerleave={endDrag}
		>
			<defs>
				<linearGradient id="fill-{uid}" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="var(--brand)" stop-opacity="0.22" />
					<stop offset="70%" stop-color="var(--brand)" stop-opacity="0.05" />
					<stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
				</linearGradient>
				<radialGradient id="glow-{uid}">
					<stop offset="0%" stop-color="var(--brand)" stop-opacity="0.35" />
					<stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
				</radialGradient>
			</defs>

			<!-- Month separators and labels -->
			{#each months as m (m.x)}
				{#if m.edge}
					<line class="sep" x1={m.x} x2={m.x} y1={MAIN.top - 8} y2={GAP.bottom} />
				{/if}
				{#if m.label}<text class="month" x={m.mid} y={MONTHS_Y}>{m.label}</text>{/if}
			{/each}

			<!-- ===== Book ===== -->
			{#if lowLine !== null && lowLine < yMax && lowLine > lo}
				<line class="low" x1="0" x2={viewW} y1={yAt(lowLine)} y2={yAt(lowLine)} />
				<text class="low-label" x={viewW - 4} y={yAt(lowLine) - 4}>low {LOW_TANK_PCT}%</text>
			{/if}

			<path d={areaPath} fill="url(#fill-{uid})" />
			<path class="book" d={bookPath} />

			{#each deliveries as d (d.p.date)}
				<line class="rise" x1={xAt(d.i - 1)} y1={yAt(d.from)} x2={xAt(d.i)} y2={yAt(d.p.litres)} />
				{#if d.pill}
					{@const py = Math.max(yAt(d.p.litres) - 22, 2)}
					<rect class="pill" x={d.cx - d.w / 2} y={py} width={d.w} height="16" rx="8" />
					<text class="pill-text" x={d.cx} y={py + 11.5}>{d.text}</text>
				{/if}
			{/each}

			{#each rebaselines as i (i)}
				<path class="rebase" d="M{xAt(i)},{yAt(win[i].litres) - 5}l5,5l-5,5l-5,-5z" />
			{/each}

			{#each winDips as d, k (k)}
				{@const i = indexOf.get(d.date)!}
				<line
					class="stem {d.band ? TONE[d.band.key] : ''}"
					x1={xAt(i)}
					x2={xAt(i)}
					y1={yAt(d.bookLitres)}
					y2={yAt(d.dipLitres)}
				/>
				<circle class="dip {d.band ? TONE[d.band.key] : ''}" cx={xAt(i)} cy={yAt(d.dipLitres)} r="3.5" />
			{/each}

			<!-- Today -->
			{#if win.length}
				{@const tx = xAt(win.length - 1)}
				{@const ty = yAt(win[win.length - 1].litres)}
				<circle cx={tx} cy={ty} r="11" fill="url(#glow-{uid})" />
				<circle class="now" cx={tx} cy={ty} r="3.5" />
			{/if}

			<!-- ===== Gap: book − dip ===== -->
			<rect
				class="tol"
				x="0"
				width={viewW}
				y={gAt(toleranceL)}
				height={gAt(-toleranceL) - gAt(toleranceL)}
				rx="3"
			/>
			<line class="zero" x1="0" x2={viewW} y1={gapMid} y2={gapMid} />
			<text class="track-label" x="6" y={GAP.top - 4}>gap · ±{toleranceL} L</text>
			{#each winDips as d, k (k)}
				{@const i = indexOf.get(d.date)!}
				<line
					class="lolly {d.band ? TONE[d.band.key] : ''}"
					x1={xAt(i)}
					x2={xAt(i)}
					y1={gapMid}
					y2={gAt(d.gapLitres)}
				/>
				{#if offScale(d.gapLitres)}
					{@const up = d.gapLitres > 0}
					<path
						class="arrow {d.band ? TONE[d.band.key] : ''}"
						d="M{xAt(i) - 4},{up ? GAP.top + 6 : GAP.bottom - 6}l4,{up ? -6 : 6}l4,{up ? 6 : -6}z"
					/>
					<text
						class="off"
						x={Math.min(Math.max(xAt(i), 26), viewW - 26)}
						y={up ? GAP.top + 16 : GAP.bottom - 10}>{formatSigned(d.gapLitres)}</text
					>
				{:else}
					<circle class="head {d.band ? TONE[d.band.key] : ''}" cx={xAt(i)} cy={gAt(d.gapLitres)} r="3" />
				{/if}
			{/each}

			<!-- ===== Scrub line: always there, dragged to any day ===== -->
			{#if shown}
				{@const sx = xAt(at)}
				<line class="scrub" x1={sx} x2={sx} y1={2 + LABEL_H} y2={GAP.bottom + 2} />
				<circle class="focus" cx={sx} cy={yAt(shown.litres)} r="4.5" />
				{#if shownDip}
					<circle class="focus-gap" cx={sx} cy={gAt(shownDip.gapLitres)} r="5" />
				{/if}
				{@const text = `${isToday ? 'Today' : fmtDayMonth(shown.date)} · ${formatWholeLitres(shown.litres)} L`}
				{@const lw = text.length * 6.1 + 18}
				{@const lx = Math.min(Math.max(sx - lw / 2, 2), viewW - lw - 2)}
				<g class="tag">
					<rect x={lx} y="2" width={lw} height={LABEL_H} rx={LABEL_H / 2} />
					<text x={lx + lw / 2} y={2 + LABEL_H / 2 + 4}>{text}</text>
				</g>
				<g
					class="handle"
					class:active={dragging}
					transform="translate({Math.min(Math.max(sx, 12), viewW - 12)}, {GAP.bottom + 3})"
				>
					<rect x="-11" y="0" width="22" height="12" rx="6" />
					<path d="M-3,3.5v5M0,3.5v5M3,3.5v5" />
				</g>
			{/if}
		</svg>
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

	/* ---- Slots: fixed positions, fixed height ---- */
	.slots {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr)) 3.75rem;
		align-items: center;
		column-gap: 0.5rem;
		height: 2.75rem;
		margin-bottom: 0.25rem;
		font-variant-numeric: tabular-nums;
	}

	.slot {
		display: grid;
		min-width: 0;
	}

	.s-k {
		font-size: 0.625rem;
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--gray-400);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.s-v {
		font-size: 0.9375rem;
		font-weight: 700;
		font-stretch: var(--figure-stretch);
		color: var(--gray-800);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.s-v.in,
	.s-v.good {
		color: #1f6b3a;
	}

	.s-v.warn {
		color: #b45309;
	}

	.s-v.bad {
		color: var(--error);
	}

	.to-today {
		justify-self: end;
		padding: 0.25rem 0.625rem;
		border: 0;
		border-radius: var(--radius-full);
		background: var(--gray-900);
		color: var(--white);
		font: inherit;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
	}

	.to-today.hidden {
		visibility: hidden;
	}

	/* ---- Plot ---- */
	.plot {
		overflow: hidden;
	}

	svg {
		display: block;
		/* Horizontal drags move the scrub line; vertical swipes scroll the page. */
		touch-action: pan-y;
		cursor: ew-resize;
		user-select: none;
		-webkit-user-select: none;
	}

	.sep {
		stroke: var(--gray-300);
		stroke-width: 1;
		stroke-dasharray: 1 3;
	}

	.month {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		fill: var(--gray-400);
		text-anchor: middle;
	}

	.low {
		stroke: var(--error);
		stroke-opacity: 0.35;
		stroke-dasharray: 4 4;
	}

	.low-label {
		font-size: 9px;
		font-weight: 600;
		fill: var(--error);
		fill-opacity: 0.65;
		text-anchor: end;
	}

	.book {
		fill: none;
		stroke: var(--brand);
		stroke-width: 2.25;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.rise {
		stroke: var(--success);
		stroke-width: 2.75;
		stroke-linecap: round;
	}

	.pill {
		fill: #e7f4ea;
		stroke: #b9dcc4;
		stroke-width: 1;
	}

	.pill-text {
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
		stroke-width: 1.25;
		stroke-dasharray: 2 2;
		stroke: var(--gray-500);
	}

	.dip,
	.head {
		stroke: var(--white);
		stroke-width: 1.5;
		fill: var(--gray-600);
	}

	.stem.good,
	.lolly.good {
		stroke: var(--success);
	}
	.stem.warn,
	.lolly.warn {
		stroke: var(--warning);
	}
	.stem.bad,
	.lolly.bad {
		stroke: var(--error);
	}

	.dip.good,
	.head.good,
	.arrow.good {
		fill: var(--success);
	}
	.dip.warn,
	.head.warn,
	.arrow.warn {
		fill: var(--warning);
	}
	.dip.bad,
	.head.bad,
	.arrow.bad {
		fill: var(--error);
	}

	.now {
		fill: var(--brand);
		stroke: var(--white);
		stroke-width: 2;
	}

	.tol {
		fill: #e3f1e7;
		opacity: 0.75;
	}

	.zero {
		stroke: #b9dcc4;
	}

	.track-label {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		fill: var(--gray-400);
	}

	.lolly {
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke: var(--gray-500);
	}

	.off {
		font-size: 9px;
		font-weight: 700;
		fill: var(--error);
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
		paint-order: stroke;
		stroke: var(--white);
		stroke-width: 3px;
	}

	.scrub {
		stroke: var(--gray-900);
		stroke-opacity: 0.5;
		stroke-width: 1;
	}

	.focus {
		fill: var(--white);
		stroke: var(--gray-900);
		stroke-width: 2.25;
	}

	.focus-gap {
		fill: none;
		stroke: var(--gray-900);
		stroke-width: 1.5;
	}

	.tag rect {
		fill: var(--gray-900);
	}

	.tag text {
		font-size: 11px;
		font-weight: 700;
		fill: var(--white);
		text-anchor: middle;
		font-variant-numeric: tabular-nums;
	}

	.handle rect {
		fill: var(--gray-900);
	}

	.handle path {
		stroke: var(--white);
		stroke-width: 1;
		stroke-linecap: round;
		stroke-opacity: 0.8;
	}

	.handle.active rect {
		fill: var(--brand);
	}
</style>
