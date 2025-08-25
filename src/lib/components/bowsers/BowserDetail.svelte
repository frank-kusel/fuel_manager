<script lang="ts">
	import type { Bowser } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	
	interface Props {
		bowser: Bowser;
		onedit?: () => void;
		ondelete?: () => void;
		onback?: () => void;
	}
	
	let { bowser, onedit, ondelete, onback }: Props = $props();
	
	let newReading: number = $state(bowser.current_reading || 0);
	let isUpdatingReading = $state(false);
	let updateMessage = $state('');
	
	async function updateBowserReading() {
		if (newReading === bowser.current_reading) {
			updateMessage = 'No change in reading';
			setTimeout(() => updateMessage = '', 3000);
			return;
		}
		
		isUpdatingReading = true;
		updateMessage = '';
		
		try {
			const { default: supabaseService } = await import('$lib/services/supabase');
			await supabaseService.init();
			
			const result = await supabaseService.updateBowserReading(bowser.id, newReading);
			
			if (result.error) {
				updateMessage = `Error: ${result.error}`;
			} else {
				bowser.current_reading = newReading;
				updateMessage = 'Reading updated successfully';
			}
		} catch (error) {
			updateMessage = `Error: ${error instanceof Error ? error.message : 'Failed to update reading'}`;
		}
		
		isUpdatingReading = false;
		setTimeout(() => updateMessage = '', 5000);
	}
	
	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};
	
	const formatCapacity = (capacity: number) => {
		return new Intl.NumberFormat('en-ZA').format(capacity);
	};
</script>

<div class="bowser-detail">
	<div class="header">
		<div class="title-section">
			<Button onclick={onback} variant="ghost" size="sm">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12"></line>
					<polyline points="12 19 5 12 12 5"></polyline>
				</svg>
				Back
			</Button>
			<h2>{bowser.name}</h2>
			<div class="badges">
				<span class="badge code">{bowser.code}</span>
				<span class="badge" class:active={bowser.active} class:inactive={!bowser.active}>
					{bowser.active ? 'Active' : 'Inactive'}
				</span>
				{#if bowser.id.startsWith('temp_')}
					<span class="badge offline">Pending Sync</span>
				{/if}
			</div>
		</div>
		
		<div class="actions">
			{#if onedit}
				<Button onclick={onedit} variant="secondary" size="sm">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
					</svg>
					Edit
				</Button>
			{/if}
			{#if ondelete}
				<Button onclick={ondelete} variant="danger" size="sm">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6"></polyline>
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
					</svg>
					Delete
				</Button>
			{/if}
		</div>
	</div>
	
	<div class="content">
		<Card>
			<h3>Basic Information</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Bowser Code</span>
					<span class="value">{bowser.code}</span>
				</div>
				<div class="info-item">
					<span class="label">Bowser Name</span>
					<span class="value">{bowser.name}</span>
				</div>
				<div class="info-item">
					<span class="label">Registration</span>
					<span class="value">{bowser.registration}</span>
				</div>
				<div class="info-item">
					<span class="label">Fuel Type</span>
					<span class="value capitalize">{bowser.fuel_type}</span>
				</div>
				<div class="info-item">
					<span class="label">Status</span>
					<span class="value">
						<span class="status" class:active={bowser.active} class:inactive={!bowser.active}>
							{bowser.active ? 'Active' : 'Inactive'}
						</span>
					</span>
				</div>
			</div>
		</Card>
		
		<Card>
			<h3>Current Reading</h3>
			<div class="reading-section">
				<div class="current-reading">
					<span class="label">Current Reading</span>
					<span class="value reading-value">{bowser.current_reading?.toFixed(1) || '0.0'} L</span>
				</div>
				
				<div class="manual-override">
					<div class="override-header">
						<span class="label">Manual Override</span>
						<span class="description">Update reading manually (for broken bowser or missed entries)</span>
					</div>
					<div class="override-controls">
						<input 
							type="number" 
							bind:value={newReading}
							step="0.1"
							min="0"
							max={bowser.capacity}
							class="reading-input"
							disabled={isUpdatingReading}
						/>
						<Button 
							onclick={updateBowserReading}
							disabled={isUpdatingReading || newReading === bowser.current_reading}
							size="sm"
						>
							{isUpdatingReading ? 'Updating...' : 'Update Reading'}
						</Button>
					</div>
					{#if updateMessage}
						<div class="update-message" class:success={updateMessage.includes('success')} class:error={updateMessage.includes('Error')}>
							{updateMessage}
						</div>
					{/if}
				</div>
			</div>
		</Card>
		
		<Card>
			<h3>Specifications</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Capacity</span>
					<span class="value">{formatCapacity(bowser.capacity)} Liters</span>
				</div>
				<div class="info-item">
					<span class="label">Average Capacity</span>
					<span class="value">{formatCapacity(bowser.capacity)} L</span>
				</div>
			</div>
			{#if bowser.notes}
				<div class="notes-section">
					<span class="label">Notes</span>
					<p class="notes">{bowser.notes}</p>
				</div>
			{/if}
		</Card>
		
		<Card>
			<h3>Usage Statistics</h3>
			<div class="stats-grid">
				<div class="stat">
					<span class="stat-value">0</span>
					<span class="stat-label">Total Fills</span>
				</div>
				<div class="stat">
					<span class="stat-value">0 L</span>
					<span class="stat-label">Total Dispensed</span>
				</div>
				<div class="stat">
					<span class="stat-value">0</span>
					<span class="stat-label">This Month</span>
				</div>
				<div class="stat">
					<span class="stat-value">N/A</span>
					<span class="stat-label">Last Used</span>
				</div>
			</div>
		</Card>
		
		<Card>
			<h3>System Information</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Record ID</span>
					<span class="value mono">{bowser.id}</span>
				</div>
				<div class="info-item">
					<span class="label">Created</span>
					<span class="value">{formatDate(bowser.created_at)}</span>
				</div>
				<div class="info-item">
					<span class="label">Last Updated</span>
					<span class="value">{formatDate(bowser.updated_at)}</span>
				</div>
			</div>
		</Card>
	</div>
</div>

<style>
	.bowser-detail {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		height: 100%;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.title-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
	}
	
	h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}
	
	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.badge.code {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}
	
	.badge.active {
		background: var(--color-success-light);
		color: var(--color-success);
	}
	
	.badge.inactive {
		background: var(--color-error-light);
		color: var(--color-error);
	}
	
	.badge.offline {
		background: var(--color-warning-light);
		color: var(--color-warning);
	}
	
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex: 1;
		overflow-y: auto;
	}
	
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.value {
		font-size: 0.875rem;
		color: var(--color-text);
		font-weight: 500;
	}
	
	.value.mono {
		font-family: monospace;
		font-size: 0.75rem;
	}
	
	.capitalize {
		text-transform: capitalize;
	}
	
	.status {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.status.active {
		background: var(--color-success-light);
		color: var(--color-success);
	}
	
	.status.inactive {
		background: var(--color-error-light);
		color: var(--color-error);
	}
	
	.notes-section {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.notes {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1.5rem;
	}
	
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: center;
	}
	
	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-primary);
	}
	
	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	/* Reading Override Styles */
	.reading-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.current-reading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-background-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}
	
	.reading-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-primary);
	}
	
	.manual-override {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: #fefefe;
	}
	
	.override-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.description {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}
	
	.override-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	
	.reading-input {
		flex: 1;
		max-width: 200px;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	
	.reading-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
	}
	
	.reading-input:disabled {
		background: var(--color-background-secondary);
		color: var(--color-text-secondary);
	}
	
	.update-message {
		padding: 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.update-message.success {
		background: var(--color-success-light);
		color: var(--color-success);
		border: 1px solid var(--color-success);
	}
	
	.update-message.error {
		background: var(--color-error-light);
		color: var(--color-error);
		border: 1px solid var(--color-error);
	}
	
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
		}
		
		.info-grid {
			grid-template-columns: 1fr;
		}
		
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>