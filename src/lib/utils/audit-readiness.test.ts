import { describe, expect, it } from 'vitest';
import {
	buildReadiness,
	checkCount,
	firstOutstanding,
	nextAction,
	outstandingCount,
	type ReadinessId,
	type ReadinessInput
} from './audit-readiness';
import type { CloseRow } from './tank-balance';

function close(overrides: Partial<CloseRow> = {}): CloseRow {
	return {
		reconciliation_date: '2026-06-30',
		calculated_level: 5316.1,
		measured_level: 5800,
		variance: -483.9,
		variance_percentage: -8.34,
		accepted: true,
		...overrides
	};
}

/** Everything green: closed and accepted, reviewed, registered, entries present. */
function ready(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
	return {
		monthLabel: 'June 2026',
		regNo: 'DRS-2026-001',
		unreviewedActivityCount: 0,
		entryCount: 212,
		deliveryCount: 2,
		selectedClose: close(),
		missingInvoices12m: 0,
		...overrides
	};
}

function state(input: ReadinessInput, id: ReadinessId) {
	return buildReadiness(input).find((i) => i.id === id)!.state;
}

describe('buildReadiness', () => {
	it('is all clear when the month is closed, accepted and reviewed', () => {
		const items = buildReadiness(ready());

		expect(outstandingCount(items)).toBe(0);
		expect(nextAction(items)).toBeNull();
	});

	it('does NOT report a close that failed its own leak check as green', () => {
		// The regression this module exists for: the page tested `!!selectedClose`,
		// so June 2026 (accepted: false, -8.3%) rendered a green tick — hiding the
		// one month that needed looking at.
		const input = ready({ selectedClose: close({ accepted: false }) });

		expect(state(input, 'close')).toBe('warn');
		expect(outstandingCount(buildReadiness(input))).toBe(1);
		expect(nextAction(buildReadiness(input))?.id).toBe('close');
	});

	it('blocks on an unclosed month', () => {
		const input = ready({ selectedClose: null });

		expect(state(input, 'close')).toBe('blocker');
		expect(nextAction(buildReadiness(input))?.action?.target).toBe('close');
	});

	it('notes a re-baselined close without downgrading it', () => {
		const input = ready({ selectedClose: close({ is_rebaseline: true }) });
		const item = buildReadiness(input).find((i) => i.id === 'close')!;

		expect(item.state).toBe('ok');
		expect(item.detail).toContain('re-baselined');
	});

	it('treats a month with no deliveries as ordinary, not a blocker', () => {
		// A month in which no fuel was delivered is normal. Flagging it would tell
		// the user to record a delivery that never happened.
		const input = ready({ deliveryCount: 0 });

		expect(state(input, 'storage')).toBe('info');
		expect(outstandingCount(buildReadiness(input))).toBe(0);
	});

	it('reports missing invoice numbers without making them a blocker', () => {
		// There is no screen in the app that can edit a delivery, so this can never
		// be someone's next action.
		const input = ready({ missingInvoices12m: 3 });
		const items = buildReadiness(input);

		expect(state(input, 'invoices')).toBe('info');
		expect(items.find((i) => i.id === 'invoices')!.detail).toContain('3 deliveries');
		expect(nextAction(items)).toBeNull();
	});

	it.each([
		['unreviewed activities', { unreviewedActivityCount: 2 }, 'eligibility'],
		['a missing registration', { regNo: '   ' }, 'registration'],
		['an empty usage logbook', { entryCount: 0 }, 'usage']
	])('blocks on %s', (_label, overrides, id) => {
		expect(state(ready(overrides), id as ReadinessId)).toBe('blocker');
	});

	it('counts only actionable checks, never info rows', () => {
		const items = buildReadiness(ready({ deliveryCount: 0, missingInvoices12m: 5 }));

		expect(checkCount(items)).toBe(4);
		expect(outstandingCount(items)).toBe(0);
	});
});

describe('nextAction', () => {
	it('puts the close ahead of everything else', () => {
		const items = buildReadiness(
			ready({ selectedClose: null, unreviewedActivityCount: 3, regNo: '' })
		);

		expect(nextAction(items)?.id).toBe('close');
	});

	it('falls to eligibility once the month is closed', () => {
		const items = buildReadiness(ready({ unreviewedActivityCount: 3, regNo: '' }));

		expect(nextAction(items)?.id).toBe('eligibility');
		expect(nextAction(items)?.action?.target).toBe('claim-setup');
	});

	it('falls to registration once eligibility is reviewed', () => {
		const items = buildReadiness(ready({ regNo: '' }));

		expect(nextAction(items)?.id).toBe('registration');
		expect(nextAction(items)?.action?.target).toBe('registration');
	});

	it('never offers a row that has no action', () => {
		// usage is a blocker but has no fix reachable from this page
		const items = buildReadiness(ready({ entryCount: 0 }));

		expect(outstandingCount(items)).toBe(1);
		expect(nextAction(items)).toBeNull();
	});
});

describe('firstOutstanding', () => {
	it('names an unactionable failure so the summary is never blank', () => {
		const items = buildReadiness(ready({ entryCount: 0 }));

		expect(firstOutstanding(items)?.id).toBe('usage');
		expect(firstOutstanding(items)?.detail).toContain('No fuel entries');
	});

	it('follows the next-action priority when several checks fail', () => {
		const items = buildReadiness(ready({ selectedClose: null, regNo: '' }));

		expect(firstOutstanding(items)?.id).toBe('close');
	});

	it('is null when everything is clear', () => {
		expect(firstOutstanding(buildReadiness(ready()))).toBeNull();
	});
});
