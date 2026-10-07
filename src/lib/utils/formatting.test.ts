import { describe, expect, it } from 'vitest';
import { formatRand, formatSigned, formatWholeLitres } from './formatting';

const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatSigned', () => {
	it('signs positives and uses a true minus for negatives', () => {
		expect(plain(formatSigned(597.4))).toBe('+597');
		expect(plain(formatSigned(-1320.6))).toBe('−1 321');
		expect(formatSigned(0)).toBe('0');
	});

	it('does not sign a value that rounds to zero', () => {
		expect(formatSigned(-0.2)).toBe('0');
		expect(formatSigned(0.04, 1)).toBe('0,0');
	});

	it('keeps decimals when asked', () => {
		expect(formatSigned(-483.94, 1)).toBe('−483,9');
	});

	it('shows a dash for nothing', () => {
		expect(formatSigned(null)).toBe('—');
	});
});

describe('formatWholeLitres and formatRand', () => {
	it('rounds to whole units', () => {
		expect(plain(formatWholeLitres(6832.3))).toBe('6 832');
		expect(plain(formatRand(20757.4))).toBe('R 20 757');
	});
});
