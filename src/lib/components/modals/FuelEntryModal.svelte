<script lang="ts">
	import { onMount } from 'svelte';
	import FuelEntryWorkflow from '$lib/components/fuel/FuelEntryWorkflow.svelte';
	import { fuelEntryWorkflowStore, currentStep, workflowData } from '$lib/stores/fuel-entry-workflow';
	import { fuelEntryDraftStore } from '$lib/stores/fuel-entry-draft';

	interface Props {
		show: boolean;
		onClose: () => void;
		onSuccess?: () => void;
	}

	let { show = $bindable(false), onClose, onSuccess }: Props = $props();

	// Save workflow state to draft store
	function saveWorkflowState() {
		fuelEntryDraftStore.saveDraft($currentStep, $workflowData);
	}

	// Handle close with save
	function handleClose() {
		// Save current state before closing
		saveWorkflowState();
		onClose();
	}

	// Handle successful submission
	function handleSuccess() {
		// Clear draft on successful submission
		fuelEntryDraftStore.clearDraft();
		if (onSuccess) onSuccess();
		onClose();
	}

	// Restore draft when modal opens
	$effect(() => {
		if (show) {
			const draft = fuelEntryDraftStore.getDraft();
			if (draft.hasDraft && draft.currentStep > 0 && draft.data) {
				// Restore state automatically
				fuelEntryWorkflowStore.restoreState(draft.currentStep, draft.data);
			} else {
				// Start fresh if no draft
				fuelEntryWorkflowStore.reset();
			}
		}
	});

	// Save on every step change and data change
	$effect(() => {
		if (show && $currentStep > 0) {
			// Save whenever step or data changes
			saveWorkflowState();
		}
	});

	// Watch for successful submission (when currentStep goes back to 0 after being higher)
	let previousStep = $state(0);
	$effect(() => {
		// If we were on a higher step and now back at 0, submission was successful
		if (previousStep > 0 && $currentStep === 0 && show) {
			handleSuccess();
		}
		previousStep = $currentStep;
	});
</script>

{#if show}
	<!-- Modal Overlay -->
	<div class="modal-overlay" onclick={handleClose} role="presentation"></div>

	<!-- Modal Content -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<!-- Close Button -->
		<button class="close-btn" onclick={handleClose}>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/>
				<line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>

		<!-- Workflow Content -->
		<div class="workflow-container">
			<FuelEntryWorkflow />
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: white;
		z-index: 1001;
		overflow-y: auto;
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.close-btn {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1002;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		border: 1px solid #e5e7eb;
		color: #6b7280;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: white;
		color: #111827;
		border-color: #d1d5db;
		transform: scale(1.05);
	}

	.workflow-container {
		width: 100%;
		height: 100%;
		padding-bottom: 2rem;
	}

	/* Continue Prompt */
	.prompt-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		text-align: center;
	}

	.prompt-header {
		max-width: 400px;
	}

	.prompt-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: bounce 1s infinite;
	}

	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.prompt-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.prompt-header p {
		font-size: 1rem;
		color: #6b7280;
		margin: 0 0 2rem 0;
		line-height: 1.5;
	}

	.prompt-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.prompt-btn {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.prompt-btn.primary {
		background: linear-gradient(135deg, #f97316, #ea580c);
		color: white;
	}

	.prompt-btn.primary:hover {
		background: linear-gradient(135deg, #ea580c, #dc2626);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
	}

	.prompt-btn.secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.prompt-btn.secondary:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	@media (max-width: 640px) {
		.close-btn {
			top: 0.5rem;
			right: 0.5rem;
		}

		.prompt-actions {
			flex-direction: column-reverse;
			width: 100%;
			max-width: 300px;
		}

		.prompt-btn {
			width: 100%;
		}
	}

	/* Desktop - centered modal */
	@media (min-width: 768px) {
		.modal {
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 90%;
			max-width: 800px;
			height: auto;
			max-height: 90vh;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		}

		@keyframes slideUp {
			from {
				opacity: 0;
				transform: translate(-50%, -45%);
			}
			to {
				opacity: 1;
				transform: translate(-50%, -50%);
			}
		}

		.workflow-container {
			padding-bottom: 0;
		}
	}
</style>
