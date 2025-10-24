<script lang="ts">
	import type { Vehicle } from '$lib/types';
	
	interface Props {
		selectedVehicle: Vehicle | null;
		odometerStart: number | null;
		odometerEnd: number | null;
		gaugeWorking: boolean;
		onOdometerUpdate: (start: number | null, end: number | null, gaugeWorking: boolean) => void;
		errors: string[];
		canProceedToNext?: boolean;
		onNext?: () => void;
	}
	
	let { selectedVehicle, odometerStart, odometerEnd, gaugeWorking, onOdometerUpdate, errors, canProceedToNext = false, onNext }: Props = $props();
	
	// Current odometer display - auto-filled but editable
	let currentOdo = $state(
		selectedVehicle?.current_odometer?.toString() || ''
	);
	let isEditingCurrentOdo = $state(false);
	let originalCurrentOdo = $state(selectedVehicle?.current_odometer || 0);
	
	// New odometer reading - the main input
	let newOdo = $state(odometerEnd?.toString() || '');
	let isBrokenGauge = $state(false); // Default to working
	
	// Reset function to restore original current odometer reading
	function resetCurrentOdo() {
		if (selectedVehicle) {
			currentOdo = selectedVehicle.current_odometer?.toString() || '';
			originalCurrentOdo = selectedVehicle.current_odometer || 0;
			isEditingCurrentOdo = false;
		}
	}
	
	// Update original reading when vehicle changes
	$effect(() => {
		if (selectedVehicle) {
			originalCurrentOdo = selectedVehicle.current_odometer || 0;
			if (!isEditingCurrentOdo) {
				currentOdo = selectedVehicle.current_odometer?.toString() || '';
			}
		}
	});
	
	// Derived state for distance calculation
	let distance = $derived.by(() => {
		if (isBrokenGauge) {
			return null;
		}
		const current = parseFloat(currentOdo);
		const newReading = parseFloat(newOdo);
		if (isNaN(current) || isNaN(newReading)) {
			return null;
		}
		return newReading - current;
	});

	// Helper function to update parent (called from event handlers, not effects)
	function updateParent() {
		const start = currentOdo ? parseFloat(currentOdo) : null;
		const end = isBrokenGauge ? start : (newOdo ? parseFloat(newOdo) : null);
		onOdometerUpdate(start, end, !isBrokenGauge);
	}

	// Number formatting function - spaces for thousands, period for decimal
	function formatNumber(num: number | null): string {
		if (num === null || num === undefined || isNaN(num)) return 'No reading';
		// Format with US locale to ensure period for decimal, then replace commas with spaces
		return new Intl.NumberFormat('en-US').format(num).replace(/,/g, ' ');
	}
</script>

<div class="odometer-reading">
	
	{#if selectedVehicle}
		<!-- Current ODO Display with Manual Override -->
		<div class="odo-section">
			<div class="odo-card current-odo">
				<div class="current-odo-controls">
					{#if isEditingCurrentOdo}
						<button class="odo-control-btn save-btn" onclick={() => isEditingCurrentOdo = false}>
							✓
						</button>
						<button class="odo-control-btn reset-btn" onclick={resetCurrentOdo} title="Reset to vehicle reading">
							🔄
						</button>
					{:else}
						<button class="odo-control-btn edit-btn" onclick={() => isEditingCurrentOdo = true} title="Manual override">
							✏️
						</button>
					{/if}
				</div>
				
				<input
					type="number"
					inputmode="decimal"
					step="0.1"
					bind:value={currentOdo}
					oninput={updateParent}
					placeholder="Old"
					class="current-odo-input"
					onfocus={(e) => e.target.select()}
					autocomplete="off"
					readonly={!isEditingCurrentOdo}
					onclick={() => !isEditingCurrentOdo && selectedVehicle && (isEditingCurrentOdo = true)}
				/>
			</div>
			
			{#if isEditingCurrentOdo && parseFloat(currentOdo) !== originalCurrentOdo}
				<div class="override-notice">Manual override active</div>
			{/if}
		</div>
		
		{#if !isBrokenGauge}
			<!-- Main ODO Input -->
			<div class="odo-section">
				<div class="odo-card new-odo">
					<input
						type="number"
						inputmode="decimal"
						step="0.1"
						bind:value={newOdo}
						oninput={updateParent}
						placeholder="New"
						class="new-odo-input"
						autocomplete="off"
						onfocus={(e) => e.target.select()}
					/>
				</div>
				
				<!-- Distance Display - below new input -->
				{#if distance && distance > 0}
					<div class="distance-stat">
						+{new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(distance).replace(/,/g, ' ')}
					</div>
				{/if}
			</div>
			
			<!-- Gauge Status Toggle - moved below new reading -->
			<div class="gauge-toggle">
				<label class="checkbox">
					<input type="checkbox" bind:checked={isBrokenGauge} onchange={updateParent} />
					<span>Broken Gauge</span>
				</label>
			</div>
		{:else}
			<div class="odo-not-working">
				Gauge broken - using previous reading, no distance recorded
			</div>
			
			<!-- Gauge Status Toggle -->
			<div class="gauge-toggle">
				<label class="checkbox">
					<input type="checkbox" bind:checked={isBrokenGauge} onchange={updateParent} />
					<span>Broken Gauge</span>
				</label>
			</div>
		{/if}
		
	{:else}
		<div class="no-vehicle">Select a vehicle first</div>
	{/if}
	
	<!-- Continue Button - Fixed Position -->
	{#if canProceedToNext && onNext}
		<button 
			class="continue-button-fixed"
			onclick={onNext}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
			</svg>
		</button>
	{/if}
</div>

<style>
	.odometer-reading {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.step-header {
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.step-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
		margin: 0;
	}


	/* Simplified ODO Cards */
	.odo-card {
		text-align: center;
		padding: 0;
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.current-odo {
		background: white;
		border: 3px solid #e2e8f0;
		border-radius: 0.75rem;
	}
	
	.current-odo:focus-within {
		border-color: #9ca3af;
		box-shadow: 0 0 0 4px rgba(156, 163, 175, 0.1);
	}
	
	/* Odo section styling */
	.odo-section {
		margin-bottom: 0;
	}
	
	.current-odo-controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		gap: 0.25rem;
		z-index: 10;
	}
	
	.current-odo {
		position: relative;
	}
	
	.current-odo-controls {
		display: flex;
		gap: 0.25rem;
	}
	
	.odo-control-btn {
		background: transparent;
		border: 1px solid #d1d5db;
		padding: 0.25rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 1.75rem;
		min-height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.odo-control-btn:hover {
		background: #f9fafb;
		border-color: #9ca3af;
		color: #374151;
	}
	
	.odo-control-btn.reset-btn {
		background: #fef3e2;
		border-color: #f59e0b;
		color: #d97706;
	}
	
	.odo-control-btn.save-btn {
		background: #f0f9ff;
		border-color: #3b82f6;
		color: #2563eb;
	}
	
	.current-odo-input {
		width: 100%;
		padding: 1.5rem;
		font-size: 2.5rem;
		font-weight: 600;
		text-align: center;
		border: none;
		background: transparent;
		color: var(--gray-500, #0f172a);
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		-webkit-appearance: none;
		appearance: none;
	}
	
	.current-odo-input:focus {
		outline: none;
		color: #374151;
	}
	
	.override-notice {
		font-size: 0.75rem;
		color: #d97706;
		background: #fef3e2;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-align: center;
		margin: 0.25rem;
	}

	.new-odo {
		background: white;
		border: 3px solid #2563eb;
		border-radius: 0.75rem;
	}
	
	.new-odo:focus-within {
		border-color: #1d4ed8;
		box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
	}

	

	
	/* Hide the actual input but keep it functional */
	.new-odo-input-hidden {
		position: absolute;
		left: -9999px;
		opacity: 0;
		pointer-events: none;
	}
	
	/* Make the display value clickable to focus the hidden input */
	.new-odo .odo-value {
		cursor: pointer;
	}
	
	.new-odo .odo-value:hover {
		background: rgba(37, 99, 235, 0.05);
	}

	.new-odo-input {
		width: 100%;
		padding: 1.5rem;
		font-size: 2.5rem;
		font-weight: 600;
		text-align: center;
		border: none;
		background: transparent;
		color: #1e293b;
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		-webkit-appearance: none;
		appearance: none;
	}

	.new-odo-input:focus {
		outline: none;
	}

	.new-odo-input::placeholder {
		color: #94a3b8;
		font-weight: 400;
	}

	/* Gauge Toggle */
	.gauge-toggle {
		padding: 0.75rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.checkbox input {
		width: 18px;
		height: 18px;
	}

	/* Distance Stat - minimal indicator below new input */
	.distance-stat {
		text-align: center;
		margin-top: 0.75rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: #059669;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-variant-numeric: tabular-nums;
	}

	/* States */
	.odo-not-working {
		text-align: center;
		padding: 2rem;
		background: #fef3c7;
		border: 1px solid #fbbf24;
		border-radius: 0.5rem;
		color: #92400e;
		font-weight: 500;
	}

	.no-vehicle {
		text-align: center;
		padding: 2rem;
		color: #64748b;
		font-size: 1rem;
	}

	/* Mobile Optimizations */
	@media (max-width: 768px) {
		.current-odo-input,
		.odo-value,
		.new-odo-input {
			font-size: 3rem;
		}

		.current-odo-input,
		.new-odo-input {
			padding: 2rem 1rem;
			min-height: 100px;
		}

		.odo-value {
			padding: 2rem 1rem;
		}

		/* Ensure number input triggers numeric keypad */
		.new-odo-input[type="number"] {
			-webkit-appearance: none;
			-moz-appearance: textfield;
		}
	}
	
	/* Continue Button - Fixed Position (mirroring back button style) */
	.continue-button-fixed {
		position: fixed;
		bottom: 5rem;
		right: 1rem;
		z-index: 200;
		width: 56px;
		height: 56px;
		border-radius: 28px;
		border: none;
		background: rgba(16, 185, 129, 0.95);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 6px 20px rgba(16, 185, 129, 0.25);
		backdrop-filter: blur(12px);
	}
	
	.continue-button-fixed:hover {
		background: rgba(5, 150, 105, 0.98);
		transform: scale(1.05);
		box-shadow: 0 8px 25px rgba(16, 185, 129, 0.35);
	}
</style>