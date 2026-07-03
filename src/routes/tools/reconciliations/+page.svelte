<script lang="ts">
	import { onMount } from 'svelte';
	import supabaseService from '$lib/services/supabase';

	/**
	 * Month-end close — the monthly reconciliation ritual, dip-to-dip:
	 * opening dip + deliveries − dispensed = book balance, compared against
	 * the closing dip. Closing a month writes a tank_reconciliations row
	 * (reconciliation_date = last day of the month — the PDF export looks
	 * rows up by that exact date, keep it stable).
	 */

	interface MonthOption {
		key: string; // YYYY-MM
		label: string; // "June 2026"
		shortLabel: string; // "Jun"
		monthStart: string;
		monthEnd: string;
	}

	interface CloseData {
		closingDip: { reading_value: number; reading_date: string } | null;
		openingDip: { reading_value: number; reading_date: string } | null;
		deliveries: number;
		dispensed: number;
		bowserStart: number;
		bowserEnd: number;
		monthDispensed: number;
		existingClose: any | null;
	}

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	function buildMonths(): MonthOption[] {
		const now = new Date();
		const months: MonthOption[] = [];
		// Current month first, then back 5 more — newest chip on the left
		for (let i = 0; i < 6; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const y = d.getFullYear();
			const m = d.getMonth() + 1;
			const lastDay = new Date(y, m, 0).getDate();
			months.push({
				key: `${y}-${String(m).padStart(2, '0')}`,
				label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
				shortLabel: d.toLocaleDateString('en-ZA', { month: 'short' }),
				monthStart: `${y}-${String(m).padStart(2, '0')}-01`,
				monthEnd: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
			});
		}
		return months;
	}

	const months = buildMonths();

	// Default to the previous month — that's the one you close
	let selectedKey = $state(months[1].key);
	let selected = $derived(months.find((m) => m.key === selectedKey) ?? months[1]);

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<CloseData | null>(null);
	let history = $state<any[]>([]);
	let note = $state('');
	let closing = $state(false);
	let statusMsg = $state<string | null>(null);

	async function loadMonth() {
		loading = true;
		error = null;
		statusMsg = null;
		note = '';
		data = null; // never show one month's numbers under another month's title
		try {
			await supabaseService.init();
			const result = await supabaseService.getMonthCloseData(
				selected.monthStart,
				selected.monthEnd
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

	async function loadHistory() {
		try {
			await supabaseService.init();
			const result = await supabaseService.getTankCloseHistory(24);
			if (!result.error) history = result.data || [];
		} catch {
			/* history is non-critical */
		}
	}

	onMount(() => {
		loadMonth();
		loadHistory();
	});

	function selectMonth(key: string) {
		if (key === selectedKey) return;
		selectedKey = key;
		loadMonth();
	}

	// ---- Derivation ----
	let book = $derived.by(() => {
		if (!data?.closingDip || !data?.openingDip) return null;
		return data.openingDip.reading_value + data.deliveries - data.dispensed;
	});

	let variance = $derived.by(() => {
		if (book === null || !data?.closingDip) return null;
		return book - data.closingDip.reading_value;
	});

	let variancePct = $derived.by(() => {
		if (variance === null || !data?.closingDip || data.closingDip.reading_value === 0) return null;
		return (variance / data.closingDip.reading_value) * 100;
	});

	let varianceStatus = $derived.by(() => {
		if (variancePct === null) return null;
		const abs = Math.abs(variancePct);
		if (abs <= 2) return { key: 'good', label: 'Good' };
		if (abs <= 5) return { key: 'acceptable', label: 'Acceptable' };
		return { key: 'high', label: 'High variance' };
	});

	let meterDiff = $derived(data ? data.bowserEnd - data.bowserStart : 0);

	function fmtDate(date: string): string {
		return new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short'
		});
	}

	function fmtDateFull(date: string): string {
		return new Date(date).toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function monthLabelFor(recDate: string): string {
		return new Date(recDate + 'T12:00:00').toLocaleDateString('en-ZA', {
			month: 'short',
			year: 'numeric'
		});
	}

	function signed(v: number): string {
		return `${v > 0 ? '+' : ''}${nf1.format(v)}`;
	}

	async function closeMonth() {
		if (!data?.closingDip || !data?.openingDip || book === null || variance === null) return;

		const isUpdate = !!data.existingClose;
		const confirmed = confirm(
			`${isUpdate ? 'Update the close for' : 'Close'} ${selected.label} with a variance of ` +
				`${signed(variance)} L (${variancePct !== null ? signed(Math.round(variancePct * 100) / 100) : '—'}%)?\n\n` +
				`Book ${nf1.format(book)} L vs dip ${nf1.format(data.closingDip.reading_value)} L.`
		);
		if (!confirmed) return;

		closing = true;
		error = null;
		try {
			const composedNote =
				`${selected.label} close · dips ${data.openingDip.reading_date} → ${data.closingDip.reading_date}` +
				` · deliveries ${nf1.format(data.deliveries)} L · dispensed ${nf1.format(data.dispensed)} L` +
				` · meter ${nf1.format(data.bowserStart)} → ${nf1.format(data.bowserEnd)} L` +
				(note.trim() ? ` · ${note.trim()}` : '');

			const payload = {
				reconciliationDate: selected.monthEnd,
				calculatedLevel: Math.round(book * 10) / 10,
				measuredLevel: data.closingDip.reading_value,
				notes: composedNote
			};

			const result = isUpdate
				? await supabaseService.updateTankReconciliation(data.existingClose.id, payload)
				: await supabaseService.createTankReconciliation(payload);
			if (result.error) throw new Error(result.error);

			const doneMsg = `${selected.label} ${isUpdate ? 'close updated' : 'closed'} — variance ${signed(variance)} L recorded.`;
			await Promise.all([loadMonth(), loadHistory()]);
			statusMsg = doneMsg; // loadMonth clears it, so set after the reload
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to record the close';
		} finally {
			closing = false;
		}
	}
</script>

<svelte:head>
	<title>Month-end close - FarmTrack</title>
</svelte:head>

<div class="close-page">
	<div class="page-header">
		<h1>Month-end close</h1>
		<p>Compare the fuel book to the physical dip and sign off the month</p>
	</div>

	<div class="chips">
		{#each months as m}
			<button class="chip" class:on={m.key === selectedKey} onclick={() => selectMonth(m.key)}>
				{m.shortLabel}
			</button>
		{/each}
	</div>

	{#if statusMsg}
		<div class="status-banner">{statusMsg}</div>
	{/if}
	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if loading && !data}
		<div class="skeleton" style="height: 16rem"></div>
	{:else if data}
		<!-- Close panel -->
		<section class="panel">
			<div class="panel-head">
				<h2 class="panel-title">{selected.label}</h2>
				{#if varianceStatus}
					<span class="pill {varianceStatus.key}">{varianceStatus.label}</span>
				{/if}
			</div>

			{#if data.existingClose}
				<div class="closed-banner">
					<span class="closed-ic">✓</span>
					<span>
						Closed on {fmtDateFull(data.existingClose.created_at)} — variance
						{signed(data.existingClose.variance ?? 0)} L
						({signed(data.existingClose.variance_percentage ?? 0)}%)
					</span>
				</div>
			{/if}

			{#if !data.closingDip}
				<p class="empty-note">
					No dipstick reading recorded in {selected.label} — a physical dip is needed to close
					the month.
				</p>
				<a class="tank-link" href="/tank">Record a dip on the Tank page →</a>
			{:else if !data.openingDip}
				<p class="empty-note">
					No earlier dipstick reading to open from — the first-ever dip can't be reconciled
					against anything.
				</p>
			{:else}
				<table class="ledger">
					<tbody>
						<tr>
							<td>Opening — dip on {fmtDate(data.openingDip.reading_date)}</td>
							<td class="val">{nf1.format(data.openingDip.reading_value)} L</td>
						</tr>
						<tr>
							<td>+ Deliveries</td>
							<td class="val">{nf1.format(data.deliveries)} L</td>
						</tr>
						<tr>
							<td>− Dispensed</td>
							<td class="val">{nf1.format(data.dispensed)} L</td>
						</tr>
						<tr class="ledger-total">
							<td>= Book balance at {fmtDate(data.closingDip.reading_date)}</td>
							<td class="val">{book !== null ? nf1.format(book) : '—'} L</td>
						</tr>
						<tr>
							<td>Dip on {fmtDate(data.closingDip.reading_date)}</td>
							<td class="val">{nf1.format(data.closingDip.reading_value)} L</td>
						</tr>
						<tr class="ledger-variance {varianceStatus?.key || ''}">
							<td>Variance</td>
							<td class="val">
								{variance !== null ? signed(variance) : '—'} L
								{#if variancePct !== null}
									({signed(Math.round(variancePct * 100) / 100)}%)
								{/if}
							</td>
						</tr>
					</tbody>
				</table>

				{#if data.bowserStart > 0}
					<p class="meter-line">
						Bowser meter {nf1.format(data.bowserStart)} → {nf1.format(data.bowserEnd)} L
						(+{nf1.format(meterDiff)} L dispensed this calendar month)
					</p>
				{/if}

				<div class="close-actions">
					<input
						class="note-input"
						type="text"
						placeholder="Optional note (e.g. reason for variance)"
						bind:value={note}
						maxlength="200"
					/>
					<button class="close-btn" onclick={closeMonth} disabled={closing}>
						{closing ? 'Recording…' : data.existingClose ? 'Update close' : `Close ${selected.label.split(' ')[0]}`}
					</button>
				</div>
			{/if}
		</section>

		<!-- History -->
		<section class="panel">
			<h2 class="panel-title">Close history</h2>
			{#if history.length === 0}
				<p class="empty-note">No months closed yet.</p>
			{:else}
				<div class="table-wrap">
					<table class="history-table">
						<thead>
							<tr>
								<th>Month</th>
								<th class="num">Book</th>
								<th class="num">Dip</th>
								<th class="num">Variance</th>
								<th class="num">%</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each history as row}
								<tr>
									<td>{monthLabelFor(row.reconciliation_date)}</td>
									<td class="num">{nf.format(Math.round(row.calculated_level ?? 0))} L</td>
									<td class="num">{nf.format(Math.round(row.measured_level ?? 0))} L</td>
									<td class="num">{signed(row.variance ?? 0)} L</td>
									<td class="num">{signed(row.variance_percentage ?? 0)}</td>
									<td class="accepted">{row.accepted ? '✓' : '!'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.close-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 0.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.page-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		margin: 0;
	}

	.page-header p {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0.25rem 0 0;
	}

	/* ---- Month chips (same language as Audit) ---- */
	.chips {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.chip {
		white-space: nowrap;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-600);
		background: var(--white);
		border: 1px solid var(--gray-300);
		padding: 0.45rem 0.875rem;
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: #fff;
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

	.history-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.history-table th {
		text-align: left;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		font-size: var(--text-xs);
		padding: 0.3rem 0.5rem;
		border-bottom: 2px solid var(--gray-200);
	}

	.history-table td {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--gray-100);
		color: var(--gray-700);
	}

	.history-table th.num,
	.history-table td.num {
		text-align: right;
	}

	.history-table .accepted {
		text-align: center;
		color: var(--success-dark);
		font-weight: var(--font-weight-bold);
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

	.skeleton {
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-lg);
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
