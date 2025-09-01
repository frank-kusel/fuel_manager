<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';

	// Props
	let { 
		startDate = '',
		endDate = '',
		onclose = () => {},
		onupdated = () => {}
	} = $props();

	// State
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let fuelEntries = $state([]);
	let displayedEntries = $state([]);
	let editingEntry = $state(null);
	let showBulkEdit = $state(false);

	// Lazy loading state
	let currentPage = $state(1);
	let entriesPerPage = $state(50);
	let hasMore = $state(true);
	let loadingMore = $state(false);

	// Bulk edit state
	let bulkUpdateType = $state('add');
	let bulkAdjustment = $state(0);
	let selectedEntries = $state(new Set());

	onMount(async () => {
		await loadFuelEntries();
		updateDisplayedEntries();
	});

	function updateDisplayedEntries() {
		const startIndex = 0;
		const endIndex = currentPage * entriesPerPage;
		displayedEntries = fuelEntries.slice(startIndex, endIndex);
		hasMore = endIndex < fuelEntries.length;
	}

	function loadMoreEntries() {
		if (!hasMore || loadingMore) return;
		
		loadingMore = true;
		currentPage++;
		
		// Simulate loading delay for better UX
		setTimeout(() => {
			updateDisplayedEntries();
			loadingMore = false;
		}, 200);
	}

	async function loadFuelEntries() {
		loading = true;
		error = '';
		
		try {
			await supabaseService.init();
			const result = await supabaseService.getFuelEntriesForPeriod(startDate, endDate);
			
			if (result.error) {
				error = result.error;
			} else {
				fuelEntries = result.data || [];
				currentPage = 1;
				updateDisplayedEntries();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load fuel entries';
		}
		
		loading = false;
	}

	async function saveEntry(entry) {
		saving = true;
		error = '';
		
		try {
			await supabaseService.init();
			const result = await supabaseService.updateFuelEntry(entry.id, {
				litres_dispensed: parseFloat(entry.litres_dispensed),
				bowser_reading_start: entry.bowser_reading_start ? parseFloat(entry.bowser_reading_start) : null,
				bowser_reading_end: entry.bowser_reading_end ? parseFloat(entry.bowser_reading_end) : null,
				notes: entry.notes
			});
			
			if (result.error) {
				error = result.error;
			} else {
				await loadFuelEntries();
				editingEntry = null;
				onupdated();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save entry';
		}
		
		saving = false;
	}

	async function performBulkUpdate() {
		if (selectedEntries.size === 0 || !bulkAdjustment) return;
		
		saving = true;
		error = '';
		
		try {
			await supabaseService.init();
			
			for (const entryId of selectedEntries) {
				const entry = fuelEntries.find(e => e.id === entryId);
				if (!entry) continue;
				
				let newAmount = entry.litres_dispensed;
				if (bulkUpdateType === 'add') {
					newAmount += parseFloat(bulkAdjustment);
				} else if (bulkUpdateType === 'subtract') {
					newAmount -= parseFloat(bulkAdjustment);
				} else if (bulkUpdateType === 'multiply') {
					newAmount *= parseFloat(bulkAdjustment);
				}
				
				// Ensure positive values
				newAmount = Math.max(0, newAmount);
				
				await supabaseService.updateFuelEntry(entryId, {
					litres_dispensed: newAmount,
					notes: `${entry.notes || ''} [Bulk adjusted: ${bulkUpdateType} ${bulkAdjustment}]`.trim()
				});
			}
			
			await loadFuelEntries();
			selectedEntries.clear();
			showBulkEdit = false;
			bulkAdjustment = 0;
			onupdated();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to perform bulk update';
		}
		
		saving = false;
	}

	function toggleEntrySelection(entryId) {
		if (selectedEntries.has(entryId)) {
			selectedEntries.delete(entryId);
		} else {
			selectedEntries.add(entryId);
		}
		// Trigger reactivity
		selectedEntries = new Set(selectedEntries);
	}

	function formatNumber(num) {
		if (num === null || num === undefined) return '-';
		return new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
	}

	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-ZA');
	}
</script>

<div class="fuel-editor-overlay" onclick={onclose}>
	<div class="fuel-editor-modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="header-content">
				<h2>Edit Fuel Entries</h2>
				<p>Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
			</div>
			<Button variant="outline" size="sm" onclick={onclose}>Close</Button>
		</div>

		{#if error}
			<div class="error-message">
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}

		{#if loading}
			<div class="loading">Loading fuel entries...</div>
		{:else if fuelEntries.length > 0}
			<div class="editor-content">
				<!-- Statistics Bar -->
				<div class="stats-bar">
					<div class="stat-item">
						<span class="stat-label">Total Entries:</span>
						<span class="stat-value">{fuelEntries.length.toLocaleString()}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Showing:</span>
						<span class="stat-value">{displayedEntries.length} of {fuelEntries.length}</span>
					</div>
				</div>

				<!-- Bulk Operations -->
				<div class="bulk-operations">
					<div class="bulk-header">
						<h3>Bulk Operations</h3>
						<div class="bulk-actions">
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => showBulkEdit = !showBulkEdit}
								disabled={selectedEntries.size === 0}
							>
								Bulk Edit ({selectedEntries.size})
							</Button>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => selectedEntries = new Set(displayedEntries.map(e => e.id))}
							>
								Select Visible
							</Button>
							<Button 
								variant="outline" 
								size="sm" 
								onclick={() => selectedEntries.clear()}
							>
								Clear Selection
							</Button>
						</div>
					</div>

					{#if showBulkEdit && selectedEntries.size > 0}
						<div class="bulk-edit-form">
							<div class="bulk-controls">
								<select bind:value={bulkUpdateType} class="bulk-select">
									<option value="add">Add</option>
									<option value="subtract">Subtract</option>
									<option value="multiply">Multiply by</option>
								</select>
								<input 
									type="number" 
									step="0.1" 
									bind:value={bulkAdjustment}
									placeholder="Amount"
									class="bulk-input"
								/>
								<Button 
									variant="primary" 
									size="sm"
									onclick={performBulkUpdate}
									disabled={saving || !bulkAdjustment}
								>
									{saving ? 'Applying...' : 'Apply'}
								</Button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Fuel Entries List -->
				<div class="entries-list">
					{#each displayedEntries as entry}
						<div class="entry-item" class:editing={editingEntry?.id === entry.id}>
							<div class="entry-header">
								<div class="entry-checkbox">
									<input 
										type="checkbox" 
										checked={selectedEntries.has(entry.id)}
										onchange={() => toggleEntrySelection(entry.id)}
									/>
								</div>
								<div class="entry-info">
									<div class="entry-date">{formatDate(entry.entry_date)} {entry.time}</div>
									<div class="entry-vehicle">
										{entry.vehicles?.code || 'Unknown'} - {entry.vehicles?.name || 'Vehicle'}
									</div>
								</div>
								<div class="entry-actions">
									{#if editingEntry?.id === entry.id}
										<Button variant="primary" size="sm" onclick={() => saveEntry(editingEntry)} disabled={saving}>
											{saving ? 'Saving...' : 'Save'}
										</Button>
										<Button variant="outline" size="sm" onclick={() => editingEntry = null}>
											Cancel
										</Button>
									{:else}
										<Button variant="outline" size="sm" onclick={() => editingEntry = {...entry}}>
											Edit
										</Button>
									{/if}
								</div>
							</div>

							{#if editingEntry?.id === entry.id}
								<div class="entry-edit-form">
									<div class="form-row">
										<div class="form-group">
											<label>Fuel Dispensed (L)</label>
											<input 
												type="number" 
												step="0.1" 
												bind:value={editingEntry.litres_dispensed}
												class="form-input"
											/>
										</div>
										<div class="form-group">
											<label>Bowser Start Reading</label>
											<input 
												type="number" 
												step="0.1" 
												bind:value={editingEntry.bowser_reading_start}
												class="form-input"
											/>
										</div>
										<div class="form-group">
											<label>Bowser End Reading</label>
											<input 
												type="number" 
												step="0.1" 
												bind:value={editingEntry.bowser_reading_end}
												class="form-input"
											/>
										</div>
									</div>
									<div class="form-group">
										<label>Notes</label>
										<textarea 
											bind:value={editingEntry.notes}
											class="form-textarea"
											rows="2"
											placeholder="Add notes about this edit..."
										></textarea>
									</div>
								</div>
							{:else}
								<div class="entry-details">
									<div class="detail-grid">
										<div class="detail-item">
											<span class="detail-label">Fuel Dispensed:</span>
											<span class="detail-value">{formatNumber(entry.litres_dispensed)}L</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Bowser Start:</span>
											<span class="detail-value">{formatNumber(entry.bowser_reading_start)}L</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Bowser End:</span>
											<span class="detail-value">{formatNumber(entry.bowser_reading_end)}L</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Driver:</span>
											<span class="detail-value">{entry.drivers?.name || 'Unknown'}</span>
										</div>
									</div>
									{#if entry.notes}
										<div class="entry-notes">
											<span class="notes-label">Notes:</span>
											<span class="notes-text">{entry.notes}</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}

					<!-- Load More Button -->
					{#if hasMore}
						<div class="load-more-section">
							<Button 
								variant="outline" 
								onclick={loadMoreEntries}
								disabled={loadingMore}
								class="load-more-btn"
							>
								{loadingMore ? 'Loading...' : `Load More (${fuelEntries.length - displayedEntries.length} remaining)`}
							</Button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>No fuel entries found for this period</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.fuel-editor-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.fuel-editor-modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 1000px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.header-content h2 {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.header-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
	}

	.loading, .empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
		font-style: italic;
	}

	.stats-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.stat-item {
		display: flex;
		gap: 0.5rem;
	}

	.stat-label {
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		color: #111827;
		font-weight: 600;
	}

	.editor-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.bulk-operations {
		margin-bottom: 2rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.bulk-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.bulk-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.bulk-actions {
		display: flex;
		gap: 0.5rem;
	}

	.bulk-edit-form {
		border-top: 1px solid #e5e7eb;
		padding-top: 1rem;
	}

	.bulk-controls {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
	}

	.bulk-select, .bulk-input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.bulk-input {
		max-width: 120px;
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.entry-item {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.entry-item.editing {
		border-color: #f97316;
		background: rgba(249, 115, 22, 0.02);
	}

	.entry-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
	}

	.entry-checkbox input {
		width: 16px;
		height: 16px;
	}

	.entry-info {
		flex: 1;
	}

	.entry-date {
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.entry-vehicle {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.entry-actions {
		display: flex;
		gap: 0.5rem;
	}

	.entry-edit-form {
		padding: 0 1rem 1rem;
		border-top: 1px solid #f3f4f6;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.form-input, .form-textarea {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 1px #f97316;
	}

	.entry-details {
		padding: 0 1rem 1rem;
		border-top: 1px solid #f3f4f6;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.detail-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.detail-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.entry-notes {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	.notes-label {
		font-weight: 600;
		color: #111827;
		margin-right: 0.5rem;
	}

	.notes-text {
		color: #6b7280;
	}

	.load-more-section {
		text-align: center;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
		background: #fafafa;
		border-radius: 0 0 8px 8px;
	}

	:global(.load-more-btn) {
		min-width: 200px;
	}

	@media (max-width: 768px) {
		.fuel-editor-overlay {
			padding: 0;
		}
		
		.fuel-editor-modal {
			border-radius: 0;
			max-height: 100vh;
		}
		
		.modal-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.bulk-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}
		
		.bulk-actions {
			justify-content: stretch;
		}
		
		.bulk-controls {
			grid-template-columns: 1fr;
		}
		
		.entry-header {
			grid-template-columns: auto 1fr;
			gap: 0.75rem;
		}
		
		.entry-actions {
			grid-column: 1 / -1;
			justify-content: stretch;
			margin-top: 0.75rem;
		}
		
		.form-row {
			grid-template-columns: 1fr;
		}
		
		.detail-grid {
			grid-template-columns: 1fr;
		}

		.stats-bar {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.stat-item {
			justify-content: space-between;
		}
	}
</style>