<script lang="ts">
	import { calculateClassifierVariance, calculateDieselClaim } from '$lib/utils/diesel-claim';
	import { formatLitres, formatNumber } from '$lib/utils/formatting';
	import type { DieselClaimMethod, VehicleMonthlyClaimAdjustment } from '$lib/types';

	interface Props {
		year: number;
		month: number;
		onsaved?: () => void;
	}

	interface ActrosVehicle {
		id: string;
		code: string;
		name: string;
		diesel_claim_method: DieselClaimMethod;
	}

	interface FuelRow {
		litres_dispensed: number | null;
		activities: { diesel_claim_eligible: boolean } | null;
	}

	let { year, month, onsaved }: Props = $props();
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');
	let vehicle = $state<ActrosVehicle | null>(null);
	let existing = $state<VehicleMonthlyClaimAdjustment | null>(null);
	let totalLitres = $state(0);
	let baseEligibleLitres = $state(0);
	let measuredLitres = $state<number | null>(null);
	let classifierClaimableLitres = $state<number | null>(null);
	let sourceReference = $state('');
	let notes = $state('');
	let loadSequence = 0;

	const monthKey = $derived(`${year}-${String(month).padStart(2, '0')}-01`);
	const monthEnd = $derived(
		`${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
	);
	const draftAdjustment = $derived.by(() => {
		if (
			typeof measuredLitres !== 'number' ||
			typeof classifierClaimableLitres !== 'number' ||
			!Number.isFinite(measuredLitres) ||
			!Number.isFinite(classifierClaimableLitres) ||
			measuredLitres <= 0 ||
			classifierClaimableLitres < 0 ||
			classifierClaimableLitres > measuredLitres
		)
			return null;
		return {
			classifier_measured_litres: measuredLitres,
			classifier_claimable_litres: classifierClaimableLitres,
			claimable_percentage: (classifierClaimableLitres / measuredLitres) * 100
		};
	});
	const claim = $derived(
		calculateDieselClaim({
			totalLitres,
			baseEligibleLitres,
			method: vehicle?.diesel_claim_method ?? 'monthly_classifier',
			adjustment: draftAdjustment
		})
	);
	const variance = $derived(calculateClassifierVariance(totalLitres, measuredLitres ?? 0));

	$effect(() => {
		void year;
		void month;
		load();
	});

	async function load() {
		const sequence = ++loadSequence;
		loading = true;
		error = '';
		success = '';
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const client = supabaseService.getClient();
			const vehicleResult = await client
				.from('vehicles')
				.select('id, code, name, diesel_claim_method')
				.eq('code', 'KC06')
				.maybeSingle();
			if (vehicleResult.error) throw new Error(vehicleResult.error.message);
			if (!vehicleResult.data) throw new Error('Actros vehicle KC06 was not found');
			const actros = vehicleResult.data as ActrosVehicle;

			const [entriesResult, adjustmentResult] = await Promise.all([
				client
					.from('fuel_entries')
					.select('litres_dispensed, activities:activity_id(diesel_claim_eligible)')
					.eq('vehicle_id', actros.id)
					.is('deleted_at', null)
					.gte('entry_date', monthKey)
					.lte('entry_date', monthEnd),
				supabaseService.getVehicleMonthlyClaimAdjustment(actros.id, monthKey)
			]);
			if (entriesResult.error) throw new Error(entriesResult.error.message);
			if (adjustmentResult.error) throw new Error(adjustmentResult.error);
			if (sequence !== loadSequence) return;

			const rows = (entriesResult.data || []) as unknown as FuelRow[];
			vehicle = actros;
			totalLitres = rows.reduce((sum, row) => sum + Number(row.litres_dispensed || 0), 0);
			baseEligibleLitres = rows
				.filter((row) => row.activities?.diesel_claim_eligible === true)
				.reduce((sum, row) => sum + Number(row.litres_dispensed || 0), 0);
			existing = adjustmentResult.data;
			measuredLitres = existing?.classifier_measured_litres ?? null;
			classifierClaimableLitres = existing?.classifier_claimable_litres ?? null;
			sourceReference = existing?.source_reference ?? '';
			notes = existing?.notes ?? '';
		} catch (err) {
			if (sequence === loadSequence) {
				error = err instanceof Error ? err.message : 'Failed to load the Actros adjustment';
			}
		} finally {
			if (sequence === loadSequence) loading = false;
		}
	}

	async function save() {
		if (!vehicle || !draftAdjustment) {
			error = 'Enter valid measured and claimable litres from the classifier.';
			return;
		}
		saving = true;
		error = '';
		success = '';
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const result = await supabaseService.upsertVehicleMonthlyClaimAdjustment({
				vehicle_id: vehicle.id,
				claim_month: monthKey,
				classifier_measured_litres: draftAdjustment.classifier_measured_litres,
				classifier_claimable_litres: draftAdjustment.classifier_claimable_litres,
				source_reference: sourceReference.trim() || null,
				notes: notes.trim() || null
			});
			if (result.error || !result.data) throw new Error(result.error || 'Adjustment was not saved');
			existing = result.data;
			success = 'Monthly Actros claim adjustment saved.';
			onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save the Actros adjustment';
		} finally {
			saving = false;
		}
	}
</script>

<section class="adjustment-panel">
	<div class="panel-heading">
		<div>
			<p class="eyebrow">Monthly classifier</p>
			<h2>Actros claim adjustment</h2>
		</div>
		{#if existing}<span class="saved-badge">Saved</span>{/if}
	</div>

	{#if loading}
		<div class="loading-bar"></div>
	{:else if error && !vehicle}
		<p class="message error">{error}</p>
	{:else}
		<div class="metric-grid">
			<div><span>Fuel Manager total</span><strong>{formatLitres(totalLitres)} L</strong></div>
			<div>
				<span>Activity-eligible base</span><strong>{formatLitres(baseEligibleLitres)} L</strong>
			</div>
			<div>
				<span>Final claimable</span><strong class="claimable"
					>{formatLitres(claim.claimableLitres)} L</strong
				>
			</div>
			<div>
				<span>Non-claimable</span><strong>{formatLitres(claim.nonClaimableLitres)} L</strong>
			</div>
		</div>

		<div class="input-grid">
			<label>
				<span>Classifier measured litres</span>
				<input
					type="number"
					min="0.01"
					step="0.01"
					bind:value={measuredLitres}
					placeholder="e.g. 850.25"
				/>
			</label>
			<label>
				<span>Classifier claimable litres</span>
				<input
					type="number"
					min="0"
					step="0.01"
					bind:value={classifierClaimableLitres}
					placeholder="e.g. 527.16"
				/>
			</label>
			<label>
				<span>Classifier workbook reference</span>
				<input
					type="text"
					bind:value={sourceReference}
					placeholder="e.g. diesel-claim-june-2026.xlsx"
				/>
			</label>
			<label>
				<span>Notes</span>
				<input type="text" bind:value={notes} placeholder="Optional audit note" />
			</label>
		</div>

		<div class="calculation-row">
			<div>
				<span>Derived share</span>
				<strong
					>{claim.claimablePercentage === null
						? 'Not entered'
						: `${formatNumber(claim.claimablePercentage, 2)}%`}</strong
				>
			</div>
			{#if measuredLitres && measuredLitres > 0}
				<div class:variance-warning={variance.exceedsThreshold}>
					<span>Bowser vs telematics</span>
					<strong
						>{variance.litres >= 0 ? '+' : ''}{formatLitres(variance.litres)} L ({variance.percentage >=
						0
							? '+'
							: ''}{formatNumber(variance.percentage, 1)}%)</strong
					>
				</div>
			{/if}
		</div>
		{#if variance.exceedsThreshold}
			<p class="message warning">
				The two totals differ by more than 5%. Confirm the GPS file is for KC06 and the selected
				month.
			</p>
		{:else if totalLitres > 0 && !existing && !draftAdjustment}
			<p class="message warning">
				No classifier result is saved. Until one is saved, the monthly report excludes all Actros
				litres from the claim.
			</p>
		{/if}
		{#if error}<p class="message error">{error}</p>{/if}
		{#if success}<p class="message success">{success}</p>{/if}

		<div class="actions">
			<button type="button" onclick={save} disabled={saving || !draftAdjustment}>
				{saving ? 'Saving...' : existing ? 'Update adjustment' : 'Save adjustment'}
			</button>
		</div>
	{/if}
</section>

<style>
	.adjustment-panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.eyebrow {
		margin: 0 0 0.2rem;
		color: var(--brand-hover);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	h2 {
		margin: 0;
		color: var(--gray-900);
		font-size: 1.05rem;
	}
	.saved-badge {
		background: #eef7ef;
		color: #24633a;
		border-radius: 999px;
		padding: 0.25rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.metric-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.metric-grid div {
		background: var(--gray-50);
		border-radius: var(--radius-md);
		padding: 0.7rem;
		min-width: 0;
	}
	.metric-grid span,
	.calculation-row span {
		display: block;
		color: var(--gray-500);
		font-size: 0.72rem;
		margin-bottom: 0.15rem;
	}
	.metric-grid strong,
	.calculation-row strong {
		color: var(--gray-900);
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
	}
	.metric-grid .claimable {
		color: #24633a;
	}
	.input-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	label span {
		display: block;
		color: var(--gray-700);
		font-size: 0.78rem;
		font-weight: 600;
		margin-bottom: 0.3rem;
	}
	input {
		width: 100%;
		min-height: 2.65rem;
		box-sizing: border-box;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		padding: 0.6rem 0.7rem;
		color: var(--gray-900);
		background: var(--white);
		font: inherit;
	}
	input:focus {
		outline: 2px solid rgba(142, 43, 52, 0.16);
		border-color: var(--primary);
	}
	.calculation-row {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		margin-top: 0.9rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--gray-200);
	}
	.variance-warning strong {
		color: #9a5a0a;
	}
	.message {
		margin: 0.75rem 0 0;
		border-radius: var(--radius-md);
		padding: 0.65rem 0.75rem;
		font-size: 0.78rem;
	}
	.message.warning {
		background: #fff7e7;
		color: #87520b;
	}
	.message.error {
		background: #fff0f0;
		color: #9b2c2c;
	}
	.message.success {
		background: #eef7ef;
		color: #24633a;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.9rem;
	}
	.actions button {
		border: 0;
		border-radius: var(--radius-md);
		background: var(--primary);
		color: white;
		min-height: 2.65rem;
		padding: 0.65rem 1rem;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.loading-bar {
		height: 6rem;
		border-radius: var(--radius-md);
		background: var(--gray-100);
	}
	@media (max-width: 640px) {
		.metric-grid,
		.input-grid {
			grid-template-columns: 1fr 1fr;
		}
		.calculation-row {
			flex-direction: column;
			gap: 0.55rem;
		}
	}
	@media (max-width: 400px) {
		.metric-grid,
		.input-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
