/**
 * Month-end readiness, as four steps: Dip → Close → Claim → Export.
 *
 * Each check belongs to the step where you fix it, and a step's state is the
 * worst of its checks. That is what lets the Audit page be one ordered list
 * rather than a status band, two tabs and a collapsible setup panel.
 *
 * Two distinctions matter once a check decides what you do next:
 *
 * - A **blocker** is something you can act on that makes the claim wrong or
 *   unsubmittable. An **info** row is a fact worth surfacing that you cannot
 *   act on from inside this app, or that is not actually a problem. Telling
 *   someone to "record a delivery" for a month in which no fuel was delivered
 *   is worse than saying nothing.
 * - A close that exists is not the same as a close that was **accepted**. The
 *   close signs off on the leak check (`accepted` is written from the gap
 *   band), so a month closed over tolerance must not read green — that is
 *   precisely the month you need to look at.
 */

import type { CloseRow, DipRow } from './tank-balance';

export type StepId = 'dip' | 'close' | 'claim' | 'export';

export const STEP_ORDER: StepId[] = ['dip', 'close', 'claim', 'export'];

export type ReadinessId =
	| 'dip'
	| 'close'
	| 'eligibility'
	| 'registration'
	| 'classifier'
	| 'usage'
	| 'storage'
	| 'invoices';

/** `warn` is amber: real, but not a hard blocker on submitting. */
export type ReadinessState = 'ok' | 'warn' | 'blocker' | 'info';

export interface ReadinessItem {
	id: ReadinessId;
	step: StepId;
	state: ReadinessState;
	title: string;
	detail: string;
}

export interface ReadinessInput {
	monthLabel: string;
	regNo: string;
	unreviewedActivityCount: number;
	entryCount: number;
	deliveryCount: number;
	/** The month's last dip, or null when none was taken. */
	monthDip: DipRow | null;
	/** The close for the selected month, or null when it has not been closed. */
	selectedClose: CloseRow | null;
	/** Codes of classifier vehicles with litres this month but no result. */
	missingClassifierCodes: string[];
	/** Deliveries in the last 12 months with no invoice number. */
	missingInvoices12m: number;
}

const rounded = (litres: number | null | undefined) => Math.round(litres ?? 0);

export function buildReadiness(input: ReadinessInput): ReadinessItem[] {
	const {
		monthLabel,
		regNo,
		unreviewedActivityCount,
		entryCount,
		deliveryCount,
		monthDip,
		selectedClose,
		missingClassifierCodes,
		missingInvoices12m
	} = input;

	const trimmedReg = regNo.trim();
	const items: ReadinessItem[] = [];

	// A closed month necessarily had its dip; the close row records it.
	const dipLitres = monthDip?.reading_value ?? selectedClose?.measured_level ?? null;
	const dipDate = monthDip?.reading_date ?? selectedClose?.dip_date ?? null;
	items.push(
		dipLitres !== null
			? {
					id: 'dip',
					step: 'dip',
					state: 'ok',
					title: 'Dip taken',
					detail: `${rounded(dipLitres)} L${dipDate ? ` on ${dipDate}` : ''}`
				}
			: {
					id: 'dip',
					step: 'dip',
					state: 'blocker',
					title: 'Dip taken',
					detail: `No dip in ${monthLabel}`
				}
	);

	if (!selectedClose) {
		items.push({
			id: 'close',
			step: 'close',
			state: 'blocker',
			title: `${monthLabel} closed`,
			detail: dipLitres === null ? 'Needs the month’s dip first' : 'Not closed yet'
		});
	} else if (selectedClose.accepted === false) {
		items.push({
			id: 'close',
			step: 'close',
			state: 'warn',
			title: `${monthLabel} closed over tolerance`,
			detail: `Carried forward ${rounded(selectedClose.calculated_level)} L; the gap fell outside tolerance`
		});
	} else {
		items.push({
			id: 'close',
			step: 'close',
			state: 'ok',
			title: `${monthLabel} closed`,
			detail: `Carried forward ${rounded(selectedClose.calculated_level)} L${selectedClose.is_rebaseline ? ' (re-baselined)' : ''}`
		});
	}

	items.push(
		{
			id: 'eligibility',
			step: 'claim',
			state: unreviewedActivityCount === 0 ? 'ok' : 'blocker',
			title: 'Activity eligibility reviewed',
			detail:
				unreviewedActivityCount === 0
					? 'Every activity is marked claimable or not'
					: `${unreviewedActivityCount} ${unreviewedActivityCount === 1 ? 'activity' : 'activities'} to review`
		},
		{
			id: 'classifier',
			step: 'claim',
			state: missingClassifierCodes.length === 0 ? 'ok' : 'blocker',
			title: 'Classifier results entered',
			detail:
				missingClassifierCodes.length === 0
					? 'Every classifier vehicle has its result'
					: `${missingClassifierCodes.join(', ')} classifier result missing`
		},
		{
			id: 'registration',
			step: 'claim',
			state: trimmedReg ? 'ok' : 'blocker',
			title: 'DRS registration on file',
			detail: trimmedReg ? `Registered as ${trimmedReg}` : 'No DRS registration number'
		},
		{
			id: 'usage',
			step: 'claim',
			state: entryCount > 0 ? 'ok' : 'blocker',
			title: 'Usage logbook',
			detail: entryCount > 0 ? `${entryCount} entries` : `No fuel entries in ${monthLabel}`
		},
		{
			// Info, not a blocker: a month with no delivery is an ordinary month,
			// and there is no delivery to add.
			id: 'storage',
			step: 'export',
			state: 'info',
			title: 'Storage logbook',
			detail:
				deliveryCount > 0
					? `${deliveryCount} ${deliveryCount === 1 ? 'delivery' : 'deliveries'} in ${monthLabel}`
					: `No deliveries in ${monthLabel}`
		},
		{
			// Info until deliveries can be edited somewhere in the app — there is
			// no screen that can add a missing invoice number.
			id: 'invoices',
			step: 'export',
			state: 'info',
			title: 'Delivery invoice numbers',
			detail:
				missingInvoices12m === 0
					? 'All on file for the last 12 months'
					: `${missingInvoices12m} ${missingInvoices12m === 1 ? 'delivery' : 'deliveries'} in 12 months without one`
		}
	);

	return items;
}

/** Rows that count as checks. Info rows never do. */
export function isCheck(item: ReadinessItem): boolean {
	return item.state !== 'info';
}

export function outstandingCount(items: ReadinessItem[]): number {
	return items.filter((i) => isCheck(i) && i.state !== 'ok').length;
}

/** The most urgent failing check in step order, or null when all are clear. */
export function firstOutstanding(items: ReadinessItem[]): ReadinessItem | null {
	for (const step of STEP_ORDER) {
		const failing = items.find(
			(i) => i.step === step && isCheck(i) && i.state === 'blocker'
		);
		if (failing) return failing;
	}
	return items.find((i) => isCheck(i) && i.state === 'warn') ?? null;
}

/** done: all clear · warn: done with a caveat · todo: something to fix · ready: export, all clear */
export type StepState = 'done' | 'warn' | 'todo' | 'ready';

export interface StepStatus {
	id: StepId;
	state: StepState;
	items: ReadinessItem[];
	/** The failing checks' details, most urgent first. */
	issues: string[];
}

export function buildSteps(items: ReadinessItem[]): StepStatus[] {
	const steps: StepStatus[] = STEP_ORDER.map((id) => {
		const own = items.filter((i) => i.step === id);
		const checks = own.filter(isCheck);
		const blockers = checks.filter((i) => i.state === 'blocker');
		const warnings = checks.filter((i) => i.state === 'warn');
		const state: StepState =
			blockers.length > 0 ? 'todo' : warnings.length > 0 ? 'warn' : 'done';
		return {
			id,
			state,
			items: own,
			issues: [...blockers, ...warnings].map((i) => i.detail)
		};
	});

	// Export has no checks of its own: it is ready when everything before it is.
	const exportStep = steps.find((s) => s.id === 'export')!;
	exportStep.state = steps.some((s) => s.id !== 'export' && s.state === 'todo') ? 'todo' : 'ready';
	return steps;
}

/** Where to start: the first step with something to fix, else Export. */
export function currentStep(steps: StepStatus[]): StepId {
	return steps.find((s) => s.id !== 'export' && s.state === 'todo')?.id ?? 'export';
}
