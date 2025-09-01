<script lang="ts">
	import { onMount } from 'svelte';
	import VehicleList from '$lib/components/vehicles/VehicleList.svelte';
	import VehicleForm from '$lib/components/vehicles/VehicleForm.svelte';
	import VehicleDetail from '$lib/components/vehicles/VehicleDetail.svelte';
	import DriverList from '$lib/components/drivers/DriverList.svelte';
	import DriverForm from '$lib/components/drivers/DriverForm.svelte';
	import DriverDetail from '$lib/components/drivers/DriverDetail.svelte';
	import BowserList from '$lib/components/bowsers/BowserList.svelte';
	import BowserForm from '$lib/components/bowsers/BowserForm.svelte';
	import BowserDetail from '$lib/components/bowsers/BowserDetail.svelte';
	import ActivityList from '$lib/components/activities/ActivityList.svelte';
	import ActivityForm from '$lib/components/activities/ActivityForm.svelte';
	import ActivityDetail from '$lib/components/activities/ActivityDetail.svelte';
	import FieldList from '$lib/components/fields/FieldList.svelte';
	import FieldForm from '$lib/components/fields/FieldForm.svelte';
	import FieldDetail from '$lib/components/fields/FieldDetail.svelte';
	import ZoneList from '$lib/components/zones/ZoneList.svelte';
	import ZoneForm from '$lib/components/zones/ZoneForm.svelte';
	import ZoneDetail from '$lib/components/zones/ZoneDetail.svelte';
	import vehicleStore from '$lib/stores/vehicles';
	import driverStore from '$lib/stores/drivers';
	import bowserStore from '$lib/stores/bowsers';
	import activityStore from '$lib/stores/activities';
	import fieldStore from '$lib/stores/fields';
	import type { Vehicle, Driver, Bowser, Activity, Field, Zone } from '$lib/types';

	// Current section state
	let selectedSection = $state('vehicles');

	// State for Vehicle Management
	let vehicleView = $state<'list' | 'form' | 'detail'>('list');
	let selectedVehicle = $state<Vehicle | null>(null);
	let isEditingVehicle = $state(false);

	// State for Driver Management
	let driverView = $state<'list' | 'form' | 'detail'>('list');
	let selectedDriver = $state<Driver | null>(null);
	let isEditingDriver = $state(false);

	// State for Bowser Management
	let bowserView = $state<'list' | 'form' | 'detail'>('list');
	let selectedBowser = $state<Bowser | null>(null);
	let isEditingBowser = $state(false);

	// State for Activity Management
	let activityView = $state<'list' | 'form' | 'detail'>('list');
	let selectedActivity = $state<Activity | null>(null);
	let isEditingActivity = $state(false);

	// State for Field Management
	let fieldView = $state<'list' | 'form' | 'detail'>('list');
	let selectedField = $state<Field | null>(null);
	let isEditingField = $state(false);

	// State for Zone Management
	let zoneView = $state<'list' | 'form' | 'detail'>('list');
	let selectedZone = $state<Zone | null>(null);
	let isEditingZone = $state(false);

	const sections = [
		{ id: 'vehicles', label: 'Vehicles' },
		{ id: 'drivers', label: 'Drivers' },
		{ id: 'bowsers', label: 'Bowsers' },
		{ id: 'activities', label: 'Activities' },
		{ id: 'fields', label: 'Fields' },
		{ id: 'zones', label: 'Zones' }
	];

	// Vehicle handlers
	function handleVehicleSelect(vehicle: Vehicle) {
		selectedVehicle = vehicle;
		vehicleView = 'detail';
	}

	function handleVehicleCreate() {
		selectedVehicle = null;
		isEditingVehicle = false;
		vehicleView = 'form';
	}

	function handleVehicleEdit() {
		if (selectedVehicle) {
			isEditingVehicle = true;
			vehicleView = 'form';
		}
	}

	function handleVehicleDelete() {
		if (selectedVehicle) {
			vehicleStore.deleteVehicle(selectedVehicle.id);
			vehicleView = 'list';
			selectedVehicle = null;
		}
	}

	function handleVehicleBack() {
		vehicleView = 'list';
		selectedVehicle = null;
		isEditingVehicle = false;
	}

	// Driver handlers
	function handleDriverSelect(driver: Driver) {
		selectedDriver = driver;
		driverView = 'detail';
	}

	function handleDriverCreate() {
		selectedDriver = null;
		isEditingDriver = false;
		driverView = 'form';
	}

	function handleDriverEdit() {
		if (selectedDriver) {
			isEditingDriver = true;
			driverView = 'form';
		}
	}

	function handleDriverDelete() {
		if (selectedDriver) {
			driverStore.deleteDriver(selectedDriver.id);
			driverView = 'list';
			selectedDriver = null;
		}
	}

	function handleDriverBack() {
		driverView = 'list';
		selectedDriver = null;
		isEditingDriver = false;
	}

	// Bowser handlers
	function handleBowserSelect(bowser: Bowser) {
		selectedBowser = bowser;
		bowserView = 'detail';
	}

	function handleBowserCreate() {
		selectedBowser = null;
		isEditingBowser = false;
		bowserView = 'form';
	}

	function handleBowserEdit() {
		if (selectedBowser) {
			isEditingBowser = true;
			bowserView = 'form';
		}
	}

	function handleBowserDelete() {
		if (selectedBowser) {
			bowserStore.deleteBowser(selectedBowser.id);
			bowserView = 'list';
			selectedBowser = null;
		}
	}

	function handleBowserBack() {
		bowserView = 'list';
		selectedBowser = null;
		isEditingBowser = false;
	}

	// Activity handlers
	function handleActivitySelect(activity: Activity) {
		selectedActivity = activity;
		activityView = 'detail';
	}

	function handleActivityCreate() {
		selectedActivity = null;
		isEditingActivity = false;
		activityView = 'form';
	}

	function handleActivityEdit() {
		if (selectedActivity) {
			isEditingActivity = true;
			activityView = 'form';
		}
	}

	function handleActivityDelete() {
		if (selectedActivity) {
			activityStore.deleteActivity(selectedActivity.id);
			activityView = 'list';
			selectedActivity = null;
		}
	}

	function handleActivityBack() {
		activityView = 'list';
		selectedActivity = null;
		isEditingActivity = false;
	}

	// Field handlers
	function handleFieldSelect(field: Field) {
		selectedField = field;
		fieldView = 'detail';
	}

	function handleFieldCreate() {
		selectedField = null;
		isEditingField = false;
		fieldView = 'form';
	}

	function handleFieldEdit() {
		if (selectedField) {
			isEditingField = true;
			fieldView = 'form';
		}
	}

	function handleFieldDelete() {
		if (selectedField) {
			fieldStore.deleteField(selectedField.id);
			fieldView = 'list';
			selectedField = null;
		}
	}

	function handleFieldBack() {
		fieldView = 'list';
		selectedField = null;
		isEditingField = false;
	}

	// Zone handlers
	function handleZoneSelect(zone: Zone) {
		selectedZone = zone;
		zoneView = 'detail';
	}

	function handleZoneCreate() {
		selectedZone = null;
		isEditingZone = false;
		zoneView = 'form';
	}

	function handleZoneEdit() {
		if (selectedZone) {
			isEditingZone = true;
			zoneView = 'form';
		}
	}

	function handleZoneDelete() {
		if (selectedZone) {
			// Note: Zone deletion should be handled by the ZoneDetail component
			// This is just for consistency with other handlers
			zoneView = 'list';
			selectedZone = null;
		}
	}

	function handleZoneBack() {
		zoneView = 'list';
		selectedZone = null;
		isEditingZone = false;
	}

	// Reset view when changing sections
	function changeSection(sectionId: string) {
		selectedSection = sectionId;
		
		// Reset all views to list
		vehicleView = 'list';
		selectedVehicle = null;
		isEditingVehicle = false;
		
		driverView = 'list';
		selectedDriver = null;
		isEditingDriver = false;
		
		bowserView = 'list';
		selectedBowser = null;
		isEditingBowser = false;
		
		activityView = 'list';
		selectedActivity = null;
		isEditingActivity = false;
		
		fieldView = 'list';
		selectedField = null;
		isEditingField = false;
		
		zoneView = 'list';
		selectedZone = null;
		isEditingZone = false;
	}

	onMount(() => {
		console.log('Fleet Management loaded');
	});
</script>

<svelte:head>
	<title>Database - FarmTrack</title>
</svelte:head>

<div class="fleet-management">
	<div class="container">
		<div class="page-header">
			<h1>Database Management</h1>
			<p class="subtitle">Manage vehicles, drivers, bowsers, activities, fields, and zones</p>
		</div>

		<!-- Section Tabs -->
		<div class="section-tabs">
			{#each sections as section}
				<button 
					class="tab-btn" 
					class:active={section.id === selectedSection}
					onclick={() => changeSection(section.id)}
				>
					<span class="tab-label">{section.label}</span>
				</button>
			{/each}
		</div>

		<!-- Section Content -->
		<div class="section-content">
			{#if selectedSection === 'vehicles'}
				{#if vehicleView === 'list'}
					<VehicleList 
						onselect={handleVehicleSelect}
						oncreate={handleVehicleCreate}
					/>
				{:else if vehicleView === 'form'}
					<VehicleForm 
						vehicle={isEditingVehicle ? selectedVehicle : null}
						onback={handleVehicleBack}
					/>
				{:else if vehicleView === 'detail' && selectedVehicle}
					<VehicleDetail 
						vehicle={selectedVehicle}
						onedit={handleVehicleEdit}
						ondelete={handleVehicleDelete}
						onback={handleVehicleBack}
					/>
				{/if}
			{:else if selectedSection === 'drivers'}
				{#if driverView === 'list'}
					<DriverList 
						onselect={handleDriverSelect}
						oncreate={handleDriverCreate}
					/>
				{:else if driverView === 'form'}
					<DriverForm 
						driver={isEditingDriver ? selectedDriver : null}
						onback={handleDriverBack}
					/>
				{:else if driverView === 'detail' && selectedDriver}
					<DriverDetail 
						driver={selectedDriver}
						onedit={handleDriverEdit}
						ondelete={handleDriverDelete}
						onback={handleDriverBack}
					/>
				{/if}
			{:else if selectedSection === 'bowsers'}
				{#if bowserView === 'list'}
					<BowserList 
						onselect={handleBowserSelect}
						oncreate={handleBowserCreate}
					/>
				{:else if bowserView === 'form'}
					<BowserForm 
						bowser={isEditingBowser ? selectedBowser : null}
						onback={handleBowserBack}
					/>
				{:else if bowserView === 'detail' && selectedBowser}
					<BowserDetail 
						bowser={selectedBowser}
						onedit={handleBowserEdit}
						ondelete={handleBowserDelete}
						onback={handleBowserBack}
					/>
				{/if}
			{:else if selectedSection === 'activities'}
				{#if activityView === 'list'}
					<ActivityList 
						onselect={handleActivitySelect}
						oncreate={handleActivityCreate}
					/>
				{:else if activityView === 'form'}
					<ActivityForm 
						activity={isEditingActivity ? selectedActivity : null}
						onback={handleActivityBack}
					/>
				{:else if activityView === 'detail' && selectedActivity}
					<ActivityDetail 
						activity={selectedActivity}
						onedit={handleActivityEdit}
						ondelete={handleActivityDelete}
						onback={handleActivityBack}
					/>
				{/if}
			{:else if selectedSection === 'fields'}
				{#if fieldView === 'list'}
					<FieldList 
						onselect={handleFieldSelect}
						oncreate={handleFieldCreate}
					/>
				{:else if fieldView === 'form'}
					<FieldForm 
						field={isEditingField ? selectedField : null}
						onback={handleFieldBack}
					/>
				{:else if fieldView === 'detail' && selectedField}
					<FieldDetail 
						field={selectedField}
						onedit={handleFieldEdit}
						ondelete={handleFieldDelete}
						onback={handleFieldBack}
					/>
				{/if}
			{:else if selectedSection === 'zones'}
				{#if zoneView === 'list'}
					<ZoneList 
						onselect={handleZoneSelect}
						oncreate={handleZoneCreate}
					/>
				{:else if zoneView === 'form'}
					<ZoneForm 
						zone={isEditingZone ? selectedZone : null}
						onback={handleZoneBack}
					/>
				{:else if zoneView === 'detail' && selectedZone}
					<ZoneDetail 
						zone={selectedZone}
						onedit={handleZoneEdit}
						ondelete={handleZoneDelete}
						onback={handleZoneBack}
					/>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.fleet-management {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1rem;
	}

	.container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 1rem;
	}

	.section-tabs {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		border-bottom: 2px solid var(--color-border);
		padding-bottom: 0;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.tab-btn:hover {
		color: var(--color-text);
		background: var(--color-background-hover);
	}

	.tab-btn.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.tab-label {
		font-weight: 500;
		white-space: nowrap;
	}

	.section-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}


	@media (max-width: 768px) {
		.fleet-management {
			padding: 0.5rem;
		}

		h1 {
			font-size: 1.5rem;
		}

		.tab-btn {
			padding: 0.5rem 0.75rem;
		}

		.tab-label {
			font-size: 0.75rem;
		}
	}
</style>