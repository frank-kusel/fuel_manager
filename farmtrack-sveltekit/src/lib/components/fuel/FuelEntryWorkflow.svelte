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
	<!-- Workflow Stepper - Hidden for mobile to save space -->
	<!-- <WorkflowStepper 
		steps={$fuelEntryWorkflowStore.steps}
		currentStep={$currentStep}
		progress={$workflowProgress}
		onStepClick={handleStepClick}
	/> -->
	
	<!-- Step Content -->
	<div class="step-content">
		{#if $currentStep === 0}
			<!-- Vehicle Selection -->
			<VehicleSelection
				selectedVehicle={$workflowData.vehicle}
				onVehicleSelect={(vehicle) => {
					console.log('Vehicle selected:', vehicle);
					fuelEntryWorkflowStore.setVehicle(vehicle);
				}}
				onAutoAdvance={handleAutoAdvance}
				errors={getCurrentStepErrors()}
			/>
		{:else if $currentStep === 1}
			<!-- Driver Selection -->
			<div class="driver-step">
				<div class="step-header">
					<h2>Driver</h2>
				</div>
				
				<!-- Navigation Controls - Driver auto-advances, only show back button -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
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
			<div class="activity-step">
				<div class="step-header">
					<h2>Activity</h2>
				</div>
				
				<!-- Navigation Controls - Activity auto-advances, only show back button -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
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
			<div class="location-step">
				<div class="step-header">
					<h2>Location</h2>
				</div>
				
				<!-- Navigation Controls - Location auto-advances or skip, only show back button -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
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
			<div class="odometer-step">
				<div class="step-header">
					<h2>Odometer</h2>
				</div>
				
				<!-- Navigation Controls -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
						>
							← Back
						</Button>
					{/if}
					
					<div class="manual-controls">
						<button
							onclick={() => {
								if ($canProceedToNext) {
									handleNext();
								}
							}}
							style="
								background-color: {$canProceedToNext ? '#16a34a' : '#9ca3af'}; 
								color: white; 
								border: none; 
								padding: 0.75rem 1.5rem; 
								border-radius: 0.5rem; 
								font-weight: 600;
								cursor: {$canProceedToNext ? 'pointer' : 'not-allowed'};
							"
						>
							Continue →
						</button>
					</div>
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
			<div class="fuel-step">
				<div class="step-header">
					<h2>Fuel</h2>
				</div>
				
				<!-- Navigation Controls -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
						>
							← Back
						</Button>
					{/if}
					
					<div class="manual-controls">
						<button
							onclick={() => {
								if ($canProceedToNext) {
									handleNext();
								}
							}}
							style="
								background-color: {$canProceedToNext ? '#16a34a' : '#9ca3af'}; 
								color: white; 
								border: none; 
								padding: 0.75rem 1.5rem; 
								border-radius: 0.5rem; 
								font-weight: 600;
								cursor: {$canProceedToNext ? 'pointer' : 'not-allowed'};
							"
						>
							Continue →
						</button>
					</div>
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
			<div class="review-step">
				<div class="step-header">
					<h2>Review</h2>
				</div>
				
				<!-- Navigation Controls - Only back button -->
				<div class="workflow-controls">
					{#if $canGoBackToPrevious}
						<Button 
							variant="outline" 
							onclick={handlePrevious}
							class="back-button"
						>
							← Back
						</Button>
					{/if}
				</div>
				
				<!-- Summary Table -->
				<div class="summary">
					<div class="summary-header">
						<div class="summary-title">FUEL ENTRY SUMMARY</div>
						<div class="summary-date">{new Date().toLocaleString()}</div>
					</div>
					
					<div class="summary-body">
						<table class="summary-table">
							<tbody>
								<!-- Vehicle -->
								{#if $workflowData.vehicle}
									<tr class="section-header"><td colspan="2">VEHICLE</td></tr>
									<tr><td>Name</td><td>{$workflowData.vehicle.name || `${$workflowData.vehicle.make || ''} ${$workflowData.vehicle.model || ''}`.trim() || 'Unnamed'}</td></tr>
									<tr><td>Code</td><td>{$workflowData.vehicle.code}</td></tr>
									{#if $workflowData.vehicle.registration || $workflowData.vehicle.registration_number}
										<tr><td>Registration</td><td>{$workflowData.vehicle.registration || $workflowData.vehicle.registration_number}</td></tr>
									{/if}
								{/if}
								
								<!-- Driver -->
								{#if $workflowData.driver}
									<tr class="section-header"><td colspan="2">DRIVER</td></tr>
									<tr><td>Name</td><td>{$workflowData.driver.name}</td></tr>
									{#if $workflowData.driver.employee_code}
										<tr><td>Code</td><td>#{$workflowData.driver.employee_code}</td></tr>
									{/if}
								{/if}
								
								<!-- Activity -->
								{#if $workflowData.activity}
									<tr class="section-header"><td colspan="2">ACTIVITY</td></tr>
									<tr><td>Activity</td><td>{$workflowData.activity.name}</td></tr>
									<tr><td>Code</td><td>{$workflowData.activity.code}</td></tr>
								{/if}
								
								<!-- Location (Field or Zone - Optional) -->
								{#if $workflowData.field}
									<tr class="section-header"><td colspan="2">LOCATION</td></tr>
									<tr><td>Field</td><td>{$workflowData.field.code} - {$workflowData.field.name}</td></tr>
									{#if $workflowData.field.crop_type}<tr><td>Crop</td><td>{$workflowData.field.crop_type}</td></tr>{/if}
								{:else if $workflowData.zone}
									<tr class="section-header"><td colspan="2">LOCATION</td></tr>
									<tr><td>Zone</td><td>{$workflowData.zone.code} - {$workflowData.zone.name}</td></tr>
									{#if $workflowData.zone.description}<tr><td>Description</td><td>{$workflowData.zone.description}</td></tr>{/if}
								{/if}
								
								<!-- Odometer -->
								{#if $workflowData.gaugeWorking && $workflowData.odometerStart !== null && $workflowData.odometerEnd !== null}
									<tr class="section-header"><td colspan="2">ODOMETER</td></tr>
									<tr><td>Start</td><td>{new Intl.NumberFormat().format($workflowData.odometerStart)} km</td></tr>
									<tr><td>End</td><td>{new Intl.NumberFormat().format($workflowData.odometerEnd)} km</td></tr>
									<tr class="highlight"><td>Distance</td><td>{new Intl.NumberFormat().format($workflowData.odometerEnd - $workflowData.odometerStart)} km</td></tr>
								{:else if !$workflowData.gaugeWorking}
									<tr class="section-header"><td colspan="2">ODOMETER</td></tr>
									<tr><td>Status</td><td class="warning">Gauge broken</td></tr>
								{/if}
								
								<!-- Fuel -->
								{#if $workflowData.bowser && $workflowData.litresDispensed}
									<tr class="section-header"><td colspan="2">FUEL</td></tr>
									<tr><td>Bowser</td><td>{$workflowData.bowser.name}</td></tr>
									<tr><td>Type</td><td>{$workflowData.bowser.fuel_type.charAt(0).toUpperCase() + $workflowData.bowser.fuel_type.slice(1)}</td></tr>
									{#if $workflowData.bowserReadingStart !== null && $workflowData.bowserReadingEnd !== null}
										<tr><td>Start reading</td><td>{new Intl.NumberFormat().format($workflowData.bowserReadingStart)}L</td></tr>
										<tr><td>End reading</td><td>{new Intl.NumberFormat().format($workflowData.bowserReadingEnd)}L</td></tr>
									{/if}
									<tr class="total"><td><strong>LITRES DISPENSED</strong></td><td><strong>{new Intl.NumberFormat().format($workflowData.litresDispensed)}L</strong></td></tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>
				
				{#if getCurrentStepErrors().length > 0}
					<div class="validation-errors">
						<Card class="error-card">
							<div class="error-header">
								<span class="error-icon">⚠️</span>
								<h3>Please complete all required steps</h3>
							</div>
							<div class="error-list">
								{#each getCurrentStepErrors() as error}
									<div class="error-item">{error}</div>
								{/each}
							</div>
						</Card>
					</div>
				{/if}

				<!-- Big Submit Button at Bottom -->
				<div class="bottom-submit-container">
					<button
						class="bottom-submit-button"
						onclick={() => {
							if ($canProceedToNext && !$isSubmittingEntry) {
								handleSubmit();
							}
						}}
						style="
							background-color: {$canProceedToNext && !$isSubmittingEntry ? '#16a34a' : '#9ca3af'}; 
							color: white; 
							border: none; 
							padding: 1.25rem 2rem; 
							border-radius: 0.75rem; 
							font-weight: 700;
							font-size: 1.125rem;
							width: 100%;
							cursor: {$canProceedToNext && !$isSubmittingEntry ? 'pointer' : 'not-allowed'};
							transition: all 0.2s;
							margin-top: 2rem;
						"
					>
						{$isSubmittingEntry ? 'Submitting...' : 'Submit'}
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
		max-width: 900px;
		margin: 0 auto;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		/* Ensure no extra spacing at top */
		margin-top: 0;
		padding-top: 0;
	}

	/* Step Content */
	.step-content {
		min-height: auto;
	}

	/* Optional/Placeholder Steps */
	.optional-step,
	.driver-step,
	.activity-step,
	.location-step,
	.field-step,
	.odometer-step,
	.fuel-step {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.step-header {
		text-align: center;
		margin-bottom: 0.5rem;
		position: relative;
	}

	.step-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--gray-900, #0f172a);
		margin: 0;
	}

	.optional-badge {
		display: inline-block;
		background: #10b981;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		margin-top: 0.5rem;
	}

	:global(.optional-step-card),
	:global(.odometer-card),
	:global(.fuel-card) {
		padding: 2rem;
		text-align: center;
		border: 2px dashed var(--color-border);
		background: var(--color-background-secondary);
	}

	.optional-content,
	.odometer-content,
	.fuel-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.optional-icon,
	.odometer-icon,
	.fuel-icon {
		font-size: 2.5rem;
		opacity: 0.7;
	}

	.optional-text h3,
	.odometer-text h3,
	.fuel-text h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.optional-text p,
	.odometer-text p,
	.fuel-text p {
		color: var(--color-text-secondary);
		max-width: 400px;
		margin: 0;
	}

	/* Simple Table Summary */
	.summary {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		max-width: 400px;
		margin: 0 auto;
	}

	.summary-header {
		padding: 1rem;
		text-align: center;
		border-bottom: 1px solid #e2e8f0;
	}

	.summary-title {
		font-size: 1rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		letter-spacing: 0.05em;
	}

	.summary-date {
		font-size: 0.75rem;
		color: #666;
	}

	.summary-body {
		padding: 0;
	}

	.summary-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	.summary-table td {
		padding: 0.25rem 0.75rem;
		border: none;
		vertical-align: top;
	}

	.summary-table td:first-child {
		width: 40%;
		font-weight: normal;
		color: #666;
	}

	.summary-table td:last-child {
		width: 60%;
		font-weight: bold;
		text-align: right;
	}

	.section-header td {
		padding: 0.5rem 0.75rem 0.25rem !important;
		font-weight: bold;
		text-align: left !important;
		color: #000 !important;
		font-size: 0.85rem;
		border-top: 1px solid #ddd;
		background: #f8f8f8;
	}

	.section-header:first-child td {
		border-top: none;
	}

	.summary-table tr.highlight td {
		background: #f3f4f6;
		font-weight: bold;
	}

	.summary-table tr.total {
		border-top: 1px solid #000;
		border-bottom: 1px solid #000;
	}

	.summary-table tr.total td {
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		font-weight: bold;
	}

	.warning {
		color: #666 !important;
		font-style: italic;
	}

	/* Notes Section */
	.notes-section {
		margin-top: 1rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-top: 1px solid #e2e8f0;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	.notes-header {
		padding: 0.5rem 0.75rem;
		font-weight: bold;
		font-size: 0.85rem;
		background: #f8f8f8;
		border-bottom: 1px solid #ddd;
	}

	.notes-textarea {
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 0;
		font-size: 0.8rem;
		font-family: inherit;
		background: white;
		color: #000;
		resize: vertical;
		min-height: 60px;
		outline: none;
	}

	.notes-textarea::placeholder {
		color: #999;
		font-style: italic;
	}

	/* Review Step */
	.review-step {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.review-sections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	:global(.review-section) {
		border-left: 4px solid var(--color-primary);
	}

	.review-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.review-icon {
		font-size: 1.25rem;
	}

	.review-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.review-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.detail-item .label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.detail-item .value {
		color: var(--color-text-primary);
		font-weight: 600;
		text-align: right;
	}

	.distance-highlight {
		background: var(--color-primary-100);
		color: var(--color-primary-800);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.fuel-highlight {
		background: var(--color-success-100);
		color: var(--color-success-800);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}


	.warning-text {
		color: var(--color-warning-600);
		font-style: italic;
	}

	:global(.review-section.warning) {
		border-left-color: var(--color-warning);
		background: var(--color-warning-50);
	}

	:global(.review-section.fuel-summary) {
		border-left-color: var(--color-success);
		background: var(--color-success-50);
	}

	/* Notes Section */
	.notes-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.notes-icon {
		font-size: 1.25rem;
	}

	.notes-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.notes-input textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--color-background);
		color: var(--color-text-primary);
		resize: vertical;
		min-height: 80px;
	}

	.notes-input textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
	}

	.notes-input textarea::placeholder {
		color: var(--color-text-muted);
	}

	/* Validation Errors */
	.validation-errors {
		margin-top: 1rem;
	}

	:global(.error-card) {
		background: var(--color-error-50);
		border: 1px solid var(--color-error-200);
		border-left: 4px solid var(--color-error);
	}

	.error-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-error-200);
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-header h3 {
		color: var(--color-error-700);
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
		color: var(--color-error-600);
		font-size: 0.875rem;
		padding: 0.25rem 0;
	}

	/* Workflow Controls */
	.workflow-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		margin: 0 0 0.5rem 0;
		min-height: 36px;
	}

	.manual-controls {
		display: flex;
		gap: 1rem;
		margin-left: auto;
	}

	:global(.back-button) {
		min-width: 100px;
		border-radius: 25px;
		border: 1px solid var(--color-border) !important;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	:global(.continue-button),
	:global(.submit-button) {
		min-width: 140px;
		border-radius: 25px;
		font-weight: 600;
		padding: 0.6rem 1.1rem;
	}



	:global(.submit-button) {
		background: var(--color-success);
		border-color: var(--color-success);
	}

	:global(.submit-button:hover:not(:disabled)) {
		background: var(--color-success-600);
		border-color: var(--color-success-600);
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
		border-radius: 16px;
		padding: 2rem;
		max-width: 320px;
		margin: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: slideUp 0.3s ease-out;
	}

	.success-content {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.success-icon {
		font-size: 2.5rem;
	}

	.success-content h3 {
		color: #16a34a;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.success-content p {
		color: #64748b;
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.4;
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
			gap: 0.5rem;
			max-width: 100%;
		}

		.step-content {
			padding: 0;
		}

		/* Mobile adjustments */
		.summary {
			max-width: 100%;
			margin: 0;
			border-left: none;
			border-right: none;
		}

		.notes-section {
			max-width: 100%;
			margin-left: 0;
			margin-right: 0;
			border-left: none;
			border-right: none;
		}

		.summary-table {
			font-size: 0.75rem;
		}

		.summary-table td {
			padding: 0.2rem 0.5rem;
		}

		.notes-textarea {
			padding: 0.5rem;
			font-size: 0.75rem;
			min-height: 50px;
		}

		/* Review sections */
		.review-sections {
			gap: 0.75rem;
		}

		:global(.review-section) {
			padding: 1rem;
			border-radius: 0.5rem;
		}

		.review-header {
			margin-bottom: 0.75rem;
			padding-bottom: 0.5rem;
		}

		.detail-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			padding: 0.5rem 0;
		}

		.detail-item .value {
			text-align: left;
		}

		/* Notes section */
		.notes-input textarea {
			padding: 0.75rem;
			font-size: 0.875rem;
			border-radius: 0.5rem;
			min-height: 80px;
		}

		/* Controls */
		.workflow-controls {
			padding: 0.4rem;
			border-radius: 0.5rem;
			margin: 0 0 0.5rem 0;
			background: var(--color-background);
			border: 1px solid var(--color-border);
		}

		:global(.back-button) {
			min-width: 80px;
			padding: 0.55rem 0.9rem;
			height: 36px;
			border-radius: 0.5rem;
			border: 1px solid var(--color-border) !important;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		}

		:global(.continue-button),
		:global(.submit-button) {
			min-width: 120px;
			padding: 0.55rem 1.1rem;
			height: 36px;
			border-radius: 0.5rem;
		}


		/* Error handling */
		:global(.error-card) {
			padding: 1rem;
			border-radius: 0.5rem;
		}

		/* Success modal */
		.success-modal {
			margin: 1rem;
			padding: 1.5rem;
			border-radius: 12px;
			max-width: calc(100vw - 2rem);
		}

		.success-content {
			gap: 0.5rem;
		}

		.success-icon {
			font-size: 2rem;
		}

		.success-content h3 {
			font-size: 1rem;
		}

		.success-content p {
			font-size: 0.8rem;
		}
	}

	/* Extra small mobile devices */
	@media (max-width: 480px) {
		.fuel-entry-workflow {
			padding: 0.125rem;
		}

		.workflow-controls {
			padding: 0.35rem;
		}

		.success-modal {
			margin: 0.5rem;
			padding: 1rem;
		}
		
		.keyboard-hints {
			margin-top: 0.5rem;
			font-size: 0.75rem;
		}
	}
	
	/* Keyboard Shortcuts Hint */
	.keyboard-hints {
		text-align: center;
		padding: 1rem 0;
		color: var(--gray-600);
		border-top: 1px solid var(--gray-200);
		margin-top: 2rem;
	}

	.keyboard-hints kbd {
		background: var(--gray-100);
		border: 1px solid var(--gray-300);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		font-family: monospace;
		font-weight: bold;
		color: var(--gray-700);
		margin: 0 0.125rem;
		display: inline-block;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
</style>