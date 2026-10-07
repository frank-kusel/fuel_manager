import { describe, expect, it } from 'vitest';
import { browserValuesToMigrate, DEFAULT_CLAIM_SETTINGS } from './claim-settings';
import type { AppSettingsRow } from '$lib/types';

function row(overrides: Partial<AppSettingsRow> = {}): AppSettingsRow {
	return {
		diesel_rebate_rate_cents: 303.8,
		drs_registration_no: null,
		dip_tolerance_litres: 200,
		migrated_from_browser_at: null,
		updated_at: '2026-10-07T00:00:00Z',
		...overrides
	};
}

describe('browserValuesToMigrate', () => {
	it("takes a browser's values into a fresh row", () => {
		expect(
			browserValuesToMigrate(row(), { rateCents: 310, regNo: 'DRS-123', dipToleranceL: 300 })
		).toEqual({ rateCents: 310, regNo: 'DRS-123', dipToleranceL: 300 });
	});

	it('never overwrites a value someone already set', () => {
		expect(
			browserValuesToMigrate(row({ drs_registration_no: 'DRS-999', dip_tolerance_litres: 250 }), {
				rateCents: 303.8,
				regNo: 'DRS-123',
				dipToleranceL: 300
			})
		).toEqual({});
	});

	it('does nothing once the row has been migrated', () => {
		expect(
			browserValuesToMigrate(row({ migrated_from_browser_at: '2026-10-07T00:00:00Z' }), {
				...DEFAULT_CLAIM_SETTINGS,
				regNo: 'DRS-123'
			})
		).toEqual({});
	});

	it('skips values that are only the defaults', () => {
		expect(browserValuesToMigrate(row(), DEFAULT_CLAIM_SETTINGS)).toEqual({});
	});
});
