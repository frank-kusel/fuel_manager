<script lang="ts">
	import { onMount } from 'svelte';
	import DataExport from '$lib/components/dashboard/DataExport.svelte';

	/**
	 * Audit view — eligible litres, refund estimate, and readiness checklist.
	 *
	 * The rebate rate and per-activity eligibility are USER SETTINGS
	 * (localStorage), not verified tax rules. The refund figure is an
	 * estimate to sanity-check a claim, not a substitute for the accountant.
	 */

	const SETTINGS_KEY = 'farmtrack_audit_settings_v1';
	const NON_ELIGIBLE_GUESS = /transport|market|town|private|road|staff/i;

	interface AuditSettings {
		rateCents: number;
		regNo: string;
		nonEligible: string[]; // activity names treated as non-eligible
		seeded: boolean;
	}

	let settings = $state<AuditSettings>({
		rateCents: 303.8,
		regNo: '',
		nonEligible: [],
		seeded: false
	});

	let period = $state<'month' | 'lastMonth' | 'all'>('month');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showEligibility = $state(false);
	let showSettings = $state(false);

	let entries = $state<{ litres: number; activity: string; date: string }[]>([]);
	let refills = $state<{ litres_added: number; delivery_date: string; invoice_number: string | null }[]>([]);
	let activities = $state<string[]>([]);
	let lastDipDate = $state<string | null>(null);
	let latestClose = $state<{ reconciliation_date: string; variance_percentage: number | null } | null>(null);

	const nf = new Intl.NumberFormat('en-ZA');

	function loadSettings() {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (raw) settings = { ...settings, ...JSON.parse(raw) };
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

	function periodRange(): { start: string | null; end: string | null } {
		const now = new Date();
		const iso = (d: Date) => d.toISOString().split('T')[0];
		if (period === 'month') {
			return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
		}
		if (period === 'lastMonth') {
			return {
				start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
				end: iso(new Date(now.getFullYear(), now.getMonth(), 0))
			};
		}
		return { start: null, end: null };
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const client = supabaseService.getClient();
			const { start, end } = periodRange();

			let entriesQ = client
				.from('fuel_entries')
				.select('entry_date, litres_dispensed, activities(name)')
				.is('deleted_at', null);
			let refillsQ = client
				.from('tank_refills')
				.select('litres_added, delivery_date, invoice_number');
			if (start && end) {
				entriesQ = entriesQ.gte('entry_date', start).lte('entry_date', end);
				refillsQ = refillsQ.gte('delivery_date', start).lte('delivery_date', end);
			}

			const [entriesRes, refillsRes, actsRes, dipRes, closeRes] = await Promise.all([
				entriesQ,
				refillsQ,
				client.from('activities').select('name').eq('active', true).order('name'),
				client
					.from('tank_readings')
					.select('reading_date')
					.eq('reading_type', 'dipstick')
					.order('reading_date', { ascending: false })
					.limit(1),
				client
					.from('tank_reconciliations')
					.select('reconciliation_date, variance_percentage')
					.order('reconciliation_date', { ascending: false })
					.limit(1)
			]);
			const firstError = entriesRes.error || refillsRes.error || actsRes.error || dipRes.error;
			if (firstError) throw new Error(firstError.message);

			entries = (entriesRes.data || []).map((e: any) => ({
				litres: e.litres_dispensed || 0,
				activity: e.activities?.name || 'Unknown',
				date: e.entry_date
			}));
			refills = refillsRes.data || [];
			activities = (actsRes.data || []).map((a: any) => a.name);
			lastDipDate = dipRes.data?.[0]?.reading_date ?? null;
			latestClose = closeRes.data?.[0] ?? null;

			// First run: seed the non-eligible guesses so the user starts from
			// a conservative default instead of everything-eligible.
			if (!settings.seeded) {
				settings.nonEligible = activities.filter((a) => NON_ELIGIBLE_GUESS.test(a));
				settings.seeded = true;
				saveSettings();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load audit data';
		}
		loading = false;
	}

	onMount(() => {
		loadSettings();
		load();
	});

	function setPeriod(p: typeof period) {
		period = p;
		load();
	}

	function toggleActivity(name: string) {
		if (settings.nonEligible.includes(name)) {
			settings.nonEligible = settings.nonEligible.filter((n) => n !== name);
		} else {
			settings.nonEligible = [...settings.nonEligible, name];
		}
		saveSettings();
	}

	let eligibleLitres = $derived(
		entries.filter((e) => !settings.nonEligible.includes(e.activity)).reduce((s, e) => s + e.litres, 0)
	);
	let nonEligibleLitres = $derived(
		entries.filter((e) => settings.nonEligible.includes(e.activity)).reduce((s, e) => s + e.litres, 0)
	);
	let purchasedLitres = $derived(refills.reduce((s, r) => s + (r.litres_added || 0), 0));
	let refundRands = $derived((eligibleLitres * settings.rateCents) / 100);

	let dipAgeDays = $derived.by(() => {
		if (!lastDipDate) return null;
		return Math.floor((Date.now() - new Date(lastDipDate).getTime()) / 86400000);
	});

	// Month-end close status: the previous calendar month should have a
	// tank_reconciliations row (reconciliation_date = its last day).
	let prevMonthClose = $derived.by(() => {
		const now = new Date();
		const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
		const label = prev.toLocaleDateString('en-ZA', { month: 'long' });
		const closed = latestClose?.reconciliation_date?.startsWith(key) ?? false;
		return { key, label, closed };
	});

	let checklist = $derived.by(() => [
		{
			ok: settings.regNo.trim().length > 0,
			title: 'Diesel refund registration captured',
			detail: settings.regNo.trim() ? `Registered as ${settings.regNo}` : 'Add your DRS registration number in settings below'
		},
		{
			ok: entries.length > 0,
			title: 'Usage logbook maintained',
			detail: 'Litres out per vehicle, activity, and location'
		},
		{
			ok: refills.length > 0 || period !== 'all',
			title: 'Storage logbook maintained',
			detail: 'Deliveries in, with supplier and invoice number'
		},
		{
			ok: prevMonthClose.closed,
			title: 'Previous month closed',
			detail: prevMonthClose.closed
				? `${prevMonthClose.label} closed · variance ${latestClose?.variance_percentage ?? 0}%`
				: `${prevMonthClose.label} not closed yet — run the month-end close`
		},
		{
			ok: refills.length > 0 && refills.every((r) => !!r.invoice_number),
			title: 'Delivery invoice numbers on file',
			detail: refills.some((r) => !r.invoice_number)
				? `${refills.filter((r) => !r.invoice_number).length} deliveries missing an invoice number`
				: 'Every delivery has its invoice number recorded'
		}
	]);

	const periodLabels = { month: 'This month', lastMonth: 'Last month', all: 'All records' };
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
		{#each Object.entries(periodLabels) as [key, label]}
			<button class="chip" class:on={period === key} onclick={() => setPeriod(key as typeof period)}>
				{label}
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
		<!-- Claim stats -->
		<section class="panel claim">
			<div class="claim-main">
				<div>
					<div class="stat-k">Eligible litres</div>
					<div class="stat-v brand">{nf.format(Math.round(eligibleLitres))}<span class="unit">L</span></div>
					<div class="stat-sub">activities marked as qualifying use</div>
				</div>
				<div>
					<div class="stat-k">Refund estimate</div>
					<div class="stat-v">R {nf.format(Math.round(refundRands))}</div>
					<div class="stat-sub">@ {settings.rateCents} c/L — estimate only</div>
				</div>
			</div>
			<div class="claim-row">
				<div>
					<span class="mini-k">Non-eligible</span>
					<span class="mini-v red">{nf.format(Math.round(nonEligibleLitres))} L</span>
				</div>
				<div>
					<span class="mini-k">Purchased</span>
					<span class="mini-v">{nf.format(Math.round(purchasedLitres))} L</span>
				</div>
				<div>
					<span class="mini-k">Entries</span>
					<span class="mini-v">{entries.length}</span>
				</div>
			</div>
		</section>

		<!-- Eligibility editor -->
		<section class="panel">
			<button class="collapser" onclick={() => (showEligibility = !showEligibility)}>
				<span>Activity eligibility ({activities.length - settings.nonEligible.length} eligible · {settings.nonEligible.length} excluded)</span>
				<svg class:open={showEligibility} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
			</button>
			{#if showEligibility}
				<div class="elig-list">
					{#each activities as a}
						<button
							class="elig-row"
							class:excluded={settings.nonEligible.includes(a)}
							onclick={() => toggleActivity(a)}
						>
							<span class="elig-name">{a}</span>
							<span class="elig-state">{settings.nonEligible.includes(a) ? 'Non-eligible' : 'Eligible'}</span>
						</button>
					{/each}
				</div>
				<p class="hint">Tap an activity to toggle. Non-eligible litres are excluded from the claim estimate.</p>
			{/if}
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
				<svg class:open={showSettings} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
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

		<!-- Exports -->
		<h2 class="section-heading">Exports</h2>
		<DataExport />

		<!-- Manage -->
		<h2 class="section-heading">Manage</h2>
		<div class="manage-links">
			<a href="/tools/database" class="manage-link">Database management</a>
			<a href="/tools/reconciliations" class="manage-link">Month-end close</a>
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
	}
</style>
