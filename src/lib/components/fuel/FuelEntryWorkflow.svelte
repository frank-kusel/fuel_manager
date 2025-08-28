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
		
		// Ensure page loads at the top - very aggressive approach
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;
		window.scrollTo(0, 0);
		
		// Multiple fallback attempts
		requestAnimationFrame(() => {
			window.scrollTo(0, 0);
			document.documentElement.scrollTop = 0;
		});
		
		setTimeout(() => {
			window.scrollTo(0, 0);
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;
		}, 1);
		
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: 'instant' });
		}, 10);
		
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: 'instant' });
		}, 50);
		
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: 'instant' });
		}, 100);
		
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
		if (workflowContainer) {
			workflowContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
	
	async function handleSubmit() {
		
		const result = await fuelEntryWorkflowStore.submitFuelEntry();
		submitResult = result;
		
		console.log('Submit result:', result);
		
		if (result.success) {
			showSuccessModal = true;
			// Auto-hide success modal after 1.5 seconds
			setTimeout(() => {
				showSuccessModal = false;
				fuelEntryWorkflowStore.reset();
			}, 1500);
		} else {
			console.error('Submit failed:', result.error);
		}
	}
	
	function getCurrentStepErrors() {
		const currentStepId = $currentStepData?.id || '';
		return $workflowErrors[currentStepId] || [];
	}
	
	function isLastStep() {
		return $currentStep === 6; // Review step (index 6)
	}
</script>

<div class="fuel-entry-workflow" bind:this={workflowContainer}>
	<!-- Dashboard Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Fuel Entry</h1>
		</div>
	</div>
	
	<!-- Step Info -->
	<div class="step-info">
		<span class="step-badge">Step {$currentStep + 1} of 7</span>
		<span class="step-title">{$currentStepData?.title || ''}</span>
	</div>
	
	<!-- Step Content -->
	<div class="step-content">
		{#if $currentStep === 0}
			<!-- Vehicle Selection -->
			<div class="step-container">
				
					<VehicleSelection
						selectedVehicle={$workflowData.vehicle}
						onVehicleSelect={(vehicle) => {
							console.log('Vehicle selected:', vehicle);
							fuelEntryWorkflowStore.setVehicle(vehicle);
						}}
						onAutoAdvance={handleAutoAdvance}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 1}
			<!-- Driver Selection -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
				</div>
				
				
					<DriverSelection
						selectedDriver={$workflowData.driver}
						onDriverSelect={(driver) => {
							console.log('Driver selected:', driver);
							fuelEntryWorkflowStore.setDriver(driver);
							
							// Auto-select driver's default vehicle if available and no vehicle selected yet
							if (driver?.default_vehicle && !$workflowData.vehicle) {
								console.log('Auto-selecting default vehicle:', driver.default_vehicle);
								fuelEntryWorkflowStore.setVehicle(driver.default_vehicle);
							}
						}}
						onAutoAdvance={handleAutoAdvance}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 2}
			<!-- Activity Selection -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
				</div>
				
				
					<ActivitySelection
						selectedActivity={$workflowData.activity}
						onActivitySelect={(activity) => {
							console.log('Activity selected:', activity);
							fuelEntryWorkflowStore.setActivity(activity);
						}}
						onAutoAdvance={handleAutoAdvance}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 3}
			<!-- Location Selection (Field or Zone - Optional) -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
				</div>
				
				
					<LocationSelection
						selectedField={$workflowData.field}
						selectedZone={$workflowData.zone}
						onLocationSelect={(field, zone) => {
							console.log('Location selected:', { field, zone });
							fuelEntryWorkflowStore.setLocation(field, zone);
						}}
						onAutoAdvance={handleAutoAdvance}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 4}
			<!-- Odometer Reading -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
					
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
				
				
					<OdometerReading
						selectedVehicle={$workflowData.vehicle}
						odometerStart={$workflowData.odometerStart}
						odometerEnd={$workflowData.odometerEnd}
						gaugeWorking={$workflowData.gaugeWorking}
						onOdometerUpdate={(start, end, gaugeWorking) => {
							console.log('Odometer updated:', { start, end, gaugeWorking });
							fuelEntryWorkflowStore.setOdometerData(start, end, gaugeWorking);
						}}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 5}
			<!-- Fuel Data Entry -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
					
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
				
				
					<FuelDataEntry
						selectedVehicle={$workflowData.vehicle}
						selectedBowser={$workflowData.bowser}
						bowserReadingStart={$workflowData.bowserReadingStart}
						bowserReadingEnd={$workflowData.bowserReadingEnd}
						litresDispensed={$workflowData.litresDispensed}
						onFuelDataUpdate={(bowser, startReading, endReading, litres) => {
							console.log('Fuel data updated:', { bowser, startReading, endReading, litres });
							fuelEntryWorkflowStore.setFuelData(bowser, startReading, endReading, litres);
						}}
						errors={getCurrentStepErrors()}
					/>
			</div>
		{:else if $currentStep === 6}
			<!-- Review & Submit -->
			<div class="step-container">
				<!-- Navigation Controls -->
				<div class="step-nav">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="nav-button"
						>
							← Back
						</Button>
					{/if}
				</div>
				
				<!-- Review Summary Card -->
				<div class="review-card">
					<div class="review-header">
						<h3>Review Entry</h3>
						<p>Please verify all information before submitting</p>
					</div>
					
					<div class="review-grid">
						<!-- Vehicle Info -->
						{#if $workflowData.vehicle}
							<div class="review-item">
								<span class="item-label">Vehicle</span>
								<span class="item-value">{$workflowData.vehicle.name || `${$workflowData.vehicle.make || ''} ${$workflowData.vehicle.model || ''}`.trim() || 'Unnamed'}</span>
							</div>
						{/if}
						
						<!-- Driver Info -->
						{#if $workflowData.driver}
							<div class="review-item">
								<span class="item-label">Driver</span>
								<span class="item-value">{$workflowData.driver.name}</span>
							</div>
						{/if}
						
						<!-- Activity Info -->
						{#if $workflowData.activity}
							<div class="review-item">
								<span class="item-label">Activity</span>
								<span class="item-value">{$workflowData.activity.name}</span>
							</div>
						{/if}
						
						<!-- Field Info -->
						{#if $workflowData.field}
							<div class="review-item">
								<span class="item-label">Field</span>
								<span class="item-value">{$workflowData.field.name}</span>
							</div>
						{/if}
						
						<!-- Odometer Info -->
						{#if $workflowData.gaugeWorking && $workflowData.odometerStart !== null && $workflowData.odometerEnd !== null}
							<div class="review-item odometer-group">
								<span class="item-label">Odometer</span>
								<div class="odometer-values">
									<span class="odo-start">{new Intl.NumberFormat().format($workflowData.odometerStart)}</span>
									<span class="odo-arrow">→</span>
									<span class="odo-end">{new Intl.NumberFormat().format($workflowData.odometerEnd)}</span>
								</div>
							</div>
						{/if}
						
						<!-- Fuel Info -->
						{#if $workflowData.bowser && $workflowData.litresDispensed}
							<div class="review-item fuel-highlight">
								<span class="item-label">Fuel Dispensed</span>
								<span class="item-value fuel-value">{new Intl.NumberFormat().format($workflowData.litresDispensed)}L</span>
							</div>
						{/if}
					</div>
				</div>
				
				{#if getCurrentStepErrors().length > 0}
					<div class="validation-errors">
						<div class="error-card">
							<div class="error-header">
								<span class="error-icon">⚠️</span>
								<h3>Please complete all required steps</h3>
							</div>
							<div class="error-list">
								{#each getCurrentStepErrors() as error}
									<div class="error-item">{error}</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Submit Button -->
				<div class="submit-container">
					<button
						class="submit-button"
						onclick={() => {
							if ($canProceedToNext && !$isSubmittingEntry) {
								handleSubmit();
							}
						}}
						disabled={!$canProceedToNext || $isSubmittingEntry}
					>
						{#if $isSubmittingEntry}
							<span class="submit-loader"></span>
							Submitting...
						{:else}
							Submit Entry
						{/if}
					</button>
				</div>
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

<style>
	.fuel-entry-workflow {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		min-height: 100vh;
	}
	
	/* Header - matching Dashboard style */
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
	
	.step-info {
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		color: white;
		padding: 1rem 1.5rem;
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(249, 115, 22, 0.2);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
	}
	
	.step-badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.step-title {
		font-size: 1rem;
		font-weight: 500;
		opacity: 0.9;
	}
	
	
	/* Step Container */
	.step-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 900px;
		margin: 0 auto;
	}
	
	
	/* Navigation */
	.step-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	
	:global(.nav-button) {
		padding: 0.75rem 1.5rem !important;
		border-radius: 12px !important;
		font-weight: 500 !important;
		border: 1px solid #e5e7eb !important;
		background: white !important;
		color: #374151 !important;
		transition: all 0.2s ease !important;
	}
	
	:global(.nav-button:hover) {
		border-color: #f97316 !important;
		color: #f97316 !important;
		box-shadow: 0 2px 8px rgba(249, 115, 22, 0.1) !important;
	}
	
	.continue-button {
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
	}
	
	.continue-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
	}
	
	.continue-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}

	/* Step Content */
	.step-content {
		flex: 1;
		padding-bottom: 2rem;
	}
	
	/* Review Card */
	.review-card {
		background: white;
		border-radius: 16px;
		padding: 2rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		border: 1px solid #f1f5f9;
	}
	
	.review-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.review-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}
	
	.review-header p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}
	
	.review-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.review-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}
	
	.review-item.fuel-highlight {
		background: linear-gradient(135deg, #fef3e2, #fed7aa);
		border-color: #f97316;
		box-shadow: 0 2px 8px rgba(249, 115, 22, 0.1);
	}
	
	.review-item.odometer-group {
		align-items: flex-start;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.item-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.item-value {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		text-align: right;
	}
	
	.fuel-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #f97316;
	}
	
	.odometer-values {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}
	
	.odo-arrow {
		color: #f97316;
		font-weight: 700;
	}
	
	.odo-end {
		color: #f97316;
	}


	/* Submit Container */
	.submit-container {
		padding: 2rem 0 0;
	}
	
	.submit-button {
		width: 100%;
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
		border: none;
		padding: 1.25rem 2rem;
		border-radius: 16px;
		font-size: 1.125rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 8px 24px rgba(249, 115, 22, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
	
	.submit-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(249, 115, 22, 0.4);
	}
	
	.submit-button:disabled {
		background: #9ca3af;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		cursor: not-allowed;
		transform: none;
	}
	
	.submit-loader {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	/* Validation Errors */
	.validation-errors {
		margin-top: 1.5rem;
	}
	
	.error-card {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-left: 4px solid #ef4444;
		border-radius: 12px;
		padding: 1.5rem;
	}
	
	.error-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #fecaca;
	}
	
	.error-icon {
		font-size: 1.25rem;
	}
	
	.error-header h3 {
		color: #dc2626;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}
	
	.error-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.error-item {
		color: #dc2626;
		font-size: 0.875rem;
		padding: 0.25rem 0;
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
			gap: 1rem;
		}
		
		.dashboard-header {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0.5rem;
		}

		.header-content h1 {
			font-size: 1.75rem;
		}
		
		
		.step-container {
			padding: 1rem;
			gap: 1rem;
			max-width: 100%;
		}
		
		
		.step-nav {
			gap: 0.75rem;
		}
		
		:global(.nav-button) {
			padding: 0.625rem 1.25rem !important;
			font-size: 0.875rem !important;
		}
		
		.continue-button {
			padding: 0.625rem 1.25rem;
			font-size: 0.875rem;
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
			padding: 1rem 1.5rem;
			font-size: 1rem;
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
		.workflow-header {
			padding: 1.25rem 0 0.75rem;
		}
		
		.workflow-header h1 {
			font-size: 1.25rem;
		}
		
		.step-container {
			padding: 0.75rem;
		}
		
		.keyboard-hints {
			margin: 1rem 0.75rem 0;
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