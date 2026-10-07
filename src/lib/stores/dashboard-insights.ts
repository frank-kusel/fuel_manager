import { writable, derived } from 'svelte/store';

/**
 * Dashboard insights store — month-scoped operational view.
 *
 * All figures are DERIVED from fuel_entries
 * in code. Deliberately does NOT read vehicles.current_odometer or
 * bowsers.current_reading: those columns are missing from the live DB
 * (schema drift) — fuel_entries is the source of truth here.
 */

export interface ActivitySlice {
	name: string;
	litres: number;
	pct: number;
}

export interface FleetRow {
	vehicleId: string;
	code: string;
	name: string;
	litres: number;
	entryCount: number;
	/** Month efficiency (L/100km) from valid-gauge entries; null if none */
	monthEfficiency: number | null;
	/** Vehicle's stored lifetime average (L/100km); null if unknown */
	baselineEfficiency: number | null;
	/** % delta of month vs baseline; null when either side missing */
	deltaPct: number | null;
}

export interface AttentionItem {
	severity: 'danger' | 'warning' | 'info';
	text: string;
	/** Where to go to act on it, when there is somewhere */
	href?: string;
}

export interface DailyPoint {
	date: string; // YYYY-MM-DD
	litres: number;
}

export interface DashboardInsights {
	monthLabel: string;
	monthStart: string;
	totalLitres: number;
	entryCount: number;
	prevMonthLitres: number;
	/** % change vs previous month over the same number of elapsed days */
	momPct: number | null;
	byActivity: ActivitySlice[];
	fleet: FleetRow[];
	/** Fleet and logbook items only — tank items come from the tank store. */
	attention: AttentionItem[];
	daily: DailyPoint[];
	brokenGaugeCount: number;
}

interface InsightsState {
	data: DashboardInsights | null;
	loading: boolean;
	error: string | null;
	timestamp: number | null;
	/** Set by mutations: data is outdated but still renderable (SWR). */
	stale: boolean;
}

const CACHE_MS = 5 * 60 * 1000;
const STORAGE_KEY = 'farmtrack_insights_cache_v3';

// Hydrate from localStorage so a cold app-open paints the dashboard (and the
// month figures) instantly; fresh data replaces it silently.
function loadPersisted(): { data: DashboardInsights | null; timestamp: number | null; stale: boolean } {
	try {
		if (typeof localStorage === 'undefined') return { data: null, timestamp: null, stale: false };
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { data: null, timestamp: null, stale: false };
		const parsed = JSON.parse(raw);
		if (!parsed.data) return { data: null, timestamp: null, stale: false };
		return { data: parsed.data, timestamp: parsed.timestamp || null, stale: !!parsed.stale };
	} catch {
		return { data: null, timestamp: null, stale: false };
	}
}

function persistInsights(data: DashboardInsights | null, timestamp: number | null, stale: boolean) {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp, stale }));
	} catch {
		// Quota/private mode — cache stays in-memory only.
	}
}
const OUTLIER_THRESHOLD_PCT = 15;

function isoDate(d: Date): string {
	// Local date, not UTC — toISOString() shifts SAST dates back a day,
	// which mislabels the daily chart and drops today's entries from it.
	return d.toLocaleDateString('en-CA');
}

function createInsightsStore() {
	const persisted = loadPersisted();
	const { subscribe, update } = writable<InsightsState>({
		data: persisted.data,
		loading: false,
		error: null,
		timestamp: persisted.timestamp,
		stale: persisted.stale
	});

	async function load(forceRefresh = false) {
		let cached: InsightsState | undefined;
		subscribe((s) => (cached = s))();
		if (
			!forceRefresh &&
			!cached?.stale &&
			cached?.timestamp &&
			Date.now() - cached.timestamp < CACHE_MS &&
			cached.data
		) {
			return;
		}

		update((s) => ({ ...s, loading: true, error: null }));

		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			const client = supabaseService.getClient();

			const now = new Date();
			const ENTRY_COLS =
				'entry_date, litres_dispensed, gauge_working, fuel_consumption_l_per_100km, vehicle_id, vehicles(id, code, name), activities(name, code)';

			/** Window for the month `offset` months back (0 = current, partial). */
			function monthWindow(offset: number) {
				const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
				const end =
					offset === 0
						? now
						: new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
				// Comparison window: same span, one month earlier
				const prevStart = new Date(now.getFullYear(), now.getMonth() - offset - 1, 1);
				const prevEnd =
					offset === 0
						? new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
						: new Date(now.getFullYear(), now.getMonth() - offset, 0);
				return { start, end, prevStart, prevEnd };
			}

			// Current month; if it has no entries yet (e.g. the 1st/2nd of the
			// month), fall back to the last completed month so the review view
			// stays useful.
			let win = monthWindow(0);
			let entriesRes = await client
				.from('fuel_entries')
				.select(ENTRY_COLS)
				.is('deleted_at', null)
				.gte('entry_date', isoDate(win.start))
				.lte('entry_date', isoDate(win.end));
			if (entriesRes.error) throw new Error(entriesRes.error.message);
			if ((entriesRes.data || []).length === 0) {
				win = monthWindow(1);
				entriesRes = await client
					.from('fuel_entries')
					.select(ENTRY_COLS)
					.is('deleted_at', null)
					.gte('entry_date', isoDate(win.start))
					.lte('entry_date', isoDate(win.end));
				if (entriesRes.error) throw new Error(entriesRes.error.message);
			}
			const monthStart = win.start;
			const monthStartIso = isoDate(win.start);
			const windowEnd = win.end;

			const [prevRes, vehiclesRes, futureRes] = await Promise.all([
				client
					.from('fuel_entries')
					.select('entry_date, litres_dispensed')
					.is('deleted_at', null)
					.gte('entry_date', isoDate(win.prevStart))
					.lte('entry_date', isoDate(win.prevEnd)),
				client
					.from('vehicles')
					.select('id, code, name, average_consumption_l_per_100km')
					.eq('active', true),
				client
					.from('fuel_entries')
					.select('id, entry_date, vehicles(code)')
					.is('deleted_at', null)
					.gt('entry_date', isoDate(now))
			]);

			const firstError = prevRes.error || vehiclesRes.error;
			if (firstError) throw new Error(firstError.message);

			const entries = entriesRes.data || [];
			const prevEntries = prevRes.data || [];
			const vehicles = vehiclesRes.data || [];

			// ---- Totals ----
			const totalLitres = entries.reduce((s, e) => s + (e.litres_dispensed || 0), 0);
			const prevMonthLitres = prevEntries.reduce((s, e) => s + (e.litres_dispensed || 0), 0);
			const momPct =
				prevMonthLitres > 0
					? Math.round(((totalLitres - prevMonthLitres) / prevMonthLitres) * 100)
					: null;

			// ---- By activity ----
			const activityTotals = new Map<string, number>();
			for (const e of entries) {
				const name = (e as any).activities?.name || (e as any).activities?.code || 'Other';
				activityTotals.set(name, (activityTotals.get(name) || 0) + (e.litres_dispensed || 0));
			}
			const sorted = [...activityTotals.entries()].sort((a, b) => b[1] - a[1]);
			const top = sorted.slice(0, 4);
			const otherLitres = sorted.slice(4).reduce((s, [, l]) => s + l, 0);
			const byActivity: ActivitySlice[] = top.map(([name, litres]) => ({
				name,
				litres,
				pct: totalLitres > 0 ? Math.round((litres / totalLitres) * 100) : 0
			}));
			if (otherLitres > 0) {
				byActivity.push({
					name: 'Other',
					litres: otherLitres,
					pct: totalLitres > 0 ? Math.round((otherLitres / totalLitres) * 100) : 0
				});
			}

			// ---- Fleet rows ----
			const vehicleBaseline = new Map(
				vehicles.map((v) => [v.id, v.average_consumption_l_per_100km ?? null])
			);
			const byVehicle = new Map<
				string,
				{ code: string; name: string; litres: number; count: number; effSum: number; effCount: number }
			>();
			for (const e of entries) {
				const v = (e as any).vehicles;
				if (!v?.id) continue;
				const row = byVehicle.get(v.id) || {
					code: v.code || '',
					name: v.name || 'Unknown',
					litres: 0,
					count: 0,
					effSum: 0,
					effCount: 0
				};
				row.litres += e.litres_dispensed || 0;
				row.count += 1;
				if (e.gauge_working && e.fuel_consumption_l_per_100km) {
					row.effSum += e.fuel_consumption_l_per_100km;
					row.effCount += 1;
				}
				byVehicle.set(v.id, row);
			}
			const fleet: FleetRow[] = [...byVehicle.entries()]
				.map(([vehicleId, r]) => {
					const monthEfficiency = r.effCount > 0 ? r.effSum / r.effCount : null;
					const baselineEfficiency = vehicleBaseline.get(vehicleId) ?? null;
					const deltaPct =
						monthEfficiency !== null && baselineEfficiency
							? Math.round(((monthEfficiency - baselineEfficiency) / baselineEfficiency) * 100)
							: null;
					return {
						vehicleId,
						code: r.code,
						name: r.name,
						litres: r.litres,
						entryCount: r.count,
						monthEfficiency,
						baselineEfficiency,
						deltaPct
					};
				})
				.sort((a, b) => b.litres - a.litres);

			// ---- Daily usage ----
			const dailyTotals = new Map<string, number>();
			for (const e of entries) {
				dailyTotals.set(e.entry_date, (dailyTotals.get(e.entry_date) || 0) + (e.litres_dispensed || 0));
			}
			const daily: DailyPoint[] = [];
			for (let d = new Date(monthStart); d <= windowEnd; d.setDate(d.getDate() + 1)) {
				const key = isoDate(d);
				daily.push({ date: key, litres: dailyTotals.get(key) || 0 });
			}

			// ---- Attention items ----
			const attention: AttentionItem[] = [];
			const brokenGaugeCount = entries.filter((e) => e.gauge_working === false).length;

			for (const row of fleet) {
				if (row.deltaPct !== null && row.deltaPct >= OUTLIER_THRESHOLD_PCT && row.entryCount >= 3) {
					attention.push({
						severity: 'danger',
						text: `${row.code} ${row.name} burning ${row.deltaPct}% above its average`,
						href: `/tools/database/vehicles/${row.vehicleId}`
					});
				}
			}
			if (brokenGaugeCount > 0) {
				attention.push({
					severity: 'warning',
					text: `${brokenGaugeCount} ${brokenGaugeCount === 1 ? 'entry' : 'entries'} this month with a broken gauge`,
					href: '/entries'
				});
			}
			const futureEntries = futureRes.data || [];
			if (futureEntries.length > 0) {
				const codes = [...new Set(futureEntries.map((e: any) => e.vehicles?.code).filter(Boolean))]
					.slice(0, 3)
					.join(', ');
				attention.push({
					severity: 'danger',
					text: `${futureEntries.length} future-dated ${futureEntries.length === 1 ? 'entry' : 'entries'}${codes ? ` (${codes})` : ''} — check the entry dates`,
					href: '/entries'
				});
			}

			const monthLabel = monthStart.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

			const freshData: DashboardInsights = {
				monthLabel,
				monthStart: monthStartIso,
				totalLitres,
				entryCount: entries.length,
				prevMonthLitres,
				momPct,
				byActivity,
				fleet,
				attention,
				daily,
				brokenGaugeCount
			};
			const now2 = Date.now();
			persistInsights(freshData, now2, false);
			update((s) => ({
				...s,
				data: freshData,
				loading: false,
				error: null,
				timestamp: now2,
				stale: false
			}));
		} catch (err) {
			update((s) => ({
				...s,
				loading: false,
				error: err instanceof Error ? err.message : 'Failed to load dashboard insights'
			}));
		}
	}

	/** Mark stale: pages keep rendering the cached insights, and the next
	 * load() (mount or visibility) refetches in the background. */
	function invalidate() {
		update((s) => {
			persistInsights(s.data, s.timestamp, true);
			return { ...s, stale: true };
		});
	}

	return { subscribe, load, invalidate };
}

export const dashboardInsightsStore = createInsightsStore();
export const insightsData = derived(dashboardInsightsStore, ($s) => $s.data);
export const insightsLoading = derived(dashboardInsightsStore, ($s) => $s.loading);
export const insightsError = derived(dashboardInsightsStore, ($s) => $s.error);
