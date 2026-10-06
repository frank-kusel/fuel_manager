<script lang="ts">
	import { onMount } from 'svelte';
	import DataExport from '$lib/components/dashboard/DataExport.svelte';
	import ActrosClaimAdjustment from '$lib/components/audit/ActrosClaimAdjustment.svelte';
	import MonthCloseSection from '$lib/components/audit/MonthCloseSection.svelte';
	import CloseHistory from '$lib/components/audit/CloseHistory.svelte';
	import { recentMonths, type MonthOption } from '$lib/utils/dates';
	import { DEFAULT_DIP_TOLERANCE_L, type CloseRow } from '$lib/utils/tank-balance';
	import {
		buildReadiness,
		nextAction,
		outstandingCount,
		type ReadinessTarget
	} from '$lib/utils/audit-readiness';
	import ReadinessBand from '$lib/components/audit/ReadinessBand.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
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
	let showClaimSetup = $state(false);
	// Plain let, not $state: this must not re-trigger. prepareEligibilityDraft
	// runs on EVERY load(), and load() is also the onclosed/onsaved callback —
	// so without the guard, closing the month re-expands this panel underneath
	// you. saveEligibility used to mask that by force-closing afterwards.
	let autoOpenedSetup = false;
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
		if (!autoOpenedSetup && activities.some((activity) => !activity.diesel_claim_reviewed_at)) {
			showClaimSetup = true;
			autoOpenedSetup = true;
		}
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
			showClaimSetup = false;
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

	let checklist = $derived(
		buildReadiness({
			monthLabel: selected.label,
			regNo: settings.regNo,
			unreviewedActivityCount,
			entryCount: entries.length,
			deliveryCount: refills.length,
			selectedClose,
			missingInvoices12m
		})
	);

	let readinessNext = $derived(nextAction(checklist));
	let readinessOutstanding = $derived(outstandingCount(checklist));
	let overTolerance = $derived(selectedClose?.accepted === false);

	// ---- Tabs ----
	// URL-backed so a reload or a trip to /tank and back keeps your place.
	// /audit has no `load`, so a same-route query change does not remount this
	// component — the derived value just recomputes.
	let tab = $derived(page.url.searchParams.get('tab') === 'claim' ? 'claim' : 'close');

	// Claim mounts on first visit and then stays. Neither panel is ever
	// destroyed: MonthCloseSection refetches on mount (4-5 round trips) and
	// holds a half-typed note and the post-close banner, which a remount would
	// silently discard. ActrosClaimAdjustment is the same shape.
	let claimMounted = $state(false);
	$effect(() => {
		if (tab === 'claim') claimMounted = true;
	});

	async function showTab(next: 'close' | 'claim') {
		await goto(`?tab=${next}`, { replaceState: true, noScroll: true, keepFocus: true });
		await tick();
	}

	/** The band's next-action control: switch tab, open the panel, scroll to it. */
	async function goToTarget(target: ReadinessTarget) {
		if (target === 'close') {
			await showTab('close');
			document.getElementById('month-close')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			return;
		}
		await showTab('claim');
		showClaimSetup = true;
		await tick();
		document.getElementById('claim-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (target === 'registration') {
			(document.getElementById('drs-reg') as HTMLInputElement | null)?.focus();
		}
	}

	async function goToExports() {
		await showTab('claim');
		document.getElementById('exports')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

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
				{#if closedMonthKeys.has(m.key)}
					<span class="chip-badge closed" title="Closed">✓</span>
				{/if}
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
		<ReadinessBand
			items={checklist}
			next={readinessNext}
			outstanding={readinessOutstanding}
			monthLabel={selected.label}
			{eligibleLitres}
			{refundRands}
			{overTolerance}
			onact={goToTarget}
			onexports={goToExports}
		/>

		<!--
			Links, not a tablist widget: these are genuinely URL-addressable, so
			<a> is honest and costs less than roving tabindex for a binary choice.
			replacestate keeps back out of the tab cycle (it is the primary gesture
			on mobile); keepfocus stops SvelteKit throwing focus to <body>.
		-->
		<nav class="tabs" aria-label="Month-end sections">
			<a
				class="tab"
				class:on={tab === 'close'}
				href="?tab=close"
				aria-current={tab === 'close' ? 'page' : undefined}
				data-sveltekit-replacestate
				data-sveltekit-noscroll
				data-sveltekit-keepfocus>Close</a
			>
			<a
				class="tab"
				class:on={tab === 'claim'}
				href="?tab=claim"
				aria-current={tab === 'claim' ? 'page' : undefined}
				data-sveltekit-replacestate
				data-sveltekit-noscroll
				data-sveltekit-keepfocus>Claim</a
			>
		</nav>

		<div class="tabpanel" hidden={tab !== 'close'}>
			<div id="month-close">
				<MonthCloseSection
					month={selected}
					toleranceL={settings.dipToleranceL}
					onclosed={load}
				/>
			</div>

			<CloseHistory rows={closes} toleranceL={settings.dipToleranceL} />
		</div>

		{#if claimMounted}
		<div class="tabpanel" hidden={tab !== 'claim'}>
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

		<!--
			One "Claim setup" panel, no nested collapses — nesting is what made
			these two hard to find in the first place.
		-->
		<section class="panel" id="claim-setup">
			<button class="collapser" onclick={() => (showClaimSetup = !showClaimSetup)}>
				<span>
					Claim setup
					<span class="setup-summary">
						{eligibleActivityCount} claimable · {settings.rateCents} c/L ·
						{settings.regNo.trim() ? settings.regNo.trim() : 'no DRS no.'}
					</span>
					{#if unreviewedActivityCount > 0 || !settings.regNo.trim()}
						<span class="setup-dot" title="Needs attention"></span>
					{/if}
				</span>
				<svg
					class:open={showClaimSetup}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg
				>
			</button>

			{#if showClaimSetup}
				<h3 class="setup-h">Activity eligibility</h3>
				{#if unreviewedActivityCount > 0}
					<p class="review-intro">
						Review these defaults, then save once. Previous browser choices are only used to prefill
						this unsaved list.
					</p>
				{/if}
				<div class="elig-list">
					{#each activities as activity (activity.id)}
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

				<h3 class="setup-h">Rates and registration</h3>
				<div class="settings-grid">
					<label class="setting">
						<span>Rebate rate (c/L)</span>
						<input type="number" step="0.1" bind:value={settings.rateCents} onchange={saveSettings} />
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
							id="drs-reg"
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
			{#if eligibilitySuccess}<p class="elig-message success">{eligibilitySuccess}</p>{/if}
		</section>

		<ActrosClaimAdjustment year={selected.year} month={selected.month} onsaved={load} />

		<!-- Exports -->
		<h2 class="section-heading" id="exports">Exports</h2>
		<DataExport selectedYear={selected.year} selectedMonth={selected.month} hideMonthPicker />

		</div>
		{/if}

		<!-- Manage -->
		<h2 class="section-heading">Manage</h2>
		<div class="manage-links">
			{#each [
				{ href: '/entries', t: 'All entries', d: 'Spreadsheet view — fix any cell in place' },
				{ href: '/tank', t: 'Tank', d: 'Book balance, dips and deliveries' },
				{ href: '/tools/database', t: 'Database', d: 'Vehicles, drivers, activities, fields' },
				{ href: '/menu', t: 'System settings', d: 'Thresholds and preferences' }
			] as link (link.href)}
				<a href={link.href} class="manage-link">
					<span class="manage-text">
						<span class="manage-t">{link.t}</span>
						<span class="manage-d">{link.d}</span>
					</span>
					<svg class="manage-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
				</a>
			{/each}
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
		/* Swipeable row — the bar under it is noise on touch screens */
		scrollbar-width: none;
	}

	.chips::-webkit-scrollbar {
		display: none;
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

	/* ---- Tabs ---- */
	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--gray-100);
		border-radius: var(--radius-lg);
		/* The layout header is in normal flow and is hidden entirely at >=1024px,
		   and .main has no overflow container, so top: 0 resolves against the
		   viewport at both breakpoints. */
		position: sticky;
		top: 0;
		z-index: 5;
	}

	.tab {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
		text-decoration: none;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.tab.on {
		background: var(--white);
		color: var(--brand);
		box-shadow: var(--shadow-sm);
	}

	.tabpanel {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* The hidden ATTRIBUTE (a11y tree + tab order), which otherwise loses to
	   the display: flex above. */
	.tabpanel[hidden] {
		display: none !important;
	}

	/* ---- Claim setup ---- */
	.setup-summary {
		display: block;
		font-size: var(--text-xs);
		font-weight: 400;
		color: var(--gray-500);
		margin-top: 0.1rem;
	}

	.setup-dot {
		display: inline-block;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: #d97706;
		margin-left: 0.35rem;
		vertical-align: 0.15rem;
	}

	.setup-h {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-700);
		margin: 1rem 0 0.5rem;
	}

	.setup-h:first-of-type {
		margin-top: 0.75rem;
	}

	@media (min-width: 768px) {
		.tabs {
			max-width: 320px;
		}
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

	.section-heading {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--gray-900);
		margin: 0.75rem 0 -0.125rem;
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
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-600);
	}

	.stat-v {
		font-size: 2.4rem;
		font-weight: 750;
		font-stretch: var(--figure-stretch);
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
		grid-template-columns: 1fr;
		gap: 0.625rem;
	}

	@media (min-width: 640px) {
		.manage-links {
			grid-template-columns: 1fr 1fr;
		}
	}

	.manage-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.manage-t {
		color: var(--gray-900);
		font-weight: var(--font-weight-semibold);
	}

	.manage-d {
		font-size: var(--text-xs);
		font-weight: 400;
		color: var(--gray-500);
	}

	.manage-chev {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: var(--gray-400);
	}

	.manage-link:hover .manage-chev {
		color: var(--brand);
	}

	.manage-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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
