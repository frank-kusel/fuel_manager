import { describe, expect, it } from 'vitest';
import {
	buildReadiness,
	buildSteps,
	currentStep,
	firstOutstanding,
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
		book_at_dip: 5316.1,
		dip_date: '2026-06-30',
		...overrides
	};
}

/** Everything green: dipped, closed and accepted, reviewed, registered, entries present. */
function ready(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
	return {
		monthLabel: 'June 2026',
		regNo: 'DRS-2026-001',
		unreviewedActivityCount: 0,
		entryCount: 212,
		deliveryCount: 2,
		monthDip: { reading_date: '2026-06-30', reading_value: 5800 },
		selectedClose: close(),
		missingClassifierCodes: [],
		missingInvoices12m: 0,
		...overrides
	};
}

function state(input: ReadinessInput, id: ReadinessId) {
	return buildReadiness(input).find((i) => i.id === id)!.state;
}

function stepStates(input: ReadinessInput) {
	return Object.fromEntries(buildSteps(buildReadiness(input)).map((s) => [s.id, s.state]));
}

describe('buildReadiness', () => {
	it('is all clear when the month is dipped, closed, accepted and reviewed', () => {
		expect(outstandingCount(buildReadiness(ready()))).toBe(0);
	});

	it('does NOT report a close that failed its own leak check as green', () => {
		// The regression this module exists for: a month closed over tolerance
		// once rendered a green tick — hiding the one month that needed looking at.
		const input = ready({ selectedClose: close({ accepted: false }) });

		expect(state(input, 'close')).toBe('warn');
		expect(outstandingCount(buildReadiness(input))).toBe(1);
	});

	it('blocks the dip, then the close, on a month with neither', () => {
		const input = ready({ monthDip: null, selectedClose: null });

		expect(state(input, 'dip')).toBe('blocker');
		expect(state(input, 'close')).toBe('blocker');
		expect(buildReadiness(input).find((i) => i.id === 'close')!.detail).toContain('dip first');
	});

	it('counts a closed month as dipped even without the dip row', () => {
		expect(state(ready({ monthDip: null }), 'dip')).toBe('ok');
	});

	it('notes a re-baselined close without downgrading it', () => {
		const item = buildReadiness(ready({ selectedClose: close({ is_rebaseline: true }) })).find(
			(i) => i.id === 'close'
		)!;

		expect(item.state).toBe('ok');
		expect(item.detail).toContain('re-baselined');
	});

	it('treats a month with no deliveries as ordinary, not a blocker', () => {
		const input = ready({ deliveryCount: 0 });

		expect(state(input, 'storage')).toBe('info');
		expect(outstandingCount(buildReadiness(input))).toBe(0);
	});

	it('reports missing invoice numbers without making them a blocker', () => {
		const input = ready({ missingInvoices12m: 3 });

		expect(state(input, 'invoices')).toBe('info');
		expect(buildReadiness(input).find((i) => i.id === 'invoices')!.detail).toContain('3 deliveries');
	});

	it.each([
		['unreviewed activities', { unreviewedActivityCount: 2 }, 'eligibility'],
		['a missing registration', { regNo: '   ' }, 'registration'],
		['a missing classifier result', { missingClassifierCodes: ['KC06'] }, 'classifier'],
		['an empty usage logbook', { entryCount: 0 }, 'usage']
	])('blocks on %s', (_label, overrides, id) => {
		expect(state(ready(overrides), id as ReadinessId)).toBe('blocker');
	});

	it('names the classifier vehicles that are missing a result', () => {
		const item = buildReadiness(ready({ missingClassifierCodes: ['KC06', 'KC09'] })).find(
			(i) => i.id === 'classifier'
		)!;
		expect(item.detail).toBe('KC06, KC09 classifier result missing');
	});
});

describe('buildSteps and currentStep', () => {
	it('is done through Claim and ready to export when everything is clear', () => {
		const steps = buildSteps(buildReadiness(ready()));

		expect(stepStates(ready())).toEqual({ dip: 'done', close: 'done', claim: 'done', export: 'ready' });
		expect(currentStep(steps)).toBe('export');
	});

	it('starts at the dip on a fresh month', () => {
		const input = ready({ monthDip: null, selectedClose: null, regNo: '' });
		const steps = buildSteps(buildReadiness(input));

		expect(stepStates(input)).toEqual({ dip: 'todo', close: 'todo', claim: 'todo', export: 'todo' });
		expect(currentStep(steps)).toBe('dip');
	});

	it('moves on past a close that is over tolerance — it is closed, with a caveat', () => {
		const input = ready({ selectedClose: close({ accepted: false }), regNo: '' });
		const steps = buildSteps(buildReadiness(input));

		expect(stepStates(input).close).toBe('warn');
		expect(currentStep(steps)).toBe('claim');
	});

	it('lists a step’s failing checks, blockers first', () => {
		const steps = buildSteps(
			buildReadiness(ready({ regNo: '', missingClassifierCodes: ['KC06'] }))
		);
		expect(steps.find((s) => s.id === 'claim')!.issues).toEqual([
			'KC06 classifier result missing',
			'No DRS registration number'
		]);
	});
});

describe('firstOutstanding', () => {
	it('names an unactionable failure so a summary is never blank', () => {
		expect(firstOutstanding(buildReadiness(ready({ entryCount: 0 })))?.id).toBe('usage');
	});

	it('follows step order when several checks fail', () => {
		expect(firstOutstanding(buildReadiness(ready({ selectedClose: null, regNo: '' })))?.id).toBe(
			'close'
		);
	});

	it('is null when everything is clear', () => {
		expect(firstOutstanding(buildReadiness(ready()))).toBeNull();
	});
});
