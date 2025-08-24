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
	
	// New odometer reading - the main input
	let newOdo = $state(odometerEnd?.toString() || '');
	let isBrokenGauge = $state(false); // Default to working
	
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
		<!-- Current ODO Display -->
		<div class="odo-card current-odo">
			<div class="odo-value">{currentOdo || 'No reading'}</div>
			<div class="odo-label">Current</div>
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


	/* Unified ODO Cards - Same size and style */
	.odo-card {
		text-align: center;
		padding: 1.5rem;
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		min-height: 120px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.current-odo {
		background: #f8fafc;
		border: 2px solid #e2e8f0;
	}

	.new-odo {
		background: white;
		border: 3px solid #2563eb;
	}

	.odo-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: #64748b;
		margin-bottom: 0.5rem;
		font-family: monospace;
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
		font-family: monospace;
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

	/* Gauge Toggle - moved and styled */
	.gauge-toggle {
		padding: 1rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		margin-top: 1rem;
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
		padding: 1rem;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 0.5rem;
		margin-top: 1rem;
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