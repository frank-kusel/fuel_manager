import type { DieselClaimMethod, VehicleMonthlyClaimAdjustment } from '$lib/types';

export interface DieselClaimInput {
	totalLitres: number;
	baseEligibleLitres: number;
	method: DieselClaimMethod;
	adjustment?: Pick<
		VehicleMonthlyClaimAdjustment,
		'classifier_measured_litres' | 'classifier_claimable_litres' | 'claimable_percentage'
	> | null;
}

export interface DieselClaimResult {
	totalLitres: number;
	baseEligibleLitres: number;
	claimableLitres: number;
	nonClaimableLitres: number;
	claimablePercentage: number | null;
	claimBasis: string;
	missingAdjustment: boolean;
}

export interface ClassifierVariance {
	litres: number;
	percentage: number;
	exceedsThreshold: boolean;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function adjustmentPercentage(adjustment: DieselClaimInput['adjustment']): number | null {
	if (!adjustment || adjustment.classifier_measured_litres <= 0) return null;
	return clamp(
		(adjustment.classifier_claimable_litres / adjustment.classifier_measured_litres) * 100,
		0,
		100
	);
}

export function calculateDieselClaim(input: DieselClaimInput): DieselClaimResult {
	const totalLitres = Math.max(0, input.totalLitres || 0);
	const baseEligibleLitres = clamp(input.baseEligibleLitres || 0, 0, totalLitres);

	if (input.method === 'monthly_classifier') {
		const percentage = adjustmentPercentage(input.adjustment);
		if (percentage === null) {
			return {
				totalLitres,
				baseEligibleLitres,
				claimableLitres: 0,
				nonClaimableLitres: totalLitres,
				claimablePercentage: null,
				claimBasis: 'Classifier result missing - excluded',
				missingAdjustment: true
			};
		}

		const claimableLitres = baseEligibleLitres * (percentage / 100);
		return {
			totalLitres,
			baseEligibleLitres,
			claimableLitres,
			nonClaimableLitres: totalLitres - claimableLitres,
			claimablePercentage: percentage,
			claimBasis: `Eligible activities x ${percentage.toFixed(2)}% classifier`,
			missingAdjustment: false
		};
	}

	return {
		totalLitres,
		baseEligibleLitres,
		claimableLitres: baseEligibleLitres,
		nonClaimableLitres: totalLitres - baseEligibleLitres,
		claimablePercentage: null,
		claimBasis: 'Activity eligibility',
		missingAdjustment: false
	};
}

export function calculateClassifierVariance(
	fuelManagerLitres: number,
	classifierMeasuredLitres: number,
	thresholdPercentage: number = 5
): ClassifierVariance {
	const litres = fuelManagerLitres - classifierMeasuredLitres;
	const percentage = classifierMeasuredLitres > 0 ? (litres / classifierMeasuredLitres) * 100 : 0;
	return {
		litres,
		percentage,
		exceedsThreshold: classifierMeasuredLitres > 0 && Math.abs(percentage) > thresholdPercentage
	};
}

export function roundClaimLitres(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
