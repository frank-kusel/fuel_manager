<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import WorkflowStepper from './WorkflowStepper.svelte';
	import VehicleSelection from './steps/VehicleSelection.svelte';
	import DriverSelection from './steps/DriverSelection.svelte';
	import ActivitySelection from './steps/ActivitySelection.svelte';
	import LocationSelection from './steps/LocationSelection.svelte';
	import OdometerReading from './steps/OdometerReading.svelte';
	import FuelDataEntry from './steps/FuelDataEntry.svelte';

	import {
		fuelEntryWorkflowStore,
		currentStep,
		currentStepData,
		workflowProgress,
		workflowData,
		workflowErrors,
		canProceedToNext,
		canGoBackToPrevious,
		isSubmittingEntry
	} from '$lib/stores/fuel-entry-workflow';

	import { referenceDataStore } from '$lib/stores/reference-data';

	let workflowContainer: HTMLElement;
	let showSuccessModal = $state(false);
	let submitResult = $state<{ success: boolean; error?: string } | null>(null);

	// Update date/time when reaching review step
	$effect(() => {
		if ($currentStep === 6) {
			// Update to current date/time when user reaches review/submit step
			const now = new Date();
			const currentDate = now.toISOString().split('T')[0];
			const currentTime = now.toTimeString().substring(0, 5);
			fuelEntryWorkflowStore.setEntryDate(currentDate);
			fuelEntryWorkflowStore.setEntryTime(currentTime);
		}
	});

	onMount(() => {
		// Load reference data (will use cache if available)
		referenceDataStore.loadAllData();

		// Reset workflow on mount
		fuelEntryWorkflowStore.reset();

		// Add keyboard shortcuts
		function handleKeydown(event: KeyboardEvent) {
			// Only handle shortcuts if not typing in an input field
			const target = event.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
				return;
			}
			
			switch (event.key) {
				case 'ArrowRight':
				case 'Enter':
					event.preventDefault();
					if ($canProceedToNext && !$isSubmittingEntry) {
						handleNext();
					}
					break;
				case 'ArrowLeft':
					event.preventDefault();
					if ($canGoBackToPrevious) {
						handlePrevious();
					}
					break;
				case 'Escape':
					event.preventDefault();
					// Reset workflow or go back to start
					fuelEntryWorkflowStore.reset();
					break;
			}
		}
		
		document.addEventListener('keydown', handleKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
	
	async function handleNext() {
		fuelEntryWorkflowStore.nextStep();
		scrollToTop();
	}
	
	function handleAutoAdvance() {
		fuelEntryWorkflowStore.forceNextStep();
		scrollToTop();
	}
	
	function handlePrevious() {
		fuelEntryWorkflowStore.previousStep();
		scrollToTop();
	}
	
	function handleStepClick(stepIndex: number) {
		fuelEntryWorkflowStore.goToStep(stepIndex);
		scrollToTop();
	}
	
	function scrollToTop() {
		// Router-level scroll management now handles this
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	
	async function handleSubmit() {

		const result = await fuelEntryWorkflowStore.submitFuelEntry();
		submitResult = result;

		if (result.success) {
			// Refresh bowser and vehicle data to get updated readings
			// This ensures the next fuel entry shows correct starting readings
			await Promise.all([
				referenceDataStore.loadBowsers(),
				referenceDataStore.loadVehicles()
			]);

			showSuccessModal = true;
			// Auto-hide success modal after 1.5 seconds
			setTimeout(() => {
				showSuccessModal = false;
				fuelEntryWorkflowStore.reset();
			}, 1500);
		}
	}

	function getStepTitle(step: number): string {
		const titles = [
			'Vehicle',
			'Driver', 
			'Activity',
			'Location',
			'Odometer',
			'Fuel Data',
			'Review & Submit'
		];
		return titles[step] || '';
	}
	
	// Progress summary items using $state + $effect (more reliable)
	let progressItems = $state([]);
	
	$effect(() => {
		const items = [];
		const data = $state.snapshot($workflowData);
		
		if (data?.vehicle) {
			const vehicleName = data.vehicle.name || `${data.vehicle.make || ''} ${data.vehicle.model || ''}`.trim() || 'Vehicle';
			items.push(vehicleName);
		}
		if (data?.driver) {
			items.push(data.driver.name);
		}
		if (data?.activity) {
			items.push(data.activity.code);
		}
		
		// Handle field display in progress
		if (data?.fieldSelectionMode === 'multiple' && data?.selectedFields?.length > 0) {
			items.push(`${data.selectedFields.length} Field${data.selectedFields.length !== 1 ? 's' : ''}`);
		} else if (data?.field) {
			items.push(data.field.name);
		} else if (data?.zone) {
			items.push(data.zone.name);
		}
		
		progressItems = items;
	});
	
	function getCurrentStepErrors() {
		const currentStepId = $currentStepData?.id || '';
		return $workflowErrors[currentStepId] || [];
	}
	
	function isLastStep() {
		return $currentStep === 6; // Review step (index 6)
	}
</script>

<div class="fuel-entry-workflow" bind:this={workflowContainer}>
	<!-- Header Card - Matching Summary/Dashboard Layout -->
	<div class="app-header-card">
		<!-- Main Dashboard Header Style -->
		<div class="dashboard-header">
			<div class="header-content">
				<h1>{getStepTitle($currentStep)}</h1>
			</div>
		</div>
		
		
		<!-- Progress Summary - always present to prevent layout shift -->
		<div class="progress-summary">
			{#if progressItems.length > 0}
				{#each progressItems as item, i}
					{#if i > 0}<span class="progress-separator"> • </span>{/if}
					<span class="progress-item">{item}</span>
				{/each}
			{:else}
				<!-- Empty space holder to maintain layout -->
				<span class="progress-placeholder">&nbsp;</span>
			{/if}
		</div>
		
		<!-- Minimal Progress Bar -->
		<div class="progress-track">
			<div 
				class="progress-indicator" 
				style="width: {Math.round(((($currentStep + 1) / 7) * 100))}%"
			></div>
		</div>
	</div>
	
	<!-- Step Content -->
	<div class="step-content">
		{#if $currentStep === 0}
			<!-- Vehicle Selection -->
			<VehicleSelection
				selectedVehicle={$workflowData.vehicle}
				onVehicleSelect={(vehicle) => {
					fuelEntryWorkflowStore.setVehicle(vehicle);
				}}
				onAutoAdvance={handleAutoAdvance}
				errors={getCurrentStepErrors()}
			/>
			
			<!-- Continue Button -->
			<div class="step-actions">
				<button
					class="continue-button"
					onclick={() => {
						if ($canProceedToNext) {
							handleNext();
						}
					}}
					disabled={!$canProceedToNext}
				>
					Continue →
				</button>
			</div>
		{:else if $currentStep === 1}
			<!-- Driver Selection -->
			<DriverSelection
				selectedDriver={$workflowData.driver}
				onDriverSelect={(driver) => {
					fuelEntryWorkflowStore.setDriver(driver);
					
					// Auto-select driver's default vehicle if available and no vehicle selected yet
					if (driver?.default_vehicle && !$workflowData.vehicle) {
						fuelEntryWorkflowStore.setVehicle(driver.default_vehicle);
					}
				}}
				onAutoAdvance={handleAutoAdvance}
				errors={getCurrentStepErrors()}
			/>
			
			<!-- Continue Button -->
			<div class="step-actions">
				<button
					class="continue-button"
					onclick={() => {
						if ($canProceedToNext) {
							handleNext();
						}
					}}
					disabled={!$canProceedToNext}
				>
					Continue →
				</button>
			</div>
		{:else if $currentStep === 2}
			<!-- Activity Selection -->
			<ActivitySelection
				selectedActivity={$workflowData.activity}
				onActivitySelect={(activity) => {
					fuelEntryWorkflowStore.setActivity(activity);
				}}
				onAutoAdvance={handleAutoAdvance}
				errors={getCurrentStepErrors()}
			/>
			
			<!-- Continue Button -->
			<div class="step-actions">
				<button
					class="continue-button"
					onclick={() => {
						if ($canProceedToNext) {
							handleNext();
						}
					}}
					disabled={!$canProceedToNext}
				>
					Continue →
				</button>
			</div>
		{:else if $currentStep === 3}
			<!-- Location Selection (Field, Zone, or Multiple Fields - Optional) -->
			<LocationSelection
				selectedField={$workflowData.field}
				selectedZone={$workflowData.zone}
				fieldSelectionMode={$workflowData.fieldSelectionMode}
				selectedFields={$workflowData.selectedFields}
				onLocationSelect={(field, zone, selectedFields = []) => {
					fuelEntryWorkflowStore.setLocation(field, zone, selectedFields);
				}}
				onAutoAdvance={handleAutoAdvance}
				errors={getCurrentStepErrors()}
				allowModeToggle={true}
			/>
			
			<!-- Continue Button -->
			<div class="step-actions">
				<button
					class="continue-button"
					onclick={() => {
						if ($canProceedToNext) {
							handleNext();
						}
					}}
					disabled={!$canProceedToNext}
				>
					Continue →
				</button>
			</div>
		{:else if $currentStep === 4}
			<!-- Odometer Reading -->
			<OdometerReading
				selectedVehicle={$workflowData.vehicle}
				odometerStart={$workflowData.odometerStart}
				odometerEnd={$workflowData.odometerEnd}
				gaugeWorking={$workflowData.gaugeWorking}
				onOdometerUpdate={(start, end, gaugeWorking) => {
					fuelEntryWorkflowStore.setOdometerData(start, end, gaugeWorking);
				}}
				errors={getCurrentStepErrors()}
				canProceedToNext={$canProceedToNext}
				onNext={handleNext}
			/>
		{:else if $currentStep === 5}
			<!-- Fuel Data Entry -->
			<FuelDataEntry
				selectedVehicle={$workflowData.vehicle}
				selectedBowser={$workflowData.bowser}
				bowserReadingStart={$workflowData.bowserReadingStart}
				bowserReadingEnd={$workflowData.bowserReadingEnd}
				litresDispensed={$workflowData.litresDispensed}
				onFuelDataUpdate={(bowser, startReading, endReading, litres) => {
					fuelEntryWorkflowStore.setFuelData(bowser, startReading, endReading, litres);
				}}
				errors={getCurrentStepErrors()}
				canProceedToNext={$canProceedToNext}
				onNext={handleNext}
			/>
		{:else if $currentStep === 6}
			<!-- Review & Submit -->
			<div class="step-container">
				<!-- Simplified Review -->
				<div class="review-summary">
					<!-- Vehicle Info -->
					{#if $workflowData.vehicle}
						<div class="review-row">
							<span class="review-label">Vehicle</span>
							<span class="review-value">{$workflowData.vehicle.name || `${$workflowData.vehicle.make || ''} ${$workflowData.vehicle.model || ''}`.trim() || 'Unnamed'}</span>
						</div>
					{/if}
					
					<!-- Driver Info -->
					{#if $workflowData.driver}
						<div class="review-row">
							<span class="review-label">Driver</span>
							<span class="review-value">{$workflowData.driver.name}</span>
						</div>
					{/if}
					
					<!-- Activity Info -->
					{#if $workflowData.activity}
						<div class="review-row">
							<span class="review-label">Activity</span>
							<span class="review-value">{$workflowData.activity.name}</span>
						</div>
					{/if}
					
					<!-- Field Info -->
					{#if $workflowData.fieldSelectionMode === 'multiple' && $workflowData.selectedFields.length > 0}
						<div class="review-row">
							<span class="review-label">Fields</span>
							<span class="review-value">
								{$workflowData.selectedFields.length} field{$workflowData.selectedFields.length !== 1 ? 's' : ''}
							</span>
						</div>
						<div class="review-multi-fields">
							{#each $workflowData.selectedFields as field, index}
								<span class="field-chip">
									{field.name}
								</span>
								{#if index < $workflowData.selectedFields.length - 1}, {/if}
							{/each}
						</div>
					{:else if $workflowData.field}
						<div class="review-row">
							<span class="review-label">Field</span>
							<span class="review-value">{$workflowData.field.name}</span>
						</div>
					{:else if $workflowData.zone}
						<div class="review-row">
							<span class="review-label">Zone</span>
							<span class="review-value">{$workflowData.zone.name}</span>
						</div>
					{/if}
					
					<!-- Odometer Info -->
					{#if $workflowData.odometerStart !== null}
						<div class="review-row">
							<span class="review-label">ODO Start</span>
							<span class="review-value">{new Intl.NumberFormat('en-US').format($workflowData.odometerStart)} km</span>
						</div>
					{/if}
					
					{#if $workflowData.gaugeWorking && $workflowData.odometerEnd !== null}
						<div class="review-row">
							<span class="review-label">ODO End</span>
							<span class="review-value">{new Intl.NumberFormat('en-US').format($workflowData.odometerEnd)} km</span>
						</div>
						
						{#if $workflowData.odometerStart !== null}
							<div class="review-row">
								<span class="review-label">Distance</span>
								<span class="review-value">{new Intl.NumberFormat('en-US').format($workflowData.odometerEnd - $workflowData.odometerStart)} km</span>
							</div>
						{/if}
					{:else if !$workflowData.gaugeWorking}
						<div class="review-row">
							<span class="review-label">ODO Status</span>
							<span class="review-value">Gauge broken</span>
						</div>
					{/if}
					
					<!-- Bowser Reading Info -->
					{#if $workflowData.bowser}
						{#if $workflowData.bowserReadingStart !== null}
							<div class="review-row">
								<span class="review-label">Bowser Start</span>
								<span class="review-value">{new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format($workflowData.bowserReadingStart)} L</span>
							</div>
						{/if}
						
						{#if $workflowData.bowserReadingEnd !== null}
							<div class="review-row">
								<span class="review-label">Bowser End</span>
								<span class="review-value">{new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format($workflowData.bowserReadingEnd)} L</span>
							</div>
						{/if}
					{/if}
					
					<!-- Fuel Info - Highlighted -->
					{#if $workflowData.bowser && $workflowData.litresDispensed}
						<div class="fuel-total">
							<span class="fuel-amount">{new Intl.NumberFormat('en-US').format($workflowData.litresDispensed)}</span>
							<span class="fuel-unit">L</span>
						</div>
					{/if}
				</div>
				
				{#if getCurrentStepErrors().length > 0}
					<div class="error-message">
						{#each getCurrentStepErrors() as error}
							<p>{error}</p>
						{/each}
					</div>
				{/if}

				<!-- Date/Time Picker Section -->
				<div class="datetime-section">
					<h3 class="datetime-header">Entry Date & Time</h3>
					<div class="datetime-inputs">
						<div class="input-group">
							<label for="entryDate" class="input-label">Date</label>
							<input
								id="entryDate"
								type="date"
								value={$workflowData.entryDate}
								oninput={(e) => fuelEntryWorkflowStore.setEntryDate(e.currentTarget.value)}
								class="datetime-input"
							/>
						</div>
						<div class="input-group">
							<label for="entryTime" class="input-label">Time</label>
							<input
								id="entryTime"
								type="time"
								value={$workflowData.entryTime}
								oninput={(e) => fuelEntryWorkflowStore.setEntryTime(e.currentTarget.value)}
								class="datetime-input"
							/>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					class="submit-btn"
					onclick={() => {
						if ($canProceedToNext && !$isSubmittingEntry) {
							handleSubmit();
						}
					}}
					disabled={!$canProceedToNext || $isSubmittingEntry}
				>
					{#if $isSubmittingEntry}
						Submitting...
					{:else}
						Submit
					{/if}
				</button>
			</div>
		{/if}
	</div>
	
	<!-- Keyboard Shortcuts Hint -->
	<div class="keyboard-hints">
		<small>💡 Keyboard shortcuts: <kbd>→</kbd> or <kbd>Enter</kbd> to continue • <kbd>←</kbd> to go back • <kbd>Esc</kbd> to restart</small>
	</div>

	<!-- Fixed Position Back Button -->
	<button
		class="back-button-fixed {$canGoBackToPrevious ? 'visible' : 'hidden'}"
		onclick={handlePrevious}
		disabled={!$canGoBackToPrevious}
		aria-label="Previous step"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
		</svg>
	</button>

	<!-- Fixed Position Next Button -->
	<button
		class="next-button-fixed {$canProceedToNext && $currentStep < $fuelEntryWorkflowStore.steps.length - 1 ? 'visible' : 'hidden'}"
		onclick={handleNext}
		disabled={!$canProceedToNext}
		aria-label="Next step"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
		</svg>
	</button>
</div>

<!-- Success Modal -->
{#if showSuccessModal}
	<div class="success-modal-overlay">
		<div class="success-modal">
			<div class="success-content">
				<div class="success-icon">✅</div>
				<h3>Success!</h3>
				<p>Fuel entry submitted successfully</p>
			</div>
		</div>
	</div>
{/if}

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<style>
	.fuel-entry-workflow {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: #ffffff;
	}
	
	/* Mobile App Header Card - Complete sticky header */
	.app-header-card {
		position: sticky;
		top: 0;
		z-index: 100;
		background: #ffffff;
		border-bottom: 1px solid #f1f5f9;
	}
	
	
	/* Match Summary/Dashboard Header Layout Exactly */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	
	.header-content h1 {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}
	
	/* Fixed Position Back Button - Above Bottom Nav Bar */
	.back-button-fixed {
		position: fixed;
		bottom: 5rem;
		left: 1rem;
		z-index: 200;
		width: 56px;
		height: 56px;
		border-radius: 28px;
		border: none;
		background: rgba(255, 255, 255, 0.95);
		color: #64748b;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
		backdrop-filter: blur(12px);
	}
	
	.back-button-fixed.visible {
		opacity: 1;
		transform: translateX(0);
	}
	
	.back-button-fixed.hidden {
		opacity: 0;
		transform: translateX(-100%);
		pointer-events: none;
	}
	
	.back-button-fixed:hover:not(:disabled) {
		background: rgba(248, 250, 252, 0.98);
		color: #475569;
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}
	
	.back-button-fixed:disabled {
		opacity: 0;
		transform: translateX(-100%);
		pointer-events: none;
	}

	/* Fixed Position Next Button - Above Bottom Nav Bar (Right Side) */
	.next-button-fixed {
		position: fixed;
		bottom: 5rem;
		right: 1rem;
		z-index: 200;
		width: 56px;
		height: 56px;
		border-radius: 28px;
		border: none;
		background: rgba(37, 99, 235, 0.95);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
		backdrop-filter: blur(12px);
	}

	.next-button-fixed.visible {
		opacity: 1;
		transform: translateX(0);
	}

	.next-button-fixed.hidden {
		opacity: 0;
		transform: translateX(100%);
		pointer-events: none;
	}

	.next-button-fixed:hover:not(:disabled) {
		background: rgba(29, 78, 216, 0.98);
		transform: scale(1.05);
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
	}

	.next-button-fixed:disabled {
		opacity: 0;
		transform: translateX(100%);
		pointer-events: none;
	}
	
	
	
	/* Progress Track */
	.progress-track {
		height: 4px;
		background: #f1f5f9;
		position: relative;
		border-radius: 2px;
		overflow: hidden;
	}
	
	.progress-indicator {
		height: 100%;
		background: linear-gradient(90deg, #10b981, #059669);
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
		border-radius: 2px;
	}
	
	/* Progress Summary */
	.progress-summary {
		padding: 0 1rem 0.75rem;
		text-align: left;
		font-size: 0.85rem;
		color: #6b7280;
		line-height: 1.4;
	}
	
	.progress-item {
		font-weight: 500;
		color: #374151;
	}
	
	.progress-separator {
		margin: 0 8px;
		color: #d1d5db;
		font-weight: 400;
	}
	
	
	/* Step Actions */
	.step-actions {
		padding: 1.5rem 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
	}
	
	/* Step Container - removed since step-content handles this */
	
	
	/* Navigation */
	.step-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	
	:global(.nav-button) {
		padding: 0.75rem 1.5rem !important;
		border-radius: 8px !important;
		font-weight: 500 !important;
		border: 1px solid #e5e7eb !important;
		background: white !important;
		color: #6b7280 !important;
		transition: all 0.2s ease !important;
	}
	
	:global(.nav-button:hover) {
		border-color: #d1d5db !important;
		color: #374151 !important;
		background: #f9fafb !important;
	}
	
	.continue-button {
		background: #1f2937;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.continue-button:hover:not(:disabled) {
		background: #374151;
	}
	
	.continue-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	/* Step Content */
	.step-content {
		flex: 1;
		padding: 1.5rem 1rem 6rem 1rem;
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		background: #ffffff;
	}
	
	/* Simplified Review */
	.review-summary {
		display: flex;
		flex-direction: column;
	}
	
	.review-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem;
	}
	
	.review-label {
		font-size: 1.25rem;
		color: var(--gray-400);
		font-weight: 500;
	}
	
	.review-value {
		font-size: 1.25rem;
		color: #111827;
		font-weight: 600;
		text-align: right;
	}
	
	.fuel-total {
		text-align: center;
		margin: 1rem 0;
	}
	
	.fuel-amount {
		font-size: 3rem;
		font-weight: 800;
		color: #111827;
	}
	
	.fuel-unit {
		font-size: 1.25rem;
		font-weight: 700;
		color: #9ca3af;
		margin-left: 0.25rem;
	}

	/* Multi-field review display */
	.review-multi-fields {
		padding: 0.5rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		align-items: center;
	}

	.field-chip {
		display: inline-flex;
		align-items: center;
		background: #f0fdf4;
		border: 1px solid #10b981;
		border-radius: 16px;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #065f46;
	}


	/* Date/Time Picker Section */
	.datetime-section {
		margin: 2rem 0 1rem 0;
		padding: 1.5rem;
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}

	.datetime-header {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 1rem 0;
	}

	.datetime-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
	}

	.datetime-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		color: #1e293b;
		background: white;
		transition: all 0.2s ease;
		box-sizing: border-box;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
	}

	.datetime-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.datetime-input:hover:not(:focus) {
		border-color: #94a3b8;
	}

	/* Mobile datetime inputs */
	@media (max-width: 768px) {
		.datetime-section {
			margin: 1.5rem 0 1rem 0;
			padding: 1rem;
		}

		.datetime-inputs {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.datetime-input {
			font-size: 16px; /* Prevents iOS zoom on focus */
			padding: 0.875rem;
		}
	}

	/* Submit Button */
	.submit-btn {
		width: 100%;
		background: #1f2937;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease;
		margin-top: 1rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #374151;
	}

	.submit-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
	/* Error Message */
	.error-message {
		background: #fef2f2;
		padding: 1rem;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
	
	.error-message p {
		color: #dc2626;
		font-size: 0.875rem;
		margin: 0;
	}


	/* Success Modal */
	.success-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}
	
	.success-modal {
		background: white;
		border-radius: 20px;
		padding: 2.5rem;
		max-width: 360px;
		margin: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: slideUp 0.3s ease-out;
		border: 1px solid #f1f5f9;
	}
	
	.success-content {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.success-icon {
		font-size: 3rem;
	}
	
	.success-content h3 {
		color: #f97316;
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}
	
	.success-content p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.5;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	@keyframes slideUp {
		from { 
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to { 
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.fuel-entry-workflow {
			padding: 0;
			gap: 0;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
		}
		
		/* Match Summary/Dashboard Mobile Header Exactly */
		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem;
		}
		
		.header-content h1 {
			font-size: 1.75rem;
		}
		
		
		.progress-track {
			height: 4px;
		}
		
		/* Content area */
		.step-content {
			padding: 1.25rem 0 6rem 0;
		}
		
		/* Progress summary mobile */
		.progress-summary {
			padding: 0.625rem 0.75rem;
			font-size: 0.85rem;
			line-height: 1.3;
		}
		
		.progress-separator {
			margin: 0 6px;
		}
		
		.review-card {
			padding: 1.5rem;
		}
		
		.review-header h3 {
			font-size: 1.25rem;
		}
		
		.review-grid {
			gap: 1rem;
		}
		
		.review-item {
			padding: 0.875rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.review-item.odometer-group {
			gap: 0.75rem;
		}
		
		.item-value {
			text-align: left;
		}
		
		.fuel-value {
			font-size: 1.125rem;
		}
		
		.odometer-values {
			font-size: 0.9rem;
			gap: 0.5rem;
		}
		
		.submit-button {
			padding: 0.875rem 1.5rem;
			font-size: 0.875rem;
		}
		
		.error-card {
			padding: 1rem;
			border-radius: 12px;
		}

		/* Success modal */
		.success-modal {
			margin: 1rem;
			padding: 1.5rem;
			border-radius: 16px;
			max-width: calc(100vw - 2rem);
		}
		
		.success-content {
			gap: 0.75rem;
		}
		
		.success-icon {
			font-size: 2.5rem;
		}
		
		.success-content h3 {
			font-size: 1.125rem;
			color: #f97316;
		}
		
		.success-content p {
			font-size: 0.875rem;
		}
	}

	/* Extra small mobile devices */
	@media (max-width: 480px) {
		.header-content h1 {
			font-size: 1.5rem;
		}
		
		.step-content {
			padding: 1rem 0 6rem 0;
		}
		
		.progress-summary {
			padding: 0.5rem;
			font-size: 0.85rem;
		}
		
		.progress-separator {
			margin: 0 4px;
		}
		
		.review-card {
			padding: 1rem;
		}
		
		.success-modal {
			margin: 0.5rem;
			padding: 1rem;
		}
	}
	
	/* Keyboard Shortcuts Hint */
	.keyboard-hints {
		text-align: center;
		padding: 1.5rem;
		color: #6b7280;
		background: white;
		margin: 2rem 1.5rem 0;
		border-radius: 12px;
		border: 1px solid #f1f5f9;
		max-width: 900px;
		margin-left: auto;
		margin-right: auto;
	}
	
	/* Hide keyboard hints on mobile */
	@media (max-width: 768px) {
		.keyboard-hints {
			display: none;
		}
	}
	
	.keyboard-hints kbd {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-family: monospace;
		font-weight: 600;
		color: #374151;
		margin: 0 0.25rem;
		display: inline-block;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}
</style>