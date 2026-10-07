<script lang="ts">
	/**
	 * The tank right now: the book balance, how far it can be trusted, how it
	 * got here, and the two things you do to it (dip, delivery). Month-end work
	 * — closing, the leak trend — lives on Audit.
	 */
	import { onMount } from 'svelte';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import TankRefillModal from '$lib/components/modals/TankRefillModal.svelte';
	import TankGauge from '$lib/components/charts/TankGauge.svelte';
	import BalanceChart from '$lib/components/charts/BalanceChart.svelte';
	import BulletGap from '$lib/components/charts/BulletGap.svelte';
	import { tankStore, tankData, tankError } from '$lib/stores/tank';
	import { claimSettings } from '$lib/stores/claim-settings';
	import { onVisible } from '$lib/stores/freshness';
	import { fmtDayMonth } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import {
		anchorLabel,
		bandVariance,
		dipAgeDays,
		isDipStale,
		pctFull
	} from '$lib/utils/tank-balance';

	let showDipModal = $state(false);
	let showRefillModal = $state(false);

	onMount(() => {
		tankStore.load();
		return onVisible(() => tankStore.load());
	});

	let tank = $derived($tankData?.insight ?? null);
	let pct = $derived(tank ? pctFull(tank.bookLitres, tank.capacity) : null);
	let dipAge = $derived(dipAgeDays(tank?.lastDipDate ?? null));
	let stale = $derived(isDipStale(dipAge));
	let tolerance = $derived($claimSettings.dipToleranceL);

	/**
	 * The latest book-vs-dip comparison: a dip taken since the anchor if there
	 * is one, otherwise the gap the anchoring close was signed off on.
	 */
	let check = $derived.by(() => {
		if (!tank) return null;
		if (tank.dipCheck)
			return {
				source: `dip ${fmtDayMonth(tank.dipCheck.date)}`,
				book: tank.dipCheck.bookAtDip,
				dip: tank.dipCheck.dipLitres,
				gap: tank.dipCheck.gapLitres
			};
		const a = tank.anchor;
		if (a.kind === 'close' && a.measuredAtClose !== null && a.varianceLitres !== null)
			return {
				source: anchorLabel(a),
				book: a.measuredAtClose + a.varianceLitres,
				dip: a.measuredAtClose,
				gap: a.varianceLitres
			};
		return null;
	});
	let band = $derived(check ? bandVariance(check.gap, check.dip, tolerance) : null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	let dips = $derived(
		($tankData?.recent ?? [])
			.filter((a) => a.kind === 'dip')
			.map((a) => ({ date: a.date, litres: a.litres }))
	);
</script>

<svelte:head>
	<title>Tank - FarmTrack</title>
</svelte:head>

{#snippet actions(sticky: boolean)}
	<div class="ui-actions" class:sticky class:head-actions={!sticky} class:foot-actions={sticky}>
		<button class="ui-btn primary" onclick={() => (showDipModal = true)}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V6M8 10l4-4 4 4M5 20h14" /></svg>
			Record dip
		</button>
		<button class="ui-btn" onclick={() => (showRefillModal = true)}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" /></svg>
			Record delivery
		</button>
	</div>
{/snippet}

<div class="ui-page">
	<div class="ui-head">
		<h1>Tank</h1>
		{@render actions(false)}
	</div>

	{#if $tankError && !$tankData}
		<section class="ui-panel error">
			<p>Couldn't load the tank.</p>
			<button class="ui-btn" onclick={() => tankStore.load(true)}>Retry</button>
		</section>
	{:else if !$tankData}
		<div class="grid">
			<div class="ui-skeleton" style="height: 13rem"></div>
			<div class="ui-skeleton" style="height: 13rem"></div>
		</div>
	{:else if !tank}
		<section class="ui-panel empty">
			<p class="ui-label">Book balance</p>
			<p>No close or dip yet. Record a dip to start the book.</p>
		</section>
	{:else}
		<div class="grid">
			<!-- The balance -->
			<section class="ui-panel hero" class:negative={tank.bookLitres <= 0}>
				<div class="hero-top">
					<div>
						<p class="ui-label">{tank.name} · book balance</p>
						<p class="ui-figure big">{formatWholeLitres(tank.bookLitres)}<small>L</small></p>
					</div>
					<div class="hero-side">
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

				<div class="flow">
					<div>
						<p class="ui-label">Opening</p>
						<p class="flow-v">{formatWholeLitres(tank.anchor.litres)}</p>
						<p class="flow-s">{anchorLabel(tank.anchor)}</p>
					</div>
					<div>
						<p class="ui-label">In</p>
						<p class="flow-v in">+{formatWholeLitres(tank.deliveriesSinceAnchor)}</p>
						<p class="flow-s">deliveries</p>
					</div>
					<div>
						<p class="ui-label">Out</p>
						<p class="flow-v">−{formatWholeLitres(tank.dispensedSinceAnchor)}</p>
						<p class="flow-s">dispensed</p>
					</div>
				</div>
			</section>

			<!-- Can it be trusted? -->
			<section class="ui-panel check">
				<div class="ui-panel-head">
					<p class="ui-label">Book vs dip</p>
					{#if check}<span class="ui-muted src">{check.source}</span>{/if}
				</div>

				{#if check}
					<p class="gap {band ? TONE[band.key] : ''}">
						<span class="ui-figure">{formatSigned(check.gap)}<small>L</small></span>
						<span class="ui-pill {band ? TONE[band.key] : ''}">{band?.label}</span>
					</p>
					<BulletGap gap={check.gap} measured={check.dip} toleranceL={tolerance} labels />
					<dl class="pair">
						<div><dt>Book</dt><dd>{formatWholeLitres(check.book)}</dd></div>
						<div><dt>Dip</dt><dd>{formatWholeLitres(check.dip)}</dd></div>
						<div><dt>Tolerance</dt><dd>±{formatWholeLitres(tolerance)}</dd></div>
					</dl>
				{:else}
					<p class="ui-muted none">No dip to check the book against yet.</p>
				{/if}

				<div class="check-foot">
					{#if dipAge !== null}
						<span class="ui-pill {stale ? 'warn' : 'good'}">
							Dip {dipAge === 0 ? 'today' : `${dipAge} d ago`}{stale ? ' · take a fresh one' : ''}
						</span>
					{:else}
						<span class="ui-pill warn">No dip on record</span>
					{/if}
					<a class="link" href="/audit">Leak trend →</a>
				</div>
			</section>

			<!-- How it got here -->
			<section class="ui-panel chart-panel">
				<div class="ui-panel-head">
					<p class="ui-label">Since the {anchorLabel(tank.anchor)}</p>
					<span class="legend" aria-hidden="true">
						<i class="k-line"></i>Book <i class="k-dip"></i>Dip ±{formatWholeLitres(tolerance)}
						<i class="k-in"></i>Delivery
					</span>
				</div>
				<BalanceChart
					series={$tankData.series}
					{dips}
					capacity={tank.capacity}
					toleranceL={tolerance}
				/>
			</section>

			<!-- What happened -->
			<section class="ui-panel activity">
				<div class="ui-panel-head">
					<p class="ui-label">Dips and deliveries</p>
				</div>
				{#if $tankData.recent.length === 0}
					<p class="ui-muted none">Nothing recorded yet.</p>
				{:else}
					<ul class="ui-rows">
						{#each $tankData.recent as row, i (i)}
							<li>
								<span class="when">{fmtDayMonth(row.date)}</span>
								<span class="what">
									{row.kind === 'dip' ? 'Dip' : 'Delivery'}
									{#if row.kind === 'delivery'}
										<small
											>{row.supplier ?? ''}{row.invoice ? ` · ${row.invoice}` : ' · no invoice'}</small
										>
									{/if}
								</span>
								<span class="val" class:in={row.kind === 'delivery'}>
									{row.kind === 'delivery' ? '+' : ''}{formatWholeLitres(row.litres)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	{/if}

	{@render actions(true)}
</div>

<DipstickModal bind:show={showDipModal} onClose={() => (showDipModal = false)} />
<TankRefillModal bind:show={showRefillModal} onClose={() => (showRefillModal = false)} />

<style>
	.grid {
		display: grid;
		gap: 0.875rem;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	/* Actions: in the header from tablet up, a sticky bar on phones */
	.head-actions {
		display: none;
	}

	@media (min-width: 768px) {
		.head-actions {
			display: flex;
		}

		.foot-actions {
			display: none;
		}
	}

	/* ---- Hero ---- */
	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.hero-top p {
		margin: 0;
	}

	.big {
		font-size: clamp(2.5rem, 7vw, 3.25rem);
		margin-top: 0.375rem !important;
	}

	.hero.negative .big {
		color: var(--error);
	}

	.hero-side {
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

	.flow {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-top: 0.5rem;
		padding-top: 0.875rem;
		border-top: 1px solid var(--gray-100);
	}

	.flow p {
		margin: 0;
	}

	.flow-v {
		font-size: 1.125rem;
		font-weight: 700;
		font-stretch: var(--figure-stretch);
		font-variant-numeric: tabular-nums;
		margin-top: 0.125rem !important;
	}

	.flow-v.in {
		color: #1f6b3a;
	}

	.flow-s {
		font-size: var(--text-xs);
		color: var(--gray-400);
	}

	/* ---- Check ---- */
	.src {
		font-size: var(--text-xs);
	}

	.gap {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin: 0 0 0.75rem;
	}

	.gap .ui-figure {
		font-size: 2rem;
	}

	.gap.good .ui-figure {
		color: #1f6b3a;
	}

	.gap.warn .ui-figure {
		color: #8a4b08;
	}

	.gap.bad .ui-figure {
		color: var(--error);
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 0.5rem 0 0;
	}

	.pair dt {
		font-size: var(--text-xs);
		color: var(--gray-400);
	}

	.pair dd {
		margin: 0;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.check-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--gray-100);
	}

	.link {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--brand);
		text-decoration: none;
	}

	.none {
		margin: 0.5rem 0;
		font-size: var(--text-sm);
	}

	/* ---- Chart ---- */
	.legend {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: var(--gray-500);
		white-space: nowrap;
	}

	.legend i {
		display: inline-block;
		margin-left: 0.375rem;
	}

	.k-line {
		width: 12px;
		height: 2px;
		background: var(--brand);
	}

	.k-dip {
		width: 7px;
		height: 7px;
		border: 2px solid var(--gray-900);
		border-radius: 50%;
	}

	.k-in {
		width: 0;
		height: 0;
		border-left: 4px solid transparent;
		border-right: 4px solid transparent;
		border-bottom: 6px solid var(--success);
	}

	@media (max-width: 480px) {
		.legend {
			display: none;
		}
	}

	.empty p,
	.error p {
		margin: 0.25rem 0;
	}

	.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
