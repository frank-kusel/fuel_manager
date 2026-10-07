<script lang="ts">
	/**
	 * Month-end, as one ordered list: Dip → Close → Claim → Export.
	 *
	 * Every step shows what it comes to in one line; the first one with
	 * something to fix opens. All step bodies stay mounted, so a refresh after
	 * a close or a classifier save never discards input. One month drives the
	 * whole page — the close, the claim, the classifier results and the export.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Step from '$lib/components/audit/Step.svelte';
	import DatabaseLink from '$lib/components/ui/DatabaseLink.svelte';
	import CloseStep from '$lib/components/audit/CloseStep.svelte';
	import ClaimStep from '$lib/components/audit/ClaimStep.svelte';
	import MonthHistory from '$lib/components/audit/MonthHistory.svelte';
	import DataExport from '$lib/components/audit/DataExport.svelte';
	import AppSettingsPanel from '$lib/components/settings/AppSettingsPanel.svelte';
	import DipstickModal from '$lib/components/modals/DipstickModal.svelte';
	import type { ClassifierVehicle } from '$lib/components/audit/ClassifierAdjustment.svelte';
	import { claimSettings } from '$lib/stores/claim-settings';
	import { toast } from '$lib/stores/toast';
	import { financialYearStart, isoLocal, recentMonths, type MonthOption } from '$lib/utils/dates';
	import { formatRand, formatSigned, formatWholeLitres } from '$lib/utils/formatting';
	import { monthlyClaims, summariseClaim, type MonthClaim } from '$lib/utils/claim-totals';
	import {
		buildReadiness,
		buildSteps,
		currentStep,
		STEP_ORDER,
		type StepId,
		type StepStatus
	} from '$lib/utils/audit-readiness';
	import type { CloseRow, MonthCloseData } from '$lib/utils/tank-balance';
	import type { Activity, DieselClaimMethod, VehicleMonthlyClaimAdjustment } from '$lib/types';

	interface AuditEntry {
		litres: number;
		eligible: boolean;
		date: string;
		vehicleId: string;
		method: DieselClaimMethod;
	}

	const months: MonthOption[] = recentMonths(12);
	const monthKeys = new Set(months.map((m) => m.key));
	let selectedKey = $state(months[1].key); // last month: the one you are closing
	let selected = $derived(months.find((m) => m.key === selectedKey) ?? months[1]);

	// The skeleton is for a month never shown, not for every load(): load() is
	// also the refresh after a close or save, and a skeleton then would unmount
	// the steps and discard their input.
	let loadedKey = $state<string | null>(null);
	let loadSeq = 0;
	let error = $state<string | null>(null);

	let entries = $state<AuditEntry[]>([]);
	let deliveries = $state<{ litres_added: number | null }[]>([]);
	let activities = $state<Activity[]>([]);
	let adjustments = $state<VehicleMonthlyClaimAdjustment[]>([]);
	let classifierVehicles = $state<ClassifierVehicle[]>([]);
	let closes = $state<CloseRow[]>([]);
	let closeData = $state<MonthCloseData | null>(null);
	let missingInvoices12m = $state(0);

	let showSettings = $state(false);
	let showDipModal = $state(false);
	let history = $state<MonthClaim[] | null>(null);
	let openSteps = $state(new Set<StepId>());

	function one<T>(relation: T | T[] | null | undefined): T | null {
		return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
	}

	async function load(): Promise<void> {
		const seq = ++loadSeq;
		const month = selected;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const client = supabaseService.getClient();
			const { monthStart: start, monthEnd: end } = month;
			// A delivery without an invoice number is a storage-logbook gap whatever
			// month is on screen, so that check spans a year.
			const yearAgo = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;

			const [
				entriesRes,
				deliveriesRes,
				actsRes,
				closesRes,
				invoiceRes,
				adjRes,
				classifierRes,
				closeRes
			] = await Promise.all([
				client
					.from('fuel_entries')
					.select(
						'entry_date, litres_dispensed, vehicle_id, vehicles:vehicle_id(diesel_claim_method), activities:activity_id(diesel_claim_eligible)'
					)
					.is('deleted_at', null)
					.gte('entry_date', start)
					.lte('entry_date', end),
				client
					.from('tank_refills')
					.select('litres_added')
					.gte('delivery_date', start)
					.lte('delivery_date', end),
				supabaseService.getActivities(),
				supabaseService.getTankCloseHistory(24),
				client
					.from('tank_refills')
					.select('delivery_date')
					.gte('delivery_date', yearAgo)
					.is('invoice_number', null),
				supabaseService.getVehicleMonthlyClaimAdjustments(`${month.key}-01`, `${month.key}-01`),
				// Every vehicle whose share comes from a monthly classifier gets a
				// card — found by method, not one hard-coded fleet code.
				client
					.from('vehicles')
					.select('id, code, name')
					.eq('diesel_claim_method', 'monthly_classifier')
					.eq('active', true)
					.order('code'),
				supabaseService.getMonthCloseData(start, end, $claimSettings.dipToleranceL)
			]);
			const firstError =
				entriesRes.error ||
				deliveriesRes.error ||
				actsRes.error ||
				closesRes.error ||
				invoiceRes.error ||
				adjRes.error ||
				classifierRes.error ||
				closeRes.error;
			if (firstError)
				throw new Error(typeof firstError === 'string' ? firstError : firstError.message);
			// A newer load (month switched mid-flight) owns the page now.
			if (seq !== loadSeq) return;

			entries = (entriesRes.data || []).map((row: any) => ({
				litres: Number(row.litres_dispensed || 0),
				eligible:
					one<{ diesel_claim_eligible: boolean }>(row.activities)?.diesel_claim_eligible === true,
				date: row.entry_date,
				vehicleId: row.vehicle_id,
				method:
					one<{ diesel_claim_method: DieselClaimMethod }>(row.vehicles)?.diesel_claim_method ??
					'activity_only'
			}));
			deliveries = deliveriesRes.data || [];
			activities = actsRes.data || [];
			closes = (closesRes.data || []) as CloseRow[];
			missingInvoices12m = (invoiceRes.data || []).length;
			adjustments = adjRes.data || [];
			classifierVehicles = (classifierRes.data || []) as ClassifierVehicle[];
			closeData = closeRes.data;
			error = null;
			const firstLoadOfMonth = loadedKey !== month.key;
			const firstLoadOfPage = loadedKey === null;
			loadedKey = month.key;
			// Open where the work is — once per month, never on a refresh.
			if (firstLoadOfMonth) openSteps = new Set([startingStep(firstLoadOfPage)]);
			loadHistory();
		} catch (err) {
			if (seq !== loadSeq) return;
			const message = err instanceof Error ? err.message : 'Failed to load the month';
			// A failed refresh keeps the month on screen; only a month never
			// loaded gets the full-page error.
			if (loadedKey === month.key) toast.error(`Couldn't refresh: ${message}`);
			else error = message;
		}
	}

	/**
	 * Every month since the start of last season, for the history table.
	 * Background: the month on screen never waits for it.
	 */
	async function loadHistory() {
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			const lastSeason = financialYearStart(
				new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
			);
			const start = isoLocal(lastSeason);
			const end = isoLocal(new Date());
			const [entriesRes, adjRes] = await Promise.all([
				supabaseService.getClaimEntries(start, end),
				supabaseService.getVehicleMonthlyClaimAdjustments(start, `${end.slice(0, 7)}-01`)
			]);
			if (entriesRes.error) throw new Error(entriesRes.error);
			if (adjRes.error) throw new Error(adjRes.error);
			history = monthlyClaims(entriesRes.data || [], adjRes.data || []);
		} catch (err) {
			toast.error(`History not loaded: ${err instanceof Error ? err.message : err}`);
			history = [];
		}
	}

	onMount(() => {
		load();
	});

	function selectMonth(key: string) {
		if (key === selectedKey) return;
		selectedKey = key;
		error = null;
		load();
	}

	// ---- The month's figures ----
	let claim = $derived(
		summariseClaim(
			entries.map((e) => ({
				vehicleId: e.vehicleId,
				date: e.date,
				litres: e.litres,
				eligible: e.eligible,
				method: e.method
			})),
			adjustments
		)
	);
	let deliveredLitres = $derived(deliveries.reduce((s, d) => s + (d.litres_added || 0), 0));
	let refundRands = $derived((claim.claimableLitres * $claimSettings.rateCents) / 100);
	let selectedClose = $derived(
		closes.find((c) => c.reconciliation_date.slice(0, 7) === selected.key) ?? null
	);
	let ledger = $derived(closeData?.ledger ?? null);
	let monthDip = $derived(closeData?.closingDip ?? null);

	let items = $derived(
		buildReadiness({
			monthLabel: selected.label,
			regNo: $claimSettings.regNo,
			unreviewedActivityCount: activities.filter((a) => !a.diesel_claim_reviewed_at).length,
			entryCount: entries.length,
			deliveryCount: deliveries.length,
			monthDip,
			selectedClose,
			missingClassifierCodes: classifierVehicles
				.filter((v) => (claim.byVehicle.get(v.id)?.missingMonths.length ?? 0) > 0)
				.map((v) => v.code),
			missingInvoices12m
		})
	);
	let steps = $derived(buildSteps(items));
	let stepOf = $derived(
		Object.fromEntries(steps.map((s) => [s.id, s])) as Record<StepId, StepStatus>
	);
	let openStepCount = $derived(steps.filter((s) => s.id !== 'export' && s.state === 'todo').length);

	// ---- Which steps are open ----
	/** ?step= (or the old ?tab=claim) on arrival; the first step to fix otherwise. */
	function startingStep(arrival: boolean): StepId {
		const asked = page.url.searchParams.get('step') ?? page.url.searchParams.get('tab');
		if (arrival && asked && (STEP_ORDER as string[]).includes(asked)) return asked as StepId;
		return currentStep(steps);
	}

	function toggle(id: StepId) {
		const next = new Set(openSteps);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		openSteps = next;
	}

	// ---- One-line summaries ----
	function issueLine(id: StepId): string | null {
		const issues = stepOf[id]?.issues ?? [];
		if (issues.length === 0) return null;
		return issues.length > 1 ? `${issues[0]} · +${issues.length - 1} more` : issues[0];
	}

	let closeSummary = $derived.by(() => {
		if (selectedClose) {
			const hasGap =
				selectedClose.book_at_dip !== null &&
				selectedClose.book_at_dip !== undefined &&
				selectedClose.measured_level !== null;
			const gap = hasGap
				? ` · gap ${formatSigned((selectedClose.book_at_dip as number) - (selectedClose.measured_level as number))} L`
				: '';
			return `Carried ${formatWholeLitres(selectedClose.calculated_level)} L${gap}`;
		}
		if (ledger?.variance) return `Gap ${formatSigned(ledger.variance.litres)} L · not closed`;
		return issueLine('close') ?? '';
	});
	let claimSummary = $derived(
		issueLine('claim') ??
			`${formatRand(refundRands)} · ${formatWholeLitres(claim.claimableLitres)} L claimable`
	);
	let exportSummary = $derived(
		stepOf.export?.state === 'ready' ? 'Claim PDF · Excel' : 'Earlier steps still open'
	);

	const TONE = { good: 'good', acceptable: 'warn', high: 'bad' } as const;

	/** Closed-month status for the month chips. */
	let monthStatus = $derived(
		new Map(
			closes.map((c) => [c.reconciliation_date.slice(0, 7), c.accepted === false ? 'warn' : 'good'])
		)
	);
</script>

<svelte:head>
	<title>Audit - FarmTrack</title>
</svelte:head>

<div class="ui-page">
	<div class="ui-head">
		<h1>Audit</h1>
		<div class="head-tools">
			<DatabaseLink />
			<button
				class="ui-btn icon"
				onclick={() => (showSettings = true)}
				aria-label="Settings"
				title="Rate, DRS number, dip tolerance"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg
				>
			</button>
		</div>
	</div>

	<nav class="months" aria-label="Month">
		{#each months as m (m.key)}
			<button
				class="month"
				class:on={m.key === selectedKey}
				aria-pressed={m.key === selectedKey}
				onclick={() => selectMonth(m.key)}
			>
				{m.shortLabel}
				{#if monthStatus.has(m.key)}
					<i class="dot {monthStatus.get(m.key)}" title="Closed"></i>
				{/if}
			</button>
		{/each}
	</nav>

	{#if error && loadedKey !== selectedKey}
		<section class="ui-panel failed">
			<p>Couldn't load {selected.label}: {error}</p>
			<button class="ui-btn" onclick={load}>Retry</button>
		</section>
	{:else if loadedKey !== selectedKey}
		<div class="ui-skeleton" style="height: 5.5rem"></div>
		<div class="ui-skeleton" style="height: 14rem"></div>
	{:else}
		<div class="layout">
			<!-- The month at a glance -->
			<section class="kpis" aria-label="{selected.label} at a glance">
				<div class="kpi">
					<p class="ui-label">Dispensed</p>
					<p class="ui-figure">{formatWholeLitres(claim.totalLitres)}<small>L</small></p>
				</div>
				<div class="kpi">
					<p class="ui-label">Delivered</p>
					<p class="ui-figure">{formatWholeLitres(deliveredLitres)}<small>L</small></p>
				</div>
				<div class="kpi">
					<p class="ui-label">Gap at dip</p>
					<p class="ui-figure {ledger?.band ? TONE[ledger.band.key] : ''}">
						{ledger?.variance ? formatSigned(ledger.variance.litres) : '—'}<small>L</small>
					</p>
				</div>
				<div class="kpi">
					<p class="ui-label">Refund est.</p>
					<p class="ui-figure good">{formatRand(refundRands)}</p>
				</div>
				<div class="progress" role="img" aria-label="{2 - openStepCount} of 2 steps done">
					{#each steps as s (s.id)}<i class={s.state}></i>{/each}
				</div>
			</section>

			<div class="steps">
				<Step
					n={1}
					id="close"
					title="Close"
					state={stepOf.close.state}
					summary={closeSummary}
					open={openSteps.has('close')}
					ontoggle={() => toggle('close')}
				>
					<CloseStep
						month={selected}
						data={closeData}
						toleranceL={$claimSettings.dipToleranceL}
						onrefresh={load}
						onrecorddip={() => (showDipModal = true)}
					/>
				</Step>

				<Step
					n={2}
					id="claim"
					title="Claim"
					state={stepOf.claim.state}
					summary={claimSummary}
					open={openSteps.has('claim')}
					ontoggle={() => toggle('claim')}
				>
					<div class="claim-step">
						<ClaimStep
							month={selected}
							{claim}
							{activities}
							{classifierVehicles}
							{adjustments}
							onrefresh={load}
							onsettings={() => (showSettings = true)}
						/>
					</div>
				</Step>

				<Step
					n={3}
					id="export"
					title="Export"
					state={stepOf.export.state}
					summary={exportSummary}
					open={openSteps.has('export')}
					ontoggle={() => toggle('export')}
				>
					{#if stepOf.export.state !== 'ready'}
						<p class="ui-pill warn export-warn">
							{openStepCount}
							{openStepCount === 1 ? 'step is' : 'steps are'} still open, and the export will show it
						</p>
					{/if}
					<DataExport selectedYear={selected.year} selectedMonth={selected.month} />
					<ul class="facts">
						{#each stepOf.export.items as item (item.id)}
							<li><span class="ui-label">{item.title}</span>{item.detail}</li>
						{/each}
					</ul>
				</Step>
			</div>

			<div class="trend">
				<MonthHistory
					months={history}
					{closes}
					rateCents={$claimSettings.rateCents}
					toleranceL={$claimSettings.dipToleranceL}
					{selectedKey}
					selectable={monthKeys}
					onselect={selectMonth}
				/>
			</div>
		</div>
	{/if}
</div>

{#if showSettings}
	<AppSettingsPanel onclose={() => (showSettings = false)} />
{/if}

<DipstickModal
	bind:show={showDipModal}
	onClose={() => (showDipModal = false)}
	onSuccess={load}
	defaultDate={selected.monthEnd}
/>

<style>
	.ui-btn.icon {
		padding: 0.5rem;
	}

	.head-tools {
		display: flex;
		gap: 0.375rem;
	}

	/* ---- Months ---- */
	.months {
		display: flex;
		gap: 0.375rem;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -0.25rem;
		padding: 0 0.25rem;
	}

	.months::-webkit-scrollbar {
		display: none;
	}

	.month {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--gray-200);
		background: var(--white);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		cursor: pointer;
		white-space: nowrap;
	}

	.month.on {
		background: var(--gray-900);
		border-color: var(--gray-900);
		color: var(--white);
	}

	.dot {
		width: 0.4375rem;
		height: 0.4375rem;
		border-radius: 50%;
	}

	.dot.good {
		background: var(--success);
	}

	.dot.warn {
		background: var(--warning);
	}

	.failed {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.failed p {
		margin: 0;
	}

	/* ---- Layout ---- */
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.875rem;
	}

	@media (min-width: 1280px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			grid-template-areas:
				'kpis kpis'
				'steps trend';
			align-items: start;
		}

		.kpis {
			grid-area: kpis;
		}

		.steps {
			grid-area: steps;
		}

		.trend {
			grid-area: trend;
		}
	}

	/* ---- KPIs ---- */
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		background: var(--gray-200);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.kpi {
		background: var(--white);
		padding: 0.75rem 1rem 0.875rem;
	}

	.kpi p {
		margin: 0;
	}

	.kpi .ui-figure {
		font-size: 1.5rem;
		margin-top: 0.3rem;
	}

	.ui-figure.good {
		color: #1f6b3a;
	}

	.ui-figure.warn {
		color: #8a4b08;
	}

	.ui-figure.bad {
		color: var(--error);
	}

	.progress {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--white);
	}

	.progress i {
		height: 4px;
		background: var(--gray-200);
	}

	.progress i.done,
	.progress i.ready {
		background: var(--success);
	}

	.progress i.warn {
		background: var(--warning);
	}

	@media (max-width: 639px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	/* ---- Steps ---- */
	.steps {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}

	.export-warn {
		margin: 0 0 0.75rem;
		white-space: normal;
	}

	.facts {
		list-style: none;
		margin: 0.75rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
		font-size: var(--text-sm);
		color: var(--gray-600);
	}

	.facts .ui-label {
		display: inline;
		margin-right: 0.5rem;
	}
</style>
