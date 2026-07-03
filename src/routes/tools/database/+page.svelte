<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import supabaseService from '$lib/services/supabase';
	import { referenceDataStore } from '$lib/stores/reference-data';
	import { ENTITIES, entityByKey, type EntityConfig } from './entities';
	import EntityEditor from './EntityEditor.svelte';

	/**
	 * Reference-data admin: everything a fuel entry references (vehicles,
	 * drivers, bowsers, activities, fields, zones), editable without touching
	 * Supabase. Deep-linkable via ?entity=…&edit=…. No hard deletes — items
	 * are deactivated so history keeps its references.
	 */

	let selectedKey = $state('vehicles');
	let config = $derived(entityByKey(selectedKey));

	let rows = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let showInactive = $state(false);
	let statusMsg = $state<string | null>(null);

	let editorOpen = $state(false);
	let editingRow = $state<any | null>(null); // null = create
	let pendingEditId = $state<string | null>(null); // from ?edit= deep link

	// Slim vehicle list for the driver default-vehicle select
	let vehiclesLite = $state<{ id: string; code: string; name: string }[]>([]);

	async function loadRows(cfg: EntityConfig = config) {
		loading = true;
		error = null;
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();
			const res = await client.from(cfg.table).select('*').order(cfg.orderBy);
			if (res.error) throw new Error(res.error.message);
			rows = res.data || [];
			if (pendingEditId) {
				const target = rows.find((r) => r.id === pendingEditId);
				pendingEditId = null;
				if (target) {
					editingRow = target;
					editorOpen = true;
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
			rows = [];
		} finally {
			loading = false;
		}
	}

	async function loadVehiclesLite() {
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();
			const res = await client
				.from('vehicles')
				.select('id, code, name')
				.eq('active', true)
				.order('code');
			vehiclesLite = res.data || [];
		} catch {
			/* driver select degrades to empty */
		}
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const entity = params.get('entity');
		if (entity && ENTITIES.some((e) => e.key === entity)) selectedKey = entity;
		pendingEditId = params.get('edit');
		loadRows(entityByKey(selectedKey));
		loadVehiclesLite();
	});

	function selectEntity(key: string) {
		if (key === selectedKey) return;
		selectedKey = key;
		search = '';
		statusMsg = null;
		rows = [];
		goto(`?entity=${key}`, { replaceState: true, noScroll: true, keepFocus: true });
		loadRows(entityByKey(key));
	}

	let activeCount = $derived(rows.filter((r) => r.active !== false).length);
	let inactiveCount = $derived(rows.length - activeCount);

	let filtered = $derived.by(() => {
		let list = showInactive ? rows : rows.filter((r) => r.active !== false);
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter((r) =>
				config.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q))
			);
		}
		return list;
	});

	function openCreate() {
		editingRow = null;
		editorOpen = true;
	}

	function openEdit(row: any) {
		editingRow = row;
		editorOpen = true;
	}

	async function handleSaved() {
		const wasEdit = !!editingRow;
		editorOpen = false;
		editingRow = null;
		statusMsg = wasEdit ? `${config.label} updated.` : `${config.label} added.`;
		await loadRows();
		// Fuel-entry pickers read the reference-data cache — refresh it now
		referenceDataStore.loadAllData(true);
		if (config.key === 'vehicles') loadVehiclesLite();
	}
</script>

<svelte:head>
	<title>Database - FarmTrack</title>
</svelte:head>

<div class="db-page">
	<div class="page-header">
		<h1>Database</h1>
		<p>Vehicles, drivers, and the rest of what fuel entries reference</p>
	</div>

	<div class="chips">
		{#each ENTITIES as e}
			<button class="chip" class:on={e.key === selectedKey} onclick={() => selectEntity(e.key)}>
				{e.plural}
			</button>
		{/each}
	</div>

	{#if statusMsg}
		<div class="status-banner">{statusMsg}</div>
	{/if}
	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	<section class="panel">
		<div class="toolbar">
			<input
				class="search"
				type="search"
				placeholder="Search {config.plural.toLowerCase()}…"
				bind:value={search}
			/>
			<button class="add-btn" onclick={openCreate}>＋ Add</button>
		</div>

		<div class="meta-row">
			<span class="counts">
				{activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
			</span>
			{#if inactiveCount > 0}
				<label class="inactive-toggle">
					<input type="checkbox" bind:checked={showInactive} />
					Show inactive
				</label>
			{/if}
			{#if config.key === 'zones'}
				<a class="print-link" href="/tools/database/zones/print">Print zone cards</a>
			{/if}
		</div>

		{#if loading}
			<div class="skeleton" style="height: 12rem"></div>
		{:else if filtered.length === 0}
			<p class="empty-note">
				{search ? `Nothing matches “${search}”.` : `No ${config.plural.toLowerCase()} yet.`}
			</p>
		{:else}
			<ul class="row-list">
				{#each filtered as row (row.id)}
					<li class="row" class:inactive={row.active === false}>
						<button class="row-btn" onclick={() => openEdit(row)}>
							{#if config.colorDot?.(row)}
								<span class="dot" style="background: {config.colorDot(row)}"></span>
							{/if}
							<span class="row-main">
								<span class="row-title">
									<span class="row-code">{row[config.codeKey]}</span>
									{row.name}
									{#if row.active === false}
										<span class="badge">inactive</span>
									{/if}
								</span>
								{#if config.secondary(row)}
									<span class="row-sub">{config.secondary(row)}</span>
								{/if}
							</span>
						</button>
						{#if config.historyLink}
							<a class="history-link" href={config.historyLink(row)}>History →</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

{#if editorOpen}
	<EntityEditor
		{config}
		row={editingRow}
		{rows}
		vehicles={vehiclesLite}
		onclose={() => {
			editorOpen = false;
			editingRow = null;
		}}
		onsaved={handleSaved}
	/>
{/if}

<style>
	.db-page {
		max-width: 800px;
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
		transition: all 0.15s ease;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: #fff;
	}

	.panel {
		background: var(--white);
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: 1rem 1.125rem;
	}

	.toolbar {
		display: flex;
		gap: 0.5rem;
	}

	.search {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--gray-800);
		background: var(--gray-50);
	}

	.search:focus {
		outline: none;
		border-color: var(--brand-ring);
		background: var(--white);
	}

	.add-btn {
		padding: 0.5rem 0.9rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--brand);
		color: #fff;
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		white-space: nowrap;
	}

	.add-btn:hover {
		background: var(--brand-hover);
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin: 0.625rem 0 0.375rem;
		font-size: var(--text-xs);
		color: var(--gray-400);
	}

	.inactive-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
		color: var(--gray-500);
	}

	.inactive-toggle input {
		accent-color: var(--brand);
	}

	.print-link {
		margin-left: auto;
		color: var(--brand);
		text-decoration: none;
		font-weight: 500;
	}

	.row-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		border-bottom: 1px solid var(--gray-100);
	}

	.row:last-child {
		border-bottom: none;
	}

	.row:hover {
		background: var(--gray-50);
	}

	.row.inactive {
		opacity: 0.55;
	}

	.row-btn {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: 1;
		min-width: 0;
		text-align: left;
		background: none;
		border: none;
		padding: 0.6rem 0.125rem;
		cursor: pointer;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.row-title {
		font-size: var(--text-sm);
		color: var(--gray-800);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-code {
		font-weight: var(--font-weight-semibold);
		color: var(--brand);
		margin-right: 0.25rem;
	}

	.badge {
		font-size: 0.625rem;
		font-weight: var(--font-weight-semibold);
		color: var(--gray-500);
		background: var(--gray-100);
		border-radius: var(--radius-full);
		padding: 0.1rem 0.45rem;
		margin-left: 0.375rem;
		vertical-align: middle;
	}

	.row-sub {
		font-size: var(--text-xs);
		color: var(--gray-400);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.history-link {
		font-size: var(--text-xs);
		color: var(--gray-400);
		text-decoration: none;
		white-space: nowrap;
		padding: 0.3rem 0.2rem;
	}

	.history-link:hover {
		color: var(--brand);
	}

	.empty-note {
		font-size: var(--text-sm);
		color: var(--gray-400);
		margin: 0.75rem 0 0;
	}

	.status-banner {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--success-dark);
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
		margin-top: 0.5rem;
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
