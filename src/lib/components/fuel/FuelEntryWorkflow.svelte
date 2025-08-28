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
	
	let workflowContainer: HTMLElement;
	let showSuccessModal = $state(false);
	let submitResult = $state<{ success: boolean; error?: string } | null>(null);
	
	onMount(() => {
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
		if (data?.field) {
			items.push(data.field.name);
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
	<!-- Mobile App Header - Complete Header Card -->
	<div class="app-header-card">
		<div class="header-content">
			<!-- Step Header with Navigation -->
			<div class="step-nav-header">
				{#if $canGoBackToPrevious}
					<button class="nav-back" onclick={handlePrevious}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
						</svg>
					</button>
				{:else}
					<div class="nav-spacer"></div>
				{/if}
				
				<div class="step-info">
					<h1 class="step-title">{getStepTitle($currentStep)}</h1>
					<div class="step-counter">{$currentStep + 1} of 7</div>
				</div>
				
				{#if $currentStep === 4 || $currentStep === 5}
					<button 
						class="nav-continue {$canProceedToNext ? 'enabled' : 'disabled'}"
						onclick={() => {
							if ($canProceedToNext) {
								handleNext();
							}
						}}
						disabled={!$canProceedToNext}
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
						</svg>
					</button>
				{:else}
					<div class="nav-spacer"></div>
				{/if}
			</div>
			
			<!-- Progress Summary -->
			{#if progressItems.length > 0}
				<div class="progress-summary">
					{#each progressItems as item, i}
						{#if i > 0}<span class="progress-separator">•</span>{/if}
						<span class="progress-item">{item}</span>
					{/each}
				</div>
			{/if}
			
			<!-- Minimal Progress Bar -->
			<div class="progress-track">
				<div 
					class="progress-indicator" 
					style="width: {Math.round(((($currentStep + 1) / 7) * 100))}%"
				></div>
			</div>
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
			<!-- Location Selection (Field or Zone - Optional) -->
			<LocationSelection
				selectedField={$workflowData.field}
				selectedZone={$workflowData.zone}
				onLocationSelect={(field, zone) => {
					fuelEntryWorkflowStore.setLocation(field, zone);
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
					{#if $workflowData.field}
						<div class="review-row">
							<span class="review-label">Field</span>
							<span class="review-value">{$workflowData.field.name}</span>
						</div>
					{/if}
					
					<!-- Odometer Info -->
					{#if $workflowData.gaugeWorking && $workflowData.odometerStart !== null && $workflowData.odometerEnd !== null}
						<div class="review-row">
							<span class="review-label">Distance</span>
							<span class="review-value">{new Intl.NumberFormat().format($workflowData.odometerEnd - $workflowData.odometerStart)} km</span>
						</div>
					{/if}
					
					<!-- Fuel Info - Highlighted -->
					{#if $workflowData.bowser && $workflowData.litresDispensed}
						<div class="fuel-total">
							<span class="fuel-amount">{new Intl.NumberFormat().format($workflowData.litresDispensed)}</span>
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
	
	.header-content {
		padding: 0;
		background: #ffffff;
	}
	
	.step-nav-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		min-height: 56px; /* Standard mobile header height */
	}
	
	/* Navigation Buttons */
	.nav-back,
	.nav-continue {
		width: 44px;
		height: 44px;
		border-radius: 22px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}
	
	.nav-back {
		background: #f8fafc;
		color: #475569;
	}
	
	.nav-back:hover {
		background: #f1f5f9;
		color: #334155;
	}
	
	.nav-continue.disabled {
		background: #f8fafc;
		color: #cbd5e1;
		cursor: not-allowed;
	}
	
	.nav-continue.enabled {
		background: #10b981;
		color: white;
	}
	
	.nav-continue.enabled:hover {
		background: #059669;
		transform: scale(1.05);
	}
	
	.nav-spacer {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
	}
	
	/* Step Info */
	.step-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0 1rem;
	}
	
	.step-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		line-height: 1.3;
	}
	
	.step-counter {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
		margin-top: 2px;
		letter-spacing: 0.025em;
	}
	
	/* Progress Track */
	.progress-track {
		height: 2px;
		background: #f1f5f9;
		position: relative;
		overflow: hidden;
	}
	
	.progress-indicator {
		height: 100%;
		background: linear-gradient(90deg, #10b981, #059669);
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
	}
	
	/* Progress Summary */
	.progress-summary {
		padding: 0.75rem 1rem;
		text-align: center;
		font-size: 0.875rem;
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
		gap: 1rem;
		margin-bottom: 2rem;
	}
	
	.review-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.review-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}
	
	.review-value {
		font-size: 0.875rem;
		color: #111827;
		font-weight: 600;
		text-align: right;
	}
	
	.fuel-total {
		text-align: center;
		margin: 2rem 0;
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
		
		/* Mobile app header optimizations */
		.app-header {
			height: 56px;
			padding: 0 16px;
			border-bottom: 1px solid #f1f5f9;
			background: #ffffff;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
		
		.step-nav-header {
			height: 44px;
			align-items: center;
			gap: 12px;
		}
		
		.nav-back, .nav-continue {
			width: 44px;
			height: 44px;
			border-radius: 50%;
			border: none;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			flex-shrink: 0;
		}
		
		.nav-back {
			background: #f8fafc;
			color: #64748b;
		}
		
		.nav-back:active {
			background: #e2e8f0;
			transform: scale(0.95);
		}
		
		.nav-continue {
			background: #e5e7eb;
			color: #9ca3af;
		}
		
		.nav-continue.enabled {
			background: #10b981;
			color: white;
			box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
		}
		
		.nav-continue.enabled:active {
			background: #059669;
			transform: scale(0.95);
		}
		
		.step-info {
			flex: 1;
			min-width: 0;
		}
		
		.step-title {
			font-size: 18px;
			font-weight: 600;
			color: #1f2937;
			margin: 0;
			line-height: 1.2;
			truncate: true;
		}
		
		.step-counter {
			font-size: 12px;
			color: #6b7280;
			margin-top: 2px;
		}
		
		.progress-track {
			height: 3px;
			background: #f1f5f9;
			border-radius: 0;
			overflow: hidden;
		}
		
		.progress-indicator {
			height: 100%;
			background: linear-gradient(90deg, #10b981, #059669);
			transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
			box-shadow: none;
		}
		
		/* Content area */
		.step-content {
			padding: 1.25rem 0 6rem 0;
		}
		
		/* Progress summary mobile */
		.progress-summary {
			padding: 0.625rem 0.75rem;
			font-size: 0.8125rem;
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
		.app-header {
			padding: 0 12px;
		}
		
		.step-title {
			font-size: 16px;
		}
		
		.step-content {
			padding: 1rem 0 6rem 0;
		}
		
		.progress-summary {
			padding: 0.5rem;
			font-size: 0.75rem;
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