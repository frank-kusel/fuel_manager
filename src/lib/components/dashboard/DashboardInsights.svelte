<script lang="ts">
	import {
		dashboardInsightsStore,
		insightsData,
		insightsLoading,
		insightsError
	} from '$lib/stores/dashboard-insights';
	import { referenceDataStore, activeVehicles, activeDrivers } from '$lib/stores/reference-data';
	import { onVisible } from '$lib/stores/freshness';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		dashboardInsightsStore.load();
		referenceDataStore.loadAllData(); // cached — powers the vehicle lookup
		// Returning to a stale tab: TTL-respecting silent refresh
		return onVisible(() => dashboardInsightsStore.load());
	});

	function openVehicle(vehicleId: string) {
		goto(`/tools/database/vehicles/${vehicleId}`);
	}

	function openDriver(driverId: string) {
		goto(`/tools/database/drivers/${driverId}`);
	}

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 });

	// Stacked-bar shades, darkest = biggest slice
	const SLICE_COLORS = ['#75232b', '#8e2b34', '#b06570', '#cf96a0', '#f3dee1'];

	let maxDaily = $derived(
		$insightsData ? Math.max(1, ...$insightsData.daily.map((d) => d.litres)) : 1
	);

	let tankPct = $derived.by(() => {
		const t = $insightsData?.tank;
		if (!t || t.derivedLevel === null || !t.capacity) return null;
		return Math.max(0, Math.min(100, (t.derivedLevel / t.capacity) * 100));
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

		<!-- Month overview -->
		<section class="month-head">
			<div class="month-total">
				<div class="month-label">{d.monthLabel} · {d.entryCount} entries</div>
				<div class="total-row">
					<span class="total-value">{nf.format(Math.round(d.totalLitres))}<span class="total-unit">L</span></span>
					{#if d.momPct !== null}
						<span class="mom" class:up={d.momPct > 0} class:down={d.momPct <= 0}>
							{d.momPct > 0 ? '▲' : '▼'} {Math.abs(d.momPct)}% vs same time last month
						</span>
					{/if}
				</div>
			</div>

			{#if d.tank}
				<div class="tank-box">
					<div class="tank-title">{d.tank.name}</div>
					{#if d.tank.derivedLevel !== null}
						<div class="tank-level" class:tank-negative={d.tank.derivedLevel <= 0}>
							{nf.format(Math.round(d.tank.derivedLevel))} L
							{#if d.tank.runwayDays !== null}
								<span class="tank-runway">· ~{d.tank.runwayDays} days left</span>
							{/if}
						</div>
						{#if tankPct !== null}
							<div class="tank-track">
								<div
									class="tank-fill"
									class:low={tankPct < 15}
									style="width: {tankPct}%"
								></div>
							</div>
						{/if}
						<div class="tank-meta">
							Derived from dip on {d.tank.lastDipDate} + refills − dispensed
						</div>
					{:else}
						<div class="tank-meta">No dipstick reading recorded yet</div>
					{/if}
				</div>
			{/if}
		</section>

		<!-- Where fuel went -->
		{#if d.byActivity.length > 0}
			<section class="panel">
				<h2 class="panel-title">Where fuel went</h2>
				<div class="stack-bar">
					{#each d.byActivity as slice, i}
						<div
							class="stack-seg"
							style="width: {Math.max(slice.pct, 2)}%; background: {SLICE_COLORS[i % SLICE_COLORS.length]}"
							title="{slice.name}: {nf.format(Math.round(slice.litres))} L ({slice.pct}%)"
						></div>
					{/each}
				</div>
				<div class="stack-legend">
					{#each d.byActivity as slice, i}
						<span class="legend-item">
							<span class="legend-dot" style="background: {SLICE_COLORS[i % SLICE_COLORS.length]}"></span>
							{slice.name} {slice.pct}%
						</span>
					{/each}
				</div>
			</section>
		{/if}

		<div class="two-col">
			<!-- Fleet -->
			<section class="panel">
				<h2 class="panel-title">Top consumers · vs own average</h2>
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

			<!-- Needs attention -->
			<section class="panel">
				<h2 class="panel-title">Needs attention</h2>
				<ul class="attention-list">
					{#each d.attention as item}
						<li class="attention-item {item.severity}">
							<span class="attention-dot"></span>
							<span>{item.text}</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<!-- Daily usage -->
		<section class="panel">
			<div class="daily-head">
				<h2 class="panel-title daily-title">Daily usage · {d.monthLabel}</h2>
				{#if selectedDayInfo}
					<span class="daily-selected">{selectedDayInfo.label} — {nf1.format(selectedDayInfo.litres)} L</span>
				{/if}
			</div>
			<div class="daily-bars">
				{#each d.daily as day}
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
				{/each}
			</div>
			<div class="daily-axis">
				{#each d.daily as day}
					<span class="axis-cell">{isAxisTick(day.date) ? dayLabel(day.date) : ''}</span>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.insights {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* ---- Month overview ---- */
	.month-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.25rem 0.25rem 0;
	}

	.month-label {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-bottom: 0.25rem;
	}

	.total-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.total-value {
		font-size: 2.25rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		letter-spacing: -0.02em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.total-unit {
		font-size: 1.1rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-400);
		margin-left: 0.25rem;
	}

	.mom {
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.mom.down {
		color: var(--success);
	}

	.mom.up {
		color: var(--warning-dark);
	}

	.tank-box {
		min-width: 200px;
	}

	.tank-title {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-bottom: 0.25rem;
	}

	.tank-level {
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		font-variant-numeric: tabular-nums;
	}

	.tank-level.tank-negative {
		color: var(--error);
	}

	.tank-runway {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--gray-500);
	}

	.tank-track {
		height: 6px;
		background: var(--gray-100);
		border-radius: 3px;
		margin-top: 0.375rem;
		overflow: hidden;
	}

	.tank-fill {
		height: 100%;
		background: var(--brand);
		border-radius: 3px;
	}

	.tank-fill.low {
		background: var(--error);
	}

	.tank-meta {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin-top: 0.375rem;
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
		letter-spacing: 0;
	}

	.two-col {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.875rem;
	}

	/* ---- Stacked activity bar ---- */
	.stack-bar {
		display: flex;
		height: 22px;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.stack-seg {
		min-width: 4px;
	}

	.stack-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 1rem;
		margin-top: 0.625rem;
		font-size: var(--text-xs);
		color: var(--gray-600);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		flex-shrink: 0;
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
		color: var(--gray-400);
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
		.month-head {
			flex-direction: column;
			gap: 0.875rem;
		}

		.tank-box {
			width: 100%;
		}

		.total-value {
			font-size: 1.9rem;
		}

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
