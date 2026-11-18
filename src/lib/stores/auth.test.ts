import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/supabase', () => ({ default: {} }));

import { settleFarm, type FarmChoice } from './auth';

const a: FarmChoice = { id: 'a', name: 'Killiecrankie', role: 'owner' };
const b: FarmChoice = { id: 'b', name: 'Scratch farm', role: 'owner' };

describe('settleFarm', () => {
	it('opens the only farm without asking', () => {
		expect(settleFarm([a], null)).toBe('a');
	});
	it('keeps the farm this device remembers', () => {
		expect(settleFarm([a, b], 'b')).toBe('b');
	});
	it('asks when there are several and none is remembered', () => {
		expect(settleFarm([a, b], null)).toBeNull();
	});
	it('asks again when the remembered farm is no longer one of theirs', () => {
		expect(settleFarm([a, b], 'gone')).toBeNull();
		expect(settleFarm([], 'a')).toBeNull();
	});
});
