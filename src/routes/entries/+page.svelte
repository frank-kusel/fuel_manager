<script lang="ts">
	import { onMount } from 'svelte';
	import supabaseService from '$lib/services/supabase';
	import FuelEntryEditModal from '$lib/components/fuel/FuelEntryEditModal.svelte';
	import { markFuelDataStale, onVisible } from '$lib/stores/freshness';
	import { toast } from '$lib/stores/toast';
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

	type PeriodKey = '30d' | 'month' | 'lastMonth' | 'fyToDate' | 'fyPrev' | 'custom';
	let period = $state<PeriodKey>('30d');
	let customStart = $state('');
	let customEnd = $state('');
	let vehicleFilter = $state('');

	let entries = $state<any[]>([]);
	let truncatedLoad = $state(false);
	let fieldIdsByEntry = $state<Record<string, string[]>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Cell editing
	let editingCell = $state<{ entryId: string; col: string } | null>(null);
	let editValue = $state<any>('');
	let savingCell = $state(false);
	let rowFlash = $state<Record<string, 'ok' | 'err'>>({});

	// Full modal escape hatch
	let modalEntry = $state<any | null>(null);
	let modalOpen = $state(false);

	const today = () => new Date().toLocaleDateString('en-CA');

	/** Financial year starts 1 March — before then we're still in last year's. */
	function financialYearStart(now: Date): Date {
		const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
		return new Date(year, 2, 1);
	}

	/** "2025/26" for the financial year that 1 March `start` opens. */
	function fyLabel(start: Date): string {
		const y = start.getFullYear();
		return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
	}

	const thisFyStart = $derived(financialYearStart(new Date()));
	// 1 March a year earlier through the last day of February
	const prevFyStart = $derived(new Date(thisFyStart.getFullYear() - 1, 2, 1));
	// Day 0 of March = the last day of February, leap years included
	const prevFyEnd = $derived(new Date(thisFyStart.getFullYear(), 2, 0));

	function periodRange(): { start: string; end: string } {
		const now = new Date();
		const iso = (d: Date) => d.toLocaleDateString('en-CA');
		if (period === 'fyToDate') {
			return { start: iso(financialYearStart(now)), end: iso(now) };
		}
		if (period === 'fyPrev') {
			return { start: iso(prevFyStart), end: iso(prevFyEnd) };
		}
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

	let lastLoadedAt = 0;

	// The junction rows ride along on the entries query as a PostgREST embed
	// (`fuel_entry_fields (field_id)`), so this is a local reshape rather than a
	// second round trip to Frankfurt. It replaced a chunked `.in(...)` fetch that
	// had to work around both the URL length limit and the 1000-row page cap.
	function mapFieldIds(rows: any[]): Record<string, string[]> {
		const map: Record<string, string[]> = {};
		for (const e of rows) {
			const linked = e.fuel_entry_fields;
			if (Array.isArray(linked) && linked.length > 0) {
				map[e.id] = linked.map((l: { field_id: string }) => l.field_id);
			}
		}
		return map;
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
			// A silently cut-off tail is exactly the bug this page had before —
			// if the ceiling is hit, say so rather than quietly showing less.
			truncatedLoad = res.truncated === true;

			// Multi-field detection via the junction table, embedded above
			fieldIdsByEntry = mapFieldIds(entries);
			pruneColFilters();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load entries';
		} finally {
			loading = false;
			lastLoadedAt = Date.now();
		}
	}

	onMount(() => {
		referenceDataStore.loadAllData();
		load();
		// Returning to a stale tab: silent refetch if the table is >3 min old
		return onVisible(() => {
			if (Date.now() - lastLoadedAt > 3 * 60 * 1000) load(true);
		});
	});

	function setPeriod(p: PeriodKey) {
		period = p;
		if (p !== 'custom') load();
	}

	function applyCustom() {
		if (customStart && customEnd) load();
	}

	// ---- Excel-style column filters (checkbox popovers in the header) ----
	type FilterCol = 'vehicle' | 'driver' | 'activity' | 'field';
	const FILTER_COLS: FilterCol[] = ['vehicle', 'driver', 'activity', 'field'];

	// null = no filter (everything shown); otherwise the checked values
	let colFilters = $state<Record<FilterCol, string[] | null>>({
		vehicle: null,
		driver: null,
		activity: null,
		field: null
	});
	let openFilter = $state<FilterCol | null>(null);

	function cellValueFor(col: FilterCol, e: any): string {
		if (col === 'vehicle') return e.vehicles?.code || '—';
		if (col === 'driver') return e.drivers?.name || '—';
		if (col === 'activity') return e.activities?.name || '—';
		return fieldCell(e).text; // field
	}

	function distinct(col: FilterCol, list: any[]): string[] {
		return [...new Set(list.map((e) => cellValueFor(col, e)))].sort();
	}

	/** Every value in the period, ignoring all filters. The baseline for "is
	 * this column fully checked" and for pruning — never the popover list. */
	function allOptions(col: FilterCol): string[] {
		return distinct(col, entries);
	}

	/** The popover list: values still reachable given every *other* filter, so
	 * filtering to two vehicles narrows the Activity list to their activities.
	 * The column's own filter is skipped — otherwise unchecking a value would
	 * remove it from its own list and you could never check it back on.
	 *
	 * Checked-but-unreachable values stay in colFilters rather than being
	 * dropped, so widening the vehicle filter again restores the old activity
	 * list instead of silently having reset it. */
	function filterOptions(col: FilterCol): string[] {
		let list = vehicleFilter ? entries.filter((e) => e.vehicle_id === vehicleFilter) : entries;
		for (const other of FILTER_COLS) {
			if (other === col) continue;
			const f = colFilters[other];
			if (f !== null) list = list.filter((e) => f.includes(cellValueFor(other, e)));
		}
		if (reviewOn) list = list.filter(inReview);
		return distinct(col, list);
	}

	function isChecked(col: FilterCol, val: string): boolean {
		return colFilters[col] === null || colFilters[col]!.includes(val);
	}

	function toggleFilterValue(col: FilterCol, val: string) {
		// Against the full value set, not the cascaded list: unchecking one row
		// of a narrowed popover must not silently drop the values another
		// filter is currently hiding.
		const options = allOptions(col);
		const current = colFilters[col] ?? options; // null = all checked
		const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
		colFilters = { ...colFilters, [col]: next.length >= options.length ? null : next };
	}

	function setAll(col: FilterCol, checked: boolean) {
		colFilters = { ...colFilters, [col]: checked ? null : [] };
	}

	let anyColFilter = $derived(FILTER_COLS.some((c) => colFilters[c] !== null));

	function clearAllFilters() {
		colFilters = { vehicle: null, driver: null, activity: null, field: null };
		openFilter = null;
	}

	/** After a reload the period may hold none of the previously checked values —
	 * a filter that matches nothing would blank the table, so drop it. */
	function pruneColFilters() {
		let next = colFilters;
		for (const col of FILTER_COLS) {
			const f = next[col];
			if (f === null) continue;
			// allOptions, not the cascaded list — pruning is about values the new
			// period no longer has, not values another filter is hiding.
			const options = allOptions(col);
			const kept = f.filter((v) => options.includes(v));
			const value = kept.length === 0 || kept.length >= options.length ? null : kept;
			if (value !== f) next = { ...next, [col]: value };
		}
		colFilters = next;
	}

	// ---- Review: entries worth a second look ----
	// Deliberately narrow — only things that are wrong or missing on the entry
	// itself, so the count stays a worklist rather than background noise.
	type IssueKey = 'noOdoEnd' | 'noOdoStart' | 'noMovement' | 'gaugeBroken' | 'noBowser';

	const ISSUE_DEFS: { key: IssueKey; label: string; test: (e: any) => boolean }[] = [
		{
			key: 'noOdoEnd',
			label: 'No odo end',
			test: (e) => e.gauge_working !== false && e.odometer_end === null
		},
		{
			key: 'noOdoStart',
			label: 'No odo start',
			test: (e) => e.gauge_working !== false && e.odometer_start === null
		},
		{
			key: 'noMovement',
			// Odometer didn't move (or went backwards) — usage can't be derived
			label: 'No movement',
			test: (e) =>
				e.gauge_working !== false &&
				e.odometer_start !== null &&
				e.odometer_end !== null &&
				e.odometer_end <= e.odometer_start
		},
		{ key: 'gaugeBroken', label: 'Gauge broken', test: (e) => e.gauge_working === false },
		{
			key: 'noBowser',
			label: 'No bowser reading',
			test: (e) => e.bowser_reading_start === null || e.bowser_reading_end === null
		}
	];

	let reviewOn = $state(false);
	let issueFilter = $state<IssueKey | 'all'>('all');

	// Reordering positions an entry within its day, and the day's positions are
	// counted from the visible rows — so it's only safe on the unfiltered list.
	let anyRowFilter = $derived(!!vehicleFilter || anyColFilter || reviewOn);

	function issuesFor(e: any): { key: IssueKey; label: string }[] {
		return ISSUE_DEFS.filter((d) => d.test(e)).map(({ key, label }) => ({ key, label }));
	}

	// One amber for anything wrong with the odometer pair — a broken gauge and a
	// missing reading are the same kind of "don't trust this number".
	const ODO_ISSUES: IssueKey[] = ['noOdoStart', 'noOdoEnd', 'noMovement', 'gaugeBroken'];

	function odoIssue(e: any): boolean {
		return ISSUE_DEFS.some((d) => ODO_ISSUES.includes(d.key) && d.test(e));
	}

	function inReview(e: any): boolean {
		if (issueFilter === 'all') return ISSUE_DEFS.some((d) => d.test(e));
		const def = ISSUE_DEFS.find((d) => d.key === issueFilter)!;
		return def.test(e);
	}

	// The vehicle/column-filtered set, before the review filter — issue counts
	// describe what you're looking at, not the whole period.
	const filteredEntries = $derived.by(() => {
		let list = vehicleFilter ? entries.filter((e) => e.vehicle_id === vehicleFilter) : entries;
		for (const col of FILTER_COLS) {
			const f = colFilters[col];
			if (f !== null) list = list.filter((e) => f.includes(cellValueFor(col, e)));
		}
		return list;
	});

	const issueCounts = $derived.by(() => {
		const counts: Record<string, number> = { all: 0 };
		for (const d of ISSUE_DEFS) counts[d.key] = 0;
		for (const e of filteredEntries) {
			let any = false;
			for (const d of ISSUE_DEFS) {
				if (d.test(e)) {
					counts[d.key]++;
					any = true;
				}
			}
			if (any) counts.all++;
		}
		return counts;
	});

	// ---- Display rows: filters, per-day numbers, day banding ----
	const displayRows = $derived.by(() => {
		const list = reviewOn ? filteredEntries.filter(inReview) : filteredEntries;

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
			markFuelDataStale();
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

	/** Odometer movement in the vehicle's own unit (km or hr). */
	function usage(e: any): string {
		if (e.gauge_working === false || e.odometer_start === null || e.odometer_end === null)
			return '—';
		const diff = e.odometer_end - e.odometer_start;
		if (diff <= 0) return '—';
		const unit = e.vehicles?.odometer_unit || 'km';
		const isHours = unit === 'hours' || unit === 'hr';
		return `${isHours ? nf1.format(diff) : nf.format(Math.round(diff))} ${isHours ? 'hr' : 'km'}`;
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
		if (kind === 'ok') toast.success(text);
		else toast.error(text);
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
			markFuelDataStale();
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
		markFuelDataStale();
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
			markFuelDataStale();
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
			<button
				class="chip"
				class:on={period === 'fyToDate'}
				onclick={() => setPeriod('fyToDate')}
				title="1 March {thisFyStart.getFullYear()} to today"
			>FY {fyLabel(thisFyStart)} to date</button>
			<button
				class="chip"
				class:on={period === 'fyPrev'}
				onclick={() => setPeriod('fyPrev')}
				title="1 March {prevFyStart.getFullYear()} to {prevFyEnd.toLocaleDateString('en-ZA', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})}"
			>FY {fyLabel(prevFyStart)}</button>
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
			<button
				class="review-chip"
				class:on={reviewOn}
				title="Show only entries with missing or contradictory readings"
				onclick={() => (reviewOn = !reviewOn)}
			>
				⚠ Review <span class="review-count">{issueCounts.all}</span>
			</button>
			{#if reviewOn}
				<select class="issue-filter" bind:value={issueFilter}>
					<option value="all">All issues ({issueCounts.all})</option>
					{#each ISSUE_DEFS as d}
						<option value={d.key} disabled={issueCounts[d.key] === 0}>
							{d.label} ({issueCounts[d.key]})
						</option>
					{/each}
				</select>
			{/if}
			<span class="totals">
				{displayRows.length} {displayRows.length === 1 ? 'entry' : 'entries'} · {nf.format(Math.round(totalLitres))} L
			</span>
			{#if anyColFilter}
				<button class="clear-filters" onclick={clearAllFilters}>✕ Clear filters</button>
			{/if}
		</div>
	</div>

	{#if openFilter}
		<!-- click-away for the open column filter -->
		<div
			class="flt-overlay"
			onclick={() => (openFilter = null)}
			role="presentation"
		></div>
	{/if}

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if truncatedLoad}
		<div class="warn-banner">
			Showing the most recent {nf.format(entries.length)} entries — this period has more. Narrow the
			dates to see the rest.
		</div>
	{/if}

	{#if loading && entries.length === 0}
		<div class="skeleton" style="height: 20rem"></div>
	{:else if displayRows.length === 0 && !anyColFilter}
		<div class="panel"><p class="empty-note">No entries in this period.</p></div>
	{:else}
		{#snippet filterTh(label: string, col: FilterCol)}
			<th class="filterable">
				<span class="th-wrap">
					{label}
					<button
						class="flt-btn"
						class:on={colFilters[col] !== null}
						title="Filter {label.toLowerCase()}"
						onclick={(ev) => {
							ev.stopPropagation();
							openFilter = openFilter === col ? null : col;
						}}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={colFilters[col] !== null ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
					</button>
				</span>
				{#if openFilter === col}
					<div class="flt-menu" role="menu">
						<div class="flt-actions">
							<button onclick={() => setAll(col, true)}>All</button>
							<button onclick={() => setAll(col, false)}>None</button>
						</div>
						<div class="flt-list">
							{#each filterOptions(col) as val}
								<label class="flt-opt">
									<input
										type="checkbox"
										checked={isChecked(col, val)}
										onchange={() => toggleFilterValue(col, val)}
									/>
									<span>{val}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</th>
		{/snippet}

		<div class="table-wrap panel" class:menu-open={openFilter !== null}>
			<table class="grid">
				<thead>
					<tr>
						<th>Date</th>
						{@render filterTh('Vehicle', 'vehicle')}
						{@render filterTh('Driver', 'driver')}
						{@render filterTh('Activity', 'activity')}
						{@render filterTh('Field', 'field')}
						<th>Zone</th>
						<th class="num">Odo start</th>
						<th class="num">Odo end</th>
						<th class="num">Usage</th>
						<th class="num">Litres</th>
						<th class="num">L/100</th>
						<th class="num">Bowser</th>
						{#if reviewOn}<th>Issue</th>{/if}
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if displayRows.length === 0}
						<tr>
							<td colspan={reviewOn ? 14 : 13} class="no-match">
								{reviewOn ? 'Nothing to review — no entries with issues here.' : 'No entries match the filters.'}
							</td>
						</tr>
					{/if}
					{#each displayRows as { e, num, dayCount, band } (e.id)}
						<tr class:band class:flash-ok={rowFlash[e.id] === 'ok'} class:flash-err={rowFlash[e.id] === 'err'}>
							<td class="cell-date" title={e.entry_date}>
								<!-- Always rendered so single-entry days keep the same indent -->
								<span class="order-btns">
									{#if dayCount > 1 && !anyRowFilter}
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
								<span class="cell-val" class:under-editor={isEditing(e.id, 'vehicle_id')}>
									<span class="v-code">{e.vehicles?.code || '—'}</span>
									<span class="v-name">{e.vehicles?.name || ''}</span>
								</span>
								{#if isEditing(e.id, 'vehicle_id')}
									<select class="cell-editor" bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each $activeVehicles as v}
											<option value={v.id}>{v.code} — {v.name}</option>
										{/each}
									</select>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'driver_id')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'driver_id')}>
									{e.drivers?.name || '—'}
								</span>
								{#if isEditing(e.id, 'driver_id')}
									<select class="cell-editor" bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each $activeDrivers as d}
											<option value={d.id}>{d.name}</option>
										{/each}
									</select>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'activity_id')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'activity_id')}>
									{e.activities?.name || '—'}
								</span>
								{#if isEditing(e.id, 'activity_id')}
									<select class="cell-editor" bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each activeActivities as a}
											<option value={a.id}>{a.name}</option>
										{/each}
									</select>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'field')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'field')}>
									<span class:multi-field={fieldCell(e).multi}>{fieldCell(e).text}</span>
								</span>
								{#if isEditing(e.id, 'field')}
									<select class="cell-editor" bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										{#each activeFields as f}
											<option value={f.id}>{f.name}</option>
										{/each}
									</select>
								{/if}
							</td>

							<td class="ed" onclick={() => startEdit(e, 'zone_id')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'zone_id')}>
									{e.zones?.name || '—'}
								</span>
								{#if isEditing(e.id, 'zone_id')}
									<select class="cell-editor" bind:value={editValue} onchange={() => commitEdit(e)} onblur={cancelEdit} use:focusInput>
										<option value="">—</option>
										{#each activeZones as z}
											<option value={z.id}>{z.name}</option>
										{/each}
									</select>
								{/if}
							</td>

							<td class="ed num" class:gauge-bad={odoIssue(e)} onclick={() => startEdit(e, 'odometer_start')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'odometer_start')}>
									{fmtNum(e.odometer_start)}
									{#if e.gauge_working === false}<span class="gauge-warn" title="Gauge broken">⚠</span>{/if}
								</span>
								{#if isEditing(e.id, 'odometer_start')}
									<input
										class="cell-editor"
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
								{/if}
							</td>

							<td class="ed num" class:gauge-bad={odoIssue(e)} onclick={() => startEdit(e, 'odometer_end')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'odometer_end')}>
									{fmtNum(e.odometer_end)}
								</span>
								{#if isEditing(e.id, 'odometer_end')}
									<input
										class="cell-editor"
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
								{/if}
							</td>

							<td class="num cell-ro">{usage(e)}</td>

							<td class="ed num cell-litres" onclick={() => startEdit(e, 'litres_dispensed')}>
								<span class="cell-val" class:under-editor={isEditing(e.id, 'litres_dispensed')}>
									{nf1.format(e.litres_dispensed)}
								</span>
								{#if isEditing(e.id, 'litres_dispensed')}
									<input
										class="cell-editor"
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
								{/if}
							</td>

							<td class="num cell-ro">{e.fuel_consumption_l_per_100km ?? '—'}</td>

							<td class="num cell-ro cell-bowser" title="Bowser meter start → end (derived)">
								{fmtNum(e.bowser_reading_start)} → {fmtNum(e.bowser_reading_end)}
							</td>

							{#if reviewOn}
								<td class="cell-issues">
									{#each issuesFor(e) as iss}
										<span class="issue-tag">{iss.label}</span>
									{/each}
								</td>
							{/if}

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
		padding: 0.45rem 2rem 0.45rem 0.6rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-700);
		max-width: 260px;
		cursor: pointer;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-color: var(--white);
		background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
		background-repeat: no-repeat;
		background-position: right 0.6rem center;
		background-size: 0.6rem;
	}

	.vehicle-filter:hover {
		border-color: var(--gray-300);
	}

	.totals {
		font-size: var(--text-sm);
		color: var(--gray-500);
		font-variant-numeric: tabular-nums;
	}

	/* ---- Review mode ---- */
	.review-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--gray-600);
		background: var(--white);
		border: 1px solid var(--gray-300);
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.review-chip:hover {
		border-color: var(--warning, #d97706);
		color: var(--gray-800);
	}

	.review-chip.on {
		background: #fffbeb;
		border-color: #fcd34d;
		color: #92400e;
	}

	.review-count {
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		background: var(--gray-100);
		border-radius: var(--radius-full);
		padding: 0.05rem 0.4rem;
	}

	.review-chip.on .review-count {
		background: #fde68a;
		color: #78350f;
	}

	.issue-filter {
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-700);
		background: var(--white);
	}

	.cell-issues {
		white-space: nowrap;
	}

	.issue-tag {
		display: inline-block;
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		padding: 0.05rem 0.45rem;
		margin-right: 0.25rem;
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

	/* An open header menu is absolutely positioned inside the scroll box, so a
	 * short (or empty) result set would otherwise clip it away. */
	.table-wrap.menu-open {
		min-height: 400px;
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

	/* `tr.band td` (0,1,2) out-specifies a bare `td.gauge-bad` (0,1,1), so on
	 * banded days the warning tint silently lost — the same flag looked yellow
	 * on one row and plain on the next. Match the banded selector's weight. */
	td.gauge-bad,
	tr.band td.gauge-bad {
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
		position: relative;
	}

	td.ed:hover {
		box-shadow: inset 0 0 0 1px var(--gray-300);
		border-radius: 3px;
	}

	/* The display value stays in the flow (keeps the column width stable);
	 * the editor floats over it, so nothing jumps while editing. */
	.cell-val.under-editor {
		visibility: hidden;
	}

	.cell-editor {
		position: absolute;
		inset: 2px;
		width: calc(100% - 4px);
		height: calc(100% - 4px);
		box-sizing: border-box;
		padding: 0 0.3rem;
		border: 1px solid var(--brand);
		border-radius: 3px;
		font-size: var(--text-sm);
		font-family: inherit;
		background: var(--white);
		color: var(--gray-800);
	}

	td.ed input.cell-editor[type='number'] {
		text-align: right;
	}

	.cell-editor:focus {
		outline: none;
	}

	/* ---- Column filters (Excel-style header popovers) ---- */
	/* Sticky (not relative) — `position: relative` here would out-specify
	 * `.grid th`'s sticky and let these four headers scroll away while the
	 * rest stayed pinned. Sticky is positioned, so the popover still anchors. */
	th.filterable {
		position: sticky;
		top: 0;
		z-index: 3; /* above the plain headers, so an open menu isn't clipped by them */
	}

	.th-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.flt-btn {
		border: none;
		background: none;
		color: var(--gray-300);
		cursor: pointer;
		padding: 0.1rem 0.2rem;
		line-height: 1;
	}

	.flt-btn:hover {
		color: var(--gray-600);
	}

	.flt-btn.on {
		color: var(--brand);
	}

	.flt-menu {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 20;
		min-width: 200px;
		max-width: 280px;
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		font-weight: 400;
		text-transform: none;
	}

	.flt-actions {
		display: flex;
		gap: 0.375rem;
		padding: 0.45rem 0.6rem;
		border-bottom: 1px solid var(--gray-100);
	}

	.flt-actions button {
		border: 1px solid var(--gray-200);
		background: var(--white);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: var(--gray-600);
		padding: 0.15rem 0.6rem;
		cursor: pointer;
	}

	.flt-actions button:hover {
		border-color: var(--brand-ring);
		color: var(--brand);
	}

	.flt-list {
		max-height: 260px;
		overflow-y: auto;
		padding: 0.25rem 0;
	}

	.flt-opt {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.6rem;
		font-size: var(--text-sm);
		color: var(--gray-700);
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.flt-opt:hover {
		background: var(--gray-50);
	}

	.flt-opt input {
		accent-color: var(--brand);
		flex-shrink: 0;
	}

	.flt-overlay {
		/* Below the sticky header (z 2) so the open menu inside a th stays
		 * clickable, above the static table body so any other click closes. */
		position: fixed;
		inset: 0;
		z-index: 1;
		background: transparent;
	}

	.no-match {
		text-align: center;
		color: var(--gray-400);
		padding: 1.25rem !important;
	}

	.clear-filters {
		border: 1px solid var(--gray-200);
		background: var(--white);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: var(--brand);
		padding: 0.25rem 0.7rem;
		cursor: pointer;
	}

	.clear-filters:hover {
		border-color: var(--brand-ring);
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

	.warn-banner {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #92400e;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: var(--text-sm);
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
