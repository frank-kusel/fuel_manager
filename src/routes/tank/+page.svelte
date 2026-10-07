<script lang="ts">
	import { onMount } from 'svelte';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import TankRefillModal from '$lib/components/modals/TankRefillModal.svelte';
	import {
		dashboardInsightsStore,
		insightsData,
		insightsLoading
	} from '$lib/stores/dashboard-insights';
	import { onVisible } from '$lib/stores/freshness';
	import { daysBetween, fmtDayMonth, fmtFull, todayIso } from '$lib/utils/dates';
	import {
		bandVariance,
		dipAgeDays,
		isDipStale,
		varianceTrend,
		type CloseRow
	} from '$lib/utils/tank-balance';

	let showDipModal = $state(false);
	let showRefillModal = $state(false);
	let recentDips = $state<{ reading_value: number; reading_date: string }[]>([]);
	let recentRefills = $state<
		{ litres_added: number; delivery_date: string; supplier: string | null; invoice_number: string | null }[]
	>([]);
	let closes = $state<CloseRow[]>([]);
	// Until the first fetch lands, an empty list means "not loaded", not "none".
	let historyLoaded = $state(false);

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	function signed(value: number): string {
		return `${value > 0 ? '+' : ''}${nf.format(Math.round(value))}`;
	}

	async function loadHistory() {
		const { default: supabaseService } = await import('$lib/services/supabase');
		await supabaseService.init();
		const client = supabaseService.getClient();
		const [dips, refills, history] = await Promise.all([
			client
				.from('tank_readings')
				.select('reading_value, reading_date')
				.eq('reading_type', 'dipstick')
				.order('reading_date', { ascending: false })
				.limit(5),
			client
				.from('tank_refills')
				.select('litres_added, delivery_date, supplier, invoice_number')
				.order('delivery_date', { ascending: false })
				.limit(5),
			supabaseService.getTankCloseHistory(24)
		]);
		recentDips = dips.data || [];
		recentRefills = refills.data || [];
		closes = (history.data || []) as CloseRow[];
		historyLoaded = true;
	}

	function ago(iso: string): string {
		const d = daysBetween(iso, todayIso());
		return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
	}

	onMount(() => {
		dashboardInsightsStore.load();
		loadHistory();
		// Returning to a stale tab: TTL-respecting silent refresh
		return onVisible(() => dashboardInsightsStore.load());
	});

	function refreshAll() {
		dashboardInsightsStore.load(true);
		loadHistory();
	}

	let tank = $derived($insightsData?.tank ?? null);
	let anchor = $derived(tank?.anchor ?? null);

	let tankPct = $derived.by(() => {
		if (!tank || tank.derivedLevel === null || !tank.capacity) return null;
		return Math.max(0, Math.min(100, (tank.derivedLevel / tank.capacity) * 100));
	});

	let dipAge = $derived(dipAgeDays(tank?.lastDipDate ?? null));

	/**
	 * Dipstick graduations: a minor mark every 1/24 of capacity, a labelled
	 * major mark every quarter. Fixed geometry, so the scale reads the same
	 * whatever the tank size.
	 */
	let scaleTicks = $derived.by(() => {
		if (!tank?.capacity) return [];
		return Array.from({ length: 25 }, (_, i) => ({
			pct: (i / 24) * 100,
			major: i % 6 === 0,
			litres: Math.round((tank!.capacity! * i) / 24)
		}));
	});

	/**
	 * The accuracy answer. The book is anchored to the last close, so a dip taken
	 * since then is an independent check rather than a new starting point — this
	 * is what says whether the number on screen can be trusted.
	 */
	let dipBand = $derived.by(() => {
		const check = tank?.dipCheck;
		if (!check) return null;
		return bandVariance(check.varianceLitres, check.dipLitres);
	});

	let trend = $derived(varianceTrend(closes));
</script>

<svelte:head>
	<title>Tank - FarmTrack</title>
</svelte:head>

<div class="tank-page">
	<div class="page-header">
		<h1>Tank</h1>
		<p>Book balance, physical dips, and deliveries</p>
	</div>

	{#if $insightsLoading && !tank}
		<div class="skeleton" style="height: 10rem"></div>
	{:else if tank}
		<!-- Book balance hero -->
		<section class="panel hero" class:alert={tank.derivedLevel !== null && tank.derivedLevel <= 0}>
			<div class="hero-top">
				<div>
					<div class="hero-label">{tank.name} book balance</div>
					<div class="hero-value" class:negative={tank.derivedLevel !== null && tank.derivedLevel <= 0}>
						{tank.derivedLevel !== null ? nf.format(Math.round(tank.derivedLevel)) : '—'}<span class="hero-unit">L</span>
					</div>
					{#if tank.runwayDays !== null}
						<div class="hero-sub">About {tank.runwayDays} days left at the recent burn rate</div>
					{/if}
				</div>
				{#if tankPct !== null}
					<div class="hero-cap">
						<span>{Math.round(tankPct)}%</span>
						<small>full</small>
					</div>
				{/if}
			</div>
			{#if tankPct !== null}
				<!-- Dipstick: the wet length is the book balance -->
				<div class="dipstick" role="img" aria-label="{Math.round(tankPct)}% of {nf.format(tank.capacity ?? 0)} litres">
					<div class="stick">
						<div class="wet" class:low={tankPct < 15} style="width: {tankPct}%"></div>
					</div>
					<div class="grads" aria-hidden="true">
						{#each scaleTicks as t}
							<span class="grad" class:major={t.major} style="left: {t.pct}%">
								{#if t.major}<span class="grad-label">{nf.format(t.litres)}</span>{/if}
							</span>
						{/each}
					</div>
				</div>
			{/if}
			<table class="ledger">
				<tbody>
					<tr>
						<td>
							Opening — {anchor?.kind === 'close'
								? `${fmtDayMonth(anchor.date)} close`
								: `dip on ${anchor ? fmtDayMonth(anchor.date) : '—'}`}
						</td>
						<td class="ledger-val">{nf.format(Math.round(anchor?.litres ?? 0))} L</td>
					</tr>
					<tr>
						<td>+ Deliveries since</td>
						<td class="ledger-val">{nf.format(Math.round(tank.refillsSinceDip))} L</td>
					</tr>
					<tr>
						<td>− Dispensed since</td>
						<td class="ledger-val">{nf.format(Math.round(tank.dispensedSinceDip))} L</td>
					</tr>
					<tr class="ledger-total">
						<td>= Book balance</td>
						<td class="ledger-val">{tank.derivedLevel !== null ? nf.format(Math.round(tank.derivedLevel)) : '—'} L</td>
					</tr>
				</tbody>
			</table>
		</section>

		<!--
			Trust line — the accuracy answer. The balance is anchored to the last
			close (the signed-off book), so a dip taken since then is an independent
			check rather than a new starting point.
		-->
		<section
			class="panel trust"
			class:warn={dipBand?.key === 'acceptable' || isDipStale(dipAge)}
			class:bad={dipBand?.key === 'high'}
		>
			<div class="trust-ic">{dipBand?.key === 'high' || isDipStale(dipAge) ? '!' : '✓'}</div>
			<div class="trust-body">
				{#if anchor?.kind === 'close'}
					<div class="trust-t">
						Anchored to the {fmtFull(anchor.date)} close of {nf.format(Math.round(anchor.litres))}&nbsp;L
					</div>
				{:else if anchor}
					<div class="trust-t">
						No month-end close yet — anchored to the dip on {fmtFull(anchor.date)}
					</div>
				{:else}
					<div class="trust-t">Nothing to anchor the book to yet</div>
				{/if}

				<div class="trust-d">
					{#if tank.dipCheck}
						Last dip {dipAge} {dipAge === 1 ? 'day' : 'days'} ago read {nf.format(
							Math.round(tank.dipCheck.dipLitres)
						)} L — <strong class="v {dipBand?.key || ''}"
							>{signed(tank.dipCheck.varianceLitres)} L</strong
						> vs book{#if tank.dipCheck.variancePct !== null}&nbsp;({nf1.format(
								tank.dipCheck.variancePct
							)}%){/if}{#if dipBand?.key === 'good'}, within dipstick tolerance{/if}.
					{:else if isDipStale(dipAge)}
						Last dip is {dipAge} days old — take a fresh one to check the book.
					{:else if dipAge !== null}
						Last dip was {dipAge} {dipAge === 1 ? 'day' : 'days'} ago, before this anchor.
					{:else}
						No dipstick reading on record.
					{/if}
				</div>

				{#if trend.latestGapLitres !== null && trend.months > 1}
					{@const driftText =
						trend.driftLitres !== null ? `, drift ${signed(trend.driftLitres)} L` : ''}
					<div class="trust-trend">
						<span>
							Standing gap {signed(trend.latestGapLitres)} L across {trend.months} closes{driftText}
						</span>
						{#if trend.anyApproximate}
							<span
								class="approx"
								title="Derived from the legacy variance column, which folds post-dip movements into the difference"
								>approx.</span
							>
						{/if}
						<a href="/audit">See the leak trend</a>
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<!-- No close and no dip yet: nothing to anchor a book to. -->
		<section class="panel empty-state">
			<p>Record your first dip to start the book.</p>
		</section>
	{/if}

		<!-- Actions: always available — the first dip is how a fresh tank starts. -->
		<div class="actions">
			<button class="action-btn primary" onclick={() => (showDipModal = true)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V6M8 10l4-4 4 4"/><path d="M5 20h14"/></svg>
				Record dip
			</button>
			<button class="action-btn" onclick={() => (showRefillModal = true)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12m0 0l-4-4m4 4l4-4"/><path d="M5 20h14"/></svg>
				Record delivery
			</button>
		</div>

		<!-- History -->
		<div class="two-col">
			<section class="panel">
				<h2 class="panel-title">Recent dips</h2>
				{#if !historyLoaded}
					<div class="hist-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
				{:else if recentDips.length === 0}
					<p class="empty-note">No dipstick readings yet.</p>
				{:else}
					<table class="hist-table">
						<tbody>
							{#each recentDips as dip}
								<tr>
									<td class="hist-date">
										{fmtFull(dip.reading_date)}
										<span class="hist-sub">{ago(dip.reading_date)}</span>
									</td>
									<td class="hist-val">{nf.format(Math.round(dip.reading_value))} L</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>

			<section class="panel">
				<h2 class="panel-title">Recent deliveries</h2>
				{#if !historyLoaded}
					<div class="hist-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
				{:else if recentRefills.length === 0}
					<p class="empty-note">No deliveries recorded yet.</p>
				{:else}
					<table class="hist-table">
						<tbody>
							{#each recentRefills as r}
								<tr>
									<td class="hist-date">
										{fmtFull(r.delivery_date)}
										<span class="hist-sub">{r.supplier?.trim() || 'No supplier'}, {r.invoice_number ? `inv. ${r.invoice_number}` : 'no invoice number'}</span>
									</td>
									<td class="hist-val">+{nf.format(Math.round(r.litres_added))} L</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		</div>
</div>

<DipstickModal bind:show={showDipModal} onClose={() => (showDipModal = false)} onSuccess={refreshAll} />
<TankRefillModal bind:show={showRefillModal} onClose={() => (showRefillModal = false)} onSuccess={refreshAll} />

<style>
	.empty-state p {
		margin: 0;
		color: var(--text-secondary, #57534e);
	}

	.tank-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 0.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
	}

	.page-header p {
		margin: 0.25rem 0 0;
		color: var(--gray-500);
		font-size: var(--text-base);
	}

	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		margin: 0 0 0.75rem;
	}

	/* Hero */
	.hero.alert {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.hero-label {
		font-size: var(--text-sm);
		color: var(--gray-500);
	}

	.hero-value {
		font-size: 3.25rem;
		font-weight: 750;
		font-stretch: var(--figure-stretch);
		color: var(--gray-900);
		line-height: 1;
		margin-top: 0.25rem;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	.hero-value.negative {
		color: var(--error);
	}

	.hero-unit {
		font-size: 1.25rem;
		color: var(--gray-400);
		margin-left: 0.25rem;
		font-weight: var(--font-weight-semibold);
	}

	.hero-sub {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-top: 0.25rem;
	}

	.hero-cap {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.hero-cap span {
		display: block;
		font-size: 1.75rem;
		line-height: 1;
		font-weight: 750;
		font-stretch: var(--figure-stretch);
		color: var(--brand);
	}

	.hero-cap small {
		display: block;
		font-size: var(--text-sm);
		color: var(--gray-500);
	}

	/* ---- Dipstick ---- */
	.dipstick {
		margin: 1.25rem 0 0.25rem;
		padding-bottom: 1.4rem; /* room for the graduation labels */
		position: relative;
	}

	.stick {
		height: 14px;
		background: var(--gray-100);
		border: 1px solid var(--gray-300);
		border-radius: 3px;
		overflow: hidden;
	}

	.wet {
		height: 100%;
		background: var(--brand);
		transition: width 0.5s ease;
	}

	.wet.low {
		background: var(--error);
	}

	.grads {
		position: absolute;
		left: 0;
		right: 0;
		top: 14px;
		height: 1.4rem;
	}

	.grad {
		position: absolute;
		top: 0;
		width: 1px;
		height: 5px;
		background: var(--gray-400);
		transform: translateX(-0.5px);
	}

	.grad.major {
		height: 9px;
		background: var(--gray-700);
	}

	.grad-label {
		position: absolute;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.6875rem;
		font-stretch: var(--figure-stretch);
		color: var(--gray-500);
		white-space: nowrap;
	}

	.grad:first-child .grad-label {
		left: 0;
		transform: none;
	}

	.grad:last-child .grad-label {
		left: auto;
		right: 0;
		transform: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.wet {
			transition: none;
		}
	}

	/* Derivation ledger */
	.ledger {
		width: 100%;
		margin-top: 0.75rem;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--gray-600);
	}

	.ledger td {
		padding: 0.3rem 0;
		border-bottom: 1px dashed var(--gray-200);
	}

	.ledger-val {
		text-align: right;
		white-space: nowrap;
	}

	.ledger-total td {
		border-bottom: none;
		border-top: 1.5px solid var(--gray-300);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	/* Reconciliation banner */
	/* Trust line — anchor, dip check, standing gap */
	.trust {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.trust-ic {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		background: #dcfce7;
		color: var(--success-dark);
	}

	.trust.warn .trust-ic {
		background: #fef3c7;
		color: var(--warning-dark);
	}

	.trust.bad .trust-ic {
		background: #fee2e2;
		color: var(--danger-dark, #991b1b);
	}

	.trust-body {
		min-width: 0;
	}

	.trust-t {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		font-size: var(--text-sm);
	}

	.trust-d {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-top: 0.125rem;
		line-height: 1.45;
	}

	.trust-d .v {
		font-variant-numeric: tabular-nums;
		color: var(--gray-700);
	}

	.trust-d .v.acceptable {
		color: var(--warning-dark);
	}

	.trust-d .v.high {
		color: var(--danger-dark, #991b1b);
	}

	.trust-trend {
		margin-top: 0.4rem;
		font-size: var(--text-xs);
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
	}

	.trust-trend .approx {
		font-style: italic;
		opacity: 0.75;
	}

	.trust-trend a {
		color: var(--brand);
		text-decoration: none;
		margin-left: 0.35rem;
		white-space: nowrap;
	}

	.trust-trend a:hover {
		text-decoration: underline;
	}

	/* Actions */
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 3rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--gray-300);
		background: var(--white);
		color: var(--gray-700);
		font-size: var(--text-base);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.action-btn:hover {
		border-color: var(--gray-400);
		background: var(--gray-50);
	}

	.action-btn.primary {
		background: var(--brand);
		border-color: var(--brand);
		color: #fff;
	}

	.action-btn.primary:hover {
		background: var(--brand-hover);
		border-color: var(--brand-hover);
	}

	/* History */
	.two-col {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.875rem;
	}

	.hist-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.hist-table td {
		padding: 0.45rem 0;
		border-bottom: 1px solid var(--gray-100);
	}

	.hist-table tr:last-child td {
		border-bottom: none;
	}

	.hist-date {
		color: var(--gray-700);
	}

	.hist-sub {
		display: block;
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.hist-val {
		text-align: right;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		white-space: nowrap;
	}

	.hist-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.hist-skeleton span {
		height: 1.6rem;
		border-radius: var(--radius-md);
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0;
	}

	.skeleton {
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-lg);
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Desktop: balance on the left; what to do about it on the right */
	@media (min-width: 1100px) {
		.tank-page {
			max-width: 1180px;
			display: grid;
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
			grid-template-areas:
				'head head'
				'hero actions'
				'hero trust'
				'hist hist';
			grid-template-rows: auto auto 1fr auto;
			gap: 1rem;
		}

		.page-header {
			grid-area: head;
		}

		.hero {
			grid-area: hero;
		}

		.actions {
			grid-area: actions;
		}

		.trust {
			grid-area: trust;
		}

		.two-col {
			grid-area: hist;
			gap: 1rem;
		}

		.panel {
			padding: 1.25rem 1.5rem;
		}
	}

	@media (max-width: 768px) {
		.tank-page {
			padding: 0.5rem;
		}

		.page-header h1 {
			font-size: 1.75rem;
		}

		.hero-value {
			font-size: 2.75rem;
		}

		/* Two buttons side by side at 375px: keep each label on one line */
		.action-btn {
			padding: 0.75rem 0.5rem;
			font-size: 0.9375rem;
			white-space: nowrap;
		}
	}
</style>
