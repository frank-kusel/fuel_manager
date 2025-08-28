<script lang="ts">
	import type { Vehicle } from '$lib/types';
	
	interface Props {
		selectedVehicle: Vehicle | null;
		odometerStart: number | null;
		odometerEnd: number | null;
		gaugeWorking: boolean;
		onOdometerUpdate: (start: number | null, end: number | null, gaugeWorking: boolean) => void;
		errors: string[];
	}
	
	let { selectedVehicle, odometerStart, odometerEnd, gaugeWorking, onOdometerUpdate, errors }: Props = $props();
	
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
	
	// Update parent when values change
	$effect(() => {
		const start = currentOdo ? parseFloat(currentOdo) : null;
		const end = isBrokenGauge ? start : (newOdo ? parseFloat(newOdo) : null);
		onOdometerUpdate(start, end, !isBrokenGauge);
	});
	
	// Distance calculation
	let distance = $state(null);
	
	// Update distance when values change
	$effect(() => {
		if (isBrokenGauge) {
			distance = null;
		} else {
			const current = parseFloat(currentOdo);
			const newReading = parseFloat(newOdo);
			if (isNaN(current) || isNaN(newReading)) {
				distance = null;
			} else {
				distance = newReading - current;
			}
		}
	});
</script>

<div class="odometer-reading">
	
	{#if selectedVehicle}
		<!-- Current ODO Display with Manual Override -->
		<div class="odo-card current-odo">
			<div class="current-odo-header">
				<div class="odo-label">Current</div>
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
			</div>
			
			{#if isEditingCurrentOdo}
				<input 
					type="number" 
					inputmode="numeric" 
					pattern="[0-9]*" 
					bind:value={currentOdo}
					placeholder="Enter current reading"
					class="current-odo-input"
					onfocus={(e) => e.target.select()}
					autocomplete="off"
				/>
			{:else}
				<div class="odo-value" class:editable={selectedVehicle} onclick={() => selectedVehicle && (isEditingCurrentOdo = true)}>
					{currentOdo || 'No reading'}
				</div>
			{/if}
			
			{#if isEditingCurrentOdo && parseFloat(currentOdo) !== originalCurrentOdo}
				<div class="override-notice">Manual override active</div>
			{/if}
		</div>
		
		{#if !isBrokenGauge}
			<!-- Main ODO Input -->
			<div class="odo-card new-odo">
				<input 
					type="number" 
					inputmode="numeric" 
					pattern="[0-9]*" 
					bind:value={newOdo}
					placeholder="_"
					class="new-odo-input"
					autocomplete="off"
				/>
				<div class="odo-label">New</div>
			</div>
			
			<!-- Distance Display -->
			{#if distance && distance > 0}
				<div class="distance-display">
					<span class="distance-value">{new Intl.NumberFormat().format(distance)} {selectedVehicle?.odometer_unit || 'km/hr'}</span>
					<span class="distance-label">Distance or time</span>
				</div>
			{/if}
			
			<!-- Gauge Status Toggle - moved below new reading -->
			<div class="gauge-toggle">
				<label class="checkbox">
					<input type="checkbox" bind:checked={isBrokenGauge} />
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
					<input type="checkbox" bind:checked={isBrokenGauge} />
					<span>Broken Gauge</span>
				</label>
			</div>
		{/if}
		
	{:else}
		<div class="no-vehicle">Select a vehicle first</div>
	{/if}
</div>

<style>
	.odometer-reading {
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.current-odo {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}
	
	.current-odo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
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
		padding: 0;
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		border: none;
		background: transparent;
		color: #6b7280;
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
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
		margin-top: 0.5rem;
	}

	.new-odo {
		background: white;
		border: 2px solid #2563eb;
	}

	.odo-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
	}
	
	.odo-value.editable {
		cursor: pointer;
		border-bottom: 1px dotted #d1d5db;
		transition: border-color 0.2s ease;
	}
	
	.odo-value.editable:hover {
		border-bottom-color: #9ca3af;
	}

	.odo-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}

	.new-odo-input {
		width: 100%;
		padding: 0;
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		border: none;
		background: transparent;
		color: #1e293b;
		margin-bottom: 0.5rem;
		font-variant-numeric: tabular-nums;
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

	/* Distance Display */
	.distance-display {
		text-align: center;
		padding: 0.75rem;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	.distance-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #0369a1;
		display: block;
		margin-bottom: 0.25rem;
	}

	.distance-label {
		font-size: 0.875rem;
		color: #0369a1;
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
		.current-odo-value {
			font-size: 3rem;
		}

		.new-odo-input {
			font-size: 2.5rem;
			padding: 2rem 1rem;
			min-height: 80px;
		}

		/* Ensure number input triggers numeric keypad */
		.new-odo-input[type="number"] {
			-webkit-appearance: none;
			-moz-appearance: textfield;
		}
	}
</style>