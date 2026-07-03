<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	const vehicle = $derived(data.vehicle);
	const entries = $derived(data.entries as any[]); // newest first

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	const unit = $derived(vehicle.odometer_unit || 'km');
	const isHours = $derived(unit === 'hours' || unit === 'hr');
	const rateUnit = $derived(isHours ? 'L/hr' : 'L/100km');

	function goBack() {
		if (history.length > 1) history.back();
		else goto('/dashboard');
	}

	function localMonthKey(monthsBack: number): string {
		const now = new Date();
		const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}

	function monthLitres(key: string): number {
		return entries
			.filter((e) => e.entry_date.startsWith(key))
			.reduce((s, e) => s + (e.litres_dispensed || 0), 0);
	}

	function fmtOdo(v: number | null): string {
		if (v === null || v === undefined) return '—';
		return isHours ? nf1.format(v) : nf.format(Math.round(v));
	}

	function fmtDate(date: string): string {
		return new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function fmtDay(date: string): string {
		return new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', {
			weekday: 'short',
			day: 'numeric'
		});
	}

	/** Per-entry consumption rate in the vehicle's own unit; null when unusable */
	function entryRate(e: any): number | null {
		if (e.gauge_working === false) return null;
		if (isHours) {
			if (e.odometer_start === null || e.odometer_end === null) return null;
			const diff = e.odometer_end - e.odometer_start;
			const litres = e.litres_used ?? e.litres_dispensed;
			return diff > 0 && litres > 0 ? litres / diff : null;
		}
		return e.fuel_consumption_l_per_100km && e.fuel_consumption_l_per_100km > 0
			? e.fuel_consumption_l_per_100km
			: null;
	}

	// ---- Vital stats ----
	const currentReading = $derived.by(() => {
		const withOdo = entries.find((e) => e.odometer_end !== null);
		return withOdo ? withOdo.odometer_end : null;
	});

	const monthStat = $derived.by(() => {
		const now = new Date();
		let litres = monthLitres(localMonthKey(0));
		let label = now.toLocaleDateString('en-ZA', { month: 'long' });
		// Dormant vehicle: show its latest active month instead of a bare 0
		if (litres === 0 && entries.length > 0) {
			const latestKey = entries[0].entry_date.slice(0, 7);
			litres = monthLitres(latestKey);
			label = new Date(latestKey + '-01T12:00:00').toLocaleDateString('en-ZA', {
				month: 'short',
				year: 'numeric'
			});
		}
		return { litres, label };
	});

	const avgRate = $derived.by(() => {
		const rates = entries.map(entryRate).filter((r): r is number => r !== null);
		if (rates.length >= 3) return rates.reduce((s, r) => s + r, 0) / rates.length;
		if (!isHours && vehicle.average_consumption_l_per_100km) {
			return vehicle.average_consumption_l_per_100km;
		}
		return rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : null;
	});

	const lastEntry = $derived(entries[0] ?? null);

	// ---- Anomaly checks: same 15% vs-own-average rule as the dashboard ----
	const OUTLIER_PCT = 15;
	const RECENT_WINDOW = 15;

	const anomalies = $derived.by(() => {
		const items: { severity: 'danger' | 'warning'; text: string }[] = [];
		const recent = entries.slice(0, RECENT_WINDOW);

		if (avgRate) {
			let flagged = 0;
			for (const e of recent) {
				if (flagged >= 4) break;
				const r = entryRate(e);
				if (r === null) continue;
				const delta = Math.round(((r - avgRate) / avgRate) * 100);
				if (delta >= OUTLIER_PCT) {
					items.push({
						severity: 'danger',
						text: `${fmtDate(e.entry_date)}: ${nf1.format(r)} ${rateUnit} — ${delta}% above this vehicle's average`
					});
					flagged++;
				}
			}
		}

		const broken = recent.filter((e) => e.gauge_working === false).length;
		if (broken > 0) {
			items.push({
				severity: 'warning',
				text: `${broken} of the last ${recent.length} entries logged with a broken gauge`
			});
		}

		const missingOdo = recent.filter(
			(e) => e.gauge_working !== false && (e.odometer_start === null || e.odometer_end === null)
		).length;
		if (missingOdo > 0) {
			items.push({
				severity: 'warning',
				text: `${missingOdo} recent ${missingOdo === 1 ? 'entry is' : 'entries are'} missing odometer readings`
			});
		}

		const today = new Date().toLocaleDateString('en-CA');
		const future = entries.filter((e) => e.entry_date > today).length;
		if (future > 0) {
			items.push({
				severity: 'danger',
				text: `${future} future-dated ${future === 1 ? 'entry' : 'entries'} — check the entry dates`
			});
		}

		return items;
	});

	// ---- Monthly usage, last 6 months ----
	const monthlyBars = $derived.by(() => {
		const bars: { label: string; litres: number }[] = [];
		for (let i = 5; i >= 0; i--) {
			const key = localMonthKey(i);
			bars.push({
				label: new Date(key + '-01T12:00:00').toLocaleDateString('en-ZA', { month: 'short' }),
				litres: monthLitres(key)
			});
		}
		const max = Math.max(1, ...bars.map((b) => b.litres));
		return bars.map((b) => ({ ...b, pct: Math.max((b.litres / max) * 100, b.litres > 0 ? 3 : 1.5) }));
	});

	// ---- History grouped by month with subtotals ----
	const monthGroups = $derived.by(() => {
		const map = new Map<string, { label: string; litres: number; entries: any[] }>();
		for (const e of entries) {
			const key = e.entry_date.slice(0, 7);
			let g = map.get(key);
			if (!g) {
				g = {
					label: new Date(key + '-01T12:00:00').toLocaleDateString('en-ZA', {
						month: 'long',
						year: 'numeric'
					}),
					litres: 0,
					entries: []
				};
				map.set(key, g);
			}
			g.litres += e.litres_dispensed || 0;
			g.entries.push(e);
		}
		return [...map.values()]; // insertion order = newest first
	});

	function usage(e: any): string {
		if (e.gauge_working === false || e.odometer_start === null || e.odometer_end === null)
			return '—';
		const diff = e.odometer_end - e.odometer_start;
		if (diff <= 0) return '—';
		return `${isHours ? nf1.format(diff) : nf.format(Math.round(diff))} ${isHours ? 'hr' : 'km'}`;
	}
</script>

<svelte:head>
	<title>{vehicle.code} · {vehicle.name}</title>
</svelte:head>

<div class="vehicle-page">
	<!-- Header -->
	<div class="page-head">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
		</button>
		<div class="head-titles">
			<h1 class="vehicle-title"><span class="vehicle-code">{vehicle.code}</span> {vehicle.name}</h1>
			<div class="vehicle-sub">
				{vehicle.type || 'Vehicle'}{vehicle.registration ? ` · ${vehicle.registration}` : ''}
			</div>
		</div>
		<a class="edit-link" href="/fleet?edit={vehicle.id}">Edit</a>
	</div>

	<!-- Vital stats -->
	<div class="stat-grid">
		<div class="stat-card">
			<div class="stat-label">Current {isHours ? 'hours' : 'odometer'}</div>
			<div class="stat-value">
				{fmtOdo(currentReading)}<span class="stat-unit">{currentReading !== null ? (isHours ? ' hr' : ' km') : ''}</span>
			</div>
			<div class="stat-meta">from latest entry</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Fuel · {monthStat.label}</div>
			<div class="stat-value">{nf.format(Math.round(monthStat.litres))}<span class="stat-unit"> L</span></div>
			<div class="stat-meta">{entries.length >= 500 ? 'last 500 entries' : `${entries.length} entries total`}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Avg consumption</div>
			<div class="stat-value">
				{avgRate ? nf1.format(avgRate) : '—'}<span class="stat-unit">{avgRate ? ` ${rateUnit}` : ''}</span>
			</div>
			<div class="stat-meta">own average, working gauge</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Last refuel</div>
			<div class="stat-value stat-value-sm">
				{lastEntry ? fmtDate(lastEntry.entry_date) : '—'}
			</div>
			<div class="stat-meta">{lastEntry ? `${nf1.format(lastEntry.litres_dispensed)} L` : 'no entries yet'}</div>
		</div>
	</div>

	<!-- Anything off? -->
	<section class="panel">
		<h2 class="panel-title">Anything off?</h2>
		{#if anomalies.length === 0}
			<p class="all-clear">Nothing unusual in recent entries.</p>
		{:else}
			<ul class="anomaly-list">
				{#each anomalies as item}
					<li class="anomaly-item {item.severity}">
						<span class="anomaly-dot"></span>
						<span>{item.text}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Monthly usage -->
	<section class="panel">
		<h2 class="panel-title">Monthly usage · last 6 months</h2>
		<div class="month-bars">
			{#each monthlyBars as bar}
				<div class="month-cell">
					<span class="month-value">{bar.litres > 0 ? nf.format(Math.round(bar.litres)) : ''}</span>
					<span class="month-bar" style="height: {bar.pct}%"></span>
					<span class="month-label">{bar.label}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Fuel history -->
	<section class="panel">
		<h2 class="panel-title">Fuel history</h2>
		{#if entries.length === 0}
			<p class="all-clear">No fuel entries recorded for this vehicle.</p>
		{:else}
			<div class="table-wrap">
				<table class="history-table">
					<thead>
						<tr>
							<th>Date</th>
							<th class="num">Litres</th>
							<th class="num">{isHours ? 'Hours' : 'Odometer'}</th>
							<th class="num">Usage</th>
							<th>Activity</th>
							<th>Field</th>
						</tr>
					</thead>
					<tbody>
						{#each monthGroups as group}
							<tr class="month-row">
								<td colspan="2">{group.label}</td>
								<td colspan="4" class="num month-total">{nf1.format(group.litres)} L</td>
							</tr>
							{#each group.entries as e}
								<tr>
									<td class="cell-date">{fmtDay(e.entry_date)}</td>
									<td class="num cell-litres">{nf1.format(e.litres_dispensed)}</td>
									<td class="num cell-odo">
										{#if e.gauge_working === false}
											<span class="gauge-broken">gauge broken</span>
										{:else}
											{fmtOdo(e.odometer_start)} → {fmtOdo(e.odometer_end)}
										{/if}
									</td>
									<td class="num">{usage(e)}</td>
									<td class="cell-text">{e.activities?.name || '—'}</td>
									<td class="cell-text">{e.fields?.name || '—'}</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>
			{#if entries.length >= 500}
				<p class="truncation-note">Showing the most recent 500 entries.</p>
			{/if}
		{/if}
	</section>
</div>

<style>
	.vehicle-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 0.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* ---- Header ---- */
	.page-head {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.25rem 0.25rem 0;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		background: var(--white);
		color: var(--gray-600);
		cursor: pointer;
		flex-shrink: 0;
	}

	.back-btn:hover {
		background: var(--gray-50);
	}

	.head-titles {
		flex: 1;
		min-width: 0;
	}

	.vehicle-title {
		font-size: var(--text-lg);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		margin: 0;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.vehicle-code {
		color: var(--brand);
	}

	.vehicle-sub {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-top: 0.125rem;
	}

	.edit-link {
		font-size: var(--text-sm);
		color: var(--gray-500);
		text-decoration: none;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		padding: 0.3rem 0.7rem;
		flex-shrink: 0;
	}

	.edit-link:hover {
		background: var(--gray-50);
		color: var(--gray-700);
	}

	/* ---- Stats ---- */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.625rem;
	}

	.stat-card {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 0.75rem 0.875rem;
	}

	.stat-label {
		font-size: var(--text-xs);
		color: var(--gray-500);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.35rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
	}

	.stat-value-sm {
		font-size: 1.05rem;
	}

	.stat-unit {
		font-size: 0.8rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-400);
	}

	.stat-meta {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin-top: 0.25rem;
	}

	/* ---- Panels ---- */
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	.panel-title {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		margin: 0 0 0.75rem;
	}

	.all-clear {
		font-size: var(--text-sm);
		color: var(--gray-400);
		margin: 0;
	}

	/* ---- Anomalies ---- */
	.anomaly-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.anomaly-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--gray-700);
		line-height: 1.45;
	}

	.anomaly-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-top: 0.35rem;
		flex-shrink: 0;
	}

	.anomaly-item.danger .anomaly-dot {
		background: var(--error);
	}

	.anomaly-item.warning .anomaly-dot {
		background: var(--warning);
	}

	/* ---- Monthly bars ---- */
	.month-bars {
		display: flex;
		gap: 0.75rem;
		height: 120px;
	}

	.month-cell {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		min-width: 0;
	}

	.month-value {
		font-size: var(--text-xs);
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
		margin-bottom: 3px;
		white-space: nowrap;
	}

	.month-bar {
		width: 100%;
		max-width: 64px;
		background: #cf96a0;
		border-radius: 2px 2px 0 0;
		min-height: 2px;
	}

	.month-cell:last-child .month-bar {
		background: var(--brand-hover);
	}

	.month-label {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin-top: 0.3rem;
	}

	/* ---- History table ---- */
	.table-wrap {
		overflow-x: auto;
		margin: 0 -0.25rem;
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.history-table th {
		text-align: left;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		padding: 0.3rem 0.5rem;
		border-bottom: 2px solid var(--gray-200);
	}

	.history-table td {
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--gray-100);
		color: var(--gray-700);
	}

	.history-table th.num,
	.history-table td.num {
		text-align: right;
	}

	.month-row td {
		background: var(--gray-50);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		border-bottom: 1px solid var(--gray-200);
		padding-top: 0.45rem;
		padding-bottom: 0.45rem;
	}

	.month-total {
		font-variant-numeric: tabular-nums;
	}

	.cell-date {
		color: var(--gray-500);
	}

	.cell-litres {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.cell-odo {
		color: var(--gray-500);
	}

	.gauge-broken {
		color: var(--warning-dark);
		font-style: italic;
	}

	.cell-text {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.truncation-note {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.5rem 0 0;
	}

	@media (max-width: 768px) {
		.month-bars {
			height: 100px;
		}
	}
</style>
