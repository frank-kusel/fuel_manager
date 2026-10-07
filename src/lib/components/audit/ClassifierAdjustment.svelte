<script lang="ts">
	/**
	 * One monthly-classifier vehicle's claim share for one month: the telematics
	 * classifier's measured and claimable litres, from which its percentage is
	 * derived. Without a saved result that month's litres are excluded.
	 *
	 * The page owns the data (entries, saved adjustments) and passes it in, so
	 * this card's figures are the same numbers the claim total uses.
	 */
	import {
		adjustmentPercentage,
		calculateClassifierVariance,
		calculateDieselClaim
	} from '$lib/utils/diesel-claim';
	import { formatLitres, formatNumber } from '$lib/utils/formatting';
	import type { VehicleMonthlyClaimAdjustment } from '$lib/types';

	export interface ClassifierVehicle {
		id: string;
		code: string;
		name: string;
	}

	interface Props {
		vehicle: ClassifierVehicle;
		/** YYYY-MM-01 */
		claimMonth: string;
		totalLitres: number;
		baseEligibleLitres: number;
		existing: VehicleMonthlyClaimAdjustment | null;
		onsaved?: () => void;
	}

	let { vehicle, claimMonth, totalLitres, baseEligibleLitres, existing, onsaved }: Props =
		$props();

	/** Bowser vs telematics totals further apart than this need a second look. */
	const VARIANCE_THRESHOLD_PCT = 5;

	let saving = $state(false);
	let error = $state('');
	let success = $state('');
	let measuredLitres = $state<number | null>(null);
	let classifierClaimableLitres = $state<number | null>(null);
	let sourceReference = $state('');
	let notes = $state('');

	// Re-seed the inputs when the month, the vehicle or the saved result changes.
	$effect(() => {
		void claimMonth;
		void vehicle.id;
		measuredLitres = existing?.classifier_measured_litres ?? null;
		classifierClaimableLitres = existing?.classifier_claimable_litres ?? null;
		sourceReference = existing?.source_reference ?? '';
		notes = existing?.notes ?? '';
		error = '';
	});

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
		const draft = {
			classifier_measured_litres: measuredLitres,
			classifier_claimable_litres: classifierClaimableLitres,
			claimable_percentage: 0
		};
		draft.claimable_percentage = adjustmentPercentage(draft) ?? 0;
		return draft;
	});
	const claim = $derived(
		calculateDieselClaim({
			totalLitres,
			baseEligibleLitres,
			method: 'monthly_classifier',
			adjustment: draftAdjustment
		})
	);
	const variance = $derived(
		calculateClassifierVariance(totalLitres, measuredLitres ?? 0, VARIANCE_THRESHOLD_PCT)
	);

	async function save() {
		if (!draftAdjustment) {
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
				claim_month: claimMonth,
				classifier_measured_litres: draftAdjustment.classifier_measured_litres,
				classifier_claimable_litres: draftAdjustment.classifier_claimable_litres,
				source_reference: sourceReference.trim() || null,
				notes: notes.trim() || null
			});
			if (result.error || !result.data) throw new Error(result.error || 'Adjustment was not saved');
			success = `${vehicle.code} classifier result saved.`;
			onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save the classifier result';
		} finally {
			saving = false;
		}
	}
</script>

<section class="adjustment-panel">
	<div class="panel-heading">
		<div>
			<p class="eyebrow">Monthly classifier</p>
			<h2>{vehicle.code} {vehicle.name}</h2>
		</div>
		{#if existing}<span class="saved-badge">Saved</span>{/if}
	</div>

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
				The two totals differ by more than {VARIANCE_THRESHOLD_PCT}%. Confirm the GPS file is for
				{vehicle.code} and the selected month.
			</p>
		{:else if totalLitres > 0 && !existing && !draftAdjustment}
			<p class="message warning">
				No classifier result is saved. Until one is saved, the claim excludes this month's
				{vehicle.code} litres.
			</p>
		{/if}
		{#if error}<p class="message error">{error}</p>{/if}
		{#if success}<p class="message success">{success}</p>{/if}

		<div class="actions">
			<button type="button" onclick={save} disabled={saving || !draftAdjustment}>
				{saving ? 'Saving...' : existing ? 'Update adjustment' : 'Save adjustment'}
			</button>
		</div>
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
