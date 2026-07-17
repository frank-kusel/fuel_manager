import { describe, expect, it } from 'vitest';
import {
	calculateClassifierVariance,
	calculateDieselClaim,
	roundClaimLitres
} from './diesel-claim';

describe('calculateDieselClaim', () => {
	it('uses activity eligibility for ordinary vehicles', () => {
		const result = calculateDieselClaim({
			totalLitres: 1000,
			baseEligibleLitres: 760,
			method: 'activity_only'
		});
		expect(result.claimableLitres).toBe(760);
		expect(result.nonClaimableLitres).toBe(240);
	});

	it('applies the classifier percentage only to eligible Actros litres', () => {
		const result = calculateDieselClaim({
			totalLitres: 1000,
			baseEligibleLitres: 900,
			method: 'monthly_classifier',
			adjustment: {
				classifier_measured_litres: 500,
				classifier_claimable_litres: 310,
				claimable_percentage: 62
			}
		});
		expect(result.claimableLitres).toBe(558);
		expect(result.nonClaimableLitres).toBe(442);
	});

	it('conservatively excludes a classifier vehicle when its adjustment is missing', () => {
		const result = calculateDieselClaim({
			totalLitres: 1000,
			baseEligibleLitres: 900,
			method: 'monthly_classifier'
		});
		expect(result.claimableLitres).toBe(0);
		expect(result.nonClaimableLitres).toBe(1000);
		expect(result.missingAdjustment).toBe(true);
	});

	it.each([
		[0, 1000],
		[500, 100]
	])('supports a classifier claim of %s litres', (classifierClaimable, expectedNonClaimable) => {
		const result = calculateDieselClaim({
			totalLitres: 1000,
			baseEligibleLitres: 900,
			method: 'monthly_classifier',
			adjustment: {
				classifier_measured_litres: 500,
				classifier_claimable_litres: classifierClaimable,
				claimable_percentage: classifierClaimable / 5
			}
		});
		expect(result.nonClaimableLitres).toBe(expectedNonClaimable);
	});

	it('keeps rounded totals reconcilable', () => {
		const result = calculateDieselClaim({
			totalLitres: 1234.56,
			baseEligibleLitres: 1011.11,
			method: 'monthly_classifier',
			adjustment: {
				classifier_measured_litres: 700,
				classifier_claimable_litres: 431.37,
				claimable_percentage: 61.624286
			}
		});
		const total = roundClaimLitres(result.totalLitres);
		const claimable = roundClaimLitres(result.claimableLitres);
		const nonClaimable = roundClaimLitres(total - claimable);
		expect(claimable + nonClaimable).toBe(total);
	});
});

describe('calculateClassifierVariance', () => {
	it('warns when bowser and telematics litres differ by more than five percent', () => {
		expect(calculateClassifierVariance(1100, 1000).exceedsThreshold).toBe(true);
		expect(calculateClassifierVariance(1040, 1000).exceedsThreshold).toBe(false);
	});
});
