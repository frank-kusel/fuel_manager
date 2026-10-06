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

	let maxDaily = $derived(
		$insightsData ? Math.max(1, ...$insightsData.daily.map((d) => d.litres)) : 1
	);

	let maxActivityPct = $derived(
		$insightsData ? Math.max(1, ...$insightsData.byActivity.map((x) => x.pct)) : 1
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

		<!-- Month overview: the three numbers you open the page for -->
		<section class="overview">
			<div class="ov-cell ov-main">
				<div class="ov-k">Used in {d.monthLabel}</div>
				<div class="ov-v">{nf.format(Math.round(d.totalLitres))}<span class="ov-unit">L</span></div>
				{#if d.momPct !== null}
					<div class="mom" class:up={d.momPct > 0} class:down={d.momPct <= 0}>
						{d.momPct > 0 ? '▲' : '▼'} {Math.abs(d.momPct)}% on the same days last month
					</div>
				{/if}
			</div>
			<div class="ov-cell">
				<div class="ov-k">Entries</div>
				<div class="ov-v ov-v-sm">{nf.format(d.entryCount)}</div>
				<div class="ov-sub">{d.fleet.length} {d.fleet.length === 1 ? 'vehicle' : 'vehicles'} fuelled</div>
			</div>
			{#if d.tank}
				<a class="ov-cell ov-tank" href="/tank">
					<div class="ov-k">{d.tank.name} book balance</div>
					{#if d.tank.derivedLevel !== null}
						<div class="ov-v ov-v-sm" class:tank-negative={d.tank.derivedLevel <= 0}>
							{nf.format(Math.round(d.tank.derivedLevel))}<span class="ov-unit">L</span>
						</div>
						{#if tankPct !== null}
							<div class="tank-track" title="{Math.round(tankPct)}% full">
								<div class="tank-fill" class:low={tankPct < 15} style="width: {tankPct}%"></div>
							</div>
						{/if}
						<div class="ov-sub">
							{d.tank.runwayDays !== null ? `About ${d.tank.runwayDays} days left` : `${Math.round(tankPct ?? 0)}% full`}
						</div>
					{:else}
						<div class="ov-sub">Nothing to anchor the book to yet</div>
					{/if}
				</a>
			{/if}
		</section>

		<!--
			DOM order is the phone reading order (what needs doing, then the
			month's shape). On wide screens the grid areas rearrange it.
		-->
		<div class="board">
			<section class="panel p-attention">
				<h2 class="panel-title">Needs attention</h2>
				<ul class="attention-list">
					{#each d.attention as item}
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
				<h2 class="panel-title">Top consumers <span class="title-note">against their own average</span></h2>
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

	/* ---- Month overview band ---- */
	.overview {
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
	}

	.ov-cell {
		padding: 1rem 1.125rem;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.ov-main {
		grid-column: 1 / -1;
		border-bottom: 1px solid var(--gray-100);
	}

	.ov-cell + .ov-cell:not(.ov-main) {
		border-left: 1px solid var(--gray-100);
	}

	.ov-main + .ov-cell {
		border-left: none;
	}

	.ov-k {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		margin-bottom: 0.375rem;
	}

	.ov-v {
		font-size: 3rem;
		font-weight: 750;
		font-stretch: var(--figure-stretch);
		color: var(--gray-900);
		letter-spacing: -0.02em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.ov-v-sm {
		font-size: 2rem;
	}

	.ov-v.tank-negative {
		color: var(--error);
	}

	.ov-unit {
		font-size: 0.45em;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-400);
		margin-left: 0.2rem;
	}

	.ov-sub {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin-top: 0.375rem;
	}

	.ov-tank:hover .ov-k {
		color: var(--brand);
	}

	.mom {
		font-size: var(--text-sm);
		font-weight: 500;
		margin-top: 0.5rem;
	}

	.mom.down {
		color: var(--success-dark);
	}

	.mom.up {
		color: var(--warning-dark);
	}

	.tank-track {
		height: 6px;
		background: var(--gray-100);
		border-radius: 3px;
		margin-top: 0.625rem;
		overflow: hidden;
	}

	.tank-fill {
		height: 100%;
		background: var(--brand);
	}

	.tank-fill.low {
		background: var(--error);
	}

	/* Wide: one row of three, the month total leading */
	@media (min-width: 900px) {
		.overview {
			grid-template-columns: 1.6fr 1fr 1.2fr;
		}

		.ov-main {
			grid-column: auto;
			border-bottom: none;
		}

		.ov-main + .ov-cell {
			border-left: 1px solid var(--gray-100);
		}

		.ov-cell {
			padding: 1.25rem 1.5rem;
		}
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

	.panel-title {
		font-size: 1rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		margin: 0 0 0.75rem;
		letter-spacing: 0;
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
		color: var(--gray-500);
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
		.ov-v {
			font-size: 2.6rem;
		}

		.ov-v-sm {
			font-size: 1.75rem;
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
