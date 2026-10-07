<script lang="ts">
	/**
	 * Step 2 — close the tank for the month.
	 *
	 * Opening (the previous close's carried-forward book) + deliveries −
	 * dispensed to the dip, against the dip: the gap is the leak check the
	 * close signs off. Closing writes a tank_reconciliations row dated the
	 * month's last day (the PDF looks rows up by that date — keep it stable).
	 *
	 * The book carries forward rather than resetting to the dip, so the gap
	 * accumulates and stays readable as a leak signal. Re-baseline is the
	 * deliberate, logged exception. See $lib/utils/tank-balance.
	 */
	import supabaseService from '$lib/services/supabase';
	import { markFuelDataStale } from '$lib/stores/freshness';
	import { toast } from '$lib/stores/toast';
	import BulletGap from '$lib/components/charts/BulletGap.svelte';
	import { fmtDayMonth, fmtFull, type MonthOption } from '$lib/utils/dates';
	import { formatSigned, formatWholeLitres, formatNumber } from '$lib/utils/formatting';
	import { carryForwardRebaselined, type MonthCloseData } from '$lib/utils/tank-balance';

	interface Props {
		month: MonthOption;
		data: MonthCloseData | null;
		toleranceL: number;
		/** Reload the page's data after a close. */
		onrefresh: () => Promise<void>;
	}

	let { month, data, toleranceL, onrefresh }: Props = $props();

	let note = $state('');
	let rebaseline = $state(false);
	let closing = $state(false);

	// A new month starts with a clean form.
	$effect(() => {
		void month.key;
		note = '';
		rebaseline = false;
	});

	let ledger = $derived(data?.ledger ?? null);
	let gap = $derived(ledger?.variance?.litres ?? null);
	let gapPct = $derived(ledger?.variance?.pct ?? null);
	let band = $derived(ledger?.band ?? null);
	let carryForward = $derived(
		ledger ? (rebaseline ? carryForwardRebaselined(ledger) : ledger.bookMonthEnd) : null
	);
	let existing = $derived(data?.existingClose ?? null);
	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	const L1 = (v: number) => formatNumber(v, 1);

	async function close() {
		if (!data || !ledger?.dip || gap === null || carryForward === null) return;
		if (rebaseline && !note.trim()) return;

		const action = rebaseline ? 'Re-baseline and close' : existing ? 'Update the close for' : 'Close';
		const pctText = gapPct !== null ? ` (${formatSigned(gapPct, 2)}%)` : '';
		const confirmed = confirm(
			`${action} ${month.label}?\n\n` +
				`Book at dip ${L1(ledger.bookAtDip)} L vs dip ${L1(ledger.dip.litres)} L = gap ${formatSigned(gap, 1)} L${pctText}.\n\n` +
				(rebaseline
					? `RE-BASELINE: writes off ${formatSigned(gap, 1)} L. The book resets to the dip and the standing gap starts again from zero.\n\n`
					: '') +
				`Carried forward: ${L1(carryForward)} L.`
		);
		if (!confirmed) return;

		closing = true;
		try {
			const opening =
				ledger.opening.source === 'close'
					? `opening carried from ${ledger.opening.date} close: ${L1(ledger.opening.value)} L`
					: `opening from dip ${ledger.opening.date}: ${L1(ledger.opening.value)} L (no earlier close)`;
			const composedNote =
				`${month.label} close · ${opening}` +
				(rebaseline ? ` · RE-BASELINED to the dip, writing off ${formatSigned(gap, 1)} L` : '') +
				` · gap at dip ${ledger.dip.date}: ${formatSigned(gap, 1)} L${pctText}` +
				` · deliveries ${L1(ledger.deliveriesToDip + ledger.deliveriesAfterDip)} L` +
				` · dispensed ${L1(ledger.dispensedToDip + ledger.dispensedAfterDip)} L` +
				` · meter ${L1(data.bowserStart)} → ${L1(data.bowserEnd)} L` +
				(note.trim() ? ` · ${note.trim()}` : '');

			const payload = {
				reconciliationDate: month.monthEnd,
				// What next month opens from
				calculatedLevel: Math.round(carryForward * 10) / 10,
				measuredLevel: ledger.dip.litres,
				// The gap's numerator, so the stored gap is unambiguous
				bookAtDip: Math.round(ledger.bookAtDip * 10) / 10,
				dipDate: ledger.dip.date,
				isRebaseline: rebaseline,
				// Signed off on the gap at the dip, banded with the shared tolerance
				accepted: band?.key !== 'high',
				notes: composedNote
			};

			const result = existing
				? await supabaseService.updateTankReconciliation(existing.id, payload)
				: await supabaseService.createTankReconciliation(payload);
			if (result.error) throw new Error(result.error);

			const message = rebaseline
				? `${month.label} re-baselined`
				: `${month.label} ${existing ? 'close updated' : 'closed'} — gap ${formatSigned(gap)} L`;
			markFuelDataStale(); // tank balance + sidebar pick up the new anchor
			await onrefresh();
			note = '';
			rebaseline = false;
			toast.success(message);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'The close was not recorded');
		} finally {
			closing = false;
		}
	}
</script>

{#if existing}
	<p class="closed {existing.is_rebaseline ? '' : existing.accepted === false ? 'warn' : 'good'}">
		<span class="ic">{existing.is_rebaseline ? '⟲' : existing.accepted === false ? '!' : '✓'}</span>
		{existing.is_rebaseline ? 'Re-baselined' : 'Closed'}
		{fmtFull(existing.created_at.slice(0, 10))} · carried {formatWholeLitres(existing.calculated_level)} L
	</p>
{/if}

{#if !ledger}
	<p class="ui-muted">Nothing to open from: no earlier close and no dip before {month.label}.</p>
{:else if !ledger.dip}
	<div class="waiting">
		<p>
			<span class="ui-label">Book so far</span>
			<span class="ui-figure so-far">{formatWholeLitres(ledger.bookAtDip)}<small>L</small></span>
		</p>
		<p class="ui-muted">Opening {formatWholeLitres(ledger.opening.value)} · {fmtDayMonth(ledger.opening.date)} {ledger.opening.source}</p>
	</div>
{:else}
	<div class="gap-row">
		<div>
			<p class="ui-label">Gap at the dip</p>
			<p class="ui-figure gap {band ? TONE[band.key] : ''}">
				{formatSigned(gap)}<small>L</small>
			</p>
		</div>
		{#if band}<span class="ui-pill {TONE[band.key]}">{band.label}</span>{/if}
	</div>
	<BulletGap gap={gap ?? 0} measured={ledger.dip.litres} {toleranceL} labels />

	<dl class="ledger">
		<div>
			<dt>Opening <small>{fmtDayMonth(ledger.opening.date)} {ledger.opening.source}</small></dt>
			<dd>{formatWholeLitres(ledger.opening.value)}</dd>
		</div>
		<div>
			<dt>Deliveries <small>to {fmtDayMonth(ledger.dip.date)}</small></dt>
			<dd class="in">+{formatWholeLitres(ledger.deliveriesToDip)}</dd>
		</div>
		<div>
			<dt>Dispensed <small>to {fmtDayMonth(ledger.dip.date)}</small></dt>
			<dd>−{formatWholeLitres(ledger.dispensedToDip)}</dd>
		</div>
		<div class="sum">
			<dt>Book at dip</dt>
			<dd>{formatWholeLitres(ledger.bookAtDip)}</dd>
		</div>
		<div>
			<dt>Dip <small>{fmtDayMonth(ledger.dip.date)}</small></dt>
			<dd>{formatWholeLitres(ledger.dip.litres)}</dd>
		</div>
		{#if ledger.deliveriesAfterDip > 0 || ledger.dispensedAfterDip > 0}
			<div>
				<dt>After the dip <small>to month end</small></dt>
				<dd>{formatSigned(ledger.netAfterDip)}</dd>
			</div>
		{/if}
		<div class="sum" class:rebased={rebaseline}>
			<dt>{rebaseline ? 'Carried forward (re-baselined)' : 'Carried forward'}</dt>
			<dd>{carryForward !== null ? formatWholeLitres(carryForward) : '—'}</dd>
		</div>
	</dl>

	{#if data && data.bowserStart > 0}
		<p class="meter ui-muted">
			Meter {formatWholeLitres(data.bowserStart)} → {formatWholeLitres(data.bowserEnd)} ·
			+{formatWholeLitres(data.bowserEnd - data.bowserStart)} this month
		</p>
	{/if}

	<label class="rebase" class:on={rebaseline}>
		<input type="checkbox" bind:checked={rebaseline} />
		<span>
			Re-baseline to the dip
			<small>Writes off {formatSigned(gap)} L and restarts the gap. Only when it is no longer credible.</small>
		</span>
	</label>

	<div class="act">
		<input
			class="note"
			type="text"
			placeholder={rebaseline ? 'Reason (required)' : 'Note (optional)'}
			bind:value={note}
			maxlength="200"
		/>
		<button
			class="ui-btn primary"
			onclick={close}
			disabled={closing || (rebaseline && !note.trim())}
		>
			{closing
				? 'Recording…'
				: rebaseline
					? 'Re-baseline'
					: existing
						? 'Update close'
						: `Close ${month.shortLabel}`}
		</button>
	</div>
{/if}

<style>
	p {
		margin: 0;
	}

	.closed {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--gray-50);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
	}

	.closed.good {
		background: #ecf6ef;
		color: #1f6b3a;
	}

	.closed.warn {
		background: #fdf3e2;
		color: #8a4b08;
	}

	.waiting {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.waiting p:first-child {
		display: grid;
		gap: 0.25rem;
	}

	.so-far {
		font-size: 1.5rem;
	}

	.gap-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 0.625rem;
	}

	.gap {
		font-size: 2rem;
		margin-top: 0.25rem;
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

	.ledger {
		margin: 0.875rem 0 0;
		display: grid;
	}

	.ledger div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.375rem 0;
		border-top: 1px solid var(--gray-100);
		font-size: var(--text-sm);
	}

	.ledger dt small {
		color: var(--gray-400);
		margin-left: 0.25rem;
	}

	.ledger dd {
		margin: 0;
		font-weight: var(--font-weight-semibold);
		font-variant-numeric: tabular-nums;
	}

	.ledger .in {
		color: #1f6b3a;
	}

	.ledger .sum {
		font-weight: 700;
		border-top-color: var(--gray-300);
	}

	.ledger .sum dd {
		font-weight: 800;
	}

	.ledger .rebased dd {
		color: #8a4b08;
	}

	.meter {
		margin-top: 0.5rem;
		font-size: var(--text-xs);
	}

	.rebase {
		display: flex;
		gap: 0.625rem;
		align-items: flex-start;
		margin-top: 0.875rem;
		padding: 0.625rem 0.75rem;
		border: 1px dashed var(--gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
	}

	.rebase.on {
		border-style: solid;
		border-color: var(--warning);
		background: #fdf3e2;
	}

	.rebase small {
		display: block;
		font-weight: 400;
		color: var(--gray-500);
		margin-top: 0.125rem;
	}

	.rebase input {
		margin-top: 0.2rem;
		accent-color: var(--brand);
	}

	.act {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.note {
		flex: 1;
		min-width: 0;
		padding: 0.5625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font: inherit;
		font-size: var(--text-sm);
	}

	.note:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}
</style>
