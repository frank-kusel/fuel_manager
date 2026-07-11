import { summaryCacheStore } from './summary-cache';
import { dashboardInsightsStore } from './dashboard-insights';
import { referenceDataStore } from './reference-data';

/**
 * Central freshness hub.
 *
 * Rule 1: every successful mutation calls markFuelDataStale() — no mutation
 * site should hand-pick caches. Rule 2: invalidation marks caches stale but
 * keeps their data, so pages keep rendering the last-known state and refresh
 * silently (never a spinner over old data). Rule 3: pages revalidate quietly
 * when the app regains visibility, via onVisible().
 */

/** Call after any successful write to fuel_entries / tank_readings /
 * tank_refills / tank_reconciliations. */
export function markFuelDataStale() {
	summaryCacheStore.invalidate();
	dashboardInsightsStore.invalidate();
	// Vehicles/bowsers are enriched with current_odometer / current_reading
	// derived from fuel_entries, so the wizard's prefills go stale on every
	// fuel mutation too — not just the summary caches.
	referenceDataStore.invalidate();
}

/** Run `fn` whenever the document becomes visible again (tab switch, phone
 * unlock). Returns a cleanup function — call it from onMount's return. */
export function onVisible(fn: () => void): () => void {
	if (typeof document === 'undefined') return () => {};
	const handler = () => {
		if (document.visibilityState === 'visible') fn();
	};
	document.addEventListener('visibilitychange', handler);
	return () => document.removeEventListener('visibilitychange', handler);
}
