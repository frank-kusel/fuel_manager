<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Vehicle, Driver, Bowser, Activity, Field } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		entry: any;
		isOpen: boolean;
	}

	let { entry, isOpen }: Props = $props();

	const dispatch = createEventDispatcher();

	// Reference data
	let vehicles = $state<Vehicle[]>([]);
	let drivers = $state<Driver[]>([]);
	let bowsers = $state<Bowser[]>([]);
	let activities = $state<Activity[]>([]);
	let fields = $state<Field[]>([]);

	// Form state - will be populated from entry
	let selectedVehicleId = $state('');
	let selectedDriverId = $state('');
	let selectedBowserId = $state('');
	let selectedActivityId = $state('');
	let selectedFieldIds = $state<string[]>([]);
	let litresDispensed = $state('');
	let bowserReadingStart = $state(0);
	let odometerStart = $state('');
	let odometerEnd = $state('');
	let entryDate = $state('');
	let entryTime = $state('');

	// Track original values to detect changes
	let originalValues = $state<any>({});

	let isSaving = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');
	let cascadeResult = $state<{ updated_count: number } | null>(null);

	// Calculated bowser end reading
	let calculatedBowserEnd = $derived.by(() => {
		const litres = parseFloat(litresDispensed);
		if (!isNaN(litres) && !isNaN(bowserReadingStart)) {
			return bowserReadingStart + litres;
		}
		return bowserReadingStart;
	});

	// Initialize form when modal opens
	async function initializeForm() {
		if (!entry) return;

		isLoading = true;
		errorMessage = '';
		cascadeResult = null;

		try {
			await supabaseService.init();

			// Load reference data in parallel
			const [vehiclesRes, driversRes, bowsersRes, activitiesRes, fieldsRes] = await Promise.all([
				supabaseService.getVehicles(),
				supabaseService.getDrivers(),
				supabaseService.getBowsers(),
				supabaseService.getActivities(),
				supabaseService.getFields()
			]);

			vehicles = vehiclesRes.data || [];
			drivers = driversRes.data || [];
			bowsers = bowsersRes.data || [];
			activities = activitiesRes.data || [];
			fields = fieldsRes.data || [];

			// Load selected field IDs for this entry
			const { data: fieldData } = await supabaseService.client
				.from('fuel_entry_fields')
				.select('field_id')
				.eq('fuel_entry_id', entry.id);

			const loadedFieldIds = fieldData ? fieldData.map((f: any) => f.field_id) : [];

			// Pre-populate form with entry data - ensure we have the entry data
			selectedVehicleId = entry.vehicle_id || '';
			selectedDriverId = entry.driver_id || '';
			selectedBowserId = entry.bowser_id || '';
			selectedActivityId = entry.activity_id || '';
			selectedFieldIds = loadedFieldIds;
			litresDispensed = entry.litres_dispensed?.toFixed(1) || '';
			bowserReadingStart = entry.bowser_reading_start || 0;
			odometerStart = entry.odometer_start?.toFixed(1) || '';
			odometerEnd = entry.odometer_end?.toFixed(1) || '';
			entryDate = entry.entry_date || '';
			entryTime = entry.time || '';

			// Store original values for change detection
			originalValues = {
				vehicle_id: selectedVehicleId,
				driver_id: selectedDriverId,
				bowser_id: selectedBowserId,
				activity_id: selectedActivityId,
				litres_dispensed: entry.litres_dispensed || 0,
				bowser_reading_start: bowserReadingStart,
				bowser_reading_end: entry.bowser_reading_end || 0,
				odometer_start: entry.odometer_start || 0,
				odometer_end: entry.odometer_end || 0,
				entry_date: entryDate,
				time: entryTime,
				field_ids: [...loadedFieldIds]
			};
		} catch (error) {
			console.error('Failed to load form data:', error);
			errorMessage = 'Failed to load entry data';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (isOpen && entry) {
			initializeForm();
		}
	});

	async function handleSave() {
		if (isSaving) return;

		errorMessage = '';
		cascadeResult = null;
		isSaving = true;

		try {
			// Build updates object with only changed fields
			const updates: any = {};
			let hasChanges = false;

			// Check each field for changes
			if (selectedVehicleId !== originalValues.vehicle_id) {
				updates.vehicle_id = selectedVehicleId || null;
				hasChanges = true;
			}
			if (selectedDriverId !== originalValues.driver_id) {
				updates.driver_id = selectedDriverId || null;
				hasChanges = true;
			}
			if (selectedBowserId !== originalValues.bowser_id) {
				updates.bowser_id = selectedBowserId || null;
				hasChanges = true;
			}
			if (selectedActivityId !== originalValues.activity_id) {
				updates.activity_id = selectedActivityId || null;
				hasChanges = true;
			}
			if (parseFloat(odometerStart) !== originalValues.odometer_start) {
				updates.odometer_start = parseFloat(odometerStart);
				hasChanges = true;
			}
			if (parseFloat(odometerEnd) !== originalValues.odometer_end) {
				updates.odometer_end = parseFloat(odometerEnd);
				hasChanges = true;
			}
			if (entryDate !== originalValues.entry_date) {
				updates.entry_date = entryDate;
				hasChanges = true;
			}
			if (entryTime !== originalValues.time) {
				updates.time = entryTime;
				hasChanges = true;
			}

			// Check if litres changed (this affects bowser_reading_end)
			const newLitres = parseFloat(litresDispensed);
			const litresChanged = newLitres !== originalValues.litres_dispensed;

			if (litresChanged) {
				// Calculate new bowser end reading
				const newBowserEnd = bowserReadingStart + newLitres;

				// Use cascade function to update entry and cascade changes
				const result = await supabaseService.cascadeBowserReadings(
					entry.id,
					newBowserEnd
				);

				if (result.error) {
					throw new Error(result.error.message || 'Cascade update failed');
				}

				cascadeResult = result.data;
				hasChanges = true;
			}

			// Apply other updates if there are any (and litres didn't change, or as additional updates)
			if (hasChanges && Object.keys(updates).length > 0) {
				const { error } = await supabaseService.client
					.from('fuel_entries')
					.update(updates)
					.eq('id', entry.id);

				if (error) throw error;
			}

			// Check if field selections changed
			const fieldsChanged = JSON.stringify(selectedFieldIds.sort()) !== JSON.stringify(originalValues.field_ids.sort());

			if (fieldsChanged) {
				// Delete existing field associations
				await supabaseService.client
					.from('fuel_entry_fields')
					.delete()
					.eq('fuel_entry_id', entry.id);

				// Insert new field associations if any selected
				if (selectedFieldIds.length > 0) {
					const fieldAssociations = selectedFieldIds.map(fieldId => ({
						fuel_entry_id: entry.id,
						field_id: fieldId
					}));

					await supabaseService.client
						.from('fuel_entry_fields')
						.insert(fieldAssociations);
				}
				hasChanges = true;
			}

			if (!hasChanges) {
				errorMessage = 'No changes detected';
				isSaving = false;
				return;
			}

			// Success! Close modal and notify parent
			dispatch('saved', { cascadeResult });
			handleClose();
		} catch (error: any) {
			console.error('Failed to update fuel entry:', error);
			errorMessage = error.message || 'Failed to update fuel entry';
		} finally {
			isSaving = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	function toggleField(fieldId: string) {
		if (selectedFieldIds.includes(fieldId)) {
			selectedFieldIds = selectedFieldIds.filter(id => id !== fieldId);
		} else {
			selectedFieldIds = [...selectedFieldIds, fieldId];
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={handleClose}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Edit Fuel Entry</h2>
				<button class="close-btn" onclick={handleClose}>×</button>
			</div>

			<div class="modal-body">
				{#if isLoading}
					<div class="loading-state">
						<div class="spinner"></div>
						<p>Loading entry data...</p>
					</div>
				{:else}
					{#if errorMessage}
						<div class="error-banner">
							{errorMessage}
						</div>
					{/if}

					{#if cascadeResult}
						<div class="success-banner">
							✓ Entry updated successfully!
							{#if cascadeResult.updated_count > 0}
								Also updated {cascadeResult.updated_count} subsequent {cascadeResult.updated_count === 1 ? 'entry' : 'entries'}.
							{/if}
						</div>
					{/if}

					<!-- Primary Edit: Litres Dispensed -->
					<div class="primary-field">
						<label>Fuel Used (Litres)</label>
						<input
							type="number"
							step="0.1"
							bind:value={litresDispensed}
							class="litres-input"
							placeholder="0.0"
							autocomplete="off"
						/>
						<div class="bowser-calc">
							<span class="calc-label">Bowser:</span>
							<span class="calc-value">{bowserReadingStart.toFixed(1)}L → {calculatedBowserEnd.toFixed(1)}L</span>
						</div>
					</div>

					<!-- Secondary Fields (Collapsed by Default) -->
					<details class="details-section">
						<summary>Additional Details</summary>

					<div class="details-content">
						<!-- Date & Time -->
						<div class="form-row">
							<div class="form-group">
								<label>Date</label>
								<input type="date" bind:value={entryDate} />
							</div>
							<div class="form-group">
								<label>Time</label>
								<input type="time" bind:value={entryTime} />
							</div>
						</div>

						<!-- Vehicle & Driver -->
						<div class="form-row">
							<div class="form-group">
								<label>Vehicle</label>
								<select bind:value={selectedVehicleId}>
									<option value="">Select Vehicle</option>
									{#each vehicles as vehicle}
										<option value={vehicle.id}>{vehicle.name} ({vehicle.code})</option>
									{/each}
								</select>
							</div>
							<div class="form-group">
								<label>Driver</label>
								<select bind:value={selectedDriverId}>
									<option value="">Select Driver</option>
									{#each drivers as driver}
										<option value={driver.id}>{driver.name} ({driver.employee_code})</option>
									{/each}
								</select>
							</div>
						</div>

						<!-- Bowser & Activity -->
						<div class="form-row">
							<div class="form-group">
								<label>Bowser</label>
								<select bind:value={selectedBowserId}>
									<option value="">Select Bowser</option>
									{#each bowsers as bowser}
										<option value={bowser.id}>{bowser.name} - {bowser.fuel_type}</option>
									{/each}
								</select>
							</div>
							<div class="form-group">
								<label>Activity</label>
								<select bind:value={selectedActivityId}>
									<option value="">Select Activity</option>
									{#each activities as activity}
										<option value={activity.id}>{activity.name}</option>
									{/each}
								</select>
							</div>
						</div>

						<!-- Odometer -->
						<div class="form-row">
							<div class="form-group">
								<label>Odometer Start</label>
								<input type="number" step="0.1" bind:value={odometerStart} />
							</div>
							<div class="form-group">
								<label>Odometer End</label>
								<input type="number" step="0.1" bind:value={odometerEnd} />
							</div>
						</div>

						<!-- Fields -->
						<div class="form-group">
							<label>Fields/Zones</label>
							<div class="field-chips">
								{#each fields as field}
									<button
										class="field-chip"
										class:selected={selectedFieldIds.includes(field.id)}
										onclick={() => toggleField(field.id)}
									>
										{field.name}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</details>
				{/if}
			</div>

			<div class="modal-footer">
				<Button variant="secondary" onclick={handleClose}>Cancel</Button>
				<Button variant="primary" onclick={handleSave} disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
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
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		backdrop-filter: blur(2px);
	}

	.modal-content {
		background: white;
		border-radius: 1rem;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		background: white;
		z-index: 10;
		border-radius: 1rem 1rem 0 0;
	}

	.modal-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.modal-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-state p {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	.error-banner {
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
	}

	.success-banner {
		background: #d1fae5;
		border: 1px solid #6ee7b7;
		color: #065f46;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.625rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.form-group input,
	.form-group select {
		padding: 0.5rem 0.625rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.15s;
		background: white;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.form-group input:disabled {
		background: #f9fafb;
		color: #9ca3af;
		cursor: not-allowed;
	}

	/* Primary Field - Litres Dispensed */
	.primary-field {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		padding: 1.25rem;
		border-radius: 0.625rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.primary-field label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.95);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.075em;
	}

	.litres-input {
		width: 100%;
		padding: 0.875rem 1rem;
		font-size: 2rem;
		font-weight: 700;
		text-align: center;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.15);
		color: white;
		backdrop-filter: blur(10px);
		transition: all 0.2s;
	}

	.litres-input:focus {
		outline: none;
		border-color: white;
		background: rgba(255, 255, 255, 0.25);
	}

	.litres-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.bowser-calc {
		margin-top: 0.75rem;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 0.375rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		backdrop-filter: blur(10px);
	}

	.bowser-calc .calc-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
	}

	.bowser-calc .calc-value {
		font-size: 0.875rem;
		color: white;
		font-weight: 600;
		font-family: 'Inter', monospace;
	}

	/* Collapsible Details Section */
	.details-section {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.details-section summary {
		padding: 0.75rem 0.875rem;
		background: #f9fafb;
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #6b7280;
		user-select: none;
		display: flex;
		align-items: center;
		transition: all 0.15s;
	}

	.details-section summary:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.details-section summary::marker {
		color: #9ca3af;
	}

	.details-section[open] summary {
		background: #f3f4f6;
		border-bottom: 1px solid #e5e7eb;
	}

	.details-content {
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: white;
	}

	.field-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.field-chip {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.field-chip:hover {
		border-color: #2563eb;
		background: #eff6ff;
	}

	.field-chip.selected {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.625rem;
		padding: 0.875rem 1rem;
		border-top: 1px solid #e5e7eb;
		position: sticky;
		bottom: 0;
		background: #fafafa;
		border-radius: 0 0 1rem 1rem;
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}

		.modal-content {
			max-height: 100vh;
			border-radius: 0;
		}

		.modal-header,
		.modal-footer {
			border-radius: 0;
		}
	}
</style>
