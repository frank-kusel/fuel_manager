import { describe, expect, it } from 'vitest';
import { monthlyClaims, summariseClaim, type ClaimAdjustment, type ClaimEntry } from './claim-totals';

function entry(overrides: Partial<ClaimEntry> = {}): ClaimEntry {
	return {
		vehicleId: 'tractor',
		date: '2026-06-10',
		litres: 100,
		eligible: true,
		method: 'activity_only',
		...overrides
	};
}

function adjustment(month: string, measured: number, claimable: number): ClaimAdjustment {
	return {
		vehicle_id: 'actros',
		claim_month: `${month}-01`,
		classifier_measured_litres: measured,
		classifier_claimable_litres: claimable,
		claimable_percentage: (claimable / measured) * 100
	};
}

describe('summariseClaim', () => {
	it('claims the litres on claimable activities for an activity-only vehicle', () => {
		const summary = summariseClaim([entry(), entry({ litres: 40, eligible: false })]);

		expect(summary).toMatchObject({
			totalLitres: 140,
			claimableLitres: 100,
			nonClaimableLitres: 40,
			missingAdjustments: 0,
			excludedLitres: 0
		});
	});

	it("applies a classifier vehicle's monthly share to its claimable base", () => {
		const summary = summariseClaim(
			[
				entry({ vehicleId: 'actros', method: 'monthly_classifier', litres: 800 }),
				entry({ vehicleId: 'actros', method: 'monthly_classifier', litres: 200, eligible: false })
			],
			[adjustment('2026-06', 1000, 600)]
		);

		// 800 claimable-activity litres × 60%
		expect(summary.claimableLitres).toBeCloseTo(480);
		expect(summary.byVehicle.get('actros')).toMatchObject({
			totalLitres: 1000,
			baseEligibleLitres: 800,
			missingMonths: []
		});
	});

	it('excludes a classifier month with no result, and says which', () => {
		const summary = summariseClaim([
			entry({ vehicleId: 'actros', method: 'monthly_classifier', litres: 500 }),
			entry()
		]);

		expect(summary.claimableLitres).toBe(100);
		expect(summary.missingAdjustments).toBe(1);
		expect(summary.excludedLitres).toBe(500);
		expect(summary.byVehicle.get('actros')!.missingMonths).toEqual(['2026-06']);
	});

	it('uses each month its own share across a multi-month period', () => {
		const summary = summariseClaim(
			[
				entry({ vehicleId: 'actros', method: 'monthly_classifier', date: '2026-06-20', litres: 100 }),
				entry({ vehicleId: 'actros', method: 'monthly_classifier', date: '2026-07-05', litres: 100 }),
				entry({ vehicleId: 'actros', method: 'monthly_classifier', date: '2026-08-05', litres: 100 })
			],
			[adjustment('2026-06', 100, 50), adjustment('2026-07', 100, 100)]
		);

		expect(summary.claimableLitres).toBeCloseTo(150); // 50 + 100 + 0
		expect(summary.byVehicle.get('actros')!.missingMonths).toEqual(['2026-08']);
	});
});

describe('monthlyClaims', () => {
	it('summarises each month on its own, newest first', () => {
		const months = monthlyClaims(
			[
				entry({ date: '2026-06-10', litres: 100 }),
				entry({ date: '2026-07-10', litres: 50, eligible: false }),
				entry({ vehicleId: 'actros', method: 'monthly_classifier', date: '2026-07-11', litres: 200 })
			],
			[adjustment('2026-06', 100, 100)]
		);

		expect(months.map((m) => m.month)).toEqual(['2026-07', '2026-06']);
		expect(months[0]).toMatchObject({
			totalLitres: 250,
			claimableLitres: 0,
			excludedLitres: 200,
			missingAdjustments: 1
		});
		expect(months[1]).toMatchObject({ totalLitres: 100, claimableLitres: 100 });
	});
});
