<script lang="ts">
	import {
		dashboardInsightsStore,
		insightsData,
		insightsLoading,
		insightsError
	} from '$lib/stores/dashboard-insights';
	import { referenceDataStore, activeVehicles, activeDrivers } from '$lib/stores/reference-data';
	import { onVisible } from '$lib/stores/freshness';
	import { tankStore, tankData } from '$lib/stores/tank';
	import { tankAttention } from '$lib/utils/tank-balance';
	import { formatWholeLitres } from '$lib/utils/formatting';
	import PaceChart from '$lib/components/charts/PaceChart.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		dashboardInsightsStore.load();
		tankStore.load();
		referenceDataStore.loadAllData(); // cached — powers the vehicle lookup
		// Returning to a stale tab: TTL-respecting silent refresh
		return onVisible(() => {
			dashboardInsightsStore.load();
			tankStore.load();
		});
	});

	function openVehicle(vehicleId: string) {
		goto(`/tools/database/vehicles/${vehicleId}`);
	}

	function openDriver(driverId: string) {
		goto(`/tools/database/drivers/${driverId}`);
	}

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 });

	let maxDaily = $derived(
		$insightsData ? Math.max(1, ...$insightsData.daily.map((d) => d.litres)) : 1
	);

	let maxActivityPct = $derived(
		$insightsData ? Math.max(1, ...$insightsData.byActivity.map((x) => x.pct)) : 1
	);

	let tank = $derived($tankData?.insight ?? null);
	let avgPerDay = $derived(
		$insightsData && $insightsData.daily.length > 0
			? $insightsData.totalLitres / $insightsData.daily.length
			: 0
	);

	const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 } as const;
	let attention = $derived.by(() => {
		const items = [...tankAttention(tank), ...($insightsData?.attention ?? [])].sort(
			(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
		);
		return items.length > 0
			? items
			: [{ severity: 'info' as const, text: 'No anomalies detected this month', href: undefined }];
	});

	function dayLabel(date: string): string {
		return String(Number(date.slice(8, 10)));
	}

	function isWeekend(date: string): boolean {
		const d = new Date(date + 'T12:00:00').getDay();
		return d === 0 || d === 6;
	}

	function isAxisTick(date: string): boolean {
		const day = Number(date.slice(8, 10));
		return day === 1 || day % 5 === 0;
	}

	/**
	 * The month's days so far, padded out to the full month. Without the padding
	 * six days into October draws six fat bars across the whole panel; with it
	 * the bars keep one width all month and the empty tail shows how far in we are.
	 */
	let dailySlots = $derived.by(() => {
		const days = $insightsData?.daily ?? [];
		if (days.length === 0) return [];
		const last = days[days.length - 1].date;
		const [y, m, dd] = last.split('-').map(Number);
		const monthLen = new Date(y, m, 0).getDate();
		const slots = days.map((x) => ({ ...x, future: false }));
		for (let day = dd + 1; day <= monthLen; day++) {
			const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			slots.push({ date, litres: 0, future: true });
		}
		return slots;
	});

	let selectedDay = $state<string | null>(null);

	function toggleDay(date: string) {
		selectedDay = selectedDay === date ? null : date;
	}

	let selectedDayInfo = $derived.by(() => {
		if (!selectedDay || !$insightsData) return null;
		const day = $insightsData.daily.find((x) => x.date === selectedDay);
		if (!day) return null;
		const dt = new Date(day.date + 'T12:00:00');
		return {
			label: dt.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }),
			litres: day.litres
		};
	});
</script>

<div class="insights">
	{#if $insightsError}
		<div class="error-banner">
			<p>Couldn't load dashboard data</p>
			<small>{$insightsError}</small>
			<button class="retry-btn" onclick={() => dashboardInsightsStore.load(true)}>Retry</button>
		</div>
	{:else if $insightsLoading && !$insightsData}
		<div class="skeleton-stack">
			<div class="skeleton" style="height: 5rem"></div>
			<div class="skeleton" style="height: 3.5rem"></div>
			<div class="skeleton" style="height: 12rem"></div>
		</div>
	{:else if $insightsData}
		{@const d = $insightsData}

		<!-- The month: how much, how fast, against last month -->
		<section class="overview">
			<div class="ov-figures">
				<p class="ui-label">Used in {d.monthLabel}</p>
				<p class="ui-figure ov-v">{formatWholeLitres(d.totalLitres)}<small>L</small></p>
				{#if d.momPct !== null}
					<span class="ui-pill {d.momPct > 10 ? 'warn' : d.momPct < 0 ? 'good' : 'plain'}">
						{d.momPct > 0 ? '▲' : '▼'} {Math.abs(d.momPct)}% vs same days last month
					</span>
				{/if}
				<dl class="ov-stats">
					<div><dt>Entries</dt><dd>{formatWholeLitres(d.entryCount)}</dd></div>
					<div><dt>Vehicles</dt><dd>{d.fleet.length}</dd></div>
					<div><dt>Per day</dt><dd>{formatWholeLitres(avgPerDay)}</dd></div>
				</dl>
			</div>
			<div class="ov-pace">
				<PaceChart current={d.daily} previous={d.prevDaily ?? []} />
			</div>
		</section>

		<!--
			DOM order is the phone reading order (what needs doing, then the
			month's shape). On wide screens the grid areas rearrange it.
		-->
		<div class="board">
			<section class="panel p-attention">
				<h2 class="panel-title">Needs attention</h2>
				<ul class="attention-list">
					{#each attention as item}
						<li class="attention-item {item.severity}">
							<span class="attention-dot"></span>
							{#if item.href}
								<a class="attention-link" href={item.href}>
									<span>{item.text}</span>
									<svg class="attention-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
								</a>
							{:else}
								<span>{item.text}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>

			<section class="panel p-daily">
			<div class="daily-head">
				<h2 class="panel-title daily-title">Daily usage <span class="title-note">{d.monthLabel}</span></h2>
				{#if selectedDayInfo}
					<span class="daily-selected">{selectedDayInfo.label} — {nf1.format(selectedDayInfo.litres)} L</span>
				{/if}
			</div>
			<div class="daily-bars">
				{#each dailySlots as day}
					{#if day.future}
						<span class="daily-cell future" aria-hidden="true"><span class="daily-bar"></span></span>
					{:else}
					<button
						class="daily-cell"
						class:selected={selectedDay === day.date}
						onclick={() => toggleDay(day.date)}
						title="{day.date}: {nf1.format(day.litres)} L"
					>
						{#if day.litres > 0}
							<span class="daily-value" class:peak-value={day.litres === maxDaily}>
								{nf.format(Math.round(day.litres))}
							</span>
						{/if}
						<span
							class="daily-bar"
							class:weekend={isWeekend(day.date)}
							class:peak={day.litres === maxDaily && day.litres > 0}
							style="height: {Math.max((day.litres / maxDaily) * 75, day.litres > 0 ? 3 : 1.5)}%"
						></span>
					</button>
					{/if}
				{/each}
			</div>
			<div class="daily-axis">
				{#each dailySlots as day}
					<span class="axis-cell" class:future={day.future}>{isAxisTick(day.date) ? dayLabel(day.date) : ''}</span>
				{/each}
			</div>
			</section>

			{#if d.byActivity.length > 0}
				<section class="panel p-activity">
					<h2 class="panel-title">Where fuel went</h2>
					<ul class="act-list">
						{#each d.byActivity as slice}
							<li class="act-row" class:other={slice.name === 'Other'}>
								<span class="act-name">{slice.name}</span>
								<span class="act-l">{nf.format(Math.round(slice.litres))} L</span>
								<span class="act-pct">{slice.pct}%</span>
								<span class="act-bar"><span style="width: {(slice.pct / maxActivityPct) * 100}%"></span></span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="panel p-fleet">
				<h2 class="panel-title">Top consumers <span class="title-note">vs own average</span></h2>
				<table class="fleet-table">
					<tbody>
						{#each d.fleet.slice(0, 6) as row}
							<tr
								class="fleet-row"
								onclick={() => openVehicle(row.vehicleId)}
								title="Open {row.code} details"
							>
								<td class="fleet-vehicle">
									<span class="fleet-code">{row.code}</span>
									<span class="fleet-name">{row.name}</span>
								</td>
								<td class="fleet-litres">{nf.format(Math.round(row.litres))} L</td>
								<td class="fleet-delta">
									{#if row.deltaPct === null}
										<span class="delta-na">—</span>
									{:else if row.deltaPct >= 15}
										<span class="delta-bad">+{row.deltaPct}%</span>
									{:else if row.deltaPct <= -10}
										<span class="delta-good">{row.deltaPct}%</span>
									{:else}
										<span class="delta-ok">{row.deltaPct > 0 ? '+' : ''}{row.deltaPct}%</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if d.fleet.length === 0}
					<p class="empty-note">No fuel entries yet this month.</p>
				{/if}
				<div class="lookup-row">
					{#if $activeVehicles.length > 0}
						<select
							class="lookup-select"
							aria-label="Look up a vehicle's fuel history"
							onchange={(e) => {
								const id = e.currentTarget.value;
								if (id) openVehicle(id);
							}}
						>
							<option value="">Vehicle history…</option>
							{#each $activeVehicles as v}
								<option value={v.id}>{v.code} — {v.name}</option>
							{/each}
						</select>
					{/if}
					{#if $activeDrivers.length > 0}
						<select
							class="lookup-select"
							aria-label="Look up a driver's fuel history"
							onchange={(e) => {
								const id = e.currentTarget.value;
								if (id) openDriver(id);
							}}
						>
							<option value="">Driver history…</option>
							{#each $activeDrivers as d}
								<option value={d.id}>{d.employee_code} — {d.name}</option>
							{/each}
						</select>
					{/if}
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	.insights {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* ---- Month overview ---- */
	.overview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	@media (min-width: 720px) {
		.overview {
			grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
			align-items: center;
			gap: 1.5rem;
			padding: 1.25rem 1.5rem;
		}
	}

	.ov-figures p {
		margin: 0;
	}

	.ov-v {
		font-size: clamp(2.5rem, 7vw, 3.25rem);
		margin: 0.375rem 0 0.5rem !important;
	}

	.ov-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 1rem 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--gray-100);
	}

	.ov-stats dt {
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.ov-stats dd {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
		font-stretch: var(--figure-stretch);
		font-variant-numeric: tabular-nums;
	}

	.ov-pace {
		min-width: 0;
	}

	/* ---- Board ---- */
	.board {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	@media (min-width: 1100px) {
		.board {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			grid-template-areas:
				'daily daily attention'
				'fleet fleet activity';
			gap: 1rem;
			align-items: start;
		}

		.p-daily {
			grid-area: daily;
		}

		.p-attention {
			grid-area: attention;
			align-self: stretch;
		}

		.p-fleet {
			grid-area: fleet;
		}

		.p-activity {
			grid-area: activity;
			align-self: stretch;
		}
	}

	/* ---- Panels ---- */
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	@media (min-width: 1100px) {
		.panel {
			padding: 1.25rem 1.5rem;
		}
	}

	/* Same small-caps label as the Tank and Audit panels */
	.panel-title {
		font-size: 0.6875rem;
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--gray-500);
		margin: 0 0 0.75rem;
	}

	/* ---- Where fuel went: ranked bars ---- */
	.act-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.act-row {
		display: grid;
		grid-template-columns: 1fr auto 2.75rem;
		align-items: baseline;
		column-gap: 0.75rem;
		row-gap: 0.3rem;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.act-name {
		color: var(--gray-800);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.act-l {
		color: var(--gray-600);
	}

	.act-pct {
		text-align: right;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.act-bar {
		grid-column: 1 / -1;
		height: 6px;
		background: var(--gray-100);
		border-radius: 3px;
		overflow: hidden;
	}

	.act-bar span {
		display: block;
		height: 100%;
		background: var(--brand);
		border-radius: 3px;
	}

	.act-row.other .act-bar span {
		background: var(--gray-400);
	}

	/* ---- Fleet table ---- */
	.fleet-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.fleet-table td {
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--gray-100);
	}

	.fleet-row {
		cursor: pointer;
	}

	.fleet-row:hover td {
		background: var(--gray-50);
	}

	.fleet-table tr:last-child td {
		border-bottom: none;
	}

	.fleet-vehicle {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		min-width: 0;
	}

	.fleet-code {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		flex-shrink: 0;
	}

	.fleet-name {
		color: var(--gray-500);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fleet-litres {
		text-align: right;
		color: var(--gray-700);
		white-space: nowrap;
	}

	.fleet-delta {
		text-align: right;
		width: 4rem;
		white-space: nowrap;
	}

	.delta-bad {
		color: var(--error);
		font-weight: var(--font-weight-semibold);
	}

	.delta-good {
		color: var(--success);
	}

	.delta-ok,
	.delta-na {
		color: var(--gray-400);
	}

	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0;
	}

	.lookup-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.625rem;
	}

	@media (min-width: 480px) {
		.lookup-row {
			flex-direction: row;
		}
	}

	.lookup-select {
		flex: 1;
		min-width: 0;
		width: 100%;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		background: var(--gray-50);
		font-size: var(--text-sm);
		color: var(--gray-600);
		cursor: pointer;
	}

	.lookup-select:focus {
		outline: none;
		border-color: var(--brand-ring);
	}

	/* ---- Attention list ---- */
	.attention-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.attention-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--gray-700);
		line-height: 1.45;
	}

	.attention-link {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		color: inherit;
		text-decoration: none;
	}

	.attention-link:hover {
		color: var(--brand);
	}

	.attention-chev {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		margin-top: 0.15rem;
		color: var(--gray-400);
	}

	.attention-link:hover .attention-chev {
		color: var(--brand);
	}

	.title-note {
		font-weight: 400;
		color: var(--gray-400);
		margin-left: 0.25rem;
	}

	.attention-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-top: 0.35rem;
		flex-shrink: 0;
	}

	.attention-item.danger .attention-dot {
		background: var(--error);
	}

	.attention-item.warning .attention-dot {
		background: var(--warning);
	}

	.attention-item.info .attention-dot {
		background: var(--success);
	}

	/* ---- Daily bars ---- */
	.daily-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.daily-title {
		margin: 0;
	}

	.daily-selected {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--brand);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.daily-bars {
		display: flex;
		gap: 3px;
		height: 160px;
	}

	@media (min-width: 1100px) {
		.daily-bars {
			height: 210px;
		}
	}

	/* Whole-column tap target: value label rides the bar top */
	.daily-cell {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 2px;
	}

	.daily-value {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		font-size: 0.625rem;
		line-height: 1;
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
		margin-bottom: 3px;
		max-height: 44px;
		overflow: hidden;
	}

	.daily-value.peak-value {
		color: var(--brand);
		font-weight: var(--font-weight-semibold);
	}

	.daily-bar {
		width: 100%;
		background: #cf96a0;
		border-radius: 2px 2px 0 0;
		min-height: 2px;
		transition: height 0.3s ease;
	}

	.daily-bar.weekend {
		background: var(--gray-200);
	}

	.daily-bar.peak {
		background: var(--brand-hover);
	}

	.daily-cell.future {
		cursor: default;
	}

	.daily-cell.future .daily-bar {
		height: 1.5%;
		background: var(--gray-100);
	}

	.axis-cell.future {
		color: var(--gray-300);
	}

	.daily-cell.selected .daily-bar {
		background: var(--brand);
	}

	.daily-cell.selected .daily-value {
		color: var(--brand);
		font-weight: var(--font-weight-semibold);
	}

	.daily-axis {
		display: flex;
		gap: 3px;
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin-top: 0.375rem;
		font-variant-numeric: tabular-nums;
	}

	.axis-cell {
		flex: 1;
		min-width: 0;
		text-align: center;
		white-space: nowrap;
		overflow: visible;
	}

	/* ---- States ---- */
	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-lg);
		padding: 1rem;
	}

	.error-banner p {
		font-weight: var(--font-weight-semibold);
		color: #991b1b;
		margin: 0 0 0.25rem;
	}

	.error-banner small {
		color: #b91c1c;
	}

	.retry-btn {
		display: block;
		margin-top: 0.625rem;
		padding: 0.375rem 0.875rem;
		border: 1px solid #fecaca;
		border-radius: var(--radius-md);
		background: var(--white);
		color: #991b1b;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.skeleton-stack {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
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

	@media (max-width: 768px) {
		.daily-bars {
			gap: 2px;
			height: 130px;
		}

		.daily-axis {
			gap: 2px;
		}

		.daily-value {
			font-size: 0.5625rem;
			max-height: 38px;
		}
	}
</style>
