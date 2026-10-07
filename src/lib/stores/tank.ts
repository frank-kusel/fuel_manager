import { derived, get, writable } from 'svelte/store';
import { todayIso } from '$lib/utils/dates';
import {
	bookHistory,
	buildTankInsight,
	type BalancePoint,
	type CloseRow,
	type DipRow,
	type TankInsight
} from '$lib/utils/tank-balance';

/**
 * The live tank — one store for every screen that shows the balance: the Tank
 * page, the sidebar strip and the dashboard's attention list.
 *
 * Split out of the dashboard insights store so the sidebar no longer pays for
 * a whole month of fleet analytics (~10 queries) to show one number.
 */

export interface Delivery {
	date: string;
	litres: number;
	supplier: string | null;
	invoice: string | null;
}

export interface TankData {
	/** Null on a fresh install: nothing to anchor a book to yet. */
	insight: TankInsight | null;
	/** The book at the end of every day since the oldest close. */
	history: BalancePoint[];
	/** Every dip, oldest first; checked against `history` by the page. */
	dips: DipRow[];
	/** Every delivery, newest first. */
	deliveries: Delivery[];
	closes: CloseRow[];
}

interface TankState {
	data: TankData | null;
	loading: boolean;
	error: string | null;
	timestamp: number | null;
	/** Set by mutations: data is outdated but still renderable. */
	stale: boolean;
}

const CACHE_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'farmtrack_tank_cache_v2';

function loadPersisted(): Pick<TankState, 'data' | 'timestamp' | 'stale'> {
	try {
		if (typeof localStorage === 'undefined') return { data: null, timestamp: null, stale: false };
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
		if (!parsed?.data) return { data: null, timestamp: null, stale: false };
		return { data: parsed.data, timestamp: parsed.timestamp || null, stale: !!parsed.stale };
	} catch {
		return { data: null, timestamp: null, stale: false };
	}
}

function persist(data: TankData | null, timestamp: number | null, stale: boolean) {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp, stale }));
	} catch {
		// Quota/private mode — in-memory only.
	}
}

function createTankStore() {
	const persisted = loadPersisted();
	const store = writable<TankState>({ ...persisted, loading: false, error: null });
	const { update } = store;

	// Screens currently showing the tank; invalidate() refetches only for them.
	let subscribers = 0;
	function subscribe(...args: Parameters<typeof store.subscribe>) {
		subscribers++;
		const unsubscribe = store.subscribe(...args);
		return () => {
			subscribers--;
			unsubscribe();
		};
	}

	let inflight: Promise<void> | null = null;

	async function load(force = false): Promise<void> {
		const current = get(store);
		if (
			!force &&
			!current.stale &&
			current.data &&
			current.timestamp &&
			Date.now() - current.timestamp < CACHE_MS
		)
			return;
		if (inflight) return inflight;

		inflight = (async () => {
			update((s) => ({ ...s, loading: true, error: null }));
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const client = supabaseService.getClient();
				const asOf = todayIso();

				const [inputsRes, bowserRes, historyRes] = await Promise.all([
					supabaseService.getTankBalanceInputs(asOf),
					client.from('bowsers').select('name, capacity').eq('active', true).limit(1),
					supabaseService.getTankHistory('2000-01-01')
				]);
				if (inputsRes.error) throw new Error(inputsRes.error);
				if (bowserRes.error) throw new Error(bowserRes.error.message);
				if (historyRes.error || !historyRes.data) throw new Error(historyRes.error ?? 'No history');

				const { closes, dips, deliveries } = historyRes.data;
				// The history starts at the oldest close (or the newest dip on a
				// tank that has never been closed).
				const fallbackDip = closes.length ? null : (dips.at(-1) ?? null);
				const start = closes[0]?.reconciliation_date ?? fallbackDip?.reading_date ?? null;
				const dispensedRes = start
					? await supabaseService.getDispensedSince(start, asOf)
					: { data: [], error: null };
				if (dispensedRes.error) throw new Error(dispensedRes.error);

				const data: TankData = {
					insight: buildTankInsight(inputsRes.data, bowserRes.data?.[0] ?? null, asOf),
					history: bookHistory({
						closes,
						refills: deliveries,
						dispenses: dispensedRes.data || [],
						to: asOf,
						fallbackDip
					}),
					dips,
					deliveries: deliveries
						.map((d) => ({
							date: d.delivery_date,
							litres: Number(d.litres_added || 0),
							supplier: d.supplier?.trim() || null,
							invoice: d.invoice_number || null
						}))
						.reverse(),
					closes
				};
				const timestamp = Date.now();
				persist(data, timestamp, false);
				update((s) => ({ ...s, data, loading: false, error: null, timestamp, stale: false }));
			} catch (err) {
				update((s) => ({
					...s,
					loading: false,
					error: err instanceof Error ? err.message : 'Failed to load the tank'
				}));
			} finally {
				inflight = null;
			}
		})();
		return inflight;
	}

	/**
	 * Mark stale and, when a screen is showing the tank, refetch now — a dip
	 * recorded from the sidebar should move the number already on screen.
	 */
	function invalidate() {
		update((s) => {
			persist(s.data, s.timestamp, true);
			return { ...s, stale: true };
		});
		if (subscribers > 0) load();
	}

	return { subscribe, load, invalidate };
}

export const tankStore = createTankStore();
export const tankData = derived(tankStore, ($s) => $s.data);
export const tankLoading = derived(tankStore, ($s) => $s.loading);
export const tankError = derived(tankStore, ($s) => $s.error);
