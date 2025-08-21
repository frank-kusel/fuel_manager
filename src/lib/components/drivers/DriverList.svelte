<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DriverCard from '$lib/components/drivers/DriverCard.svelte';
	import driverStore, { drivers, driverLoading, driverError } from '$lib/stores/drivers';
	import type { Driver, Option } from '$lib/types';

	interface Props {
		onAdd?: () => void;
		onEdit?: (driver: Driver) => void;
		onView?: (driver: Driver) => void;
	}

	let { onAdd, onEdit, onView }: Props = $props();

	const dispatch = createEventDispatcher<{ add: void; edit: Driver; view: Driver }>();

	export interface Events {
		add: CustomEvent<void>;
		edit: CustomEvent<Driver>;
		view: CustomEvent<Driver>;
	}

	// Search and filter state
	let searchTerm = $state('');
	let filterActive = $state<'all' | 'active' | 'inactive'>('all');
	let sortOrder = $state('name:asc');

	// Derived store for filtering and sorting
	const filteredAndSortedDrivers = $derived.by(() => {
		let filtered = $drivers;

		if (searchTerm) {
			const lowerCaseSearch = searchTerm.toLowerCase();
			filtered = filtered.filter((driver) =>
				driver.name.toLowerCase().includes(lowerCaseSearch)
			);
		}

		if (filterActive !== 'all') {
			filtered = filtered.filter((driver) => driver.active === (filterActive === 'active'));
		}

		const [sortKey, sortDir] = sortOrder.split(':');
		return [...filtered].sort((a, b) => {
			const aValue = a[sortKey as keyof Driver] ?? '';
			const bValue = b[sortKey as keyof Driver] ?? '';
			if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
	});

	// Derived stats
	const stats = $derived.by(() => ({
		total: $drivers.length,
		active: $drivers.filter((d) => d.active).length,
		inactive: $drivers.filter((d) => !d.active).length,
		showing: filteredAndSortedDrivers.length
	}));

	// Handle actions
	function handleAddDriver() {
		if (onAdd) onAdd();
		else dispatch('add');
	}

	function handleEditDriver(driver: Driver) {
		if (onEdit) onEdit(driver);
		else dispatch('edit', driver);
	}

	function handleViewDriver(driver: Driver) {
		if (onView) onView(driver);
		else dispatch('view', driver);
	}

	function toggleSort(field: keyof Driver) {
		if (sortOrder.startsWith(field)) {
			sortOrder = `${field}:${sortOrder.split(':')[1] === 'asc' ? 'desc' : 'asc'}`;
		} else {
			sortOrder = `${field}:asc`;
		}
	}

	// Load drivers on mount
	onMount(() => {
		if ($drivers.length === 0) {
			driverStore.loadDrivers();
		}
	});

	const activeFilterOptions: Option[] = [
		{ value: 'all', label: 'All Drivers' },
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' }
	];
</script>

<div class="driver-list">
	<div class="list-header">
		<div class="header-title">
			<h2>Driver Management</h2>
			<p>Manage your team of drivers</p>
		</div>
		<div class="header-actions">
			<Button variant="primary" onclick={handleAddDriver}>
				<span class="add-icon">👤</span>
				Add Driver
			</Button>
		</div>
	</div>

	<div class="stats-container">
		<div class="stat-card">
			<h4>{stats.total}</h4>
			<p>Total Drivers</p>
		</div>
		<div class="stat-card">
			<h4>{stats.active}</h4>
			<p>Active</p>
		</div>
		<div class="stat-card">
			<h4>{stats.inactive}</h4>
			<p>Inactive</p>
		</div>
		<div class="stat-card">
			<h4>{stats.showing}</h4>
			<p>Showing</p>
		</div>
	</div>

	<div class="filters-section">
		<Input bind:value={searchTerm} type="search" placeholder="Search drivers..." />
		<Select bind:value={filterActive} options={activeFilterOptions} />
	</div>

	<!-- Drivers List -->
	<div class="drivers-container">
		{#if $driverLoading === 'loading'}
			<div class="loading-card">
				<div class="drivers-grid">
					{#each { length: 6 } as _}
						<Card>
							<div class="loading-content"></div>
						</Card>
					{/each}
				</div>
			</div>
		{:else if $driverError}
			<div class="error-card">
				<Card>
					<div class="error-content">
						<span class="error-icon">⚠️</span>
						<h3>Error Loading Drivers</h3>
						<p>{$driverError}</p>
						<Button variant="secondary" onclick={() => driverStore.loadDrivers()}>Retry</Button>
					</div>
				</Card>
			</div>
		{:else if filteredAndSortedDrivers.length === 0}
			<div class="empty-state">
				<Card>
					<div class="empty-content">
						<div class="empty-icon">👥</div>
						<h3>No drivers found</h3>
						<p>
							{searchTerm
								? 'No drivers match your search criteria.'
								: 'Get started by adding your first driver.'}
						</p>
						{#if !searchTerm}
							<Button variant="primary" onclick={handleAddDriver}>
								<span class="add-icon">👤</span>
								Add First Driver
							</Button>
						{/if}
					</div>
				</Card>
			</div>
		{:else}
			<div class="drivers-grid">
				{#each filteredAndSortedDrivers as driver (driver.id)}
					<DriverCard
						{driver}
						on:view={() => handleViewDriver(driver)}
						on:edit={() => handleEditDriver(driver)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.driver-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Header */
	.list-header {
		background: linear-gradient(135deg, var(--primary) 0%, var(--green-600) 100%);
		color: white;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-title h2 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
	}

	.header-title p {
		font-size: 1rem;
		color: var(--gray-500);
		margin: 0.25rem 0 0;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.add-icon {
		margin-right: 0.5rem;
	}

	.stats-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		text-align: center;
	}

	.stat-card h4 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}

	.stat-card p {
		font-size: 0.875rem;
		color: var(--gray-500);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.filters-section {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.filters-section :global(.input-wrapper),
	.filters-section :global(.select-wrapper) {
		flex-grow: 1;
		min-width: 200px;
	}

	.drivers-container {
		position: relative;
	}

	.drivers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.loading-card,
	.error-card,
	.empty-state {
		grid-column: 1 / -1;
	}

	.loading-card {
		height: 350px; /* Approximate height of a driver card */
	}

	.loading-content {
		height: 100%;
		width: 100%;
		background-color: var(--gray-100);
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.error-content {
		padding: 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		font-size: 2.5rem;
	}

	.empty-state {
		padding: 3rem 1rem;
		text-align: center;
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.empty-icon {
		font-size: 3rem;
		background-color: var(--gray-100);
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	@media (max-width: 768px) {
		.list-header {
			flex-direction: column;
			align-items: stretch;
		}
		.header-actions {
			width: 100%;
			display: grid;
			grid-template-columns: 1fr;
		}
	}
</style>