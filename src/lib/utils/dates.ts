/**
 * Local-calendar date helpers.
 *
 * Everything in this app is a South African farm operating in SAST (UTC+2), and
 * every date column in the database is a plain DATE — no time, no zone. Using
 * `toISOString()` to derive one of those dates is therefore wrong: at 00:30 SAST
 * it yields yesterday, and `new Date(y, m, 1).toISOString()` yields the last day
 * of the *previous* month. Both bugs were live before this module existed.
 *
 * Rule: a `YYYY-MM-DD` string that will be compared against a DATE column must
 * come from `isoLocal`/`todayIso`/`monthRange`, never from `toISOString()`.
 */

export interface MonthOption {
	/** `YYYY-MM` */
	key: string;
	/** "June 2026" */
	label: string;
	/** "Jun" */
	shortLabel: string;
	year: number;
	/** 1-12 */
	month: number;
	monthStart: string;
	monthEnd: string;
}

/** `YYYY-MM-DD` in the local calendar. `en-CA` is ISO-shaped by definition. */
export function isoLocal(d: Date): string {
	return d.toLocaleDateString('en-CA');
}

export function todayIso(now: Date = new Date()): string {
	return isoLocal(now);
}

/** `month` is 1-12, matching how humans and `MonthOption` talk about months. */
export function monthRange(year: number, month: number): { start: string; end: string } {
	const lastDay = new Date(year, month, 0).getDate();
	const mm = String(month).padStart(2, '0');
	return {
		start: `${year}-${mm}-01`,
		end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
	};
}

export function monthKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}

/** `iso` moved by `days` calendar days (negative for earlier). */
export function addDays(iso: string, days: number): string {
	const d = new Date(`${iso}T12:00:00`);
	d.setDate(d.getDate() + days);
	return isoLocal(d);
}

/** The financial year (and the farm's season) starts on 1 March. */
export function financialYearStart(now: Date = new Date()): Date {
	const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
	return new Date(year, 2, 1);
}

/** "2025/26" for the financial year that opens on 1 March of `start`'s year. */
export function fyLabel(start: Date): string {
	const y = start.getFullYear();
	return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
}

/** The calendar day before `iso`, e.g. the opening date for a period. */
export function isoDayBefore(iso: string): string {
	const d = new Date(`${iso}T12:00:00`);
	d.setDate(d.getDate() - 1);
	return isoLocal(d);
}

/** Whole days from `isoA` to `isoB`, positive when B is later. */
export function daysBetween(isoA: string, isoB: string): number {
	const a = new Date(`${isoA}T12:00:00`).getTime();
	const b = new Date(`${isoB}T12:00:00`).getTime();
	return Math.round((b - a) / 86_400_000);
}

/** Newest first: [current month, previous, …]. */
export function recentMonths(count: number, now: Date = new Date()): MonthOption[] {
	const months: MonthOption[] = [];
	for (let i = 0; i < count; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const year = d.getFullYear();
		const month = d.getMonth() + 1;
		const { start, end } = monthRange(year, month);
		months.push({
			key: monthKey(year, month),
			label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
			shortLabel: d.toLocaleDateString('en-ZA', { month: 'short' }),
			year,
			month,
			monthStart: start,
			monthEnd: end
		});
	}
	return months;
}

/** "30 Jun" — for inline ledger labels. */
export function fmtDayMonth(iso: string): string {
	return new Date(`${iso}T12:00:00`).toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short'
	});
}

/** "30 Jun 2026" — for standalone dates that need the year. */
export function fmtFull(iso: string): string {
	return new Date(`${iso}T12:00:00`).toLocaleDateString('en-ZA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/** "Jun 2026" — for close-history rows keyed on a month-end date. */
export function fmtMonthYear(iso: string): string {
	return new Date(`${iso}T12:00:00`).toLocaleDateString('en-ZA', {
		month: 'short',
		year: 'numeric'
	});
}
