<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	
	// Tank configuration and status
	let tankStatus = $state({
		tank_name: 'Tank A',
		capacity: 5000,
		current_calculated_level: 0,
		last_dipstick_level: null,
		last_dipstick_date: null,
		variance: 0,
		variance_percentage: 0,
		tank_percentage: 0
	});
	
	// Form states
	let showDipstickForm = $state(false);
	let showRefillForm = $state(false);
	
	// Dipstick reading form
	let dipstickReading = $state('');
	let dipstickDate = $state(new Date().toISOString().split('T')[0]);
	let dipstickNotes = $state('');
	
	// Refill form
	let refillLitres = $state('');
	let refillSupplier = $state('');
	let refillDate = $state(new Date().toISOString().split('T')[0]);
	let refillInvoice = $state('');
	let refillCost = $state('');
	let refillNotes = $state('');
	
	// History data
	let recentReadings = $state([]);
	let recentRefills = $state([]);
	
	// Loading states
	let loading = $state(true);
	let submitting = $state(false);
	
	onMount(async () => {
		await loadTankData();
	});
	
	async function loadTankData() {
		loading = true;
		try {
			// Initialize Supabase first
			await supabaseService.init();
			
			// Get tank status
			const statusResult = await supabaseService.getTankStatus();
			if (statusResult.data) {
				tankStatus = statusResult.data;
			}
			
			// Get recent readings
			const readingsResult = await supabaseService.getTankReadings(5);
			if (readingsResult.data) {
				recentReadings = readingsResult.data;
			}
			
			// Get recent refills
			const refillsResult = await supabaseService.getTankRefills(5);
			if (refillsResult.data) {
				recentRefills = refillsResult.data;
			}
		} catch (error) {
			console.error('Failed to load tank data:', error);
			// For development: show user-friendly message since tables might not exist yet
			console.log('Note: Tank management tables may not be created yet. Please run the migration first.');
		}
		loading = false;
	}
	
	async function submitDipstickReading() {
		if (!dipstickReading) return;
		
		submitting = true;
		try {
			await supabaseService.init();
			const result = await supabaseService.addTankReading({
				reading_value: parseFloat(dipstickReading),
				reading_date: dipstickDate,
				notes: dipstickNotes || null
			});
			
			if (!result.error) {
				// Reset form
				dipstickReading = '';
				dipstickNotes = '';
				showDipstickForm = false;
				// Reload data
				await loadTankData();
			} else {
				alert('Failed to save reading: ' + result.error);
			}
		} catch (error) {
			alert('Failed to save reading');
		}
		submitting = false;
	}
	
	async function submitRefill() {
		if (!refillLitres) return;
		
		submitting = true;
		try {
			await supabaseService.init();
			const result = await supabaseService.addTankRefill({
				litres_added: parseFloat(refillLitres),
				supplier: refillSupplier || null,
				delivery_date: refillDate,
				invoice_number: refillInvoice || null,
				total_cost: refillCost ? parseFloat(refillCost) : null,
				notes: refillNotes || null
			});
			
			if (!result.error) {
				// Reset form
				refillLitres = '';
				refillSupplier = '';
				refillInvoice = '';
				refillCost = '';
				refillNotes = '';
				showRefillForm = false;
				// Reload data
				await loadTankData();
			} else {
				alert('Failed to save refill: ' + result.error);
			}
		} catch (error) {
			alert('Failed to save refill');
		}
		submitting = false;
	}
	
	function formatNumber(num) {
		return new Intl.NumberFormat().format(num);
	}
	
	function formatDate(date) {
		return new Date(date).toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
	
	function getVarianceClass(percentage) {
		const abs = Math.abs(percentage);
		if (abs < 2) return 'good';
		if (abs < 5) return 'warning';
		return 'alert';
	}
</script>

<div class="tank-management">
	
	{#if loading}
		<div class="loading">Loading tank data...</div>
	{:else}
		<!-- Recent History - Compact -->
		<div class="history-section">
			<div class="history-card">
				<div class="history-header">
					<h4>Recent Dipstick Readings</h4>
					<button class="header-btn" onclick={() => showDipstickForm = !showDipstickForm}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
						</svg>
						Reading
					</button>
				</div>
				{#if recentReadings.length > 0}
					<div class="compact-list">
						{#each recentReadings.slice(0, 3) as reading}
							<div class="compact-item">
								<span class="item-date">{formatDate(reading.reading_date)}</span>
								<span class="item-value">{formatNumber(reading.reading_value)}L</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state">No readings yet</div>
				{/if}
			</div>
			
			<div class="history-card">
				<div class="history-header">
					<h4>Recent Tank Refills</h4>
					<button class="header-btn" onclick={() => showRefillForm = !showRefillForm}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 6h18l-2 13H5L3 6z"/>
							<path d="m3 6-2-2"/>
							<path d="M7 10v4"/>
							<path d="M11 10v4"/>
							<path d="M15 10v4"/>
						</svg>
						Refill
					</button>
				</div>
				{#if recentRefills.length > 0}
					<div class="compact-list">
						{#each recentRefills.slice(0, 3) as refill}
							<div class="compact-item">
								<span class="item-date">{formatDate(refill.delivery_date)}</span>
								<span class="item-value refill">+{formatNumber(refill.litres_added)}L</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state">No refills yet</div>
				{/if}
			</div>
		</div>

		<!-- Quick Entry Forms -->
		{#if showDipstickForm}
			<Card>
				<h3>New Dipstick Reading</h3>
				<div class="form-grid">
					<div class="form-group">
						<label>Reading (Litres)</label>
						<input 
							type="number" 
							bind:value={dipstickReading}
							placeholder="Enter dipstick reading"
							step="0.1"
						/>
					</div>
					<div class="form-group">
						<label>Date</label>
						<input type="date" bind:value={dipstickDate} />
					</div>
					<div class="form-group full-width">
						<label>Notes (Optional)</label>
						<input 
							type="text" 
							bind:value={dipstickNotes}
							placeholder="Any observations"
						/>
					</div>
					<div class="form-actions">
						<Button 
							onclick={submitDipstickReading} 
							disabled={submitting || !dipstickReading}
						>
							Save Reading
						</Button>
						<Button 
							variant="secondary" 
							onclick={() => showDipstickForm = false}
						>
							Cancel
						</Button>
					</div>
				</div>
			</Card>
		{/if}
		
		{#if showRefillForm}
			<Card>
				<h3>New Tank Refill</h3>
				<div class="form-grid">
					<div class="form-group">
						<label>Litres Added</label>
						<input 
							type="number" 
							bind:value={refillLitres}
							placeholder="Enter litres"
							step="0.1"
						/>
					</div>
					<div class="form-group">
						<label>Supplier</label>
						<input 
							type="text" 
							bind:value={refillSupplier}
							placeholder="Supplier name"
						/>
					</div>
					<div class="form-group">
						<label>Delivery Date</label>
						<input type="date" bind:value={refillDate} />
					</div>
					<div class="form-group">
						<label>Invoice Number</label>
						<input 
							type="text" 
							bind:value={refillInvoice}
							placeholder="Invoice #"
						/>
					</div>
					<div class="form-group">
						<label>Total Cost</label>
						<input 
							type="number" 
							bind:value={refillCost}
							placeholder="R 0.00"
							step="0.01"
						/>
					</div>
					<div class="form-group">
						<label>Notes</label>
						<input 
							type="text" 
							bind:value={refillNotes}
							placeholder="Optional notes"
						/>
					</div>
					<div class="form-actions full-width">
						<Button 
							onclick={submitRefill} 
							disabled={submitting || !refillLitres}
						>
							Save Refill
						</Button>
						<Button 
							variant="secondary" 
							onclick={() => showRefillForm = false}
						>
							Cancel
						</Button>
					</div>
				</div>
			</Card>
		{/if}
	{/if}
</div>

<style>
	.tank-management {
		margin-bottom: 2rem;
	}

	.tank-status-content {
		background: var(--primary-light);
		border-radius: 8px;
		padding: 1rem;
	}

	.tank-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.75rem;
	}

	.tank-header h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.level-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
		font-family: inherit; /* Use same font as rest of card */
	}

	.unit {
		font-size: 1rem;
		font-weight: 500;
		color: #6b7280;
		margin-left: 0.25rem;
	}


	.tank-bar {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.tank-fill {
		height: 100%;
		background: linear-gradient(90deg, #10b981, #059669);
		transition: width 0.5s ease;
	}

	/* Variance Compact */
	.variance-compact {
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		border-left: 3px solid;
		margin-bottom: 0.75rem;
	}

	.variance-compact.good {
		border-left-color: #10b981;
		background: #f0fdf4;
	}

	.variance-compact.warning {
		border-left-color: #f59e0b;
		background: #fffbeb;
	}

	.variance-compact.alert {
		border-left-color: #ef4444;
		background: #fef2f2;
	}

	.variance-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.dipstick-value {
		font-size: 0.75rem;
		color: #374151;
		font-weight: 500;
	}

	.variance-amount {
		font-size: 0.75rem;
		font-weight: 600;
		font-family: inherit; /* Use same font as rest of card */
	}

	.variance-compact.good .variance-amount {
		color: #059669;
	}

	.variance-compact.warning .variance-amount {
		color: #d97706;
	}

	.variance-compact.alert .variance-amount {
		color: #dc2626;
	}

	.variance-date {
		font-size: 0.625rem;
		color: #9ca3af;
	}

	/* No Dipstick Compact */
	.no-dipstick-compact {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f1f5f9;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
	}

	.no-dipstick-text {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
	}

	.no-dipstick-prompt {
		font-size: 0.625rem;
		color: #94a3b8;
	}

	.tank-actions {
		display: flex;
	}
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		gap: 1rem;
	}
	
	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
		flex: 1;
	}
	
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	
	.action-btn {
		background: white;
		border: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.action-btn:hover {
		background: #f9fafb;
		border-color: #f97316;
		color: #f97316;
	}
	
	.action-btn:active {
		background: #fef3e2;
	}
	
	.tank-overview {
		margin-bottom: 1.5rem;
	}
	
	/* Forms */
	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.form-group.full-width {
		grid-column: span 2;
	}
	
	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}
	
	.form-group input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}
	
	.form-group input:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
	}
	
	.form-actions {
		grid-column: span 2;
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
	
	/* History - Compact Design */
	.history-section {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.history-card {
		background: var(--gray-100);
		border-radius: 8px;
		padding: 1rem;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.history-header h4 {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.header-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: #f97316;
		color: white;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.header-btn:hover {
		background: #ea580c;
		transform: translateY(-1px);
	}

	.header-btn svg {
		width: 14px;
		height: 14px;
	}

	.compact-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.compact-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
		border-bottom: 1px solid #e2e8f0;
	}

	.compact-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.item-date {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
	}

	.item-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		font-family: inherit; /* Use same font as rest of card */
	}

	.item-value.refill {
		color: #059669;
	}

	.empty-state {
		color: #94a3b8;
		font-size: 0.75rem;
		text-align: center;
		padding: 1rem 0;
		font-style: italic;
	}
	
	.loading {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}
	
	/* Mobile */
	@media (max-width: 768px) {
		.tank-management {
			margin-bottom: 1.5rem;
		}
		
		.tank-status-content {
			padding: 0.75rem;
		}

		.tank-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 0.5rem;
			margin-bottom: 0.75rem;
		}
		
		.level-value {
			font-size: 1.5rem;
		}
		
		.tank-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
			width: 100%;
		}
		
		.action-btn {
			padding: 0.75rem;
			text-align: center;
			justify-content: center;
			border-radius: 0.5rem;
		}
		
		.tank-overview {
			margin-bottom: 1rem;
		}
		
		.status-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		
		.status-item {
			text-align: center;
			padding: 1rem;
			background: #fafbfc;
			border-radius: 0.5rem;
		}
		
		.form-grid {
			grid-template-columns: 1fr;
		}
		
		.form-group.full-width {
			grid-column: span 1;
		}
		
		.form-actions {
			grid-column: span 1;
		}
		
		.history-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.history-card {
			padding: 0.75rem;
		}
		
		.compact-item {
			padding: 0.25rem 0;
		}

		.item-date {
			font-size: 0.7rem;
		}

		.item-value {
			font-size: 0.8rem;
		}
	}
</style>