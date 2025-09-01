<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import InlineFuelEditor from '$lib/components/reconciliation/InlineFuelEditor.svelte';
	import TankLevelAdjustment from '$lib/components/reconciliation/TankLevelAdjustment.svelte';
	import ReportingFramework from '$lib/components/reporting/ReportingFramework.svelte';
	import supabaseService from '$lib/services/supabase';
	import { cacheActions, cacheStats } from '$lib/stores/reconciliation-cache';

	// Component state
	let selectedRange = $state('week');
	let startDate = $state('');
	let endDate = $state('');
	let customRange = $state(false);
	let loading = $state(false);
	let fuelData = $state(null);
	let tankData = $state(null);
	let error = $state('');
	let submitting = $state(false);
	let reconciliationHistory = $state([]);
	let historyLoading = $state(false);
	let showFuelEditor = $state(false);
	let showTankEditor = $state(false);
	let showReporting = $state(false);

	const datePresets = [
		{ value: 'today', label: 'Today' },
		{ value: 'week', label: 'Last 7 Days' },
		{ value: 'thisWeek', label: 'This Week' },
		{ value: 'month', label: 'This Month' },
		{ value: 'custom', label: 'Custom Range' }
	];

	function updateDateRange() {
		const today = new Date();
		console.log('updateDateRange called with selectedRange:', selectedRange);
		
		switch (selectedRange) {
			case 'today':
				startDate = endDate = today.toISOString().split('T')[0];
				customRange = false;
				break;
			case 'week':
				const weekAgo = new Date(today);
				weekAgo.setDate(today.getDate() - 6);
				startDate = weekAgo.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
				customRange = false;
				break;
			case 'thisWeek':
				const monday = new Date(today);
				monday.setDate(today.getDate() - today.getDay() + 1);
				startDate = monday.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
				customRange = false;
				break;
			case 'month':
				const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
				startDate = monthStart.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
				customRange = false;
				break;
			case 'custom':
				customRange = true;
				if (!startDate) startDate = today.toISOString().split('T')[0];
				if (!endDate) endDate = today.toISOString().split('T')[0];
				break;
		}
		
		console.log('Date range updated:', { startDate, endDate, customRange });
		
		// Load data when date range changes (with cache invalidation)
		if (startDate && endDate) {
			// Clear cache for this date range to force refresh
			cacheActions.invalidateFuelData(startDate, endDate);
			cacheActions.invalidateTankData(endDate);
			loadReconciliationData();
		}
	}

	onMount(() => {
		updateDateRange();
		loadReconciliationHistory();
	});

	function handlePresetChange() {
		console.log('handlePresetChange called');
		updateDateRange();
	}

	function handleCustomDateChange() {
		console.log('handleCustomDateChange called', { startDate, endDate });
		if (selectedRange === 'custom' && startDate && endDate) {
			// Clear cache and reload data for custom dates
			cacheActions.invalidateFuelData(startDate, endDate);
			cacheActions.invalidateTankData(endDate);
			loadReconciliationData();
		}
	}

	async function loadReconciliationData() {
		if (!startDate || !endDate) return;
		
		const cacheKey = `${startDate}_${endDate}`;
		
		// Check cache first
		const cachedFuelData = cacheActions.getFuelData(startDate, endDate);
		const cachedTankData = cacheActions.getTankData(endDate);
		
		if (cachedFuelData && cachedTankData) {
			// Use cached data
			fuelData = cachedFuelData;
			tankData = cachedTankData;
			loading = false;
			return;
		}
		
		// Prevent duplicate loading
		if (cacheActions.isLoading(cacheKey)) {
			return;
		}
		
		loading = true;
		error = '';
		cacheActions.setLoading(cacheKey, true);
		
		try {
			await supabaseService.init();
			
			// Load fuel reconciliation data if not cached
			if (!cachedFuelData) {
				const fuelResult = await supabaseService.getDateRangeReconciliationData(startDate, endDate);
				if (fuelResult.error) {
					error = fuelResult.error;
				} else {
					fuelData = fuelResult.data;
					cacheActions.setFuelData(startDate, endDate, fuelResult.data);
				}
			} else {
				fuelData = cachedFuelData;
			}
			
			// Load tank data if not cached
			if (!cachedTankData) {
				const tankResult = await supabaseService.getTankReconciliationData(endDate);
				if (tankResult.error && !error) {
					error = tankResult.error;
				} else {
					tankData = tankResult.data;
					cacheActions.setTankData(endDate, tankResult.data);
				}
			} else {
				tankData = cachedTankData;
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load reconciliation data';
		}
		
		loading = false;
		cacheActions.setLoading(cacheKey, false);
	}

	async function performFuelReconciliation() {
		if (!fuelData || submitting) return;
		
		submitting = true;
		error = '';
		
		try {
			await supabaseService.init();
			
			const result = await supabaseService.createFuelReconciliation({
				startDate,
				endDate,
				fuelDispensed: fuelData.fuelDispensed,
				bowserStart: fuelData.bowserStart,
				bowserEnd: fuelData.bowserEnd
			});

			if (result.error) {
				error = result.error;
			} else {
				// Reload data to show updated status
				await loadReconciliationData();
				await loadReconciliationHistory();
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to perform fuel reconciliation';
		}
		
		submitting = false;
	}

	async function performTankReconciliation() {
		if (!tankData || submitting) return;
		
		submitting = true;
		error = '';
		
		try {
			await supabaseService.init();
			
			const result = await supabaseService.createTankReconciliation({
				reconciliationDate: endDate,
				calculatedLevel: tankData.tankCalculated,
				measuredLevel: tankData.tankMeasured,
				notes: `Reconciliation for ${startDate} to ${endDate}`
			});

			if (result.error) {
				error = result.error;
			} else {
				// Reload data to show updated status
				await loadReconciliationData();
				await loadReconciliationHistory();
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to perform tank reconciliation';
		}
		
		submitting = false;
	}

	function formatNumber(num) {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
	}

	function getVarianceClass(variance, threshold = 1) {
		const abs = Math.abs(variance || 0);
		if (abs <= threshold) return 'good';
		if (abs <= threshold * 3) return 'warning';
		return 'alert';
	}

	function getTankVarianceClass(percentage) {
		const abs = Math.abs(percentage || 0);
		if (abs <= 2) return 'good';
		if (abs <= 5) return 'warning';
		return 'alert';
	}

	function getConfidenceScore(variance, type = 'fuel') {
		if (type === 'fuel') {
			const abs = Math.abs(variance || 0);
			if (abs <= 1) return { score: 95, label: 'Very High' };
			if (abs <= 3) return { score: 80, label: 'High' };
			if (abs <= 10) return { score: 60, label: 'Medium' };
			return { score: 30, label: 'Low' };
		} else {
			// Tank confidence based on percentage variance
			const abs = Math.abs(variance || 0);
			if (abs <= 2) return { score: 95, label: 'Very High' };
			if (abs <= 5) return { score: 75, label: 'High' };
			if (abs <= 10) return { score: 50, label: 'Medium' };
			return { score: 25, label: 'Low' };
		}
	}

	function getConfidenceClass(score) {
		if (score >= 90) return 'confidence-very-high';
		if (score >= 75) return 'confidence-high';
		if (score >= 50) return 'confidence-medium';
		return 'confidence-low';
	}

	async function loadReconciliationHistory() {
		historyLoading = true;
		error = '';
		
		try {
			await supabaseService.init();
			const result = await supabaseService.getReconciliationHistory(50); // Get last 50 records
			
			if (result.error) {
				error = result.error;
			} else {
				reconciliationHistory = result.data || [];
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load reconciliation history';
		}
		
		historyLoading = false;
	}

	// Derived calculations
	const bowserDifference = $derived(fuelData ? fuelData.bowserEnd - fuelData.bowserStart : 0);
	const fuelVariance = $derived(fuelData ? fuelData.fuelDispensed - bowserDifference : 0);
	const tankVariance = $derived(tankData ? tankData.tankCalculated - tankData.tankMeasured : 0);
	const tankVariancePercentage = $derived(tankData ? (tankVariance / 24000 * 100) : 0);
	
	// Confidence scoring
	const fuelConfidence = $derived(getConfidenceScore(fuelVariance, 'fuel'));
	const tankConfidence = $derived(getConfidenceScore(tankVariancePercentage, 'tank'));
</script>

<svelte:head>
	<title>Reconciliations - FarmTrack</title>
</svelte:head>

<div class="reconciliation-container">
	<div class="header">
		<h1>Reconciliations</h1>
		<p>Fuel usage and tank level reconciliation with flexible date ranges</p>
	</div>

	<!-- Date Range Selector -->
	<div class="date-section">
		<h2>Date Range</h2>
		<div class="date-presets">
			{#each datePresets as preset}
				<button 
					class="preset-btn"
					class:active={selectedRange === preset.value}
					onclick={() => { selectedRange = preset.value; handlePresetChange(); }}
				>
					{preset.label}
				</button>
			{/each}
		</div>

		{#if customRange}
			<div class="custom-dates">
				<div class="date-input">
					<label for="start-date">Start Date</label>
					<input 
						id="start-date"
						type="date" 
						bind:value={startDate}
						onchange={handleCustomDateChange}
					/>
				</div>
				<div class="date-input">
					<label for="end-date">End Date</label>
					<input 
						id="end-date"
						type="date" 
						bind:value={endDate}
						onchange={handleCustomDateChange}
					/>
				</div>
			</div>
		{/if}

		<div class="selected-range">
			<strong>Selected Period:</strong> 
			{startDate} {startDate !== endDate ? `to ${endDate}` : ''}
		</div>
	</div>

	{#if error}
		<div class="error-message">
			<span class="error-icon">⚠️</span>
			<span>{error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="loading">Loading reconciliation data...</div>
	{/if}

	<!-- Reconciliation Sections -->
	<div class="reconciliation-sections">
		<!-- Fuel Reconciliation -->
		<div class="reconciliation-card">
			<div class="card-header">
				<div class="header-content">
					<h3>Fuel Reconciliation</h3>
					<p>Compare fuel dispensed vs bowser readings</p>
				</div>
				{#if fuelData}
					<div class="status-badge {getVarianceClass(fuelVariance)}">
						{#if Math.abs(fuelVariance) <= 1}
							Good
						{:else if Math.abs(fuelVariance) <= 3}
							Minor Variance
						{:else}
							High Variance
						{/if}
					</div>
				{/if}
			</div>
			<div class="card-content">
				<div class="metrics-preview">
					<div class="metric">
						<span class="metric-label">Fuel Dispensed</span>
						<span class="metric-value">{formatNumber(fuelData?.fuelDispensed)}L</span>
					</div>
					<div class="metric">
						<span class="metric-label">Bowser Difference</span>
						<span class="metric-value">{formatNumber(bowserDifference)}L</span>
					</div>
					<div class="metric">
						<span class="metric-label">Variance</span>
						<span class="metric-value variance {getVarianceClass(fuelVariance)}">
							{Math.abs(fuelVariance) < 0.1 ? '0' : (fuelVariance >= 0 ? '+' : '') + fuelVariance.toFixed(1)}L
						</span>
					</div>
					<div class="metric">
						<span class="metric-label">Confidence</span>
						<span class="metric-value confidence {getConfidenceClass(fuelConfidence.score)}">
							{fuelConfidence.label} ({fuelConfidence.score}%)
						</span>
					</div>
				</div>
				{#if fuelData?.bowserStart !== undefined && fuelData?.bowserEnd !== undefined}
					<div class="details">
						<span class="details-text">Bowser: {formatNumber(fuelData.bowserStart)}L → {formatNumber(fuelData.bowserEnd)}L</span>
					</div>
				{/if}
				<div class="reconcile-actions">
					<Button 
						variant="primary" 
						onclick={performFuelReconciliation}
						disabled={submitting || !fuelData}
					>
						{submitting ? 'Processing...' : 'Reconcile Fuel Usage'}
					</Button>
					<Button 
						variant="outline" 
						onclick={() => {
							console.log('Edit Entries clicked');
							showFuelEditor = true;
						}}
						disabled={!startDate || !endDate}
					>
						Edit Entries
					</Button>
					<Button 
						variant="outline" 
						onclick={() => {
							console.log('Generate Report clicked');
							showReporting = true;
						}}
						disabled={!startDate || !endDate}
					>
						Generate Report
					</Button>
				</div>
			</div>
		</div>

		<!-- Tank Reconciliation -->
		<div class="reconciliation-card">
			<div class="card-header">
				<div class="header-content">
					<h3>Tank Reconciliation</h3>
					<p>Compare tank levels vs dipstick readings</p>
				</div>
				{#if tankData}
					<div class="status-badge {getTankVarianceClass(tankVariancePercentage)}">
						{#if Math.abs(tankVariancePercentage) <= 2}
							Good
						{:else if Math.abs(tankVariancePercentage) <= 5}
							Acceptable
						{:else}
							High Variance
						{/if}
					</div>
				{/if}
			</div>
			<div class="card-content">
				<div class="metrics-preview">
					<div class="metric">
						<span class="metric-label">Calculated Level</span>
						<span class="metric-value">{formatNumber(tankData?.tankCalculated)}L</span>
					</div>
					<div class="metric">
						<span class="metric-label">Measured Level</span>
						<span class="metric-value">{formatNumber(tankData?.tankMeasured)}L</span>
					</div>
					<div class="metric">
						<span class="metric-label">Variance</span>
						<span class="metric-value variance {getTankVarianceClass(tankVariancePercentage)}">
							{Math.abs(tankVariancePercentage) < 0.1 ? '0' : (tankVariancePercentage >= 0 ? '+' : '') + tankVariancePercentage.toFixed(1)}%
						</span>
					</div>
					<div class="metric">
						<span class="metric-label">Confidence</span>
						<span class="metric-value confidence {getConfidenceClass(tankConfidence.score)}">
							{tankConfidence.label} ({tankConfidence.score}%)
						</span>
					</div>
				</div>
				{#if tankData}
					<div class="details">
						<span class="details-text">Difference: {Math.abs(tankVariance) < 0.1 ? '0' : (tankVariance >= 0 ? '+' : '') + tankVariance.toFixed(1)}L of 24,000L capacity</span>
					</div>
				{/if}
				<div class="reconcile-actions">
					<Button 
						variant="secondary" 
						onclick={performTankReconciliation}
						disabled={submitting || !tankData}
					>
						{submitting ? 'Processing...' : 'Reconcile Tank Levels'}
					</Button>
					<Button 
						variant="outline" 
						onclick={() => showTankEditor = true}
						disabled={!endDate}
					>
						Adjust Levels
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Reconciliation History -->
	<div class="history-section">
		<div class="section-header">
			<h2>Reconciliation History</h2>
			<Button variant="outline" size="sm" onclick={loadReconciliationHistory} disabled={historyLoading}>
				{historyLoading ? 'Loading...' : 'Refresh'}
			</Button>
		</div>
		
		{#if historyLoading}
			<div class="loading">Loading reconciliation history...</div>
		{:else if reconciliationHistory.length > 0}
			<div class="history-list">
				{#each reconciliationHistory as record}
					<div class="history-item">
						<div class="history-header">
							<div class="history-info">
								<h3 class="history-title">
									{record.type === 'fuel' ? 'Fuel Reconciliation' : 'Tank Reconciliation'}
								</h3>
								<p class="history-date">
									{new Date(record.date).toLocaleDateString('en-ZA')}
									{#if record.start_date && record.end_date}
										({record.start_date} to {record.end_date})
									{/if}
								</p>
							</div>
							<div class="history-status status-{record.status}">
								{record.status.toUpperCase()}
							</div>
						</div>
						
						<div class="history-details">
							{#if record.type === 'fuel'}
								<div class="detail-item">
									<span class="detail-label">Fuel Dispensed:</span>
									<span class="detail-value">{formatNumber(record.fuel_dispensed)}L</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Fuel Received:</span>
									<span class="detail-value">{formatNumber(record.fuel_received)}L</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Variance:</span>
									<span class="detail-value variance {getVarianceClass(Math.abs(record.fuel_dispensed - record.fuel_received))}">
										{Math.abs(record.fuel_dispensed - record.fuel_received) < 0.1 ? '0' : 
										(record.fuel_dispensed - record.fuel_received >= 0 ? '+' : '') + 
										(record.fuel_dispensed - record.fuel_received).toFixed(1)}L
									</span>
								</div>
							{:else}
								<div class="detail-item">
									<span class="detail-label">Calculated Level:</span>
									<span class="detail-value">{formatNumber(record.calculated_level)}L</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Measured Level:</span>
									<span class="detail-value">{formatNumber(record.measured_level)}L</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Variance:</span>
									<span class="detail-value variance {getTankVarianceClass(Math.abs((record.calculated_level - record.measured_level) / 24000 * 100))}">
										{Math.abs((record.calculated_level - record.measured_level) / 24000 * 100) < 0.1 ? '0' : 
										((record.calculated_level - record.measured_level) >= 0 ? '+' : '') + 
										((record.calculated_level - record.measured_level) / 24000 * 100).toFixed(1)}%
									</span>
								</div>
							{/if}
						</div>
						
						{#if record.notes}
							<div class="history-notes">
								<span class="notes-label">Notes:</span>
								<span class="notes-text">{record.notes}</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="history-placeholder">
				<p>No reconciliation history found</p>
			</div>
		{/if}
	</div>
	
	<!-- Inline Fuel Entry Editor Modal -->
	{#if showFuelEditor}
		<InlineFuelEditor 
			{startDate}
			{endDate}
			onclose={() => showFuelEditor = false}
			onupdated={() => {
				loadReconciliationData();
				loadReconciliationHistory();
			}}
		/>
	{/if}
	
	<!-- Tank Level Adjustment Modal -->
	{#if showTankEditor}
		<TankLevelAdjustment
			date={endDate}
			onclose={() => showTankEditor = false}
			onupdated={() => {
				loadReconciliationData();
				loadReconciliationHistory();
			}}
		/>
	{/if}

	<!-- Advanced Reporting Modal -->
	{#if showReporting}
		<ReportingFramework
			{startDate}
			{endDate}
			onclose={() => showReporting = false}
		/>
	{/if}
</div>

<style>
	.reconciliation-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
	}

	.header p {
		margin: 0.5rem 0 0;
		color: #6b7280;
		font-size: 1rem;
	}

	.date-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.date-section h2 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.date-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.preset-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: white;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.preset-btn:hover {
		border-color: #f97316;
		color: #f97316;
	}

	.preset-btn.active {
		background: #f97316;
		border-color: #f97316;
		color: white;
	}

	.custom-dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.date-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.date-input label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.date-input input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.selected-range {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #374151;
	}

	.reconciliation-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.reconciliation-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
	}

	.card-header {
		padding: 1.5rem 1.5rem 1rem;
		border-bottom: 1px solid #f3f4f6;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-content {
		flex: 1;
	}

	.card-header h3 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.card-header p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-badge.good {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.warning {
		background: #fef3c7;
		color: #92400e;
	}

	.status-badge.alert {
		background: #fee2e2;
		color: #991b1b;
	}

	.card-content {
		padding: 1rem 1.5rem 1.5rem;
	}

	.metrics-preview {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.metric {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.metric:last-child {
		border-bottom: none;
	}

	.metric-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.metric-value {
		font-weight: 600;
		color: #111827;
	}

	.reconcile-btn {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.reconcile-btn.fuel {
		background: #3b82f6;
		color: white;
	}

	.reconcile-btn.fuel:hover {
		background: #2563eb;
	}

	.reconcile-btn.tank {
		background: #10b981;
		color: white;
	}

	.reconcile-btn.tank:hover {
		background: #059669;
	}

	.reconcile-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}


	.variance.good {
		color: #166534;
	}

	.variance.warning {
		color: #92400e;
	}

	.variance.alert {
		color: #991b1b;
	}

	.confidence.confidence-very-high {
		color: #166534;
	}

	.confidence.confidence-high {
		color: #059669;
	}

	.confidence.confidence-medium {
		color: #d97706;
	}

	.confidence.confidence-low {
		color: #dc2626;
	}

	.details {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
	}

	.details-text {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
		font-style: italic;
	}

	.history-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.history-section .section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.history-section h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.history-item {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		background: #f9fafb;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.history-info {
		flex: 1;
	}

	.history-title {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.history-date {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.history-status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.history-status.status-reconciled {
		background: #dcfce7;
		color: #166534;
	}

	.history-status.status-discrepancy {
		background: #fee2e2;
		color: #991b1b;
	}

	.history-status.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.history-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
	}

	.detail-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.detail-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.history-notes {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
		font-size: 0.875rem;
	}

	.notes-label {
		font-weight: 600;
		color: #111827;
		margin-right: 0.5rem;
	}

	.notes-text {
		color: #6b7280;
	}

	.history-placeholder {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.custom-dates {
			grid-template-columns: 1fr;
		}
		
		.reconciliation-sections {
			grid-template-columns: 1fr;
		}
		
		.date-presets {
			flex-direction: column;
		}
		
		.header h1 {
			font-size: 1.5rem;
		}
		
		.history-section .section-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.history-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}
		
		.history-status {
			align-self: flex-start;
		}
		
		.history-details {
			grid-template-columns: 1fr;
		}
		
		.reconcile-actions {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>