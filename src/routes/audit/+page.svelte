<script lang="ts">
	import { onMount } from 'svelte';
	import DataExport from '$lib/components/dashboard/DataExport.svelte';
	import ActrosClaimAdjustment from '$lib/components/audit/ActrosClaimAdjustment.svelte';
	import MonthCloseSection from '$lib/components/audit/MonthCloseSection.svelte';
	import CloseHistory from '$lib/components/audit/CloseHistory.svelte';
	import { recentMonths, type MonthOption } from '$lib/utils/dates';
	import { DEFAULT_DIP_TOLERANCE_L, type CloseRow } from '$lib/utils/tank-balance';
	import { calculateDieselClaim } from '$lib/utils/diesel-claim';
	import { formatLitres, formatNumber } from '$lib/utils/formatting';
	import type { Activity, DieselClaimMethod, VehicleMonthlyClaimAdjustment } from '$lib/types';

	const SETTINGS_KEY = 'farmtrack_audit_settings_v1';
	const NON_ELIGIBLE_GUESS = /transport|market|town|private|road|staff/i;

	interface AuditSettings {
		rateCents: number;
		regNo: string;
		nonEligible: string[];
		seeded: boolean;
		/** Dipstick resolution; variance bands never flag below this. */
		dipToleranceL: number;
	}

	interface AuditEntry {
		litres: number;
		activityId: string | null;
		activityName: string;
		activityEligible: boolean;
		date: string;
		vehicleId: string;
		claimMethod: DieselClaimMethod;
	}

	let settings = $state<AuditSettings>({
		rateCents: 303.8,
		regNo: '',
		nonEligible: [],
		seeded: false,
		dipToleranceL: DEFAULT_DIP_TOLERANCE_L
	});
	let legacySettingsFound = $state(false);

	// ONE period for the whole page: the close, the claim figures, the Actros
	// classifier and the export target all follow this month. Previously these
	// were three independent selectors that could silently disagree.
	const months: MonthOption[] = recentMonths(6);
	let selectedKey = $state(months[1].key); // the month you are closing
	let selected = $derived(months.find((m) => m.key === selectedKey) ?? months[1]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showEligibility = $state(false);
	let showSettings = $state(false);
	let savingEligibility = $state(false);
	let eligibilityError = $state('');
	let eligibilitySuccess = $state('');
	let eligibilityDraft = $state<Record<string, boolean>>({});
	let unmatchedLegacyNames = $state<string[]>([]);

	let entries = $state<AuditEntry[]>([]);
	let refills = $state<
		{ litres_added: number; delivery_date: string; invoice_number: string | null }[]
	>([]);
	let activities = $state<Activity[]>([]);
	let adjustments = $state<VehicleMonthlyClaimAdjustment[]>([]);
	let closes = $state<CloseRow[]>([]);
	let missingInvoices12m = $state(0);

	function loadSettings() {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (raw) {
				settings = { ...settings, ...JSON.parse(raw) };
				legacySettingsFound = true;
			}
		} catch {
			/* keep defaults */
		}
	}

	function saveSettings() {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		} catch {
			/* private mode etc. */
		}
	}

	// Whole calendar month, from local-calendar helpers. The old version built
	// these with toISOString(), which in SAST rolled the start back into the
	// previous month.
	function periodRange(): { start: string; end: string } {
		return { start: selected.monthStart, end: selected.monthEnd };
	}

	function one<T>(relation: T | T[] | null | undefined): T | null {
		return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
	}

	function prepareEligibilityDraft() {
		const currentNames = new Set(activities.map((activity) => activity.name));
		unmatchedLegacyNames = legacySettingsFound
			? settings.nonEligible.filter((name) => !currentNames.has(name))
			: [];
		eligibilityDraft = Object.fromEntries(
			activities.map((activity) => {
				if (activity.diesel_claim_reviewed_at) return [activity.id, activity.diesel_claim_eligible];
				if (legacySettingsFound)
					return [activity.id, !settings.nonEligible.includes(activity.name)];
				return [activity.id, !NON_ELIGIBLE_GUESS.test(activity.name)];
			})
		);
		if (activities.some((activity) => !activity.diesel_claim_reviewed_at)) showEligibility = true;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const client = supabaseService.getClient();
			const { start, end } = periodRange();

			// A delivery without an invoice number is a storage-logbook gap
			// regardless of which month is on screen, so that check spans a year
			// while everything else is month-scoped.
			const yearAgo = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;

			const [entriesRes, refillsRes, actsRes, closesRes, invoiceRes, adjustmentsRes] =
				await Promise.all([
					client
						.from('fuel_entries')
						.select(
							'entry_date, litres_dispensed, vehicle_id, vehicles:vehicle_id(diesel_claim_method), activities:activity_id(id, name, diesel_claim_eligible)'
						)
						.is('deleted_at', null)
						.gte('entry_date', start)
						.lte('entry_date', end),
					client
						.from('tank_refills')
						.select('litres_added, delivery_date, invoice_number')
						.gte('delivery_date', start)
						.lte('delivery_date', end),
					supabaseService.getActivities(),
					// The full window, not just the newest row: checking one row and
					// testing its date meant closing THIS month made LAST month read
					// as unclosed.
					supabaseService.getTankCloseHistory(24),
					client
						.from('tank_refills')
						.select('delivery_date, invoice_number')
						.gte('delivery_date', yearAgo)
						.is('invoice_number', null),
					supabaseService.getVehicleMonthlyClaimAdjustments(
						`${start.slice(0, 7)}-01`,
						`${end.slice(0, 7)}-01`
					)
				]);
			const firstError =
				entriesRes.error ||
				refillsRes.error ||
				actsRes.error ||
				invoiceRes.error ||
				adjustmentsRes.error;
			if (firstError)
				throw new Error(typeof firstError === 'string' ? firstError : firstError.message);

			entries = (entriesRes.data || []).map((row: any) => {
				const activity = one(row.activities) as {
					id: string;
					name: string;
					diesel_claim_eligible: boolean;
				} | null;
				const vehicle = one(row.vehicles) as { diesel_claim_method: DieselClaimMethod } | null;
				return {
					litres: Number(row.litres_dispensed || 0),
					activityId: activity?.id ?? null,
					activityName: activity?.name ?? 'Unknown',
					activityEligible: activity?.diesel_claim_eligible === true,
					date: row.entry_date,
					vehicleId: row.vehicle_id,
					claimMethod: vehicle?.diesel_claim_method ?? 'activity_only'
				};
			});
			refills = refillsRes.data || [];
			activities = actsRes.data || [];
			adjustments = adjustmentsRes.data || [];
			closes = (closesRes.data || []) as CloseRow[];
			missingInvoices12m = (invoiceRes.data || []).length;
			prepareEligibilityDraft();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load audit data';
		}
		loading = false;
	}

	onMount(() => {
		loadSettings();
		load();
	});

	function selectMonth(key: string) {
		if (key === selectedKey) return;
		selectedKey = key;
		load();
	}

	function toggleActivity(id: string) {
		eligibilityDraft[id] = !eligibilityDraft[id];
		eligibilityDraft = { ...eligibilityDraft };
		eligibilityError = '';
		eligibilitySuccess = '';
	}

	async function saveEligibility() {
		savingEligibility = true;
		eligibilityError = '';
		eligibilitySuccess = '';
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const result = await supabaseService.saveActivityClaimEligibility(
				activities.map((activity) => ({
					id: activity.id,
					diesel_claim_eligible: eligibilityDraft[activity.id] !== false
				}))
			);
			if (result.error) throw new Error(result.error);
			await load();
			eligibilitySuccess = 'Activity eligibility saved to the database.';
			showEligibility = false;
		} catch (err) {
			eligibilityError = err instanceof Error ? err.message : 'Failed to save activity eligibility';
		} finally {
			savingEligibility = false;
		}
	}

	let claimTotals = $derived.by(() => {
		const adjustmentByVehicleMonth = new Map(
			adjustments.map((item) => [`${item.vehicle_id}:${item.claim_month}`, item])
		);
		const groups = new Map<
			string,
			{
				total: number;
				eligible: number;
				method: DieselClaimMethod;
				vehicleId: string;
				month: string;
			}
		>();
		for (const entry of entries) {
			const month = `${entry.date.slice(0, 7)}-01`;
			const key = `${entry.vehicleId}:${month}`;
			const group = groups.get(key) ?? {
				total: 0,
				eligible: 0,
				method: entry.claimMethod,
				vehicleId: entry.vehicleId,
				month
			};
			group.total += entry.litres;
			if (entry.activityEligible) group.eligible += entry.litres;
			groups.set(key, group);
		}
		let total = 0;
		let claimable = 0;
		let missingAdjustments = 0;
		for (const group of groups.values()) {
			const result = calculateDieselClaim({
				totalLitres: group.total,
				baseEligibleLitres: group.eligible,
				method: group.method,
				adjustment: adjustmentByVehicleMonth.get(`${group.vehicleId}:${group.month}`)
			});
			total += result.totalLitres;
			claimable += result.claimableLitres;
			if (result.missingAdjustment) missingAdjustments++;
		}
		return { total, claimable, nonClaimable: total - claimable, missingAdjustments };
	});

	let eligibleLitres = $derived(claimTotals.claimable);
	let nonEligibleLitres = $derived(claimTotals.nonClaimable);
	let purchasedLitres = $derived(
		refills.reduce((sum, refill) => sum + (refill.litres_added || 0), 0)
	);
	let refundRands = $derived((eligibleLitres * settings.rateCents) / 100);
	let eligibleActivityCount = $derived(
		activities.filter((activity) => eligibilityDraft[activity.id] !== false).length
	);
	let unreviewedActivityCount = $derived(
		activities.filter((activity) => !activity.diesel_claim_reviewed_at).length
	);

	/** Which months have a close on record — the whole window, not just the newest. */
	let closedMonthKeys = $derived(
		new Set(closes.map((c) => c.reconciliation_date.slice(0, 7)))
	);

	let selectedClose = $derived(
		closes.find((c) => c.reconciliation_date.slice(0, 7) === selected.key) ?? null
	);

	let checklist = $derived.by(() => [
		{
			ok: settings.regNo.trim().length > 0,
			title: 'Diesel refund registration captured',
			detail: settings.regNo.trim()
				? `Registered as ${settings.regNo}`
				: 'Add your DRS registration number in settings below'
		},
		{
			ok: unreviewedActivityCount === 0,
			title: 'Activity eligibility reviewed',
			detail:
				unreviewedActivityCount === 0
					? 'Claimable and non-claimable activities are saved in the database'
					: `${unreviewedActivityCount} activities still need confirmation`
		},
		{
			ok: entries.length > 0,
			title: 'Usage logbook maintained',
			detail: `${entries.length} entries in ${selected.label} — litres out per vehicle, activity and location`
		},
		{
			ok: refills.length > 0,
			title: 'Storage logbook maintained',
			detail:
				refills.length > 0
					? `${refills.length} ${refills.length === 1 ? 'delivery' : 'deliveries'} recorded in ${selected.label}`
					: `No deliveries recorded in ${selected.label}`
		},
		{
			ok: !!selectedClose,
			title: `${selected.label} closed`,
			detail: selectedClose
				? `Carried forward ${Math.round(selectedClose.calculated_level ?? 0)} L${selectedClose.is_rebaseline ? ' (re-baselined)' : ''}`
				: 'Run the month-end close at the top of this page'
		},
		{
			ok: missingInvoices12m === 0,
			title: 'Delivery invoice numbers on file',
			detail:
				missingInvoices12m === 0
					? 'Every delivery in the last 12 months has its invoice number'
					: `${missingInvoices12m} ${missingInvoices12m === 1 ? 'delivery' : 'deliveries'} in the last 12 months missing an invoice number`
		}
	]);

</script>

<svelte:head>
	<title>Audit - FarmTrack</title>
</svelte:head>

<div class="audit-page">
	<div class="page-header">
		<h1>Audit</h1>
		<p>Claim estimate, readiness, and exports</p>
	</div>

	<div class="chips">
		{#each months as m (m.key)}
			<button class="chip" class:on={m.key === selectedKey} onclick={() => selectMonth(m.key)}>
				{m.shortLabel}
				<span class="chip-badge" class:closed={closedMonthKeys.has(m.key)}>
					{closedMonthKeys.has(m.key) ? '✓' : '·'}
				</span>
			</button>
		{/each}
	</div>

	{#if error}
		<div class="error-banner">
			<p>Couldn't load audit data</p>
			<small>{error}</small>
		</div>
	{:else if loading}
		<div class="skeleton" style="height: 9rem"></div>
	{:else}
		<!-- Close the tank -->
		<MonthCloseSection
			month={selected}
			toleranceL={settings.dipToleranceL}
			onclosed={load}
		/>

		<CloseHistory rows={closes} toleranceL={settings.dipToleranceL} />

		<!-- Claim stats -->
		<h2 class="section-heading">Claim — {selected.label}</h2>
		<section class="panel claim">
			<div class="claim-main">
				<div>
					<div class="stat-k">Eligible litres</div>
					<div class="stat-v brand">{formatLitres(eligibleLitres)}<span class="unit">L</span></div>
					<div class="stat-sub">after activity and vehicle adjustments</div>
				</div>
				<div>
					<div class="stat-k">Refund estimate</div>
					<div class="stat-v">R {formatNumber(refundRands, 0)}</div>
					<div class="stat-sub">@ {settings.rateCents} c/L — estimate only</div>
				</div>
			</div>
			<div class="claim-row">
				<div>
					<span class="mini-k">Non-eligible</span>
					<span class="mini-v red">{formatLitres(nonEligibleLitres)} L</span>
				</div>
				<div>
					<span class="mini-k">Purchased</span>
					<span class="mini-v">{formatLitres(purchasedLitres)} L</span>
				</div>
				<div>
					<span class="mini-k">Entries</span>
					<span class="mini-v">{entries.length}</span>
				</div>
			</div>
			{#if claimTotals.missingAdjustments > 0}
				<p class="claim-warning">
					{claimTotals.missingAdjustments} vehicle-month classifier result{claimTotals.missingAdjustments ===
					1
						? ' is'
						: 's are'} missing and conservatively excluded.
				</p>
			{/if}
		</section>

		<!-- Eligibility editor -->
		<section class="panel">
			<button class="collapser" onclick={() => (showEligibility = !showEligibility)}>
				<span
					>Activity eligibility ({eligibleActivityCount} eligible · {activities.length -
						eligibleActivityCount} excluded)</span
				>
				<svg
					class:open={showEligibility}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg
				>
			</button>
			{#if showEligibility}
				{#if unreviewedActivityCount > 0}
					<p class="review-intro">
						Review these defaults, then save once. Previous browser choices are only used to prefill
						this unsaved list.
					</p>
				{/if}
				<div class="elig-list">
					{#each activities as activity}
						<button
							class="elig-row"
							class:excluded={eligibilityDraft[activity.id] === false}
							onclick={() => toggleActivity(activity.id)}
						>
							<span class="elig-name">{activity.name}</span>
							<span class="elig-state"
								>{eligibilityDraft[activity.id] === false ? 'Non-claimable' : 'Claimable'}</span
							>
						</button>
					{/each}
				</div>
				{#if unmatchedLegacyNames.length > 0}
					<p class="elig-message warning">
						Previous browser settings referenced activities that no longer exist: {unmatchedLegacyNames.join(
							', '
						)}.
					</p>
				{/if}
				{#if eligibilityError}<p class="elig-message error">{eligibilityError}</p>{/if}
				<div class="elig-actions">
					<p class="hint">
						Non-claimable activities are excluded before any Actros percentage is applied.
					</p>
					<button type="button" onclick={saveEligibility} disabled={savingEligibility}
						>{savingEligibility ? 'Saving...' : 'Save eligibility'}</button
					>
				</div>
			{/if}
			{#if eligibilitySuccess}<p class="elig-message success">{eligibilitySuccess}</p>{/if}
		</section>

		<!-- Readiness checklist -->
		<section class="panel">
			<h2 class="panel-title">Audit readiness</h2>
			{#each checklist as item}
				<div class="check">
					<div class="check-box" class:y={item.ok} class:n={!item.ok}>{item.ok ? '✓' : '!'}</div>
					<div>
						<div class="check-t">{item.title}</div>
						<div class="check-d">{item.detail}</div>
					</div>
				</div>
			{/each}
		</section>

		<!-- Claim settings -->
		<section class="panel">
			<button class="collapser" onclick={() => (showSettings = !showSettings)}>
				<span>Claim settings</span>
				<svg
					class:open={showSettings}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg
				>
			</button>
			{#if showSettings}
				<div class="settings-grid">
					<label class="setting">
						<span>Rebate rate (c/L)</span>
						<input
							type="number"
							step="0.1"
							bind:value={settings.rateCents}
							onchange={saveSettings}
						/>
					</label>
					<label class="setting">
						<span>Dipstick tolerance (L)</span>
						<input
							type="number"
							step="10"
							bind:value={settings.dipToleranceL}
							onchange={saveSettings}
						/>
					</label>
					<label class="setting">
						<span>DRS registration no.</span>
						<input
							type="text"
							placeholder="e.g. DRS-2026-…"
							bind:value={settings.regNo}
							onchange={saveSettings}
						/>
					</label>
				</div>
				<p class="hint">
					These are your settings, not verified tax rules — confirm the current rate, the
					eligible-percentage rules, and activity eligibility with your accountant or SARS before
					claiming.
				</p>
			{/if}
		</section>

		<ActrosClaimAdjustment year={selected.year} month={selected.month} onsaved={load} />

		<!-- Exports -->
		<h2 class="section-heading">Exports</h2>
		<DataExport selectedYear={selected.year} selectedMonth={selected.month} hideMonthPicker />

		<!-- Manage -->
		<h2 class="section-heading">Manage</h2>
		<div class="manage-links">
			<a href="/entries" class="manage-link">All entries</a>
			<a href="/tank" class="manage-link">Tank</a>
			<a href="/tools/database" class="manage-link">Database management</a>
			<a href="/menu" class="manage-link">System settings</a>
		</div>
	{/if}
</div>

<style>
	.audit-page {
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

	.chip-badge {
		display: inline-block;
		margin-left: 0.3rem;
		font-size: var(--text-xs);
		opacity: 0.45;
	}

	.chip-badge.closed {
		opacity: 1;
		color: var(--success-dark);
	}

	.chip.on .chip-badge.closed {
		color: #fff;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: #fff;
	}

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
		margin: 0 0 0.5rem;
	}

	.section-heading {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0.5rem 0 -0.25rem;
	}

	/* Claim */
	.claim {
		background: #faf1f2;
		border-color: #e9ccd0;
	}

	.claim-main {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.stat-k {
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--gray-500);
	}

	.stat-v {
		font-size: 1.9rem;
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		letter-spacing: -0.02em;
		line-height: 1.15;
		font-variant-numeric: tabular-nums;
	}

	.stat-v.brand {
		color: var(--brand-hover);
	}

	.unit {
		font-size: 1rem;
		color: var(--gray-400);
		margin-left: 0.25rem;
	}

	.stat-sub {
		font-size: var(--text-xs);
		color: var(--gray-500);
		margin-top: 0.25rem;
	}

	.claim-row {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.875rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3dee1;
		flex-wrap: wrap;
	}

	.claim-warning {
		margin: 0.75rem 0 0;
		padding: 0.55rem 0.7rem;
		border-radius: var(--radius-md);
		background: #fff7e7;
		color: #87520b;
		font-size: var(--text-xs);
	}

	.mini-k {
		display: block;
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.mini-v {
		font-size: var(--text-base);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-800);
		font-variant-numeric: tabular-nums;
	}

	.mini-v.red {
		color: var(--error);
	}

	/* Collapser */
	.collapser {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-700);
		cursor: pointer;
	}

	.collapser svg {
		width: 1.1rem;
		height: 1.1rem;
		color: var(--gray-400);
		transition: transform 0.2s ease;
	}

	.collapser svg.open {
		transform: rotate(180deg);
	}

	/* Eligibility list */
	.elig-list {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
	}

	.elig-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.25rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--gray-100);
		cursor: pointer;
		font-size: var(--text-sm);
		text-align: left;
	}

	.elig-row:last-child {
		border-bottom: none;
	}

	.elig-name {
		color: var(--gray-800);
	}

	.elig-state {
		flex-shrink: 0;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-full);
		background: #dcfce7;
		color: var(--success-dark);
	}

	.elig-row.excluded .elig-state {
		background: #fee2e2;
		color: #991b1b;
	}

	.elig-row.excluded .elig-name {
		color: var(--gray-500);
	}

	.review-intro {
		margin: 0.75rem 0 0;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-md);
		background: #fff7e7;
		color: #87520b;
		font-size: var(--text-xs);
		line-height: 1.5;
	}

	.elig-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.elig-actions .hint {
		margin: 0;
	}

	.elig-actions button {
		flex-shrink: 0;
		min-height: 2.5rem;
		border: 0;
		border-radius: var(--radius-md);
		padding: 0.55rem 0.85rem;
		background: var(--primary);
		color: white;
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
	}

	.elig-actions button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.elig-message {
		margin: 0.7rem 0 0;
		padding: 0.55rem 0.7rem;
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
	}

	.elig-message.warning {
		background: #fff7e7;
		color: #87520b;
	}
	.elig-message.error {
		background: #fef2f2;
		color: #991b1b;
	}
	.elig-message.success {
		background: #eef7ef;
		color: #24633a;
	}

	.hint {
		font-size: var(--text-xs);
		color: var(--gray-400);
		margin: 0.625rem 0 0;
		line-height: 1.5;
	}

	/* Checklist */
	.check {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--gray-100);
	}

	.check:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.check-box {
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-bold);
		margin-top: 0.1rem;
	}

	.check-box.y {
		background: #dcfce7;
		color: var(--success-dark);
	}

	.check-box.n {
		background: #fee2e2;
		color: #991b1b;
	}

	.check-t {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-900);
	}

	.check-d {
		font-size: var(--text-xs);
		color: var(--gray-500);
		margin-top: 0.1rem;
	}

	/* Settings */
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.setting span {
		display: block;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--gray-500);
		margin-bottom: 0.3rem;
	}

	.setting input {
		width: 100%;
		min-height: 2.5rem;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		box-sizing: border-box;
	}

	.setting input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	/* Manage links */
	.manage-links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.625rem;
	}

	.manage-link {
		display: block;
		padding: 0.8rem 1rem;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-700);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.manage-link:hover {
		border-color: var(--brand);
		color: var(--brand-hover);
	}

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

	.skeleton {
		background: linear-gradient(
			90deg,
			var(--gray-100) 25%,
			var(--gray-200) 50%,
			var(--gray-100) 75%
		);
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

	@media (max-width: 768px) {
		.audit-page {
			padding: 0.5rem;
		}

		.page-header h1 {
			font-size: 1.5rem;
		}

		.claim-main {
			grid-template-columns: 1fr;
			gap: 0.875rem;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.elig-actions {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
