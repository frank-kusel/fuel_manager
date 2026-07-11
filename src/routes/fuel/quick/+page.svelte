<script lang="ts">
	import { formatNumber } from '$lib/utils/formatting';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Vehicle, Driver, Activity, Field, Zone, Bowser } from '$lib/types';

	import {
		fuelEntryWorkflowStore,
		workflowData,
		workflowErrors,
		isSubmittingEntry
	} from '$lib/stores/fuel-entry-workflow';

	import {
		referenceDataStore,
		activeVehicles,
		activeDrivers,
		activities,
		fields,
		zones,
		activeBowsers,
		referenceDataLoading,
		referenceDataError
	} from '$lib/stores/reference-data';

	// ---------- Local UI state ----------
	let locationMode = $state<'field' | 'zone' | 'none'>('field');
	let gaugeWorking = $state(true);
	let odoStart = $state('');
	let odoEnd = $state('');
	let selectedBowser = $state<Bowser | null>(null);
	let bowserStart = $state('');
	let bowserEnd = $state('');
	let litres = $state('');
	let entryDate = $state('');
	let entryTime = $state('');
	let attemptedSubmit = $state(false);
	let submitError = $state<string | null>(null);
	let submitSuccess = $state(false);

	function num(value: string): number | null {
		if (value === '' || value === null || value === undefined) return null;
		const n = parseFloat(value);
		return Number.isFinite(n) ? n : null;
	}

	const distance = $derived.by(() => {
		const s = num(odoStart);
		const e = num(odoEnd);
		if (s === null || e === null) return null;
		return Math.round((e - s) * 10) / 10;
	});

	// ---------- Store push helpers ----------
	function pushOdometer() {
		fuelEntryWorkflowStore.setOdometerData(
			num(odoStart),
			gaugeWorking ? num(odoEnd) : null,
			gaugeWorking
		);
	}

	function pushFuel() {
		fuelEntryWorkflowStore.setFuelData(selectedBowser, num(bowserStart), num(bowserEnd), num(litres));
	}

	// ---------- Searchable picker factory ----------
	function createPicker<T extends { id: string }>(opts: {
		items: () => T[];
		code: (item: T) => string;
		label: (item: T) => string;
		onSelect: (item: T) => void;
	}) {
		let query = $state('');
		let open = $state(false);
		let selectedId = $state<string | null>(null);

		return {
			get query() { return query; },
			set query(v: string) { query = v; },
			get open() { return open; },
			set open(v: boolean) { open = v; },
			get selectedId() { return selectedId; },
			get filtered() {
				const q = query.trim().toLowerCase();
				const items = opts.items();
				if (!q) return items;
				return items.filter(
					(i) =>
						(opts.code(i) || '').toLowerCase().includes(q) ||
						(opts.label(i) || '').toLowerCase().includes(q)
				);
			},
			code: opts.code,
			label: opts.label,
			select(item: T) {
				selectedId = item.id;
				query = `${opts.code(item)} · ${opts.label(item)}`;
				open = false;
				opts.onSelect(item);
			},
			// Programmatic selection that also updates the visible input (used for driver's default vehicle)
			setSelected(item: T | null) {
				if (item) {
					selectedId = item.id;
					query = `${opts.code(item)} · ${opts.label(item)}`;
				} else {
					selectedId = null;
					query = '';
				}
			}
		};
	}

	function applyVehicle(vehicle: Vehicle) {
		// setVehicle also derives odometerStart from vehicle.current_odometer in the store
		fuelEntryWorkflowStore.setVehicle(vehicle);
		odoStart = vehicle.current_odometer != null ? String(vehicle.current_odometer) : '';
		pushOdometer();
	}

	const vehiclePicker = createPicker<Vehicle>({
		items: () => $activeVehicles,
		code: (v) => v.code || '',
		label: (v) => v.name || `${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle',
		onSelect: (v) => applyVehicle(v)
	});

	const driverPicker = createPicker<Driver>({
		items: () => $activeDrivers,
		code: (d) => d.employee_code || '',
		label: (d) => d.name,
		onSelect: (d) => {
			fuelEntryWorkflowStore.setDriver(d);
			// Auto-select driver's default vehicle if no vehicle chosen yet (mirrors wizard behaviour)
			if (d.default_vehicle && !$workflowData.vehicle) {
				vehiclePicker.setSelected(d.default_vehicle);
				applyVehicle(d.default_vehicle);
			}
		}
	});

	const activityPicker = createPicker<Activity>({
		items: () => $activities.filter((a) => a.active !== false),
		code: (a) => a.code || '',
		label: (a) => a.name,
		onSelect: (a) => fuelEntryWorkflowStore.setActivity(a)
	});

	const fieldPicker = createPicker<Field>({
		items: () => $fields.filter((f) => f.active !== false),
		code: (f) => f.code || '',
		label: (f) => f.name,
		onSelect: (f) => fuelEntryWorkflowStore.setLocation(f, null, [])
	});

	const zonePicker = createPicker<Zone>({
		items: () => $zones.filter((z) => z.active !== false),
		code: (z) => z.code || '',
		label: (z) => z.name,
		onSelect: (z) => fuelEntryWorkflowStore.setLocation(null, z, [])
	});

	function setLocationMode(mode: 'field' | 'zone' | 'none') {
		locationMode = mode;
		fieldPicker.setSelected(null);
		zonePicker.setSelected(null);
		fuelEntryWorkflowStore.setLocation(null, null, []);
	}

	function setGauge(working: boolean) {
		gaugeWorking = working;
		pushOdometer();
	}

	function handleBowserChange(id: string) {
		const bowser = $activeBowsers.find((b) => b.id === id) || null;
		selectedBowser = bowser;
		if (bowser) {
			// Pre-fill the start reading from the bowser's current reading (store does the same in setBowser)
			bowserStart = bowser.current_reading != null ? String(bowser.current_reading) : '';
			recomputeLitres();
		}
		pushFuel();
	}

	function recomputeLitres() {
		const s = num(bowserStart);
		const e = num(bowserEnd);
		if (s !== null && e !== null) {
			const diff = Math.round((e - s) * 100) / 100;
			litres = diff > 0 ? String(diff) : '';
		}
	}

	// ---------- Validation error display (store step ids -> page sections) ----------
	function errorsFor(...stepIds: string[]): string[] {
		if (!attemptedSubmit) return [];
		return stepIds.flatMap((id) => $workflowErrors[id] || []);
	}

	// ---------- Submit ----------
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if ($isSubmittingEntry || submitSuccess) return;

		attemptedSubmit = true;
		submitError = null;

		// Make sure the latest input values are in the store
		pushOdometer();
		pushFuel();
		fuelEntryWorkflowStore.setEntryDate(entryDate);
		fuelEntryWorkflowStore.setEntryTime(entryTime);

		const result = await fuelEntryWorkflowStore.submitFuelEntry();

		if (result.success) {
			submitSuccess = true;
			// Refresh vehicles/bowsers so the next entry sees updated readings
			await Promise.all([referenceDataStore.loadBowsers(), referenceDataStore.loadVehicles()]);
			setTimeout(() => goto('/summary'), 1200);
		} else {
			submitError = result.error || 'Failed to submit fuel entry';
		}
	}

	onMount(() => {
		referenceDataStore.loadAllData();
		fuelEntryWorkflowStore.reset();

		// Default date/time to "now" (the store's module-level defaults can be stale)
		const now = new Date();
		entryDate = now.toISOString().split('T')[0];
		entryTime = now.toTimeString().substring(0, 8);
		fuelEntryWorkflowStore.setEntryDate(entryDate);
		fuelEntryWorkflowStore.setEntryTime(entryTime);
	});
</script>

<svelte:head>
	<title>Quick Fuel Entry - FarmTrack</title>
</svelte:head>

{#snippet errorList(errors: string[])}
	{#if errors.length > 0}
		<div class="section-errors" role="alert">
			{#each errors as error}
				<p>{error}</p>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet searchPicker(picker: any, inputId: string, placeholder: string)}
	<div
		class="picker"
		onfocusout={(e) => {
			const wrapper = e.currentTarget as HTMLElement;
			if (!wrapper.contains(e.relatedTarget as Node)) picker.open = false;
		}}
	>
		<input
			id={inputId}
			class="input"
			type="text"
			autocomplete="off"
			{placeholder}
			value={picker.query}
			oninput={(e) => {
				picker.query = e.currentTarget.value;
				picker.open = true;
			}}
			onfocus={(e) => {
				picker.open = true;
				e.currentTarget.select();
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') picker.open = false;
			}}
		/>
		{#if picker.open}
			<div class="picker-list" role="listbox">
				{#each picker.filtered as item (item.id)}
					<button
						type="button"
						class="picker-option"
						class:selected={picker.selectedId === item.id}
						role="option"
						aria-selected={picker.selectedId === item.id}
						onclick={() => picker.select(item)}
					>
						<span class="picker-code">{picker.code(item)}</span>
						<span class="picker-name">{picker.label(item)}</span>
					</button>
				{:else}
					<div class="picker-empty">No matches</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="quick-page">
	<header class="page-header">
		<h1>Quick entry</h1>
		<p>Single-page fuel entry for experienced users</p>
	</header>

	{#if $referenceDataError}
		<div class="section-errors" role="alert"><p>{$referenceDataError}</p></div>
	{:else if $referenceDataLoading}
		<p class="loading-note">Loading reference data&hellip;</p>
	{/if}

	<form class="panels" onsubmit={handleSubmit} novalidate>
		<!-- 1. Vehicle + Driver -->
		<section class="panel">
			<h2 class="panel-title">Vehicle &amp; driver</h2>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label" for="qe-vehicle">Vehicle</label>
					{@render searchPicker(vehiclePicker, 'qe-vehicle', 'Search vehicles…')}
				</div>
				<div class="form-group">
					<label class="form-label" for="qe-driver">Driver</label>
					{@render searchPicker(driverPicker, 'qe-driver', 'Search drivers…')}
				</div>
			</div>
			{@render errorList(errorsFor('vehicle', 'driver'))}
		</section>

		<!-- 2. Activity -->
		<section class="panel">
			<h2 class="panel-title">Activity</h2>
			<div class="form-group">
				<label class="form-label" for="qe-activity">Activity</label>
				{@render searchPicker(activityPicker, 'qe-activity', 'Search activities…')}
			</div>
			{@render errorList(errorsFor('activity'))}
		</section>

		<!-- 3. Location -->
		<section class="panel">
			<h2 class="panel-title">Location <span class="panel-hint">(optional)</span></h2>
			<div class="segmented" role="group" aria-label="Location type">
				<button
					type="button"
					class="segment"
					class:active={locationMode === 'field'}
					onclick={() => setLocationMode('field')}
				>
					Field
				</button>
				<button
					type="button"
					class="segment"
					class:active={locationMode === 'zone'}
					onclick={() => setLocationMode('zone')}
				>
					Zone
				</button>
				<button
					type="button"
					class="segment"
					class:active={locationMode === 'none'}
					onclick={() => setLocationMode('none')}
				>
					None
				</button>
			</div>
			{#if locationMode === 'field'}
				<div class="form-group">
					<label class="form-label" for="qe-field">Field</label>
					{@render searchPicker(fieldPicker, 'qe-field', 'Search fields…')}
				</div>
			{:else if locationMode === 'zone'}
				<div class="form-group">
					<label class="form-label" for="qe-zone">Zone</label>
					{@render searchPicker(zonePicker, 'qe-zone', 'Search zones…')}
				</div>
			{:else}
				<p class="panel-note">No location will be recorded for this entry.</p>
			{/if}
		</section>

		<!-- 4. Odometer -->
		<section class="panel">
			<h2 class="panel-title">Odometer</h2>
			<div class="segmented" role="group" aria-label="Odometer gauge status">
				<button
					type="button"
					class="segment"
					class:active={gaugeWorking}
					onclick={() => setGauge(true)}
				>
					Gauge working
				</button>
				<button
					type="button"
					class="segment"
					class:active={!gaugeWorking}
					onclick={() => setGauge(false)}
				>
					Gauge broken
				</button>
			</div>
			{#if gaugeWorking}
				<div class="grid-2">
					<div class="form-group">
						<label class="form-label" for="qe-odo-start">Start reading (km)</label>
						<input
							id="qe-odo-start"
							class="input"
							type="number"
							inputmode="decimal"
							step="any"
							min="0"
							placeholder="0"
							bind:value={odoStart}
							oninput={pushOdometer}
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="qe-odo-end">End reading (km)</label>
						<input
							id="qe-odo-end"
							class="input"
							type="number"
							inputmode="decimal"
							step="any"
							min="0"
							placeholder="0"
							bind:value={odoEnd}
							oninput={pushOdometer}
						/>
					</div>
				</div>
				{#if distance !== null}
					<p class="computed-note" class:negative={distance <= 0}>
						Distance: <strong>{formatNumber(distance)} km</strong>
					</p>
				{/if}
			{:else}
				<p class="panel-note">Gauge marked as broken &mdash; no readings required.</p>
			{/if}
			{@render errorList(errorsFor('odometer'))}
		</section>

		<!-- 5. Fuel -->
		<section class="panel">
			<h2 class="panel-title">Fuel</h2>
			<div class="form-group">
				<label class="form-label" for="qe-bowser">Bowser</label>
				<select
					id="qe-bowser"
					class="input"
					value={selectedBowser?.id || ''}
					onchange={(e) => handleBowserChange(e.currentTarget.value)}
				>
					<option value="" disabled>Select a bowser&hellip;</option>
					{#each $activeBowsers as bowser (bowser.id)}
						<option value={bowser.id}>{bowser.code} &middot; {bowser.name}</option>
					{/each}
				</select>
			</div>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label" for="qe-bowser-start">Bowser start (L)</label>
					<input
						id="qe-bowser-start"
						class="input"
						type="number"
						inputmode="decimal"
						step="any"
						min="0"
						placeholder="0.0"
						bind:value={bowserStart}
						oninput={() => {
							recomputeLitres();
							pushFuel();
						}}
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="qe-bowser-end">Bowser end (L)</label>
					<input
						id="qe-bowser-end"
						class="input"
						type="number"
						inputmode="decimal"
						step="any"
						min="0"
						placeholder="0.0"
						bind:value={bowserEnd}
						oninput={() => {
							recomputeLitres();
							pushFuel();
						}}
					/>
				</div>
			</div>
			<div class="form-group">
				<label class="form-label" for="qe-litres">Litres dispensed</label>
				<input
					id="qe-litres"
					class="input litres-input"
					type="number"
					inputmode="decimal"
					step="any"
					min="0"
					placeholder="0.0"
					bind:value={litres}
					oninput={pushFuel}
				/>
			</div>
			{@render errorList(errorsFor('fuel'))}
		</section>

		<!-- 6. Date & time + submit -->
		<section class="panel">
			<h2 class="panel-title">Date &amp; time</h2>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label" for="qe-date">Date</label>
					<input
						id="qe-date"
						class="input"
						type="date"
						max={new Date().toLocaleDateString('en-CA')}
						bind:value={entryDate}
						oninput={() => fuelEntryWorkflowStore.setEntryDate(entryDate)}
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="qe-time">Time</label>
					<input
						id="qe-time"
						class="input"
						type="time"
						step="1"
						bind:value={entryTime}
						oninput={() => fuelEntryWorkflowStore.setEntryTime(entryTime)}
					/>
				</div>
			</div>

			{#if submitError}
				<div class="section-errors" role="alert">
					<p>{submitError}</p>
				</div>
			{/if}

			{#if submitSuccess}
				<div class="success-state" role="status">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M20 6 9 17l-5-5" />
					</svg>
					<span>Fuel entry submitted</span>
				</div>
			{:else}
				<button class="submit-btn" type="submit" disabled={$isSubmittingEntry}>
					{$isSubmittingEntry ? 'Submitting…' : 'Submit fuel entry'}
				</button>
			{/if}
		</section>
	</form>
</div>

<style>
	.quick-page {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		box-sizing: border-box;
	}

	.page-header {
		margin-bottom: 1.25rem;
	}

	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--gray-900);
		margin: 0;
		line-height: 1.2;
	}

	.page-header p {
		margin: 0.25rem 0 0;
		font-size: var(--text-sm);
		color: var(--gray-500);
	}

	.loading-note {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0 0 1rem;
	}

	.panels {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Card panels */
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		padding: 1.25rem;
	}

	.panel-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--gray-600);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin: 0 0 0.875rem;
	}

	.panel-hint {
		font-weight: 500;
		color: var(--gray-400);
		text-transform: none;
		letter-spacing: normal;
	}

	.panel-note {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0.75rem 0 0;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.875rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-bottom: 0.875rem;
	}

	.form-group:last-child,
	.grid-2 .form-group {
		margin-bottom: 0;
	}

	.grid-2 {
		margin-bottom: 0.875rem;
	}

	.grid-2:last-child {
		margin-bottom: 0;
	}

	.form-label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-600);
	}

	/* Inputs */
	.input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md, 8px);
		background: var(--white);
		color: var(--gray-900);
		font-size: 16px; /* prevents iOS zoom on focus */
		font-weight: 500;
		box-sizing: border-box;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		-webkit-appearance: none;
		appearance: none;
	}

	select.input {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		padding-right: 2.5rem;
	}

	.input:focus {
		outline: none;
		border-color: var(--brand);
		box-shadow: var(--focus-ring);
	}

	.input::placeholder {
		color: var(--gray-400);
		font-weight: 400;
	}

	/* Searchable picker */
	.picker {
		position: relative;
	}

	.picker-list {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 50;
		max-height: 200px;
		overflow-y: auto;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md, 0 4px 12px rgba(28, 25, 23, 0.08));
	}

	.picker-option {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: none;
		background: transparent;
		text-align: left;
		font-size: var(--text-sm);
		color: var(--gray-800);
		cursor: pointer;
	}

	.picker-option:hover {
		background: var(--gray-50);
	}

	.picker-option.selected {
		background: var(--brand-tint);
		color: var(--brand-hover);
	}

	.picker-code {
		flex-shrink: 0;
		min-width: 3rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--gray-500);
	}

	.picker-option.selected .picker-code {
		color: var(--brand-hover);
	}

	.picker-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.picker-empty {
		padding: 0.75rem;
		font-size: var(--text-sm);
		color: var(--gray-400);
		text-align: center;
	}

	/* Segmented toggle */
	.segmented {
		display: inline-flex;
		gap: 0;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		margin-bottom: 0.875rem;
	}

	.segment {
		min-height: 2.75rem;
		padding: 0.5rem 1rem;
		border: none;
		background: var(--white);
		color: var(--gray-600);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.segment + .segment {
		border-left: 1px solid var(--gray-200);
	}

	.segment:hover:not(.active) {
		background: var(--gray-50);
	}

	.segment.active {
		background: var(--brand-tint);
		color: var(--brand-hover);
	}

	.segment:focus-visible {
		outline: none;
		box-shadow: var(--focus-ring);
		position: relative;
		z-index: 1;
	}

	.computed-note {
		margin: 0.75rem 0 0;
		font-size: var(--text-sm);
		color: var(--gray-600);
	}

	.computed-note strong {
		color: var(--gray-900);
		font-weight: 600;
	}

	.computed-note.negative strong {
		color: var(--error, #dc2626);
	}

	.litres-input {
		font-weight: 700;
	}

	/* Errors */
	.section-errors {
		margin-top: 0.875rem;
		padding: 0.75rem 0.875rem;
		background: rgba(220, 38, 38, 0.06);
		border: 1px solid rgba(220, 38, 38, 0.25);
		border-radius: var(--radius-md, 8px);
	}

	.section-errors p {
		margin: 0;
		font-size: var(--text-sm);
		color: #dc2626;
	}

	.section-errors p + p {
		margin-top: 0.25rem;
	}

	/* Submit */
	.submit-btn {
		width: 100%;
		min-height: 3.25rem;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--radius-md, 8px);
		background: var(--brand);
		color: var(--white);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--brand-hover);
	}

	.submit-btn:focus-visible {
		outline: none;
		box-shadow: var(--focus-ring);
	}

	.submit-btn:disabled {
		background: var(--gray-300);
		cursor: not-allowed;
	}

	.success-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 3.25rem;
		margin-top: 1rem;
		border-radius: var(--radius-md, 8px);
		background: rgba(22, 163, 74, 0.08);
		border: 1px solid rgba(22, 163, 74, 0.3);
		color: #15803d;
		font-size: 1rem;
		font-weight: 600;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.quick-page {
			padding: 1rem 0.75rem 5.5rem; /* bottom padding clears the fixed mobile nav */
		}

		.grid-2 {
			grid-template-columns: 1fr;
		}

		.panel {
			padding: 1rem;
		}

		.segmented {
			display: flex;
			width: 100%;
		}

		.segment {
			flex: 1;
		}
	}
</style>
