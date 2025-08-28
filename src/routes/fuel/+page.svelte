<script lang="ts">
	import FuelEntryWorkflow from '$lib/components/fuel/FuelEntryWorkflow.svelte';
</script>

<svelte:head>
	<title>Fuel Management - FarmTrack</title>
</svelte:head>

<div class="fuel-management-page">
	<!-- Fuel Entry Workflow -->
	<FuelEntryWorkflow />
</div>

<style>
	.fuel-management-page {
		width: 100%;
		min-height: 100vh;
		background: #ffffff;
		padding: 0;
	}
</style>