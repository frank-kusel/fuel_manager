<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';

	// Props
	let { 
		date = '',
		onclose = () => {},
		onupdated = () => {}
	} = $props();

	// State
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let tankData = $state(null);
	let newCalculatedLevel = $state(0);
	let newMeasuredLevel = $state(0);
	let adjustmentNotes = $state('');

	// Adjustment helpers
	let showCalculatedAdjustment = $state(false);
	let showMeasuredAdjustment = $state(false);
	let calculatedAdjustmentType = $state('set');
	let calculatedAdjustmentValue = $state(0);
	let measuredAdjustmentType = $state('set');
	let measuredAdjustmentValue = $state(0);

	const adjustmentTypes = [
		{ value: 'set', label: 'Set to' },
		{ value: 'add', label: 'Add' },
		{ value: 'subtract', label: 'Subtract' }
	];

	onMount(async () => {
		await loadTankData();
	});

	async function loadTankData() {
		loading = true;
		error = '';
		
		try {
			await supabaseService.init();
			const result = await supabaseService.getTankDataForDate(date);
			
			if (result.error) {
				error = result.error;
			} else {
				tankData = result.data;
				newCalculatedLevel = tankData?.calculatedLevel || 0;
				newMeasuredLevel = tankData?.measuredLevel || 0;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tank data';
		}
		
		loading = false;
	}

	function applyCalculatedAdjustment() {
		const adjustment = parseFloat(calculatedAdjustmentValue);
		if (isNaN(adjustment)) return;
		
		switch (calculatedAdjustmentType) {
			case 'set':
				newCalculatedLevel = adjustment;
				break;
			case 'add':
				newCalculatedLevel = (tankData?.calculatedLevel || 0) + adjustment;
				break;
			case 'subtract':
				newCalculatedLevel = (tankData?.calculatedLevel || 0) - adjustment;
				break;
		}
		
		newCalculatedLevel = Math.max(0, Math.min(24000, newCalculatedLevel));
		showCalculatedAdjustment = false;
		calculatedAdjustmentValue = 0;
	}

	function applyMeasuredAdjustment() {
		const adjustment = parseFloat(measuredAdjustmentValue);
		if (isNaN(adjustment)) return;
		
		switch (measuredAdjustmentType) {
			case 'set':
				newMeasuredLevel = adjustment;
				break;
			case 'add':
				newMeasuredLevel = (tankData?.measuredLevel || 0) + adjustment;
				break;
			case 'subtract':
				newMeasuredLevel = (tankData?.measuredLevel || 0) - adjustment;
				break;
		}
		
		newMeasuredLevel = Math.max(0, Math.min(24000, newMeasuredLevel));
		showMeasuredAdjustment = false;
		measuredAdjustmentValue = 0;
	}

	async function saveTankAdjustments() {
		saving = true;
		error = '';
		
		try {
			await supabaseService.init();
			
			const adjustments = [];
			
			// Update calculated level if changed
			if (Math.abs(newCalculatedLevel - (tankData?.calculatedLevel || 0)) > 0.1) {
				const calcResult = await supabaseService.updateTankCalculatedLevel(date, newCalculatedLevel, adjustmentNotes);
				if (calcResult.error) {
					error = calcResult.error;
					saving = false;
					return;
				}
				adjustments.push(`Calculated level: ${tankData?.calculatedLevel || 0}L → ${newCalculatedLevel}L`);
			}
			
			// Update measured level if changed
			if (Math.abs(newMeasuredLevel - (tankData?.measuredLevel || 0)) > 0.1) {
				const measResult = await supabaseService.updateTankMeasuredLevel(date, newMeasuredLevel, adjustmentNotes);
				if (measResult.error) {
					error = measResult.error;
					saving = false;
					return;
				}
				adjustments.push(`Measured level: ${tankData?.measuredLevel || 0}L → ${newMeasuredLevel}L`);
			}
			
			if (adjustments.length > 0) {
				// Log the adjustment
				await supabaseService.createTankAdjustmentLog({
					date,
					adjustments: adjustments.join('; '),
					notes: adjustmentNotes,
					previousCalculated: tankData?.calculatedLevel || 0,
					newCalculated: newCalculatedLevel,
					previousMeasured: tankData?.measuredLevel || 0,
					newMeasured: newMeasuredLevel
				});
				
				onupdated();
				onclose();
			} else {
				error = 'No changes to save';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save tank adjustments';
		}
		
		saving = false;
	}

	function formatNumber(num) {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
	}

	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-ZA');
	}

	// Derived calculations
	const variance = $derived(newCalculatedLevel - newMeasuredLevel);
	const variancePercentage = $derived((variance / 24000) * 100);
	const hasChanges = $derived(
		Math.abs(newCalculatedLevel - (tankData?.calculatedLevel || 0)) > 0.1 ||
		Math.abs(newMeasuredLevel - (tankData?.measuredLevel || 0)) > 0.1
	);
</script>

<div class="tank-adjustment-overlay" onclick={onclose}>
	<div class="tank-adjustment-modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="header-content">
				<h2>Tank Level Adjustment</h2>
				<p>Date: {formatDate(date)}</p>
			</div>
			<Button variant="outline" size="sm" onclick={onclose}>Close</Button>
		</div>

		{#if error}
			<div class="error-message">
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}

		{#if loading}
			<div class="loading">Loading tank data...</div>
		{:else if tankData}
			<div class="modal-content">
				<!-- Current Values -->
				<div class="current-values">
					<h3>Current Values</h3>
					<div class="values-grid">
						<div class="value-item">
							<span class="value-label">Calculated Level:</span>
							<span class="value-amount">{formatNumber(tankData.calculatedLevel)}L</span>
						</div>
						<div class="value-item">
							<span class="value-label">Measured Level:</span>
							<span class="value-amount">{formatNumber(tankData.measuredLevel)}L</span>
						</div>
						<div class="value-item">
							<span class="value-label">Current Variance:</span>
							<span class="value-amount variance">{formatNumber(tankData.calculatedLevel - tankData.measuredLevel)}L</span>
						</div>
					</div>
				</div>

				<!-- Adjustment Controls -->
				<div class="adjustment-section">
					<h3>Adjustments</h3>
					
					<!-- Calculated Level Adjustment -->
					<div class="adjustment-group">
						<div class="adjustment-header">
							<label for="calculated-level">Calculated Level</label>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => showCalculatedAdjustment = !showCalculatedAdjustment}
							>
								Quick Adjust
							</Button>
						</div>
						<input 
							id="calculated-level"
							type="number" 
							step="0.1" 
							min="0" 
							max="24000"
							bind:value={newCalculatedLevel}
							class="level-input"
						/>
						
						{#if showCalculatedAdjustment}
							<div class="quick-adjust">
								<select bind:value={calculatedAdjustmentType} class="adjust-select">
									{#each adjustmentTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
								<input 
									type="number" 
									step="0.1" 
									bind:value={calculatedAdjustmentValue}
									class="adjust-input"
									placeholder="Amount"
								/>
								<Button variant="primary" size="sm" onclick={applyCalculatedAdjustment}>
									Apply
								</Button>
							</div>
						{/if}
					</div>

					<!-- Measured Level Adjustment -->
					<div class="adjustment-group">
						<div class="adjustment-header">
							<label for="measured-level">Measured Level</label>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => showMeasuredAdjustment = !showMeasuredAdjustment}
							>
								Quick Adjust
							</Button>
						</div>
						<input 
							id="measured-level"
							type="number" 
							step="0.1" 
							min="0" 
							max="24000"
							bind:value={newMeasuredLevel}
							class="level-input"
						/>
						
						{#if showMeasuredAdjustment}
							<div class="quick-adjust">
								<select bind:value={measuredAdjustmentType} class="adjust-select">
									{#each adjustmentTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
								<input 
									type="number" 
									step="0.1" 
									bind:value={measuredAdjustmentValue}
									class="adjust-input"
									placeholder="Amount"
								/>
								<Button variant="primary" size="sm" onclick={applyMeasuredAdjustment}>
									Apply
								</Button>
							</div>
						{/if}
					</div>

					<!-- Adjustment Notes -->
					<div class="adjustment-group">
						<label for="notes">Adjustment Notes</label>
						<textarea 
							id="notes"
							bind:value={adjustmentNotes}
							class="notes-textarea"
							rows="3"
							placeholder="Explain the reason for this adjustment..."
						></textarea>
					</div>
				</div>

				<!-- New Values Preview -->
				<div class="preview-section">
					<h3>Preview</h3>
					<div class="preview-grid">
						<div class="preview-item">
							<span class="preview-label">New Calculated Level:</span>
							<span class="preview-value">{formatNumber(newCalculatedLevel)}L</span>
						</div>
						<div class="preview-item">
							<span class="preview-label">New Measured Level:</span>
							<span class="preview-value">{formatNumber(newMeasuredLevel)}L</span>
						</div>
						<div class="preview-item">
							<span class="preview-label">New Variance:</span>
							<span class="preview-value variance-{Math.abs(variancePercentage) <= 2 ? 'good' : Math.abs(variancePercentage) <= 5 ? 'warning' : 'alert'}">
								{formatNumber(variance)}L ({variancePercentage >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%)
							</span>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="modal-actions">
					<Button variant="outline" onclick={onclose}>
						Cancel
					</Button>
					<Button 
						variant="primary" 
						onclick={saveTankAdjustments}
						disabled={saving || !hasChanges || !adjustmentNotes.trim()}
					>
						{saving ? 'Saving...' : 'Save Adjustments'}
					</Button>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>No tank data found for this date</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.tank-adjustment-overlay {
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

	.tank-adjustment-modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 600px;
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

	.loading, .empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
		font-style: italic;
	}

	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.current-values, .adjustment-section, .preview-section {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.current-values h3, .adjustment-section h3, .preview-section h3 {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.values-grid, .preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.value-item, .preview-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
	}

	.value-label, .preview-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.value-amount, .preview-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.variance {
		color: #d97706;
	}

	.variance-good {
		color: #166534;
	}

	.variance-warning {
		color: #d97706;
	}

	.variance-alert {
		color: #dc2626;
	}

	.adjustment-group {
		margin-bottom: 1rem;
	}

	.adjustment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.adjustment-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.level-input, .notes-textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.level-input:focus, .notes-textarea:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 1px #f97316;
	}

	.quick-adjust {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: white;
		border-radius: 4px;
	}

	.adjust-select, .adjust-input {
		padding: 0.375rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.adjust-input {
		max-width: 100px;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	@media (max-width: 768px) {
		.tank-adjustment-overlay {
			padding: 0;
		}
		
		.tank-adjustment-modal {
			border-radius: 0;
			max-height: 100vh;
		}
		
		.modal-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.values-grid, .preview-grid {
			grid-template-columns: 1fr;
		}
		
		.adjustment-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}
		
		.quick-adjust {
			grid-template-columns: 1fr;
		}
		
		.modal-actions {
			flex-direction: column;
		}
	}
</style>