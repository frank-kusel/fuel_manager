<script lang="ts">
	/**
	 * Month-end close — the tank half of the audit.
	 *
	 * Dip-to-dip: opening (the previous close's carried-forward book) +
	 * deliveries − dispensed, compared against the month's dip. Closing writes a
	 * tank_reconciliations row dated the month's last day (the PDF export looks
	 * rows up by that exact date — keep it stable).
	 *
	 * The book carries forward rather than resetting to the dip, so the gap
	 * between them accumulates and is readable as a leak signal. "Re-baseline"
	 * is the deliberate, logged exception. See $lib/utils/tank-balance.
	 */
	import supabaseService from '$lib/services/supabase';
	import { markFuelDataStale } from '$lib/stores/freshness';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import { fmtDayMonth, fmtFull, type MonthOption } from '$lib/utils/dates';
	import { carryForwardRebaselined, type MonthLedger } from '$lib/utils/tank-balance';

	interface Props {
		month: MonthOption;
		toleranceL?: number;
		/** Fired after a successful close so the page can refresh history/checklist. */
		onclosed?: () => void;
	}

	let { month, toleranceL, onclosed }: Props = $props();

	interface CloseData {
		ledger: MonthLedger | null;
		closingDip: { reading_date: string; reading_value: number | null } | null;
		bowserStart: number;
		bowserEnd: number;
		monthDispensed: number;
		existingClose: any | null;
	}

	const nf1 = new Intl.NumberFormat('en-ZA', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<CloseData | null>(null);
	let note = $state('');
	let closing = $state(false);
	let statusMsg = $state<string | null>(null);
	let showDipModal = $state(false);
	let rebaseline = $state(false);

	let ledger = $derived(data?.ledger ?? null);
	let leakVariance = $derived(ledger?.variance?.litres ?? null);
	let leakPct = $derived(ledger?.variance?.pct ?? null);
	let varianceStatus = $derived(ledger?.band ?? null);
	let meterDiff = $derived(data ? data.bowserEnd - data.bowserStart : 0);
	let carryForward = $derived.by(() => {
		if (!ledger) return null;
		return rebaseline ? carryForwardRebaselined(ledger) : ledger.bookMonthEnd;
	});

	function signed(v: number): string {
		return `${v > 0 ? '+' : ''}${nf1.format(v)}`;
	}

	async function loadMonth() {
		loading = true;
		error = null;
		statusMsg = null;
		note = '';
		rebaseline = false;
		data = null; // never show one month's numbers under another month's title
		try {
			await supabaseService.init();
			const result = await supabaseService.getMonthCloseData(
				month.monthStart,
				month.monthEnd,
				toleranceL
			);
			if (result.error) throw new Error(result.error);
			data = result.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load month data';
			data = null;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		// Re-reads whenever the selected month changes.
		void month.key;
		loadMonth();
	});

	async function closeMonth() {
		if (!data?.closingDip || !ledger || !ledger.dip || leakVariance === null || carryForward === null)
			return;

		const isUpdate = !!data.existingClose;
		const action = rebaseline ? 'Re-baseline and close' : isUpdate ? 'Update the close for' : 'Close';
		const confirmed = confirm(
			`${action} ${month.label}?\n\n` +
				`Leak check at dip (${ledger.dip.date}): book ${nf1.format(ledger.bookAtDip)} L vs dip ${nf1.format(ledger.dip.litres)} L ` +
				`= ${signed(leakVariance)} L (${leakPct !== null ? signed(Math.round(leakPct * 100) / 100) : '—'}%).\n\n` +
				(rebaseline
					? `RE-BASELINE: writing off ${signed(leakVariance)} L. The book resets to the physical count and the standing gap starts again from zero.\n\n`
					: '') +
				`Balance carried forward: ${nf1.format(carryForward)} L.`
		);
		if (!confirmed) return;

		if (rebaseline && !note.trim()) {
			error = 'A re-baseline needs a reason — it writes off the accumulated gap.';
			return;
		}

		closing = true;
		error = null;
		try {
			const openingDesc =
				ledger.opening.source === 'close'
					? `opening carried from ${ledger.opening.date} close: ${nf1.format(ledger.opening.value)} L`
					: `opening from dip ${ledger.opening.date}: ${nf1.format(ledger.opening.value)} L (no earlier close)`;
			const composedNote =
				`${month.label} close · ${openingDesc}` +
				(rebaseline ? ` · RE-BASELINED to the dip, writing off ${signed(leakVariance)} L` : '') +
				` · leak check at dip ${ledger.dip.date}: ${signed(leakVariance)} L (${leakPct !== null ? signed(Math.round(leakPct * 100) / 100) : '—'}%)` +
				` · deliveries ${nf1.format(ledger.deliveriesToDip + ledger.deliveriesAfterDip)} L` +
				` · dispensed ${nf1.format(ledger.dispensedToDip + ledger.dispensedAfterDip)} L` +
				` · meter ${nf1.format(data.bowserStart)} → ${nf1.format(data.bowserEnd)} L` +
				(note.trim() ? ` · ${note.trim()}` : '');

			const payload = {
				reconciliationDate: month.monthEnd,
				// What next month opens from
				calculatedLevel: Math.round(carryForward * 10) / 10,
				measuredLevel: ledger.dip.litres,
				// The leak-check numerator, so the stored variance is unambiguous
				bookAtDip: Math.round(ledger.bookAtDip * 10) / 10,
				dipDate: ledger.dip.date,
				isRebaseline: rebaseline,
				// Sign-off judged on the leak check, not the month-end delta
				accepted: varianceStatus?.key !== 'high',
				notes: composedNote
			};

			const result = data.existingClose
				? await supabaseService.updateTankReconciliation(data.existingClose.id, payload)
				: await supabaseService.createTankReconciliation(payload);
			if (result.error) throw new Error(result.error);

			const doneMsg = rebaseline
				? `${month.label} re-baselined — ${signed(leakVariance)} L written off.`
				: `${month.label} ${data.existingClose ? 'close updated' : 'closed'} — leak check ${signed(leakVariance)} L recorded.`;
			markFuelDataStale(); // tank balance + sidebar strip pick it up
			await loadMonth();
			statusMsg = doneMsg; // loadMonth clears it, so set after the reload
			onclosed?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to record the close';
		} finally {
			closing = false;
		}
	}
</script>

<section class="panel">
	<div class="panel-head">
		<h2 class="panel-title">Close the tank — {month.label}</h2>
		{#if varianceStatus}
			<span class="pill {varianceStatus.key}">{varianceStatus.label}</span>
		{/if}
	</div>

	{#if statusMsg}
		<div class="status-banner">{statusMsg}</div>
	{/if}
	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if loading && !data}
		<div class="skeleton" style="height: 12rem"></div>
	{:else if data}
		{#if data.existingClose}
			<div class="closed-banner">
				<span class="closed-ic">{data.existingClose.is_rebaseline ? '⟲' : '✓'}</span>
				<span>
					{data.existingClose.is_rebaseline ? 'Re-baselined' : 'Closed'} on
					{fmtFull(data.existingClose.created_at.slice(0, 10))} — carried forward
					{nf1.format(data.existingClose.calculated_level ?? 0)} L
				</span>
			</div>
		{/if}

		{#if !ledger}
			<p class="empty-note">
				Nothing to open from — no earlier close and no dipstick reading before {month.label}.
			</p>
		{:else if !ledger.dip}
			<p class="empty-note">
				No dipstick reading recorded in {month.label} — a physical dip is needed to close the month.
			</p>
			<p class="running-note">
				Running book so far: {nf1.format(ledger.bookAtDip)} L (opening
				{nf1.format(ledger.opening.value)} L
				{ledger.opening.source === 'close'
					? 'carried forward'
					: `from dip ${fmtDayMonth(ledger.opening.date)}`})
			</p>
			<button class="dip-btn" onclick={() => (showDipModal = true)}>Record a dip</button>
		{:else}
			<table class="ledger">
				<tbody>
					<tr>
						<td>
							Opening — {ledger.opening.source === 'close'
								? `carried from ${fmtDayMonth(ledger.opening.date)} close`
								: `dip on ${fmtDayMonth(ledger.opening.date)} (no earlier close)`}
						</td>
						<td class="val">{nf1.format(ledger.opening.value)} L</td>
					</tr>
					<tr>
						<td>+ Deliveries (to {fmtDayMonth(ledger.dip.date)})</td>
						<td class="val">{nf1.format(ledger.deliveriesToDip)} L</td>
					</tr>
					<tr>
						<td>− Dispensed (to {fmtDayMonth(ledger.dip.date)})</td>
						<td class="val">{nf1.format(ledger.dispensedToDip)} L</td>
					</tr>
					<tr class="ledger-total">
						<td>= Book at dip, {fmtDayMonth(ledger.dip.date)}</td>
						<td class="val">{nf1.format(ledger.bookAtDip)} L</td>
					</tr>
					<tr>
						<td>Dip on {fmtDayMonth(ledger.dip.date)}</td>
						<td class="val">{nf1.format(ledger.dip.litres)} L</td>
					</tr>
					<tr class="ledger-variance {varianceStatus?.key || ''}">
						<td>Variance — leak check</td>
						<td class="val">
							{leakVariance !== null ? signed(leakVariance) : '—'} L
							{#if leakPct !== null}({signed(Math.round(leakPct * 100) / 100)}%){/if}
						</td>
					</tr>
					{#if ledger.deliveriesAfterDip > 0 || ledger.dispensedAfterDip > 0}
						<tr>
							<td>± Movements after dip ({fmtDayMonth(ledger.dip.date)} → month end)</td>
							<td class="val">{signed(ledger.netAfterDip)} L</td>
						</tr>
					{/if}
					<tr class="ledger-carry" class:rebased={rebaseline}>
						<td>
							= {rebaseline ? 'Re-baselined balance carried forward' : 'Month-end balance carried forward'}
						</td>
						<td class="val">{carryForward !== null ? nf1.format(carryForward) : '—'} L</td>
					</tr>
				</tbody>
			</table>

			{#if data.bowserStart > 0}
				<p class="meter-line">
					Bowser meter {nf1.format(data.bowserStart)} → {nf1.format(data.bowserEnd)} L (+{nf1.format(
						meterDiff
					)} L dispensed this calendar month)
				</p>
			{/if}

			<label class="rebase-toggle" class:on={rebaseline}>
				<input type="checkbox" bind:checked={rebaseline} />
				<span>
					<strong>Re-baseline to the dip</strong>
					<small>
						Writes off {leakVariance !== null ? signed(leakVariance) : '—'} L and restarts the standing
						gap. Use only when the accumulated gap is no longer credible — carrying the book forward
						is what makes a slow leak visible.
					</small>
				</span>
			</label>

			<div class="close-actions">
				<input
					class="note-input"
					type="text"
					placeholder={rebaseline ? 'Reason for the re-baseline (required)' : 'Optional note (e.g. reason for variance)'}
					bind:value={note}
					maxlength="200"
				/>
				<button class="close-btn" onclick={closeMonth} disabled={closing}>
					{closing
						? 'Recording…'
						: rebaseline
							? 'Re-baseline'
							: data.existingClose
								? 'Update close'
								: `Close ${month.shortLabel}`}
				</button>
			</div>
		{/if}
	{/if}
</section>

<DipstickModal
	bind:show={showDipModal}
	onClose={() => (showDipModal = false)}
	onSuccess={() => {
		loadMonth();
		onclosed?.();
	}}
/>

<style>


	/* ---- Month chips (same language as Audit) ---- */
	.chips {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 2px;
	}


	/* ---- Panels ---- */
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}


	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}


	.panel-title {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		margin: 0;
	}


	.panel-head .panel-title {
		font-size: var(--text-base);
		color: var(--gray-900);
	}


	.pill {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
	}


	.pill.good {
		background: #dcfce7;
		color: var(--success-dark);
	}


	.pill.acceptable {
		background: #fef3c7;
		color: #92400e;
	}


	.pill.high {
		background: #fee2e2;
		color: #991b1b;
	}


	.closed-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--success-dark);
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
	}


	.closed-ic {
		font-weight: var(--font-weight-bold);
	}


	/* ---- Ledger (same pattern as the Tank page) ---- */
	.ledger {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}


	.ledger td {
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--gray-100);
		color: var(--gray-600);
	}


	.ledger .val {
		text-align: right;
		color: var(--gray-800);
		white-space: nowrap;
	}


	.ledger-total td {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		border-top: 2px solid var(--gray-200);
	}


	.ledger-variance td {
		font-weight: var(--font-weight-semibold);
		border-bottom: none;
	}


	.ledger-variance.good td {
		color: var(--success-dark);
	}


	.ledger-variance.acceptable td {
		color: #92400e;
	}


	.ledger-variance.high td {
		color: var(--error);
	}


	.ledger-carry td {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		border-top: 2px solid var(--gray-200);
		border-bottom: none;
	}


	.running-note {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.5rem 0 0;
	}


	.meter-line {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.625rem 0 0;
	}


	/* ---- Actions ---- */
	.close-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.875rem;
		flex-wrap: wrap;
	}


	.note-input {
		flex: 1;
		min-width: 180px;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-700);
		background: var(--gray-50);
	}


	.note-input:focus {
		outline: none;
		border-color: var(--brand-ring);
		background: var(--white);
	}


	.close-btn {
		padding: 0.5rem 1.1rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--brand);
		color: #fff;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
	}


	.close-btn:hover {
		background: var(--brand-hover);
	}


	.close-btn:active {
		background: var(--brand-active);
	}


	.close-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}


	/* ---- History table ---- */
	.table-wrap {
		overflow-x: auto;
	}


	/* ---- States ---- */
	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-400);
		margin: 0;
	}


	.tank-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: var(--text-sm);
		color: var(--brand);
		text-decoration: none;
		font-weight: 500;
	}


	.status-banner {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--success-dark);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
	}


	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
	}
	.dip-btn {
		margin-top: 0.5rem;
		background: var(--brand);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		padding: 0.55rem 1rem;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
	}

	.rebase-toggle {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		margin-top: 0.875rem;
		padding: 0.7rem 0.8rem;
		border: 1px dashed var(--gray-300);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.rebase-toggle.on {
		border-style: solid;
		border-color: #fbbf24;
		background: #fffbeb;
	}

	.rebase-toggle input {
		margin-top: 0.15rem;
		flex-shrink: 0;
	}

	.rebase-toggle strong {
		display: block;
		font-size: var(--text-sm);
		color: var(--gray-900);
		font-weight: var(--font-weight-semibold);
	}

	.rebase-toggle small {
		display: block;
		font-size: var(--text-xs);
		color: var(--gray-500);
		line-height: 1.45;
		margin-top: 0.1rem;
	}

	.ledger-carry.rebased .val {
		color: #92400e;
	}

	.skeleton {
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
		border-radius: var(--radius-md);
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}
</style>
