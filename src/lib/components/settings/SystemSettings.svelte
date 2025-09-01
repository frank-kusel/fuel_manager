<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';

	// Props
	let { 
		onclose = () => {}
	} = $props();

	// State
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');
	let settings = $state({
		tankCapacity: 24000,
		fuelPrice: 23.50,
		currency: 'ZAR',
		timezone: 'Africa/Johannesburg',
		reconciliationThresholds: {
			fuelVarianceLow: 50,
			fuelVarianceHigh: 200,
			tankVarianceLow: 1,
			tankVarianceHigh: 5
		},
		reportingDefaults: {
			defaultDateRange: 'week',
			includeDetails: true,
			groupBy: 'vehicle'
		},
		systemPreferences: {
			autoCleanupCache: true,
			cacheRetentionDays: 7,
			enableAuditLogging: true,
			showAdvancedFeatures: false
		}
	});
	let originalSettings = $state({});

	onMount(async () => {
		await loadSettings();
	});

	async function loadSettings() {
		loading = true;
		error = '';

		try {
			await supabaseService.init();
			
			// In a real implementation, you would load settings from database
			// For now, we'll use the default settings
			originalSettings = JSON.parse(JSON.stringify(settings));
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
		}

		loading = false;
	}

	async function saveSettings() {
		saving = true;
		error = '';

		try {
			await supabaseService.init();
			
			// In a real implementation, you would save settings to database
			// For now, we'll just simulate the save
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			originalSettings = JSON.parse(JSON.stringify(settings));
			onclose();
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save settings';
		}

		saving = false;
	}

	function resetSettings() {
		settings = JSON.parse(JSON.stringify(originalSettings));
	}

	function restoreDefaults() {
		settings = {
			tankCapacity: 24000,
			fuelPrice: 23.50,
			currency: 'ZAR',
			timezone: 'Africa/Johannesburg',
			reconciliationThresholds: {
				fuelVarianceLow: 50,
				fuelVarianceHigh: 200,
				tankVarianceLow: 1,
				tankVarianceHigh: 5
			},
			reportingDefaults: {
				defaultDateRange: 'week',
				includeDetails: true,
				groupBy: 'vehicle'
			},
			systemPreferences: {
				autoCleanupCache: true,
				cacheRetentionDays: 7,
				enableAuditLogging: true,
				showAdvancedFeatures: false
			}
		};
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-ZA', { 
			style: 'currency', 
			currency: settings.currency 
		}).format(amount);
	}

	const hasChanges = $derived(() => {
		return JSON.stringify(settings) !== JSON.stringify(originalSettings);
	});

	const currencyOptions = [
		{ value: 'ZAR', label: 'South African Rand (ZAR)' },
		{ value: 'USD', label: 'US Dollar (USD)' },
		{ value: 'EUR', label: 'Euro (EUR)' },
		{ value: 'GBP', label: 'British Pound (GBP)' }
	];

	const timezoneOptions = [
		{ value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'Eastern Time (ET)' },
		{ value: 'Europe/London', label: 'London (GMT)' }
	];

	const dateRangeOptions = [
		{ value: 'today', label: 'Today' },
		{ value: 'week', label: 'Last 7 Days' },
		{ value: 'thisWeek', label: 'This Week' },
		{ value: 'month', label: 'This Month' }
	];

	const groupByOptions = [
		{ value: 'vehicle', label: 'By Vehicle' },
		{ value: 'driver', label: 'By Driver' },
		{ value: 'date', label: 'By Date' },
		{ value: 'activity', label: 'By Activity' }
	];
</script>

<div class="settings-overlay" onclick={onclose}>
	<div class="settings-modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="header-content">
				<h2>System Settings</h2>
				<p>Configure operational parameters and system preferences</p>
			</div>
			<div class="header-actions">
				<Button variant="outline" size="sm" onclick={resetSettings} disabled={!hasChanges()}>
					Reset
				</Button>
				<Button variant="outline" size="sm" onclick={restoreDefaults}>
					Defaults
				</Button>
				<Button variant="outline" size="sm" onclick={onclose}>Close</Button>
			</div>
		</div>

		{#if error}
			<div class="error-message">
				<span class="error-icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}

		{#if loading}
			<div class="loading">Loading settings...</div>
		{:else}
			<div class="settings-content">
				<div class="settings-sections">
					<!-- Tank & Fuel Configuration -->
					<section class="settings-section">
						<h3>Tank & Fuel Configuration</h3>
						
						<div class="setting-group">
							<label for="tank-capacity">Tank Capacity (Liters)</label>
							<input 
								id="tank-capacity"
								type="number" 
								step="1" 
								min="1000"
								max="100000"
								bind:value={settings.tankCapacity}
								class="setting-input"
							/>
							<span class="setting-help">Total capacity of your main fuel tank</span>
						</div>

						<div class="setting-group">
							<label for="fuel-price">Current Fuel Price</label>
							<div class="input-with-currency">
								<input 
									id="fuel-price"
									type="number" 
									step="0.01" 
									min="0"
									bind:value={settings.fuelPrice}
									class="setting-input"
								/>
								<span class="currency-display">{settings.currency}</span>
							</div>
							<span class="setting-help">Price per liter for cost calculations</span>
						</div>

						<div class="setting-group">
							<label for="currency">Currency</label>
							<select id="currency" bind:value={settings.currency} class="setting-select">
								{#each currencyOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="setting-group">
							<label for="timezone">Timezone</label>
							<select id="timezone" bind:value={settings.timezone} class="setting-select">
								{#each timezoneOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</section>

					<!-- Reconciliation Thresholds -->
					<section class="settings-section">
						<h3>Reconciliation Thresholds</h3>
						<p class="section-description">Configure variance thresholds for confidence scoring</p>
						
						<div class="threshold-grid">
							<div class="setting-group">
								<label for="fuel-var-low">Fuel Variance - Low Threshold (L)</label>
								<input 
									id="fuel-var-low"
									type="number" 
									step="1" 
									min="0"
									bind:value={settings.reconciliationThresholds.fuelVarianceLow}
									class="setting-input"
								/>
								<span class="setting-help">Green indicator below this value</span>
							</div>

							<div class="setting-group">
								<label for="fuel-var-high">Fuel Variance - High Threshold (L)</label>
								<input 
									id="fuel-var-high"
									type="number" 
									step="1" 
									min="0"
									bind:value={settings.reconciliationThresholds.fuelVarianceHigh}
									class="setting-input"
								/>
								<span class="setting-help">Red indicator above this value</span>
							</div>

							<div class="setting-group">
								<label for="tank-var-low">Tank Variance - Low Threshold (%)</label>
								<input 
									id="tank-var-low"
									type="number" 
									step="0.1" 
									min="0"
									max="100"
									bind:value={settings.reconciliationThresholds.tankVarianceLow}
									class="setting-input"
								/>
								<span class="setting-help">Green indicator below this percentage</span>
							</div>

							<div class="setting-group">
								<label for="tank-var-high">Tank Variance - High Threshold (%)</label>
								<input 
									id="tank-var-high"
									type="number" 
									step="0.1" 
									min="0"
									max="100"
									bind:value={settings.reconciliationThresholds.tankVarianceHigh}
									class="setting-input"
								/>
								<span class="setting-help">Red indicator above this percentage</span>
							</div>
						</div>
					</section>

					<!-- Reporting Defaults -->
					<section class="settings-section">
						<h3>Reporting Defaults</h3>
						<p class="section-description">Default settings for reports and reconciliations</p>

						<div class="setting-group">
							<label for="default-range">Default Date Range</label>
							<select id="default-range" bind:value={settings.reportingDefaults.defaultDateRange} class="setting-select">
								{#each dateRangeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="setting-group">
							<label for="default-group">Default Group By</label>
							<select id="default-group" bind:value={settings.reportingDefaults.groupBy} class="setting-select">
								{#each groupByOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="setting-group checkbox-group">
							<label for="include-details">
								<input 
									id="include-details"
									type="checkbox" 
									bind:checked={settings.reportingDefaults.includeDetails}
								/>
								Include detailed breakdowns by default
							</label>
						</div>
					</section>

					<!-- System Preferences -->
					<section class="settings-section">
						<h3>System Preferences</h3>
						<p class="section-description">Advanced system behavior and performance settings</p>

						<div class="setting-group checkbox-group">
							<label for="auto-cleanup">
								<input 
									id="auto-cleanup"
									type="checkbox" 
									bind:checked={settings.systemPreferences.autoCleanupCache}
								/>
								Automatically cleanup old cache data
							</label>
						</div>

						<div class="setting-group">
							<label for="cache-retention">Cache Retention (Days)</label>
							<input 
								id="cache-retention"
								type="number" 
								step="1" 
								min="1"
								max="30"
								bind:value={settings.systemPreferences.cacheRetentionDays}
								class="setting-input"
								disabled={!settings.systemPreferences.autoCleanupCache}
							/>
							<span class="setting-help">How long to keep cached data before cleanup</span>
						</div>

						<div class="setting-group checkbox-group">
							<label for="audit-logging">
								<input 
									id="audit-logging"
									type="checkbox" 
									bind:checked={settings.systemPreferences.enableAuditLogging}
								/>
								Enable audit logging for data changes
							</label>
						</div>

						<div class="setting-group checkbox-group">
							<label for="advanced-features">
								<input 
									id="advanced-features"
									type="checkbox" 
									bind:checked={settings.systemPreferences.showAdvancedFeatures}
								/>
								Show advanced features and options
							</label>
						</div>
					</section>
				</div>

				<!-- Settings Summary -->
				<div class="settings-summary">
					<h4>Configuration Summary</h4>
					<div class="summary-grid">
						<div class="summary-item">
							<span class="summary-label">Tank Capacity:</span>
							<span class="summary-value">{settings.tankCapacity.toLocaleString()}L</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">Fuel Price:</span>
							<span class="summary-value">{formatCurrency(settings.fuelPrice)}/L</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">Fuel Thresholds:</span>
							<span class="summary-value">{settings.reconciliationThresholds.fuelVarianceLow}L - {settings.reconciliationThresholds.fuelVarianceHigh}L</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">Tank Thresholds:</span>
							<span class="summary-value">{settings.reconciliationThresholds.tankVarianceLow}% - {settings.reconciliationThresholds.tankVarianceHigh}%</span>
						</div>
					</div>

					{#if hasChanges()}
						<div class="unsaved-warning">
							<span class="warning-icon">⚠️</span>
							<span>You have unsaved changes</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="modal-footer">
				<Button variant="outline" onclick={onclose}>Cancel</Button>
				<Button 
					variant="primary" 
					onclick={saveSettings} 
					disabled={saving || !hasChanges()}
				>
					{saving ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		{/if}
	</div>
</div>

<style>
	.settings-overlay {
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

	.settings-modal {
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
		gap: 1rem;
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

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
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

	.loading {
		text-align: center;
		padding: 3rem 1.5rem;
		color: #6b7280;
		font-style: italic;
	}

	.settings-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
	}

	.settings-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		background: #fafafa;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.settings-section h3 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.section-description {
		margin: 0 0 1.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.setting-group {
		margin-bottom: 1.25rem;
	}

	.setting-group:last-child {
		margin-bottom: 0;
	}

	.setting-group label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.setting-input, .setting-select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.setting-input:focus, .setting-select:focus {
		outline: none;
		border-color: #f97316;
		box-shadow: 0 0 0 1px #f97316;
	}

	.setting-input:disabled {
		background: #f3f4f6;
		color: #9ca3af;
		cursor: not-allowed;
	}

	.input-with-currency {
		position: relative;
	}

	.currency-display {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
		pointer-events: none;
	}

	.setting-help {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-group input[type="checkbox"] {
		width: auto;
		margin: 0;
	}

	.threshold-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.settings-summary {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		height: fit-content;
		position: sticky;
		top: 0;
	}

	.settings-summary h4 {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.summary-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.summary-label {
		color: #6b7280;
		font-weight: 500;
	}

	.summary-value {
		color: #111827;
		font-weight: 600;
	}

	.unsaved-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem;
		background: #fef3c7;
		border: 1px solid #fcd34d;
		border-radius: 6px;
		color: #92400e;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	@media (max-width: 768px) {
		.settings-overlay {
			padding: 0;
		}
		
		.settings-modal {
			border-radius: 0;
			max-height: 100vh;
		}
		
		.modal-header {
			flex-direction: column;
			align-items: stretch;
		}

		.header-actions {
			justify-content: stretch;
		}
		
		.settings-content {
			grid-template-columns: 1fr;
			padding: 1rem;
		}

		.settings-summary {
			position: static;
		}

		.threshold-grid {
			grid-template-columns: 1fr;
		}

		.modal-footer {
			flex-direction: column;
		}
	}
</style>