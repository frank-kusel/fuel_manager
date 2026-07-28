import { describe, expect, it } from 'vitest';
import {
	bandVariance,
	buildMonthLedger,
	burnRate,
	carryForwardRebaselined,
	computeVariance,
	deriveBalance,
	dipAgeDays,
	isDipStale,
	resolveAnchor,
	runwayDays,
	varianceTrend,
	type CloseRow
} from './tank-balance';

function close(overrides: Partial<CloseRow> & { reconciliation_date: string }): CloseRow {
	return {
		calculated_level: null,
		measured_level: null,
		variance: null,
		variance_percentage: null,
		accepted: null,
		...overrides
	};
}

describe('resolveAnchor', () => {
	it('uses the close when one exists', () => {
		const anchor = resolveAnchor({
			latestClose: close({
				reconciliation_date: '2026-06-30',
				calculated_level: 5316.1,
				measured_level: 5800,
				book_at_dip: 5316.1
			}),
			latestDip: { reading_date: '2026-05-02', reading_value: 3600 }
		});

		expect(anchor).toMatchObject({ kind: 'close', date: '2026-06-30', litres: 5316.1 });
		expect(anchor?.varianceLitres).toBeCloseTo(-483.9, 1);
	});

	it('keeps the close even when a newer dip exists — dips check, never re-anchor', () => {
		// This is the policy guard. A regression here silently destroys leak
		// detection by resetting the book into dipstick noise every month.
		const anchor = resolveAnchor({
			latestClose: close({ reconciliation_date: '2026-06-30', calculated_level: 5316.1 }),
			latestDip: { reading_date: '2026-07-24', reading_value: 5000 }
		});

		expect(anchor?.kind).toBe('close');
		expect(anchor?.date).toBe('2026-06-30');
	});

	it('falls back to the dip only when no close exists at all', () => {
		const anchor = resolveAnchor({
			latestClose: null,
			latestDip: { reading_date: '2026-07-24', reading_value: 5000 }
		});

		expect(anchor).toMatchObject({ kind: 'dip', date: '2026-07-24', litres: 5000 });
		expect(anchor?.varianceLitres).toBeNull();
	});

	it('returns null with neither', () => {
		expect(resolveAnchor({ latestClose: null, latestDip: null })).toBeNull();
	});
});

describe('deriveBalance', () => {
	const anchor = resolveAnchor({
		latestClose: close({ reconciliation_date: '2026-06-30', calculated_level: 5316.1 }),
		latestDip: null
	})!;

	it('excludes movements on the anchor date and includes the day after', () => {
		const result = deriveBalance({
			anchor,
			refills: [
				{ delivery_date: '2026-06-30', litres_added: 9999 },
				{ delivery_date: '2026-07-01', litres_added: 100 }
			],
			dispenses: [],
			asOf: '2026-07-28'
		});

		expect(result.deliveries).toBe(100);
	});

	it('excludes future-dated movements', () => {
		const result = deriveBalance({
			anchor,
			refills: [{ delivery_date: '2026-08-15', litres_added: 5000 }],
			dispenses: [{ entry_date: '2026-08-01', litres_dispensed: 300 }],
			asOf: '2026-07-28'
		});

		expect(result.deliveries).toBe(0);
		expect(result.dispensed).toBe(0);
		expect(result.litres).toBe(5316.1);
	});

	it('reproduces the live July 2026 balance', () => {
		// Captured from the production database on 2026-07-28: June close carried
		// 5316.1 L forward, two deliveries totalling 20 000 L and 173 entries
		// totalling 10 916.2 L followed.
		const result = deriveBalance({
			anchor,
			refills: [
				{ delivery_date: '2026-07-10', litres_added: 10000 },
				{ delivery_date: '2026-07-25', litres_added: 10000 }
			],
			dispenses: [{ entry_date: '2026-07-15', litres_dispensed: 10916.2 }],
			asOf: '2026-07-28'
		});

		expect(result.litres).toBeCloseTo(14399.9, 1);
	});

	it('returns the anchor value with no movements, and does not clamp negatives', () => {
		expect(deriveBalance({ anchor, refills: [], dispenses: [], asOf: '2026-07-28' }).litres).toBe(
			5316.1
		);
		expect(
			deriveBalance({
				anchor,
				refills: [],
				dispenses: [{ entry_date: '2026-07-02', litres_dispensed: 9000 }],
				asOf: '2026-07-28'
			}).litres
		).toBeCloseTo(-3683.9, 1);
	});
});

describe('computeVariance', () => {
	it('is positive when the book claims more fuel than the dip found', () => {
		expect(computeVariance(5100, 5000)).toEqual({ litres: 100, pct: 2 });
	});

	it('returns a null percentage rather than Infinity against an empty tank', () => {
		expect(computeVariance(120, 0)).toEqual({ litres: 120, pct: null });
	});
});

describe('bandVariance', () => {
	it('bands on percentage once the tank is large enough for it to dominate', () => {
		expect(bandVariance(300, 15000)?.key).toBe('good'); // 2.0%
		expect(bandVariance(600, 15000)?.key).toBe('acceptable'); // 4.0%
		expect(bandVariance(900, 15000)?.key).toBe('high'); // 6.0%
	});

	it('treats anything inside dipstick tolerance as good, however small the tank', () => {
		// 150 L on a 5 000 L dip is 3% — a pure percentage band would call this
		// borderline, but it is under what the instrument can resolve.
		expect(bandVariance(-150, 5000)?.key).toBe('good');
		expect(bandVariance(200, 2000)?.key).toBe('good'); // 10%, still within tolerance
		expect(bandVariance(-450, 2000)?.key).toBe('high'); // beyond 2x tolerance
	});

	it('uses magnitude, so sign does not change the band', () => {
		expect(bandVariance(-900, 15000)?.key).toBe(bandVariance(900, 15000)?.key);
	});

	it('honours a configured tolerance', () => {
		expect(bandVariance(150, 5000, 100)?.key).toBe('acceptable');
		expect(bandVariance(150, 5000, 200)?.key).toBe('good');
	});

	it('is null without a variance', () => {
		expect(bandVariance(null, 5000)).toBeNull();
	});
});

describe('dip freshness', () => {
	const now = new Date(2026, 6, 28, 9, 0, 0); // 28 July 2026, local

	it('measures age in whole local days', () => {
		expect(dipAgeDays('2026-07-28', now)).toBe(0);
		expect(dipAgeDays('2026-07-24', now)).toBe(4);
	});

	it('goes stale after two weeks', () => {
		expect(isDipStale(dipAgeDays('2026-07-14', now))).toBe(false); // exactly 14
		expect(isDipStale(dipAgeDays('2026-07-13', now))).toBe(true); // 15
	});

	it('is null without a dip', () => {
		expect(dipAgeDays(null, now)).toBeNull();
		expect(isDipStale(null)).toBe(false);
	});
});

describe('burn rate and runway', () => {
	it('averages the window rather than the number of entries', () => {
		expect(burnRate([{ entry_date: '2026-07-01', litres_dispensed: 1400 }], 14)).toBe(100);
	});

	it('has no runway on an empty tank or a still fleet', () => {
		expect(runwayDays(0, 100)).toBeNull();
		expect(runwayDays(-50, 100)).toBeNull();
		expect(runwayDays(1000, 0)).toBeNull();
		expect(runwayDays(1000, 100)).toBe(10);
	});
});

describe('buildMonthLedger', () => {
	const anchor = resolveAnchor({
		latestClose: close({ reconciliation_date: '2026-05-31', calculated_level: 3651.2 }),
		latestDip: null
	})!;

	it('reproduces the live June 2026 close', () => {
		// Production figures: opening 3651.2, deliveries 13 750, dispensed
		// 12 085.1, dip 5 800 on the last day of the month.
		const ledger = buildMonthLedger({
			anchor,
			closingDip: { reading_date: '2026-06-30', reading_value: 5800 },
			refills: [{ delivery_date: '2026-06-10', litres_added: 13750 }],
			dispenses: [{ entry_date: '2026-06-15', litres_dispensed: 12085.1 }],
			monthEnd: '2026-06-30'
		});

		expect(ledger.bookAtDip).toBeCloseTo(5316.1, 1);
		expect(ledger.variance?.litres).toBeCloseTo(-483.9, 1);
		expect(ledger.variance?.pct).toBeCloseTo(-8.34, 2);
		expect(ledger.bookMonthEnd).toBeCloseTo(5316.1, 1);
		expect(ledger.band?.key).toBe('high');
	});

	it('separates the leak check from the carried-forward balance', () => {
		const ledger = buildMonthLedger({
			anchor,
			closingDip: { reading_date: '2026-06-20', reading_value: 4000 },
			refills: [{ delivery_date: '2026-06-25', litres_added: 2000 }],
			dispenses: [{ entry_date: '2026-06-10', litres_dispensed: 500 }],
			monthEnd: '2026-06-30'
		});

		expect(ledger.bookAtDip).toBeCloseTo(3151.2, 1); // 3651.2 - 500
		expect(ledger.variance?.litres).toBeCloseTo(-848.8, 1); // vs the dip, not month end
		expect(ledger.netAfterDip).toBe(2000);
		expect(ledger.bookMonthEnd).toBeCloseTo(5151.2, 1);
	});

	it('counts a movement on the dip day toward the leak check', () => {
		const ledger = buildMonthLedger({
			anchor,
			closingDip: { reading_date: '2026-06-20', reading_value: 4000 },
			refills: [{ delivery_date: '2026-06-20', litres_added: 1000 }],
			dispenses: [],
			monthEnd: '2026-06-30'
		});

		expect(ledger.deliveriesToDip).toBe(1000);
		expect(ledger.deliveriesAfterDip).toBe(0);
	});

	it('still derives a month-end balance without a dip', () => {
		const ledger = buildMonthLedger({
			anchor,
			closingDip: null,
			refills: [{ delivery_date: '2026-06-10', litres_added: 1000 }],
			dispenses: [{ entry_date: '2026-06-11', litres_dispensed: 400 }],
			monthEnd: '2026-06-30'
		});

		expect(ledger.variance).toBeNull();
		expect(ledger.band).toBeNull();
		expect(ledger.bookMonthEnd).toBeCloseTo(4251.2, 1);
	});

	it('counts movements from the anchor when a month was skipped', () => {
		// Anchor is the April close; May was never closed. Movements through May
		// must still be counted, or the June opening silently gains them back.
		const aprilAnchor = resolveAnchor({
			latestClose: close({ reconciliation_date: '2026-04-30', calculated_level: 16160.9 }),
			latestDip: null
		})!;

		const ledger = buildMonthLedger({
			anchor: aprilAnchor,
			closingDip: { reading_date: '2026-06-30', reading_value: 5800 },
			refills: [],
			dispenses: [
				{ entry_date: '2026-05-15', litres_dispensed: 10000 },
				{ entry_date: '2026-06-15', litres_dispensed: 1000 }
			],
			monthEnd: '2026-06-30'
		});

		expect(ledger.dispensedToDip).toBe(11000);
		expect(ledger.bookAtDip).toBeCloseTo(5160.9, 1);
	});

	it('re-baselines to the physical count plus post-dip movements', () => {
		const ledger = buildMonthLedger({
			anchor,
			closingDip: { reading_date: '2026-06-20', reading_value: 4000 },
			refills: [{ delivery_date: '2026-06-25', litres_added: 2000 }],
			dispenses: [],
			monthEnd: '2026-06-30'
		});

		expect(carryForwardRebaselined(ledger)).toBe(6000);
		expect(ledger.bookMonthEnd).not.toBe(6000);
	});
});

describe('varianceTrend', () => {
	// A close carries the book forward, so each gap is a running level, not a
	// monthly increment. These assertions pin that reading down.
	const history = [
		close({ reconciliation_date: '2026-06-30', measured_level: 5800, book_at_dip: 5316.1 }),
		close({ reconciliation_date: '2026-05-31', measured_level: 3600, book_at_dip: 3651.2 }),
		close({ reconciliation_date: '2026-04-30', measured_level: 16200, book_at_dip: 16160.9 })
	];

	it('reports the standing gap, not a sum of gaps', () => {
		const trend = varianceTrend(history);

		expect(trend.months).toBe(3);
		expect(trend.latestGapLitres).toBeCloseTo(-483.9, 1);
		// Summing would give -471.8 and imply a loss that never happened.
		expect(trend.meanGapLitres).toBeCloseTo(-157.27, 1);
	});

	it('measures drift from the oldest close in the window to the newest', () => {
		expect(varianceTrend(history).driftLitres).toBeCloseTo(-444.8, 1); // -483.9 - (-39.1)
	});

	it('stops at the most recent re-baseline', () => {
		const trend = varianceTrend([
			history[0],
			close({ reconciliation_date: '2026-05-31', measured_level: 3600, is_rebaseline: true }),
			history[2]
		]);

		expect(trend.months).toBe(1);
		expect(trend.sinceDate).toBe('2026-05-31');
	});

	it('falls back to the legacy variance column and flags it approximate', () => {
		const trend = varianceTrend([
			close({ reconciliation_date: '2026-06-30', measured_level: 5800, variance: -483.9 })
		]);

		expect(trend.latestGapLitres).toBeCloseTo(-483.9, 1);
		expect(trend.anyApproximate).toBe(true);
	});

	it('is empty rather than NaN with no closes', () => {
		const trend = varianceTrend([]);

		expect(trend.months).toBe(0);
		expect(trend.latestGapLitres).toBeNull();
		expect(trend.meanGapLitres).toBeNull();
		expect(trend.driftLitres).toBeNull();
	});
});
