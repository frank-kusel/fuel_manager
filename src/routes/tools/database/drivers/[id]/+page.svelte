<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	const driver = $derived(data.driver);
	const entries = $derived(data.entries as any[]); // newest first

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	function goBack() {
		if (history.length > 1) history.back();
		else goto('/tools/database?entity=drivers');
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

	// ---- Vital stats ----
	const monthStat = $derived.by(() => {
		const now = new Date();
		let litres = monthLitres(localMonthKey(0));
		let label = now.toLocaleDateString('en-ZA', { month: 'long' });
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

	const vehiclesDriven = $derived.by(() => {
		const map = new Map<string, { code: string; name: string; count: number; litres: number }>();
		for (const e of entries) {
			const v = e.vehicles;
			if (!v?.code) continue;
			const g = map.get(v.code) || { code: v.code, name: v.name || '', count: 0, litres: 0 };
			g.count += 1;
			g.litres += e.litres_dispensed || 0;
			map.set(v.code, g);
		}
		return [...map.values()].sort((a, b) => b.litres - a.litres);
	});

	const lastEntry = $derived(entries[0] ?? null);

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
		return [...map.values()];
	});
</script>

<svelte:head>
	<title>{driver.employee_code} · {driver.name}</title>
</svelte:head>

<div class="driver-page">
	<!-- Header -->
	<div class="page-head">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
		</button>
		<div class="head-titles">
			<h1 class="driver-title"><span class="driver-code">{driver.employee_code}</span> {driver.name}</h1>
			<div class="driver-sub">
				{[driver.phone, driver.default_vehicle ? `usually ${driver.default_vehicle.code} ${driver.default_vehicle.name}` : null]
					.filter(Boolean)
					.join(' · ') || 'Driver'}
			</div>
		</div>
		<a class="edit-link" href="/tools/database?entity=drivers&edit={driver.id}">Edit</a>
	</div>

	<!-- Vital stats -->
	<div class="stat-grid">
		<div class="stat-card">
			<div class="stat-label">Fuel · {monthStat.label}</div>
			<div class="stat-value">{nf.format(Math.round(monthStat.litres))}<span class="stat-unit"> L</span></div>
			<div class="stat-meta">{entries.length >= 500 ? 'last 500 entries' : `${entries.length} entries total`}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Vehicles driven</div>
			<div class="stat-value">{vehiclesDriven.length}</div>
			<div class="stat-meta">across recorded entries</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Last entry</div>
			<div class="stat-value stat-value-sm">{lastEntry ? fmtDate(lastEntry.entry_date) : '—'}</div>
			<div class="stat-meta">
				{lastEntry
					? `${nf1.format(lastEntry.litres_dispensed)} L · ${lastEntry.vehicles?.code || ''}`
					: 'no entries yet'}
			</div>
		</div>
	</div>

	<!-- Vehicles driven -->
	{#if vehiclesDriven.length > 0}
		<section class="panel">
			<h2 class="panel-title">Vehicles driven · by fuel drawn</h2>
			<table class="mini-table">
				<tbody>
					{#each vehiclesDriven.slice(0, 5) as v}
						<tr>
							<td class="mini-vehicle">
								<span class="mini-code">{v.code}</span>
								<span class="mini-name">{v.name}</span>
							</td>
							<td class="num">{v.count} {v.count === 1 ? 'entry' : 'entries'}</td>
							<td class="num litres">{nf.format(Math.round(v.litres))} L</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if vehiclesDriven.length > 5}
				<p class="more-note">+ {vehiclesDriven.length - 5} more</p>
			{/if}
		</section>
	{/if}

	<!-- Monthly usage -->
	<section class="panel">
		<h2 class="panel-title">Monthly fuel drawn · last 6 months</h2>
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
			<p class="empty-note">No fuel entries recorded for this driver.</p>
		{:else}
			<div class="table-wrap">
				<table class="history-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Vehicle</th>
							<th class="num">Litres</th>
							<th>Activity</th>
							<th>Field</th>
						</tr>
					</thead>
					<tbody>
						{#each monthGroups as group}
							<tr class="month-row">
								<td colspan="2">{group.label}</td>
								<td colspan="3" class="num month-total">{nf1.format(group.litres)} L</td>
							</tr>
							{#each group.entries as e}
								<tr>
									<td class="cell-date">{fmtDay(e.entry_date)}</td>
									<td class="cell-text">{e.vehicles?.code || '—'}</td>
									<td class="num cell-litres">{nf1.format(e.litres_dispensed)}</td>
									<td class="cell-text">{e.activities?.name || '—'}</td>
									<td class="cell-text">{e.fields?.name || '—'}</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>
			{#if entries.length >= 500}
				<p class="more-note">Showing the most recent 500 entries.</p>
			{/if}
		{/if}
	</section>
</div>

<style>
	.driver-page {
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

	.driver-title {
		font-size: var(--text-lg);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		margin: 0;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.driver-code {
		color: var(--brand);
	}

	.driver-sub {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-top: 0.125rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* ---- Vehicles driven ---- */
	.mini-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.mini-table td {
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--gray-100);
	}

	.mini-table tr:last-child td {
		border-bottom: none;
	}

	.mini-vehicle {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		min-width: 0;
	}

	.mini-code {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		flex-shrink: 0;
	}

	.mini-name {
		color: var(--gray-500);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mini-table .num {
		text-align: right;
		color: var(--gray-500);
		white-space: nowrap;
	}

	.mini-table .litres {
		color: var(--gray-800);
		font-weight: var(--font-weight-semibold);
	}

	.more-note {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.5rem 0 0;
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

	.cell-text {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-400);
		margin: 0;
	}

	@media (max-width: 768px) {
		.month-bars {
			height: 100px;
		}
	}
</style>
