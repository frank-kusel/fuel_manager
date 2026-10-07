<script lang="ts">
	/**
	 * Step 3 — the claim: what it comes to, how the month's litres split, and
	 * the three inputs that decide it (which activities are claimable, each
	 * classifier vehicle's monthly share, and the rate / DRS number).
	 */
	import StackedBar from '$lib/components/charts/StackedBar.svelte';
	import ClassifierAdjustment, {
		type ClassifierVehicle
	} from '$lib/components/audit/ClassifierAdjustment.svelte';
	import { claimSettings, LEGACY_SETTINGS_KEY } from '$lib/stores/claim-settings';
	import { toast } from '$lib/stores/toast';
	import { formatRand, formatWholeLitres } from '$lib/utils/formatting';
	import type { ClaimSummary } from '$lib/utils/claim-totals';
	import type { MonthOption } from '$lib/utils/dates';
	import type { Activity, VehicleMonthlyClaimAdjustment } from '$lib/types';

	interface Props {
		month: MonthOption;
		claim: ClaimSummary;
		activities: Activity[];
		classifierVehicles: ClassifierVehicle[];
		adjustments: VehicleMonthlyClaimAdjustment[];
		onrefresh: () => Promise<void>;
		onsettings: () => void;
	}

	let { month, claim, activities, classifierVehicles, adjustments, onrefresh, onsettings }: Props =
		$props();

	let refundRands = $derived((claim.claimableLitres * $claimSettings.rateCents) / 100);
	let segments = $derived([
		{ label: 'Claimable', value: claim.claimableLitres, tone: 'good' as const },
		{
			label: 'Not claimable',
			value: Math.max(0, claim.nonClaimableLitres - claim.excludedLitres),
			tone: 'muted' as const
		},
		...(claim.excludedLitres > 0
			? [{ label: 'Held back · no classifier result', value: claim.excludedLitres, tone: 'warn' as const }]
			: [])
	]);

	// ---- Activity eligibility ----
	// Unreviewed activities are prefilled from this browser's old list if it has
	// one, else by name; nothing is claimed for them until saved.
	const NON_ELIGIBLE_GUESS = /transport|market|town|private|road|staff/i;

	function legacyNonEligible(): string[] | null {
		try {
			const raw = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) || 'null');
			return Array.isArray(raw?.nonEligible) ? raw.nonEligible : null;
		} catch {
			return null;
		}
	}

	let draft = $state<Record<string, boolean>>({});
	let saving = $state(false);

	// Re-seed only when the saved eligibility changes, so an unrelated refresh
	// (a close, a classifier save) never discards toggles in progress.
	let savedKey = $derived(
		activities
			.map((a) => `${a.id}:${a.diesel_claim_eligible}:${a.diesel_claim_reviewed_at ?? ''}`)
			.join('|')
	);
	$effect(() => {
		void savedKey;
		const legacy = legacyNonEligible();
		draft = Object.fromEntries(
			activities.map((a) => {
				if (a.diesel_claim_reviewed_at) return [a.id, a.diesel_claim_eligible];
				if (legacy) return [a.id, !legacy.includes(a.name)];
				return [a.id, !NON_ELIGIBLE_GUESS.test(a.name)];
			})
		);
	});

	let unreviewed = $derived(activities.filter((a) => !a.diesel_claim_reviewed_at).length);
	let dirty = $derived(
		unreviewed > 0 || activities.some((a) => draft[a.id] !== a.diesel_claim_eligible)
	);
	let claimableCount = $derived(activities.filter((a) => draft[a.id] !== false).length);
	let showEligibility = $state(false);
	$effect(() => {
		if (unreviewed > 0) showEligibility = true;
	});

	async function saveEligibility() {
		saving = true;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const result = await supabaseService.saveActivityClaimEligibility(
				activities.map((a) => ({ id: a.id, diesel_claim_eligible: draft[a.id] !== false }))
			);
			if (result.error) throw new Error(result.error);
			await onrefresh();
			toast.success('Eligibility saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Eligibility not saved');
		} finally {
			saving = false;
		}
	}

	let shownClassifiers = $derived(
		classifierVehicles.filter(
			(v) =>
				(claim.byVehicle.get(v.id)?.totalLitres ?? 0) > 0 ||
				adjustments.some((a) => a.vehicle_id === v.id && a.claim_month.startsWith(month.key))
		)
	);
</script>

<div class="figures">
	<div>
		<p class="ui-label">Refund estimate</p>
		<p class="ui-figure rand">{formatRand(refundRands)}</p>
	</div>
	<div>
		<p class="ui-label">Claimable</p>
		<p class="ui-figure litres">{formatWholeLitres(claim.claimableLitres)}<small>L</small></p>
	</div>
	<button class="setup" onclick={onsettings} title="Rate, DRS number and tolerance">
		<span class="ui-pill plain">{$claimSettings.rateCents} c/L</span>
		<span class="ui-pill {$claimSettings.regNo ? 'good' : 'warn'}">
			{$claimSettings.regNo ? `DRS ${$claimSettings.regNo}` : 'No DRS no.'}
		</span>
	</button>
</div>

<StackedBar {segments} />

<!-- Activity eligibility -->
<div class="block">
	<button class="block-head" onclick={() => (showEligibility = !showEligibility)} aria-expanded={showEligibility}>
		<span class="ui-label">Activities</span>
		<span class="ui-muted count">
			{claimableCount} of {activities.length} claimable{unreviewed > 0 ? ` · ${unreviewed} to review` : ''}
		</span>
		<span class="chev" class:open={showEligibility} aria-hidden="true">›</span>
	</button>
	{#if showEligibility}
		<div class="chips">
			{#each activities as a (a.id)}
				<button
					class="chip"
					class:on={draft[a.id] !== false}
					class:unreviewed={!a.diesel_claim_reviewed_at}
					aria-pressed={draft[a.id] !== false}
					onclick={() => (draft = { ...draft, [a.id]: !(draft[a.id] !== false) })}
				>
					{a.name}
				</button>
			{/each}
		</div>
		{#if dirty}
			<div class="save-row">
				<span class="ui-muted">Filled = claimable. Saved for every month.</span>
				<button class="ui-btn primary" onclick={saveEligibility} disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		{/if}
	{/if}
</div>

{#each shownClassifiers as vehicle (vehicle.id)}
	{@const vehicleClaim = claim.byVehicle.get(vehicle.id)}
	<ClassifierAdjustment
		{vehicle}
		claimMonth={`${month.key}-01`}
		totalLitres={vehicleClaim?.totalLitres ?? 0}
		baseEligibleLitres={vehicleClaim?.baseEligibleLitres ?? 0}
		existing={adjustments.find(
			(a) => a.vehicle_id === vehicle.id && a.claim_month.startsWith(month.key)
		) ?? null}
		onsaved={onrefresh}
	/>
{/each}

<style>
	p {
		margin: 0;
	}

	.figures {
		display: grid;
		grid-template-columns: auto auto 1fr;
		align-items: end;
		gap: 1.5rem;
		margin-bottom: 0.875rem;
	}

	.rand {
		font-size: 2rem;
		margin-top: 0.25rem;
		color: #1f6b3a;
	}

	.litres {
		font-size: 1.5rem;
		margin-top: 0.25rem;
	}

	.setup {
		justify-self: end;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.375rem;
		border: 0;
		background: none;
		padding: 0;
		cursor: pointer;
	}

	@media (max-width: 520px) {
		.figures {
			grid-template-columns: 1fr 1fr;
			row-gap: 0.75rem;
		}

		.setup {
			grid-column: 1 / -1;
			justify-self: start;
			justify-content: flex-start;
		}
	}

	.block {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--gray-100);
	}

	.block-head {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		width: 100%;
		border: 0;
		background: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		font: inherit;
	}

	.count {
		font-size: var(--text-xs);
		flex: 1;
	}

	.chev {
		color: var(--gray-400);
		transition: transform 0.15s ease;
	}

	.chev.open {
		transform: rotate(90deg);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.625rem;
	}

	.chip {
		padding: 0.3125rem 0.625rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--gray-300);
		background: var(--white);
		color: var(--gray-500);
		font: inherit;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		text-decoration: line-through;
		text-decoration-color: var(--gray-300);
	}

	.chip.on {
		background: #ecf6ef;
		border-color: #b9dcc4;
		color: #1f6b3a;
		text-decoration: none;
	}

	.chip.unreviewed {
		border-style: dashed;
		border-color: var(--warning);
	}

	.save-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.75rem;
		font-size: var(--text-xs);
	}
</style>
