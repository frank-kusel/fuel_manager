<script lang="ts">
	import { onMount } from 'svelte';
	import supabaseService from '$lib/services/supabase';
	import FuelEntryEditModal from '$lib/components/fuel/FuelEntryEditModal.svelte';
	import { summaryCacheStore } from '$lib/stores/summary-cache';
	import {
		referenceDataStore,
		activeVehicles,
		activeDrivers,
		activities as allActivities,
		fields as allFields,
		zones as allZones
	} from '$lib/stores/reference-data';

	/**
	 * All entries — the desk-review table. One row per fuel entry, per-cell
	 * autosave. Litres edits go through the cascade RPC (bowser chain rewrites
	 * itself); everything else is a plain column update. Date/time moves and
	 * multi-field entries hand off to the full edit modal.
	 */

	const nf = new Intl.NumberFormat('en-ZA');
	const nf1 = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 });

	type PeriodKey = '30d' | 'month' | 'lastMonth' | 'custom';
	let period = $state<PeriodKey>('30d');
	let customStart = $state('');
	let customEnd = $state('');
	let vehicleFilter = $state('');

	let entries = $state<any[]>([]);
	let fieldIdsByEntry = $state<Record<string, string[]>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let toast = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	// Cell editing
	let editingCell = $state<{ entryId: string; col: string } | null>(null);
	let editValue = $state<any>('');
	let savingCell = $state(false);
	let rowFlash = $state<Record<string, 'ok' | 'err'>>({});

	// Full modal escape hatch
	let modalEntry = $state<any | null>(null);
	let modalOpen = $state(false);

	const today = () => new Date().toLocaleDateString('en-CA');

	function periodRange(): { start: string; end: string } {
		const now = new Date();
		const iso = (d: Date) => d.toLocaleDateString('en-CA');
		if (period === 'month') {
			return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
		}
		if (period === 'lastMonth') {
			return {
				start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
				end: iso(new Date(now.getFullYear(), now.getMonth(), 0))
			};
		}
		if (period === 'custom' && customStart && customEnd) {
			return { start: customStart, end: customEnd };
		}
		const start = new Date(now);
		start.setDate(start.getDate() - 29);
		return { start: iso(start), end: iso(now) };
	}

	async function load(silent = false) {
		if (!silent) loading = true;
		error = null;
		try {
			await supabaseService.init();
			const { start, end } = periodRange();
			const res = await supabaseService.getFuelEntries(start, end);
			if (res.error) throw new Error(res.error);
			entries = res.data || [];

			// Multi-field detection via the junction table
			const ids = entries.map((e) => e.id);
			if (ids.length > 0) {
				const client = supabaseService.getClient();
				const jr = await client
					.from('fuel_entry_fields')
					.select('fuel_entry_id, field_id')
					.in('fuel_entry_id', ids);
				const map: Record<string, string[]> = {};
				for (const r of jr.data || []) {
					(map[r.fuel_entry_id] ??= []).push(r.field_id);
				}
				fieldIdsByEntry = map;
			} else {
				fieldIdsByEntry = {};
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load entries';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		referenceDataStore.loadAllData();
		load();
	});

	function setPeriod(p: PeriodKey) {
		period = p;
		if (p !== 'custom') load();
	}

	function applyCustom() {
		if (customStart && customEnd) load();
	}

	// ---- Display rows: vehicle filter, per-day numbers, day banding ----
	const displayRows = $derived.by(() => {
		const list = vehicleFilter ? entries.filter((e) => e.vehicle_id === vehicleFilter) : entries;

		// Chronological number within each day (list is date desc, time desc)
		const numById = new Map<string, number>();
		const byDate = new Map<string, any[]>();
		for (const e of list) {
			if (!byDate.has(e.entry_date)) byDate.set(e.entry_date, []);
			byDate.get(e.entry_date)!.push(e);
		}
		for (const group of byDate.values()) {
			const asc = [...group].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
			asc.forEach((e, i) => numById.set(e.id, i + 1));
		}

		let band = false;
		let prevDate = '';
		return list.map((e) => {
			if (e.entry_date !== prevDate) {
				band = !band;
				prevDate = e.entry_date;
			}
			return {
				e,
				num: numById.get(e.id) || 1,
				dayCount: byDate.get(e.entry_date)?.length || 1,
				band
			};
		});
	});

	// Reorder within a day via the migration-014 RPC (repositions the day's
	// times and rebuilds the bowser chains) — same machinery as the Log drag.
	let reordering = $state(false);
	async function reorder(e: any, targetPos: number, dayCount: number) {
		if (reordering || targetPos < 1 || targetPos > dayCount) return;
		reordering = true;
		try {
			const result = await supabaseService.reorderFuelEntry(e.id, targetPos);
			if (result.error) throw new Error(result.error);
			summaryCacheStore.invalidate();
			await load(true);
			showToast('ok', `Moved to #${targetPos} — bowser chains recalculated.`);
		} catch (err) {
			showToast('err', err instanceof Error ? err.message : 'Failed to move entry');
		} finally {
			reordering = false;
		}
	}

	const totalLitres = $derived(
		displayRows.reduce((s, r) => s + (r.e.litres_dispensed || 0), 0)
	);

	const activeActivities = $derived($allActivities.filter((a: any) => a.active !== false));
	const activeFields = $derived($allFields.filter((f: any) => f.active !== false));
	const activeZones = $derived($allZones.filter((z: any) => z.active !== false));

	function fmtDay(date: string): string {
		return new Date(date + 'T12:00:00').toLocaleDateString('en-ZA', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	function fmtNum(v: number | null): string {
		if (v === null || v === undefined) return '—';
		return nf1.format(v);
	}

	// Junction-first: multi-field entries have field_id = null, so the fields
	// join is empty — the junction table is the source of truth.
	function fieldCell(e: any): { text: string; multi: boolean } {
		const ids = fieldIdsByEntry[e.id] || [];
		if (ids.length > 1) return { text: `${ids.length} fields`, multi: true };
		if (ids.length === 1) {
			const f = $allFields.find((x: any) => x.id === ids[0]);
			return { text: f?.name || e.fields?.name || '—', multi: false };
		}
		return { text: e.fields?.name || '—', multi: false };
	}

	function showToast(kind: 'ok' | 'err', text: string) {
		toast = { kind, text };
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), kind === 'ok' ? 2500 : 6000);
	}

	function flashRow(id: string, kind: 'ok' | 'err') {
		rowFlash = { ...rowFlash, [id]: kind };
		setTimeout(() => {
			const { [id]: _, ...rest } = rowFlash;
			rowFlash = rest;
		}, 1200);
	}

	// ---- Cell editing ----
	function isEditing(entryId: string, col: string): boolean {
		return editingCell?.entryId === entryId && editingCell?.col === col;
	}

	function startEdit(e: any, col: string) {
		if (savingCell) return;
		if (col === 'field' && (fieldIdsByEntry[e.id] || []).length > 1) {
			openModal(e); // multi-field entries edit in the full modal
			return;
		}
		editingCell = { entryId: e.id, col };
		if (col === 'field') editValue = e.field_id ?? fieldIdsByEntry[e.id]?.[0] ?? '';
		else editValue = e[col] ?? '';
	}

	function cancelEdit() {
		editingCell = null;
		editValue = '';
	}

	function focusInput(node: HTMLElement) {
		node.focus();
		if (node instanceof HTMLInputElement) node.select();
	}

	async function commitEdit(e: any) {
		if (!editingCell || editingCell.entryId !== e.id || savingCell) return;
		const col = editingCell.col;
		const raw = editValue;
		const original = col === 'field' ? (e.field_id ?? fieldIdsByEntry[e.id]?.[0] ?? '') : (e[col] ?? '');

		// Unchanged → just close
		if (String(raw) === String(original)) {
			cancelEdit();
			return;
		}

		savingCell = true;
		try {
			if (col === 'litres_dispensed') {
				const litres = Number(raw);
				if (!litres || litres <= 0) throw new Error('Litres must be a positive number');
				if (e.bowser_reading_start !== null && e.bowser_reading_start !== undefined) {
					// Chain-safe path: cascade RPC rewrites this and all later entries
					const newEnd = e.bowser_reading_start + litres;
					const result = await supabaseService.cascadeBowserReadings(e.id, newEnd);
					if (result.error) throw new Error(result.error);
					cancelEdit();
					await load(true); // downstream bowser readings changed — refresh view
					const n = result.data?.updated_count || 0;
					showToast('ok', `Litres updated — ${n} later ${n === 1 ? 'entry' : 'entries'} recalculated.`);
				} else {
					const result = await supabaseService.updateFuelEntry(e.id, { litres_dispensed: litres });
					if (result.error) throw new Error(result.error);
					e.litres_dispensed = litres;
					cancelEdit();
				}
			} else if (col === 'field') {
				const fieldId = String(raw);
				if (!fieldId) throw new Error('Pick a field');
				// Junction (sets field_selection_mode) + legacy field_id kept in sync
				const jr = await supabaseService.updateFuelEntryFields(e.id, [fieldId]);
				if (jr.error) throw new Error(jr.error);
				const ur = await supabaseService.updateFuelEntry(e.id, { field_id: fieldId });
				if (ur.error) throw new Error(ur.error);
				e.field_id = fieldId;
				const f = activeFields.find((x: any) => x.id === fieldId);
				e.fields = f ? { code: f.code, name: f.name } : e.fields;
				fieldIdsByEntry = { ...fieldIdsByEntry, [e.id]: [fieldId] };
				cancelEdit();
			} else if (col === 'odometer_start' || col === 'odometer_end') {
				const num = raw === '' ? null : Number(raw);
				if (num !== null && isNaN(num)) throw new Error('Must be a number');
				const result = await supabaseService.updateFuelEntry(e.id, { [col]: num });
				if (result.error) throw new Error(result.error);
				e[col] = num;
				// DB trigger recomputed consumption — take it from the response
				if (result.data) e.fuel_consumption_l_per_100km = result.data.fuel_consumption_l_per_100km;
				cancelEdit();
			} else {
				// vehicle_id / driver_id / activity_id / zone_id selects
				const value = raw === '' ? null : raw;
				const result = await supabaseService.updateFuelEntry(e.id, { [col]: value });
				if (result.error) throw new Error(result.error);
				e[col] = value;
				if (col === 'vehicle_id') {
					const v = $activeVehicles.find((x: any) => x.id === value);
					e.vehicles = v ? { code: v.code, name: v.name } : null;
				} else if (col === 'driver_id') {
					const d = $activeDrivers.find((x: any) => x.id === value);
					e.drivers = d ? { employee_code: d.employee_code, name: d.name } : null;
				} else if (col === 'activity_id') {
					const a = activeActivities.find((x: any) => x.id === value);
					e.activities = a ? { code: a.code, name: a.name } : null;
				} else if (col === 'zone_id') {
					const z = activeZones.find((x: any) => x.id === value);
					e.zones = z ? { code: z.code, name: z.name } : null;
				}
				cancelEdit();
			}
			summaryCacheStore.invalidate();
			flashRow(e.id, 'ok');
		} catch (err) {
			cancelEdit();
			flashRow(e.id, 'err');
			showToast('err', err instanceof Error ? err.message : 'Save failed');
		} finally {
			savingCell = false;
		}
	}

	// ---- Modal + delete ----
	function openModal(e: any) {
		modalEntry = e;
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		modalEntry = null;
	}

	async function handleModalSaved() {
		closeModal();
		summaryCacheStore.invalidate();
		await load(true);
		showToast('ok', 'Entry updated.');
	}

	async function deleteEntry(e: any) {
		const ok = confirm(
			`Delete this entry?\n\n${e.vehicles?.code || ''} ${e.vehicles?.name || ''} — ${nf1.format(e.litres_dispensed)} L on ${e.entry_date}\n\nLater bowser readings will be recalculated automatically.`
		);
		if (!ok) return;
		try {
			const result = await supabaseService.softDeleteFuelEntry(e.id);
			if (result.error) throw new Error(result.error);
			summaryCacheStore.invalidate();
			await load(true);
			showToast('ok', 'Entry deleted — bowser chain recalculated.');
		} catch (err) {
			showToast('err', err instanceof Error ? err.message : 'Delete failed');
		}
	}
</script>

<svelte:head>
	<title>All entries - FarmTrack</title>
</svelte:head>

<div class="entries-page">
	<div class="page-header">
		<h1>All entries</h1>
		<p>Every entry in the period — click a cell to fix it in place</p>
	</div>

	<div class="toolbar">
		<div class="chips">
			<button class="chip" class:on={period === '30d'} onclick={() => setPeriod('30d')}>Last 30 days</button>
			<button class="chip" class:on={period === 'month'} onclick={() => setPeriod('month')}>This month</button>
			<button class="chip" class:on={period === 'lastMonth'} onclick={() => setPeriod('lastMonth')}>Last month</button>
			<button class="chip" class:on={period === 'custom'} onclick={() => setPeriod('custom')}>Custom</button>
		</div>
		{#if period === 'custom'}
			<div class="custom-range">
				<input type="date" bind:value={customStart} max={today()} />
				<span>→</span>
				<input type="date" bind:value={customEnd} max={today()} />
				<button class="apply-btn" onclick={applyCustom} disabled={!customStart || !customEnd}>Apply</button>
			</div>
		{/if}
		<div class="filter-row">
			<select class="vehicle-filter" bind:value={vehicleFilter}>
				<option value="">All vehicles</option>
				{#each $activeVehicles as v}
					<option value={v.id}>{v.code} — {v.name}</option>
				{/each}
			</select>
			<span class="totals">
				{displayRows.length} {displayRows.length === 1 ? 'entry' : 'entries'} · {nf.format(Math.round(totalLitres))} L
			</span>
		</div>
	</div>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if loading && entries.length === 0}
		<div class="skeleton" style="height: 20rem"></div>
	{:else if displayRows.length === 0}
		<div class="panel"><p class="empty-note">No entries in this period.</p></div>
	{:else}
		<div class="table-wrap panel">
			<table class="grid">
				<thead>
					<tr>
						<th>Date</th>
						<th>Vehicle</th>
						<th>Driver</th>
						<th>Activity</th>
						<th>Field</th>
						<th>Zone</th>
						<th class="num">Odo start</th>
						<th class="num">Odo end</th>
						<th class="num">Litres</th>
						<th class="num">L/100</th>
						<th class="num">Bowser</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each displayRows as { e, num, dayCount, band } (e.id)}
						<tr class:band class:flash-ok={rowFlash[e.id] === 'ok'} class:flash-err={rowFlash[e.id] === 'err'}>
							<td class="cell-date" title={e.entry_date}>
								<!-- Always rendered so single-entry days keep the same indent -->
								<span class="order-btns">
									{#if dayCount > 1}
										<button
											class="ord"
											title="Move up (later in the day)"
											disabled={num >= dayCount || reordering}
											onclick={() => reorder(e, num + 1, dayCount)}
										>▲</button>
										<button
											class="ord"
											title="Move down (earlier in the day)"
											disabled={num <= 1 || reordering}
											onclick={() => reorder(e, num - 1, dayCount)}
										>▼</button>
									{/if}
								</span>
								{fmtDay(e.entry_date)} <span class="day-num">#{num}</span>
							</td>

							<td class="ed" onclick={() => startEdit(e, 'vehicle_id')}>
								{#if isEditing(e.id, 'vehicle_id')}
									<select bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each $activeVehicles as v}
											<option value={v.id}>{v.code} — {v.name}</option>
										{/each}
									</select>
								{:else}
									<span class="v-code">{e.vehicles?.code || '—'}</span>
									<span class="v-name">{e.vehicles?.name || ''}</span>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'driver_id')}>
								{#if isEditing(e.id, 'driver_id')}
									<select bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each $activeDrivers as d}
											<option value={d.id}>{d.name}</option>
										{/each}
									</select>
								{:else}
									{e.drivers?.name || '—'}
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'activity_id')}>
								{#if isEditing(e.id, 'activity_id')}
									<select bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each activeActivities as a}
											<option value={a.id}>{a.name}</option>
										{/each}
									</select>
								{:else}
									{e.activities?.name || '—'}
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'field')}>
								{#if isEditing(e.id, 'field')}
									<select bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each activeFields as f}
											<option value={f.id}>{f.name}</option>
										{/each}
									</select>
								{:else}
									{@const fc = fieldCell(e)}
									<span class:multi-field={fc.multi}>{fc.text}</span>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'zone_id')}>
								{#if isEditing(e.id, 'zone_id')}
									<select bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										<option value="">—</option>
										{#each activeZones as z}
											<option value={z.id}>{z.name}</option>
										{/each}
									</select>
								{:else}
									{e.zones?.name || '—'}
								{/if}
							</td>

							<td class="ed num" class:gauge-bad={e.gauge_working === false} onclick={() => startEdit(e, 'odometer_start')}>
								{#if isEditing(e.id, 'odometer_start')}
									<input
										type="number"
										step="any"
										bind:value={editValue}
										use:focusInput
										onkeydown={(k) => {
											if (k.key === 'Enter') commitEdit(e);
											if (k.key === 'Escape') cancelEdit();
										}}
										onblur={() => commitEdit(e)}
									/>
								{:else}
									{fmtNum(e.odometer_start)}
									{#if e.gauge_working === false}<span class="gauge-warn" title="Gauge broken">⚠</span>{/if}
								{/if}
							</td>

							<td class="ed num" class:gauge-bad={e.gauge_working === false} onclick={() => startEdit(e, 'odometer_end')}>
								{#if isEditing(e.id, 'odometer_end')}
									<input
										type="number"
										step="any"
										bind:value={editValue}
										use:focusInput
										onkeydown={(k) => {
											if (k.key === 'Enter') commitEdit(e);
											if (k.key === 'Escape') cancelEdit();
										}}
										onblur={() => commitEdit(e)}
									/>
								{:else}
									{fmtNum(e.odometer_end)}
								{/if}
							</td>

							<td class="ed num cell-litres" onclick={() => startEdit(e, 'litres_dispensed')}>
								{#if isEditing(e.id, 'litres_dispensed')}
									<input
										type="number"
										step="any"
										min="0"
										bind:value={editValue}
										use:focusInput
										onkeydown={(k) => {
											if (k.key === 'Enter') commitEdit(e);
											if (k.key === 'Escape') cancelEdit();
										}}
										onblur={() => commitEdit(e)}
									/>
								{:else}
									{nf1.format(e.litres_dispensed)}
								{/if}
							</td>

							<td class="num cell-ro">{e.fuel_consumption_l_per_100km ?? '—'}</td>

							<td class="num cell-ro cell-bowser" title="Bowser meter start → end (derived)">
								{fmtNum(e.bowser_reading_start)} → {fmtNum(e.bowser_reading_end)}
							</td>

							<td class="cell-actions">
								<button class="row-act" title="Full edit (date, time, bowser…)" onclick={() => openModal(e)}>⋯</button>
								<button class="row-act del" title="Delete entry" onclick={() => deleteEntry(e)}>✕</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if toast}
	<div class="toast {toast.kind}">{toast.text}</div>
{/if}

<FuelEntryEditModal entry={modalEntry} isOpen={modalOpen} on:close={closeModal} on:saved={handleModalSaved} />

<style>
	.entries-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 0.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.page-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-weight-bold);
		color: var(--gray-900);
		margin: 0;
	}

	.page-header p {
		font-size: var(--text-sm);
		color: var(--gray-500);
		margin: 0.25rem 0 0;
	}

	/* ---- Toolbar ---- */
	.toolbar {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.chips {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.chip {
		white-space: nowrap;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-600);
		background: var(--white);
		border: 1px solid var(--gray-300);
		padding: 0.45rem 0.875rem;
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: #fff;
	}

	.custom-range {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--gray-400);
	}

	.custom-range input {
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-700);
		background: var(--white);
	}

	.apply-btn {
		padding: 0.4rem 0.875rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--brand);
		color: #fff;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
	}

	.apply-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.vehicle-filter {
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-700);
		background: var(--white);
		max-width: 260px;
	}

	.totals {
		font-size: var(--text-sm);
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
	}

	/* ---- Table ---- */
	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
	}

	.table-wrap {
		overflow: auto;
		max-height: calc(100vh - 250px);
	}

	.grid {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.grid th {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--gray-50);
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		padding: 0.5rem 0.625rem;
		border-bottom: 2px solid var(--gray-200);
	}

	.grid td {
		padding: 0.35rem 0.625rem;
		border-bottom: 1px solid var(--gray-100);
		color: var(--gray-700);
	}

	.grid th.num,
	.grid td.num {
		text-align: right;
	}

	tr.band td {
		background: #fbfbfa;
	}

	tr.flash-ok td {
		background: #f0fdf4 !important;
		transition: background 0.2s ease;
	}

	tr.flash-err td {
		background: #fef2f2 !important;
	}

	.cell-date {
		color: var(--gray-400);
		white-space: nowrap;
	}

	.order-btns {
		display: inline-flex;
		flex-direction: column;
		vertical-align: middle;
		width: 14px;
		margin-right: 0.25rem;
		opacity: 0;
		transition: opacity 0.12s ease;
	}

	tr:hover .order-btns {
		opacity: 1;
	}

	@media (hover: none) {
		.order-btns {
			opacity: 1;
		}
	}

	.ord {
		border: none;
		background: none;
		color: var(--gray-400);
		cursor: pointer;
		font-size: 0.5rem;
		line-height: 1;
		padding: 1px 3px;
	}

	.ord:hover:not(:disabled) {
		color: var(--brand);
	}

	.ord:disabled {
		opacity: 0.25;
		cursor: default;
	}

	.day-num {
		color: var(--gray-300);
		font-size: var(--text-xs);
	}

	.v-code {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.v-name {
		color: var(--gray-500);
	}

	.cell-litres {
		font-weight: var(--font-weight-semibold);
		color: var(--gray-900);
	}

	.cell-ro {
		color: var(--gray-400);
		background: var(--gray-50);
	}

	tr.band td.cell-ro {
		background: var(--gray-100);
	}

	.cell-bowser {
		font-size: var(--text-xs);
	}

	td.gauge-bad {
		background: #fef3c7;
	}

	.multi-field {
		color: var(--brand);
		font-weight: 500;
	}

	.gauge-warn {
		margin-left: 0.25rem;
		font-size: var(--text-xs);
	}

	/* Editable cells read darker than the derived/read-only ones */
	td.ed {
		cursor: pointer;
		color: var(--gray-800);
	}

	td.ed:hover {
		box-shadow: inset 0 0 0 1px var(--gray-300);
		border-radius: 3px;
	}

	td.ed select,
	td.ed input {
		width: 100%;
		min-width: 90px;
		padding: 0.2rem 0.3rem;
		border: 1px solid var(--brand-ring);
		border-radius: 3px;
		font-size: var(--text-sm);
		font-family: inherit;
		background: var(--white);
		color: var(--gray-800);
	}

	td.ed input[type='number'] {
		text-align: right;
	}

	td.ed select:focus,
	td.ed input:focus {
		outline: none;
	}

	.cell-actions {
		white-space: nowrap;
	}

	.row-act {
		border: none;
		background: none;
		color: var(--gray-300);
		cursor: pointer;
		font-size: var(--text-sm);
		padding: 0.15rem 0.3rem;
	}

	.row-act:hover {
		color: var(--gray-600);
	}

	.row-act.del:hover {
		color: var(--error);
	}

	/* ---- States ---- */
	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-400);
		margin: 0;
		padding: 1rem 1.125rem;
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
	}

	.toast {
		position: fixed;
		bottom: 5.5rem;
		right: 1rem;
		z-index: 1100;
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	}

	.toast.ok {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--success-dark);
	}

	.toast.err {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.skeleton {
		background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-lg);
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
