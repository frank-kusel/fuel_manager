<script lang="ts">
	/**
	 * The tank: what the book says now, its whole history on one chart, and
	 * the deliveries. Dips appear on the chart against the book line — each
	 * with a ±tolerance bar — so the dip-vs-book check and its drift over time
	 * read straight off it. Closing a month lives on Audit.
	 */
	import { onMount } from 'svelte';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import TankRefillModal from '$lib/components/modals/TankRefillModal.svelte';
	import TankGauge from '$lib/components/charts/TankGauge.svelte';
	import DatabaseLink from '$lib/components/ui/DatabaseLink.svelte';
	import HistoryChart from '$lib/components/charts/HistoryChart.svelte';
	import { tankStore, tankData, tankError } from '$lib/stores/tank';
	import { claimSettings } from '$lib/stores/claim-settings';
	import { onVisible } from '$lib/stores/freshness';
	import { financialYearStart, fmtDayMonth, fmtFull, isoLocal } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import { anchorLabel, dipAgeDays, dipChecks, isDipStale, pctFull } from '$lib/utils/tank-balance';

	let showDipModal = $state(false);
	let showRefillModal = $state(false);
	let showAllDeliveries = $state(false);

	onMount(() => {
		tankStore.load();
		return onVisible(() => tankStore.load());
	});

	let tank = $derived($tankData?.insight ?? null);
	let pct = $derived(tank ? pctFull(tank.bookLitres, tank.capacity) : null);
	let tolerance = $derived($claimSettings.dipToleranceL);
	let checks = $derived($tankData ? dipChecks($tankData.history, $tankData.dips, tolerance) : []);
	let lastCheck = $derived(checks.at(-1) ?? null);
	let lastDip = $derived($tankData?.dips.at(-1) ?? null);
	let dipAge = $derived(dipAgeDays(lastDip?.reading_date ?? null));
	let stale = $derived(isDipStale(dipAge));
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	const seasonStart = isoLocal(financialYearStart());
	let deliveries = $derived($tankData?.deliveries ?? []);
	let seasonDeliveries = $derived(deliveries.filter((d) => d.date >= seasonStart));
	let seasonDelivered = $derived(seasonDeliveries.reduce((s, d) => s + d.litres, 0));
	let shownDeliveries = $derived(showAllDeliveries ? deliveries : deliveries.slice(0, 8));
</script>

<svelte:head>
	<title>Tank - FarmTrack</title>
</svelte:head>

<div class="ui-page">
	<div class="ui-head">
		<h1>Tank</h1>
		<div class="head-tools">
			<!-- Tablet and desktop only: on phones the + button already records both. -->
			<div class="ui-actions head-actions">
				<button class="ui-btn primary" onclick={() => (showDipModal = true)}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M12 20V6M8 10l4-4 4 4M5 20h14" /></svg
					>
					Record dip
				</button>
				<button class="ui-btn" onclick={() => (showRefillModal = true)}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" /></svg
					>
					Record delivery
				</button>
			</div>
			<DatabaseLink />
		</div>
	</div>

	{#if $tankError && !$tankData}
		<section class="ui-panel error">
			<p>Couldn't load the tank.</p>
			<button class="ui-btn" onclick={() => tankStore.load(true)}>Retry</button>
		</section>
	{:else if !$tankData}
		<div class="ui-skeleton" style="height: 11rem"></div>
		<div class="ui-skeleton" style="height: 17rem"></div>
	{:else if !tank}
		<section class="ui-panel">
			<p class="ui-label">Book balance</p>
			<p class="ui-muted">No close or dip yet. Record a dip to start the book.</p>
		</section>
	{:else}
		<!-- Now: the balance, how it got here, and the latest check -->
		<section class="ui-panel hero" class:negative={tank.bookLitres <= 0}>
			<div class="now">
				<div class="top">
					<div>
						<p class="ui-label">{tank.name} · book balance</p>
						<p class="ui-figure big">{formatWholeLitres(tank.bookLitres)}<small>L</small></p>
					</div>
					<div class="side">
						{#if pct !== null}<span class="pct">{Math.round(pct)}<small>%</small></span>{/if}
						{#if tank.runwayDays !== null}
							<span class="ui-pill plain" title="At the last 14 days' burn rate"
								>≈ {tank.runwayDays} days</span
							>
						{/if}
					</div>
				</div>
				{#if tank.capacity}
					<TankGauge litres={tank.bookLitres} capacity={tank.capacity} />
				{/if}
			</div>

			<dl class="facts">
				<div>
					<dt>Opening <small>{anchorLabel(tank.anchor)}</small></dt>
					<dd>{formatWholeLitres(tank.anchor.litres)}</dd>
				</div>
				<div>
					<dt>Delivered</dt>
					<dd class="in">+{formatWholeLitres(tank.deliveriesSinceAnchor)}</dd>
				</div>
				<div>
					<dt>Used</dt>
					<dd>−{formatWholeLitres(tank.dispensedSinceAnchor)}</dd>
				</div>
				<div class="check">
					<dt>
						Last dip
						{#if lastDip}<small
								>{fmtDayMonth(lastDip.reading_date)}{dipAge !== null
									? ` · ${dipAge} d ago`
									: ''}</small
							>{/if}
					</dt>
					<dd>
						{#if lastCheck && lastCheck.date === lastDip?.reading_date}
							<span class="gap {lastCheck.band ? TONE[lastCheck.band.key] : ''}"
								>{formatSigned(lastCheck.gapLitres)}</span
							>
							<span class="ui-muted">vs book</span>
						{:else if lastDip}
							{formatWholeLitres(lastDip.reading_value)}
						{:else}
							—
						{/if}
					</dd>
					{#if stale || dipAge === null}
						<span class="ui-pill warn due">Dip due</span>
					{/if}
				</div>
			</dl>
		</section>

		<!-- History -->
		<section class="ui-panel chart-panel">
			<div class="ui-panel-head">
				<p class="ui-label">History</p>
			</div>
			<HistoryChart
				points={$tankData.history}
				dips={checks}
				closes={$tankData.closes}
				capacity={tank.capacity}
				toleranceL={tolerance}
			/>
			<ul class="legend" aria-hidden="true">
				<li><i class="k-line"></i>Book</li>
				<li><i class="k-in"></i>Delivery</li>
				<li><i class="k-dip"></i>Dip ±{formatWholeLitres(tolerance)} L</li>
				<li><i class="k-close"></i>Close</li>
			</ul>
		</section>

		<!-- Deliveries -->
		<section class="ui-panel">
			<div class="ui-panel-head">
				<p class="ui-label">Deliveries</p>
				<span class="ui-muted season">
					{seasonDeliveries.length} this season · {formatWholeLitres(seasonDelivered)} L
				</span>
			</div>
			{#if deliveries.length === 0}
				<p class="ui-muted">None recorded yet.</p>
			{:else}
				<table class="deliveries">
					<thead>
						<tr><th>Date</th><th class="num">Litres</th><th>Supplier</th><th>Invoice</th></tr>
					</thead>
					<tbody>
						{#each shownDeliveries as d, i (i)}
							<tr>
								<td>{fmtFull(d.date)}</td>
								<td class="num in">+{formatWholeLitres(d.litres)}</td>
								<td class="muted">{d.supplier ?? '—'}</td>
								<td>
									{#if d.invoice}{d.invoice}{:else}<span class="ui-pill warn">none</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if deliveries.length > 8}
					<button class="more" onclick={() => (showAllDeliveries = !showAllDeliveries)}>
						{showAllDeliveries ? 'Show fewer' : `Show all ${deliveries.length}`}
					</button>
				{/if}
			{/if}
		</section>
	{/if}
</div>

<DipstickModal bind:show={showDipModal} onClose={() => (showDipModal = false)} />
<TankRefillModal bind:show={showRefillModal} onClose={() => (showRefillModal = false)} />

<style>
	.head-tools {
		display: flex;
		gap: 0.5rem;
	}

	/* Phones record dips and deliveries from the + button in the bottom nav */
	.head-actions {
		display: none;
	}

	@media (min-width: 768px) {
		.head-actions {
			display: flex;
		}
	}

	/* ---- Hero ---- */
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	@media (min-width: 860px) {
		.hero {
			grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
			gap: 2rem;
			align-items: center;
		}
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.875rem;
	}

	.top p {
		margin: 0;
	}

	.big {
		font-size: clamp(2.5rem, 7vw, 3.25rem);
		margin-top: 0.375rem !important;
	}

	.hero.negative .big {
		color: var(--error);
	}

	.side {
		display: grid;
		justify-items: end;
		gap: 0.375rem;
	}

	.pct {
		font-size: 1.5rem;
		font-weight: 800;
		font-stretch: var(--figure-stretch);
		color: var(--brand);
		line-height: 1;
	}

	.pct small {
		font-size: 0.6em;
	}

	.facts {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.875rem 1rem;
	}

	@media (min-width: 860px) {
		.facts {
			padding-left: 1.5rem;
			border-left: 1px solid var(--gray-100);
		}
	}

	.facts dt {
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.facts dt small {
		color: var(--gray-400);
		margin-left: 0.25rem;
	}

	.facts dd {
		margin: 0.125rem 0 0;
		font-size: 1.25rem;
		font-weight: 700;
		font-stretch: var(--figure-stretch);
		font-variant-numeric: tabular-nums;
	}

	.facts .in {
		color: #1f6b3a;
	}

	.facts .ui-muted {
		font-size: var(--text-xs);
		font-weight: 400;
		font-stretch: normal;
	}

	.gap.good {
		color: #1f6b3a;
	}
	.gap.warn {
		color: #8a4b08;
	}
	.gap.bad {
		color: var(--error);
	}

	.check {
		position: relative;
	}

	.due {
		margin-top: 0.25rem;
	}

	/* ---- Chart ---- */
	.chart-panel .ui-panel-head {
		min-height: 1.75rem;
		align-items: center;
	}

	/* Phones: no card — the chart runs edge to edge on the page background,
	   so none of its width is lost to padding. The side margins cancel the
	   page gutter (main 0.5rem + ui-page 0.25rem). */
	@media (max-width: 639px) {
		.chart-panel {
			margin: 0 -0.75rem;
			padding: 0.5rem 0 0;
			background: none;
			border: 0;
			border-radius: 0;
		}

		.chart-panel .ui-panel-head,
		.chart-panel .legend {
			padding: 0 0.75rem;
		}

		.chart-panel :global(.ranges) {
			right: 0.75rem;
		}
	}

	.legend {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0.5rem 0 0;
		padding: 0;
		font-size: 0.6875rem;
		color: var(--gray-500);
	}

	.legend i {
		display: inline-block;
		margin-right: 0.375rem;
		vertical-align: middle;
	}

	.k-line {
		width: 12px;
		height: 2px;
		background: var(--brand);
	}

	.k-in {
		width: 4px;
		height: 10px;
		border-radius: 2px;
		background: var(--success);
	}

	.k-dip {
		width: 7px;
		height: 7px;
		border: 2px solid var(--gray-900);
		border-radius: 50%;
	}

	.k-close {
		width: 6px;
		height: 6px;
		border: 1.5px solid var(--gray-700);
	}

	/* ---- Deliveries ---- */
	.season {
		font-size: var(--text-xs);
	}

	.deliveries {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.deliveries th {
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		padding: 0 0.5rem 0.375rem 0;
	}

	.deliveries td {
		padding: 0.4375rem 0.5rem 0.4375rem 0;
		border-top: 1px solid var(--gray-100);
		white-space: nowrap;
	}

	.deliveries .num {
		text-align: right;
		padding-right: 1.25rem;
	}

	.deliveries .in {
		color: #1f6b3a;
		font-weight: 700;
	}

	.deliveries .muted {
		color: var(--gray-500);
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 10rem;
	}

	@media (max-width: 520px) {
		.deliveries th:nth-child(3),
		.deliveries td:nth-child(3) {
			display: none;
		}
	}

	.more {
		margin-top: 0.5rem;
		border: 0;
		background: none;
		padding: 0;
		font: inherit;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--brand);
		cursor: pointer;
	}

	.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.error p {
		margin: 0;
	}
</style>
