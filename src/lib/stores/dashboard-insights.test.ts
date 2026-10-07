import { describe, expect, it } from 'vitest';
import { buildSeason } from './dashboard-insights';

const row = (entry_date: string, litres_dispensed: number) => ({ entry_date, litres_dispensed });

describe('buildSeason', () => {
	const now = new Date(2026, 9, 7, 12); // 7 Oct 2026
	const season = buildSeason(
		[
			row('2025-03-05', 100), // last season, March
			row('2025-10-03', 40), // last season, before the same day
			row('2025-10-20', 60), // last season, after the same day
			row('2026-02-28', 10), // last season, February
			row('2026-03-02', 200), // this season, March
			row('2026-10-06', 50) // this season, October
		],
		now
	);

	it('labels the season and runs March to February', () => {
		expect(season.label).toBe('2026/27');
		expect(season.months.map((m) => m.label)[0]).toBe('Mar');
		expect(season.months).toHaveLength(12);
	});

	it('puts each month beside the same month last season', () => {
		const mar = season.months[0];
		const oct = season.months[7];
		expect(mar).toMatchObject({ key: '2026-03', current: 200, previous: 100 });
		expect(oct).toMatchObject({ key: '2026-10', current: 50, previous: 100 });
		// Months not reached yet have no current figure
		expect(season.months[8].current).toBeNull();
	});

	it('compares like for like: last season only up to the same day', () => {
		expect(season.toDate).toBe(250);
		expect(season.previousToDate).toBe(140); // 100 + 40
		expect(season.previousTotal).toBe(210);
	});
});
