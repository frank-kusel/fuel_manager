import { describe, expect, it } from 'vitest';
import { isClaimEligible } from './diesel-claim';

describe('isClaimEligible', () => {
	it('follows the Fuel Manager activity', () => {
		expect(isClaimEligible({ activity: { diesel_claim_eligible: true } })).toBe(true);
		expect(isClaimEligible({ activity: { diesel_claim_eligible: false }, purpose_claimable: true })).toBe(false);
	});
	it('never claims fuel marked Not claimable', () => {
		expect(isClaimEligible({ not_claimable: true, activity: { diesel_claim_eligible: true } })).toBe(false);
	});
	it('uses the purpose code for a fill-up made on the phone', () => {
		expect(isClaimEligible({ activity: null, purpose_claimable: true })).toBe(true);
		expect(isClaimEligible({ activity: null, purpose_claimable: false })).toBe(false);
		expect(isClaimEligible({})).toBe(false);
	});
});
