import { get, writable } from 'svelte/store';
import { DEFAULT_DIP_TOLERANCE_L } from '$lib/utils/tank-balance';
import type { AppSettingsPatch, AppSettingsRow } from '$lib/types';

/**
 * The claim and tank settings every screen and device must agree on: the
 * rebate rate, the DRS registration number and — the one that matters most —
 * the dipstick tolerance that bands every book-vs-dip gap and decides whether
 * a close is accepted.
 *
 * The source of truth is the single app_settings row (migration 022). This
 * browser's localStorage is only a cache for an instant first paint and the
 * fallback while the migration has not been applied.
 */
export interface ClaimSettings {
	/** Diesel refund rate, cents per litre. */
	rateCents: number;
	/** Diesel refund (DRS) registration number. */
	regNo: string;
	/** Dipstick resolution; gap bands never flag below it. */
	dipToleranceL: number;
}

export const DEFAULT_CLAIM_SETTINGS: ClaimSettings = {
	rateCents: 303.8,
	regNo: '',
	dipToleranceL: DEFAULT_DIP_TOLERANCE_L
};

/** The key the Audit page has always saved its settings under. */
export const LEGACY_SETTINGS_KEY = 'farmtrack_audit_settings_v1';

interface ClaimSettingsState {
	settings: ClaimSettings;
	/** 'db' once the shared row is loaded; 'local' before, or without migration 022. */
	source: 'db' | 'local';
	loaded: boolean;
}

function sanitise(raw: Partial<ClaimSettings> | null | undefined): ClaimSettings {
	return {
		rateCents:
			Number(raw?.rateCents) >= 0 && raw?.rateCents !== undefined && raw?.rateCents !== null
				? Number(raw.rateCents)
				: DEFAULT_CLAIM_SETTINGS.rateCents,
		regNo: typeof raw?.regNo === 'string' ? raw.regNo.trim() : '',
		dipToleranceL:
			Number(raw?.dipToleranceL) > 0 ? Number(raw?.dipToleranceL) : DEFAULT_DIP_TOLERANCE_L
	};
}

function readLocal(): { settings: ClaimSettings; found: boolean } {
	try {
		if (typeof localStorage === 'undefined')
			return { settings: DEFAULT_CLAIM_SETTINGS, found: false };
		const raw = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) || 'null');
		return { settings: sanitise(raw), found: !!raw };
	} catch {
		return { settings: DEFAULT_CLAIM_SETTINGS, found: false };
	}
}

function writeLocal(settings: ClaimSettings) {
	try {
		if (typeof localStorage === 'undefined') return;
		// Merge: the same key still carries the legacy eligibility list.
		const raw = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) || '{}');
		localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ ...raw, ...settings }));
	} catch {
		/* private mode */
	}
}

function fromRow(row: AppSettingsRow): ClaimSettings {
	return sanitise({
		rateCents: Number(row.diesel_rebate_rate_cents),
		regNo: row.drs_registration_no ?? '',
		dipToleranceL: Number(row.dip_tolerance_litres)
	});
}

function toPatch(settings: Partial<ClaimSettings>): AppSettingsPatch {
	const patch: AppSettingsPatch = {};
	if (settings.rateCents !== undefined) patch.diesel_rebate_rate_cents = settings.rateCents;
	if (settings.regNo !== undefined) patch.drs_registration_no = settings.regNo.trim() || null;
	if (settings.dipToleranceL !== undefined) patch.dip_tolerance_litres = settings.dipToleranceL;
	return patch;
}

/**
 * The one-time move of a browser's old values into the shared row: only fields
 * the row still has at their defaults are taken, so a second browser can never
 * overwrite values someone already set.
 */
export function browserValuesToMigrate(
	row: AppSettingsRow,
	local: ClaimSettings
): Partial<ClaimSettings> {
	if (row.migrated_from_browser_at) return {};
	const db = fromRow(row);
	const take: Partial<ClaimSettings> = {};
	if (!db.regNo && local.regNo) take.regNo = local.regNo;
	if (db.rateCents === DEFAULT_CLAIM_SETTINGS.rateCents && local.rateCents !== db.rateCents)
		take.rateCents = local.rateCents;
	if (db.dipToleranceL === DEFAULT_DIP_TOLERANCE_L && local.dipToleranceL !== db.dipToleranceL)
		take.dipToleranceL = local.dipToleranceL;
	return take;
}

function createClaimSettingsStore() {
	const store = writable<ClaimSettingsState>({
		settings: readLocal().settings,
		source: 'local',
		loaded: false
	});
	let inflight: Promise<void> | null = null;

	async function load(): Promise<void> {
		if (inflight) return inflight;
		inflight = (async () => {
			try {
				const { default: supabaseService } = await import('$lib/services/supabase');
				await supabaseService.init();
				const result = await supabaseService.getAppSettings();
				if (result.missing || result.error || !result.data) {
					if (result.missing)
						console.warn('app_settings table missing (migration 022) — using this browser’s settings');
					store.update((s) => ({ ...s, source: 'local', loaded: true }));
					return;
				}

				let row = result.data;
				const local = readLocal();
				// Only a browser that actually brings values closes the one-time
				// copy: one with nothing to add (a new phone, a fresh preview)
				// must not shut out the device that holds the real settings.
				const take =
					!row.migrated_from_browser_at && local.found
						? browserValuesToMigrate(row, local.settings)
						: {};
				if (Object.keys(take).length > 0) {
					const migrated = await supabaseService.updateAppSettings({
						...toPatch(take),
						migrated_from_browser_at: new Date().toISOString()
					});
					if (migrated.data) row = migrated.data;
				}

				const settings = fromRow(row);
				writeLocal(settings); // cache for the next cold start
				store.set({ settings, source: 'db', loaded: true });
			} catch (err) {
				console.warn('Could not load app settings:', err);
				store.update((s) => ({ ...s, loaded: true }));
			} finally {
				inflight = null;
			}
		})();
		return inflight;
	}

	/** Save a change. Returns an error message, or null on success. */
	async function save(patch: Partial<ClaimSettings>): Promise<string | null> {
		const previous = get(store);
		const next = sanitise({ ...previous.settings, ...patch });
		store.set({ ...previous, settings: next });
		writeLocal(next);

		if (previous.source !== 'db') return null;
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			const result = await supabaseService.updateAppSettings(toPatch(patch));
			if (result.error) throw new Error(result.error);
			if (result.data) store.update((s) => ({ ...s, settings: fromRow(result.data!) }));
			return null;
		} catch (err) {
			store.set(previous);
			writeLocal(previous.settings);
			return err instanceof Error ? err.message : 'Could not save settings';
		}
	}

	return {
		subscribe: (run: (value: ClaimSettings) => void, invalidate?: () => void) => {
			const unsubscribe = store.subscribe((s) => run(s.settings), invalidate as any);
			return unsubscribe;
		},
		/** Where the values came from — for the settings panel's status line. */
		state: { subscribe: store.subscribe },
		load,
		save
	};
}

export const claimSettings = createClaimSettingsStore();
