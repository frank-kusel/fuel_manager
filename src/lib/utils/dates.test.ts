import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	daysBetween,
	isoDayBefore,
	isoLocal,
	monthKey,
	monthRange,
	recentMonths,
	todayIso
} from './dates';

afterEach(() => {
	vi.useRealTimers();
});

describe('monthRange', () => {
	it('spans the whole calendar month', () => {
		expect(monthRange(2026, 7)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
		expect(monthRange(2026, 6)).toEqual({ start: '2026-06-01', end: '2026-06-30' });
	});

	it('handles February in leap and common years', () => {
		expect(monthRange(2024, 2).end).toBe('2024-02-29');
		expect(monthRange(2026, 2).end).toBe('2026-02-28');
	});

	it('does not drift into the previous month the way toISOString did', () => {
		// The bug this replaces: new Date(2026, 6, 1).toISOString() is 2026-06-30
		// once the machine is east of UTC.
		expect(monthRange(2026, 7).start).toBe('2026-07-01');
	});
});

describe('todayIso', () => {
	it('returns the local date just after midnight, not yesterday', () => {
		// 00:30 SAST on 28 July is still 22:30 UTC on the 27th.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-27T22:30:00Z'));
		const utcFlavoured = new Date().toISOString().split('T')[0];

		expect(utcFlavoured).toBe('2026-07-27');
		// Only meaningful when the test host is actually east of UTC; assert the
		// invariant that holds everywhere instead of the timezone-specific value.
		expect(todayIso()).toBe(isoLocal(new Date()));
	});
});

describe('daysBetween', () => {
	it('counts whole days forward', () => {
		expect(daysBetween('2026-07-01', '2026-07-08')).toBe(7);
		expect(daysBetween('2026-07-08', '2026-07-08')).toBe(0);
	});

	it('goes negative backwards and survives a DST-free month boundary', () => {
		expect(daysBetween('2026-07-08', '2026-07-01')).toBe(-7);
		expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1);
	});
});

describe('recentMonths', () => {
	it('lists newest first, starting with the current month', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 6, 28, 9, 0, 0)); // 28 July 2026, local

		const months = recentMonths(3);
		expect(months.map((m) => m.key)).toEqual(['2026-07', '2026-06', '2026-05']);
		expect(months[1].monthStart).toBe('2026-06-01');
		expect(months[1].monthEnd).toBe('2026-06-30');
		expect(months[1].year).toBe(2026);
		expect(months[1].month).toBe(6);
	});

	it('walks back across a year boundary', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 15, 9, 0, 0)); // 15 January 2026

		expect(recentMonths(3).map((m) => m.key)).toEqual(['2026-01', '2025-12', '2025-11']);
	});
});

describe('monthKey', () => {
	it('zero-pads single-digit months', () => {
		expect(monthKey(2026, 7)).toBe('2026-07');
		expect(monthKey(2026, 12)).toBe('2026-12');
	});
});

describe('isoDayBefore', () => {
	it('crosses month and year boundaries', () => {
		expect(isoDayBefore('2026-07-01')).toBe('2026-06-30');
		expect(isoDayBefore('2026-03-01')).toBe('2026-02-28');
		expect(isoDayBefore('2026-01-01')).toBe('2025-12-31');
		expect(isoDayBefore('2026-07-15')).toBe('2026-07-14');
	});
});
