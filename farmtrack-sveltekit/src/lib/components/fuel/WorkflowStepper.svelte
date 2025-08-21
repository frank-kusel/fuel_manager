<script lang="ts">
	import type { FuelEntryWorkflowStep } from '$lib/stores/fuel-entry-workflow';
	
	interface Props {
		steps: FuelEntryWorkflowStep[];
		currentStep: number;
		progress: number;
		onStepClick?: (stepIndex: number) => void;
	}
	
	let { steps, currentStep, progress, onStepClick }: Props = $props();
</script>

<div class="workflow-stepper">
	<!-- Progress Bar -->
	<div class="progress-bar">
		<div class="progress-fill" style="width: {progress}%"></div>
	</div>
	
	<!-- Steps -->
	<div class="steps-container">
		{#each steps as step, index}
			<div 
				class="step-item"
				class:active={index === currentStep}
				class:completed={step.completed}
				class:valid={step.valid}
				class:clickable={onStepClick && (step.completed || index === currentStep)}
				onclick={onStepClick && (step.completed || index === currentStep) ? () => onStepClick(index) : undefined}
				role={onStepClick ? "button" : undefined}
				tabindex={onStepClick && (step.completed || index === currentStep) ? 0 : -1}
			>
				<div class="step-icon">
					{#if step.completed}
						✓
					{:else}
						{step.icon}
					{/if}
				</div>
				<div class="step-content">
					<div class="step-title">{step.title}</div>
					<div class="step-number">Step {index + 1}</div>
				</div>
				<div class="step-status">
					{#if step.completed}
						<div class="status-badge completed">✓</div>
					{:else if index === currentStep}
						<div class="status-badge active">•</div>
					{:else}
						<div class="status-badge pending">{index + 1}</div>
					{/if}
				</div>
			</div>
			
			{#if index < steps.length - 1}
				<div class="step-connector" class:completed={steps[index + 1].completed}></div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.workflow-stepper {
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	/* Progress Bar */
	.progress-bar {
		height: 4px;
		background: var(--color-background-secondary);
		border-radius: 2px;
		margin-bottom: 2rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary), var(--color-success));
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	/* Steps Container */
	.steps-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
		transition: all 0.2s ease;
		position: relative;
	}

	.step-item.clickable {
		cursor: pointer;
	}

	.step-item.clickable:hover {
		background: var(--color-background-secondary);
	}

	.step-item.active {
		background: var(--color-primary-50);
		border: 1px solid var(--color-primary-200);
	}

	.step-item.completed {
		background: var(--color-success-50);
		border: 1px solid var(--color-success-200);
	}

	.step-item.completed .step-icon {
		background: var(--color-success);
		color: white;
	}

	/* Step Icon */
	.step-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.125rem;
		font-weight: 600;
		background: var(--color-background-secondary);
		color: var(--color-text-secondary);
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	.step-item.active .step-icon {
		background: var(--color-primary);
		color: white;
		transform: scale(1.05);
	}

	/* Step Content */
	.step-content {
		flex: 1;
		min-width: 0;
	}

	.step-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.step-number {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.step-item.active .step-title {
		color: var(--color-primary-700);
	}

	.step-item.completed .step-title {
		color: var(--color-success-700);
	}

	/* Step Status */
	.step-status {
		flex-shrink: 0;
	}

	.status-badge {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge.completed {
		background: var(--color-success);
		color: white;
	}

	.status-badge.active {
		background: var(--color-primary);
		color: white;
		animation: pulse 2s infinite;
	}

	.status-badge.pending {
		background: var(--color-background-secondary);
		color: var(--color-text-secondary);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	/* Step Connector */
	.step-connector {
		height: 1px;
		background: var(--color-border);
		margin: 0 0 0 3.25rem;
		transition: all 0.2s ease;
	}

	.step-connector.completed {
		background: var(--color-success);
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.workflow-stepper {
			padding: 1rem;
		}

		.step-item {
			padding: 0.75rem;
		}

		.step-icon {
			width: 2rem;
			height: 2rem;
			font-size: 1rem;
		}

		.step-connector {
			margin-left: 2.5rem;
		}

		.step-title {
			font-size: 0.8rem;
		}

		.step-number {
			font-size: 0.7rem;
		}
	}
</style>