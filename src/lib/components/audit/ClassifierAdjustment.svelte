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
	import { formatNumber, formatSigned, formatWholeLitres } from '$lib/utils/formatting';
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

<section class="classifier">
	<div class="top">
		<p class="name"><span class="ui-label">Classifier</span>{vehicle.code} {vehicle.name}</p>
		<span class="ui-pill {existing ? 'good' : 'warn'}">
			{existing ? 'Saved' : 'Missing'}{claim.claimablePercentage !== null
				? ` · ${formatNumber(claim.claimablePercentage, 1)}%`
				: ''}
		</span>
	</div>

	<dl class="figs">
		<div><dt>Bowser</dt><dd>{formatWholeLitres(totalLitres)}</dd></div>
		<div><dt>On claimable work</dt><dd>{formatWholeLitres(baseEligibleLitres)}</dd></div>
		<div class="hl"><dt>Claimable</dt><dd>{formatWholeLitres(claim.claimableLitres)}</dd></div>
	</dl>

	<div class="inputs">
		<label>
			<span>Measured L</span>
			<input type="number" inputmode="decimal" min="0.01" step="0.01" bind:value={measuredLitres} />
		</label>
		<label>
			<span>Claimable L</span>
			<input type="number" inputmode="decimal" min="0" step="0.01" bind:value={classifierClaimableLitres} />
		</label>
		<label class="wide">
			<span>Workbook</span>
			<input type="text" bind:value={sourceReference} placeholder="file name" />
		</label>
		<label class="wide">
			<span>Note</span>
			<input type="text" bind:value={notes} placeholder="optional" />
		</label>
	</div>

	<div class="foot">
		{#if measuredLitres && measuredLitres > 0}
			<span
				class="ui-pill {variance.exceedsThreshold ? 'warn' : 'plain'}"
				title="Bowser total vs the classifier's measured litres. Over {VARIANCE_THRESHOLD_PCT}%: check the GPS file is {vehicle.code}'s for this month."
			>
				Bowser vs GPS {formatSigned(variance.litres)} L ({formatSigned(variance.percentage, 1)}%)
			</span>
		{:else}
			<span></span>
		{/if}
		<button
			type="button"
			class="ui-btn primary"
			onclick={save}
			disabled={saving || !draftAdjustment}
		>
			{saving ? 'Saving…' : existing ? 'Update' : 'Save'}
		</button>
	</div>
	{#if error}<p class="msg err">{error}</p>{/if}
	{#if success}<p class="msg ok">{success}</p>{/if}
</section>

<style>
	.classifier {
		margin-top: 1rem;
		padding: 0.875rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		background: var(--gray-50);
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.name {
		margin: 0;
		display: grid;
		gap: 0.125rem;
		font-weight: 700;
	}

	.figs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 0.75rem 0;
	}

	.figs dt {
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.figs dd {
		margin: 0;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.figs .hl dd {
		color: #1f6b3a;
	}

	.inputs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.inputs label {
		display: grid;
		gap: 0.25rem;
	}

	.inputs span {
		font-size: var(--text-xs);
		color: var(--gray-500);
	}

	.inputs input {
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		background: var(--white);
		font: inherit;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}

	.inputs input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	@media (max-width: 640px) {
		.inputs {
			grid-template-columns: 1fr 1fr;
		}
	}

	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.msg {
		margin: 0.5rem 0 0;
		font-size: var(--text-sm);
	}

	.msg.err {
		color: var(--error);
	}

	.msg.ok {
		color: #1f6b3a;
	}
</style>
