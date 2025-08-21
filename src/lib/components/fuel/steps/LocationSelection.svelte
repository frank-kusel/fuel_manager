<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import supabaseService from '$lib/services/supabase';
	import type { Field, Zone } from '$lib/types';
	
	interface Props {
		selectedField: Field | null;
		selectedZone: Zone | null;
		onLocationSelect: (field: Field | null, zone: Zone | null) => void;
		onAutoAdvance?: () => void;
		errors: string[];
	}
	
	let { selectedField, selectedZone, onLocationSelect, onAutoAdvance, errors }: Props = $props();
	
	let fields: Field[] = $state([]);
	let zones: Zone[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');
	let activeTab = $state<'fields' | 'zones'>('fields');
	
	// Track selected location
	let hasSelection = $derived(selectedField !== null || selectedZone !== null);
	
	onMount(async () => {
		if (!browser) return;
		
		try {
			await supabaseService.init();
			const [fieldsResult, zonesResult] = await Promise.all([
				supabaseService.getFields(),
				supabaseService.getZones()
			]);
			
			if (fieldsResult.error) {
				throw new Error(fieldsResult.error);
			}
			if (zonesResult.error) {
				throw new Error(zonesResult.error);
			}
			
			fields = fieldsResult.data || [];
			zones = zonesResult.data || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load locations';
		} finally {
			loading = false;
		}
	});
	
	let filteredFields = $derived(fields.filter(field => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			field.name.toLowerCase().includes(search) ||
			field.code.toLowerCase().includes(search) ||
			field.location?.toLowerCase().includes(search) ||
			field.crop_type?.toLowerCase().includes(search)
		);
	}));
	
	let filteredZones = $derived(zones.filter(zone => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			zone.name.toLowerCase().includes(search) ||
			zone.code.toLowerCase().includes(search) ||
			zone.description?.toLowerCase().includes(search)
		);
	}));
	
	function selectField(field: Field) {
		onLocationSelect(field, null);
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	function selectZone(zone: Zone) {
		onLocationSelect(null, zone);
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	function skipLocation() {
		onLocationSelect(null, null);
		if (onAutoAdvance) {
			setTimeout(() => {
				onAutoAdvance();
			}, 100);
		}
	}
	
	function getFieldIcon(cropType: string | null): string {
		if (!cropType) return '🌾';
		const crop = cropType.toLowerCase();
		if (crop.includes('wheat')) return '🌾';
		if (crop.includes('corn') || crop.includes('maize')) return '🌽';
		if (crop.includes('soy')) return '🫘';
		if (crop.includes('barley')) return '🌾';
		if (crop.includes('oat')) return '🌾';
		if (crop.includes('rice')) return '🌾';
		if (crop.includes('cotton')) return '🤍';
		if (crop.includes('sunflower')) return '🌻';
		return '🌱';
	}
	
	function getFieldColor(cropType: string | null): string {
		if (!cropType) return '#10b981';
		const crop = cropType.toLowerCase();
		if (crop.includes('wheat')) return '#f59e0b';
		if (crop.includes('corn') || crop.includes('maize')) return '#eab308';
		if (crop.includes('soy')) return '#10b981';
		if (crop.includes('barley')) return '#d97706';
		if (crop.includes('oat')) return '#92400e';
		if (crop.includes('rice')) return '#059669';
		if (crop.includes('cotton')) return '#6b7280';
		if (crop.includes('sunflower')) return '#f59e0b';
		return '#10b981';
	}
	
	function formatArea(area: number | null): string {
		if (area === null) return 'Not specified';
		return `${new Intl.NumberFormat().format(area)} ha`;
	}
</script>

<div class="location-selection">
	{#if errors.length > 0}
		<div class="error-messages">
			{#each errors as error}
				<div class="error-message">
					<span class="error-icon">⚠️</span>
					{error}
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Skip Option -->
	<div class="skip-option">
		<div class="skip-message" onclick={skipLocation}>
			⏭️ Skip Location Selection (Optional)
		</div>
	</div>
	
	{#if !loading}
		<!-- Tab Switcher -->
		<div class="tab-switcher">
			<button 
				class="tab-btn" 
				class:active={activeTab === 'fields'}
				onclick={() => activeTab = 'fields'}
			>
				🌾 Fields ({fields.length})
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'zones'}
				onclick={() => activeTab = 'zones'}
			>
				📍 Zones ({zones.length})
			</button>
		</div>
		
		<!-- Search -->
		<div class="search-container">
			<div class="search-input">
				<span class="search-icon">🔍</span>
				<input 
					type="text" 
					placeholder="Search {activeTab === 'fields' ? 'fields' : 'zones'}..."
					bind:value={searchTerm}
				/>
				{#if searchTerm}
					<button class="clear-search" onclick={() => searchTerm = ''}>×</button>
				{/if}
			</div>
		</div>
	{/if}
	
	{#if loading}
		<div class="loading-state">
			<div class="fields-grid">
				{#each Array(6) as _}
					<div class="field-card-skeleton">
						<div class="skeleton-header">
							<div class="skeleton-icon"></div>
							<div class="skeleton-content">
								<div class="skeleton-line"></div>
								<div class="skeleton-line short"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if error}
		<div class="error-state">
			<div class="error-icon">🚨</div>
			<p>Failed to load locations</p>
			<small>{error}</small>
		</div>
	{:else if activeTab === 'fields'}
		{#if filteredFields.length === 0}
			<div class="empty-state">
				{searchTerm ? 'No fields found' : 'No fields available'}
			</div>
		{:else}
			<div class="table-container">
				<table class="table" id="field-table">
					<thead>
						<tr>
							<th>Code</th>
							<th>Name</th>
							<th>Crop</th>
							<th>Area</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredFields as field (field.id)}
							<tr 
								class="field-row clickable {selectedField?.id === field.id ? 'selected' : ''}"
								onclick={() => selectField(field)}
							>
								<td class="field-code">
									<span class="field-icon" style="color: {getFieldColor(field.crop_type)}">
										{getFieldIcon(field.crop_type)}
									</span>
									{field.code}
								</td>
								<td class="field-name">{field.name}</td>
								<td class="field-crop">{field.crop_type || 'Not set'}</td>
								<td class="field-area">{formatArea(field.area)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		{#if filteredZones.length === 0}
			<div class="empty-state">
				{searchTerm ? 'No zones found' : 'No zones available'}
			</div>
		{:else}
			<div class="zones-grid">
				{#each filteredZones as zone (zone.id)}
					<button 
						class="zone-card {selectedZone?.id === zone.id ? 'selected' : ''}"
						onclick={() => selectZone(zone)}
					>
						<div class="zone-header">
							<div class="zone-badge" style="background-color: {zone.color || '#95A5A6'}">
								{zone.code}
							</div>
						</div>
						<div class="zone-name">{zone.name}</div>
						{#if zone.description}
							<div class="zone-description">{zone.description}</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
	
	{#if hasSelection}
		<div class="selection-summary">
			<Card class="selected-location-summary">
				<div class="summary-header">
					<span class="summary-icon">✓</span>
					<h3>Selected Location</h3>
				</div>
				<div class="summary-content">
					{#if selectedField}
						<div class="summary-field">
							<div class="summary-field-icon" style="color: {getFieldColor(selectedField.crop_type)}">
								{getFieldIcon(selectedField.crop_type)}
							</div>
							<div class="summary-info">
								<div class="summary-name">Field: {selectedField.name}</div>
								<div class="summary-details">
									{selectedField.code} • {formatArea(selectedField.area)}
									{#if selectedField.crop_type}
										• {selectedField.crop_type}
									{/if}
								</div>
							</div>
						</div>
					{:else if selectedZone}
						<div class="summary-zone">
							<div class="summary-zone-badge" style="background-color: {selectedZone.color || '#95A5A6'}">
								{selectedZone.code}
							</div>
							<div class="summary-info">
								<div class="summary-name">Zone: {selectedZone.name}</div>
								{#if selectedZone.description}
									<div class="summary-details">{selectedZone.description}</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				<div class="summary-actions">
					<Button variant="outline" size="sm" onclick={() => onLocationSelect(null, null)}>
						Change Location
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.location-selection {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Tab Switcher */
	.tab-switcher {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem;
		background: var(--gray-100, #f3f4f6);
		border-radius: 8px;
	}

	.tab-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-600, #475569);
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn.active {
		background: white;
		color: var(--gray-900, #0f172a);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Error Messages */
	.error-messages {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	/* Skip Option */
	.skip-option {
		padding: 0.75rem;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 6px;
		display: flex;
		justify-content: center;
	}

	.skip-message {
		color: #0284c7;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.2s;
	}

	.skip-message:hover {
		color: #0369a1;
	}

	/* Search */
	.search-container {
		margin-bottom: 0.5rem;
	}

	.search-input {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid var(--gray-300, #d1d5db);
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
		color: var(--gray-900, #0f172a);
	}

	.search-input input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: var(--gray-400, #9ca3af);
		pointer-events: none;
		font-size: 1rem;
	}

	.clear-search {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: var(--gray-400, #9ca3af);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.clear-search:hover {
		background: var(--gray-100, #f3f4f6);
		color: var(--gray-600, #475569);
	}

	/* Fields Grid */
	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.field-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.3s;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		text-align: left;
		width: 100%;
	}

	.field-card:hover {
		border-color: #2563eb;
		background: #eff6ff;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
	}

	.field-card.selected {
		border-color: #2563eb;
		background: #2563eb;
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.field-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.field-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.field-info {
		flex: 1;
		min-width: 0;
	}

	.field-code {
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field-card.selected .field-code {
		color: rgba(255, 255, 255, 0.8);
	}

	.field-name {
		font-size: 1rem;
		font-weight: 600;
		color: #334155;
		margin-top: 0.125rem;
	}

	.field-card.selected .field-name {
		color: white;
	}

	.field-crop {
		font-size: 0.875rem;
		color: #64748b;
		margin-top: 0.25rem;
	}

	.field-card.selected .field-crop {
		color: rgba(255, 255, 255, 0.8);
	}

	.field-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.field-card.selected .field-footer {
		border-top-color: rgba(255, 255, 255, 0.2);
	}

	.field-area {
		font-size: 0.875rem;
		font-weight: 500;
		color: #475569;
	}

	.field-card.selected .field-area {
		color: rgba(255, 255, 255, 0.9);
	}

	.field-type {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		background: #f1f5f9;
		border-radius: 4px;
		color: #64748b;
		text-transform: uppercase;
		font-weight: 500;
	}

	.field-card.selected .field-type {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	/* Table Container */
	.table-container {
		background: var(--white, #ffffff);
		border: 1px solid var(--gray-200, #e2e8f0);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th {
		background: var(--gray-50, #f8fafc);
		border-bottom: 1px solid var(--gray-200, #e2e8f0);
		color: var(--gray-700, #374151);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.75rem;
		text-align: left;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table td {
		border-bottom: 1px solid var(--gray-100, #f3f4f6);
		padding: 0.75rem;
		color: var(--gray-900, #111827);
		font-size: 0.875rem;
	}

	.field-row {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.field-row:hover {
		background: var(--blue-50, #eff6ff);
	}

	.field-row.selected {
		background: var(--blue-500, #3b82f6);
		color: white;
	}

	.field-row.selected td {
		color: white;
		border-bottom-color: rgba(255, 255, 255, 0.2);
	}

	.field-code {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.field-icon {
		font-size: 1.25rem;
	}

	/* Zones Grid */
	.zones-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.zone-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.3s;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
		min-height: 120px;
	}

	.zone-card:hover {
		border-color: #2563eb;
		background: #eff6ff;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
	}

	.zone-card.selected {
		border-color: #2563eb;
		background: #2563eb;
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.zone-header {
		margin-bottom: 0.5rem;
	}

	.zone-badge {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		font-size: 1rem;
	}

	.zone-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #334155;
	}

	.zone-card.selected .zone-name {
		color: white;
	}

	.zone-description {
		font-size: 0.75rem;
		color: #64748b;
		margin-top: 0.25rem;
	}

	.zone-card.selected .zone-description {
		color: rgba(255, 255, 255, 0.8);
	}

	/* Selection Summary */
	.selection-summary {
		margin-top: 1rem;
	}

	:global(.selected-location-summary) {
		border: 2px solid #10b981;
		background: #f0fdf4;
	}

	.summary-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.summary-icon {
		background: #10b981;
		color: white;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.summary-header h3 {
		color: #065f46;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.summary-content {
		margin-bottom: 1rem;
	}

	.summary-field,
	.summary-zone {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.summary-field-icon {
		font-size: 1.5rem;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.summary-zone-badge {
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.summary-name {
		font-weight: 600;
		color: #0f172a;
		margin-bottom: 0.25rem;
	}

	.summary-details {
		font-size: 0.875rem;
		color: #475569;
	}

	.summary-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Loading State */
	.field-card-skeleton {
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		background: white;
		min-height: 100px;
	}

	.skeleton-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.skeleton-icon,
	.skeleton-line {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.skeleton-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-line {
		height: 1rem;
	}

	.skeleton-line.short {
		width: 70%;
		height: 0.875rem;
	}

	@keyframes loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Empty/Error States */
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--gray-500, #64748b);
	}

	.error-state .error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.error-state p {
		font-size: 1.125rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
	}

	.error-state small {
		font-size: 0.875rem;
		color: var(--gray-400, #9ca3af);
		max-width: 300px;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.fields-grid {
			grid-template-columns: 1fr;
		}
		
		.zones-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>