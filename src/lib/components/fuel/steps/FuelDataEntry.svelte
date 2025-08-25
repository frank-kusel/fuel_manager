<script lang="ts">
	import { onMount } from 'svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Bowser, Vehicle } from '$lib/types';
	
	interface Props {
		selectedVehicle: Vehicle | null;
		selectedBowser: Bowser | null;
		bowserReadingStart: number | null;
		bowserReadingEnd: number | null;
		litresDispensed: number | null;
		onFuelDataUpdate: (bowser: Bowser | null, startReading: number | null, endReading: number | null, litres: number | null) => void;
		errors: string[];
	}
	
	let { selectedVehicle, selectedBowser, bowserReadingStart, bowserReadingEnd, litresDispensed, onFuelDataUpdate, errors }: Props = $props();
	
	let bowsers: Bowser[] = $state([]);
	let loading = $state(true);
	
	// Main fuel input
	let fuelAmount = $state(litresDispensed?.toString() || '');
	let selectedBowserId = $state(selectedBowser?.id || '');
	
	// Bowser readings
	let startReading = $state(bowserReadingStart || 0);
	let endReading = $state(bowserReadingEnd || 0);
	let isEditingStartReading = $state(false);
	let isEditingEndReading = $state(false);
	let expectedStartReading = $state<number | null>(null);
	let readingMismatchWarning = $state<string | null>(null);
	
	// Resync function to reset to bowser's current reading
	function resyncStartReading() {
		const bowser = bowsers.find(b => b.id === selectedBowserId);
		if (bowser) {
			startReading = bowser.current_reading || 0;
			expectedStartReading = bowser.current_reading || 0;
			isEditingStartReading = false;
		}
	}
	
	onMount(async () => {
		try {
			await supabaseService.init();
			const result = await supabaseService.getBowsers();
			if (result.error) {
				throw new Error(result.error);
			}
			bowsers = (result.data || []).filter(bowser => 
				selectedVehicle ? bowser.fuel_type === selectedVehicle.fuel_type : true
			);
			
			// Auto-select first bowser and pre-populate its current reading
			if (bowsers.length > 0 && !selectedBowserId) {
				const firstBowser = bowsers[0];
				selectedBowserId = firstBowser.id;
				// Pre-populate start reading with bowser's current reading
				expectedStartReading = firstBowser.current_reading || 0;
				startReading = firstBowser.current_reading || 0;
				// Update parent immediately with bowser selection
				onFuelDataUpdate(firstBowser, firstBowser.current_reading || 0, endReading, null);
			}
		} catch (err) {
			console.error('Failed to load bowsers:', err);
		} finally {
			loading = false;
		}
	});
	
	// Auto-calculate end reading when fuel amount changes (only if not manually edited)
	$effect(() => {
		if (!isEditingEndReading && !isEditingStartReading) {
			const fuel = parseFloat(fuelAmount);
			if (!isNaN(fuel) && fuel > 0 && startReading) {
				endReading = startReading - fuel; // Bowser reading decreases as fuel is dispensed
			}
		}
	});
	
	// Update parent when values change
	$effect(() => {
		const bowser = bowsers.find(b => b.id === selectedBowserId) || null;
		const fuel = fuelAmount ? parseFloat(fuelAmount) : null;
		
		onFuelDataUpdate(bowser, startReading, endReading, fuel);
	});
	
	let selectedBowserInfo = $state(null);
	
	// Update selected bowser when values change
	$effect(() => {
		selectedBowserInfo = bowsers.find(b => b.id === selectedBowserId) || null;
	});
	
	// Check for reading continuity
	$effect(() => {
		if (expectedStartReading !== null && startReading !== expectedStartReading) {
			const diff = Math.abs(startReading - expectedStartReading);
			if (diff > 0.1) { // Allow small rounding differences
				readingMismatchWarning = `Warning: Start reading (${startReading}) doesn't match bowser's last reading (${expectedStartReading}). This may indicate a missing entry or manual adjustment.`;
			} else {
				readingMismatchWarning = null;
			}
		} else {
			readingMismatchWarning = null;
		}
	});
</script>

<div class="fuel-data-entry">
	
	{#if selectedVehicle}
		<!-- Auto-selected bowser info (hidden, Tank A Diesel auto-selected) -->
		{#if loading}
			<div class="loading">Loading fuel bowsers...</div>
		{:else if bowsers.length === 0}
			<div class="no-bowsers">No fuel bowsers available</div>
		{/if}
		
		<!-- Main Fuel Input -->
		<div class="fuel-input-container">
			<input 
				type="number" 
				inputmode="numeric" 
				pattern="[0-9]*" 
				bind:value={fuelAmount}
				placeholder="Enter fuel"
				class="fuel-input"
				autocomplete="off"
			/>
			<div class="fuel-label">Litres dispensed</div>
		</div>
		
		<!-- Bowser Readings - Always visible -->
		<div class="calculations">
			<div class="calc-header">
				<h3>Bowser Readings</h3>
			</div>
			<div class="calc-item">
				<span class="calc-label">Start:</span>
				<div class="calc-item-right">
					{#if isEditingStartReading}
						<input 
							type="number" 
							inputmode="numeric" 
							bind:value={startReading}
							placeholder="Enter start reading"
							class="start-reading-input"
							onblur={() => isEditingStartReading = false}
							onfocus={(e) => e.target.select()}
							autocomplete="off"
						/>
					{:else}
						<span class="calc-value editable" onclick={() => isEditingStartReading = true}>
							{#if selectedBowserInfo}
								{new Intl.NumberFormat().format(startReading)}L
							{:else}
								-
							{/if}
						</span>
					{/if}
					{#if selectedBowserInfo}
						<div class="btn-group">
							<button class="edit-btn" onclick={() => isEditingStartReading = !isEditingStartReading}>
								{isEditingStartReading ? '✓' : '✏️'}
							</button>
							{#if isEditingStartReading}
								<button class="resync-btn" onclick={resyncStartReading} title="Reset to bowser reading">
									🔄
								</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			<div class="calc-item">
				<span class="calc-label">End:</span>
				<div class="calc-item-right">
					{#if isEditingEndReading}
						<input 
							type="number" 
							inputmode="numeric" 
							bind:value={endReading}
							placeholder="Enter end reading"
							class="end-reading-input"
							onblur={() => isEditingEndReading = false}
							onfocus={(e) => e.target.select()}
							autocomplete="off"
						/>
					{:else}
						<span class="calc-value" class:editable={selectedBowserInfo} onclick={() => selectedBowserInfo && (isEditingEndReading = true)}>
							{#if fuelAmount && parseFloat(fuelAmount) > 0 && selectedBowserInfo}
								{new Intl.NumberFormat().format(endReading)}L
							{:else}
								-
							{/if}
						</span>
					{/if}
					{#if selectedBowserInfo}
						<div class="btn-group">
							<button class="edit-btn" onclick={() => isEditingEndReading = !isEditingEndReading}>
								{isEditingEndReading ? '✓' : '✏️'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
		
		<!-- Reading continuity warning -->
		{#if readingMismatchWarning}
			<div class="warning-message">
				<span class="warning-icon">⚠️</span>
				<span class="warning-text">{readingMismatchWarning}</span>
			</div>
		{/if}
		
	{:else}
		<div class="no-vehicle">Select a vehicle first</div>
	{/if}
</div>

<style>
	.fuel-data-entry {
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


	/* Bowser Selection */
	.bowser-selection {
		margin-bottom: 1rem;
	}

	.bowser-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.bowser-select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		background: white;
		font-size: 1rem;
	}

	.bowser-select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	/* Main Fuel Input - Large and Touch-Friendly */
	.fuel-input-container {
		text-align: center;
	}

	.fuel-input {
		width: 100%;
		padding: 1.5rem;
		font-size: 2.5rem;
		font-weight: 600;
		text-align: center;
		border: 3px solid #10b981;
		border-radius: 0.75rem;
		background: white;
		color: #1e293b;
		margin-bottom: 0.5rem;
		-webkit-appearance: none;
		appearance: none;
	}

	.fuel-input:focus {
		outline: none;
		border-color: #059669;
		box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
	}

	.fuel-input::placeholder {
		color: #94a3b8;
		font-weight: 400;
	}

	.fuel-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}

	/* Calculations Display */
	.calculations {
		padding: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.calc-header {
		text-align: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.calc-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.calc-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		min-height: 3rem;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.calc-item-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 220px;
		justify-content: flex-end;
	}
	
	.calc-item:last-child {
		border-bottom: none;
	}


	.calc-label {
		color: #64748b;
		font-size: 1rem;
		font-weight: 500;
	}

	.calc-value {
		color: #1e293b;
		font-weight: 600;
		font-size: 1.25rem;
	}

	.calc-value.editable {
		cursor: pointer;
		border-bottom: 1px dotted #d1d5db;
		transition: border-color 0.2s ease;
	}
	
	.calc-value.editable:hover {
		border-bottom-color: #f97316;
	}

	.start-reading-input,
	.end-reading-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
		background: #fefefe;
		width: 150px;
		text-align: right;
		transition: all 0.2s ease;
		-webkit-appearance: none;
		appearance: none;
	}

	.start-reading-input:focus,
	.end-reading-input:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
		background: white;
	}

	.btn-group {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}
	
	.edit-btn,
	.resync-btn {
		background: transparent;
		color: #6b7280;
		border: 1px solid #e5e7eb;
		padding: 0.375rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 2rem;
		min-height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.edit-btn:hover,
	.resync-btn:hover {
		background: #f9fafb;
		border-color: #f97316;
		color: #f97316;
	}
	
	.edit-btn:active,
	.resync-btn:active {
		background: #fef3e2;
	}
	
	.resync-btn {
		background: #fef3e2;
		border-color: #f97316;
		color: #ea580c;
	}

	/* Warning message */
	.warning-message {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 8px;
		padding: 0.75rem;
		margin-top: 1rem;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.warning-icon {
		flex-shrink: 0;
		font-size: 1rem;
	}

	.warning-text {
		color: #92400e;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	/* States */
	.loading,
	.no-bowsers,
	.no-vehicle {
		text-align: center;
		padding: 2rem;
		color: #64748b;
		font-size: 1rem;
	}

	/* Mobile Optimizations */
	@media (max-width: 768px) {
		.fuel-input {
			font-size: 3rem;
			padding: 2rem 1rem;
			min-height: 100px;
		}

		.calculations {
			margin: 0 -0.25rem;
			padding: 1rem;
		}
		
		.calc-header h3 {
			font-size: 1.25rem;
		}
		
		.calc-item {
			padding: 1rem 0;
		}
		
		.calc-item-right {
			min-width: 180px;
		}
		
		.calc-label {
			font-size: 1rem;
		}
		
		.calc-value {
			font-size: 1.25rem;
		}
		
		.start-reading-input,
		.end-reading-input {
			width: 120px;
			font-size: 1.25rem;
			padding: 0.5rem;
		}
		
		.edit-btn,
		.resync-btn {
			min-width: 2.5rem;
			min-height: 2.5rem;
			font-size: 1rem;
		}
	}
</style>