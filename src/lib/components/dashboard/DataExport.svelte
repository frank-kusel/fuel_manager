<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import exportService from '$lib/services/export';
	import { PDFExportService } from '$lib/services/pdf-export';

	// Initialize date range with current month immediately
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	
	// State management
	let startDate = monthStart.toISOString().split('T')[0];
	let endDate = monthEnd.toISOString().split('T')[0];
	let isExporting = false;
	let exportError = '';
	let exportSuccess = false;
	
	// Monthly summary state
	let selectedYear = now.getFullYear();
	let selectedMonth = now.getMonth() + 1;
	let isExportingMonthly = false;
	let isExportingPDF = false;
	let monthlyExportError = '';
	let monthlyExportSuccess = false;
	let pdfExportError = '';
	let pdfExportSuccess = false;

	// Log initialization
	onMount(() => {
		console.log('DataExport initialized with dates:', { startDate, endDate });
	});

	async function handleExport() {
		console.log('Export button clicked', { startDate, endDate });
		
		if (!startDate || !endDate) {
			exportError = 'Please select both start and end dates';
			return;
		}

		if (new Date(startDate) > new Date(endDate)) {
			exportError = 'Start date must be before end date';
			return;
		}

		isExporting = true;
		exportError = '';
		exportSuccess = false;

		try {
			console.log('Starting export process...');
			
			// Import supabase service dynamically
			const { default: supabaseService } = await import('$lib/services/supabase');
			console.log('Supabase service imported');
			
			// Perform export
			const result = await exportService.exportToExcel(
				startDate, 
				endDate, 
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

			console.log('Export result:', result);

			if (result.success) {
				exportSuccess = true;
				setTimeout(() => {
					exportSuccess = false;
				}, 3000);
			} else {
				exportError = result.error || 'Export failed';
			}

		} catch (error) {
			console.error('Export error:', error);
			exportError = error instanceof Error ? error.message : 'Export failed';
		} finally {
			isExporting = false;
		}
	}

	async function handleMonthlySummaryExport() {
		console.log('Monthly summary export button clicked', { selectedYear, selectedMonth });
		
		isExportingMonthly = true;
		monthlyExportError = '';
		monthlyExportSuccess = false;

		try {
			console.log('Starting monthly summary export process...');
			
			// Import supabase service dynamically
			const { default: supabaseService } = await import('$lib/services/supabase');
			console.log('Supabase service imported for monthly summary');
			
			// Perform export
			const result = await exportService.exportMonthlySummary(
				selectedYear, 
				selectedMonth, 
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

			console.log('Monthly summary export result:', result);

			if (result.success) {
				monthlyExportSuccess = true;
				setTimeout(() => {
					monthlyExportSuccess = false;
				}, 3000);
			} else {
				monthlyExportError = result.error || 'Monthly summary export failed';
			}

		} catch (error) {
			console.error('Monthly summary export error:', error);
			monthlyExportError = error instanceof Error ? error.message : 'Monthly summary export failed';
		} finally {
			isExportingMonthly = false;
		}
	}

	function clearMessages() {
		exportError = '';
		exportSuccess = false;
	}
	
	async function handleMonthlySummaryPDFExport() {
		console.log('Monthly PDF export button clicked', { selectedYear, selectedMonth });
		
		isExportingPDF = true;
		pdfExportError = '';
		pdfExportSuccess = false;

		try {
			console.log('Starting enhanced PDF export with reconciliation data...');
			
			// Import supabase service dynamically
			const { default: supabaseService } = await import('$lib/services/supabase');
			
			// Use original export service with enhancements
			const result = await exportService.exportMonthlySummaryPDFWithReconciliation(
				selectedYear, 
				selectedMonth, 
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

			console.log('Enhanced PDF export result:', result);

			if (result.success) {
				pdfExportSuccess = true;
				setTimeout(() => {
					pdfExportSuccess = false;
				}, 3000);
			} else {
				pdfExportError = result.error || 'PDF export failed';
			}

		} catch (error) {
			console.error('Enhanced PDF export error:', error);
			pdfExportError = error instanceof Error ? error.message : 'PDF export failed';
		} finally {
			isExportingPDF = false;
		}
	}

	function clearMonthlyMessages() {
		monthlyExportError = '';
		monthlyExportSuccess = false;
		pdfExportError = '';
		pdfExportSuccess = false;
	}
</script>

<div class="history-card">
	<div class="history-header">
		<h4>Monthly Vehicle Summary</h4>
	</div>
		
		<div class="monthly-controls">
			<div class="month-inputs">
				<div class="month-field">
					<label for="export-year">Year</label>
					<select 
						id="export-year"
						bind:value={selectedYear}
						disabled={isExportingMonthly}
						on:change={clearMonthlyMessages}
					>
						{#each Array(5) as _, i}
							<option value={now.getFullYear() - i}>{now.getFullYear() - i}</option>
						{/each}
					</select>
				</div>
				
				<div class="month-field">
					<label for="export-month">Month</label>
					<select 
						id="export-month"
						bind:value={selectedMonth}
						disabled={isExportingMonthly}
						on:change={clearMonthlyMessages}
					>
						<option value={1}>January</option>
						<option value={2}>February</option>
						<option value={3}>March</option>
						<option value={4}>April</option>
						<option value={5}>May</option>
						<option value={6}>June</option>
						<option value={7}>July</option>
						<option value={8}>August</option>
						<option value={9}>September</option>
						<option value={10}>October</option>
						<option value={11}>November</option>
						<option value={12}>December</option>
					</select>
				</div>
			</div>

			<div class="monthly-actions">
				<div class="export-buttons-grid">
					<Button 
						variant="success"
						size="medium"
						loading={isExportingMonthly}
						disabled={isExportingMonthly || isExportingPDF}
						onclick={handleMonthlySummaryExport}
					>
						{#if isExportingMonthly}
							Generating...
						{:else}
							Excel
						{/if}
					</Button>
					
					<Button 
						variant="error"
						size="medium"
						loading={isExportingPDF}
						disabled={isExportingMonthly || isExportingPDF}
						onclick={handleMonthlySummaryPDFExport}
					>
						{#if isExportingPDF}
							Generating...
						{:else}
							PDF
						{/if}
					</Button>
				</div>
			</div>
		</div>

		<!-- Monthly Status messages -->
		{#if monthlyExportError}
			<div class="export-message error">
				<span class="message-icon">⚠️</span>
				<span class="message-text">{monthlyExportError}</span>
			</div>
		{/if}

		{#if pdfExportError}
			<div class="export-message error">
				<span class="message-icon">⚠️</span>
				<span class="message-text">{pdfExportError}</span>
			</div>
		{/if}

		{#if monthlyExportSuccess}
			<div class="export-message success">
				<span class="message-icon">✅</span>
				<span class="message-text">Excel file downloaded successfully!</span>
			</div>
		{/if}

		{#if pdfExportSuccess}
			<div class="export-message success">
				<span class="message-icon">✅</span>
				<span class="message-text">PDF report generated successfully!</span>
			</div>
		{/if}

	<div class="daily-export-section">
		<h4>Daily Capture Export</h4>
		<div class="export-controls">
			<div class="date-inputs">
				<div class="date-field">
					<label for="start-date">Start Date</label>
					<input 
						id="start-date"
						type="date" 
						bind:value={startDate}
						disabled={isExporting}
						on:change={clearMessages}
					/>
				</div>
				
				<div class="date-field">
					<label for="end-date">End Date</label>
					<input 
						id="end-date"
						type="date" 
						bind:value={endDate}
						disabled={isExporting}
						on:change={clearMessages}
					/>
				</div>
			</div>

			<div class="export-actions">
				<Button 
					variant="success"
					size="medium"
					loading={isExporting}
					disabled={!startDate || !endDate || isExporting}
					onclick={handleExport}
				>
					{#if isExporting}
						Generating...
					{:else}
						Export Excel
					{/if}
				</Button>
			</div>
		</div>

		<!-- Status messages -->
		{#if exportError}
			<div class="export-message error">
				<span class="message-icon">⚠️</span>
				<span class="message-text">{exportError}</span>
			</div>
		{/if}

		{#if exportSuccess}
			<div class="export-message success">
				<span class="message-icon">✅</span>
				<span class="message-text">Excel file downloaded successfully!</span>
			</div>
		{/if}
	</div>

</div>

<style>
	.history-card {
		background: var(--gray-100);
		border-radius: 8px;
		padding: 1rem;
		margin-top: 1rem;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.history-header h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0;
	}

	.export-description {
		color: var(--gray-600);
		font-size: 0.875rem;
	}

	.daily-export-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--gray-200);
	}

	.daily-export-section h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0 0 0.75rem 0;
	}

	.export-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.date-inputs {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.date-field {
		flex: 1;
		min-width: 140px;
	}

	.date-field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700);
		margin-bottom: 0.5rem;
	}

	.date-field input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		color: var(--gray-900);
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.date-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.date-field input:disabled {
		background: var(--gray-50);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.export-actions {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.export-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.export-message.error {
		background: var(--red-50);
		border: 1px solid var(--red-200);
		color: var(--red-800);
	}

	.export-message.success {
		background: var(--green-50);
		border: 1px solid var(--green-200);
		color: var(--green-800);
	}

	.message-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.export-info {
		border-top: 1px solid var(--gray-200);
		padding-top: 1rem;
		margin-top: 1rem;
	}


	.monthly-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.month-inputs {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.month-field {
		flex: 1;
		min-width: 150px;
	}

	.month-field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700);
		margin-bottom: 0.5rem;
	}

	.month-field select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		color: var(--gray-900);
		transition: border-color 0.2s ease;
	}

	.month-field select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
	}

	.month-field select:disabled {
		background: var(--gray-50);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.monthly-actions {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.export-buttons-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
		max-width: 300px;
	}


	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.history-card {
			padding: 0.75rem;
		}

		.date-inputs {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.date-field {
			min-width: 0;
			max-width: 100%;
		}

		.export-actions {
			justify-content: stretch;
		}

		.export-actions :global(.btn) {
			width: 100%;
		}

		.month-inputs {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
		}

		.month-field {
			min-width: unset;
		}

		.monthly-actions {
			justify-content: stretch;
		}

		.export-buttons-grid {
			grid-template-columns: 1fr 1fr;
			max-width: none;
		}

		.export-buttons-grid :global(.btn) {
			width: 100%;
		}
	}

	/* CSS variables fallbacks */
	:root {
		--gray-50: #f9fafb;
		--gray-200: #e5e7eb;
		--gray-300: #d1d5db;
		--gray-600: #4b5563;
		--gray-700: #374151;
		--gray-900: #111827;
		--red-50: #fef2f2;
		--red-200: #fecaca;
		--red-800: #991b1b;
		--green-50: #f0fdf4;
		--green-200: #bbf7d0;
		--green-800: #166534;
		--primary: #16a34a;
	}
</style>