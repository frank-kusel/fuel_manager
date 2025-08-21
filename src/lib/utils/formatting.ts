export function formatDate(date: string | Date, format: 'full' | 'short' | 'time' = 'full'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	
	if (isNaN(d.getTime())) {
		return 'Invalid date';
	}
	
	switch (format) {
		case 'short':
			return d.toLocaleDateString('en-GB', { 
				day: '2-digit', 
				month: 'short' 
			});
		case 'time':
			return d.toLocaleTimeString('en-GB', { 
				hour: '2-digit', 
				minute: '2-digit' 
			});
		case 'full':
		default:
			return d.toLocaleDateString('en-GB', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric' 
			});
	}
}

export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
	if (value === null || value === undefined) {
		return '0';
	}
	
	return value.toLocaleString('en-GB', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

export function formatCurrency(value: number | null | undefined, currency: string = 'ZAR'): string {
	if (value === null || value === undefined) {
		return 'R0.00';
	}
	
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: currency
	}).format(value);
}

export function formatPercentage(value: number | null | undefined, decimals: number = 0): string {
	if (value === null || value === undefined) {
		return '0%';
	}
	
	return `${value.toFixed(decimals)}%`;
}

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}
	
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	
	if (mins === 0) {
		return `${hours}h`;
	}
	
	return `${hours}h ${mins}m`;
}

export function formatFileSize(bytes: number): string {
	const sizes = ['B', 'KB', 'MB', 'GB'];
	if (bytes === 0) return '0 B';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}