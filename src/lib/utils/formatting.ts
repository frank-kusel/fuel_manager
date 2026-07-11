/**
 * Shared display formatters, pinned to en-ZA so every screen renders numbers
 * and dates the same way (space-grouped thousands, comma decimals). Add new
 * formatters here instead of new Intl.NumberFormat calls in components.
 */

const LOCALE = 'en-ZA';

const integerFormat = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
	if (value === null || value === undefined || isNaN(value)) return '0';
	if (decimals === 0) return integerFormat.format(value);
	return new Intl.NumberFormat(LOCALE, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/** Litres with one decimal, e.g. "1 234,5" */
export function formatLitres(value: number | null | undefined): string {
	return formatNumber(value, 1);
}

/** Field area in hectares, e.g. "12,5 ha" */
export function formatArea(area: number | null | undefined): string {
	if (area === null || area === undefined) return '';
	return `${formatNumber(area, area % 1 === 0 ? 0 : 1)} ha`;
}

export function formatCurrency(value: number | null | undefined, currency: string = 'ZAR'): string {
	if (value === null || value === undefined) return 'R0.00';
	return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value);
}

export function formatDate(date: string | Date, format: 'full' | 'short' | 'time' = 'full'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return 'Invalid date';

	switch (format) {
		case 'short':
			return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' });
		case 'time':
			return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
		case 'full':
		default:
			return d.toLocaleDateString(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
	}
}
