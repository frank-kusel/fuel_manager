/**
 * Month-end readiness — is this month's claim defensible, and if not, what is
 * the single next thing to do about it?
 *
 * Extracted from the Audit page because it is the only genuinely derived logic
 * there and the only place a wrong answer is silent: a readiness row that says
 * "fine" when it isn't looks exactly like one that's right.
 *
 * Two distinctions the earlier inline version got wrong, both of which matter
 * once a row can be promoted to "your next action":
 *
 * - A **blocker** is something you can act on that makes the claim wrong or
 *   unsubmittable. An **info** row is a fact worth surfacing that you cannot
 *   act on from inside this app, or that is not actually a problem. Telling
 *   someone to "record a delivery" for a month in which no fuel was delivered
 *   is worse than saying nothing.
 * - A close that exists is not the same as a close that was **accepted**. The
 *   close screen signs off on the leak check (`accepted` is written from the
 *   variance band), so a month closed over tolerance must not read green — that
 *   is precisely the month you need to look at.
 */

import type { CloseRow } from './tank-balance';

export type ReadinessId =
	| 'registration'
	| 'eligibility'
	| 'usage'
	| 'storage'
	| 'close'
	| 'invoices';

/** `warn` is amber: real, but not a hard blocker on submitting. */
export type ReadinessState = 'ok' | 'warn' | 'blocker' | 'info';

/** Where the band's action control should take you. */
export type ReadinessTarget = 'close' | 'claim-setup' | 'registration';

export interface ReadinessItem {
	id: ReadinessId;
	state: ReadinessState;
	title: string;
	detail: string;
	/** Month-scoped rows sit under "This month"; the rest are standing facts. */
	scope: 'month' | 'standing';
	action?: { label: string; target: ReadinessTarget };
}

export interface ReadinessInput {
	monthLabel: string;
	regNo: string;
	unreviewedActivityCount: number;
	entryCount: number;
	deliveryCount: number;
	/** The close for the selected month, or null when it has not been closed. */
	selectedClose: CloseRow | null;
	/** Deliveries in the last 12 months with no invoice number. */
	missingInvoices12m: number;
}

/**
 * Priority for "your next action", most urgent first.
 *
 * The close leads because it is why you opened the page and is the only
 * near-irreversible record here. Eligibility is second because it silently
 * changes every claim figure on screen. Registration is third: a ten-second fix
 * that gates submission. `storage` and `invoices` are deliberately absent — you
 * cannot edit a delivery from anywhere in this app, so offering either as an
 * action would be a dead end.
 */
export const NEXT_ACTION_ORDER: ReadinessId[] = [
	'close',
	'eligibility',
	'registration',
	'usage'
];

export function buildReadiness(input: ReadinessInput): ReadinessItem[] {
	const {
		monthLabel,
		regNo,
		unreviewedActivityCount,
		entryCount,
		deliveryCount,
		selectedClose,
		missingInvoices12m
	} = input;

	const trimmedReg = regNo.trim();

	// A close that exists but failed its own leak check is amber, never green.
	let close: ReadinessItem;
	if (!selectedClose) {
		close = {
			id: 'close',
			state: 'blocker',
			scope: 'month',
			title: `${monthLabel} closed`,
			detail: 'Not closed yet — reconcile the tank against a physical dip',
			action: { label: `Close ${monthLabel}`, target: 'close' }
		};
	} else if (selectedClose.accepted === false) {
		close = {
			id: 'close',
			state: 'warn',
			scope: 'month',
			title: `${monthLabel} closed over tolerance`,
			detail: `Carried forward ${Math.round(selectedClose.calculated_level ?? 0)} L, but the leak check fell outside tolerance`,
			action: { label: 'Review the close', target: 'close' }
		};
	} else {
		close = {
			id: 'close',
			state: 'ok',
			scope: 'month',
			title: `${monthLabel} closed`,
			detail: `Carried forward ${Math.round(selectedClose.calculated_level ?? 0)} L${selectedClose.is_rebaseline ? ' (re-baselined)' : ''}`
		};
	}

	return [
		close,
		{
			id: 'eligibility',
			state: unreviewedActivityCount === 0 ? 'ok' : 'blocker',
			scope: 'standing',
			title: 'Activity eligibility reviewed',
			detail:
				unreviewedActivityCount === 0
					? 'Claimable and non-claimable activities are saved in the database'
					: `${unreviewedActivityCount} ${unreviewedActivityCount === 1 ? 'activity still needs' : 'activities still need'} confirmation`,
			...(unreviewedActivityCount === 0
				? {}
				: { action: { label: 'Review eligibility', target: 'claim-setup' as const } })
		},
		{
			id: 'registration',
			state: trimmedReg.length > 0 ? 'ok' : 'blocker',
			scope: 'standing',
			title: 'Diesel refund registration captured',
			detail: trimmedReg ? `Registered as ${trimmedReg}` : 'No DRS registration number on file',
			...(trimmedReg.length > 0
				? {}
				: { action: { label: 'Add registration', target: 'registration' as const } })
		},
		{
			id: 'usage',
			state: entryCount > 0 ? 'ok' : 'blocker',
			scope: 'month',
			title: 'Usage logbook maintained',
			detail:
				entryCount > 0
					? `${entryCount} entries in ${monthLabel} — litres out per vehicle, activity and location`
					: `No fuel entries recorded in ${monthLabel}`
		},
		{
			// Info, not a blocker: a month with no delivery is an ordinary month,
			// and there is no delivery to add.
			id: 'storage',
			state: 'info',
			scope: 'month',
			title: 'Storage logbook',
			detail:
				deliveryCount > 0
					? `${deliveryCount} ${deliveryCount === 1 ? 'delivery' : 'deliveries'} recorded in ${monthLabel}`
					: `No deliveries recorded in ${monthLabel}`
		},
		{
			// Info until tank_refills gets a CRUD entity in tools/database — there
			// is currently no screen anywhere that can edit an invoice number.
			id: 'invoices',
			state: 'info',
			scope: 'standing',
			title: 'Delivery invoice numbers on file',
			detail:
				missingInvoices12m === 0
					? 'Every delivery in the last 12 months has its invoice number'
					: `${missingInvoices12m} ${missingInvoices12m === 1 ? 'delivery' : 'deliveries'} in the last 12 months missing an invoice number`
		}
	];
}

/** Rows that count toward "N of M checks outstanding". Info rows never do. */
export function isCheck(item: ReadinessItem): boolean {
	return item.state !== 'info';
}

export function outstandingCount(items: ReadinessItem[]): number {
	return items.filter((i) => isCheck(i) && i.state !== 'ok').length;
}

export function checkCount(items: ReadinessItem[]): number {
	return items.filter(isCheck).length;
}

/**
 * The single thing to do next, or null when nothing is outstanding. Only rows
 * with an action are eligible — an unactionable row can never be the next step.
 */
export function nextAction(items: ReadinessItem[]): ReadinessItem | null {
	for (const id of NEXT_ACTION_ORDER) {
		const item = items.find((i) => i.id === id);
		if (item && item.state !== 'ok' && item.state !== 'info' && item.action) return item;
	}
	return null;
}

/**
 * The most urgent failing check, actionable or not — what the summary line
 * names. Distinct from nextAction: a failing check with no action (no fuel
 * entries this month) still needs saying, or the band reads "1 check
 * outstanding" with nothing to explain it.
 */
export function firstOutstanding(items: ReadinessItem[]): ReadinessItem | null {
	const failing = items.filter((i) => isCheck(i) && i.state !== 'ok');
	for (const id of NEXT_ACTION_ORDER) {
		const item = failing.find((i) => i.id === id);
		if (item) return item;
	}
	return failing[0] ?? null;
}
