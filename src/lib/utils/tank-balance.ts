/**
 * The one tank balance model.
 *
 * Before this module the identity `opening + deliveries − dispensed` existed in
 * three places (the insights store, the month-end close, the PDF export) with
 * three different anchors, three different windows and three different
 * precisions — so the number on the Tank page was never the number the close
 * chain used. Everything now derives from here.
 *
 * ## Why the anchor is the close, not the dip
 *
 * The dipstick resolves to roughly 200 L on a shallow 24 kL tank normally filled
 * to ~15 kL, and readings are rounded to the nearest 100 L. The metered book
 * (bowser readings out, invoiced deliveries in) is the *more* precise record.
 * Re-anchoring the balance to every dip would therefore reset a real slow leak
 * into instrument noise and destroy the only signal that can detect it. A dip is
 * a **check** against the book, never a new starting point. The single exception
 * is an explicit, logged re-baseline (see `isRebaseline` on a close row).
 *
 * ## What a close's variance actually means
 *
 * A close carries the *book* forward (`calculated_level = book at dip + post-dip
 * movements`), so the gap between book and dip is never reset. That makes each
 * close's variance a **running level, not a monthly increment** — it already
 * contains every earlier month's unexplained difference. Summing variances
 * across closes double-counts them. `varianceTrend` therefore reports the series
 * and its latest value, not a total.
 *
 * Pure functions over already-fetched rows — no Supabase import, so this is
 * unit-testable end to end.
 */

import { daysBetween, fmtDayMonth, fmtFull, isoLocal } from './dates';

/** Dips check the book; they never re-anchor it. See the module note. */
export const ANCHOR_POLICY = 'close-first' as const;

/** A book balance is only credible against a reasonably recent measurement. */
export const DIP_STALE_DAYS = 14;

/** Trailing window used to turn litres/day into a runway estimate. */
export const BURN_WINDOW_DAYS = 14;

/**
 * Dipstick resolution on this tank. Variance bands never call a difference
 * smaller than this a problem, however small the tank reading is — a pure
 * percentage band cries wolf at low stock, where 2% falls under what the
 * instrument can even resolve.
 */
export const DEFAULT_DIP_TOLERANCE_L = 200;

export const VARIANCE_PCT = { good: 2, acceptable: 5 } as const;

export interface CloseRow {
	reconciliation_date: string;
	calculated_level: number | null;
	measured_level: number | null;
	variance: number | null;
	variance_percentage: number | null;
	accepted: boolean | null;
	/** Migration 020. Null on rows written before it. */
	book_at_dip?: number | null;
	dip_date?: string | null;
	is_rebaseline?: boolean | null;
	created_at?: string;
}

export interface DipRow {
	reading_date: string;
	reading_value: number | null;
}

export interface RefillRow {
	delivery_date: string;
	litres_added: number | null;
}

export interface DispenseRow {
	entry_date: string;
	litres_dispensed: number | null;
}

export type AnchorKind = 'close' | 'dip';

export interface TankAnchor {
	kind: AnchorKind;
	/** Movements are counted strictly *after* this date. */
	date: string;
	litres: number;
	/** Close anchors only: what the book was signed off against. */
	measuredAtClose: number | null;
	varianceLitres: number | null;
	variancePct: number | null;
}

export interface TankBalance {
	anchor: TankAnchor;
	deliveries: number;
	dispensed: number;
	litres: number;
	asOf: string;
}

export interface VarianceBand {
	key: 'good' | 'acceptable' | 'high';
	label: string;
}

function sumRefills(rows: RefillRow[]): number {
	return rows.reduce((total, row) => total + (row.litres_added || 0), 0);
}

function sumDispensed(rows: DispenseRow[]): number {
	return rows.reduce((total, row) => total + (row.litres_dispensed || 0), 0);
}

/**
 * The latest close wins over the latest dip even when the dip is newer — that is
 * the policy, not an oversight. Falls back to a dip only when no close exists at
 * all, which is the state a fresh install is in.
 */
export function resolveAnchor(input: {
	latestClose: CloseRow | null | undefined;
	latestDip: DipRow | null | undefined;
}): TankAnchor | null {
	const close = input.latestClose;
	if (close && close.calculated_level !== null && close.calculated_level !== undefined) {
		const measured = close.measured_level ?? null;
		const book = close.book_at_dip ?? close.calculated_level;
		return {
			kind: 'close',
			date: close.reconciliation_date,
			litres: close.calculated_level,
			measuredAtClose: measured,
			varianceLitres: measured === null ? null : book - measured,
			variancePct: measured === null || measured === 0 ? null : ((book - measured) / measured) * 100
		};
	}

	const dip = input.latestDip;
	if (dip) {
		return {
			kind: 'dip',
			date: dip.reading_date,
			litres: dip.reading_value || 0,
			measuredAtClose: null,
			varianceLitres: null,
			variancePct: null
		};
	}

	return null;
}

/**
 * Window is `(anchor.date, asOf]` — strictly after the anchor, through `asOf`
 * inclusive. The upper bound matters: without it, future-dated entries are
 * subtracted from today's balance.
 */
export function deriveBalance(input: {
	anchor: TankAnchor;
	refills: RefillRow[];
	dispenses: DispenseRow[];
	asOf: string;
}): TankBalance {
	const { anchor, asOf } = input;
	const inWindow = (date: string) => date > anchor.date && date <= asOf;

	const deliveries = sumRefills(input.refills.filter((r) => inWindow(r.delivery_date)));
	const dispensed = sumDispensed(input.dispenses.filter((d) => inWindow(d.entry_date)));

	return {
		anchor,
		deliveries,
		dispensed,
		litres: anchor.litres + deliveries - dispensed,
		asOf
	};
}

export function computeVariance(
	book: number,
	measured: number
): { litres: number; pct: number | null } {
	const litres = book - measured;
	return { litres, pct: measured === 0 ? null : (litres / measured) * 100 };
}

/**
 * Banded on litres against whichever is larger: the dipstick tolerance or the
 * percentage threshold. At 15 kL the percentage dominates; at 2 kL the tolerance
 * does, which is what stops low-stock months from flagging on instrument noise.
 */
export function bandLimits(
	measured: number,
	toleranceL: number = DEFAULT_DIP_TOLERANCE_L
): { good: number; acceptable: number } {
	return {
		good: Math.max(toleranceL, (VARIANCE_PCT.good / 100) * Math.abs(measured)),
		acceptable: Math.max(2 * toleranceL, (VARIANCE_PCT.acceptable / 100) * Math.abs(measured))
	};
}

export function bandVariance(
	litres: number | null,
	measured: number,
	toleranceL: number = DEFAULT_DIP_TOLERANCE_L
): VarianceBand | null {
	if (litres === null) return null;
	const magnitude = Math.abs(litres);
	const { good: goodLimit, acceptable: acceptableLimit } = bandLimits(measured, toleranceL);

	if (magnitude <= goodLimit) return { key: 'good', label: 'Good' };
	if (magnitude <= acceptableLimit) return { key: 'acceptable', label: 'Acceptable' };
	return { key: 'high', label: 'High variance' };
}

/**
 * Anchored at local noon on both ends: parsing a bare `YYYY-MM-DD` gives UTC
 * midnight, which in SAST reads as 02:00 the same day and rounds the age down a
 * day for part of every day.
 */
export function dipAgeDays(
	dipDate: string | null | undefined,
	now: Date = new Date()
): number | null {
	if (!dipDate) return null;
	return daysBetween(dipDate, isoLocal(now));
}

export function isDipStale(ageDays: number | null): boolean {
	return ageDays !== null && ageDays > DIP_STALE_DAYS;
}

export function burnRate(dispenses: DispenseRow[], days: number = BURN_WINDOW_DAYS): number {
	if (days <= 0) return 0;
	return sumDispensed(dispenses) / days;
}

export function runwayDays(litres: number, dailyBurn: number): number | null {
	if (litres <= 0 || dailyBurn <= 0) return null;
	return Math.floor(litres / dailyBurn);
}

// ---------------------------------------------------------------------------
// The live tank: one insight, built once, read by every screen
// ---------------------------------------------------------------------------

/** What `getTankBalanceInputs` fetches: the anchor and every movement after it. */
export interface TankBalanceInputs {
	anchor: TankAnchor | null;
	latestClose: CloseRow | null;
	latestDip: DipRow | null;
	/** Windowed to (anchor.date, asOf]. */
	refills: RefillRow[];
	/** Windowed to (anchor.date, asOf]. */
	dispenses: DispenseRow[];
	/** The trailing BURN_WINDOW_DAYS, for the runway. */
	burnDispenses: DispenseRow[];
}

/** One row of the Tank page's recent activity. */
export interface TankActivity {
	kind: 'dip' | 'delivery';
	date: string;
	litres: number;
	supplier: string | null;
	invoice: string | null;
}

export interface DipCheck {
	date: string;
	dipLitres: number;
	bookAtDip: number;
	gapLitres: number;
	gapPct: number | null;
}

export interface TankInsight {
	name: string;
	capacity: number | null;
	/** The book balance today: anchor + deliveries − dispensed. */
	bookLitres: number;
	deliveriesSinceAnchor: number;
	dispensedSinceAnchor: number;
	/** Days of fuel left at the recent burn rate; null when unknown. */
	runwayDays: number | null;
	/** The latest close, or a dip only when nothing has ever been closed. */
	anchor: TankAnchor;
	lastDipLitres: number | null;
	lastDipDate: string | null;
	/**
	 * The latest dip against the book on that same date. Null when the latest
	 * dip is on or before the anchor — the close already accounts for it, and a
	 * dip-anchored book trivially agrees with its own dip.
	 */
	dipCheck: DipCheck | null;
	asOf: string;
}

/**
 * Null when there is nothing to anchor a book to (no close, no dip): a fresh
 * install. Callers render an empty state rather than a zero.
 */
export function buildTankInsight(
	inputs: TankBalanceInputs | null,
	bowser: { name?: string | null; capacity?: number | null } | null,
	asOf: string
): TankInsight | null {
	if (!inputs?.anchor) return null;
	const { anchor, refills, dispenses, latestDip } = inputs;

	const balance = deriveBalance({ anchor, refills, dispenses, asOf });

	let dipCheck: DipCheck | null = null;
	if (latestDip && latestDip.reading_date > anchor.date) {
		const bookAtDip = deriveBalance({
			anchor,
			refills,
			dispenses,
			asOf: latestDip.reading_date
		}).litres;
		const dipLitres = latestDip.reading_value || 0;
		const gap = computeVariance(bookAtDip, dipLitres);
		dipCheck = {
			date: latestDip.reading_date,
			dipLitres,
			bookAtDip,
			gapLitres: gap.litres,
			gapPct: gap.pct
		};
	}

	return {
		name: bowser?.name || 'Tank',
		capacity: bowser?.capacity ?? null,
		bookLitres: balance.litres,
		deliveriesSinceAnchor: balance.deliveries,
		dispensedSinceAnchor: balance.dispensed,
		runwayDays: runwayDays(balance.litres, burnRate(inputs.burnDispenses)),
		anchor,
		lastDipLitres: latestDip?.reading_value ?? null,
		lastDipDate: latestDip?.reading_date ?? null,
		dipCheck,
		asOf
	};
}

/** Percent of capacity, clamped to 0–100; null without a capacity. */
export function pctFull(litres: number, capacity: number | null | undefined): number | null {
	if (!capacity) return null;
	return Math.max(0, Math.min(100, (litres / capacity) * 100));
}

/** "31 Aug close" / "dip 12 Aug" — or with the year in the long form. */
export function anchorLabel(anchor: TankAnchor, form: 'short' | 'long' = 'short'): string {
	const date = form === 'long' ? fmtFull(anchor.date) : fmtDayMonth(anchor.date);
	return anchor.kind === 'close' ? `${date} close` : `dip ${date}`;
}

export const LOW_TANK_PCT = 15;

export interface TankAttention {
	severity: 'danger' | 'warning';
	text: string;
	href: string;
}

/** Tank-related items for the dashboard's "needs attention" list. */
export function tankAttention(insight: TankInsight | null, now: Date = new Date()): TankAttention[] {
	if (!insight) return [];
	const items: TankAttention[] = [];
	const pct = pctFull(insight.bookLitres, insight.capacity);

	if (insight.bookLitres <= 0) {
		items.push({
			severity: 'danger',
			text: `Book balance is ${Math.round(insight.bookLitres)} L — dip or delivery records look out of date`,
			href: '/tank'
		});
	} else if (pct !== null && pct < LOW_TANK_PCT) {
		items.push({
			severity: 'warning',
			text: `${insight.name} below ${LOW_TANK_PCT}% (${Math.round(insight.bookLitres)} L) — plan a delivery`,
			href: '/tank'
		});
	}

	const age = dipAgeDays(insight.lastDipDate, now);
	if (isDipStale(age)) {
		items.push({
			severity: 'warning',
			text: `Last dip is ${age} days old — take a fresh dip`,
			href: '/tank'
		});
	}
	return items;
}

export interface BalancePoint {
	date: string;
	/** Book balance at the end of the day. */
	litres: number;
	delivered: number;
	dispensed: number;
}

/**
 * The book balance at the end of each day from the anchor through `asOf`,
 * from the movements already fetched for the live balance — no extra query.
 * The first point is the anchor itself.
 */
export function balanceSeries(inputs: TankBalanceInputs | null, asOf: string): BalancePoint[] {
	if (!inputs?.anchor || asOf < inputs.anchor.date) return [];
	const { anchor } = inputs;

	const delivered = new Map<string, number>();
	for (const r of inputs.refills) {
		if (r.delivery_date > anchor.date && r.delivery_date <= asOf)
			delivered.set(r.delivery_date, (delivered.get(r.delivery_date) || 0) + (r.litres_added || 0));
	}
	const dispensed = new Map<string, number>();
	for (const d of inputs.dispenses) {
		if (d.entry_date > anchor.date && d.entry_date <= asOf)
			dispensed.set(d.entry_date, (dispensed.get(d.entry_date) || 0) + (d.litres_dispensed || 0));
	}

	const points: BalancePoint[] = [];
	let litres = anchor.litres;
	const day = new Date(`${anchor.date}T12:00:00`);
	for (let date = anchor.date; date <= asOf; ) {
		const inn = date === anchor.date ? 0 : delivered.get(date) || 0;
		const out = date === anchor.date ? 0 : dispensed.get(date) || 0;
		litres += inn - out;
		points.push({ date, litres, delivered: inn, dispensed: out });
		day.setDate(day.getDate() + 1);
		date = isoLocal(day);
	}
	return points;
}

// ---------------------------------------------------------------------------
// Month-end close
// ---------------------------------------------------------------------------

export interface MonthLedger {
	opening: { value: number; source: AnchorKind; date: string };
	deliveriesToDip: number;
	dispensedToDip: number;
	bookAtDip: number;
	dip: { date: string; litres: number } | null;
	/** Book at dip vs the dip itself — the leak check. Null without a dip. */
	variance: { litres: number; pct: number | null } | null;
	band: VarianceBand | null;
	deliveriesAfterDip: number;
	dispensedAfterDip: number;
	netAfterDip: number;
	/** What next month opens from. */
	bookMonthEnd: number;
}

/**
 * `refills`/`dispenses` must already be windowed to `(anchor.date, monthEnd]` —
 * windowing from the anchor rather than the month start is what makes a skipped
 * month correct instead of double-counting.
 *
 * The split at the dip is inclusive of the dip day, matching how a dip is taken:
 * at the end of that day's activity.
 */
export function buildMonthLedger(input: {
	anchor: TankAnchor;
	closingDip: DipRow | null;
	refills: RefillRow[];
	dispenses: DispenseRow[];
	monthEnd: string;
	toleranceL?: number;
}): MonthLedger {
	const { anchor, closingDip, monthEnd } = input;
	const splitDate = closingDip?.reading_date ?? monthEnd;

	const toDip = (date: string) => date > anchor.date && date <= splitDate;
	const afterDip = (date: string) => date > splitDate && date <= monthEnd;

	const deliveriesToDip = sumRefills(input.refills.filter((r) => toDip(r.delivery_date)));
	const dispensedToDip = sumDispensed(input.dispenses.filter((d) => toDip(d.entry_date)));
	const deliveriesAfterDip = sumRefills(input.refills.filter((r) => afterDip(r.delivery_date)));
	const dispensedAfterDip = sumDispensed(input.dispenses.filter((d) => afterDip(d.entry_date)));

	const bookAtDip = anchor.litres + deliveriesToDip - dispensedToDip;
	const netAfterDip = deliveriesAfterDip - dispensedAfterDip;

	const dipLitres = closingDip ? closingDip.reading_value || 0 : null;
	const variance = dipLitres === null ? null : computeVariance(bookAtDip, dipLitres);

	return {
		opening: { value: anchor.litres, source: anchor.kind, date: anchor.date },
		deliveriesToDip,
		dispensedToDip,
		bookAtDip,
		dip: closingDip ? { date: closingDip.reading_date, litres: dipLitres as number } : null,
		variance,
		band:
			variance === null || dipLitres === null
				? null
				: bandVariance(variance.litres, dipLitres, input.toleranceL),
		deliveriesAfterDip,
		dispensedAfterDip,
		netAfterDip,
		bookMonthEnd: bookAtDip + netAfterDip
	};
}

/**
 * What a normal close carries forward: the book, drift and all.
 */
export function carryForwardBook(ledger: MonthLedger): number {
	return ledger.bookMonthEnd;
}

/**
 * What an explicit re-baseline carries forward: the physical count, writing the
 * accumulated gap off. Deliberate and logged — never automatic, because doing
 * this every month would hide a real leak in dipstick noise.
 */
export function carryForwardRebaselined(ledger: MonthLedger): number | null {
	if (!ledger.dip) return null;
	return ledger.dip.litres + ledger.netAfterDip;
}

export interface VarianceTrendPoint {
	date: string;
	/** Book at dip minus the dip. Positive = book claims more than is there. */
	gapLitres: number;
	/** True when derived from the pre-migration `variance` column. */
	approximate: boolean;
}

export interface VarianceTrend {
	/** Newest first. */
	points: VarianceTrendPoint[];
	/** The current standing gap between book and physical stock. */
	latestGapLitres: number | null;
	/** Mean gap across the window — a persistent offset rather than noise. */
	meanGapLitres: number | null;
	/** Change from the oldest point in the window to the newest. */
	driftLitres: number | null;
	/** Date of the re-baseline the window opens from, if any. */
	sinceDate: string | null;
	months: number;
	anyApproximate: boolean;
}

/**
 * The leak signal.
 *
 * Because closes carry the book forward, each gap is a *level* — it already
 * contains every prior month's difference. So this reports the series, its
 * latest value and its drift, and deliberately does **not** sum the points:
 * summing a running total double-counts it.
 *
 * Read it as: a gap oscillating around zero is dipstick noise; a gap walking
 * steadily in one direction is a real loss (or a systematic recording error).
 *
 * `closes` must be newest-first. The window stops at the most recent
 * re-baseline, which reset the book to the physical count.
 */
export function varianceTrend(closes: CloseRow[]): VarianceTrend {
	const points: VarianceTrendPoint[] = [];
	let sinceDate: string | null = null;

	for (const close of closes) {
		if (close.is_rebaseline) {
			sinceDate = close.reconciliation_date;
			break;
		}
		const measured = close.measured_level;
		if (measured === null || measured === undefined) continue;

		// Prefer the true leak numerator; fall back to the legacy generated
		// column, which folds post-dip movements into the difference.
		const hasBook = close.book_at_dip !== null && close.book_at_dip !== undefined;
		const gapLitres = hasBook
			? (close.book_at_dip as number) - measured
			: (close.variance ?? 0);

		points.push({
			date: close.reconciliation_date,
			gapLitres,
			approximate: !hasBook
		});
	}

	if (points.length === 0) {
		return {
			points,
			latestGapLitres: null,
			meanGapLitres: null,
			driftLitres: null,
			sinceDate,
			months: 0,
			anyApproximate: false
		};
	}

	const total = points.reduce((sum, p) => sum + p.gapLitres, 0);
	const newest = points[0];
	const oldest = points[points.length - 1];

	return {
		points,
		latestGapLitres: newest.gapLitres,
		meanGapLitres: total / points.length,
		driftLitres: points.length > 1 ? newest.gapLitres - oldest.gapLitres : null,
		sinceDate,
		months: points.length,
		anyApproximate: points.some((p) => p.approximate)
	};
}
