import { describe, expect, it } from 'vitest';
import {
	anchorLabel,
	bookHistory,
	buildTankInsight,
	dipChecks,
	pctFull,
	resolveAnchor,
	tankAttention,
	type TankBalanceInputs
} from './tank-balance';

/** Closed 31 Aug at 13 597 L; a delivery and some dispensing since. */
function inputs(overrides: Partial<TankBalanceInputs> = {}): TankBalanceInputs {
	const latestClose = {
		reconciliation_date: '2026-08-31',
		calculated_level: 13597,
		measured_level: 13000,
		variance: null,
		variance_percentage: null,
		accepted: true,
		book_at_dip: 13597
	};
	const latestDip = { reading_date: '2026-08-31', reading_value: 13000 };
	return {
		anchor: resolveAnchor({ latestClose, latestDip }),
		latestClose,
		latestDip,
		refills: [{ delivery_date: '2026-09-23', litres_added: 10000 }],
		dispenses: [
			{ entry_date: '2026-09-02', litres_dispensed: 400 },
			{ entry_date: '2026-09-10', litres_dispensed: 600 },
			{ entry_date: '2026-10-05', litres_dispensed: 1000 }
		],
		burnDispenses: [{ entry_date: '2026-10-05', litres_dispensed: 1400 }],
		...overrides
	};
}

const BOWSER = { name: 'Tank A', capacity: 24000 };

describe('buildTankInsight', () => {
	it('is null when nothing anchors the book', () => {
		expect(
			buildTankInsight(
				{ ...inputs(), anchor: null, latestClose: null, latestDip: null },
				BOWSER,
				'2026-10-07'
			)
		).toBeNull();
	});

	it('books the anchor plus deliveries minus dispensed', () => {
		const insight = buildTankInsight(inputs(), BOWSER, '2026-10-07')!;

		expect(insight.bookLitres).toBe(13597 + 10000 - 2000);
		expect(insight.deliveriesSinceAnchor).toBe(10000);
		expect(insight.dispensedSinceAnchor).toBe(2000);
		// 1 400 L over the 14-day burn window = 100 L/day
		expect(insight.runwayDays).toBe(215); // floor(21 597 / 100)
	});

	it('has no dip check when the latest dip is the one the close used', () => {
		expect(buildTankInsight(inputs(), BOWSER, '2026-10-07')!.dipCheck).toBeNull();
	});

	it('checks a dip taken after the anchor against the book on that day', () => {
		const insight = buildTankInsight(
			inputs({ latestDip: { reading_date: '2026-09-15', reading_value: 12400 } }),
			BOWSER,
			'2026-10-07'
		)!;

		// Book on 15 Sep: 13 597 − 400 − 600 = 12 597; dip 12 400 → +197
		expect(insight.dipCheck).toMatchObject({ bookAtDip: 12597, dipLitres: 12400, gapLitres: 197 });
		// The anchor is unchanged: a dip checks the book, it never re-anchors it
		expect(insight.anchor.kind).toBe('close');
		expect(insight.bookLitres).toBe(21597);
	});
});

describe('pctFull and anchorLabel', () => {
	it('clamps the fill and needs a capacity', () => {
		expect(pctFull(12000, 24000)).toBe(50);
		expect(pctFull(-50, 24000)).toBe(0);
		expect(pctFull(30000, 24000)).toBe(100);
		expect(pctFull(100, null)).toBeNull();
	});

	it('names the anchor', () => {
		const anchor = inputs().anchor!;
		expect(anchorLabel(anchor)).toBe('31 Aug close');
		expect(anchorLabel(anchor, 'long')).toBe('31 Aug 2026 close');
		expect(anchorLabel({ ...anchor, kind: 'dip' })).toBe('dip 31 Aug');
	});
});

describe('tankAttention', () => {
	const now = new Date('2026-10-07T12:00:00');

	it('flags a stale dip', () => {
		const items = tankAttention(buildTankInsight(inputs(), BOWSER, '2026-10-07'), now);
		expect(items.map((i) => i.text)).toEqual(['Last dip is 37 days old — take a fresh dip']);
	});

	it('flags low stock and a negative book', () => {
		const low = buildTankInsight(inputs({ refills: [] }), { ...BOWSER, capacity: 100000 }, '2026-10-07');
		expect(tankAttention(low, now)[0]).toMatchObject({ severity: 'warning' });

		const empty = buildTankInsight(
			inputs({ refills: [], dispenses: [{ entry_date: '2026-09-02', litres_dispensed: 20000 }] }),
			BOWSER,
			'2026-10-07'
		);
		expect(tankAttention(empty, now)[0]).toMatchObject({ severity: 'danger' });
	});

	it('is empty without a tank', () => {
		expect(tankAttention(null, now)).toEqual([]);
	});
});

describe('bookHistory', () => {
	const closes = [
		{ reconciliation_date: '2026-07-31', calculated_level: 5000, measured_level: 5000, variance: 0, variance_percentage: 0, accepted: true },
		{ reconciliation_date: '2026-08-31', calculated_level: 13597, measured_level: 13000, variance: null, variance_percentage: null, accepted: true }
	];

	it('walks the book from the oldest close, re-syncing to each close', () => {
		const points = bookHistory({
			closes,
			refills: [{ delivery_date: '2026-08-21', litres_added: 10000 }],
			// 1 403 L of entries in August that the 31 Aug close does not quite match
			dispenses: [{ entry_date: '2026-08-10', litres_dispensed: 1403 }],
			to: '2026-09-02'
		});

		expect(points[0]).toMatchObject({ date: '2026-07-31', litres: 5000 });
		expect(points.find((p) => p.date === '2026-08-10')!.litres).toBe(3597);
		expect(points.find((p) => p.date === '2026-08-21')).toMatchObject({ litres: 13597, delivered: 10000 });
		// The close carries its own figure forward
		expect(points.find((p) => p.date === '2026-08-31')!.litres).toBe(13597);
		expect(points.at(-1)!.date).toBe('2026-09-02');
	});

	it('shows a re-baseline as a reset', () => {
		const points = bookHistory({
			closes: [closes[0], { ...closes[1], calculated_level: 12000, is_rebaseline: true }],
			refills: [],
			dispenses: [],
			to: '2026-08-31'
		});
		expect(points.at(-1)!.litres).toBe(12000);
	});

	it('starts from a dip when nothing has been closed', () => {
		const points = bookHistory({
			closes: [],
			refills: [],
			dispenses: [{ entry_date: '2026-09-02', litres_dispensed: 100 }],
			to: '2026-09-02',
			fallbackDip: { reading_date: '2026-09-01', reading_value: 4000 }
		});
		expect(points.map((p) => p.litres)).toEqual([4000, 3900]);
	});

	it('is empty with no close and no dip', () => {
		expect(bookHistory({ closes: [], refills: [], dispenses: [], to: '2026-09-02' })).toEqual([]);
	});
});

describe('dipChecks', () => {
	it('checks each dip against the book on its day and bands the gap', () => {
		const points = [
			{ date: '2026-09-14', litres: 12597, delivered: 0, dispensed: 0 },
			{ date: '2026-09-15', litres: 12597, delivered: 0, dispensed: 0 }
		];
		const checks = dipChecks(
			points,
			[
				{ reading_date: '2026-09-15', reading_value: 12400 },
				{ reading_date: '2026-06-01', reading_value: 9000 } // outside the history
			],
			200
		);
		expect(checks).toHaveLength(1);
		expect(checks[0]).toMatchObject({ gapLitres: 197, band: { key: 'good' } });
	});
});
