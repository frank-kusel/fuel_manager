<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	// Initialize date range with current month immediately.
	// Format in LOCAL time — toISOString() is UTC and shifts the date back a
	// day for any timezone ahead of UTC (SAST included).
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const isoLocal = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	interface Props {
		selectedYear?: number;
		selectedMonth?: number;
	}

	let {
		selectedYear = $bindable(now.getFullYear()),
		selectedMonth = $bindable(now.getMonth() + 1)
	}: Props = $props();

	// State management
	let startDate = $state(isoLocal(monthStart));
	let endDate = $state(isoLocal(monthEnd));
	let isExporting = $state(false);
	let exportError = $state('');
	let exportSuccess = $state(false);

	// Claim summary state: whole calendar month, or any custom date range
	let claimMode = $state<'month' | 'range'>('month');
	let claimStart = $state(isoLocal(monthStart));
	let claimEnd = $state(isoLocal(now));
	let isExportingMonthly = $state(false);
	let isExportingPDF = $state(false);
	let monthlyExportError = $state('');
	let monthlyExportSuccess = $state(false);
	let pdfExportError = $state('');
	let pdfExportSuccess = $state(false);

	// The export service pulls in SheetJS + jsPDF (~1 MB); load it only when
	// an export button is actually clicked so the page chunk stays small.
	async function loadExportDeps() {
		const [{ default: exportService }, { default: supabaseService }] = await Promise.all([
			import('$lib/services/export'),
			import('$lib/services/supabase')
		]);
		return { exportService, supabaseService };
	}

	async function handleExport() {
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
			const { exportService, supabaseService } = await loadExportDeps();
			const result = await exportService.exportToExcel(
				startDate,
				endDate,
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

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

	function claimRange(): { start: string; end: string } | null {
		if (claimMode === 'month') {
			return {
				start: new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).toISOString().split('T')[0],
				end: new Date(Date.UTC(selectedYear, selectedMonth, 0)).toISOString().split('T')[0]
			};
		}
		if (!claimStart || !claimEnd || claimStart > claimEnd) return null;
		return { start: claimStart, end: claimEnd };
	}

	async function handleMonthlySummaryExport() {
		const range = claimRange();
		if (!range) {
			monthlyExportError = 'Pick a valid period: start date must not be after end date';
			return;
		}
		isExportingMonthly = true;
		monthlyExportError = '';
		monthlyExportSuccess = false;

		try {
			const { exportService, supabaseService } = await loadExportDeps();
			const result = await exportService.exportClaimSummary(
				range.start,
				range.end,
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

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
		const range = claimRange();
		if (!range) {
			pdfExportError = 'Pick a valid period: start date must not be after end date';
			return;
		}
		isExportingPDF = true;
		pdfExportError = '';
		pdfExportSuccess = false;

		try {
			const { exportService, supabaseService } = await loadExportDeps();
			const result = await exportService.exportClaimSummaryPDF(
				range.start,
				range.end,
				supabaseService,
				'KCT Farming (Pty) Ltd'
			);

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

<div class="export-panels">
	<section class="panel">
		<div class="panel-head">
			<div class="panel-icon" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg
				>
			</div>
			<div>
				<h4 class="panel-title">Vehicle claim summary</h4>
				<p class="panel-sub">Per-vehicle totals for a month or custom period, as Excel or a signed PDF</p>
			</div>
		</div>

		<div class="monthly-controls">
			<div class="mode-toggle" role="group" aria-label="Period type">
				<button
					type="button"
					class="mode-btn"
					class:active={claimMode === 'month'}
					disabled={isExportingMonthly || isExportingPDF}
					onclick={() => {
						claimMode = 'month';
						clearMonthlyMessages();
					}}
				>
					Month
				</button>
				<button
					type="button"
					class="mode-btn"
					class:active={claimMode === 'range'}
					disabled={isExportingMonthly || isExportingPDF}
					onclick={() => {
						claimMode = 'range';
						clearMonthlyMessages();
					}}
				>
					Custom period
				</button>
			</div>

			{#if claimMode === 'month'}
				<div class="month-inputs">
					<div class="month-field">
						<label for="export-year">Year</label>
						<select
							id="export-year"
							bind:value={selectedYear}
							disabled={isExportingMonthly}
							onchange={clearMonthlyMessages}
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
							onchange={clearMonthlyMessages}
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
			{:else}
				<div class="month-inputs">
					<div class="month-field">
						<label for="claim-start">From</label>
						<input
							id="claim-start"
							type="date"
							bind:value={claimStart}
							disabled={isExportingMonthly || isExportingPDF}
							onchange={clearMonthlyMessages}
						/>
					</div>

					<div class="month-field">
						<label for="claim-end">To</label>
						<input
							id="claim-end"
							type="date"
							bind:value={claimEnd}
							disabled={isExportingMonthly || isExportingPDF}
							onchange={clearMonthlyMessages}
						/>
					</div>
				</div>
			{/if}

			<div class="monthly-actions">
				<div class="export-buttons-grid">
					<Button
						variant="primary"
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
						variant="outline"
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
	</section>

	<section class="panel">
		<div class="panel-head">
			<div class="panel-icon" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline
						points="14 2 14 8 20 8"
					/><path d="M12 18v-6M9 15l3 3 3-3" /></svg
				>
			</div>
			<div>
				<h4 class="panel-title">Daily capture export</h4>
				<p class="panel-sub">Every entry in a date range, as Excel</p>
			</div>
		</div>
		<div class="export-controls">
			<div class="date-inputs">
				<div class="date-field">
					<label for="start-date">Start Date</label>
					<input
						id="start-date"
						type="date"
						bind:value={startDate}
						disabled={isExporting}
						onchange={clearMessages}
					/>
				</div>

				<div class="date-field">
					<label for="end-date">End Date</label>
					<input
						id="end-date"
						type="date"
						bind:value={endDate}
						disabled={isExporting}
						onchange={clearMessages}
					/>
				</div>
			</div>

			<div class="export-actions">
				<Button
					variant="primary"
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
	</section>
</div>

<style>
	.export-panels {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.875rem;
	}

	.panel-icon {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: #faf1f2;
		color: var(--brand-hover);
	}

	.panel-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.panel-title {
		font-size: var(--text-base);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
		margin: 0;
	}

	.panel-sub {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0.125rem 0 0;
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
		min-height: 2.75rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		background: white;
		color: var(--gray-900);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.date-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(142, 43, 52, 0.1);
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
		min-height: 2.75rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		background: white;
		color: var(--gray-900);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.month-field select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(142, 43, 52, 0.1);
	}

	.month-field select:disabled {
		background: var(--gray-50);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.month-field input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-base);
		background: white;
		color: var(--gray-900);
		box-sizing: border-box;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.month-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(142, 43, 52, 0.1);
	}

	.month-field input:disabled {
		background: var(--gray-50);
		color: var(--gray-500);
		cursor: not-allowed;
	}

	.mode-toggle {
		display: inline-flex;
		width: fit-content;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.mode-btn {
		font-size: var(--text-sm);
		font-weight: 500;
		padding: 0.45rem 0.9rem;
		background: white;
		border: none;
		color: var(--gray-600);
		cursor: pointer;
	}

	.mode-btn + .mode-btn {
		border-left: 1px solid var(--gray-300);
	}

	.mode-btn.active {
		background: var(--primary);
		color: white;
	}

	.mode-btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
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
		.panel {
			padding: 0.875rem;
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
</style>
