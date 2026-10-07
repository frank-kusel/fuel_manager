import { writable } from 'svelte/store';
import { DEFAULT_DIP_TOLERANCE_L } from '$lib/utils/tank-balance';

/**
 * The claim and tank settings every screen must agree on: the rebate rate,
 * the DRS registration number and — the one that matters most — the dipstick
 * tolerance that bands every book-vs-dip gap. Before this store the Tank page
 * and the claim PDF used the 200 L default while the close used whatever this
 * browser had saved, so one dip could be green on one screen and amber on
 * another.
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

function readLocal(): ClaimSettings {
	try {
		if (typeof localStorage === 'undefined') return DEFAULT_CLAIM_SETTINGS;
		const raw = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) || 'null');
		if (!raw) return DEFAULT_CLAIM_SETTINGS;
		return {
			rateCents: Number(raw.rateCents) || DEFAULT_CLAIM_SETTINGS.rateCents,
			regNo: typeof raw.regNo === 'string' ? raw.regNo : '',
			dipToleranceL: Number(raw.dipToleranceL) > 0 ? Number(raw.dipToleranceL) : DEFAULT_DIP_TOLERANCE_L
		};
	} catch {
		return DEFAULT_CLAIM_SETTINGS;
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

function createClaimSettingsStore() {
	const { subscribe, set } = writable<ClaimSettings>(readLocal());

	return {
		subscribe,
		save(patch: Partial<ClaimSettings>) {
			const next = { ...readLocal(), ...patch };
			writeLocal(next);
			set(next);
		}
	};
}

export const claimSettings = createClaimSettingsStore();
