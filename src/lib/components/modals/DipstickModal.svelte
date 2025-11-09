<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';

	interface Props {
		show: boolean;
		onClose: () => void;
		onSuccess?: () => void;
	}

	let { show = $bindable(false), onClose, onSuccess }: Props = $props();

	// Form fields
	let dipstickReading = $state('');
	let dipstickDate = $state(new Date().toISOString().split('T')[0]);
	let dipstickNotes = $state('');
	let submitting = $state(false);

	async function submitDipstickReading() {
		if (!dipstickReading) return;

		submitting = true;
		try {
			await supabaseService.init();
			const result = await supabaseService.addTankReading({
				reading_value: parseFloat(dipstickReading),
				reading_date: dipstickDate,
				notes: dipstickNotes || null
			});

			if (!result.error) {
				// Reset form
				dipstickReading = '';
				dipstickNotes = '';
				dipstickDate = new Date().toISOString().split('T')[0];

				// Call success callback
				if (onSuccess) onSuccess();

				// Close modal
				onClose();
			} else {
				alert('Failed to save reading: ' + result.error);
			}
		} catch (error) {
			alert('Failed to save reading');
		}
		submitting = false;
	}

	function handleClose() {
		// Reset form
		dipstickReading = '';
		dipstickNotes = '';
		dipstickDate = new Date().toISOString().split('T')[0];
		onClose();
	}
</script>

{#if show}
	<div class="modal-overlay" onclick={handleClose}></div>
	<div class="modal">
		<div class="modal-header">
			<h3>New Dipstick Reading</h3>
			<button class="close-btn" onclick={handleClose}>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>

		<div class="modal-body">
			<div class="form-group">
				<label>Reading (Litres)</label>
				<input
					type="number"
					bind:value={dipstickReading}
					placeholder="Enter dipstick reading"
					step="0.1"
					autofocus
				/>
			</div>
			<div class="form-group">
				<label>Date</label>
				<input type="date" bind:value={dipstickDate} />
			</div>
			<div class="form-group">
				<label>Notes (Optional)</label>
				<input
					type="text"
					bind:value={dipstickNotes}
					placeholder="Any observations"
				/>
			</div>
		</div>

		<div class="modal-footer">
			<Button
				variant="secondary"
				onclick={handleClose}
			>
				Cancel
			</Button>
			<Button
				onclick={submitDipstickReading}
				disabled={submitting || !dipstickReading}
			>
				{submitting ? 'Saving...' : 'Save Reading'}
			</Button>
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
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		z-index: 1001;
		width: calc(100% - 2rem);
		max-width: 500px;
		max-height: 90vh;
		overflow: auto;
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -45%);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.form-group input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	@media (max-width: 640px) {
		.modal {
			bottom: 0;
			top: auto;
			transform: translate(-50%, 0);
			border-radius: 16px 16px 0 0;
			max-height: 85vh;
		}

		@keyframes slideIn {
			from {
				opacity: 0;
				transform: translate(-50%, 100%);
			}
			to {
				opacity: 1;
				transform: translate(-50%, 0);
			}
		}

		.modal-footer {
			flex-direction: column-reverse;
		}

		.modal-footer :global(button) {
			width: 100%;
		}
	}
</style>
