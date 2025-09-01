<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import { PDFExportService } from '$lib/services/pdf-export';

	// Props
	let { 
		startDate = '',
		endDate = '',
		onclose = () => {}
	} = $props();

	// State
	let loading = $state(false);
	let error = $state('');
	let reportData = $state(null);
	let reportType = $state('fuel-usage');
	let groupBy = $state('vehicle');
	let includeDetails = $state(true);

	// Report configuration
	const reportTypes = [
		{ value: 'fuel-usage', label: 'Fuel Usage Report' },
		{ value: 'efficiency', label: 'Vehicle Efficiency Report' },
		{ value: 'reconciliation', label: 'Reconciliation Summary' },
		{ value: 'variance', label: 'Variance Analysis Report' }
	];

	const groupByOptions = [
		{ value: 'vehicle', label: 'By Vehicle' },
		{ value: 'driver', label: 'By Driver' },
		{ value: 'date', label: 'By Date' },
		{ value: 'activity', label: 'By Activity Type' }
	];

	onMount(async () => {
		await generateReport();
	});

	async function generateReport() {
		if (!startDate || !endDate) return;

		loading = true;
		error = '';
		reportData = null;

		try {
			await supabaseService.init();
			
			switch (reportType) {
				case 'fuel-usage':
					reportData = await generateFuelUsageReport();
					break;
				case 'efficiency':
					reportData = await generateEfficiencyReport();
					break;
				case 'reconciliation':
					reportData = await generateReconciliationReport();
					break;
				case 'variance':
					reportData = await generateVarianceReport();
					break;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate report';
		}

		loading = false;
	}

	async function generateFuelUsageReport() {
		const result = await supabaseService.getFuelEntriesForPeriod(startDate, endDate);
		if (result.error) throw new Error(result.error);

		const entries = result.data || [];
		const grouped = groupData(entries);

		return {
			title: 'Fuel Usage Report',
			period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
			summary: calculateFuelSummary(entries),
			groups: grouped,
			totalEntries: entries.length
		};
	}

	async function generateEfficiencyReport() {
		const result = await supabaseService.getFuelEntriesForPeriod(startDate, endDate);
		if (result.error) throw new Error(result.error);

		const entries = result.data || [];
		const grouped = groupData(entries);

		// Calculate efficiency metrics (L/hour, L/activity, etc.)
		const enrichedGroups = grouped.map(group => ({
			...group,
			efficiency: {
				fuelPerHour: group.totalFuel / Math.max(group.totalHours || 8, 1),
				fuelPerActivity: group.totalFuel / Math.max(group.activities || 1, 1),
				averageConsumption: group.totalFuel / Math.max(group.entries.length, 1)
			}
		}));

		return {
			title: 'Vehicle Efficiency Report',
			period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
			summary: calculateEfficiencySummary(enrichedGroups),
			groups: enrichedGroups,
			totalEntries: entries.length
		};
	}

	async function generateReconciliationReport() {
		const reconResult = await supabaseService.getDateRangeReconciliationData(startDate, endDate);
		const tankResult = await supabaseService.getTankReconciliationData(endDate);
		
		if (reconResult.error) throw new Error(reconResult.error);
		if (tankResult.error) throw new Error(tankResult.error);

		const fuelData = reconResult.data;
		const tankData = tankResult.data;

		const fuelVariance = (fuelData?.bowserEnd || 0) - (fuelData?.bowserStart || 0) - (fuelData?.fuelDispensed || 0);
		const tankVariance = (tankData?.calculatedLevel || 0) - (tankData?.measuredLevel || 0);

		return {
			title: 'Reconciliation Summary',
			period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
			summary: {
				fuelDispensed: fuelData?.fuelDispensed || 0,
				bowserStart: fuelData?.bowserStart || 0,
				bowserEnd: fuelData?.bowserEnd || 0,
				bowserDifference: (fuelData?.bowserEnd || 0) - (fuelData?.bowserStart || 0),
				fuelVariance,
				tankCalculated: tankData?.calculatedLevel || 0,
				tankMeasured: tankData?.measuredLevel || 0,
				tankVariance,
				tankVariancePercent: Math.abs(tankVariance / 24000 * 100)
			}
		};
	}

	async function generateVarianceReport() {
		// Get recent reconciliation history
		const historyResult = await supabaseService.getReconciliationHistory();
		if (historyResult.error) throw new Error(historyResult.error);

		const history = historyResult.data || [];
		const varianceAnalysis = history.map(record => ({
			date: record.end_date || record.reconciliation_date,
			type: record.fuel_dispensed !== undefined ? 'fuel' : 'tank',
			variance: record.fuel_dispensed !== undefined 
				? record.fuel_variance 
				: record.tank_variance_litres,
			variancePercent: record.fuel_dispensed !== undefined
				? Math.abs((record.fuel_variance || 0) / Math.max(record.fuel_dispensed, 1) * 100)
				: Math.abs((record.tank_variance_litres || 0) / 24000 * 100)
		}));

		return {
			title: 'Variance Analysis Report',
			period: 'Historical Data',
			summary: {
				totalRecords: varianceAnalysis.length,
				avgFuelVariance: calculateAverage(varianceAnalysis.filter(v => v.type === 'fuel'), 'variance'),
				avgTankVariance: calculateAverage(varianceAnalysis.filter(v => v.type === 'tank'), 'variance'),
				maxVariance: Math.max(...varianceAnalysis.map(v => Math.abs(v.variance || 0)))
			},
			analysis: varianceAnalysis
		};
	}

	function groupData(entries) {
		const groups = new Map();

		entries.forEach(entry => {
			let key;
			let label;

			switch (groupBy) {
				case 'vehicle':
					key = entry.vehicle_id;
					label = `${entry.vehicles?.code || 'N/A'} - ${entry.vehicles?.name || 'Unknown'}`;
					break;
				case 'driver':
					key = entry.driver_id;
					label = entry.drivers?.name || 'Unknown Driver';
					break;
				case 'date':
					key = entry.entry_date;
					label = formatDate(entry.entry_date);
					break;
				case 'activity':
					key = entry.activities?.name || 'Unknown';
					label = entry.activities?.name || 'Unknown Activity';
					break;
			}

			if (!groups.has(key)) {
				groups.set(key, {
					key,
					label,
					entries: [],
					totalFuel: 0,
					totalHours: 0,
					activities: 0
				});
			}

			const group = groups.get(key);
			group.entries.push(entry);
			group.totalFuel += entry.litres_dispensed || 0;
			group.totalHours += entry.hours || 0;
			group.activities += 1;
		});

		return Array.from(groups.values()).sort((a, b) => b.totalFuel - a.totalFuel);
	}

	function calculateFuelSummary(entries) {
		return {
			totalFuel: entries.reduce((sum, e) => sum + (e.litres_dispensed || 0), 0),
			totalHours: entries.reduce((sum, e) => sum + (e.hours || 0), 0),
			avgFuelPerEntry: entries.length > 0 ? 
				entries.reduce((sum, e) => sum + (e.litres_dispensed || 0), 0) / entries.length : 0,
			uniqueVehicles: new Set(entries.map(e => e.vehicle_id)).size,
			uniqueDrivers: new Set(entries.map(e => e.driver_id)).size
		};
	}

	function calculateEfficiencySummary(groups) {
		const totalFuel = groups.reduce((sum, g) => sum + g.totalFuel, 0);
		const totalHours = groups.reduce((sum, g) => sum + g.totalHours, 0);
		
		return {
			totalFuel,
			totalHours,
			overallEfficiency: totalHours > 0 ? totalFuel / totalHours : 0,
			bestPerformer: groups.length > 0 ? groups.reduce((best, current) => 
				current.efficiency.fuelPerHour < best.efficiency.fuelPerHour ? current : best
			) : null,
			worstPerformer: groups.length > 0 ? groups.reduce((worst, current) => 
				current.efficiency.fuelPerHour > worst.efficiency.fuelPerHour ? current : worst
			) : null
		};
	}

	function calculateAverage(data, field) {
		if (data.length === 0) return 0;
		return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
	}

	function formatNumber(num, decimals = 1) {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-ZA', { 
			minimumFractionDigits: decimals, 
			maximumFractionDigits: decimals 
		}).format(num);
	}

	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-ZA');
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-ZA', { 
			style: 'currency', 
			currency: 'ZAR' 
		}).format(amount);
	}

	async function exportToExcel() {
		if (!reportData) return;

		try {
			// Dynamic import for XLSX
			const XLSX = await import('xlsx');
			
			// Create workbook
			const wb = XLSX.utils.book_new();
			
			// Summary sheet
			const summaryData = [];
			summaryData.push([reportData.title]);
			summaryData.push([reportData.period]);
			summaryData.push([]);
			
			if (reportData.summary) {
				summaryData.push(['Summary']);
				Object.entries(reportData.summary).forEach(([key, value]) => {
					const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
					summaryData.push([label, typeof value === 'number' ? value : String(value)]);
				});
			}
			
			const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
			XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
			
			// Detailed data sheet
			if (reportData.groups && reportData.groups.length > 0) {
				const detailsData = [];
				detailsData.push(['Group', 'Total Fuel (L)', 'Entries', 'Average (L)', 'Hours', 'Efficiency (L/hr)']);
				
				reportData.groups.forEach(group => {
					detailsData.push([
						group.label,
						group.totalFuel,
						group.entries.length,
						group.totalFuel / group.entries.length,
						group.totalHours || 0,
						group.efficiency?.fuelPerHour || (group.totalFuel / Math.max(group.totalHours || 8, 1))
					]);
				});
				
				const detailsWs = XLSX.utils.aoa_to_sheet(detailsData);
				XLSX.utils.book_append_sheet(wb, detailsWs, 'Details');
			}
			
			// Variance analysis sheet
			if (reportData.analysis && reportData.analysis.length > 0) {
				const analysisData = [];
				analysisData.push(['Date', 'Type', 'Variance (L)', 'Variance (%)']);
				
				reportData.analysis.forEach(item => {
					analysisData.push([
						formatDate(item.date),
						item.type.toUpperCase(),
						item.variance,
						item.variancePercent
					]);
				});
				
				const analysisWs = XLSX.utils.aoa_to_sheet(analysisData);
				XLSX.utils.book_append_sheet(wb, analysisWs, 'Variance Analysis');
			}
			
			// Generate filename
			const filename = `${reportData.title.replace(/\s+/g, '_')}_${formatDate(startDate)}_to_${formatDate(endDate)}.xlsx`;
			
			// Write file
			XLSX.writeFile(wb, filename);
			
		} catch (err) {
			console.error('Export failed:', err);
			error = 'Failed to export report to Excel';
		}
	}

	async function exportToPDF() {
		if (!reportData) return;

		try {
			// Use shared PDF export service
			await PDFExportService.exportToPDF({
				title: reportData.title,
				period: reportData.period,
				data: reportData.groups || reportData.analysis || reportData,
				includeReconciliationStatus: false, // Don't include for advanced reports
				includeSignatureLine: false, // Don't include for advanced reports
				reportType: reportType as any
			});
			
		} catch (err) {
			console.error('PDF export failed:', err);
			error = 'Failed to export report to PDF';
		}
	}
</script>

<div class="reporting-overlay" onclick={onclose}>
	<div class="reporting-modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="header-content">
				<h2>Advanced Reporting</h2>
				<p>Generate detailed reports for analysis and export</p>
			</div>
			<Button variant="outline" size="sm" onclick={onclose}>Close</Button>
		</div>

		<div class="report-controls">
			<div class="control-group">
				<label for="report-type">Report Type</label>
				<select id="report-type" bind:value={reportType} onchange={generateReport}>
					{#each reportTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			{#if reportType === 'fuel-usage' || reportType === 'efficiency'}
				<div class="control-group">
					<label for="group-by">Group By</label>
					<select id="group-by" bind:value={groupBy} onchange={generateReport}>
						{#each groupByOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="control-group">
				<label for="include-details">
					<input 
						id="include-details" 
						type="checkbox" 
						bind:checked={includeDetails}
						onchange={generateReport}
					/>
					Include detailed breakdowns
				</label>
			</div>

			<Button variant="primary" onclick={generateReport} disabled={loading}>
				{loading ? 'Generating...' : 'Refresh Report'}
			</Button>
		</div>

		{#if reportData && !loading}
			<div class="export-controls">
				<Button variant="outline" onclick={exportToExcel} disabled={loading}>
					Export Excel
				</Button>
				<Button variant="outline" onclick={exportToPDF} disabled={loading}>
					Export PDF
				</Button>
			</div>
		{/if}

		{#if error}
			<div class="error-message">
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}

		{#if loading}
			<div class="loading">Generating report...</div>
		{:else if reportData}
			<div class="report-content">
				<!-- Report Header -->
				<div class="report-header">
					<h1>{reportData.title}</h1>
					<p class="report-period">{reportData.period}</p>
				</div>

				<!-- Summary Section -->
				{#if reportData.summary}
					<div class="summary-section">
						<h2>Summary</h2>
						
						{#if reportType === 'fuel-usage'}
							<div class="summary-grid">
								<div class="summary-card">
									<span class="summary-label">Total Fuel</span>
									<span class="summary-value">{formatNumber(reportData.summary.totalFuel)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Total Entries</span>
									<span class="summary-value">{reportData.totalEntries}</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Average per Entry</span>
									<span class="summary-value">{formatNumber(reportData.summary.avgFuelPerEntry)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Unique Vehicles</span>
									<span class="summary-value">{reportData.summary.uniqueVehicles}</span>
								</div>
							</div>
						{:else if reportType === 'reconciliation'}
							<div class="summary-grid">
								<div class="summary-card">
									<span class="summary-label">Fuel Dispensed</span>
									<span class="summary-value">{formatNumber(reportData.summary.fuelDispensed)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Bowser Difference</span>
									<span class="summary-value">{formatNumber(reportData.summary.bowserDifference)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Fuel Variance</span>
									<span class="summary-value" class:negative={reportData.summary.fuelVariance < 0}>
										{formatNumber(reportData.summary.fuelVariance)}L
									</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Tank Variance</span>
									<span class="summary-value" class:negative={reportData.summary.tankVariance < 0}>
										{formatNumber(reportData.summary.tankVariancePercent)}%
									</span>
								</div>
							</div>
						{:else if reportType === 'variance'}
							<div class="summary-grid">
								<div class="summary-card">
									<span class="summary-label">Total Records</span>
									<span class="summary-value">{reportData.summary.totalRecords}</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Avg Fuel Variance</span>
									<span class="summary-value">{formatNumber(reportData.summary.avgFuelVariance)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Avg Tank Variance</span>
									<span class="summary-value">{formatNumber(reportData.summary.avgTankVariance)}L</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Max Variance</span>
									<span class="summary-value">{formatNumber(reportData.summary.maxVariance)}L</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Detailed Groups -->
				{#if reportData.groups && includeDetails}
					<div class="details-section">
						<h2>Detailed Breakdown</h2>
						
						<div class="details-list">
							{#each reportData.groups as group}
								<div class="detail-card">
									<div class="detail-header">
										<h3>{group.label}</h3>
										<div class="detail-metrics">
											<span>{formatNumber(group.totalFuel)}L</span>
											{#if reportType === 'efficiency'}
												<span class="efficiency">
													{formatNumber(group.efficiency.fuelPerHour)}L/hr
												</span>
											{/if}
										</div>
									</div>
									
									{#if group.entries && group.entries.length > 0}
										<div class="detail-stats">
											<div class="stat">
												<span>Entries:</span>
												<span>{group.entries.length}</span>
											</div>
											<div class="stat">
												<span>Average:</span>
												<span>{formatNumber(group.totalFuel / group.entries.length)}L</span>
											</div>
											{#if reportType === 'efficiency' && group.totalHours > 0}
												<div class="stat">
													<span>Hours:</span>
													<span>{formatNumber(group.totalHours)}</span>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Variance Analysis -->
				{#if reportData.analysis && reportType === 'variance'}
					<div class="analysis-section">
						<h2>Historical Variance Trends</h2>
						
						<div class="analysis-list">
							{#each reportData.analysis.slice(0, 20) as item}
								<div class="analysis-item">
									<div class="analysis-date">{formatDate(item.date)}</div>
									<div class="analysis-type">{item.type.toUpperCase()}</div>
									<div class="analysis-variance" class:negative={item.variance < 0}>
										{formatNumber(item.variance)}L
									</div>
									<div class="analysis-percent">
										{formatNumber(item.variancePercent)}%
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.reporting-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.reporting-modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 1200px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.header-content h2 {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.header-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.report-controls {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		padding: 1rem 1.5rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 150px;
	}

	.control-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.control-group select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.control-group label input[type="checkbox"] {
		margin-right: 0.5rem;
	}

	.export-controls {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: #f3f4f6;
		border-top: 1px solid #e5e7eb;
		border-bottom: 1px solid #e5e7eb;
		justify-content: center;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
	}

	.loading {
		text-align: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
		font-style: italic;
	}

	.report-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.report-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.report-header h1 {
		margin: 0 0 0.5rem;
		font-size: 1.875rem;
		font-weight: 700;
		color: #111827;
	}

	.report-period {
		margin: 0;
		font-size: 1rem;
		color: #6b7280;
		font-weight: 500;
	}

	.summary-section, .details-section, .analysis-section {
		margin-bottom: 2rem;
	}

	.summary-section h2, .details-section h2, .analysis-section h2 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.summary-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.summary-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.summary-value.negative {
		color: #dc2626;
	}

	.details-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.detail-card {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		background: white;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.detail-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.detail-metrics {
		display: flex;
		gap: 1rem;
		align-items: center;
		font-weight: 600;
	}

	.efficiency {
		color: #059669;
		font-size: 0.875rem;
	}

	.detail-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.stat span:first-child {
		color: #6b7280;
		font-weight: 500;
	}

	.stat span:last-child {
		color: #111827;
		font-weight: 600;
	}

	.analysis-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.analysis-item {
		display: grid;
		grid-template-columns: 120px 60px 100px 80px;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.analysis-date {
		font-weight: 500;
		color: #111827;
	}

	.analysis-type {
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		text-align: center;
		font-weight: 600;
		font-size: 0.75rem;
	}

	.analysis-variance {
		font-weight: 600;
		text-align: right;
	}

	.analysis-variance.negative {
		color: #dc2626;
	}

	.analysis-percent {
		color: #6b7280;
		text-align: right;
	}

	@media (max-width: 768px) {
		.reporting-overlay {
			padding: 0;
		}
		
		.reporting-modal {
			border-radius: 0;
			max-height: 100vh;
		}
		
		.modal-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.report-controls {
			flex-direction: column;
			align-items: stretch;
		}
		
		.control-group {
			min-width: auto;
		}

		.export-controls {
			flex-direction: column;
			padding: 1rem;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.detail-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.detail-metrics {
			justify-content: space-between;
		}

		.detail-stats {
			grid-template-columns: 1fr;
		}

		.analysis-item {
			grid-template-columns: 1fr;
			gap: 0.5rem;
			text-align: center;
		}
	}
</style>